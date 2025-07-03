// ตัวแปรเก็บข้อมูลลูกค้า
let allCustomers = []
// =========================================
// Navigation Functions
// =========================================

function goToDashboard() {
    window.location.href = '/pages/admin/dashboard.html'
}

function goHome() {
    window.location.href = '/pages/pos/index.html'
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



// แสดงเมื่อไม่มีลูกค้า
function displayNoCustomers() {
    const customerList = document.getElementById('customer-list')
    if (customerList) {
        customerList.innerHTML = `
            <div class="no-customers">
                <h3>👥 ยังไม่มีข้อมูลลูกค้า</h3>
                <p>ลูกค้าจะถูกสร้างอัตโนมัติเมื่อมีการขาย</p>
                <button onclick="loadCustomers()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 รีเฟรช
                </button>
            </div>
        `
    }
}



// ปิด popup
function closePopup() {
    const popup = document.getElementById('popup')
    if (popup) {
        popup.classList.add('hidden')
    }
}

// แทนที่ฟังก์ชัน showOrderHistory เดิม (บรรทัด 106)
async function showOrderHistory(customerId) {
    try {
        console.log(`📋 Loading order history for customer: ${customerId}`)
        
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/customers/${customerId}/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('📥 Order history loaded:', result)
        
        if (result.success && result.data) {
            displayOrderHistory(result.data, customerId)
        } else {
            alert('❌ ไม่พบประวัติการซื้อ')
        }
        
    } catch (error) {
        console.error('❌ Error loading order history:', error)
        alert('❌ เกิดข้อผิดพลาดในการดึงประวัติการซื้อ')
    }
}

// เพิ่มฟังก์ชันใหม่
function displayOrderHistory(orders, customerId) {
    const popupInfo = document.getElementById('popup-info')
    
    // เพิ่ม active class
    document.querySelectorAll('.customer-card').forEach(card => {
        card.classList.remove('active')
    })
    document.querySelector(`[data-id="${customerId}"]`)?.classList.add('active')
    
    if (!orders || orders.length === 0) {
        popupInfo.innerHTML = `
            <div class="order-history">
                <h2>📋 ประวัติการซื้อ</h2>
                <p style="text-align: center; padding: 20px; color: #666;">
                    ไม่มีประวัติการซื้อ
                </p>
                <button onclick="goBack()" class="btn-back">🔙 กลับ</button>
            </div>
        `
        return
    }
    
    const ordersHTML = orders.map(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString('th-TH')
        const orderTime = new Date(order.order_date).toLocaleTimeString('th-TH')
        const statusClass = order.payment_status === 'paid' ? 'paid' : 'unpaid'
        const statusText = order.payment_status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'
        
        return `
            <div class="order-item" onclick="showOrderDetail('${order._id}')" style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; cursor: pointer;">
                <div class="order-header" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span class="order-number" style="font-weight: bold;">#${order.order_number}</span>
                    <span class="order-date">${orderDate} ${orderTime}</span>
                </div>
                <div class="order-details">
                    <p><strong>จำนวนรายการ:</strong> ${order.total_items} รายการ</p>
                    <p><strong>ยอดรวม:</strong> ฿${order.total_amount.toLocaleString()}</p>
                    <p><strong>ประเภท:</strong> ${order.payment_type === 'cash' ? '💰 เงินสด' : '💳 เครดิต'}</p>
                    <p><strong>สถานะ:</strong> 
                        <span class="status ${statusClass}" style="color: ${statusClass === 'paid' ? 'green' : 'red'};">${statusText}</span>
                    </p>
                </div>
            </div>
        `
    }).join('')
    
    popupInfo.innerHTML = `
        <div class="order-history">
            <h2>📋 ประวัติการซื้อ</h2>
            <div class="orders-list">
                ${ordersHTML}
            </div>
            <div class="history-actions" style="margin-top: 20px;">
                <button onclick="goBack()" class="btn-back" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">🔙 กลับ</button>
            </div>
        </div>
    `
}

// เพิ่มฟังก์ชันอื่นๆ
function goBack() {
    const customerId = document.querySelector('.customer-card.active')?.getAttribute('data-id')
    if (customerId) {
        showCustomerDetails(customerId)
    } else {
        closePopup()
    }
}

function showOrderDetail(orderId) {
    alert('🚧 ฟีเจอร์รายละเอียดบิล (กำลังพัฒนา)')
}

