const jwt = require('jsonwebtoken')
const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const { body, validationResult } = require('express-validator')
const xss = require('xss')

const User = require('../models/User')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// ================== SECURITY CONSTANTS ==================

const SALT_ROUNDS = 12 // เพิ่มจาก 10 เป็น 12
const PEPPER = process.env.PASSWORD_PEPPER || 'your-secret-pepper-change-this'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'

// ================== UTILITY FUNCTIONS ==================

const hashPassword = async (password) => {
  const pepperedPassword = password + PEPPER
  return await bcrypt.hash(pepperedPassword, SALT_ROUNDS)
}

const verifyPassword = async (password, hashedPassword) => {
  const pepperedPassword = password + PEPPER
  return await bcrypt.compare(pepperedPassword, hashedPassword)
}

const generateTokens = (user) => {
  const accessTokenPayload = {
    userId: user._id,
    username: user.username,
    role: user.role
  }
  
  // เพิ่ม parent_user_id ถ้าเป็น employee
  if (user.role === 'employee' && user.parent_user_id) {
    accessTokenPayload.parent_user_id = user.parent_user_id
  }

  const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' })

  return { accessToken, refreshToken }
}

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return xss(input.trim())
  }
  return input
}

// ================== VALIDATION MIDDLEWARE ==================

const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username ต้องมี 3-20 ตัวอักษร และเป็นตัวอักษร ตัวเลข หรือ _ เท่านั้น')
    .custom(async (value) => {
      const existingUser = await User.findOne({ username: value })
      if (existingUser) {
        throw new Error('Username นี้ถูกใช้งานแล้ว')
      }
      return true
    }),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('รูปแบบ email ไม่ถูกต้อง')
    .custom(async (value) => {
      const existingUser = await User.findOne({ email: value.toLowerCase() })
      if (existingUser) {
        throw new Error('Email นี้ถูกใช้งานแล้ว')
      }
      return true
    }),
  
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ'),

  body('owner_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('ชื่อเจ้าของต้องมี 2-100 ตัวอักษร'),

  body('store_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('ชื่อร้านต้องมี 2-100 ตัวอักษร'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array()
      })
    }
    next()
  }
]

const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('กรุณากรอก username หรือ email'),
  
  body('password')
    .notEmpty()
    .withMessage('กรุณากรอกรหัสผ่าน'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน',
        errors: errors.array()
      })
    }
    next()
  }
]

const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('รูปแบบ email ไม่ถูกต้อง'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ email ไม่ถูกต้อง',
        errors: errors.array()
      })
    }
    next()
  }
]

const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('ไม่พบ token'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array()
      })
    }
    next()
  }
]

// ================== ROUTES ==================

// POST /api/auth/register - สมัครสมาชิก
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, password, owner_name, store_name, store_phone, store_address } = req.body

    // Sanitize inputs
    const sanitizedData = {
      username: sanitizeInput(username.trim()),
      email: sanitizeInput(email.trim().toLowerCase()),
      owner_name: sanitizeInput(owner_name.trim()),
      store_name: sanitizeInput(store_name.trim()),
      store_phone: store_phone ? sanitizeInput(store_phone.trim()) : '',
      store_address: store_address ? sanitizeInput(store_address.trim()) : ''
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await hashPassword(password)

    // สร้างผู้ใช้ใหม่
    const newUser = new User({
      ...sanitizedData,
      password: hashedPassword,
      role: 'user',
      isActive: true
    })

    await newUser.save()

    // ส่งผลลัพธ์กลับ (ไม่ส่งรหัสผ่าน)
    const userWithoutPassword = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      owner_name: newUser.owner_name,
      store_name: newUser.store_name,
      store_phone: newUser.store_phone,
      store_address: newUser.store_address,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt
    }

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ',
      data: {
        user: userWithoutPassword
      }
    })

    console.log(`✅ New user registered: ${sanitizedData.username}`)
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
    })
  }
})

