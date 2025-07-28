// =========================================
// Navigation Functions
// =========================================

// ไปหน้า register
function goToRegister () {
  window.location.href = '/register.html'
}

// ไปหน้า login
function goToLogin () {
  window.location.href = '/login.html'

  // เพิ่ม focus หลังโหลดหน้าใหม่
  setTimeout(() => {
    const usernameInput = document.getElementById('username')
    if (usernameInput) {
      usernameInput.focus()
    }
  }, 100)
}

// ไปหน้าลืมรหัสผ่าน
function goToForgotPassword () {
  window.location.href = '/forgot-password.html'
}
// ฟังก์ชันสำหรับปุ่มลืมรหัสผ่าน
function showForgotPassword () {
  goToForgotPassword()
}

// =========================================
// Utility Functions
// =========================================

// แสดง loading
function showLoading (buttonId) {
  const button = document.getElementById(buttonId)
  if (button) {
    button.disabled = true
    button.innerHTML = 'กำลังโหลด...'
  }
}

// ซ่อน loading
function hideLoading (buttonId, originalText) {
  const button = document.getElementById(buttonId)
  if (button) {
    button.disabled = false
    button.innerHTML = originalText
  }
}

// =========================================
// Register Functions
// =========================================

// หลัก register function
async function handleRegister (event) {
  event.preventDefault()

  console.log('Register form submitted!') // ทดสอบ

  // ดึงข้อมูลจาก form
  const formData = {
    username: document.getElementById('username').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    owner_name: document.getElementById('owner_name').value.trim(),
    store_name: document.getElementById('store_name').value.trim(),
    store_phone: document.getElementById('store_phone').value.trim(),
    store_address: document.getElementById('store_address').value.trim()
  }

  console.log('Form data:', formData) // ทดสอบ

  // Validation
  if (!validateRegisterForm(formData)) {
    return
  }

  try {
    showLoading('register-submit-btn')

    console.log('Sending request to API...') // ทดสอบ

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })

    const result = await response.json()
    console.log('API Response:', result) // ทดสอบ

    if (result.success) {
      alert('สมัครสมาชิกสำเร็จ! กำลังนำไปหน้าเข้าสู่ระบบ...')

      // รอ 2 วินาที แล้วไปหน้า login
      setTimeout(() => {
        goToLogin()
      }, 2000)
    } else {
      alert('Error: ' + result.message)
    }
  } catch (error) {
    console.error('Register error:', error)
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ')
  } finally {
    hideLoading('register-submit-btn', 'สมัครสมาชิก')
  }
}

// Validation สำหรับ register form
function validateRegisterForm (data) {
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!data.username || !data.email || !data.password || !data.owner_name || !data.store_name) {
    alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
    return false
  }

  // ตรวจสอบความยาวรหัสผ่าน
  if (data.password.length < 6) {
    alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
    return false
  }

  // ตรวจสอบ email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    alert('รูปแบบ Email ไม่ถูกต้อง')
    return false
  }

  return true
}

// =========================================
// Login Functions
// =========================================

// หลัก login function
// แก้ไขฟังก์ชัน handleLogin ในไฟล์ auth.js
async function handleLogin(event) {
  event.preventDefault()
  
  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value
  
  if (!username || !password) {
    alert('กรุณากรอก Username และ Password')
    return
  }
  
  try {
    showLoading('login-submit-btn')
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    
    const result = await response.json()
    console.log('Login response:', result) // เพิ่มบรรทัดนี้เพื่อ debug
    
    if (result.success) {
      // เก็บ access token และ refresh token
      localStorage.setItem('token', result.data.accessToken || result.data.token)
      if (result.data.refreshToken) {
        localStorage.setItem('refreshToken', result.data.refreshToken)
      }
      
      // เก็บข้อมูล user
      const userData = result.data.user
      localStorage.setItem('user', JSON.stringify(userData))
      
      alert('เข้าสู่ระบบสำเร็จ!')
      
      // Redirect ตาม role
      setTimeout(() => {
        window.location.href = '/pages/pos/index.html'
      }, 1000)
      
    } else {
      alert('เข้าสู่ระบบไม่สำเร็จ: ' + result.message)
    }
  } catch (error) {
    console.error('Login error:', error)
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ')
  } finally {
    hideLoading('login-submit-btn', 'เข้าสู่ระบบ')
  }
}

