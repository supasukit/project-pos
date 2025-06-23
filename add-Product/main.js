const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database(path.join(__dirname, "store_db.db"), (err) => {
  if (err) {
    console.error("❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้:", err.message);
  } else {
    console.log("✅ เชื่อมต่อฐานข้อมูล SQLite แล้ว");
  }
});

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("add-product.html"); // ✅ แก้ให้โหลดหน้าที่คุณต้องการ
});

// ✅ ฟังก์ชันเพิ่มสินค้า
ipcMain.handle("add-product", async (event, data) => {
  const { name, barcode, retail_price, wholesale_price, stock, category, image } = data;

  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO products (name, barcode, retail_price, wholesale_price, stock, category, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [name, barcode, retail_price, wholesale_price, stock, category, image], function (err) {
      if (err) {
        console.error("❌ ไม่สามารถเพิ่มสินค้าได้:", err.message);
        reject(err);
      } else {
        console.log("✅ เพิ่มสินค้าเรียบร้อย:", {
          id: this.lastID,
          name,
          barcode,
          retail_price,
          wholesale_price,
          stock,
          category
        });
        resolve({ id: this.lastID });
      }
    });
  });
});