// POST /api/auth/login - เข้าสู่ระบบ
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body

    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username.trim())

    // หาผู้ใช้
    const user = await User.findOne({
      $or: [
        { username: sanitizedUsername },
        { email: sanitizedUsername.toLowerCase() }
      ]
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      })
    }

    // ตรวจสอบสถานะพนักงาน
    if (user.role === 'employee' && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีถูกระงับการใช้งาน'
      })
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      })
    }

    // สร้าง tokens
    const tokens = generateTokens(user)

    // เตรียม user object ส่งกลับ
    const userData = {
      _id: user._id,
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      owner_name: user.owner_name,
      store_name: user.store_name,
      store_phone: user.store_phone,
      store_address: user.store_address,
      parent_user_id: user.parent_user_id || null
    }

    // ถ้าเป็น employee ดึงชื่อร้านจาก owner
    if (user.role === 'employee' && user.parent_user_id) {
      const owner = await User.findById(user.parent_user_id)
      if (owner) {
        userData.store_name = owner.store_name
      }
    }

    
// Set cookies for better session management
    res.cookie('token', tokens.accessToken, {
      httpOnly: false, // ให้ JS อ่านได้
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.posshop.org' : 'localhost',
      maxAge: 15 * 60 * 1000 // 15 minutes
    })

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      domain: process.env.NODE_ENV === 'production' ? '.posshop.org' : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        ...tokens,
        user: userData
      }
    })

    console.log(`✅ User logged in: ${user.username}`)
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    })
  }
})

// POST /api/auth/refresh - รีเฟรช token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ refresh token'
      })
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      })
    }

    // ตรวจสอบสถานะพนักงาน
    if (user.role === 'employee' && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีถูกระงับการใช้งาน'
      })
    }

    const tokens = generateTokens(user)
    
    res.json({
      success: true,
      data: tokens
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    res.status(403).json({
      success: false,
      message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
    })
  }
})

// POST /api/auth/logout
const { blacklistToken } = require('../middleware/auth') // เพิ่มบรรทัดนี้ด้านบน

router.post('/logout', authenticateToken, (req, res) => {
  try {
    // เพิ่ม token เข้า blacklist
    if (req.token) {
      blacklistToken(req.token)
      console.log('🚫 Token blacklisted:', req.token.substring(0, 20) + '...')
    }
    
    // ล้าง cookies จาก server side
    res.clearCookie('token', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.posshop.org' : 'localhost'
    })
    
    res.clearCookie('refreshToken', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.posshop.org' : 'localhost'
    })
    
    res.clearCookie('user', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.posshop.org' : 'localhost'
    })
    
    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    })
    
    console.log(`✅ User logged out: ${req.user.username}`)
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
    })
  }
})

// POST /api/auth/forgot-password

router.post('/forgot-password', validateEmail, async (req, res) => {
  try {
    console.log('🔍 Forgot password request received:', req.body)
    
    const { email } = req.body
    const sanitizedEmail = sanitizeInput(email.toLowerCase())

    console.log('🔎 Searching for user with email:', sanitizedEmail)

    const user = await User.findOne({ email: sanitizedEmail })

    if (!user) {
      console.log('❌ User not found with email:', sanitizedEmail)
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ Email นี้ในระบบ'
      })
    }

    console.log('✅ User found:', user.owner_name)

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000)

    console.log('🔐 Generated reset token for user:', user.email)

    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = resetExpires
    await user.save()

    console.log('💾 Token saved to database')

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`
    console.log('🔗 Reset URL:', resetUrl)

    console.log('📧 Attempting to send reset email...')
    await sendResetEmail(user.email, user.owner_name, resetUrl)

    res.json({
      success: true,
      message: 'ส่งลิงค์รีเซ็ตรหัสผ่านไปยัง Email แล้ว'
    })

    console.log(`📧 Reset email sent to: ${user.email}`)
  } catch (error) {
    console.error('❌ Forgot password error:', error)
    console.error('❌ Error stack:', error.stack)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง Email: ' + error.message
    })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', validatePasswordReset, async (req, res) => {
  try {
    const { token, newPassword } = req.body

    // หาผู้ใช้จาก token และตรวจสอบเวลา
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว'
      })
    }

    // เข้ารหัสรหัสผ่านใหม่
    const hashedPassword = await hashPassword(newPassword)

    // อัพเดทรหัสผ่านและลบ token
    user.password = hashedPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    })

    console.log(`🔐 Password reset successful for: ${user.email}`)
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
    })
  }
})

// ================== EMAIL FUNCTION ==================

async function sendResetEmail(email, name, resetUrl) {
  try {
    // ดีบัก environment variables
    console.log('📧 Email config check:')
    console.log('SMTP_HOST:', process.env.SMTP_HOST)
    console.log('SMTP_PORT:', process.env.SMTP_PORT)
    console.log('SMTP_USER:', process.env.SMTP_USER)
    console.log('SMTP_PASS exists:', !!process.env.SMTP_PASS)
    
    const emailUser = process.env.SMTP_USER
    const emailPass = process.env.SMTP_PASS

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials not found in environment variables')
    }

    // แก้ไขจาก createTransporter เป็น createTransport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // false สำหรับ port 587
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // ทดสอบการเชื่อมต่อ
    console.log('🔌 Testing SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection successful')

    const mailOptions = {
      from: `"POS System" <${emailUser}>`,
      to: email,
      subject: 'รีเซ็ตรหัสผ่าน - POS System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">🔐 รีเซ็ตรหัสผ่าน</h2>
          <p>สวัสดีคุณ <strong>${name}</strong></p>
          <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับ POS System</p>
          <p>กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              🔄 รีเซ็ตรหัสผ่าน
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            <strong>หมายเหตุ:</strong> ลิงค์นี้จะหมดอายุใน 15 นาที
          </p>
          <p style="color: #999; font-size: 12px; text-align: center;">
            หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาละเว้นอีเมลนี้
          </p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            © 2025 POS System - ส่งจากระบบอัตโนมัติ
          </p>
        </div>
      `
    }

    console.log('📬 Sending email to:', email)
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully!', result.messageId)
    
    return result
  } catch (error) {
    console.error('❌ Email send error:', error)
    throw error
  }
}
// ================== USER MANAGEMENT ROUTES ==================

