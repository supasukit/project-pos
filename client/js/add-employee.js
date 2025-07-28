// =========================================
// Add Employee JavaScript
// =========================================

console.log('🚀 Add Employee JS loaded')

// ปิด Modal/หน้าต่าง
function closeModal () {
  // ถ้าเรียกจาก popup modal ใน admin (มีฟังก์ชันนี้ใน parent)
  if (window.closeAddEmployeePopup) {
    window.closeAddEmployeePopup()
  } else if (window.opener) {
    window.close() // สำหรับกรณีเปิดด้วย window.open แบบใหม่แยกหน้า
  } else {
    // fallback ถ้าเปิดเป็นหน้าเดี่ยว
    window.location.href = '/pages/admin/admin.html'
  }
}

// ตรวจสอบสิทธิ์ - เฉพาะ user (เจ้าของร้าน) เท่านั้นที่เพิ่มพนักงานได้
function checkPermission () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (user.role !== 'user') {
    alert('❌ คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
    closeModal()
    return false
  }

  return true
}

// จัดการการส่งฟอร์ม
async function handleEmployeeSubmit (event) {
  event.preventDefault()

  console.log('📝 Submitting employee form...')

  // ดึงข้อมูลจากฟอร์ม
  const formData = {
  username: document.getElementById('username').value.trim(),
  password: document.getElementById('password').value,
  confirm_password: document.getElementById('confirm_password').value,
  employee_name: document.getElementById('employee_name').value.trim(),
  phone: document.getElementById('phone').value.trim(),
  address: document.getElementById('address').value.trim(),
  email: document.getElementById('email').value.trim() 
}


  // Validation
  if (!validateForm(formData)) {
    return
  }

  try {
    // แสดง loading
    showLoading(true)

    // เตรียมข้อมูลสำหรับส่ง API
    const employeeData = {
  username: formData.username,
  password: formData.password,
  role: 'employee',
  owner_name: formData.employee_name,
  store_phone: formData.phone,
  store_address: formData.address,
  parent_user_id: JSON.parse(localStorage.getItem('user') || '{}')._id,
  email: formData.email 
}

    console.log('📤 Sending employee data:', employeeData)

    const token = localStorage.getItem('token')
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(employeeData)
    })

    const result = await response.json()
    console.log('📥 API Response:', result)

    if (result.success) {
      alert(`✅ เพิ่มพนักงานสำเร็จ!\n\nUsername: ${formData.username}\nPassword: ${formData.password}\n\nกรุณาแจ้งข้อมูลการเข้าสู่ระบบให้พนักงานทราบ`)

      // รีเซ็ตฟอร์ม
      document.getElementById('employee-form').reset()

      // ปิดหน้าต่างหลังจาก 2 วินาที
      setTimeout(() => {
        closeModal()
      }, 2000)
    } else {
      alert('❌ เกิดข้อผิดพลาด: ' + result.message)
    }
  } catch (error) {
    console.error('❌ Error adding employee:', error)
    alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ')
  } finally {
    showLoading(false)
  }
}

// Validation ฟอร์ม
function validateForm (data) {
  // ตรวจสอบข้อมูลที่จำเป็น
   if (!data.username || !data.password || !data.employee_name || !data.phone || !data.email) {
    alert('❌ กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
    return false;
  }

   // ตรวจสอบ email format (optional)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    alert('❌ อีเมลไม่ถูกต้อง');
    return false;
  }


  // ตรวจสอบความยาวรหัสผ่าน
  if (data.password.length < 6) {
    alert('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
    return false
  }
  
  // ตรวจสอบรหัสผ่านตรงกัน
  if (data.password !== data.confirm_password) {
    alert('❌ รหัสผ่านไม่ตรงกัน')
    return false
  }

  // ตรวจสอบ username (ภาษาอังกฤษและตัวเลขเท่านั้น)
  const usernameRegex = /^[a-zA-Z0-9]+$/
  if (!usernameRegex.test(data.username)) {
    alert('❌ Username ต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น')
    return false
  }

  // ตรวจสอบเบอร์โทรศัพท์
  const phoneRegex = /^[0-9]{9,10}$/
  if (!phoneRegex.test(data.phone)) {
    alert('❌ เบอร์โทรศัพท์ไม่ถูกต้อง')
    return false
  }

  return true
}

// แสดง/ซ่อน Loading
function showLoading (show) {
  const loading = document.getElementById('loading')
  if (loading) {
    if (show) {
      loading.classList.remove('hidden')
    } else {
      loading.classList.add('hidden')
    }
  }
}

// Event Listeners

window.bindAddEmployeeForm = function () {
  const form = document.getElementById('employee-form')
  if (form) {
    form.addEventListener('submit', handleEmployeeSubmit)
    console.log('✅ Bound submit event to #employee-form')
  } else {
    console.log('❌ ไม่พบฟอร์ม #employee-form ใน popup')
  }
}

console.log('✅ Add employee page initialized')
