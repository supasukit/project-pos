const { ipcMain } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "store_db.db");
const db = new sqlite3.Database(dbPath);

ipcMain.handle("insert-order", async (event, { customer_id, amount, payment_type, items }) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `INSERT INTO orders (customer_id, total_amount, amount_paid, outstanding, date)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [
          customer_id,
          amount,
          payment_type === "เงินสด" ? amount : 0,
          payment_type === "เงินสด" ? 0 : amount
        ],
        function (err) {
          if (err) {
            console.error("❌ Insert orders ผิดพลาด:", err.message);
            return reject(err);
          }

          const orderId = this.lastID;
          const stmtItems = db.prepare(
            `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`
          );
          const stmtStock = db.prepare(
            `UPDATE products SET stock = stock - ? WHERE id = ?`
          );

          let i = 0;

          function next() {
            if (i >= items.length) {
              stmtItems.finalize();
              stmtStock.finalize();

              db.run(
                `INSERT INTO payment_history (customer_id, amount, payment_type, note, date)
                 VALUES (?, ?, ?, '', datetime('now'))`,
                [customer_id, amount, payment_type],
                function (err2) {
                  if (err2) {
                    console.error("❌ Insert payment_history ผิดพลาด:", err2.message);
                    return reject(err2);
                  }
                  console.log("✅ บันทึกออเดอร์ + สินค้า + ประวัติเรียบร้อย order_id =", orderId);
                  resolve({ order_id: orderId });
                }
              );

              return;
            }

            const item = items[i];

            stmtItems.run(orderId, item.product_id, item.quantity, item.price, (err2) => {
              if (err2) {
                console.error("❌ Insert order_items ผิดพลาด:", err2.message);
                return reject(err2);
              }
              stmtStock.run(item.quantity, item.product_id, (err3) => {
                if (err3) {
                  console.error("❌ อัปเดต stock ผิดพลาด:", err3.message);
                  return reject(err3);
                }
                i++;
                next();
              });
            });
          }

          next();
        }
      );
    });
  });
});
