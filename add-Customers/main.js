const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database(path.join(__dirname, "D:\project pos html\store_db.db"), (err) => {
  if (err) {
    console.error("❌ ไม่สามารถเชื่อมต่อฐานข้อมูล:", err.message);
  } else {
    console.log("✅ เชื่อมต่อฐานข้อมูล SQLite สำเร็จ");
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.loadFile("add-customer.html");
}

app.whenReady().then(createWindow);

// 🎯 ฟังก์ชันเพิ่มข้อมูลลูกค้า
ipcMain.handle("add-customer", async (event, customer) => {
  const { name, phone, address, outstanding_balance } = customer;
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO customers (name, phone, address, outstanding_balance) VALUES (?, ?, ?, ?)`,
      [name, phone, address, outstanding_balance],
      function (err) {
        if (err) {
          console.error("❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูล:", err.message);
          reject(err);
        } else {
          console.log("✅ เพิ่มลูกค้าใหม่เรียบร้อย:", name);
          resolve({ id: this.lastID });
        }
      }
    );
  });
});
