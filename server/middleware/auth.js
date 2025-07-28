const jwt = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Token blacklist - ในการใช้งานจริงควรใช้ Redis
const tokenBlacklist = new Set()

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ access token'
      })
    }

    // ตรวจสอบ token blacklist
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token ถูกยกเลิกแล้ว'
      })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET)
    
    console.log('🔍 JWT decoded payload:', decoded)

    // ดึงข้อมูล user จากฐานข้อมูลเพื่อตรวจสอบสถานะล่าสุด
    const user = await User.findById(decoded.userId).select('-password -resetPasswordToken -resetPasswordExpires')

    if (!user) {
      console.log('❌ User not found in database:', decoded.userId)
      return res.status(403).json({
        success: false,
        message: 'ไม่พบผู้ใช้ หรือบัญชีถูกลบ'
      })
    }

    console.log('👤 User found:', {
      _id: user._id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      parent_user_id: user.parent_user_id
    })

    // *** แก้ไข Logic การตรวจสอบ isActive ***
    
    // สำหรับ role 'user' (เจ้าของร้าน) - ไม่ต้องตรวจสอบ isActive
    if (user.role === 'user') {
      console.log('✅ User role (owner) - skipping isActive check')
    }
    // สำหรับ role 'employee' - ต้องตรวจสอบ isActive
    else if (user.role === 'employee') {
      if (!user.isActive) {
        console.log('❌ Employee account is inactive')
        return res.status(403).json({
          success: false,
          message: 'บัญชีพนักงานถูกระงับการใช้งาน'
        })
      }
      
      // ตรวจสอบ parent_user_id สำหรับพนักงาน
      if (user.parent_user_id) {
        const parentUser = await User.findById(user.parent_user_id).select('isActive')
        if (!parentUser || !parentUser.isActive) {
          console.log('❌ Parent user (owner) is inactive')
          return res.status(403).json({
            success: false,
            message: 'บัญชีเจ้าของร้านถูกระงับ ไม่สามารถใช้งานได้'
          })
        }
        console.log('✅ Parent user (owner) is active')
      }
    }
    // สำหรับ role อื่นๆ (admin, etc.)
    else {
      if (!user.isActive) {
        console.log('❌ Account is inactive for role:', user.role)
        return res.status(403).json({
          success: false,
          message: 'บัญชีถูกระงับการใช้งาน'
        })
      }
    }

    // เพิ่มข้อมูลผู้ใช้ใน request object
    req.user = {
      userId: user._id,
      _id: user._id,
      username: user.username,
      role: user.role,
      parent_user_id: user.parent_user_id,
      isActive: user.isActive
    }

    console.log('✅ Auth middleware passed, req.user:', req.user)

    // เพิ่ม token ใน req เพื่อใช้ใน logout
    req.token = token

    next()
  } catch (err) {
    console.error('❌ Auth middleware error:', err)
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
        code: 'TOKEN_EXPIRED'
      })
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้อง',
        code: 'INVALID_TOKEN'
      })
    }

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
    })
  }
}

// Middleware สำหรับตรวจสอบสิทธิ์แบบ optional (ไม่บังคับ)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      req.user = null
      return next()
    }

    // ใช้ authenticateToken แต่ไม่ return error ถ้าไม่มี token
    await authenticateToken(req, res, (err) => {
      if (err) {
        req.user = null
      }
      next()
    })
  } catch (error) {
    req.user = null
    next()
  }
}

// ฟังก์ชันสำหรับ logout (เพิ่ม token เข้า blacklist)
const blacklistToken = (token) => {
  tokenBlacklist.add(token)
  
  // ลบ token ออกจาก blacklist หลังจากหมดอายุ (15 นาที)
  setTimeout(() => {
    tokenBlacklist.delete(token)
  }, 15 * 60 * 1000)
}

// ฟังก์ชันตรวจสอบ token ว่าอยู่ใน blacklist หรือไม่
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token)
}

// Middleware สำหรับล้าง expired tokens จาก blacklist
const cleanupBlacklist = () => {
  // ในการใช้งานจริงควรใช้ Redis และ TTL
  // สำหรับตอนนี้จะใช้ Set และ setTimeout
  console.log('Cleaning up token blacklist...')
}

// รัน cleanup ทุก 1 ชั่วโมง
setInterval(cleanupBlacklist, 60 * 60 * 1000)

module.exports = { 
  authenticateToken, 
  optionalAuth,
  blacklistToken,
  isTokenBlacklisted
}