// เพิ่มฟังก์ชันใหม่
function displayOrderHistory(orders, customerId) {
    const popupInfo = document.getElementById('popup-info')
    
    // เพิ่ม active class
    document.querySelectorAll('.customer-card').forEach(card => {
        card.classList.remove('active')
    })
    document.querySelector(`[data-id="${customerId}"]`)?.classList.add('active')
    
    if (!orders || orders.length === 0) {
        popupInfo.innerHTML = `
            <div class="order-history">
                <h2>📋 ประวัติการซื้อ</h2>
                <p style="text-align: center; padding: 20px; color: #666;">
                    ไม่มีประวัติการซื้อ
                </p>
                <button onclick="goBack()" class="btn-back">🔙 กลับ</button>
            </div>
        `
        return
    }
    
    const ordersHTML = orders.map(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString('th-TH')
        const orderTime = new Date(order.order_date).toLocaleTimeString('th-TH')
        const statusClass = order.payment_status === 'paid' ? 'paid' : 'unpaid'
        const statusText = order.payment_status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'
        
        return `
            <div class="order-item" onclick="showOrderDetail('${order._id}')" style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; cursor: pointer;">
                <div class="order-header" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span class="order-number" style="font-weight: bold;">#${order.order_number}</span>
                    <span class="order-date">${orderDate} ${orderTime}</span>
                </div>
                <div class="order-details">
                    <p><strong>จำนวนรายการ:</strong> ${order.total_items} รายการ</p>
                    <p><strong>ยอดรวม:</strong> ฿${order.total_amount.toLocaleString()}</p>
                    <p><strong>ประเภท:</strong> ${order.payment_type === 'cash' ? '💰 เงินสด' : '💳 เครดิต'}</p>
                    <p><strong>สถานะ:</strong> 
                        <span class="status ${statusClass}" style="color: ${statusClass === 'paid' ? 'green' : 'red'};">${statusText}</span>
                    </p>
                </div>
            </div>
        `
    }).join('')
    
    popupInfo.innerHTML = `
        <div class="order-history">
            <h2>📋 ประวัติการซื้อ</h2>
            <div class="orders-list">
                ${ordersHTML}
            </div>
            <div class="history-actions" style="margin-top: 20px;">
                <button onclick="goBack()" class="btn-back" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">🔙 กลับ</button>
            </div>
        </div>
    `
}

// เพิ่มฟังก์ชันอื่นๆ
function goBack() {
    const customerId = document.querySelector('.customer-card.active')?.getAttribute('data-id')
    if (customerId) {
        showCustomerDetails(customerId)
    } else {
        closePopup()
    }
}

function showOrderDetail(orderId) {
    alert('🚧 ฟีเจอร์รายละเอียดบิล (กำลังพัฒนา)')
}

// ดูประวัติการชำระเงิน
function showPaymentHistory(customerId) {
    console.log(`💳 Loading payment history for customer: ${customerId}`)
    alert('🚧 ฟีเจอร์ประวัติการชำระเงิน (กำลังพัฒนา)')
    // TODO: เรียก API ดูประวัติการชำระเงิน
}

function makePayment() {
    console.log(`💰 Opening payment popup...`)
    showPaymentPopup()
}

// 2. ฟังก์ชันแสดง popup รับชำระเงิน
function showPaymentPopup() {
    // สร้าง popup element
    const popup = document.createElement('div')
    popup.id = 'payment-popup'
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `
    
    popup.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <h2 style="text-align: center; color: #333; margin-bottom: 20px;">💳 รับชำระเงินค้างชำระ</h2>
            
            <div style="margin-bottom: 20px;">
                <label for="payment-customer-search" style="display: block; margin-bottom: 8px; font-weight: bold;">ค้นหาลูกค้า:</label>
                <input type="text" id="payment-customer-search" placeholder="พิมพ์ชื่อหรือเบอร์โทรลูกค้า..." 
                       style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" />
            </div>
            
            <div id="payment-customer-info" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; min-height: 60px; display: flex; align-items: center; justify-content: center; color: #666;">
                ใส่ชื่อลูกค้าเพื่อดูยอดค้างชำระ
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="payment-amount" style="display: block; margin-bottom: 8px; font-weight: bold;">จำนวนเงินที่รับชำระ:</label>
                <input type="number" id="payment-amount" placeholder="กรอกจำนวนเงิน" min="0" step="0.01"
                       style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" />
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="payment-notes" style="display: block; margin-bottom: 8px; font-weight: bold;">หมายเหตุ (ไม่บังคับ):</label>
                <textarea id="payment-notes" placeholder="เช่น ชำระเงินค้างชำระ งวดที่ 1" rows="3"
                          style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="confirm-payment-btn" 
                        style="background: #28a745; color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold;">
                    ✅ ยืนยันรับชำระ
                </button>
                <button onclick="closePaymentPopup()" 
                        style="background: #dc3545; color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold;">
                    ❌ ยกเลิก
                </button>
            </div>
        </div>
    `
    
    document.body.appendChild(popup)
    
    // เพิ่ม event listeners
    document.getElementById('payment-customer-search').addEventListener('input', searchCustomerForPayment)
    document.getElementById('confirm-payment-btn').addEventListener('click', processPaymentFromPopup)
    
    // Focus ที่ช่องค้นหา
    document.getElementById('payment-customer-search').focus()
}

