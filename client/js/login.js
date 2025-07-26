// Login form handler
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault()

  const username = document.getElementById('username').value
  const password = document.getElementById('password').value

  // เรียกใช้ login function จาก auth.js
  await handleLogin(username, password)
})

// ตัวอย่างการแก้ไข login.js เพื่อให้เก็บ user data ครบถ้วน

async function handleLogin(event) {
    event.preventDefault()
    
    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value
    
    if (!username || !password) {
        showError('กรุณากรอก username และ password')
        return
    }
    
    const submitBtn = document.getElementById('submit-btn')
    const originalText = submitBtn.textContent
    
    try {
        submitBtn.disabled = true
        submitBtn.textContent = '🔄 กำลังเข้าสู่ระบบ...'
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        
        const result = await response.json()
        console.log('📥 Login response:', result)
        
        if (result.success) {
            // บันทึก token
            localStorage.setItem('token', result.data.token)
            
            // บันทึก user data (ตรวจสอบให้มีข้อมูลครบ)
            const userData = result.data.user
            console.log('👤 User data from API:', userData)
            
            // ตรวจสอบว่ามี _id หรือ id หรือไม่
            if (!userData._id && !userData.id) {
                console.error('❌ Missing user ID in login response!')
                throw new Error('ข้อมูล user ID ไม่ครบถ้วน')
            }
            
            // ถ้าไม่มี _id แต่มี id ให้เพิ่ม _id
            if (!userData._id && userData.id) {
                userData._id = userData.id
            }
            
            // ถ้าไม่มี id แต่มี _id ให้เพิ่ม id
            if (!userData.id && userData._id) {
                userData.id = userData._id
            }
            
            console.log('✅ Final user data to store:', userData)
            
            // เก็บ user data
            localStorage.setItem('user', JSON.stringify(userData))
            
            // แสดงข้อความสำเร็จ
            showSuccess('เข้าสู่ระบบสำเร็จ!')
            
            // รอ 1 วินาทีแล้ว redirect
            setTimeout(() => {
                if (userData.role === 'employee') {
                    window.location.href = '/pages/pos/index.html'
                } else {
                    window.location.href = '/pages/admin/dashboard.html'
                }
            }, 1000)
            
        } else {
            showError(result.message || 'เข้าสู่ระบบไม่สำเร็จ')
        }
        
    } catch (error) {
        console.error('❌ Login error:', error)
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message)
    } finally {
        submitBtn.disabled = false
        submitBtn.textContent = originalText
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message')
    if (errorDiv) {
        errorDiv.textContent = message
        errorDiv.style.display = 'block'
    } else {
        alert('❌ ' + message)
    }
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error-message')
    if (errorDiv) {
        errorDiv.textContent = message
        errorDiv.style.display = 'block'
        errorDiv.style.background = '#d4edda'
        errorDiv.style.color = '#155724'
        errorDiv.style.borderColor = '#c3e6cb'
    } else {
        alert('✅ ' + message)
    }
}