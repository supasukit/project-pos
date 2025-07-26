console.log('Manage Employees JS loaded')

let allEmployees = []
let filteredEmployees = []

function goHome () {
  window.location.href = '/pages/pos/index.html'
}

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

function addNewEmployee () {
  const width = 600
  const height = 700
  const left = (window.innerWidth - width) / 2
  const top = (window.innerHeight - height) / 2

  window.open(
    '/pages/admin/add-employee.html',
    'AddEmployee',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  )
}

async function loadEmployees () {
  try {
    showLoading(true)
    console.log('Loading employees...')

    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    const response = await fetch(`/api/employees?userId=${user._id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    console.log('Employees loaded:', result)

    if (result.success && result.data) {
      allEmployees = result.data
      filteredEmployees = allEmployees
      displayEmployees(filteredEmployees)
      updateStats()
    } else {
      displayNoData()
    }
  } catch (error) {
    console.error('Error loading employees:', error)
    displayError()
  } finally {
    showLoading(false)
  }
}

function displayEmployees (employees) {
  const grid = document.getElementById('employees-grid')

  if (!employees || employees.length === 0) {
    displayNoData()
    return
  }

  document.getElementById('no-data').classList.add('hidden')

  const employeesHTML = employees.map(employee => {
    const initial = employee.owner_name ? employee.owner_name.charAt(0).toUpperCase() : '?'
    const statusClass = employee.isActive ? 'active' : 'inactive'
    const statusText = employee.isActive ? 'ใช้งาน' : 'ระงับ'

    return `
            <div class="employee-card ${statusClass}" onclick="showEmployeeDetail('${employee._id}')">
                <div class="employee-header">
                    <div class="employee-avatar">${initial}</div>
                    <div class="employee-info">
                        <h3>${employee.owner_name || 'ไม่ระบุชื่อ'}</h3>
                        <div class="employee-username">@${employee.username}</div>
                    </div>
                </div>
                
                <div class="employee-details">
                    <p>📱 ${employee.store_phone || 'ไม่ระบุ'}</p>
                    <p>📍 ${employee.store_address || 'ไม่ระบุที่อยู่'}</p>
                </div>
                
                <div class="employee-status ${statusClass}">
                    ${statusText}
                </div>
                
                <div class="employee-actions" onclick="event.stopPropagation()">
                    <button class="btn-edit" onclick="editEmployee('${employee._id}')">แก้ไข</button>
                    <button class="btn-toggle" onclick="toggleEmployeeStatus('${employee._id}', ${employee.isActive})">${employee.isActive ? 'ระงับ' : 'เปิดใช้'}</button>
                    <button class="btn-delete" onclick="deleteEmployee('${employee._id}', '${employee.owner_name}')">ลบ</button>
                </div>
            </div>
        `
  }).join('')

  grid.innerHTML = employeesHTML
}

async function toggleEmployeeStatus(employeeId, currentStatus) {
  try {
    const newStatus = !currentStatus
    const action = newStatus ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'
    
    if (!confirm(`ต้องการ${action}พนักงานคนนี้หรือไม่?`)) {
      return
    }
    
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/employees/${employeeId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive: newStatus })
    })
    
    const result = await response.json()
    
    if (result.success) {
      alert(`${action}สำเร็จ`)
      loadEmployees()
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.message)
    }
  } catch (error) {
    alert('เกิดข้อผิดพลาด: ' + error.message)
  }
}

function updateStats () {
  const total = allEmployees.length
  const active = allEmployees.filter(e => e.isActive).length
  const inactive = total - active

  document.getElementById('total-employees').textContent = total
  document.getElementById('active-employees').textContent = active
  document.getElementById('inactive-employees').textContent = inactive
}

function searchEmployees () {
  const searchTerm = document.getElementById('search-employee').value.toLowerCase()

  if (!searchTerm) {
    filteredEmployees = allEmployees
  } else {
    filteredEmployees = allEmployees.filter(employee => {
      const name = (employee.owner_name || '').toLowerCase()
      const username = employee.username.toLowerCase()
      const phone = (employee.store_phone || '').toLowerCase()

      return name.includes(searchTerm) ||
                   username.includes(searchTerm) ||
                   phone.includes(searchTerm)
    })
  }

  displayEmployees(filteredEmployees)
}

function showEmployeeDetail (employeeId) {
  const employee = allEmployees.find(e => e._id === employeeId)

  if (!employee) return

  const popup = document.getElementById('employee-popup')
  const detail = document.getElementById('employee-detail')

  const initial = employee.owner_name ? employee.owner_name.charAt(0).toUpperCase() : '?'
  const statusClass = employee.isActive ? 'active' : 'inactive'
  const statusText = employee.isActive ? 'ใช้งาน' : 'ระงับการใช้งาน'

  detail.innerHTML = `
        <div class="avatar-large">${initial}</div>
        <h2>${employee.owner_name || 'ไม่ระบุชื่อ'}</h2>
        <p class="username">@${employee.username}</p>
        
        <div class="detail-info">
            <p><strong>เบอร์โทรศัพท์:</strong> ${employee.store_phone || 'ไม่ระบุ'}</p>
            <p><strong>ที่อยู่:</strong> ${employee.store_address || 'ไม่ระบุ'}</p>
            <p><strong>สถานะ:</strong> <span class="employee-status ${statusClass}">${statusText}</span></p>
            <p><strong>วันที่สร้าง:</strong> ${new Date(employee.createdAt).toLocaleDateString('th-TH')}</p>
            <p><strong>Role:</strong> ${employee.role}</p>
        </div>
        
        <div class="button-group">
            <button class="btn-edit" onclick="editEmployee('${employee._id}')">แก้ไข</button>
            <button class="btn-delete" onclick="deleteEmployee('${employee._id}', '${employee.owner_name}')">ลบ</button>
        </div>
    `

  popup.classList.remove('hidden')
}

function closeEmployeePopup () {
  document.getElementById('employee-popup').classList.add('hidden')
}

function editEmployee (employeeId) {
  const employee = allEmployees.find(e => e._id === employeeId)

  if (!employee) return

  closeEmployeePopup()

  const editPopup = document.getElementById('edit-popup')

  document.getElementById('edit-employee-id').value = employee._id
  document.getElementById('edit-employee-name').value = employee.owner_name || ''
  document.getElementById('edit-employee-phone').value = employee.store_phone || ''
  document.getElementById('edit-employee-address').value = employee.store_address || ''
  document.getElementById('edit-employee-status').value = employee.isActive ? 'active' : 'inactive'

  editPopup.classList.remove('hidden')
}

function closeEditPopup () {
  document.getElementById('edit-popup').classList.add('hidden')
  document.getElementById('edit-employee-form').reset()
}

async function saveEmployeeEdit (event) {
  event.preventDefault()

  const employeeId = document.getElementById('edit-employee-id').value
  const updateData = {
    owner_name: document.getElementById('edit-employee-name').value.trim(),
    store_phone: document.getElementById('edit-employee-phone').value.trim(),
    store_address: document.getElementById('edit-employee-address').value.trim(),
    isActive: document.getElementById('edit-employee-status').value === 'active'
  }

  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    })

    const result = await response.json()

    if (result.success) {
      alert('แก้ไขข้อมูลพนักงานสำเร็จ')
      closeEditPopup()
      loadEmployees()
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.message)
    }
  } catch (error) {
    console.error('Error updating employee:', error)
    alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล')
  }
}

async function deleteEmployee (employeeId, employeeName) {
  const confirmMsg = employeeName
    ? `ต้องการลบพนักงาน "${employeeName}" หรือไม่?`
    : 'ต้องการลบพนักงานนี้หรือไม่?'

  if (!confirm(`${confirmMsg}\n\nการลบจะไม่สามารถกู้คืนได้`)) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    if (result.success) {
      alert('ลบพนักงานสำเร็จ')
      loadEmployees()
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.message)
    }
  } catch (error) {
    console.error('Error deleting employee:', error)
    alert('เกิดข้อผิดพลาดในการลบพนักงาน')
  }
}

function showLoading (show) {
  const loading = document.getElementById('loading')
  const grid = document.getElementById('employees-grid')

  if (show) {
    loading.classList.remove('hidden')
    grid.innerHTML = ''
  } else {
    loading.classList.add('hidden')
  }
}

function displayNoData () {
  const noData = document.getElementById('no-data')
  const grid = document.getElementById('employees-grid')

  noData.classList.remove('hidden')
  grid.innerHTML = ''
}

function displayError () {
  const grid = document.getElementById('employees-grid')
  grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #e74c3c;">
            <h3>เกิดข้อผิดพลาด</h3>
            <p>ไม่สามารถโหลดข้อมูลพนักงานได้</p>
            <button onclick="loadEmployees()" style="margin-top: 10px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                ลองใหม่
            </button>
        </div>
    `
}

function checkPermission () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (user.role !== 'user') {
    alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
    window.location.href = '/pages/admin/admin.html'
    return false
  }

  return true
}

function updateProfileButton () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const profileBtn = document.getElementById('profile-btn')

  if (profileBtn && user.username) {
    profileBtn.textContent = `${user.username}`
  }
}

document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM loaded for manage employees page')

  if (!checkPermission()) {
    return
  }

  updateProfileButton()
  loadEmployees()

  document.getElementById('home-btn')?.addEventListener('click', goHome)
  document.getElementById('dashboard-btn')?.addEventListener('click', goToDashboard)
  document.getElementById('customers-btn')?.addEventListener('click', goToCustomers)
  document.getElementById('products-btn')?.addEventListener('click', goToProducts)
  document.getElementById('profile-btn')?.addEventListener('click', goToAdmin)
  document.getElementById('edit-employee-form')?.addEventListener('submit', saveEmployeeEdit)

  window.addEventListener('focus', function () {
    console.log('Window focused, reloading employees...')
    loadEmployees()
  })

  console.log('Manage employees page initialized')
})