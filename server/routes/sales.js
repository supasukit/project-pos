const express = require('express')
const mongoose = require('mongoose')
const Product = require('../models/Product')
const Customer = require('../models/customer') // ← เพิ่มบรรทัดนี้
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// POST /api/sales/checkout - ชำระเงินและบันทึกการขาย
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const {
      customer_data,
      payment_type,
      cart_items,
      total_amount
    } = req.body

    console.log('💰 Processing checkout:', { payment_type, total_amount, customer_data })

    // 1. Validation พื้นฐาน
    if (!customer_data || !customer_data.name || !customer_data.phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลลูกค้าให้ครบถ้วน'
      })
    }

    if (!cart_items || cart_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีสินค้าในตะกร้า'
      })
    }

    // 2. ใช้ mongoose connection แทน
    const db = mongoose.connection.db

    // 3. ตรวจสอบ/สร้างลูกค้า
    let customer = await db.collection('customers').findOne({
      phone: customer_data.phone.trim(),
      created_by: new mongoose.Types.ObjectId(req.user.userId)
    })

    if (!customer) {
      // สร้างลูกค้าใหม่
      const newCustomer = {
        name: customer_data.name.trim(),
        phone: customer_data.phone.trim(),
        address: customer_data.address ? customer_data.address.trim() : '',
        credit_balance: 0,
        total_purchases: 0,
        total_amount: 0,
        status: 'active',
        created_by: new mongoose.Types.ObjectId(req.user.userId),
        created_at: new Date(),
        updated_at: new Date()
      }

      const customerResult = await db.collection('customers').insertOne(newCustomer)
      customer = { ...newCustomer, _id: customerResult.insertedId }
      console.log(`✅ New customer created: ${customer.name}`)
    } else {
      console.log(`👤 Existing customer found: ${customer.name}`)
    }

    // 4. ตรวจสอบสต็อกสินค้า
    const stockErrors = []
    for (const item of cart_items) {
      const product = await Product.findById(item.product_id)
      if (!product) {
        stockErrors.push(`ไม่พบสินค้า: ${item.product_name}`)
        continue
      }
      if (product.stock < item.quantity) {
        stockErrors.push(`${product.name} เหลือเพียง ${product.stock} ชิ้น`)
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'สต็อกสินค้าไม่เพียงพอ',
        errors: stockErrors
      })
    }

    // 5. สร้างเลขที่ใบเสร็จแบบง่าย
    const today = new Date()
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    const orderNumber = `${dateString}${randomNum}`

    // 6. บันทึกข้อมูลการขาย
    const orderData = {
      order_number: orderNumber,
      customer: customer._id,
      customer_name: customer.name,
      customer_phone: customer.phone,

      total_items: cart_items.length,
      total_quantity: cart_items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: total_amount,
      discount_amount: 0,
      tax_amount: 0,
      total_amount,

      payment_type,
      payment_status: payment_type === 'cash' ? 'paid' : 'unpaid',
      paid_amount: payment_type === 'cash' ? total_amount : 0,
      remaining_amount: payment_type === 'credit' ? total_amount : 0,

      order_date: new Date(),
      due_date: payment_type === 'credit' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,

      status: 'completed',

      store_owner: new mongoose.Types.ObjectId(req.user.userId),
      cashier: new mongoose.Types.ObjectId(req.user.userId),
      cashier_name: req.user.username,

      created_at: new Date(),
      updated_at: new Date()
    }

    const orderResult = await db.collection('orders').insertOne(orderData)
    const orderId = orderResult.insertedId

    console.log(`📋 Order created: ${orderNumber}`)

    // 7. บันทึกรายการสินค้า
    const orderItems = cart_items.map(item => ({
      order: orderId,
      product: new mongoose.Types.ObjectId(item.product_id),
      product_code: item.product_code || '',
      product_name: item.product_name,
      product_barcode: item.product_barcode || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: 0,
      line_total: item.quantity * item.unit_price,
      created_at: new Date()
    }))

    await db.collection('order_items').insertMany(orderItems)
    console.log(`📦 ${orderItems.length} order items saved`)

    // 8. อัพเดทสต็อกสินค้า
    for (const item of cart_items) {
      await Product.findByIdAndUpdate(
        item.product_id,
        { $inc: { stock: -item.quantity } }
      )
      console.log(`📈 Updated stock for ${item.product_name}: -${item.quantity}`)
    }

    // 9. อัพเดทยอดค้างชำระลูกค้า (ถ้าเป็นเครดิต)
    if (payment_type === 'credit') {
      await db.collection('customers').updateOne(
        { _id: customer._id },
        {
          $inc: {
            credit_balance: total_amount,
            total_amount,
            total_purchases: 1
          },
          $set: { updated_at: new Date() }
        }
      )
      console.log(`💳 Credit added to customer: ${total_amount}`)
    }

    // 10. ส่งผลลัพธ์กลับ
    res.status(201).json({
      success: true,
      message: 'บันทึกการขายสำเร็จ',
      data: {
        order_number: orderNumber,
        order_id: orderId,
        customer_name: customer.name,
        total_amount,
        payment_type,
        items_count: cart_items.length
      }
    })

    console.log(`✅ Sale completed: ${orderNumber} - ${total_amount} บาท`)
  } catch (error) {
    console.error('❌ Checkout error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการชำระเงิน',
      error: error.message
    })
  }
})

