require('dotenv').config() // เพิ่มบรรทัดนี้ด้านบนสุด

console.log('🔧 Environment variables loaded:')
console.log('SMTP_USER:', process.env.SMTP_USER)
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Loaded' : 'Missing')
console.log('EMAIL_USER:', process.env.EMAIL_USER)
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Loaded' : 'Missing')

const express = require('express')
const path = require('path')
const cors = require('cors')
const mongoose = require('mongoose')
const app = express()
const PORT = process.env.PORT || 3000

// Middleware - ปรับ CORS สำหรับ LAN
app.use(cors({
  origin: [
    'http://192.168.1.*:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    true // อนุญาตทุก origin ใน development
  ],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files - serve client folder
app.use(express.static(path.join(__dirname, '..', 'client')))

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'login.html'))
})

// API Routes
const authRoutes = require('./routes/auth')
const productRoutes = require('./routes/products')
const salesRoutes = require('./routes/sales')
const customersRoutes = require('./routes/customers')
const ordersRoutes = require('./routes/orders')
const employeesRoutes = require('./routes/employees')
app.use('/api/employees', employeesRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() })
})

// เชื่อมต่อ MongoDB - เปลี่ยนเป็น IP ของ VM MongoDB
mongoose.connect('mongodb://172.27.56.64:27017/pos_db')
  .then(() => console.log('✅ MongoDB connected to 172.27.56.64:27017/pos_db'))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// Start server - Listen บน all interfaces เพื่อให้เครื่องอื่นเข้าถึงได้
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
  console.log(`🌐 Access from LAN: http://192.168.1.YOUR_VM_IP:${PORT}`)
  console.log(`📁 Serving static files from: ${path.join(__dirname, '..', 'client')}`)
})

module.exports = app