// เพิ่มฟังก์ชัน refresh token
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken')
  
  if (!refreshToken) {
    window.location.href = '/login.html'
    return null
  }
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    })
    
    const result = await response.json()
    
    if (result.success) {
      localStorage.setItem('token', result.data.accessToken)
      if (result.data.refreshToken) {
        localStorage.setItem('refreshToken', result.data.refreshToken)
      }
      return result.data.accessToken
    } else {
      localStorage.clear()
      window.location.href = '/login.html'
      return null
    }
  } catch (error) {
    console.error('Refresh token error:', error)
    localStorage.clear()
    window.location.href = '/login.html'
    return null
  }
}

// =========================================
// Forgot Password Functions
// =========================================

// เพิ่มฟังก์ชันสำหรับ forgot password form
async function handleForgotPassword (event) {
  event.preventDefault()

  const email = document.getElementById('email').value.trim()

  if (!email) {
    alert('กรุณากรอก Email')
    return
  }

  try {
    showLoading('forgot-submit-btn')

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    const result = await response.json()

    if (result.success) {
      document.getElementById('result').style.color = 'green'
      document.getElementById('result').textContent = 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง Email แล้ว'
    } else {
      document.getElementById('result').style.color = 'crimson'
      document.getElementById('result').textContent = result.message
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    document.getElementById('result').style.color = 'crimson'
    document.getElementById('result').textContent = 'เกิดข้อผิดพลาดในการส่ง Email'
  } finally {
    hideLoading('forgot-submit-btn', 'ส่งลิงก์รีเซ็ตรหัสผ่าน')
  }
}

// รีเซ็ตรหัสผ่าน

// แทนที่ฟังก์ชัน handleResetPassword ใน auth.js (เวอร์ชัน Debug)
async function handleResetPassword(event) {
  event.preventDefault()
  
  try {
    // ดึง token จาก URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    
    console.log('🔍 Debug info:')
    console.log('- Token from URL:', token ? token.substring(0, 20) + '...' : 'NOT FOUND')
    
    if (!token) {
      document.getElementById('reset-result').textContent = 'ไม่พบ token รีเซ็ตรหัสผ่าน'
      document.getElementById('reset-result').className = 'error'
      return
    }
    
    // ลองหา input field ทั้ง 2 แบบ
    let newPasswordField = document.getElementById('newPassword') || 
                          document.getElementById('new-password') ||
                          document.querySelector('input[type="password"]')
    
    if (!newPasswordField) {
      console.error('❌ ไม่พบ password input field')
      alert('❌ เกิดข้อผิดพลาดในระบบ')
      return
    }
    
    const newPassword = newPasswordField.value.trim()
    console.log('- Password length:', newPassword.length)
    console.log('- Password (first 3 chars):', newPassword.substring(0, 3) + '***')
    
    if (!newPassword) {
      document.getElementById('reset-result').textContent = 'กรุณากรอกรหัสผ่านใหม่'
      document.getElementById('reset-result').className = 'error'
      return
    }
    
    // ตรวจสอบรหัสผ่านตาม backend validation
    if (newPassword.length < 8) {
      document.getElementById('reset-result').textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      document.getElementById('reset-result').className = 'error'
      return
    }
    
    // ตรวจสอบความแข็งแกร่งของรหัสผ่าน (ตาม backend validation)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    if (!passwordRegex.test(newPassword)) {
      document.getElementById('reset-result').textContent = 'รหัสผ่านต้องประกอบด้วย: ตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, ตัวเลข, และอักขระพิเศษ (@$!%*?&)'
      document.getElementById('reset-result').className = 'error'
      return
    }
    
    // แสดง loading
    const button = document.getElementById('reset-submit-btn')
    if (button) {
      button.disabled = true
      button.textContent = 'กำลังรีเซ็ต...'
    }
    
    // เตรียมข้อมูลส่ง
    const requestData = {
      token: token,
      newPassword: newPassword
    }
    
    console.log('📤 Sending request data:', {
      token: token.substring(0, 10) + '...',
      newPassword: '***'
    })
    
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    
    const result = await response.json()
    console.log('📥 Full response:', result)
    
    // แสดง error details ถ้ามี
    if (result.errors && result.errors.length > 0) {
      console.log('❌ Validation errors:', result.errors)
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.msg || error.message || error}`)
      })
    }
    
    if (result.success) {
      document.getElementById('reset-result').textContent = 'เปลี่ยนรหัสผ่านสำเร็จ! กำลังนำไปหน้าเข้าสู่ระบบ...'
      document.getElementById('reset-result').className = 'success'
      
      setTimeout(() => {
        window.location.href = '/login.html'
      }, 2000)
    } else {
      // แสดง error message ที่ละเอียด
      let errorMessage = result.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
      
      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0]
        errorMessage = firstError.msg || firstError.message || firstError
      }
      
      document.getElementById('reset-result').textContent = 'เกิดข้อผิดพลาด: ' + errorMessage
      document.getElementById('reset-result').className = 'error'
    }
    
  } catch (error) {
    console.error('❌ Reset password error:', error)
    document.getElementById('reset-result').textContent = 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
    document.getElementById('reset-result').className = 'error'
  } finally {
    // คืนสถานะปุ่ม
    const button = document.getElementById('reset-submit-btn')
    if (button) {
      button.disabled = false
      button.textContent = 'รีเซ็ตรหัสผ่าน'
    }
  }
}

// แสดง modal ลืมรหัสผ่าน
function showForgotPasswordModal () {
  document.getElementById('forgot-password-modal').style.display = 'block'
}

// ปิด modal ลืมรหัสผ่าน
function closeForgotPasswordModal () {
  document.getElementById('forgot-password-modal').style.display = 'none'
  document.getElementById('forgot-email').value = ''
}

// =========================================
// Role-Based Access Control Functions
// =========================================

// ตรวจสอบสิทธิ์การเข้าถึงหน้าต่างๆ
function checkPageAccess (requiredRole = null) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const currentPath = window.location.pathname

  // ถ้าไม่มี token ให้ไปหน้า login
  if (!localStorage.getItem('token')) {
    window.location.href = '/login.html'
    return false
  }

  // กำหนดสิทธิ์การเข้าถึงแต่ละหน้า
  const pagePermissions = {
    '/pages/pos/index.html': ['user', 'employee'], // ทั้ง user และ employee เข้าได้
    '/pages/admin/dashboard.html': ['user'], // เฉพาะ user
    '/pages/customer/customers.html': ['user'], // เฉพาะ user
    '/pages/product/products.html': ['user', 'employee'], // ทั้ง user และ employee
    '/pages/admin/admin.html': ['user', 'employee'], // ทั้งคู่เข้าได้แต่จะเห็นเมนูต่างกัน
    '/pages/admin/add-employee.html': ['user'], // เฉพาะ user
    '/pages/admin/manage-employees.html': ['user'] // เฉพาะ user
  }

  // ตรวจสอบสิทธิ์สำหรับหน้าปัจจุบัน
  const allowedRoles = pagePermissions[currentPath]

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert('❌ คุณไม่มีสิทธิ์เข้าถึงหน้านี้')

    // Redirect ตาม role
    if (user.role === 'employee') {
      window.location.href = '/pages/pos/index.html'
    } else {
      window.location.href = '/login.html'
    }

    return false
  }

  return true
}

// ซ่อน/แสดงเมนูตาม role
function adjustMenuByRole () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (user.role === 'employee') {
    // ซ่อนปุ่มที่พนักงานไม่ควรเห็น
    const dashboardBtn = document.getElementById('dashboard-btn')
    const customersBtn = document.getElementById('customers-btn')
    const addEmployeeBtn = document.getElementById('add-employee-btn')
    const manageEmployeesBtn = document.getElementById('manage-employees-btn')

    if (dashboardBtn) dashboardBtn.style.display = 'none'
    if (customersBtn) customersBtn.style.display = 'none'
    if (addEmployeeBtn) addEmployeeBtn.style.display = 'none'
    if (manageEmployeesBtn) manageEmployeesBtn.style.display = 'none'
  }
}

// เพิ่มใน handleLogin function หลัง login สำเร็จ
// (หลังจาก localStorage.setItem('user', ...))
if (result.data.user.role === 'employee') {
  // พนักงานไปหน้า POS เท่านั้น
  window.location.href = '/pages/pos/index.html'
} else {
  // user ปกติไปหน้า POS
  window.location.href = '/pages/pos/index.html'
}
