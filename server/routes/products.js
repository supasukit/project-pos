const express = require('express')
const Product = require('../models/Product')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// ⭐ สำคัญ: ต้องใส่ route ที่เฉพาะเจาะจงก่อน route ทั่วไป

// GET /api/products/categories - ดึงรายการหมวดหมู่ (ต้องอยู่ก่อน route /)
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query
    
    console.log('🔍 Categories request - userId from query:', userId)
    console.log('🔍 Categories request - req.user:', req.user)
    
    const query = { is_active: true }
    
    // แก้ไขการตรวจสอบ userId
    if (userId && userId !== 'undefined' && userId !== 'null') {
      try {
        const mongoose = require('mongoose')
        if (mongoose.Types.ObjectId.isValid(userId)) {
          query.created_by = userId
          console.log('✅ Using userId for categories:', userId)
        } else {
          console.warn('⚠️ Invalid userId format:', userId)
        }
      } catch (error) {
        console.error('❌ Error validating userId:', error)
      }
    } else {
      console.warn('⚠️ No valid userId provided, fetching all categories')
    }
    
    console.log('🔍 Final query for categories:', query)

    // ดึงหมวดหมู่ที่ไม่ซ้ำกัน
    const categories = await Product.distinct('category', query)
    
    console.log('📥 Found categories:', categories)

    res.json({
      success: true,
      data: categories.filter(cat => cat && cat.trim() !== '')
    })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่'
    })
  }
})

// GET /api/products - ดึงรายการสินค้าตาม user ID
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50, userId } = req.query
    
    console.log('🔍 Products request - userId from query:', userId)
    console.log('🔍 Products request - req.user:', req.user)

    const query = { is_active: true }

    // แก้ไขการตรวจสอบ userId
    let finalUserId = userId
    
    // ถ้าไม่มี userId จาก query ให้ใช้จาก token
    if (!finalUserId || finalUserId === 'undefined' || finalUserId === 'null') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId || req.user._id
      }
    }
    
    console.log('🔍 Final userId to use:', finalUserId)
    
    // ตรวจสอบว่า finalUserId เป็น valid ObjectId
    if (finalUserId && finalUserId !== 'undefined' && finalUserId !== 'null') {
      try {
        const mongoose = require('mongoose')
        if (mongoose.Types.ObjectId.isValid(finalUserId)) {
          query.created_by = finalUserId
          console.log('✅ Using finalUserId for products:', finalUserId)
        } else {
          console.warn('⚠️ Invalid finalUserId format:', finalUserId)
          return res.status(400).json({
            success: false,
            message: 'รูปแบบ User ID ไม่ถูกต้อง'
          })
        }
      } catch (error) {
        console.error('❌ Error validating finalUserId:', error)
        return res.status(400).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการตรวจสอบ User ID'
        })
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ User ID สำหรับดึงข้อมูลสินค้า'
      })
    }

    // กรองตามหมวดหมู่
    if (category && category !== 'all') {
      query.category = category
    }

    // ค้นหา
    if (search) {
      query.$text = { $search: search }
    }
    
    console.log('🔍 Final query for products:', query)

    const products = await Product.find(query)
      .populate('created_by', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Product.countDocuments(query)
    
    console.log(`📥 Found ${products.length} products out of ${total} total`)

    res.json({
      success: true,
      data: products,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total
      }
    })
  } catch (error) {
    console.error('Get products error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า'
    })
  }
})

// POST /api/products - เพิ่มสินค้าใหม่
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('👤 req.user:', req.user)

    // เช็คว่าใครเป็นคนเพิ่มสินค้า
    let storeUserId
    if (req.user.role === 'employee') {
      storeUserId = req.user.parent_user_id
    } else {
      storeUserId = req.user._id || req.user.id || req.user.userId
    }

    if (!storeUserId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ user ID ใน token'
      })
    }

    const productData = {
      ...req.body,
      created_by: storeUserId
    }

    console.log('📝 Product data:', productData)

    const newProduct = new Product(productData)
    await newProduct.save()

    res.json({
      success: true,
      message: 'เพิ่มสินค้าสำเร็จ',
      data: newProduct
    })
  } catch (error) {
    console.error('❌ Error adding product:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า: ' + error.message
    })
  }
})

module.exports = router