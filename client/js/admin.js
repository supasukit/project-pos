console.log('🔥 Admin.js loaded!')

// เก็บข้อมูลเดิมสำหรับ cancel
let originalData = {}
// =========================================
// Admin Page Functions
// =========================================

// Navigation Functions
function goToDashboard () {
  window.location.href = '/pages/admin/dashboard.html'
}

function goToCustomers () {
  window.location.href = '/pages/customer/customers.html'
}

function goToProducts () {
  window.location.href = '/pages/product/products.html'
}

function goToAdmin () {
  window.location.href = '/pages/admin/admin.html'
}

function goHome () {
  window.location.href = '/pages/pos/index.html' // กลับหน้า POS index
}

// แสดงข้อมูลร้านใน form
function displayStoreInfo () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // แสดงข้อมูลใน input fields
  document.getElementById('owner-name').value = user.owner_name || ''
  document.getElementById('store-name').value = user.store_name || ''
  document.getElementById('store-address').value = user.store_address || ''
  document.getElementById('store-phone').value = user.store_phone || ''
  document.getElementById('user-name').value = user.username || ''
}

// ตรวจสอบการ login
function checkAuth () {
  const token = localStorage.getItem('token')
  if (!token) {
    alert('กรุณาเข้าสู่ระบบก่อน')
    window.location.href = '/login.html'
    return false
  }
  return true
}
// =========================================
// Employee Management Functions
// =========================================

async function showAddEmployeeModal () {
  console.log('🔔 เปิด popup modal เพิ่มพนักงาน')
  const popup = document.getElementById('add-employee-popup')
  const content = document.getElementById('add-employee-popup-content')
  popup.classList.remove('hidden')
  content.innerHTML = '<div style="text-align:center;padding:48px;">🔄 กำลังโหลดฟอร์ม...</div>'

  // โหลดเนื้อหา add-employee.html (เฉพาะ body)
  try {
    const res = await fetch('/pages/admin/add-employee.html')
    if (!res.ok) throw new Error('โหลดฟอร์มไม่สำเร็จ')
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    content.innerHTML = doc.body.innerHTML

    // โหลด add-employee.js (แบบ dynamic)
    const script = document.createElement('script')
    script.src = '/js/add-employee.js'

    // เพิ่มตรงนี้!
    script.onload = () => {
      if (window.bindAddEmployeeForm) {
        window.bindAddEmployeeForm()
      } else {
        console.log('❌ ไม่เจอ window.bindAddEmployeeForm')
      }
    }

    content.appendChild(script)
  } catch (e) {
    content.innerHTML = '<div style="color:red;text-align:center;padding:32px;">โหลดฟอร์มไม่สำเร็จ</div>'
  }
}

function closeAddEmployeePopup () {
  document.getElementById('add-employee-popup').classList.add('hidden')
  document.getElementById('add-employee-popup-content').innerHTML = ''
}
window.closeAddEmployeePopup = closeAddEmployeePopup // เรียกข้าม iframe ได้

function showManageEmployees () {
  console.log('Opening manage employees page...')
  window.location.href = '/pages/admin/manage-employees.html'
}

// แก้ function loadUserProfile
async function loadUserProfile () {
  try {
    const token = localStorage.getItem('token')

    const response = await fetch('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    if (result.success) {
      displayUserProfile(result.data)
      localStorage.setItem('user', JSON.stringify(result.data))
      updateProfileButton() // ← เพิ่มบรรทัดนี้
    } else {
      console.error('Failed to load profile:', result.message)
    }
  } catch (error) {
    console.error('Error loading profile:', error)
  }
}

// ออกจากระบบ
function logout () {
  if (confirm('ต้องการออกจากระบบหรือไม่?')) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login.html'
  }
}

// ตรวจสอบสิทธิ์การแก้ไข
function canEditProfile () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role === 'user' // แค่ user เท่านั้นที่แก้ได้
}

