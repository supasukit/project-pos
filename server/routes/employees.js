const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { authenticateToken } = require('../middleware/auth')


const SALT_ROUNDS = 12 
const PEPPER = process.env.PASSWORD_PEPPER || 'your-secret-pepper-change-this'

const hashPassword = async (password) => {
  const pepperedPassword = password + PEPPER
  return await bcrypt.hash(pepperedPassword, SALT_ROUNDS)
}

// ========== CREATE (Add Employee) ==========
router.post('/', authenticateToken, async (req, res) => {
  try {
    // เช็คสิทธิ์
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เพิ่มพนักงาน'
      })
    }

    const { username, password, owner_name, store_phone, store_address, email } = req.body

    // เช็คว่าข้อมูลครบไหม
    if (!username || !password || !owner_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลพนักงานและอีเมลให้ครบถ้วน'
      })
    }

    // เช็ค username ซ้ำ
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username นี้มีผู้ใช้แล้ว'
      })
    }

    // เช็ค email ซ้ำ
    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว'
      })
    }

    // เช็ค parent_user_id
    const parentUserId = req.user.userId || req.user._id || req.user.id
    if (!parentUserId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ parent_user_id ของเจ้าของร้าน กรุณา login ใหม่'
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    
    // สร้างพนักงานใหม่
    const employee = new User({
      username,
      password: hashedPassword,
      role: 'employee',
      owner_name,
      store_phone,
      store_address,
      parent_user_id: parentUserId,
      isActive: true,
      email
    })

    await employee.save()

    res.json({
      success: true,
      message: 'เพิ่มพนักงานสำเร็จ',
      data: {
        _id: employee._id,
        username: employee.username,
        owner_name: employee.owner_name,
        email: employee.email,
        role: employee.role,
        parent_user_id: employee.parent_user_id,
        isActive: employee.isActive
      }
    })
  } catch (error) {
    console.error('Error creating employee:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน'
    })
  }
})



// เพิ่มฟังก์ชันตรวจสอบ parent_user_id ของ employee ที่มีอยู่
router.get('/debug/:employeeId', authenticateToken, async (req, res) => {
  try {
    const employee = await User.findById(req.params.employeeId)
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบพนักงาน'
      })
    }

    console.log('🔍 Employee debug info:')
    console.log('- ID:', employee._id)
    console.log('- Username:', employee.username)
    console.log('- Role:', employee.role)
    console.log('- Parent User ID:', employee.parent_user_id)
    console.log('- IsActive:', employee.isActive)

    res.json({
      success: true,
      data: {
        _id: employee._id,
        username: employee.username,
        role: employee.role,
        parent_user_id: employee.parent_user_id,
        isActive: employee.isActive,
        owner_name: employee.owner_name
      }
    })
  } catch (error) {
    console.error('Error debugging employee:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด'
    })
  }
})

// ⭐ เพิ่มฟังก์ชันแก้ไข parent_user_id สำหรับ employee ที่มีอยู่แล้ว
router.put('/fix-parent-id/:employeeId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์แก้ไข'
      })
    }

    const employee = await User.findById(req.params.employeeId)
    
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบพนักงาน'
      })
    }

    // แก้ไข parent_user_id
    employee.parent_user_id = req.user.userId
    await employee.save()

    console.log(`✅ Fixed parent_user_id for employee ${employee.username}`)
    console.log(`   - Employee ID: ${employee._id}`)
    console.log(`   - Parent User ID: ${employee.parent_user_id}`)

    res.json({
      success: true,
      message: 'แก้ไข parent_user_id สำเร็จ',
      data: {
        _id: employee._id,
        username: employee.username,
        parent_user_id: employee.parent_user_id
      }
    })
  } catch (error) {
    console.error('Error fixing parent_user_id:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด'
    })
  }
})

