const jwt = require('jsonwebtoken')

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'ไม่พบ token' 
    })
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token ไม่ถูกต้อง' 
      })
    }
    
    // 🔍 Debug: ดูว่า JWT decode ได้อะไร
    console.log('🔐 JWT decoded user:', user)
    console.log('🆔 Available user properties:', Object.keys(user))
    
    req.user = user
    next()
  })
}

module.exports = { authenticateToken }