// GET /api/auth/users - ดูรายชื่อผู้ใช้ (สำหรับ admin เท่านั้น)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // เฉพาะ admin หรือ user role เท่านั้น
    if (req.user.role !== 'user' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ดูรายชื่อผู้ใช้'
      })
    }

    const users = await User.find({}, '-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      count: users.length,
      data: users
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
    })
  }
})

// GET /api/auth/profile - ดึงข้อมูล user ปัจจุบัน
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -resetPasswordToken -resetPasswordExpires')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    })
  }
})

// PUT /api/auth/profile - อัพเดทข้อมูล user
router.put('/profile', authenticateToken, [
  body('owner_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('ชื่อเจ้าของต้องมี 2-100 ตัวอักษร'),

  body('store_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('ชื่อร้านต้องมี 2-100 ตัวอักษร'),

  body('store_phone')
    .optional()
    .trim()
    .matches(/^[0-9\-+().\s]+$/)
    .withMessage('รูปแบบเบอร์โทรไม่ถูกต้อง'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array()
      })
    }
    next()
  }
], async (req, res) => {
  try {
    const { owner_name, store_name, store_phone, store_address } = req.body

    // Sanitize inputs
    const updateData = {}
    if (owner_name) updateData.owner_name = sanitizeInput(owner_name.trim())
    if (store_name) updateData.store_name = sanitizeInput(store_name.trim())
    if (store_phone) updateData.store_phone = sanitizeInput(store_phone.trim())
    if (store_address !== undefined) updateData.store_address = sanitizeInput(store_address.trim())
    
    updateData.updatedAt = new Date()

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, select: '-password -resetPasswordToken -resetPasswordExpires' }
    )

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      })
    }

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      data: updatedUser
    })

    console.log(`✅ Profile updated: ${updatedUser.username}`)
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดท'
    })
  }
})

// POST /api/auth/change-password - เปลี่ยนรหัสผ่าน
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('กรุณากรอกรหัสผ่านปัจจุบัน'),

  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array()
      })
    }
    next()
  }
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      })
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
      })
    }

    // เข้ารหัสรหัสผ่านใหม่
    const hashedNewPassword = await hashPassword(newPassword)

    // อัพเดทรหัสผ่าน
    await User.findByIdAndUpdate(req.user.userId, {
      password: hashedNewPassword,
      updatedAt: new Date()
    })

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    })

    console.log(`🔐 Password changed for user: ${user.username}`)
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    })
  }
})

module.exports = router