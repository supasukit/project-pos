# POS System

ระบบ Point of Sale (POS) ที่รองรับทั้ง Desktop Application (Electron) และ Web Application โดยใช้ฐานข้อมูลร่วมกัน

## 🚀 Features

### ✅ ระบบที่พร้อมใช้งาน
- **Authentication System** - ล็อกอิน/สมัครสมาชิก พร้อมระบบลืมรหัสผ่าน
- **Product Management** - จัดการสินค้า เพิ่ม/แก้ไข/ลบ พร้อมระบบบาร์โค้ด
- **Customer Management** - จัดการลูกค้า ระบบเครดิต/เงินสด
- **POS System** - ระบบขายหน้าร้าน รองรับการชำระแบบเงินสดและเครดิต
- **Sales Management** - บันทึกการขาย อัพเดทสต็อกอัตโนมัติ
- **Dashboard** - สถิติยอดขาย กราฟ ประวัติการขาย
- **Stock Management** - จัดการสต็อกสินค้า แจ้งเตือนสินค้าใกล้หมด
- **Customer Credit System** - ระบบค้างชำระและรับชำระเงิน
- **Automatic Pricing** - ราคาส่งอัตโนมัติเมื่อซื้อถึงจำนวนขั้นต่ำ
- **Customer Status Management** - ระบบจัดการสถานะลูกค้าตามพฤติกรรมการซื้อ

## 🏗️ Architecture

### Frontend
- **Desktop**: Electron Application
- **Web**: Browser-based Application
- **Shared UI**: ใช้หน้าบ้านเดียวกันทั้ง Desktop และ Web

### Backend
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT Token System
- **Email**: Gmail SMTP (สำหรับ forgot password)

### Database Collections
- `users` - ข้อมูลผู้ใช้และร้าน
- `customers` - ข้อมูลลูกค้าและยอดค้างชำระ  
- `products` - สินค้า ราคาปลีก/ส่ง/เครดิต
- `orders` - ข้อมูลการขาย
- `order_items` - รายการสินค้าในแต่ละออเดอร์

## 📋 Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **MongoDB** (Local หรือ Cloud)
- **Gmail Account** (สำหรับ email system)

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/supasukit/project-pos.git
cd project-pos
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# แก้ไข .env file ให้เหมาะสม
```

### 4. Environment Variables
แก้ไขไฟล์ `.env` ตามความต้องการ:

```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/pos_db

# JWT
JWT_SECRET=your-secret-key

# Email (สำหรับ forgot password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🚀 Usage

### Desktop Application (Electron)
```bash
# Development
npm run dev

# Production
npm start
```

### Web Application
```bash
# Start server
npm run web

# เปิดเบราว์เซอร์ไปที่
http://localhost:3000
```

### Development Mode
```bash
# Backend development
npm run server:dev

# Run both Desktop and Web
npm run web    # Terminal 1
npm start      # Terminal 2
```

## 🌐 Deploy for Web + Desktop

### Local Network Access
```bash
# รัน server
npm run web

# เข้าถึงจากเครื่องอื่นใน LAN
http://YOUR_IP:3000
```

### Production Deployment
```bash
# สำหรับ VM/VPS
npm install --production
npm install -g pm2
pm2 start server/server.js --name "pos-system"
pm2 startup
pm2 save
```

## 📁 Project Structure

```
project-pos/
├── client/                 # Frontend files
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   ├── pages/             # HTML pages
│   ├── login.html         # Login page
│   ├── forgot-password.html
│   └── reset-password.html
├── server/                # Backend files
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   └── server.js          # Main server file
├── .env.example           # Environment template
├── package.json
├── main.js                # Electron main process
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - ล็อกอิน
- `POST /api/auth/forgot-password` - ขอรีเซ็ตรหัสผ่าน
- `POST /api/auth/reset-password` - รีเซ็ตรหัสผ่าน
- `GET /api/auth/profile` - ดูข้อมูลผู้ใช้

### Products
- `GET /api/products` - ดึงรายการสินค้า
- `POST /api/products` - เพิ่มสินค้าใหม่
- `GET /api/products/categories` - ดึงหมวดหมู่สินค้า

### Customers  
- `GET /api/customers` - ดึงรายการลูกค้า
- `POST /api/customers` - เพิ่มลูกค้าใหม่
- `POST /api/customers/:id/payment` - บันทึกการชำระเงิน

### Sales
- `POST /api/sales/checkout` - ชำระเงินและบันทึกการขาย
- `GET /api/orders` - ดึงประวัติการขาย
- `GET /api/orders/:id` - ดูรายละเอียดบิล

## 🔐 Security Features

- **JWT Authentication** - ระบบยืนยันตัวตน
- **Password Hashing** - เข้ารหัสรหัสผ่านด้วย bcrypt
- **CORS Protection** - ป้องกันการเข้าถึงข้ามโดเมน
- **Role-based Access** - สิทธิ์การเข้าถึงตามบทบาท
- **Input Validation** - ตรวจสอบข้อมูลนำเข้า

## 📧 Email System

ระบบส่ง email สำหรับ forgot password:

### Gmail Setup
1. เปิด 2-Factor Authentication
2. สร้าง App Password: https://myaccount.google.com/apppasswords
3. ใส่ credentials ใน `.env`

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

## 🐛 Troubleshooting

### Common Issues

**Email not sending:**
```bash
# ตรวจสอบ environment variables
npm run web
# ดู console ว่า EMAIL_USER/EMAIL_PASS โหลดหรือไม่
```

**Database connection failed:**
```bash
# ตรวจสอบ MongoDB
mongosh
# หรือ
mongo
```

**Port already in use:**
```bash
# เปลี่ยน port ใน .env
PORT=3001
```

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Supasukit**
- GitHub: [@supasukit](https://github.com/supasukit)
- Email: supasukitkleebbai@gmail.com

## 🙏 Acknowledgments

- [Electron](https://electronjs.org/) - สำหรับ desktop application
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://mongodb.com/) - Database
- [Mongoose](https://mongoosejs.com/) - ODM
- [JWT](https://jwt.io/) - Authentication
- [Nodemailer](https://nodemailer.com/) - Email system