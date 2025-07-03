const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  barcode: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0 
  },
  wholesale_price: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  credit_price: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  wholesale_minimum: { 
    type: Number, 
    default: 1,
    min: 1 
  },
  stock: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0 
  },
  category: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String,
    trim: true,
    default: '' 
  },
  image_base64: { 
    type: String,
    default: '' 
  },
  // เก็บข้อมูลผู้สร้าง
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // สถานะสินค้า
  is_active: { 
    type: Boolean, 
    default: true 
  },
  // ประวัติการเปลี่ยนแปลงสต็อก
  stock_history: [{
    action: { type: String, enum: ['add', 'remove', 'edit', 'sale'] },
    quantity: { type: Number },
    previous_stock: { type: Number },
    new_stock: { type: Number },
    reason: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
})

// Index สำหรับการค้นหา
productSchema.index({ name: 'text', category: 'text', barcode: 'text' })
productSchema.index({ category: 1 })
productSchema.index({ barcode: 1 })

module.exports = mongoose.model('Product', productSchema)