// 3. ปิด popup รับชำระเงิน
function closePaymentPopup() {
    const popup = document.getElementById('payment-popup')
    if (popup) {
        popup.remove()
    }
}

// 4. ตัวแปรเก็บลูกค้าที่เลือกสำหรับการชำระเงิน
let selectedPaymentCustomer = null

// 5. ฟังก์ชันค้นหาลูกค้าสำหรับการชำระเงิน
function searchCustomerForPayment() {
    const searchValue = document.getElementById('payment-customer-search').value.trim()
    const customerInfo = document.getElementById('payment-customer-info')
    const paymentAmountInput = document.getElementById('payment-amount')
    
    if (!searchValue) {
        customerInfo.innerHTML = 'ใส่ชื่อลูกค้าเพื่อดูยอดค้างชำระ'
        customerInfo.style.color = '#666'
        selectedPaymentCustomer = null
        paymentAmountInput.value = ''
        return
    }
    
    // ค้นหาลูกค้าที่มียอดค้างชำระ
    const foundCustomer = allCustomers.find(customer => {
        const hasDebt = (customer.credit_balance || 0) > 0
        const matchName = customer.name.toLowerCase().includes(searchValue.toLowerCase())
        const matchPhone = customer.phone.includes(searchValue)
        
        return hasDebt && (matchName || matchPhone)
    })
    
    if (foundCustomer) {
        selectedPaymentCustomer = foundCustomer
        customerInfo.innerHTML = `
            <div>
                <div style="font-weight: bold; color: #28a745; margin-bottom: 8px;">✅ พบลูกค้า</div>
                <div><strong>ชื่อ:</strong> ${foundCustomer.name}</div>
                <div><strong>เบอร์:</strong> ${foundCustomer.phone}</div>
                <div style="margin-top: 8px;"><strong>ยอดค้างชำระ:</strong> 
                    <span style="color: #dc3545; font-weight: bold; font-size: 16px;">฿${foundCustomer.credit_balance.toLocaleString()}</span>
                </div>
            </div>
        `
        customerInfo.style.color = '#333'
        
        // ตั้งค่าจำนวนเงินเป็นยอดเต็ม
        paymentAmountInput.value = foundCustomer.credit_balance
        paymentAmountInput.max = foundCustomer.credit_balance
        
    } else {
        selectedPaymentCustomer = null
        customerInfo.innerHTML = `❌ ไม่พบลูกค้า "${searchValue}" ที่มียอดค้างชำระ`
        customerInfo.style.color = '#dc3545'
        paymentAmountInput.value = ''
    }
}