// เปิดโหมดแก้ไข
function enableEditMode () {
  if (!canEditProfile()) {
    alert('คุณไม่มีสิทธิ์แก้ไขข้อมูลร้านค้า')
    return
  }

  // เก็บข้อมูลเดิม
  originalData = {
    owner_name: document.getElementById('owner-name').value,
    store_name: document.getElementById('store-name').value,
    store_address: document.getElementById('store-address').value,
    store_phone: document.getElementById('store-phone').value
  }

  // เปิดการแก้ไข
  document.getElementById('owner-name').readOnly = false
  document.getElementById('store-name').readOnly = false
  document.getElementById('store-address').readOnly = false
  document.getElementById('store-phone').readOnly = false

  // เปลี่ยนสี input
  const editableInputs = ['owner-name', 'store-name', 'store-address', 'store-phone']
  editableInputs.forEach(id => {
    const input = document.getElementById(id)
    input.style.backgroundColor = '#fff3cd'
    input.style.border = '2px solid #ffc107'
  })

  // แสดงปุ่ม save/cancel
  document.getElementById('edit-buttons').style.display = 'block'

  // ซ่อนปุ่มแก้ไข
  document.getElementById('edit-profile-btn').style.display = 'none'
}

// ยกเลิกการแก้ไข
function cancelEdit () {
  // คืนค่าเดิม
  document.getElementById('owner-name').value = originalData.owner_name
  document.getElementById('store-name').value = originalData.store_name
  document.getElementById('store-address').value = originalData.store_address
  document.getElementById('store-phone').value = originalData.store_phone

  disableEditMode()
}

// ปิดโหมดแก้ไข
function disableEditMode () {
  // ปิดการแก้ไข
  document.getElementById('owner-name').readOnly = true
  document.getElementById('store-name').readOnly = true
  document.getElementById('store-address').readOnly = true
  document.getElementById('store-phone').readOnly = true

  // คืนสี input
  const editableInputs = ['owner-name', 'store-name', 'store-address', 'store-phone']
  editableInputs.forEach(id => {
    const input = document.getElementById(id)
    input.style.backgroundColor = ''
    input.style.border = ''
  })

  // ซ่อนปุ่ม save/cancel
  document.getElementById('edit-buttons').style.display = 'none'

  // แสดงปุ่มแก้ไข
  document.getElementById('edit-profile-btn').style.display = 'block'
}

// บันทึกข้อมูล
async function saveProfile () {
  const formData = {
    owner_name: document.getElementById('owner-name').value.trim(),
    store_name: document.getElementById('store-name').value.trim(),
    store_address: document.getElementById('store-address').value.trim(),
    store_phone: document.getElementById('store-phone').value.trim()
  }

  // Validation
  if (!formData.owner_name || !formData.store_name) {
    alert('กรุณากรอกชื่อเจ้าของร้านและชื่อร้าน')
    return
  }

  try {
    const token = localStorage.getItem('token')

    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })

    const result = await response.json()

    if (result.success) {
      alert('บันทึกข้อมูลสำเร็จ!')

      // อัพเดท localStorage
      localStorage.setItem('user', JSON.stringify(result.data))

      // ปิดโหมดแก้ไข
      disableEditMode()
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.message)
    }
  } catch (error) {
    console.error('Save error:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  }
}

// แสดงสิทธิ์ของ user
function displayUserRole () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (!canEditProfile()) {
    // ซ่อนปุ่มแก้ไขถ้าไม่มีสิทธิ์
    const editBtn = document.getElementById('edit-profile-btn')
    if (editBtn) {
      editBtn.style.display = 'none'
    }

    // แสดงข้อความ
    const contentSection = document.querySelector('.content')
    if (contentSection) {
      const roleMsg = document.createElement('p')
      roleMsg.textContent = `สิทธิ์: ${user.role} (ไม่สามารถแก้ไขข้อมูลร้านค้าได้)`
      roleMsg.style.color = '#666'
      roleMsg.style.fontStyle = 'italic'
      contentSection.insertBefore(roleMsg, contentSection.firstChild.nextSibling)
    }
  }
}



// แสดงชื่อ user ในปุ่ม profile
function updateProfileButton () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const profileBtn = document.getElementById('profile-btn')

  if (profileBtn && user.username) {
    profileBtn.textContent = `👤 ${user.username}`
    // หรือถ้าต้องการแสดงชื่อเจ้าของร้าน
    // profileBtn.textContent = `👤 ${user.owner_name}`
  }
}

