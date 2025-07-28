const express = require('express')
const mongoose = require('mongoose')
const Product = require('../models/Product')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// ฟังก์ชันช่วยในการแปลง string หรือ ObjectId เป็น ObjectId
const toObjectId = (id) => {
  if (!id || id === 'undefined' || id === 'null') {
    return null
  }
  
  try {
    // ถ้าเป็น ObjectId อยู่แล้ว ให้ return ตรงๆ
    if (id instanceof mongoose.Types.ObjectId) {
      console.log('✅ Already ObjectId:', id)
      return id
    }
    
    // ถ้าเป็น string ให้ตรวจสอบและแปลง
    if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
      console.log('✅ Converting string to ObjectId:', id)
      return new mongoose.Types.ObjectId(id)
    }
    
    // ถ้าเป็น object อื่นๆ ลองแปลงเป็น string แล้วแปลงเป็น ObjectId
    const stringId = String(id)
    if (mongoose.Types.ObjectId.isValid(stringId)) {
      console.log('✅ Converting to string then ObjectId:', stringId)
      return new mongoose.Types.ObjectId(stringId)
    }
    
    console.warn('⚠️ Cannot convert to ObjectId:', id, typeof id)
    return null
  } catch (error) {
    console.error('❌ Error converting to ObjectId:', error, 'Input:', id, typeof id)
    return null
  }
}

// ฟังก์ชันช่วยในการหา userId ที่ถูกต้อง - แก้ไขใหม่
const getUserId = (req, queryUserId) => {
  console.log('🔍 Getting userId - queryUserId:', queryUserId)
  console.log('🔍 Getting userId - req.user:', req.user)
  console.log('🔍 Getting userId - req.user.userId type:', typeof req.user.userId)
  console.log('🔍 Getting userId - req.user.parent_user_id type:', typeof req.user.parent_user_id)
  
  let targetUserId = queryUserId
  
  // ถ้าไม่มี userId จาก query ให้ใช้จาก token
  if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
    if (req.user.role === 'employee' && req.user.parent_user_id) {
      targetUserId = req.user.parent_user_id
      console.log('🔍 Using parent_user_id for employee:', targetUserId)
    } else {
      // ลำดับการหา userId จาก token
      targetUserId = req.user.userId || req.user._id || req.user.id
      console.log('🔍 Using userId from token:', targetUserId)
    }
  }
  
  console.log('🔍 Target userId before conversion:', targetUserId)
  console.log('🔍 Target userId type:', typeof targetUserId)
  
  // *** แก้ไขสำคัญ: บังคับแปลงเป็น ObjectId เสมอ ***
  const objectId = toObjectId(targetUserId)
  
  if (!objectId) {
    console.error('❌ Cannot convert to ObjectId:', targetUserId)
    return null
  }
  
  console.log('🔍 Final ObjectId:', objectId)
  console.log('🔍 Final ObjectId constructor:', objectId.constructor.name)
  
  return objectId
}

// 🔧 DEBUG ROUTE - ตรวจสอบข้อมูลในฐานข้อมูล
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    console.log('🐛 DEBUG: Starting database investigation...')
    console.log('🐛 req.user:', JSON.stringify(req.user, null, 2))
    console.log('🐛 req.query:', req.query)
    
    // 1. นับสินค้าทั้งหมดในฐานข้อมูล
    const totalProducts = await Product.countDocuments({})
    console.log('📊 Total products in database:', totalProducts)
    
    // 2. นับสินค้าที่ is_active: true
    const activeProducts = await Product.countDocuments({ is_active: true })
    console.log('📊 Active products:', activeProducts)
    
    // 3. ดูข้อมูล created_by ทั้งหมด
    const createdByData = await Product.distinct('created_by')
    console.log('👥 All created_by values:', createdByData)
    
    // 4. ตรวจสอบ userId ที่กำลังใช้
    const userObjectId = getUserId(req, req.query.userId)
    console.log('🎯 Current user ObjectId:', userObjectId)
    
    // 5. นับสินค้าของ user ปัจจุบัน
    let userProductsCount = 0
    if (userObjectId) {
      userProductsCount = await Product.countDocuments({ 
        created_by: userObjectId, 
        is_active: true 
      })
    }
    console.log('📊 Current user products count:', userProductsCount)
    
    // 6. ดึงสินค้าตัวอย่าง 5 รายการ
    const sampleProducts = await Product.find({})
      .select('_id name created_by is_active')
      .limit(5)
      .lean()
    console.log('📝 Sample products:', sampleProducts)
    
    // 7. ทดสอบ query หลายแบบ
    const queries = [
      // Query แบบเดิม
      { is_active: true, created_by: userObjectId },
      // Query แบบไม่มี created_by
      { is_active: true },
      // Query แบบไม่มี is_active
      { created_by: userObjectId },
      // Query ทั้งหมด
      {}
    ]
    
    const queryResults = []
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      const count = await Product.countDocuments(query)
      queryResults.push({
        query: JSON.stringify(query),
        count: count
      })
      console.log(`🔍 Query ${i + 1}: ${JSON.stringify(query)} = ${count} results`)
    }
    
    // 8. ตรวจสอบว่ามี products ที่ created_by เป็น string หรือไม่
    const stringCreatedBy = await Product.find({ 
      created_by: { $type: "string" } 
    }).countDocuments()
    console.log('📊 Products with string created_by:', stringCreatedBy)
    
    // 9. หาข้อมูล user ทั้งหมดที่มีสินค้า
    const usersWithProducts = await Product.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: "$created_by", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    console.log('👥 Users with products:', usersWithProducts)
    
    res.json({
      success: true,
      debug_info: {
        req_user: req.user,
        total_products: totalProducts,
        active_products: activeProducts,
        current_user_id: userObjectId,
        current_user_products: userProductsCount,
        created_by_values: createdByData,
        sample_products: sampleProducts,
        query_tests: queryResults,
        string_created_by: stringCreatedBy,
        users_with_products: usersWithProducts
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    })
  }
})