// 6. ฟังก์ชันดำเนินการชำระเงินจาก popup
async function processPaymentFromPopup() {
    if (!selectedPaymentCustomer) {
        alert('❌ กรุณาเลือกลูกค้าก่อน')
        return
    }
    
    const paymentAmount = parseFloat(document.getElementById('payment-amount').value)
    const notes = document.getElementById('payment-notes').value.trim()
    
    if (!paymentAmount || paymentAmount <= 0) {
        alert('❌ กรุณากรอกจำนวนเงินที่ถูกต้อง')
        return
    }
    
    if (paymentAmount > selectedPaymentCustomer.credit_balance) {
        alert('❌ จำนวนเงินเกินยอดค้างชำระ')
        return
    }
    
    const confirmMessage = `ยืนยันรับชำระเงิน?

🏷️ ลูกค้า: ${selectedPaymentCustomer.name}
💰 จำนวน: ฿${paymentAmount.toLocaleString()}
📋 หมายเหตุ: ${notes || 'ไม่มี'}

💳 ยอดคงเหลือหลังชำระ: ฿${(selectedPaymentCustomer.credit_balance - paymentAmount).toLocaleString()}`
    
    if (!confirm(confirmMessage)) {
        return
    }
    
    try {
        console.log(`💰 Processing payment: ${paymentAmount} for ${selectedPaymentCustomer.name}`)
        
        // แสดง loading
        document.getElementById('confirm-payment-btn').innerHTML = '⏳ กำลังดำเนินการ...'
        document.getElementById('confirm-payment-btn').disabled = true
        
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/customers/${selectedPaymentCustomer._id}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: paymentAmount,
                payment_method: 'cash',
                notes: notes || 'ชำระเงินค้างชำระ'
            })
        })
        
        const result = await response.json()
        
        if (result.success) {
            // แสดงข้อความสำเร็จ
            const successMessage = `✅ รับชำระเงินสำเร็จ!

🏷️ ลูกค้า: ${selectedPaymentCustomer.name}
💰 จำนวนที่รับ: ฿${paymentAmount.toLocaleString()}
💳 ยอดคงเหลือ: ฿${result.data.remaining_balance.toLocaleString()}

${result.data.remaining_balance === 0 ? '🎉 ลูกค้าชำระเงินครบแล้ว!' : ''}`
            
            alert(successMessage)
            
            // ปิด popup
            closePaymentPopup()
            
            // รีโหลดข้อมูลลูกค้า
            loadCustomers()
            
        } else {
            alert('❌ เกิดข้อผิดพลาด: ' + result.message)
        }
        
    } catch (error) {
        console.error('❌ Payment error:', error)
        alert('❌ เกิดข้อผิดพลาดในการชำระเงิน')
    } finally {
        // คืนสถานะปุ่ม
        document.getElementById('confirm-payment-btn').innerHTML = '✅ ยืนยันรับชำระ'
        document.getElementById('confirm-payment-btn').disabled = false
    }
}




// =========================================
// Auth Functions
// =========================================

// ตรวจสอบการ login
function checkAuth() {
    const token = localStorage.getItem('token')
    if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อน')
        window.location.href = '/login.html'
        return false
    }
    return true
}

// แสดงชื่อผู้ใช้ในปุ่ม profile
function updateProfileButton() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const profileBtn = document.getElementById('profile-btn')
    
    if (profileBtn && user.username) {
        profileBtn.textContent = `👤 ${user.username}`
    }
}

// =========================================
// แก้ไขฟังก์ชัน loadCustomers ให้แสดงสถิติ
// =========================================

