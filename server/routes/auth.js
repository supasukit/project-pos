const jwt = require('jsonwebtoken')
const express = require('express')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { authenticateToken } = require('../middleware/auth') // ← เพิ่มบรรทัดนี้
const router = express.Router()
const crypto = require('crypto')
const nodemailer = require('nodemailer')

// POST /api/auth/register - สมัครสมาชิก
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, owner_name, store_name, store_phone, store_address } = req.body

    // ตรวจสอบข้อมูลที่ส่งมา
    if (!username || !email || !password || !owner_name || !store_name) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
      })
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      })
    }

    // ตรวจสอบว่า username หรือ email ซ้ำหรือไม่
    // ตรวจสอบว่า username หรือ email ซ้ำหรือไม่
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email: email.toLowerCase() }
      ]
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.username === username
          ? 'Username นี้ถูกใช้งานแล้ว'
          : 'Email นี้ถูกใช้งานแล้ว'
      })
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10)

    // สร้างผู้ใช้ใหม่
    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      owner_name: owner_name.trim(),
      store_name: store_name.trim(),
      store_phone: store_phone ? store_phone.trim() : '',
      store_address: store_address ? store_address.trim() : '',
      role: 'user',
      isActive: true
    })

    // บันทึกลงฐานข้อมูล
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

    console.log(`✅ New user registered: ${username}`)
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
    })
  }
})




// POST /api/auth/login - แก้ไขเฉพาะส่วนนี้
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก username และ password'
      })
    }

    // หาผู้ใช้
    const user = await User.findOne({
      $or: [
        { username },
        { email: username.toLowerCase() }
      ]
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบผู้ใช้งาน'
      })
    }

    // ⭐ เพิ่มส่วนนี้ - ตรวจสอบสถานะพนักงาน
    if (user.role === 'employee' && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีถูกระงับการใช้งาน'
      })
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง'
      })
    }

    // สร้าง JWT token
    const tokenPayload = {
      userId: user._id,
      username: user.username,
      role: user.role
    }
    // >>>> ใส่ parent_user_id ใน token ด้วยถ้าเป็น employee
    if (user.role === 'employee' && user.parent_user_id) {
      tokenPayload.parent_user_id = user.parent_user_id
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    // ⭐ เตรียม user object ส่งกลับ
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
      // >>>> ใส่ parent_user_id ลง userData เสมอ (null ถ้าไม่ใช่ employee)
      parent_user_id: user.parent_user_id || null
    }

    // ⭐ ถ้าเป็น employee ดึงชื่อร้านจาก owner ด้วย (optional)
    if (user.role === 'employee' && user.parent_user_id) {
      const owner = await User.findById(user.parent_user_id)
      if (owner) {
        userData.store_name = owner.store_name
      }
    }

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        user: userData
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    })
  }
})


// POST /api/auth/logout (optional)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ'
  })
})

router.post('/forgot-password', async (req, res) => {
  try {
    console.log('🔍 Forgot password request received:', req.body)

    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก Email'
      })
    }

    console.log('🔎 Searching for user with email:', email)

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      console.log('❌ User not found with email:', email)
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
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง Email: ' + error.message
    })
  }
})

// POST /api/auth/reset-password - รีเซ็ตรหัสผ่าน
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      })
    }

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
    const hashedPassword = await bcrypt.hash(newPassword, 10)

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

async function sendResetEmail (email, name, resetUrl) {
  try {
    // Debug ข้อมูล environment
    console.log('📧 All email environment variables:')
    console.log('SMTP_USER:', process.env.SMTP_USER)
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'EXISTS' : 'MISSING')
    console.log('EMAIL_USER:', process.env.EMAIL_USER)
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'EXISTS' : 'MISSING')

    // ใช้ fallback หา credentials ที่มี
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS

    console.log('📧 Using credentials:')
    console.log('User:', emailUser)
    console.log('Pass:', emailPass ? 'EXISTS' : 'MISSING')

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials not found in environment variables')
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    })

    // ทดสอบการเชื่อมต่อก่อน
    console.log('🔌 Testing SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection successful')

    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'รีเซ็ตรหัสผ่าน - POS System',
      html: `
        <h2>สวัสดีคุณ ${name}</h2>
        <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับ POS System</p>
        <p>กรุณาคลิกลิงค์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
        <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          รีเซ็ตรหัสผ่าน
        </a>
        <p><small>ลิงค์นี้จะหมดอายุใน 15 นาที</small></p>
      `
    }

    console.log('📬 Sending email to:', email)
    await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully!')
  } catch (error) {
    console.error('❌ Email send error:', error)
    throw error
  }
}

// GET /api/auth/users - ดูรายชื่อผู้ใช้ (สำหรับทดสอบ)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password')

    res.json({
      success: true,
      count: users.length,
      data: users
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
    })
  }
})
// GET /api/auth/profile - ดึงข้อมูล user ปัจจุบัน
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password')

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
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { owner_name, store_name, store_phone, store_address } = req.body

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        owner_name,
        store_name,
        store_phone,
        store_address,
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    )

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      data: updatedUser
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดท'
    })
  }
})
module.exports = router
