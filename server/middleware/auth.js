const jwt = require('jsonwebtoken')
const User = require('../models/User')

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'ไม่พบ token'
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')

    // ดึงข้อมูล user เพิ่มเติม
    const user = await User.findById(decoded.userId).select('-password')

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

    req.user = {
      userId: user._id,
      _id: user._id,
      username: user.username,
      role: user.role,
      parent_user_id: user.parent_user_id
    }

    next()
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Token ไม่ถูกต้อง'
    })
  }
}

module.exports = { authenticateToken }
