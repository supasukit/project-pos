const mongoose = require('mongoose')

const saleSchema = new mongoose.Schema({
  // เลขที่ใบเสร็จ (สร้างอัตโนมัติ)
  receipt_number: {
    type: String,
    unique: true,
    required: true
  },
  // ข้อมูลลูกค้า
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer_name: {
    type: String,
    required: true
  },
  customer_phone: {
    type: String,
    required: true
  },
  // รายการสินค้า
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    product_name: {
      type: String,
      required: true
    },
    product_barcode: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0
    },
    total_price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  // ยอดรวม
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  // ประเภทการชำระเงิน
  payment_type: {
    type: String,
    enum: ['cash', 'credit'],
    required: true
  },
  // สถานะ
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  // สำหรับการขายเครดิต
  is_credit: {
    type: Boolean,
    default: false
  },
  credit_due_date: {
    type: Date
  },
  paid_amount: {
    type: Number,
    default: 0
  },
  remaining_amount: {
    type: Number,
    default: 0
  },
  // หมายเหตุ
  notes: {
    type: String,
    default: ''
  },
  // ผู้ขาย
  sold_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sold_by_name: {
    type: String,
    required: true
  },
  // วันเวลาที่ขาย
  sale_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Index สำหรับการค้นหา
saleSchema.index({ receipt_number: 1 })
saleSchema.index({ customer: 1 })
saleSchema.index({ sale_date: -1 })
saleSchema.index({ payment_type: 1 })
saleSchema.index({ status: 1 })
saleSchema.index({ sold_by: 1 })

// Pre-save middleware สำหรับสร้างเลขที่ใบเสร็จ
saleSchema.pre('save', async function (next) {
  if (this.isNew && !this.receipt_number) {
    const today = new Date()
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '')

    // หาเลขที่ล่าสุดของวันนี้
    const lastSale = await this.constructor.findOne({
      receipt_number: { $regex: `^${dateString}` }
    }).sort({ receipt_number: -1 })

    let sequence = 1
    if (lastSale) {
      const lastSequence = parseInt(lastSale.receipt_number.slice(-4))
      sequence = lastSequence + 1
    }

    this.receipt_number = `${dateString}${sequence.toString().padStart(4, '0')}`
  }

  // คำนวณยอดรวม
  this.subtotal = this.items.reduce((sum, item) => sum + item.total_price, 0)
  this.total_amount = this.subtotal - this.discount + this.tax

  // ตั้งค่าสำหรับการขายเครดิต
  if (this.payment_type === 'credit') {
    this.is_credit = true
    this.remaining_amount = this.total_amount - this.paid_amount

    // ตั้งกำหนดชำระ 30 วัน
    if (!this.credit_due_date) {
      this.credit_due_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  }

  next()
})

// Static method สำหรับสถิติ
saleSchema.statics.getTodaySales = function (userId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return this.find({
    sold_by: userId,
    sale_date: { $gte: today, $lt: tomorrow },
    status: 'completed'
  })
}

saleSchema.statics.getCreditSales = function (customerId) {
  return this.find({
    customer: customerId,
    is_credit: true,
    remaining_amount: { $gt: 0 }
  }).sort({ sale_date: -1 })
}

module.exports = mongoose.model('Sale', saleSchema)
