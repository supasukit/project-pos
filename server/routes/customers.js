const express = require('express')
const mongoose = require('mongoose')
const Customer = require('../models/customer')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status = 'active', customer_type, page = 1, limit = 50, userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    const query = {
      created_by: finalUserId,
      status
    }

    if (customer_type && customer_type !== 'all') {
      if (customer_type === 'cash') {
        query.customer_type = 'cash'
      } else if (customer_type === 'credit') {
        query.customer_type = 'credit'
      } else if (customer_type === 'pending') {
        query.credit_balance = { $gt: 0 }
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    const customers = await Customer.find(query)
      .populate('created_by', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Customer.countDocuments(query)

    res.json({
      success: true,
      data: customers,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total
      }
    })
  } catch (error) {
    console.error('Get customers error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า'
    })
  }
})

router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    const customers = await Customer.find({
      created_by: finalUserId,
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    }).limit(10)

    res.json({
      success: true,
      data: customers
    })
  } catch (error) {
    console.error('Search customers error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาลูกค้า'
    })
  }
})

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      created_by: finalUserId
    }).populate('created_by', 'username')

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      })
    }

    res.json({
      success: true,
      data: customer
    })
  } catch (error) {
    console.error('Get customer error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า'
    })
  }
})

router.get('/:id/orders', authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.id
    const { userId } = req.query
    const db = mongoose.connection.db

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    const orders = await db.collection('orders').find({
      customer: new mongoose.Types.ObjectId(customerId),
      store_owner: new mongoose.Types.ObjectId(finalUserId)
    }).sort({ order_date: -1 }).toArray()

    res.json({
      success: true,
      data: orders
    })
  } catch (error) {
    console.error('Get customer orders error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการซื้อ'
    })
  }
})

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, email, notes } = req.body
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อและเบอร์โทรศัพท์'
      })
    }

    const existingCustomer = await Customer.findOne({
      phone: phone.trim(),
      created_by: finalUserId
    })

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'เบอร์โทรศัพท์นี้มีอยู่ในระบบแล้ว',
        existing_customer: {
          id: existingCustomer._id,
          name: existingCustomer.name,
          phone: existingCustomer.phone,
          credit_balance: existingCustomer.credit_balance
        }
      })
    }

    const newCustomer = new Customer({
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
      email: email ? email.trim() : '',
      notes: notes ? notes.trim() : '',
      created_by: finalUserId
    })

    await newCustomer.save()
    await newCustomer.populate('created_by', 'username')

    res.status(201).json({
      success: true,
      message: 'เพิ่มลูกค้าสำเร็จ',
      data: newCustomer
    })

    console.log(`New customer added: ${name} by ${req.user.username}`)
  } catch (error) {
    console.error('Add customer error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มลูกค้า'
    })
  }
})

router.post('/update-status', authenticateToken, async (req, res) => {
  try {
    const { customerId, purchaseType, amount } = req.body
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    const customer = await Customer.findOne({
      _id: customerId,
      created_by: finalUserId
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      })
    }

    if (purchaseType === 'cash') {
      await customer.addCashPurchase(amount)
    } else if (purchaseType === 'credit') {
      await customer.addCredit(amount)
    }

    res.json({
      success: true,
      message: 'อัพเดทสถานะลูกค้าสำเร็จ',
      data: customer
    })
  } catch (error) {
    console.error('Update customer status error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะ'
    })
  }
})

router.post('/checkout-with-update', authenticateToken, async (req, res) => {
  try {
    const { customer_data, payment_type, total_amount } = req.body
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    let customer = await Customer.findOne({
      phone: customer_data.phone,
      created_by: finalUserId
    })

    const oldCustomerType = customer ? customer.customer_type : null

    if (!customer) {
      customer = new Customer({
        name: customer_data.name,
        phone: customer_data.phone,
        address: customer_data.address || '',
        created_by: finalUserId
      })
    }

    if (payment_type === 'cash') {
      await customer.addCashPurchase(total_amount)
    } else if (payment_type === 'credit') {
      await customer.addCredit(total_amount)
    }

    const statusChanged = oldCustomerType !== customer.customer_type

    res.json({
      success: true,
      message: 'อัพเดทลูกค้าสำเร็จ',
      data: {
        customer_id: customer._id,
        customer_status: customer.customer_type,
        status_changed: statusChanged,
        old_status: oldCustomerType,
        store_owner: finalUserId,
        cashier: req.user.userId
      }
    })
  } catch (error) {
    console.error('Checkout with customer update error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทลูกค้า'
    })
  }
})

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, email, notes, status } = req.body
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      created_by: finalUserId
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      })
    }

    if (phone && phone !== customer.phone) {
      const existingCustomer = await Customer.findOne({
        phone: phone.trim(),
        created_by: finalUserId,
        _id: { $ne: req.params.id }
      })

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: 'เบอร์โทรศัพท์นี้มีอยู่ในระบบแล้ว'
        })
      }
    }

    if (name) customer.name = name.trim()
    if (phone) customer.phone = phone.trim()
    if (address !== undefined) customer.address = address.trim()
    if (email !== undefined) customer.email = email.trim()
    if (notes !== undefined) customer.notes = notes.trim()
    if (status) customer.status = status

    await customer.save()
    await customer.populate('created_by', 'username')

    res.json({
      success: true,
      message: 'แก้ไขข้อมูลลูกค้าสำเร็จ',
      data: customer
    })
  } catch (error) {
    console.error('Update customer error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลลูกค้า'
    })
  }
})

router.post('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { amount, payment_method = 'cash', notes = '' } = req.body
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุจำนวนเงินที่ชำระ'
      })
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      created_by: finalUserId
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      })
    }

    if (amount > customer.credit_balance) {
      return res.status(400).json({
        success: false,
        message: 'จำนวนเงินที่ชำระมากกว่ายอดค้างชำระ'
      })
    }

    await customer.makePayment(amount, payment_method, notes, req.user.userId)

    res.json({
      success: true,
      message: 'บันทึกการชำระเงินสำเร็จ',
      data: {
        customer_name: customer.name,
        paid_amount: amount,
        remaining_balance: customer.credit_balance
      }
    })

    console.log(`Payment recorded: ${customer.name} paid ${amount}`)
  } catch (error) {
    console.error('Record payment error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน'
    })
  }
})

module.exports = router