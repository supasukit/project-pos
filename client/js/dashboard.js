// =========================================
// Dashboard Script - POS System
// =========================================

// ตัวแปร global สำหรับเก็บข้อมูล
const salesData = []
let ordersData = []
let customersData = []
const paymentsData = []

// Chart instances
let salesChart = null
let paymentComparisonChart = null
let paymentTypeChart = null

// =========================================
// Navigation Functions
// =========================================

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

// =========================================
// Auth Functions
// =========================================

function checkAuth () {
  const token = localStorage.getItem('token')
  if (!token) {
    alert('กรุณาเข้าสู่ระบบก่อน')
    window.location.href = '/login.html'
    return false
  }
  return true
}

function updateProfileButton () {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const profileBtn = document.getElementById('profile-btn')

  if (profileBtn && user.username) {
    profileBtn.textContent = `👤 ${user.username}`
  }
}

// =========================================
// API Functions
// =========================================

// ดึงข้อมูลสรุปจาก API
async function loadDashboardSummary () {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userId = user._id || user.id
    const token = localStorage.getItem('token')

    // ดึงข้อมูลออเดอร์
    const ordersResponse = await fetch(`/api/orders?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (ordersResponse.ok) {
      const ordersResult = await ordersResponse.json()
      if (ordersResult.success) {
        ordersData = ordersResult.data
        calculateSummaryStats()
      }
    }

    // ดึงข้อมูลลูกค้า
    const customersResponse = await fetch(`/api/customers?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (customersResponse.ok) {
      const customersResult = await customersResponse.json()
      if (customersResult.success) {
        customersData = customersResult.data
        updateCustomerStats()
      }
    }
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error)
    displayErrorMessage('ไม่สามารถโหลดข้อมูลได้')
  }
}

// ดึงข้อมูลประวัติการขาย
async function loadRecentSales () {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userId = user._id || user.id
    const token = localStorage.getItem('token')

    const response = await fetch(`/api/orders?userId=${userId}&limit=10&sort=newest`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        displayRecentSales(result.data)
        displayOrderHistory(result.data)
      }
    }
  } catch (error) {
    console.error('❌ Error loading recent sales:', error)
  }
}

// =========================================
// Summary Statistics Functions
// =========================================

function calculateSummaryStats () {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let totalSales = 0
  let todaySales = 0
  let totalDebt = 0

  ordersData.forEach(order => {
    totalSales += order.total_amount || 0

    const orderDate = new Date(order.order_date || order.created_at)
    if (orderDate >= todayStart) {
      todaySales += order.total_amount || 0
    }

    if (order.payment_type === 'credit' && order.payment_status === 'unpaid') {
      totalDebt += order.remaining_amount || order.total_amount || 0
    }
  })

  // อัพเดท UI
  document.getElementById('total-sales').textContent = `฿${totalSales.toLocaleString()}`
  document.getElementById('today-sales').textContent = `฿${todaySales.toLocaleString()}`
  document.getElementById('total-debt').textContent = `฿${totalDebt.toLocaleString()}`
}

function updateCustomerStats () {
  const pendingCustomers = customersData.filter(customer =>
    customer.credit_balance > 0
  ).length

  document.getElementById('pending-customers').textContent = `${pendingCustomers} คน`
}

// =========================================
// Charts Functions
// =========================================

function initializeSalesChart () {
  const ctx = document.getElementById('sales-chart').getContext('2d')

  if (salesChart) {
    salesChart.destroy()
  }

  const salesByDate = processSalesData(7) // 7 วันล่าสุด

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: salesByDate.labels,
      datasets: [{
        label: 'ยอดขาย (บาท)',
        data: salesByDate.data,
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return '฿' + value.toLocaleString()
            }
          }
        }
      }
    }
  })
}

