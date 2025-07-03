const express = require('express')
const mongoose = require('mongoose')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// GET /api/orders/:id - ดึงรายละเอียดบิลและรายการสินค้า
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: orderId } = req.params
    
    // ดึงข้อมูลบิล
    const order = await mongoose.connection.db.collection('orders').findOne({
      _id: new mongoose.Types.ObjectId(orderId)
    })
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลบิล'
      })
    }
    
    // ดึงรายการสินค้าในบิล
    const items = await mongoose.connection.db.collection('order_items').find({
      order: new mongoose.Types.ObjectId(orderId)
    }).toArray()
    
    res.json({
      success: true,
      data: {
        order: order,
        items: items
      }
    })
    
  } catch (error) {
    console.error('Get order detail error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดบิล'
    })
  }
})

// GET /api/orders - ดึงประวัติการขาย
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, limit = 50, sort = 'newest' } = req.query
    
    let query = {}
    if (userId) {
      query.store_owner = new mongoose.Types.ObjectId(userId)
    }
    
    // แก้ไขตรงนี้ - เพิ่ม mongoose.connection
    const orders = await mongoose.connection.db.collection('orders').find(query)
      .sort({ created_at: sort === 'newest' ? -1 : 1 })
      .limit(parseInt(limit))
      .toArray()
    
    res.json({
      success: true,
      data: orders
    })
    
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์'
    })
  }
})

module.exports = router