// ========== READ (List Employees) ==========
router.get('/debug/:employeeId', authenticateToken, async (req, res) => {
  try {
    const employee = await User.findById(req.params.employeeId)
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบพนักงาน'
      })
    }

    console.log('🔍 Employee debug info:')
    console.log('- ID:', employee._id)
    console.log('- Username:', employee.username)
    console.log('- Role:', employee.role)
    console.log('- Parent User ID:', employee.parent_user_id)
    console.log('- IsActive:', employee.isActive)

    res.json({
      success: true,
      data: {
        _id: employee._id,
        username: employee.username,
        role: employee.role,
        parent_user_id: employee.parent_user_id,
        isActive: employee.isActive,
        owner_name: employee.owner_name
      }
    })
  } catch (error) {
    console.error('Error debugging employee:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด'
    })
  }
})

// ⭐ เพิ่มฟังก์ชันแก้ไข parent_user_id สำหรับ employee ที่มีอยู่แล้ว
router.put('/fix-parent-id/:employeeId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์แก้ไข'
      })
    }

    const employee = await User.findById(req.params.employeeId)
    
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบพนักงาน'
      })
    }

    // แก้ไข parent_user_id
    employee.parent_user_id = req.user.userId
    await employee.save()

    console.log(`✅ Fixed parent_user_id for employee ${employee.username}`)
    console.log(`   - Employee ID: ${employee._id}`)
    console.log(`   - Parent User ID: ${employee.parent_user_id}`)

    res.json({
      success: true,
      message: 'แก้ไข parent_user_id สำเร็จ',
      data: {
        _id: employee._id,
        username: employee.username,
        parent_user_id: employee.parent_user_id
      }
    })
  } catch (error) {
    console.error('Error fixing parent_user_id:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด'
    })
  }
})



// ========== DELETE ==========
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ลบพนักงาน'
      })
    }

    const result = await User.deleteOne({
      _id: req.params.id,
      parent_user_id: req.user.userId
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบพนักงาน'
      })
    }

    res.json({
      success: true,
      message: 'ลบพนักงานสำเร็จ'
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบพนักงาน'
    })
  }
})

// ========== EMPLOYEE: GET STORE INFO OF OWNER ==========
// GET /api/employees/store-info
router.get('/store-info', authenticateToken, async (req, res) => {
  try {
    // เฉพาะ employee เท่านั้น (กัน user, admin ไม่เรียก)
    if (req.user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'เฉพาะพนักงานเท่านั้นที่เข้าถึงข้อมูลร้านนี้'
      })
    }

    // ค้นหา user ที่เป็นเจ้าของ (parent_user_id ใน JWT)
    const owner = await User.findOne({ _id: req.user.parent_user_id || req.user.parent_userId || req.user.userId, role: 'user' })
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเจ้าของร้าน'
      })
    }

    // ส่งข้อมูลร้าน (เลือกเฉพาะ field ที่ต้องการโชว์)
    res.json({
      success: true,
      data: {
        owner_name: owner.owner_name,
        store_name: owner.store_name,
        store_address: owner.store_address,
        store_phone: owner.store_phone
      }
    })
  } catch (error) {
    console.error('Error fetching store info:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลร้าน'
    })
  }
})

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ดูรายชื่อพนักงาน'
      })
    }

    console.log('Loading employees for owner:', req.user.userId)

    const employees = await User.find({
      parent_user_id: req.user.userId,
      role: 'employee'
    }).select('_id username owner_name store_phone store_address isActive createdAt')

    console.log('Found employees:', employees.length)

    res.json({
      success: true,
      data: employees,
      count: employees.length
    })
  } catch (error) {
    console.error('Error loading employees:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน'
    })
  }
})
// ========== UPDATE STATUS ==========
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์แก้ไขสถานะพนักงาน'
      })
    }

    const { isActive } = req.body
    
    console.log(`Updating employee ${req.params.id} status to:`, isActive)

    const employee = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        parent_user_id: req.user.userId,
        role: 'employee'
      },
      { 
        isActive: isActive,
        updatedAt: new Date()
      },
      { new: true }
    ).select('_id username owner_name isActive')

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบพนักงาน'
      })
    }

    console.log(`Employee status updated:`, employee.username, isActive)

    res.json({
      success: true,
      message: `${isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}พนักงานสำเร็จ`,
      data: employee
    })
  } catch (error) {
    console.error('Error updating employee status:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะพนักงาน'
    })
  }
})

module.exports = router