// POST /api/sales/checkout-with-customer-update - ชำระเงิน + อัพเดทสถานะลูกค้า
router.post('/checkout-with-customer-update', authenticateToken, async (req, res) => {
  try {
    const {
      customer_data,
      payment_type,
      cart_items,
      total_amount
    } = req.body
    const { userId } = req.query

    let finalUserId = userId
    if (!finalUserId || finalUserId === 'undefined') {
      if (req.user.role === 'employee' && req.user.parent_user_id) {
        finalUserId = req.user.parent_user_id
      } else {
        finalUserId = req.user.userId
      }
    }

    console.log('🔍 Debug checkout-with-customer-update:')
    console.log('- req.query.userId:', userId)
    console.log('- req.user.role:', req.user.role)
    console.log('- req.user.userId:', req.user.userId)
    console.log('- req.user.parent_user_id:', req.user.parent_user_id)
    console.log('- finalUserId:', finalUserId)
    console.log('- finalUserId type:', typeof finalUserId)
    console.log('- customer_data.phone:', customer_data.phone)
    
    // Debug: ตรวจสอบลูกค้าที่มีเบอร์นี้ทั้งหมด
    const allCustomersWithPhone = await Customer.find({
      phone: customer_data.phone.trim()
    }).select('_id name phone created_by')
    console.log('- All customers with this phone:', allCustomersWithPhone)

    if (!customer_data || !customer_data.name || !customer_data.phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลลูกค้าให้ครบถ้วน'
      })
    }

    if (!cart_items || cart_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีสินค้าในตะกร้า'
      })
    }

    let customer = await Customer.findOne({
      phone: customer_data.phone.trim(),
      created_by: finalUserId
    })

    console.log('- Found customer:', customer ? 'YES' : 'NO')
    if (customer) {
      console.log('- Customer ID:', customer._id)
      console.log('- Customer created_by:', customer.created_by)
    }

    const isNewCustomer = !customer
    const oldCustomerType = customer ? customer.customer_type : null

    if (!customer) {
      customer = new Customer({
        name: customer_data.name.trim(),
        phone: customer_data.phone.trim(),
        address: customer_data.address ? customer_data.address.trim() : '',
        created_by: finalUserId
      })
      console.log(`Creating new customer: ${customer.name}`)
    } else {
      console.log(`Existing customer found: ${customer.name}`)
    }

    const stockErrors = []
    for (const item of cart_items) {
      const product = await Product.findById(item.product_id)
      if (!product) {
        stockErrors.push(`ไม่พบสินค้า: ${item.product_name}`)
        continue
      }
      if (product.stock < item.quantity) {
        stockErrors.push(`${product.name} เหลือเพียง ${product.stock} ชิ้น`)
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'สต็อกสินค้าไม่เพียงพอ',
        errors: stockErrors
      })
    }

    if (payment_type === 'cash') {
      await customer.addCashPurchase(total_amount)
    } else if (payment_type === 'credit') {
      await customer.addCredit(total_amount)
    }

    await customer.save()

    const statusChanged = oldCustomerType !== customer.customer_type

    const today = new Date()
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    const orderNumber = `${dateString}${randomNum}`

    const db = mongoose.connection.db

    const orderData = {
      order_number: orderNumber,
      customer: customer._id,
      customer_name: customer.name,
      customer_phone: customer.phone,

      total_items: cart_items.length,
      total_quantity: cart_items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: total_amount,
      discount_amount: 0,
      tax_amount: 0,
      total_amount,

      payment_type,
      payment_status: payment_type === 'cash' ? 'paid' : 'unpaid',
      paid_amount: payment_type === 'cash' ? total_amount : 0,
      remaining_amount: payment_type === 'credit' ? total_amount : 0,

      order_date: new Date(),
      due_date: payment_type === 'credit' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,

      status: 'completed',

      store_owner: new mongoose.Types.ObjectId(finalUserId),
      cashier: new mongoose.Types.ObjectId(req.user.userId),
      cashier_name: req.user.username,

      created_at: new Date(),
      updated_at: new Date()
    }

    const orderResult = await db.collection('orders').insertOne(orderData)
    const orderId = orderResult.insertedId

    console.log(`Order created: ${orderNumber}`)

    const orderItems = cart_items.map(item => ({
      order: orderId,
      product: new mongoose.Types.ObjectId(item.product_id),
      product_code: item.product_code || '',
      product_name: item.product_name,
      product_barcode: item.product_barcode || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: 0,
      line_total: item.quantity * item.unit_price,
      created_at: new Date()
    }))

    await db.collection('order_items').insertMany(orderItems)
    console.log(`${orderItems.length} order items saved`)

    for (const item of cart_items) {
      await Product.findByIdAndUpdate(
        item.product_id,
        { $inc: { stock: -item.quantity } }
      )
      console.log(`Updated stock for ${item.product_name}: -${item.quantity}`)
    }

    res.status(201).json({
      success: true,
      message: 'บันทึกการขายและอัพเดทลูกค้าสำเร็จ',
      data: {
        order_number: orderNumber,
        order_id: orderId,
        customer_id: customer._id,
        customer_name: customer.name,
        customer_status: customer.customer_type,
        status_changed: statusChanged,
        old_status: oldCustomerType,
        is_new_customer: isNewCustomer,
        total_amount,
        payment_type,
        items_count: cart_items.length,
        store_owner: finalUserId,
        cashier: req.user.userId
      }
    })

    console.log(`Sale completed with customer update: ${orderNumber} - ${total_amount} บาท`)
    if (statusChanged) {
      console.log(`Customer status changed: ${oldCustomerType} → ${customer.customer_type}`)
    }
  } catch (error) {
    console.error('Checkout with customer update error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการชำระเงินและอัพเดทลูกค้า',
      error: error.message
    })
  }
})

module.exports = router
