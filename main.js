const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let serverProcess

// เริ่ม Express Server
function startServer () {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, 'server', 'server.js')
    const port = process.env.PORT || 3000

    console.log('🚀 Starting Express server...')

    serverProcess = spawn('node', [serverPath], {
      cwd: __dirname,
      env: { ...process.env, PORT: port }
    })

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`)
      // ตรวจสอบว่า server เริ่มแล้ว
      if (data.toString().includes('Server running') ||
          data.toString().includes('listening') ||
          data.toString().includes(port)) {
        resolve(port)
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`)
    })

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error)
      reject(error)
    })

    // รอ 2 วินาทีแล้ว resolve (fallback)
    setTimeout(() => {
      resolve(port)
    }, 2000)
  })
}

// หยุด Express Server
function stopServer () {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
    console.log('🛑 Server stopped')
  }
}

// สร้างหน้าต่างหลัก
async function createWindow () {
  try {
    // เริ่ม server ก่อน
    const port = await startServer()

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false // ไม่แสดงจนกว่าจะโหลดเสร็จ
    })

    // โหลดจาก server
    const serverUrl = `http://localhost:${port}`
    console.log(`📱 Loading app from: ${serverUrl}`)

    await mainWindow.loadURL(serverUrl)

    // แสดงหน้าต่างเมื่อโหลดเสร็จ
    mainWindow.show()

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  } catch (error) {
    console.error('Error starting app:', error)

    // ถ้า server ไม่ได้ ให้โหลดไฟล์โดยตรง
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    // Fallback: โหลดไฟล์ local
    mainWindow.loadFile(path.join(__dirname, 'client', 'login.html'))
    mainWindow.show()
  }
}

// เมื่อ Electron พร้อม
app.whenReady().then(createWindow)

// ปิดแอปเมื่อปิดหน้าต่างทั้งหมด
app.on('window-all-closed', () => {
  stopServer()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// สำหรับ macOS
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ปิด server เมื่อแอปปิด
app.on('before-quit', () => {
  stopServer()
})
