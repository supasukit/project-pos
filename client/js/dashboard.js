// =========================================
// Dashboard Script - POS System
// =========================================

// ตัวแปร global สำหรับเก็บข้อมูล
let salesData = []
let ordersData = []
let customersData = []
let paymentsData = []

// Chart instances
let salesChart = null
let paymentComparisonChart = null
let paymentTypeChart = null

// =========================================
// Navigation Functions
// =========================================

function goHome() {
    window.location.href = '/pages/pos/index.html'
}

function goToDashboard() {
    window.location.href = '/pages/admin/dashboard.html'
}

function goToCustomers() {
    window.location.href = '/pages/customer/customers.html'
}

function goToProducts() {
    window.location.href = '/pages/product/products.html'
}

function goToAdmin() {
    window.location.href = '/pages/admin/admin.html'
}

// =========================================
// Auth Functions
// =========================================

function checkAuth() {
    const token = localStorage.getItem('token')
    if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อน')
        window.location.href = '/login.html'
        return false
    }
    return true
}

function updateProfileButton() {
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
async function loadDashboardSummary() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const userId = user._id || user.id
        const token = localStorage.getItem('token')

        // ดึงข้อมูลออเดอร์
        const ordersResponse = await fetch(`/api/orders?userId=${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
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
                'Authorization': `Bearer ${token}`,
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
async function loadRecentSales() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const userId = user._id || user.id
        const token = localStorage.getItem('token')

        const response = await fetch(`/api/orders?userId=${userId}&limit=10&sort=newest`, {
            headers: {
                'Authorization': `Bearer ${token}`,
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

function calculateSummaryStats() {
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

function updateCustomerStats() {
    const pendingCustomers = customersData.filter(customer => 
        customer.credit_balance > 0
    ).length
    
    document.getElementById('pending-customers').textContent = `${pendingCustomers} คน`
}

// =========================================
// Charts Functions
// =========================================

function initializeSalesChart() {
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
                        callback: function(value) {
                            return '฿' + value.toLocaleString()
                        }
                    }
                }
            }
        }
    })
}

function initializePaymentComparisonChart() {
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
                        callback: function(value) {
                            return '฿' + value.toLocaleString()
                        }
                    }
                }
            }
        }
    })
}

function initializePaymentTypeChart() {
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

function processSalesData(days) {
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

function getTodayPaymentData() {
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

function getPaymentTypeData() {
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

function displayRecentSales(sales) {
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

function displayOrderHistory(orders) {
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

function displayPaymentHistory() {
    const tbody = document.getElementById('debt-payment-history-body')
    
    // สำหรับตอนนี้แสดงข้อความว่างก่อน
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; color: #666;">
                ยังไม่มีประวัติการจ่ายหนี้
            </td>
        </tr>
    `
}

function displayErrorMessage(message) {
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

function showOrderDetails(orderId) {
    // TODO: แสดงรายละเอียดออเดอร์
    alert(`🚧 ฟีเจอร์ดูรายละเอียดออเดอร์ (กำลังพัฒนา)\nOrder ID: ${orderId}`)
}

function handleSalesFilterChange() {
    const filter = document.getElementById('sales-filter').value
    let days = 7

    switch(filter) {
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

document.addEventListener('DOMContentLoaded', async function() {
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
    
    // สร้างกราฟ
    initializeSalesChart()
    initializePaymentComparisonChart()
    initializePaymentTypeChart()
    
    // แสดงประวัติการจ่ายหนี้
    displayPaymentHistory()
    
    console.log('✅ Dashboard initialized successfully')
})