function initializePaymentComparisonChart () {
  const ctx = document.getElementById('payment-comparison-chart').getContext('2d')

  if (paymentComparisonChart) {
    paymentComparisonChart.destroy()
  }

  const todayData = getTodayPaymentData()

  paymentComparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['เงินสด', 'เครดิต'],
      datasets: [{
        label: 'ยอดขาย (บาท)',
        data: [todayData.cash, todayData.credit],
        backgroundColor: ['#10B981', '#F59E0B'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return '฿' + value.toLocaleString()
            }
          }
        }
      }
    }
  })
}

function initializePaymentTypeChart () {
  const ctx = document.getElementById('payment-type-chart').getContext('2d')

  if (paymentTypeChart) {
    paymentTypeChart.destroy()
  }

  const paymentData = getPaymentTypeData()

  paymentTypeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['เงินสด', 'เครดิต'],
      datasets: [{
        data: [paymentData.cash, paymentData.credit],
        backgroundColor: ['#10B981', '#F59E0B'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  })
}

// =========================================
// Data Processing Functions
// =========================================

function processSalesData (days) {
  const labels = []
  const data = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    const dateString = date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit'
    })
    labels.push(dateString)

    const dailySales = ordersData
      .filter(order => {
        const orderDate = new Date(order.order_date || order.created_at)
        return orderDate.toDateString() === date.toDateString()
      })
      .reduce((sum, order) => sum + (order.total_amount || 0), 0)

    data.push(dailySales)
  }

  return { labels, data }
}

function getTodayPaymentData () {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let cash = 0
  let credit = 0

  ordersData.forEach(order => {
    const orderDate = new Date(order.order_date || order.created_at)
    if (orderDate >= todayStart) {
      if (order.payment_type === 'cash') {
        cash += order.total_amount || 0
      } else if (order.payment_type === 'credit') {
        credit += order.total_amount || 0
      }
    }
  })

  return { cash, credit }
}

function getPaymentTypeData () {
  let cash = 0
  let credit = 0

  ordersData.forEach(order => {
    if (order.payment_type === 'cash') {
      cash += order.total_amount || 0
    } else if (order.payment_type === 'credit') {
      credit += order.total_amount || 0
    }
  })

  return { cash, credit }
}

// =========================================
// Display Functions
// =========================================

function displayRecentSales (sales) {
  const tbody = document.querySelector('#recent-sales-table tbody')

  if (!sales || sales.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: #666;">
                    ยังไม่มีข้อมูลการขาย
                </td>
            </tr>
        `
    return
  }

  tbody.innerHTML = sales.slice(0, 10).map(sale => `
        <tr>
            <td>${new Date(sale.order_date || sale.created_at).toLocaleDateString('th-TH')}</td>
            <td>${sale.total_items || '-'} รายการ</td>
            <td>${sale.total_quantity || '-'}</td>
            <td>฿${(sale.total_amount || 0).toLocaleString()}</td>
        </tr>
    `).join('')
}

function displayOrderHistory (orders) {
  const tbody = document.getElementById('order-history-body')

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #666;">
                    ยังไม่มีประวัติการขาย
                </td>
            </tr>
        `
    return
  }

  tbody.innerHTML = orders.slice(0, 15).map(order => `
        <tr>
            <td>${new Date(order.order_date || order.created_at).toLocaleDateString('th-TH')}</td>
            <td>${order.customer_name || 'ไม่ระบุ'}</td>
            <td>฿${(order.total_amount || 0).toLocaleString()}</td>
            <td>
                <span style="color: ${order.payment_type === 'cash' ? '#10B981' : '#F59E0B'};">
                    ${order.payment_type === 'cash' ? '💰 เงินสด' : '📋 เครดิต'}
                </span>
            </td>
            <td>
                <button onclick="showOrderDetails('${order._id}')" 
                        style="background: #4F46E5; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    ดูรายละเอียด
                </button>
            </td>
        </tr>
    `).join('')
}


