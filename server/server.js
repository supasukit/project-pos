require('dotenv').config()

console.log('🔧 Environment variables loaded:')
console.log('SMTP_USER:', process.env.SMTP_USER)
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Loaded' : 'Missing')

const express = require('express')
const path = require('path')
const cors = require('cors')
const mongoose = require('mongoose')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const mongoSanitize = require('express-mongo-sanitize')
const winston = require('winston')

const app = express()
const PORT = process.env.PORT || 3000

// ================== SECURITY SETUP ==================

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
    scriptSrcAttr: ["'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  }
},
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // จำกัด 100 requests ต่อ IP ต่อ window
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    })
    res.status(429).json({
      success: false,
      message: 'มีการเรียกใช้งานมากเกินไป กรุณารอสักครู่แล้วลองใหม่'
    })
  }
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 ครั้งต่อ IP สำหรับ login
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: { username: req.body.username }
    })
    res.status(429).json({
      success: false,
      message: 'มีการพยายาม login มากเกินไป กรุณารอ 15 นาที'
    })
  }
})

// Apply rate limiting
app.use('/api/', generalLimiter)

// CORS - อนุญาตเฉพาะ localhost
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]

app.use(cors({
  origin: function (origin, callback) {
    // อนุญาต requests ที่ไม่มี origin (เช่น mobile apps, postman)
    if (!origin) return callback(null, true)
    
    // ตรวจสอบ origin ที่อนุญาต
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin)
      }
      return false
    })
    
    if (isAllowed) {
      callback(null, true)
    } else {
      logger.warn('CORS blocked origin', { origin, ip: req?.ip })
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Request parsing with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Log large payloads
    if (buf.length > 1000000) { // 1MB
      logger.warn('Large payload detected', {
        size: buf.length,
        ip: req.ip,
        url: req.url
      })
    }
  }
}))
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}))

// MongoDB sanitization
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('MongoDB injection attempt detected', {
      ip: req.ip,
      key: key,
      url: req.url
    })
  }
}))

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  next()
})

// Static files
app.use(express.static(path.join(__dirname, '..', 'client')))

// ================== ROUTES ==================

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

// Apply specific rate limiting to auth routes
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/register', loginLimiter)

// Route mounting
app.use('/api/employees', employeesRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// ================== ERROR HANDLING ==================

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 Not Found', {
    url: req.originalUrl,
    ip: req.ip,
    method: req.method
  })
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    ip: req.ip,
    method: req.method
  })

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    ...(isDevelopment && { 
      stack: err.stack,
      details: err 
    })
  })
})

// ================== DATABASE CONNECTION ==================

// Secure MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://username:password@172.27.56.64:27017/pos_db'
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Security options
      authSource: 'admin',
      ssl: process.env.NODE_ENV === 'production', // Use SSL in production
      retryWrites: true,
      w: 'majority'
    })
    
    logger.info('MongoDB connected successfully')
    console.log('✅ MongoDB connected to pos_db')
  } catch (err) {
    logger.error('MongoDB connection error', { error: err.message })
    console.error('❌ MongoDB connection error:', err)
    process.exit(1)
  }
}

// ================== SERVER START ==================

const startServer = async () => {
  try {
    await connectDB()
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('Server started', { 
        port: PORT, 
        environment: process.env.NODE_ENV || 'development'
      })
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
      console.log(`🌐 Access from LAN: http://192.168.1.YOUR_VM_IP:${PORT}`)
      console.log(`📁 Serving static files from: ${path.join(__dirname, '..', 'client')}`)
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️  Running in development mode')
      }
    })
  } catch (error) {
    logger.error('Failed to start server', { error: error.message })
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  mongoose.connection.close()
  logger.info('MongoDB connection closed')
  process.exit(0)
})

startServer()




module.exports = app