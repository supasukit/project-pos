const { contextBridge } = require('electron')

// เปิดใช้ API ที่ปลอดภัยสำหรับ renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ฟังก์ชันพื้นฐานที่อาจจะใช้
  platform: process.platform,
  versions: process.versions
})