// GET /api/products/categories - ดึงรายการหมวดหมู่
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query
    
    console.log('🔍 Categories request - userId from query:', userId)
    console.log('🔍 Categories request - req.user:', req.user)
    
    const query = { is_active: true }
    
    // หา userId ที่ถูกต้อง
    const userObjectId = getUserId(req, userId)
    
    if (userObjectId) {
      query.created_by = userObjectId
      console.log('✅ Using userId for categories:', userObjectId)
    } else {
      console.warn('⚠️ No valid userId found, fetching all categories')
    }
    
    console.log('🔍 Final query for categories:', JSON.stringify(query, null, 2))

    // ดึงหมวดหมู่ที่ไม่ซ้ำกัน
    const categories = await Product.distinct('category', query)
    
    console.log('📥 Found categories:', categories)

    res.json({
      success: true,
      data: categories.filter(cat => cat && cat.trim() !== ''),
      count: categories.length
    })
  } catch (error) {
    console.error('❌ Get categories error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// GET /api/products - ดึงรายการสินค้าตาม user ID
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50, userId, showAll } = req.query
    
    console.log('🔍 Products request - Full query params:', req.query)
    console.log('🔍 Products request - req.user:', req.user)

    const query = { is_active: true }

    // หา userId ที่ถูกต้อง
    const userObjectId = getUserId(req, userId)
    console.log('🎯 Final userObjectId for query:', userObjectId)
    
    // *** แก้ไขตรงนี้ - เพิ่ม debug mode ***
    if (showAll === 'true') {
      console.log('🐛 DEBUG MODE: Showing all products (no user filter)')
      // ไม่เพิ่ม created_by filter
    } else {
      if (!userObjectId) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบ User ID ที่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'
        })
      }
      query.created_by = userObjectId
      console.log('✅ Adding created_by filter:', userObjectId)
    }

    // กรองตามหมวดหมู่
    if (category && category !== 'all' && category.trim() !== '') {
      query.category = category
      console.log('🏷️ Adding category filter:', category)
    }

    // ค้นหา
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
      console.log('🔍 Adding search filter:', search)
    }
    
    console.log('🔍 Final query for products:', JSON.stringify(query, null, 2))

    // นับจำนวนก่อน
    const totalCount = await Product.countDocuments(query)
    console.log(`📊 Total count with current query: ${totalCount}`)

    // แปลง page และ limit เป็น number
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    console.log('📄 Pagination:', { pageNum, limitNum, skip })

    // ดึงข้อมูลสินค้า
    const products = await Product.find(query)
      .populate('created_by', 'username email')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean()

    console.log(`📥 Found ${products.length} products out of ${totalCount} total`)
    
    // แสดงข้อมูลตัวอย่าง
    if (products.length > 0) {
      console.log('📊 First product sample:', {
        _id: products[0]._id,
        name: products[0].name,
        created_by: products[0].created_by,
        is_active: products[0].is_active
      })
    }

    res.json({
      success: true,
      data: products,
      pagination: {
        current_page: pageNum,
        total_pages: Math.ceil(totalCount / limitNum),
        total_items: totalCount,
        items_per_page: limitNum,
        has_next: pageNum < Math.ceil(totalCount / limitNum),
        has_prev: pageNum > 1
      },
      debug_info: {
        query_used: query,
        user_object_id: userObjectId,
        show_all_mode: showAll === 'true'
      }
    })
  } catch (error) {
    console.error('❌ Get products error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// GET /api/products/:id - ดึงสินค้าตาม ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    console.log('🔍 Get single product - id:', id)
    
    const productObjectId = toObjectId(id)
    if (!productObjectId) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ Product ID ไม่ถูกต้อง'
      })
    }
    
    const userObjectId = getUserId(req, req.query.userId)
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ User ID ที่ถูกต้อง'
      })
    }
    
    const query = {
      _id: productObjectId,
      created_by: userObjectId,
      is_active: true
    }
    
    console.log('🔍 Single product query:', JSON.stringify(query, null, 2))
    
    const product = await Product.findOne(query)
      .populate('created_by', 'username email')
      .lean()
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสินค้าที่ต้องการ'
      })
    }
    
    console.log('📥 Found product:', { _id: product._id, name: product.name })
    
    res.json({
      success: true,
      data: product
    })
  } catch (error) {
    console.error('❌ Get single product error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// POST /api/products - เพิ่มสินค้าใหม่
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Add product - req.user:', req.user)
    console.log('📝 Add product - req.body:', req.body)

    // หา userId ที่ถูกต้อง
    const userObjectId = getUserId(req, null)
    
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ User ID ใน token กรุณาเข้าสู่ระบบใหม่'
      })
    }

    const productData = {
      ...req.body,
      created_by: userObjectId,
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log('📝 Product data to save:', JSON.stringify(productData, null, 2))

    const newProduct = new Product(productData)
    const savedProduct = await newProduct.save()
    
    // Populate ข้อมูลผู้สร้าง
    await savedProduct.populate('created_by', 'username email')

    console.log('✅ Product saved successfully:', { _id: savedProduct._id, name: savedProduct.name })

    res.status(201).json({
      success: true,
      message: 'เพิ่มสินค้าสำเร็จ',
      data: savedProduct
    })
  } catch (error) {
    console.error('❌ Error adding product:', error)
    
    // จัดการ validation error
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }))
      
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// PUT /api/products/:id - แก้ไขสินค้า
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    console.log('🔍 Update product - id:', id)
    console.log('📝 Update product - req.body:', req.body)
    
    const productObjectId = toObjectId(id)
    if (!productObjectId) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ Product ID ไม่ถูกต้อง'
      })
    }
    
    const userObjectId = getUserId(req, req.query.userId)
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ User ID ที่ถูกต้อง'
      })
    }
    
    const query = {
      _id: productObjectId,
      created_by: userObjectId,
      is_active: true
    }
    
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    }
    
    // ไม่ให้แก้ไข created_by และ createdAt
    delete updateData.created_by
    delete updateData.createdAt
    
    console.log('🔍 Update query:', JSON.stringify(query, null, 2))
    console.log('📝 Update data:', JSON.stringify(updateData, null, 2))
    
    const updatedProduct = await Product.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('created_by', 'username email')
    
    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสินค้าที่ต้องการแก้ไข'
      })
    }
    
    console.log('✅ Product updated successfully:', { _id: updatedProduct._id, name: updatedProduct.name })
    
    res.json({
      success: true,
      message: 'แก้ไขสินค้าสำเร็จ',
      data: updatedProduct
    })
  } catch (error) {
    console.error('❌ Error updating product:', error)
    
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }))
      
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขสินค้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// DELETE /api/products/:id - ลบสินค้า (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    console.log('🗑️ Delete product - id:', id)
    
    const productObjectId = toObjectId(id)
    if (!productObjectId) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ Product ID ไม่ถูกต้อง'
      })
    }
    
    const userObjectId = getUserId(req, req.query.userId)
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ User ID ที่ถูกต้อง'
      })
    }
    
    const query = {
      _id: productObjectId,
      created_by: userObjectId,
      is_active: true
    }
    
    console.log('🔍 Delete query:', JSON.stringify(query, null, 2))
    
    const deletedProduct = await Product.findOneAndUpdate(
      query,
      { 
        is_active: false, 
        updatedAt: new Date(),
        deletedAt: new Date()
      },
      { new: true }
    )
    
    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสินค้าที่ต้องการลบ'
      })
    }
    
    console.log('✅ Product deleted successfully:', { _id: deletedProduct._id, name: deletedProduct.name })
    
    res.json({
      success: true,
      message: 'ลบสินค้าสำเร็จ'
    })
  } catch (error) {
    console.error('❌ Error deleting product:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบสินค้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

module.exports = router