function displayPaymentHistory(payments = []) {
  console.log('🔍 displayPaymentHistory called with:', payments.length, 'payments')
  console.log('🔍 payments data:', payments)
  
  const tbody = document.getElementById('debt-payment-history-body')
  console.log('🔍 tbody element found:', !!tbody)
  console.log('🔍 tbody element:', tbody)
  
  if (!tbody) {
    console.error('❌ Element debt-payment-history-body not found!')
    return
  }

  if (!payments || payments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: #666;">
          ยังไม่มีประวัติการจ่ายหนี้
        </td>
      </tr>
    `
    return
  }

  console.log('📝 Creating table rows for', payments.length, 'payments')
  
  tbody.innerHTML = payments.map(payment => `
    <tr>
      <td>${new Date(payment.payment_date).toLocaleDateString('th-TH')}</td>
      <td>${payment.customer_name || 'ไม่ระบุ'}</td>
      <td>฿${(payment.amount || 0).toLocaleString()}</td>
      <td>
        <span style="
          color: #28a745; 
          background: #d4edda; 
          padding: 2px 8px; 
          border-radius: 4px; 
          font-size: 12px;
        ">
          ✅ ชำระแล้ว
        </span>
      </td>
    </tr>
  `).join('')
  
  console.log('✅ Table rows created successfully')
}

// ดึงข้อมูลประวัติการจ่ายหนี้จาก customers API
async function loadPaymentHistory() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userId = user._id || user.id
    const token = localStorage.getItem('token')

    console.log('🔍 Loading payment history for dashboard, userId:', userId)

    // ใช้ API customers เหมือน customer.js
    const response = await fetch(`/api/customers?userId=${userId}&limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const result = await response.json()
      console.log('📥 Customers loaded for payment history:', result)
      
      if (result.success && result.data) {
        // รวบรวม payment history จากลูกค้าทั้งหมด
        const allPayments = []
        
        result.data.forEach(customer => {
          if (customer.payment_history && customer.payment_history.length > 0) {
            customer.payment_history.forEach(payment => {
              allPayments.push({
                customer_name: customer.name,
                amount: payment.amount,
                payment_date: payment.payment_date,
                payment_method: payment.payment_method,
                notes: payment.notes
              })
            })
          }
        })
        
        // เรียงตามวันที่ล่าสุด
        allPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
        
        console.log('💳 Payment history found:', allPayments.length)
        displayPaymentHistory(allPayments)
      } else {
        console.warn('⚠️ No customer data received')
        displayPaymentHistory([])
      }
    } else {
      console.error('❌ Failed to load customers:', response.status)
      displayPaymentHistory([])
    }
  } catch (error) {
    console.error('❌ Error loading payment history:', error)
    displayPaymentHistory([])
  }
}
function displayErrorMessage (message) {
  const summaryCards = document.querySelector('.summary-cards')
  if (summaryCards) {
    summaryCards.innerHTML = `
            <div class="card" style="grid-column: span 4; text-align: center; color: #dc3545;">
                <h2>❌ เกิดข้อผิดพลาด</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    โหลดใหม่
                </button>
            </div>
        `
  }
}

// =========================================
// Event Handlers
// =========================================

// =========================================
// Order Details Functions - เพิ่มใน dashboard.js
// =========================================

// แสดงรายละเอียดออเดอร์
async function showOrderDetails(orderId) {
  try {
    console.log(`🔍 Loading order details for ID: ${orderId}`)
    
    // แสดง loading modal ก่อน
    showLoadingModal()
    
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('ไม่พบ token การเข้าสู่ระบบ')
    }

    // เรียก API ดึงรายละเอียดออเดอร์
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('ไม่พบข้อมูลออเดอร์')
      } else if (response.status === 401) {
        throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูล')
      } else {
        throw new Error(`เกิดข้อผิดพลาด: ${response.status}`)
      }
    }

    const result = await response.json()
    console.log('📥 Order details loaded:', result)

    if (result.success && result.data) {
      displayOrderDetailsModal(result.data.order, result.data.items)
    } else {
      throw new Error(result.message || 'ไม่สามารถดึงข้อมูลได้')
    }

  } catch (error) {
    console.error('❌ Error loading order details:', error)
    hideLoadingModal()
    alert(`❌ เกิดข้อผิดพลาด: ${error.message}`)
  }
}

