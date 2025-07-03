const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  owner_name: { type: String, required: true },
  store_name: { type: String, required: true },
  store_phone: String,
  store_address: String,
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
   // เพิ่มส่วนนี้
  resetPasswordToken: String,
  resetPasswordExpires: Date

}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)