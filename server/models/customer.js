const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'ชื่อลูกค้าจำเป็นต้องระบุ'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'เบอร์โทรศัพท์จำเป็นต้องระบุ'],
    trim: true,
    unique: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  // ยอดค้างชำระ
  credit_balance: {
    type: Number,
    default: 0,
    min: 0
  },

  // ⭐ เพิ่มส่วนนี้ - ประเภทลูกค้าตามการซื้อ
  customer_type: {
    type: String,
    enum: ['cash', 'credit'],
    default: 'cash'
  },

  // ⭐ เพิ่มส่วนนี้ - สถิติการซื้อแยกประเภท
  total_cash_purchases: {
    type: Number,
    default: 0
  },
  total_credit_purchases: {
    type: Number,
    default: 0
  },
  last_purchase_type: {
    type: String,
    enum: ['cash', 'credit'],
    default: 'cash'
  },
  last_purchase_date: {
    type: Date,
    default: Date.now
  },

  // จำนวนการซื้อทั้งหมด
  total_purchases: {
    type: Number,
    default: 0
  },
  // ยอดซื้อทั้งหมด
  total_amount: {
    type: Number,
    default: 0
  },
  // สถานะลูกค้า
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  // หมายเหตุ
  notes: {
    type: String,
    default: ''
  },
  // ผู้สร้าง (เจ้าของร้าน)
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ประวัติการชำระเงิน
  payment_history: [{
    amount: {
      type: Number,
      required: true
    },
    payment_date: {
      type: Date,
      default: Date.now
    },
    payment_method: {
      type: String,
      enum: ['cash', 'transfer', 'other'],
      default: 'cash'
    },
    notes: String,
    recorded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
})

// Index สำหรับการค้นหา
customerSchema.index({ phone: 1 })
customerSchema.index({ name: 1 })
customerSchema.index({ created_by: 1 })
customerSchema.index({ status: 1 })
customerSchema.index({ customer_type: 1 }) // ⭐ เพิ่ม index ใหม่

// Virtual สำหรับตรวจสอบว่ามียอดค้างชำระหรือไม่
customerSchema.virtual('has_credit').get(function () {
  return this.credit_balance > 0
})

// ⭐ เพิ่มฟังก์ชันอัพเดทประเภทลูกค้า
customerSchema.methods.updateCustomerType = function () {
  // ถ้ามียอดค้างชำระ = เป็นลูกค้าเครดิต
  if (this.credit_balance > 0) {
    this.customer_type = 'credit'
  } else {
    // ถ้าไม่มียอดค้างชำระ = เป็นลูกค้าเงินสด
    this.customer_type = 'cash'
  }
  return this
}

// Method สำหรับเพิ่มยอดค้างชำระ
customerSchema.methods.addCredit = function (amount, notes = '') {
  this.credit_balance += amount
  this.total_amount += amount
  this.total_purchases += 1

  // ⭐ เพิ่มส่วนนี้
  this.total_credit_purchases += amount
  this.last_purchase_type = 'credit'
  this.last_purchase_date = new Date()
  this.updateCustomerType()

  return this.save()
}

// ⭐ เพิ่ม Method สำหรับการซื้อเงินสด
customerSchema.methods.addCashPurchase = function (amount) {
  this.total_amount += amount
  this.total_purchases += 1
  this.total_cash_purchases += amount
  this.last_purchase_type = 'cash'
  this.last_purchase_date = new Date()
  this.updateCustomerType()

  return this.save()
}

// Method สำหรับชำระเงิน
customerSchema.methods.makePayment = function (amount, paymentMethod = 'cash', notes = '', recordedBy) {
  if (amount > this.credit_balance) {
    throw new Error('จำนวนเงินที่ชำระมากกว่ายอดค้างชำระ')
  }

  this.credit_balance -= amount
  this.payment_history.push({
    amount,
    payment_method: paymentMethod,
    notes,
    recorded_by: recordedBy
  })

  // ⭐ อัพเดทประเภทลูกค้าหลังชำระเงิน
  this.updateCustomerType()

  return this.save()
}

// Static method สำหรับค้นหาลูกค้า
customerSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone: phone.trim() })
}

customerSchema.statics.findByName = function (name) {
  return this.find({
    name: { $regex: name.trim(), $options: 'i' }
  })
}

// ⭐ เพิ่ม Static method สำหรับกรองตามประเภท
customerSchema.statics.findByType = function (customerType, createdBy) {
  return this.find({
    customer_type: customerType,
    created_by: createdBy,
    status: 'active'
  })
}

module.exports = mongoose.model('Customer', customerSchema)