// แสดง loading modal
function showLoadingModal() {
  // ลบ modal เก่าถ้ามี
  const existingModal = document.getElementById('order-details-modal')
  if (existingModal) {
    existingModal.remove()
  }

  // สร้าง loading modal
  const modal = document.createElement('div')
  modal.id = 'order-details-modal'
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeOrderDetailsModal()">
      <div class="modal-content order-details-content" onclick="event.stopPropagation()">
        <div style="text-align: center; padding: 50px;">
          <div style="font-size: 48px; margin-bottom: 20px; animation: spin 1s linear infinite;">🔄</div>
          <h3>กำลังโหลดข้อมูลออเดอร์...</h3>
        </div>
      </div>
    </div>
  `
  
  // เพิ่ม CSS
  const style = document.createElement('style')
  style.textContent = `
    #order-details-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    
    .order-details-content {
      background: white;
      border-radius: 8px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .order-header {
      background: #f8f9fa;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      border-radius: 8px 8px 0 0;
      position: relative;
    }
    
    .close-btn {
      position: absolute;
      top: 15px;
      right: 20px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .close-btn:hover {
      background: #c82333;
    }
    
    .order-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      padding: 20px;
    }
    
    .info-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #007bff;
    }
    
    .info-label {
      font-weight: bold;
      color: #495057;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      color: #212529;
    }
    
    .items-section {
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    .items-table th,
    .items-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    
    .items-table th {
      background: #f8f9fa;
      font-weight: bold;
      color: #495057;
    }
    
    .items-table tbody tr:hover {
      background: #f8f9fa;
    }
    
    .price {
      font-weight: bold;
      color: #28a745;
    }
    
    .total-section {
      background: #f8f9fa;
      padding: 20px;
      border-top: 2px solid #007bff;
      text-align: right;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 16px;
    }
    
    .total-final {
      font-size: 20px;
      font-weight: bold;
      color: #007bff;
      border-top: 1px solid #dee2e6;
      padding-top: 10px;
    }
    
    .payment-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .status-cash {
      background: #d4edda;
      color: #155724;
    }
    
    .status-credit {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-paid {
      background: #d4edda;
      color: #155724;
    }
    
    .status-unpaid {
      background: #f8d7da;
      color: #721c24;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @media (max-width: 768px) {
      .order-details-content {
        width: 95%;
        margin: 10px;
      }
      
      .order-info {
        grid-template-columns: 1fr;
      }
      
      .items-table {
        font-size: 14px;
      }
      
      .items-table th,
      .items-table td {
        padding: 8px 4px;
      }
    }
  `
  
  document.head.appendChild(style)
  document.body.appendChild(modal)
}

// ซ่อน loading modal
function hideLoadingModal() {
  const modal = document.getElementById('order-details-modal')
  if (modal) {
    modal.remove()
  }
}

// แสดง modal รายละเอียดออเดอร์
function displayOrderDetailsModal(order, items) {
  console.log('📊 Displaying order details:', { order, items })
  
  // สร้างข้อมูลวันที่
  const orderDate = new Date(order.order_date || order.created_at || order.createdAt)
  const formattedDate = orderDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // สร้าง HTML สำหรับรายการสินค้า
  const itemsHTML = items && items.length > 0 ? items.map(item => `
    <tr>
      <td>${item.product_name || item.name || 'ไม่ระบุ'}</td>
      <td style="text-align: center;">${item.quantity || 0}</td>
      <td style="text-align: right;" class="price">฿${(item.price || 0).toLocaleString()}</td>
      <td style="text-align: right;" class="price">฿${(item.total || (item.quantity * item.price) || 0).toLocaleString()}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="4" style="text-align: center; color: #6c757d; font-style: italic;">
        ไม่มีรายการสินค้า
      </td>
    </tr>
  `

  // สร้าง HTML สำหรับสถานะการชำระเงิน
  const paymentTypeClass = order.payment_type === 'cash' ? 'status-cash' : 'status-credit'
  const paymentTypeText = order.payment_type === 'cash' ? '💰 เงินสด' : '📋 เครดิต'
  
  const paymentStatusClass = order.payment_status === 'paid' ? 'status-paid' : 'status-unpaid'
  const paymentStatusText = order.payment_status === 'paid' ? '✅ ชำระแล้ว' : '⏳ ยังไม่ชำระ'

  // คำนวณยอดรวม
  const totalAmount = order.total_amount || 0
  const paidAmount = order.paid_amount || 0
  const remainingAmount = order.remaining_amount || (totalAmount - paidAmount)

  // อัพเดท modal content
  const modal = document.getElementById('order-details-modal')
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeOrderDetailsModal()">
      <div class="modal-content order-details-content" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="order-header">
          <h2 style="margin: 0; color: #212529;">
            🧾 รายละเอียดออเดอร์ #${order._id ? order._id.slice(-8) : 'N/A'}
          </h2>
          <button class="close-btn" onclick="closeOrderDetailsModal()" title="ปิด">×</button>
        </div>

        <!-- ข้อมูลออเดอร์ -->
        <div class="order-info">
          <div class="info-card">
            <div class="info-label">📅 วันที่สั่ง</div>
            <div class="info-value">${formattedDate}</div>
          </div>
          
          <div class="info-card">
            <div class="info-label">👤 ลูกค้า</div>
            <div class="info-value">${order.customer_name || 'ไม่ระบุ'}</div>
          </div>
          
          <div class="info-card">
            <div class="info-label">💳 ประเภทการชำระ</div>
            <div class="info-value">
              <span class="payment-status ${paymentTypeClass}">${paymentTypeText}</span>
            </div>
          </div>
          
          <div class="info-card">
            <div class="info-label">📊 สถานะการชำระ</div>
            <div class="info-value">
              <span class="payment-status ${paymentStatusClass}">${paymentStatusText}</span>
            </div>
          </div>
          
          ${order.customer_phone ? `
          <div class="info-card">
            <div class="info-label">📞 เบอร์โทร</div>
            <div class="info-value">${order.customer_phone}</div>
          </div>
          ` : ''}
          
          ${order.notes ? `
          <div class="info-card">
            <div class="info-label">📝 หมายเหตุ</div>
            <div class="info-value">${order.notes}</div>
          </div>
          ` : ''}
        </div>

        <!-- รายการสินค้า -->
        <div class="items-section">
          <h3 style="margin-top: 0; color: #495057;">🛒 รายการสินค้า</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th style="text-align: center;">จำนวน</th>
                <th style="text-align: right;">ราคา/ชิ้น</th>
                <th style="text-align: right;">รวม</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>

        <!-- สรุปยอดรวม -->
        <div class="total-section">
          <div class="total-row">
            <span>จำนวนรายการ:</span>
            <span>${order.total_items || items?.length || 0} รายการ</span>
          </div>
          
          <div class="total-row">
            <span>จำนวนสินค้ารวม:</span>
            <span>${order.total_quantity || items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} ชิ้น</span>
          </div>
          
          ${order.discount_amount && order.discount_amount > 0 ? `
          <div class="total-row">
            <span>ส่วนลด:</span>
            <span class="price">-฿${order.discount_amount.toLocaleString()}</span>
          </div>
          ` : ''}
          
          <div class="total-row total-final">
            <span>ยอดรวมทั้งสิ้น:</span>
            <span>฿${totalAmount.toLocaleString()}</span>
          </div>
          
          ${order.payment_type === 'credit' ? `
          <div class="total-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <span>ยอดที่ชำระแล้ว:</span>
            <span class="price">฿${paidAmount.toLocaleString()}</span>
          </div>
          
          <div class="total-row">
            <span>ยอดคงเหลือ:</span>
            <span style="color: ${remainingAmount > 0 ? '#dc3545' : '#28a745'}; font-weight: bold;">
              ฿${remainingAmount.toLocaleString()}
            </span>
          </div>
          ` : ''}
        </div>

        <!-- ปุ่มปิด -->
        <div style="padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <button onclick="closeOrderDetailsModal()" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          ">
            ปิด
          </button>
        </div>
      </div>
    </div>
  `
}

// ปิด modal รายละเอียดออเดอร์
function closeOrderDetailsModal() {
  const modal = document.getElementById('order-details-modal')
  if (modal) {
    modal.remove()
  }
  
  // ลบ style element ด้วย
  const styleElements = document.querySelectorAll('style')
  styleElements.forEach(style => {
    if (style.textContent.includes('#order-details-modal')) {
      style.remove()
    }
  })
  
  console.log('🚫 Order details modal closed')
}

// เพิ่ม event listener สำหรับ ESC key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modal = document.getElementById('order-details-modal')
    if (modal) {
      closeOrderDetailsModal()
    }
  }
})

