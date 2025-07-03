const express = require('express')
const Product = require('../models/Product')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// GET /api/products - ดึงรายการสินค้าตาม user ID
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50, userId } = req.query
    
    // ถ้าไม่ส่ง userId มา ให้ดึงจาก token
    let query = { is_active: true }
    
    if (userId) {
      query.created_by = userId  // ← เพิ่มการกรองตาม created_by
    }
    
    // กรองตามหมวดหมู่
    if (category && category !== 'all') {
      query.category = category
    }
    
    // ค้นหา
    if (search) {
      query.$text = { $search: search }
    }
    
    const products = await Product.find(query)
      .populate('created_by', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
    
    const total = await Product.countDocuments(query)
    
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
        // Debug: ดูว่า req.user มีอะไรบ้าง
        console.log('👤 req.user:', req.user)
        
        const userId = req.user._id || req.user.id || req.user.userId
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบ user ID ใน token'
            })
        }
        
        const productData = {
            ...req.body,
            created_by: userId
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

// GET /api/products/categories - ดึงรายการหมวดหมู่
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query
    
    let query = { is_active: true }
    if (userId) {
      query.created_by = userId
    }
    
    // ดึงหมวดหมู่ที่ไม่ซ้ำกัน
    const categories = await Product.distinct('category', query)
    
    res.json({
      success: true,
      data: categories.filter(cat => cat && cat.trim() !== '') // กรองค่าว่าง
    })
    
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่'
    })
  }
})

module.exports = router