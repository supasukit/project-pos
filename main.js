//require('electron-reload')(__dirname, {
 // electron: require(`${__dirname}/node_modules/electron`)
//});

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database(path.join(__dirname, "store_db.db"), (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

// 🚀 ระบบ Queue ป้องกัน SQLITE_BUSY
const sqliteQueue = [];
let isProcessing = false;

function runSqliteQueued(action) {
  return new Promise((resolve, reject) => {
    sqliteQueue.push({ action, resolve, reject });
    if (!isProcessing) {
      processQueue();
    }
  });
}

async function processQueue() {
  if (sqliteQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { action, resolve, reject } = sqliteQueue.shift();

  try {
    const result = await action();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    processQueue();
  }
}

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(`file://${__dirname}/login/login.html`);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, "preload.js"),
        },
      });

      mainWindow.loadURL(`file://${__dirname}/index.html`);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-products", async (event, username) => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM products WHERE username = ?", [username], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});


ipcMain.handle("delete-product", async (event, id) => {
  return runSqliteQueued(() => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
        if (err) {
          console.error("❌ ลบสินค้าไม่สำเร็จ:", err.message);
          reject(err);
        } else {
          console.log("🗑️ ลบสินค้าเรียบร้อย: ID =", id);
          resolve();
        }
      });
    });
  });
});

ipcMain.handle("handle-credit-payment", async (event, { name, phone, address, amount, username }) => {
  return runSqliteQueued(() => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM customers WHERE name = ? AND username = ?", [name, username], (err, row) => {
        if (err) {
          console.error("❌ ดึงลูกค้าไม่สำเร็จ:", err.message);
          return reject(err);
        }

        if (row) {
          // ถ้ามีลูกค้าอยู่แล้ว ➔ update ยอดค้าง
          const newBalance = (row.outstanding_balance || 0) + amount;
          db.run("UPDATE customers SET outstanding_balance = ? WHERE id = ?", [newBalance, row.id], function (err) {
            if (err) {
              console.error("❌ อัปเดตยอดค้างชำระไม่สำเร็จ:", err.message);
              return reject(err);
            } else {
              console.log(`🔁 อัปเดตยอดค้างให้ลูกค้า ${name}: ${newBalance}`);
              resolve();
            }
          });
        } else {
          // ถ้าไม่มีลูกค้า ➔ insert ใหม่
          db.run("INSERT INTO customers (name, phone, address, outstanding_balance, username, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", 
            [name, phone || "ไม่ระบุ", address || "ไม่ระบุ", amount, username], 
            function (err) {
              if (err) {
                console.error("❌ เพิ่มลูกค้าใหม่ไม่สำเร็จ:", err.message);
                return reject(err);
              } else {
                console.log(`➕ เพิ่มลูกค้าใหม่ ${name} ยอดค้างชำระ: ${amount}`);
                resolve();
              }
            }
          );
        }
      });
    });
  });
});