// =========================================
// ฟังก์ชันเสริมสำหรับจัดการ Modal (ถ้าต้องการ)
// =========================================

// แสดง modal แบบทั่วไป
function showModal(title, content, buttons = []) {
  const modal = document.createElement('div')
  modal.id = 'general-modal'
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal('general-modal')">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
        <div class="order-header">
          <h3 style="margin: 0;">${title}</h3>
          <button class="close-btn" onclick="closeModal('general-modal')">×</button>
        </div>
        <div style="padding: 20px;">
          ${content}
        </div>
        ${buttons.length > 0 ? `
        <div style="padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          ${buttons.map(btn => `
            <button onclick="${btn.action}" style="
              background: ${btn.color || '#007bff'};
              color: white;
              border: none;
              padding: 10px 20px;
              margin: 0 5px;
              border-radius: 5px;
              cursor: pointer;
            ">${btn.text}</button>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

// ปิด modal ทั่วไป
function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.remove()
  }
}
function handleSalesFilterChange () {
  const filter = document.getElementById('sales-filter').value
  let days = 7

  switch (filter) {
    case '7days':
      days = 7
      break
    case '30days':
      days = 30
      break
    case 'year':
      days = 365
      break
  }

  // อัพเดทกราฟ
  const salesByDate = processSalesData(days)
  salesChart.data.labels = salesByDate.labels
  salesChart.data.datasets[0].data = salesByDate.data
  salesChart.update()
}

// =========================================
// Initialization
// =========================================

document.addEventListener('DOMContentLoaded', async function () {
  console.log('🚀 Dashboard page loaded')

  // ตรวจสอบการ login
  if (!checkAuth()) return

  // อัพเดทปุ่ม profile
  updateProfileButton()

  // เพิ่ม event listeners สำหรับ navigation
  document.getElementById('home-btn')?.addEventListener('click', goHome)
  document.getElementById('dashboard-btn')?.addEventListener('click', goToDashboard)
  document.getElementById('customers-btn')?.addEventListener('click', goToCustomers)
  document.getElementById('products-btn')?.addEventListener('click', goToProducts)
  document.getElementById('profile-btn')?.addEventListener('click', goToAdmin)

  // เพิ่ม event listener สำหรับ filter
  document.getElementById('sales-filter')?.addEventListener('change', handleSalesFilterChange)

  // โหลดข้อมูล
  await loadDashboardSummary()
  await loadRecentSales()
  await loadPaymentHistory()
  // สร้างกราฟ
  initializeSalesChart()
  initializePaymentComparisonChart()
  initializePaymentTypeChart()

  

  console.log('✅ Dashboard initialized successfully')
})
