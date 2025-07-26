const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'
      })
    }
    next()
  }
}

const employeeCanAccess = (req, res, next) => {
  if (req.user.role === 'user' || req.user.role === 'employee') {
    next()
  } else {
    res.status(403).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าถึง'
    })
  }
}

const ownerOnly = (req, res, next) => {
  if (req.user.role === 'user') {
    next()
  } else {
    res.status(403).json({
      success: false,
      message: 'เฉพาะเจ้าของร้านเท่านั้น'
    })
  }
}

module.exports = {
  checkRole,
  employeeCanAccess,
  ownerOnly
}