ipcMain.handle('insert-order-header', async (event, order) => {
  return new Promise((resolve, reject) => {
    const hasCustomer = typeof order.customer_id !== 'undefined' && order.customer_id !== null;
    const isCredit = order.payment_type === 'ค้างชำระ';

    const sql = hasCustomer
      ? `INSERT INTO orders (customer_id, total_amount, amount_paid, outstanding, payment_type, username)
         VALUES (?, ?, ?, ?, ?, ?)`
      : `INSERT INTO orders (total_amount, amount_paid, outstanding, payment_type, username)
         VALUES (?, ?, ?, ?, ?)`;

    const params = hasCustomer
      ? [
          order.customer_id,
          order.amount,
          isCredit ? 0 : order.amount,
          isCredit ? order.amount : 0,
          order.payment_type,
          order.username
        ]
      : [
          order.amount,
          isCredit ? 0 : order.amount,
          isCredit ? order.amount : 0,
          order.payment_type,
          order.username
        ];

    db.run(sql, params, function (err) {
      if (err) {
        console.error("❌ insert-order-header failed:", err.message);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
});
;




ipcMain.handle("insert-order-item", async (event, { order_id, product_id, quantity, price }) => {
  return runSqliteQueued(() => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [order_id, product_id, quantity, price],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
});

ipcMain.handle("update-stock", async (event, { product_id, quantity }) => {
  return runSqliteQueued(() => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [quantity, product_id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
});

ipcMain.handle("save-payment-history", async (event, { customer_id, amount, payment_type, note, username }) => {
  console.log("📥 save-payment-history ถูกเรียก", { customer_id, amount, payment_type, note, username });

  return runSqliteQueued(() => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payment_history (customer_id, amount, payment_type, note, date, username)
         VALUES (?, ?, ?, ?, datetime('now'), ?)`,
        [customer_id, amount, payment_type, note, username],  // ✅ เพิ่ม username ตรงนี้
        function (err) {
          if (err) {
            console.error("❌ บันทึก payment_history ผิดพลาด:", err.message);
            reject(err);
          } else {
            console.log("✅ payment_history บันทึกสำเร็จ ID:", this.lastID);
            resolve();
          }
        }
      );
    });
  });
});



ipcMain.handle("open-credit-payment", async (event, { amount, cart }) => {
  console.log("🧾 เปิดหน้าค้างชำระ พร้อมข้อมูล", { amount, cart });

  const creditWin = new BrowserWindow({
    width: 500,
    height: 600,
    title: "ค้างชำระ",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  const query = `amount=${amount}&cart=${encodeURIComponent(JSON.stringify(cart))}`;
  creditWin.loadURL(`file://${__dirname}/credit-payment/credit-payment.html?${query}`);

  return true; // ต้อง return true เพื่อให้ renderer รู้ว่าเปิดได้สำเร็จ
});


// ✅ โหลดยอดขายรวม
ipcMain.handle('get-sales-data', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT SUM(total_amount) as total FROM orders WHERE username = ?", [username], (err, row) => {
      if (err) reject(err);
      resolve(row?.total || 0);
    });
  });
});

// ✅ โหลดข้อมูลค้างชำระ
ipcMain.handle('get-debt-summary', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as total_customers, SUM(outstanding_balance) as total_debt FROM customers WHERE username = ?", [username], (err, row) => {
      if (err) reject(err);
      resolve(row || { total_customers: 0, total_debt: 0 });
    });
  });
});

// ✅ โหลดยอดขายวันนี้
ipcMain.handle('get-today-sales', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT SUM(total_amount) as total FROM orders WHERE username = ? AND date(date) = date('now')", [username], (err, row) => {
      if (err) reject(err);
      resolve(row?.total || 0);
    });
  });
});