async function loadCustomers() {
    try {
        console.log('🔄 Loading customers from API...')
        
        const token = localStorage.getItem('token')
        const response = await fetch('/api/customers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('📥 Customers loaded:', result)
        
        if (result.success && result.data) {
            allCustomers = result.data
            
            // แสดงสถิติ
            displayCustomerStats()
            
            // แสดงลูกค้าตามการกรองปัจจุบัน
            if (currentFilter === 'cash') {
                showCashCustomers()
            } else if (currentFilter === 'pending') {
                showPendingCustomers()
            } else {
                displayCustomers(result.data)
            }
        } else {
            displayNoCustomers()
        }
        
    } catch (error) {
        console.error('❌ Error loading customers:', error)
        displayNoCustomers()
    }
}
// =========================================
// Filter Functions
// =========================================

// ตัวแปรเก็บสถานะการกรอง
let currentFilter = 'all'

// แสดงลูกค้าทั้งหมด
function showAllCustomers() {
    currentFilter = 'all'
    displayCustomers(allCustomers)
    updateFilterButtons()
    console.log('📋 Showing all customers')
}

// แสดงเฉพาะลูกค้าจ่ายเงินสด
function showCashCustomers() {
    currentFilter = 'cash'
    const cashCustomers = allCustomers.filter(customer => {
        const creditBalance = customer.credit_balance || 0
        return creditBalance === 0
    })
    displayCustomers(cashCustomers)
    updateFilterButtons()
    console.log(`💰 Showing ${cashCustomers.length} cash customers`)
}

// แสดงเฉพาะลูกค้าค้างชำระ
function showPendingCustomers() {
    currentFilter = 'pending'
    const pendingCustomers = allCustomers.filter(customer => {
        const creditBalance = customer.credit_balance || 0
        return creditBalance > 0
    })
    displayCustomers(pendingCustomers)
    updateFilterButtons()
    console.log(`⏰ Showing ${pendingCustomers.length} pending customers`)
}

// อัพเดทสถานะปุ่มกรอง
function updateFilterButtons() {
    // ลบ active class จากปุ่มทั้งหมด
    document.querySelectorAll('.sidebar .user').forEach(btn => {
        btn.classList.remove('active')
    })
    
    // เพิ่ม active class ให้ปุ่มที่เลือก
    if (currentFilter === 'all') {
        // ไม่มีปุ่ม "ทั้งหมด" ใน HTML ตอนนี้
    } else if (currentFilter === 'cash') {
        document.getElementById('cash-customers-btn')?.classList.add('active')
    } else if (currentFilter === 'pending') {
        document.getElementById('pending-customers-btn')?.classList.add('active')
    }
}

// แสดงสถิติลูกค้า
function displayCustomerStats() {
    const totalCustomers = allCustomers.length
    const cashCustomers = allCustomers.filter(c => (c.credit_balance || 0) === 0).length
    const pendingCustomers = allCustomers.filter(c => (c.credit_balance || 0) > 0).length
    const totalDebt = allCustomers.reduce((sum, c) => sum + (c.credit_balance || 0), 0)
    
    console.log(`📊 Customer Stats:
    - Total: ${totalCustomers}
    - Cash: ${cashCustomers}
    - Pending: ${pendingCustomers}
    - Total Debt: ฿${totalDebt.toLocaleString()}`)
}

// =========================================
// แก้ไขฟังก์ชัน displayCustomers ให้แสดงข้อความเมื่อไม่มีข้อมูล
// =========================================

function displayCustomers(customers) {
    const customerList = document.getElementById('customer-list')
    
    if (!customerList) {
        console.error('❌ Customer list container not found')
        return
    }
    
    if (!customers || customers.length === 0) {
        // แสดงข้อความแตกต่างตามการกรอง
        let message = ''
        if (currentFilter === 'cash') {
            message = `
                <h3>💰 ไม่มีลูกค้าจ่ายเงินสด</h3>
                <p>ลูกค้าทั้งหมดมียอดค้างชำระ</p>
            `
        } else if (currentFilter === 'pending') {
            message = `
                <h3>⏰ ไม่มีลูกค้าค้างชำระ</h3>
                <p>ลูกค้าทั้งหมดชำระเงินครบแล้ว</p>
            `
        } else {
            message = `
                <h3>👥 ยังไม่มีข้อมูลลูกค้า</h3>
                <p>ลูกค้าจะถูกสร้างอัตโนมัติเมื่อมีการขาย</p>
            `
        }
        
        customerList.innerHTML = `
            <div class="no-customers">
                ${message}
                <button onclick="loadCustomers()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 รีเฟรช
                </button>
            </div>
        `
        return
    }
    
    // สร้าง HTML สำหรับแต่ละลูกค้า
    const customersHTML = customers.map(customer => {
        const creditAmount = customer.credit_balance || 0
        const creditClass = creditAmount > 0 ? 'has-credit' : 'no-credit'
        
        return `
            <div class="customer-card ${creditClass}" onclick="showCustomerDetails('${customer._id}')" data-id="${customer._id}">
                <div class="customer-info">
                    <h3 class="customer-name">${customer.name}</h3>
                    <p class="customer-phone">เบอร์โทรศัพท์ ${customer.phone}</p>
                    <p class="customer-address">ที่อยู่ ${customer.address || 'ไม่ระบุที่อยู่'}</p>
                    <div class="customer-credit">
                        <span class="credit-label">ค้างชำระ:</span>
                        <span class="credit-amount ${creditAmount > 0 ? 'has-debt' : 'no-debt'}">
                            ฿${creditAmount.toLocaleString()}
                        </span>
                    </div>
                </div>
                <div class="customer-status">
                    ${creditAmount > 0 ? 
                        '<span class="status-badge credit">สถานะ : ค้างชำระ</span>' : 
                        '<span class="status-badge cash">สถานะ : เงินสด</span>'
                    }
                </div>
            </div>
        `
    }).join('')
    
    customerList.innerHTML = customersHTML
    
    console.log(`✅ Displayed ${customers.length} customers`)
}

// แสดงเมื่อไม่มีลูกค้า
function displayNoCustomers() {
    const customerList = document.getElementById('customer-list')
    if (customerList) {
        customerList.innerHTML = `
            <div class="no-customers">
                <h3>👥 ยังไม่มีข้อมูลลูกค้า</h3>
                <p>ลูกค้าจะถูกสร้างอัตโนมัติเมื่อมีการขาย</p>
                <button onclick="loadCustomers()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 รีเฟรช
                </button>
            </div>
        `
    }
}

// แสดงรายละเอียดลูกค้าใน popup (แก้ไขส่วนนี้)
function showCustomerDetails(customerId) {
    const customer = allCustomers.find(c => c._id === customerId)
    
    if (!customer) {
        alert('❌ ไม่พบข้อมูลลูกค้า')
        return
    }
    
    console.log(`👁️ Showing details for: ${customer.name}`)
    
    const popup = document.getElementById('popup')
    const popupInfo = document.getElementById('popup-info')
    
    if (!popup || !popupInfo) {
        console.error('❌ Popup elements not found')
        return
    }
    
    const creditAmount = customer.credit_balance || 0
    const totalPurchases = customer.total_purchases || 0
    const totalAmount = customer.total_amount || 0
    
    popupInfo.innerHTML = `
        <div class="customer-details">
            <h2> ข้อมูลลูกค้า</h2>
            
            <div class="detail-section">
                <h3>ข้อมูลพื้นฐาน</h3>
                <p><strong>ชื่อ:</strong> ${customer.name}</p>
                <p><strong>เบอร์โทร:</strong> ${customer.phone}</p>
                <p><strong>ที่อยู่:</strong> ${customer.address || 'ไม่ระบุ'}</p>
            </div>
            
            <div class="detail-section">
                <h3>ข้อมูลทางการเงิน</h3>
                <p><strong>ยอดค้างชำระ:</strong> 
                    <span class="${creditAmount > 0 ? 'debt-amount' : 'no-debt-amount'}">
                        ฿${creditAmount.toLocaleString()}
                    </span>
                </p>
                <p><strong>จำนวนการซื้อ:</strong> ${totalPurchases.toLocaleString()} ครั้ง</p>
                <p><strong>ยอดซื้อรวม:</strong> ฿${totalAmount.toLocaleString()}</p>
            </div>
            
            <div class="detail-actions">
                <button onclick="showOrderHistory('${customer._id}')" class="btn-history">
                     ประวัติการซื้อ
                </button>
                <button onclick="showPaymentHistory('${customer._id}')" class="btn-payments">
                     ประวัติการชำระ
                </button>
            </div>
        </div>
    `
    
    popup.classList.remove('hidden')
}

// ปิด popup
function closePopup() {
    const popup = document.getElementById('popup')
    if (popup) {
        popup.classList.add('hidden')
    }
}



// ดูประวัติการชำระเงิน
function showPaymentHistory(customerId) {
    console.log(`💳 Loading payment history for customer: ${customerId}`)
    alert('🚧 ฟีเจอร์ประวัติการชำระเงิน (กำลังพัฒนา)')
    // TODO: เรียก API ดูประวัติการชำระเงิน
}





// =========================================
// Event Listeners สำหรับ Navigation
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Customer page loaded')

    // ตรวจสอบการ login
    checkAuth()
    
    // แสดงชื่อผู้ใช้
    updateProfileButton()

    // โหลดข้อมูลลูกค้า
    loadCustomers()
    
    // Navigation buttons
    document.getElementById('home-btn')?.addEventListener('click', goHome)
    document.getElementById('dashboard-btn')?.addEventListener('click', goToDashboard)
    document.getElementById('customers-btn')?.addEventListener('click', goToCustomers)
    document.getElementById('products-btn')?.addEventListener('click', goToProducts)
    document.getElementById('profile-btn')?.addEventListener('click', goToAdmin)
    
    // Filter buttons
    document.getElementById('cash-customers-btn')?.addEventListener('click', showCashCustomers)
    document.getElementById('pending-customers-btn')?.addEventListener('click', showPendingCustomers)

       // ⭐ Payment button - แก้ไขให้เรียก popup
    document.getElementById('payment-btn')?.addEventListener('click', function() {
        console.log('💳 Payment button clicked')
        makePayment() // จะเรียก showPaymentPopup()
    })
    
    console.log('✅ Navigation initialized')
})