// โหลดข้อมูลร้าน (เฉพาะ employee)
async function loadStoreInfoForEmployee() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/employees/store-info', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await res.json()
    if (result.success) {
      // ส่ง username ของ employee เข้าไปด้วย
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      displayUserProfile({
        ...result.data,
        username: user.username
      })
      updateProfileButton()   // ←← เพิ่มบรรทัดนี้
    } else {
      alert(result.message || 'ไม่พบข้อมูลร้าน')
    }
  } catch (error) {
    alert('เกิดข้อผิดพลาด')
    console.error(error)
  }
}


// ฟังก์ชันนี้จะทำงานได้กับทั้ง user และ employee
function displayUserProfile (data) {
  document.getElementById('owner-name').value = data.owner_name || ''
  document.getElementById('store-name').value = data.store_name || ''
  document.getElementById('store-address').value = data.store_address || ''
  document.getElementById('store-phone').value = data.store_phone || ''
  document.getElementById('user-name').value = data.username || ''
}



document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 DOM loaded for admin page')

  // ตรวจสอบการ login
  checkAuth()

  // ประกาศ user ตรงนี้ทีเดียว
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // ตรวจสอบ elements
  console.log('Edit button:', document.getElementById('edit-profile-btn'))
  console.log('User role:', user.role)
  console.log('Can edit:', canEditProfile())

  // แสดงสิทธิ์
  displayUserRole()

  // โหลดข้อมูลร้านแยกตาม role
  if (user.role === 'employee') {
    loadStoreInfoForEmployee()
  } else {
    loadUserProfile()
  }

  // ===== ซ่อนปุ่มถ้าเป็น employee (ปลอดภัยสุด) =====
  if (user.role === 'employee') {
    let btn
    btn = document.getElementById('add-employee-btn')
    if (btn) btn.style.display = 'none'

    btn = document.getElementById('manage-employees-btn')
    if (btn) btn.style.display = 'none'

    btn = document.getElementById('dashboard-btn')
    if (btn) btn.style.display = 'none'

    btn = document.getElementById('customers-btn')
    if (btn) btn.style.display = 'none'
  }
  // ===== จบส่วนที่เพิ่ม =====

  // --- Navigation buttons ---
  let btn
  btn = document.getElementById('home-btn')
  if (btn) btn.addEventListener('click', goHome)

  btn = document.getElementById('dashboard-btn')
  if (btn) btn.addEventListener('click', goToDashboard)

  btn = document.getElementById('customers-btn')
  if (btn) btn.addEventListener('click', goToCustomers)

  btn = document.getElementById('products-btn')
  if (btn) btn.addEventListener('click', goToProducts)

  btn = document.getElementById('profile-btn')
  if (btn) btn.addEventListener('click', goToAdmin)

  // --- Employee management buttons ---
  btn = document.getElementById('add-employee-btn')
  if (btn) btn.addEventListener('click', showAddEmployeeModal)

  btn = document.getElementById('manage-employees-btn')
  if (btn) btn.addEventListener('click', showManageEmployees)

  btn = document.getElementById('logout-btn')
  if (btn) btn.addEventListener('click', logout)

  // ปุ่มแก้ไข
  const editBtn = document.getElementById('edit-profile-btn')
  if (editBtn) {
    console.log('✅ Edit button found, adding click listener')
    editBtn.addEventListener('click', function () {
      console.log('🖱️ Edit button clicked!')
      enableEditMode()
    })
  } else {
    console.log('❌ Edit button not found!')
  }

  btn = document.getElementById('save-btn')
  if (btn) btn.addEventListener('click', saveProfile)

  btn = document.getElementById('cancel-btn')
  if (btn) btn.addEventListener('click', cancelEdit)

  btn = document.getElementById('add-employee-popup')
  if (btn) {
    btn.addEventListener('click', function (event) {
      if (event.target === this) closeAddEmployeePopup()
    })
  }

  console.log('🎯 All event listeners added')
})