// ✅ กราฟสรุปยอดขาย
ipcMain.handle('get-sales-summary', async (event, username, filter) => {
  let query = "";
  if (filter === "7days") {
    query = `SELECT date(date) as sale_date, SUM(total_amount) as total_sales 
             FROM orders WHERE username = ? AND date(date) >= date('now', '-6 days') 
             GROUP BY date(date)`;
  } else if (filter === "30days") {
    query = `SELECT date(date) as sale_date, SUM(total_amount) as total_sales 
             FROM orders WHERE username = ? AND date(date) >= date('now', '-29 days') 
             GROUP BY date(date)`;
  } else {
    query = `SELECT strftime('%Y-%m', date) as sale_date, SUM(total_amount) as total_sales 
             FROM orders WHERE username = ? AND strftime('%Y', date) = strftime('%Y', 'now') 
             GROUP BY strftime('%Y-%m', date)`;
  }

  return new Promise((resolve, reject) => {
    db.all(query, [username], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

// ✅ เปรียบเทียบเงินสด vs เครดิต วันนี้
ipcMain.handle('get-today-payment-summary', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT payment_type, SUM(amount) as total
      FROM payment_history
      WHERE username = ? AND date(date) = date('now')
      GROUP BY payment_type
    `, [username], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});


// ✅ สัดส่วนประเภทการจ่าย
ipcMain.handle('get-payment-type-ratio', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT payment_type, SUM(amount) as total 
            FROM payment_history 
            WHERE username = ? 
            GROUP BY payment_type`, [username], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

// ✅ โหลดรายการขายล่าสุด
ipcMain.handle('get-recent-sales', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT o.date as sale_date, p.name as product_name, oi.quantity, (oi.price * oi.quantity) as amount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.username = ?
      ORDER BY o.date DESC
      LIMIT 10
    `, [username], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});


// ✅ โหลดประวัติการขาย (บิลย้อนหลัง)
ipcMain.handle('get-order-history', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        o.id,
        CASE 
          WHEN o.payment_type = 'cash' THEN NULL 
          ELSE c.name 
        END AS customer_name,
        o.total_amount,
        o.payment_type,
        o.date
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.username = ?
      ORDER BY o.date DESC
      LIMIT 10
    `, [username], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

ipcMain.handle('login-user', async (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, Buffer.from(password).toString('base64')],
      (err, user) => {
        if (err) {
          console.error("Login error:", err.message);
          resolve(false);
        } else if (user) {
          console.log("Login success:", username);
          global.loggedInUser = username; // ✅ เก็บ username ทันทีหลัง login
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );
  });
});

ipcMain.handle('register-user', async (event, data) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ?", [data.username], (err, user) => {
      if (err) {
        console.error("Database error:", err.message);
        return resolve(false);
      }
      if (user) {
        // ถ้า username ซ้ำ
        return resolve(false);
      }
      // ถ้า username ไม่ซ้ำ ➔ Insert
      db.run(
        `
        INSERT INTO users 
          (username, password, owner_name, store_name, store_phone, store_address)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          data.username,
          Buffer.from(data.password).toString('base64'),  // ✅ เข้ารหัส base64
          data.owner_name,  // ✅ บันทึก owner_name
          data.store_name,
          data.store_phone,
          data.store_address
        ],
        function (err) {
          if (err) {
            console.error("Register error:", err.message);
            resolve(false);
          } else {
            console.log("Register success:", data.username);
            resolve(true);
          }
        }
      );
    });
  });
});

ipcMain.on('open-add-product', () => {
  const addProductWindow = new BrowserWindow({
    width: 600,
    height: 800,
    title: 'เพิ่มสินค้า',
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    }
  });

  // ต้องตรง path: add-Product/add-product.html
  addProductWindow.loadURL(`file://${__dirname}/add-Product/add-product.html`);
});


ipcMain.handle('add-product', (event, product) => {
  return new Promise((resolve, reject) => {
    if (product.id) {
      // 🛠 UPDATE สินค้าที่มีอยู่แล้ว
      db.run(
        `UPDATE products
         SET retail_price = ?, wholesale_price = ?, credit_price = ?, wholesale_minimum = ?, stock = ?
         WHERE id = ?`,
        [
          product.retail_price,
          product.wholesale_price,
          product.credit_price,
          product.wholesale_minimum,
          product.stock,
          product.id
        ],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    } else {
      // 🆕 INSERT สินค้าใหม่
      db.run(
        `INSERT INTO products 
         (name, barcode, retail_price, wholesale_price, credit_price, wholesale_minimum, stock, category, image, username)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.name,
          product.barcode,
          product.retail_price,
          product.wholesale_price,
          product.credit_price,
          product.wholesale_minimum,
          product.stock,
          product.category,
          product.image,
          product.username
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }
  });
});



ipcMain.handle('get-user-profile', async (event, username) => {
  if (!username) return null;

  return new Promise((resolve, reject) => {
    db.get(`
      SELECT username, owner_name, store_name, store_phone, store_address
      FROM users
      WHERE username = ?
    `, [username], (err, row) => {
      if (err) {
        console.error("Get user profile error:", err.message);
        resolve(null);
      } else {
        resolve(row);
      }
    });
  });
});


ipcMain.handle('logout-user', async (event) => {
  console.log("User logged out.");
  global.loggedInUser = null;  // ✅ เคลียร์ username ที่ global
  return true;
});
ipcMain.handle('getSalesData', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT SUM(total_amount) as total_sales FROM orders WHERE username = ?",
      [username],
      (err, row) => {
        if (err) {
          console.error("Get sales data error:", err.message);
          resolve(0);
        } else {
          resolve(row.total_sales || 0);
        }
      }
    );
  });
});

ipcMain.handle('getDebtSummary', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as total_customers, SUM(outstanding_balance) as total_debt FROM customers WHERE username = ?",
      [username],
      (err, row) => {
        if (err) {
          console.error("Get debt summary error:", err.message);
          resolve({ total_customers: 0, total_debt: 0 });
        } else {
          resolve(row);
        }
      }
    );
  });
});

// ✅ ดึงลูกค้าเฉพาะของ user ที่ login
ipcMain.handle('get-customers', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM customers WHERE username = ?",  // ✅ ต้องมี username!
      [username],
      (err, rows) => {
        if (err) {
          console.error('❌ get-customers error:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});

// ✅ เพิ่มลูกค้าใหม่
// ✅ แก้ไขฟังก์ชัน add-customer ในไฟล์ main.js
ipcMain.handle('add-customer', async (event, customer) => {
  // ✅ เพิ่ม customer_type ในการรับค่า
  const { 
    name, 
    phone = "ไม่ระบุ", 
    address = "ไม่ระบุ", 
    outstanding_balance = 0, 
    customer_type = "เงินสด",  // ✅ เพิ่มบรรทัดนี้
    username 
  } = customer;

  // ✅ Debug: แสดงข้อมูลที่ได้รับ
  console.log('🔍 Backend received customer data:', {
    name,
    phone, 
    address,
    outstanding_balance,
    customer_type,  // ✅ แสดง customer_type
    username
  });

  return new Promise((resolve, reject) => {
    db.run(
      // ✅ เพิ่ม customer_type ในคำสั่ง SQL
      `INSERT INTO customers (name, phone, address, outstanding_balance, customer_type, username, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, phone, address, outstanding_balance, customer_type, username],  // ✅ เพิ่ม customer_type
      function (err) {
        if (err) {
          console.error('❌ add-customer error:', err.message);
          reject(err);
        } else {
          console.log('✅ เพิ่มลูกค้าใหม่:', name, 'ประเภท:', customer_type);  // ✅ แสดง customer_type
          resolve({ id: this.lastID });
        }
      }
    );
  });
});

// ✅ ถ้าตาราง customers ยังไม่มี column customer_type ให้เพิ่ม SQL นี้ใน main.js
// (วางไว้หลัง db connection หรือใน app.whenReady())

// เพิ่ม customer_type column หากยังไม่มี
db.run(`
  ALTER TABLE customers ADD COLUMN customer_type TEXT DEFAULT 'เงินสด'
`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ customer_type column มีอยู่แล้ว');
    } else {
      console.log('❌ เพิ่ม customer_type column ไม่ได้:', err.message);
    }
  } else {
    console.log('✅ เพิ่ม customer_type column สำเร็จ');
  }
});

// ✅ อัปเดต existing customers ที่มี customer_type เป็น NULL
db.run(`
  UPDATE customers SET customer_type = 'เงินสด' WHERE customer_type IS NULL
`, (err) => {
  if (err) {
    console.log('❌ อัปเดต customer_type ไม่ได้:', err.message);
  } else {
    console.log('✅ อัปเดต customer_type สำเร็จ');
  }
});


// ✅ ลบลูกค้าตาม ID
ipcMain.handle('delete-customer', async (event, customerId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM customers WHERE id = ?`,
      [customerId],
      function (err) {
        if (err) {
          console.error('❌ delete-customer error:', err.message);
          reject(err);
        } else {
          console.log('✅ ลบลูกค้า id:', customerId);
          resolve();
        }
      }
    );
  });
});

// ✅ อัปเดตยอดค้างชำระ
ipcMain.handle('update-customer-balance', async (event, id, newBalance) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE customers SET outstanding_balance = ? WHERE id = ?`,
      [newBalance, id],
      function (err) {
        if (err) {
          console.error('❌ update-customer-balance error:', err.message);
          reject(err);
        } else {
          console.log('✅ อัปเดตยอดค้างชำระ id:', id);
          resolve();
        }
      }
    );
  });
});

// ✅ เปิดหน้าต่างเพิ่มลูกค้า
ipcMain.on('open-add-customer', () => {
  const { BrowserWindow } = require('electron');
  
  const addCustomerWin = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'เพิ่มลูกค้า',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  addCustomerWin.loadFile(path.join(__dirname, 'add-Customers', 'add-customer.html'));
});
ipcMain.handle('get-default-customer-id', async (event, username) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM customers WHERE username = ? ORDER BY id ASC LIMIT 1`, [username], (err, row) => {
      if (err) {
        console.error("❌ ดึง customer_id ไม่ได้:", err.message);
        return reject(err);
      }
      if (row) {
        resolve(row.id);
      } else {
        resolve(null); // ถ้าไม่มีลูกค้า
      }
    });
  });
});


ipcMain.handle("update-user-profile", async (event, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users SET owner_name = ?, store_name = ?, store_phone = ?, store_address = ? WHERE username = ?`,
      [data.owner_name, data.store_name, data.store_phone, data.store_address, data.username],
      function (err) {
        if (err) {
          console.error("❌ update-user-profile error:", err.message);
          reject(err);
        } else {
          console.log("✅ อัปเดตข้อมูลร้านค้าสำเร็จ:", data.username);
          resolve(true);
        }
      }
    );
  });
});
ipcMain.handle("get-order-detail", async (event, orderId) => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT o.*, c.name AS customer_name, c.phone, c.address
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [orderId], (err, orderRow) => {
      if (err || !orderRow) return reject(err || new Error("ไม่พบคำสั่งซื้อ"));

      db.all(`
        SELECT p.name AS product_name, oi.quantity, oi.price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId], (err2, itemRows) => {
        if (err2) return reject(err2);
        resolve({
          ...orderRow,
          items: itemRows
        });
      });
    });
  });
});
ipcMain.on("open-add-product-with-params", (event, { barcode, name, username }) => {
  const addProductWindow = new BrowserWindow({
    width: 600,
    height: 800,
    title: 'เพิ่มสินค้า',
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  const url = `file://${__dirname}/add-Product/add-product.html?barcode=${encodeURIComponent(barcode)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username)}`;
  addProductWindow.loadURL(url);
});
ipcMain.handle("update-outstanding-balance", async (event, { customer_id, amount, username }) => {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE customers 
      SET outstanding_balance = outstanding_balance + ? 
      WHERE id = ? AND username = ?
    `, [amount, customer_id, username], function (err) {
      if (err) {
        console.error("❌ อัปเดตยอดค้างผิดพลาด:", err.message);
        reject(err);
      } else {
        console.log("✅ อัปเดตยอดค้างสำเร็จ:", { customer_id, amount });
        resolve();
      }
    });
  });
});
ipcMain.handle("openWindow", (event, filePath, options = {}) => {
  const win = new BrowserWindow({
    width: options.width || 500,
    height: options.height || 400,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    }
  });

  const fullPath = path.join(__dirname, filePath); // ✅ ใช้ relative path
  win.loadFile(fullPath);
});

ipcMain.handle("get-debt-payment-history", async (event, username) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT p.date, p.amount, p.note, c.name AS customer_name
      FROM payment_history p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.username = ? AND p.payment_type = 'จ่ายหนี้'
      ORDER BY p.date DESC
    `, [username], (err, rows) => {
      if (err) {
        console.error("❌ get-debt-payment-history error:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});
ipcMain.handle("get-bill-history", async (event, customerId) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        o.id,
        o.total_amount,
        o.amount_paid,
        o.date AS created_at,
        o.payment_type
      FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.date DESC
    `, [customerId], (err, rows) => {
      if (err) {
        console.error("❌ ไม่สามารถดึงบิลลูกค้าได้:", err.message);
        reject(err);
      } else {
        // ✅ เพิ่มฟิลด์สถานะก่อนส่งกลับ
        const withStatus = rows.map(bill => ({
          ...bill,
          status: bill.amount_paid >= bill.total_amount ? "จ่ายครบ" : "ค้างชำระ"
        }));
        resolve(withStatus);
      }
    });
  });
});
ipcMain.handle("get-debt-payment-history-by-customer", async (event, customerId) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT date, amount, payment_type, note
      FROM payment_history
      WHERE customer_id = ? AND payment_type = 'จ่ายหนี้'
      ORDER BY date DESC
    `, [customerId], (err, rows) => {
      if (err) {
        console.error("❌ ไม่สามารถดึงประวัติการจ่ายเงิน:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});
ipcMain.handle('update-bill-status', async (event, { billId, data }) => {
  return new Promise((resolve, reject) => {
    const { amount_paid } = data;

    db.run(
      `UPDATE orders SET amount_paid = ? WHERE id = ?`,
      [amount_paid, billId],
      function (err) {
        if (err) {
          console.error("❌ update-bill-status error:", err.message);
          reject(err.message);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});
ipcMain.handle('record-bill-payment', async (event, { customerId, username, amount, note }) => {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.run(
      `INSERT INTO payment_history (customer_id, username, date, amount, payment_type, note)
       VALUES (?, ?, ?, ?, 'จ่ายหนี้', ?)`,
      [customerId, username, now, amount, note],
      function (err) {
        if (err) {
          console.error("❌ record-bill-payment error:", err.message);
          reject(err.message);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});



