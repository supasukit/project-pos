// models/User.js

const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: function () { return this.role !== 'employee' },
    unique: false // ต้องไม่ซ้ำแค่ใน owner, employee ปล่อยได้
  },
  password: { type: String, required: true },
  owner_name: { type: String, required: true }, // = ชื่อพนักงาน
  store_name: {
    type: String,
    required: function () { return this.role !== 'employee' }
  },
  store_phone: String,
  store_address: String,
  role: { type: String, default: 'user', enum: ['user', 'employee', 'admin'] },
  parent_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // สำหรับ employee
  isActive: { type: Boolean, default: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
