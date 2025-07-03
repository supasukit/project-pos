// ตัวแปรเก็บข้อมูลสินค้า
let allProducts = []
let allCategories = []

// =========================================
// Navigation Functions
// =========================================

// ไปหน้า Dashboard
function goToDashboard() {
    window.location.href = '/pages/admin/dashboard.html'
}

// ไปหน้าขายสินค้า (POS) - หน้าปัจจุบัน
function goToPOS() {
    window.location.href = '/pages/pos/index.html'
}

// ไปหน้าจัดการลูกค้า
function goToCustomers() {
    window.location.href = '/pages/customer/customers.html'
}

// ไปหน้าจัดการสินค้า
function goToProducts() {
    window.location.href = '/pages/product/products.html'
}

// ไปหน้า Admin
function goToAdmin() {
    window.location.href = '/pages/admin/admin.html'
}

// =========================================
// Button Event Listeners
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    // ปุ่ม Dashboard
    const dashboardBtn = document.getElementById('dashboard-btn')
    if (dashboardBtn) {
        dashboardBtn.onclick = goToDashboard  // ไป dashboard.html
    }
    
    // ปุ่มลูกค้า
    const customersBtn = document.getElementById('customers-btn')
    if (customersBtn) {
        customersBtn.onclick = goToCustomers  // ไป customers.html
    }
    
    // ปุ่มสินค้า
    const productsBtn = document.getElementById('products-btn')
    if (productsBtn) {
        productsBtn.onclick = goToProducts  // ไป products.html
    }
    
    // ปุ่มโปรไฟล์/Admin
    const profileBtn = document.getElementById('profile-btn')
    if (profileBtn) {
        profileBtn.onclick = goToAdmin  // ไป admin.html
    }
})
// =========================================
// Auth Functions (สำหรับหน้า POS)
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

// แสดงข้อมูล user
function displayUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    
    
}

// ออกจากระบบ
function logout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login.html'
    }
}
function updateAllProfileButtons() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const profileBtn = document.getElementById('profile-btn')
    
    if (profileBtn && user.username) {
        profileBtn.textContent = `👤 ${user.username}`
    }
}

// =========================================
// POS Products Functions - เพิ่มส่วนนี้
// =========================================



// โหลดสินค้าจาก API
async function loadPOSProducts() {
    try {
        console.log('🔄 Loading products for POS...')
        
        // เพิ่มส่วนนี้ - ดึง user ID
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const userId = user._id || user.id
        
        if (!userId) {
            throw new Error('ไม่พบข้อมูล user ID')
        }
        
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/products?userId=${userId}`, {  // ← เพิ่ม userId parameter
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
        console.log('📥 Products loaded for POS:', result)
        
        if (result.success && result.data) {
            allProducts = result.data
            displayPOSProducts(result.data)
            loadPOSCategories()
        } else {
            displayNoProducts()
        }
        
    } catch (error) {
        console.error('❌ Error loading POS products:', error)
        displayNoProducts()
    }
}
// แสดงสินค้าใน POS
// แก้ไขฟังก์ชัน displayPOSProducts เพื่อให้ราคาถูกต้องตั้งแต่โหลดหน้า
function displayPOSProducts(products) {
    const productArea = document.getElementById('product-scroll-area')
    
    if (!productArea) {
        console.error('❌ Product scroll area not found')
        return
    }
    
    if (!products || products.length === 0) {
        displayNoProducts()
        return
    }
    
    // จัดกลุ่มสินค้าตามหมวดหมู่
    const groupedProducts = groupProductsByCategory(products)
    
    let html = ''
    
    // แสดงแต่ละหมวดหมู่
    for (const [category, categoryProducts] of Object.entries(groupedProducts)) {
        html += `
            <div class="category-section">
                <h4 class="category-title">🏷️ ${category}</h4>
                <div class="product-grid">
                    ${categoryProducts.map(product => createProductCard(product)).join('')}
                </div>
            </div>
        `
    }
    
    productArea.innerHTML = html
    
    // อัพเดทราคาตามโหมดปัจจุบัน (กรณีเปลี่ยนโหมดก่อนโหลดสินค้า)
    updateProductCardPrices()
    
    console.log(`✅ Displayed ${products.length} products in POS`)
}

// จัดกลุ่มสินค้าตามหมวดหมู่
function groupProductsByCategory(products) {
    const grouped = {}
    
    products.forEach(product => {
        const category = product.category || 'อื่นๆ'
        if (!grouped[category]) {
            grouped[category] = []
        }
        grouped[category].push(product)
    })
    
    return grouped
}



// แสดงเมื่อไม่มีสินค้า
function displayNoProducts() {
    const productArea = document.getElementById('product-scroll-area')
    if (productArea) {
        productArea.innerHTML = `
            <div class="no-products">
                <h3>📦 ยังไม่มีสินค้า</h3>
                <p>กรุณาเพิ่มสินค้าในระบบก่อนใช้งาน POS</p>
                <button onclick="goToProducts()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ไปเพิ่มสินค้า
                </button>
            </div>
        `
    }
}

// เพิ่มสินค้าลงรถเข็น (ยังไม่ทำฟังก์ชันนี้ เอาไว้ทำทีหลัง)
function addToCart(productId) {
    console.log('🛒 Adding to cart:', productId)
    alert('🚧 ฟีเจอร์เพิ่มลงรถเข็น (กำลังพัฒนา)')
}

// โหลดหมวดหมู่สำหรับ POS
async function loadPOSCategories() {
    try {
        // เพิ่มส่วนนี้ - ดึง user ID
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const userId = user._id || user.id
        
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/products/categories?userId=${userId}`, {  // ← เพิ่ม userId parameter
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        
        const result = await response.json()
        if (result.success && result.data) {
            allCategories = result.data
        }
    } catch (error) {
        console.error('❌ Error loading categories for POS:', error)
    }
}

// =========================================
// Payment Mode Functions
// =========================================

// ตัวแปรเก็บโหมดการชำระเงิน
let currentPaymentMode = 'เงินสด'

// เปลี่ยนโหมดการชำระเงิน
function switchPaymentMode(mode) {
    currentPaymentMode = mode
    
    // อัพเดท UI ปุ่ม
    document.querySelectorAll('.select-payment').forEach(btn => {
        btn.classList.remove('active')
    })
    
    // เพิ่ม active class ให้ปุ่มที่เลือก
    const activeBtn = document.querySelector(`[data-type="${mode}"]`)
    if (activeBtn) {
        activeBtn.classList.add('active')
    }
    
    // อัพเดทราคาในรถเข็น
    updateCartPrices()
    
    console.log(`💰 Payment mode changed to: ${mode}`)
}

// แก้ไขฟังก์ชัน updateCartPrices (เมื่อเปลี่ยนโหมดการชำระเงิน)
function updateCartPrices() {
    const cartRows = document.querySelectorAll('#cart-items tr')
    
    cartRows.forEach(row => {
        const productId = row.getAttribute('data-product-id')
        const product = allProducts.find(p => p._id === productId)
        
        if (product) {
            const quantityInput = row.querySelector('.quantity-input')
            const priceCell = row.querySelector('.item-price')
            const totalCell = row.querySelector('.item-total')
            
            const quantity = parseInt(quantityInput.value)
            
            // คำนวณราคาใหม่ตามโหมดและจำนวน
            const unitPrice = calculateProductPrice(product, quantity)
            const totalPrice = unitPrice * quantity
            
            priceCell.textContent = `฿${unitPrice.toLocaleString()}`
            totalCell.textContent = `฿${totalPrice.toLocaleString()}`
        }
    })
    
    updateTotalPrice()
}

// =========================================
// Cart Functions (อัพเดทจากเดิม)
// =========================================

// ฟังก์ชันคำนวณราคาตามจำนวน
function calculateProductPrice(product, quantity) {
    // ถ้าโหมดค้างชำระ ใช้ราคาเครดิตเสมอ
    if (currentPaymentMode === 'ค้างชำระ') {
        return product.credit_price
    }
    
    // ถ้าโหมดเงินสด ตรวจสอบจำนวนขั้นต่ำราคาส่ง
    if (quantity >= product.wholesale_minimum) {
        return product.wholesale_price  // ใช้ราคาส่ง
    } else {
        return product.price  // ใช้ราคาปลีก
    }
}


// แก้ไขฟังก์ชัน addToCart ให้คำนวณราคาตามจำนวน
function addToCart(productId) {
    const product = allProducts.find(p => p._id === productId)
    
    if (!product) {
        alert('❌ ไม่พบข้อมูลสินค้า')
        return
    }
    
    if (product.stock <= 0) {
        alert('❌ สินค้าหมด')
        return
    }
    
    // ตรวจสอบว่ามีในรถเข็นแล้วหรือไม่
    const existingRow = document.querySelector(`tr[data-product-id="${productId}"]`)
    
    if (existingRow) {
        // เพิ่มจำนวน
        const quantityInput = existingRow.querySelector('.quantity-input')
        const currentQty = parseInt(quantityInput.value)
        const newQty = currentQty + 1
        
        if (newQty > product.stock) {
            alert(`❌ สินค้าเหลือเพียง ${product.stock} ชิ้น`)
            return
        }
        
        quantityInput.value = newQty
        
        // อัพเดทราคาตามจำนวนใหม่
        updateCartItemPriceAndTotal(existingRow, product, newQty)
    } else {
        // เพิ่มรายการใหม่ (จำนวน 1)
        addNewCartItem(product, 1)
    }
    
    updateTotalPrice()
    console.log(`✅ Added ${product.name} to cart (${currentPaymentMode})`)
}

// แก้ไขฟังก์ชัน addNewCartItem
function addNewCartItem(product, quantity = 1) {
    const cartItems = document.getElementById('cart-items')
    
    const row = document.createElement('tr')
    row.setAttribute('data-product-id', product._id)
    
    // คำนวณราคาตามจำนวน
    const unitPrice = calculateProductPrice(product, quantity)
    const totalPrice = unitPrice * quantity
    
    row.innerHTML = `
        <td class="item-name">${product.name}</td>
        <td class="item-quantity">
            <div style="display: flex; align-items: center; gap: 5px;">
                <button onclick="changeQuantity('${product._id}', -1)" style="background: #dc3545; color: white; border: none; border-radius: 3px; width: 25px; height: 25px; cursor: pointer;">-</button>
                <input type="number" class="quantity-input" value="${quantity}" min="1" max="${product.stock}" 
                       onchange="updateCartItemTotal(this.closest('tr'))" style="width: 50px; text-align: center;" />
                <button onclick="changeQuantity('${product._id}', 1)" style="background: #28a745; color: white; border: none; border-radius: 3px; width: 25px; height: 25px; cursor: pointer;">+</button>
            </div>
        </td>
        <td class="item-price">฿${unitPrice.toLocaleString()}</td>
        <td class="item-total">฿${totalPrice.toLocaleString()}</td>
        <td class="item-actions">
            <button onclick="removeFromCart(this.closest('tr'))" class="remove-btn">🗑️</button>
        </td>
    `
    
    cartItems.appendChild(row)
}

// =========================================
// Payment Processing Functions
// =========================================

// จ่ายเงิน
function processPayment() {
    const cartItems = document.querySelectorAll('#cart-items tr')
    
    if (cartItems.length === 0) {
        alert('❌ ไม่มีสินค้าในตะกร้า')
        return
    }
    
    const totalAmount = parseFloat(document.getElementById('total-price').textContent.replace(',', ''))
    
    if (totalAmount <= 0) {
        alert('❌ ยอดเงินไม่ถูกต้อง')
        return
    }
    
    // แยกการทำงานตามโหมดการชำระเงิน
    if (currentPaymentMode === 'เงินสด') {
        processCashPayment(totalAmount)
    } else if (currentPaymentMode === 'ค้างชำระ') {
        processCreditPayment(totalAmount)
    }
}

// จ่ายเงินสด
function processCashPayment(totalAmount) {
    // แสดง popup กรอกข้อมูลลูกค้า
    const popup = document.getElementById('cash-popup')
    if (popup) {
        popup.style.display = 'flex'
        
        // เคลียร์ข้อมูลเก่า
        document.getElementById('cash-customer-name').value = ''
        document.getElementById('cash-customer-phone').value = ''
        
        // Focus ที่ช่องแรก
        document.getElementById('cash-customer-name').focus()
    } else {
        console.error('❌ Cash popup not found')
    }
}

// จ่ายค้างชำระ
function processCreditPayment(totalAmount) {
    // แสดง popup ค้นหาลูกค้า
    const popup = document.getElementById('credit-popup')
    if (popup) {
        popup.style.display = 'flex'
        
        // เคลียร์ข้อมูลเก่า
        document.getElementById('credit-customer-name').value = ''
        
        // Focus ที่ช่องค้นหา
        document.getElementById('credit-customer-name').focus()
    } else {
        console.error('❌ Credit popup not found')
    }
}

// =========================================
// Popup Functions
// =========================================

// ปิด popup เงินสด
function closeCashPopup() {
    const popup = document.getElementById('cash-popup')
    if (popup) {
        popup.style.display = 'none'
    }
}

// ปิด popup ค้างชำระ
function closeCreditPopup() {
    const popup = document.getElementById('credit-popup')
    if (popup) {
        popup.style.display = 'none'
    }
}

// ปิด popup เพิ่มลูกค้าใหม่
function closeCreditNewCustomerPopup() {
    const popup = document.getElementById('credit-new-customer-popup')
    if (popup) {
        popup.style.display = 'none'
    }
}

// ยืนยันการชำระเงินสด
function submitCashCustomer() {
    const customerName = document.getElementById('cash-customer-name').value.trim()
    const customerPhone = document.getElementById('cash-customer-phone').value.trim()
    
    if (!customerName) {
        alert('❌ กรุณากรอกชื่อลูกค้า')
        return
    }
    
    // ปิด popup
    closeCashPopup()
    
    // สร้างใบเสร็จ
    generateReceipt({
        customerName,
        customerPhone,
        paymentType: 'เงินสด'
    })
}

// ตรวจสอบลูกค้าค้างชำระ
async function submitCreditCustomer() {
    const customerName = document.getElementById('credit-customer-name').value.trim()
    
    if (!customerName) {
        alert('❌ กรุณากรอกชื่อลูกค้า')
        return
    }
    
    try {
        // ค้นหาลูกค้าในฐานข้อมูลจริง
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/customers/search/${encodeURIComponent(customerName)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
            // พบลูกค้า - แสดงรายการให้เลือก
            showCustomerSelection(result.data)
        } else {
            // ไม่พบลูกค้า - ให้เพิ่มใหม่
            alert(`🔍 ไม่พบลูกค้า "${customerName}" ในระบบ\nกรุณาเพิ่มข้อมูลลูกค้าใหม่`)
            
            // ปิด popup เก่า
            closeCreditPopup()
            
            // เปิด popup เพิ่มลูกค้าใหม่
            const newCustomerPopup = document.getElementById('credit-new-customer-popup')
            if (newCustomerPopup) {
                newCustomerPopup.style.display = 'flex'
                
                // ใส่ชื่อที่ค้นหาไว้
                document.getElementById('credit-new-customer-name').value = customerName
                
                // Focus ที่เบอร์โทร
                document.getElementById('credit-new-customer-phone').focus()
            }
        }
        
    } catch (error) {
        console.error('❌ Error searching customer:', error)
        alert('❌ เกิดข้อผิดพลาดในการค้นหาลูกค้า')
    }
}

// แก้ไขฟังก์ชันแสดงรายการลูกค้าไม่ใช้ prompt()
function showCustomerSelection(customers) {
    // ปิด popup เก่า
    closeCreditPopup()
    
    // สร้าง popup แสดงรายการลูกค้า
    const popup = document.createElement('div')
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
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; max-height: 70vh; overflow-y: auto;">
            <h3>🔍 พบลูกค้าที่ตรงกัน</h3>
            <div id="customer-list">
                ${customers.map((customer, index) => `
                    <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 4px; cursor: pointer; hover:background-color: #f5f5f5;" 
                         onclick="selectExistingCustomer('${customer._id}', '${customer.name}', '${customer.phone}', '${customer.address || ''}')">
                        <strong>${customer.name}</strong> (${customer.phone})<br>
                        <small>ยอดค้างชำระ: ฿${customer.credit_balance.toLocaleString()}</small>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="addNewCustomerFromSearch('${document.getElementById('credit-customer-name').value}')" 
                        style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                    ➕ เพิ่มลูกค้าใหม่
                </button>
                <button onclick="closeCustomerSelection()" 
                        style="background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">
                    ❌ ยกเลิก
                </button>
            </div>
        </div>
    `
    
    popup.id = 'customer-selection-popup'
    document.body.appendChild(popup)
}

// เลือกลูกค้าที่มีอยู่
function selectExistingCustomer(customerId, customerName, customerPhone, customerAddress) {
    closeCustomerSelection()
    
    // ดำเนินการขายเครดิตกับลูกค้าที่เลือก
    processCheckout({
        name: customerName,
        phone: customerPhone,
        address: customerAddress
    }, 'credit')
}

// เพิ่มลูกค้าใหม่จากการค้นหา
function addNewCustomerFromSearch(customerName) {
    closeCustomerSelection()
    
    const newCustomerPopup = document.getElementById('credit-new-customer-popup')
    if (newCustomerPopup) {
        newCustomerPopup.style.display = 'flex'
        document.getElementById('credit-new-customer-name').value = customerName
        document.getElementById('credit-new-customer-phone').focus()
    }
}

// ปิด popup เลือกลูกค้า
function closeCustomerSelection() {
    const popup = document.getElementById('customer-selection-popup')
    if (popup) {
        popup.remove()
    }
}

// เลือกลูกค้าที่มีอยู่
function selectExistingCustomer(customerId, customerName, customerPhone, customerAddress) {
    closeCustomerSelection()
    
    // ดำเนินการขายเครดิตกับลูกค้าที่เลือก
    processCheckout({
        name: customerName,
        phone: customerPhone,
        address: customerAddress
    }, 'credit')
}

// เพิ่มลูกค้าใหม่จากการค้นหา
function addNewCustomerFromSearch(customerName) {
    closeCustomerSelection()
    
    const newCustomerPopup = document.getElementById('credit-new-customer-popup')
    if (newCustomerPopup) {
        newCustomerPopup.style.display = 'flex'
        document.getElementById('credit-new-customer-name').value = customerName
        document.getElementById('credit-new-customer-phone').focus()
    }
}

// ปิด popup เลือกลูกค้า
function closeCustomerSelection() {
    const popup = document.getElementById('customer-selection-popup')
    if (popup) {
        popup.remove()
    }
}
// บันทึกลูกค้าใหม่และยืนยันการขาย
function submitCreditNewCustomer() {
    const customerName = document.getElementById('credit-new-customer-name').value.trim()
    const customerPhone = document.getElementById('credit-new-customer-phone').value.trim()
    const customerAddress = document.getElementById('credit-new-customer-address').value.trim()
    
    if (!customerName || !customerPhone) {
        alert('❌ กรุณากรอกชื่อและเบอร์โทรศัพท์')
        return
    }
    
    // TODO: บันทึกลูกค้าใหม่ลงฐานข้อมูล
    console.log('💾 Saving new customer:', { customerName, customerPhone, customerAddress })
    
    // ปิด popup
    closeCreditNewCustomerPopup()
    
    // สร้างใบเสร็จ
    generateReceipt({
        customerName,
        customerPhone,
        customerAddress,
        paymentType: 'ค้างชำระ'
    })
}

// =========================================
// Receipt Functions
// =========================================

// สร้างใบเสร็จ
function generateReceipt(customerData) {
    const cartItems = document.querySelectorAll('#cart-items tr')
    const totalAmount = document.getElementById('total-price').textContent
    
    let receiptHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h4>ใบเสร็จรับเงิน</h4>
            <p>วันที่: ${new Date().toLocaleDateString('th-TH')}</p>
            <p>เวลา: ${new Date().toLocaleTimeString('th-TH')}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>ข้อมูลลูกค้า:</strong><br>
            ชื่อ: ${customerData.customerName}<br>
            ${customerData.customerPhone ? `เบอร์: ${customerData.customerPhone}<br>` : ''}
            ${customerData.customerAddress ? `ที่อยู่: ${customerData.customerAddress}<br>` : ''}
            ประเภท: ${customerData.paymentType}
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
                <tr style="background: #f5f5f5;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">สินค้า</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">จำนวน</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">ราคา</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">รวม</th>
                </tr>
            </thead>
            <tbody>
    `
    
    cartItems.forEach(row => {
        const name = row.querySelector('.item-name').textContent
        const quantity = row.querySelector('.quantity-input').value
        const price = row.querySelector('.item-price').textContent
        const total = row.querySelector('.item-total').textContent
        
        receiptHTML += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${total}</td>
            </tr>
        `
    })
    
    receiptHTML += `
            </tbody>
        </table>
        
        <div style="text-align: right; font-size: 18px; font-weight: bold; margin-top: 15px;">
            ยอดรวมทั้งสิ้น: ฿${totalAmount}
        </div>
    `
    
    // แสดงใบเสร็จ
    const receiptContent = document.getElementById('receipt-content')
    const receiptPopup = document.getElementById('receipt')
    
    if (receiptContent && receiptPopup) {
        receiptContent.innerHTML = receiptHTML
        receiptPopup.style.display = 'flex'
        
        // เคลียร์ตะกร้า
        clearCart()
        
        console.log('📄 Receipt generated successfully')
    }
}

// เคลียร์ตะกร้า
function clearCart() {
    const cartItems = document.getElementById('cart-items')
    cartItems.innerHTML = ''
    updateTotalPrice()
}

// ปิดใบเสร็จ
function closeReceipt() {
    const receiptPopup = document.getElementById('receipt')
    if (receiptPopup) {
        receiptPopup.style.display = 'none'
    }
}

// พิมพ์ใบเสร็จ
function printReceipt() {
    const receiptContent = document.getElementById('receipt-content').innerHTML
    const printWindow = window.open('', '_blank')
    
    printWindow.document.write(`
        <html>
            <head>
                <title>ใบเสร็จ</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ddd; padding: 8px; }
                </style>
            </head>
            <body>
                ${receiptContent}
            </body>
        </html>
    `)
    
    printWindow.document.close()
    printWindow.print()
    printWindow.close()

}
// แก้ไขฟังก์ชัน createProductCard ให้รองรับโหมดการชำระเงิน
function createProductCard(product) {
    const imageUrl = product.image_base64 || '/images/no-image.png'
    const stockClass = product.stock <= 0 ? 'out-of-stock' : (product.stock <= 10 ? 'low-stock' : '')
    
    // เลือกราคาตามโหมดการชำระเงิน
    const price = currentPaymentMode === 'ค้างชำระ' ? product.credit_price : product.price
    
    return `
        <div class="product-card ${stockClass}" onclick="addToCart('${product._id}')" ${product.stock <= 0 ? 'disabled' : ''}>
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/no-image.png'">
            <div class="product-info">
                <h5 class="product-name">${product.name}</h5>
                <p class="product-barcode">${product.barcode}</p>
                <p class="product-price">฿${price.toLocaleString()}</p>
                <p class="product-stock ${stockClass}">
                    ${product.stock <= 0 ? 'หมด' : `เหลือ ${product.stock}`}
                </p>
            </div>
        </div>
    `
}

// แก้ไขฟังก์ชัน switchPaymentMode ให้อัพเดทการ์ดสินค้าด้วย
function switchPaymentMode(mode) {
    currentPaymentMode = mode
    
    // อัพเดท UI ปุ่ม
    document.querySelectorAll('.select-payment').forEach(btn => {
        btn.classList.remove('active')
    })
    
    // เพิ่ม active class ให้ปุ่มที่เลือก
    const activeBtn = document.querySelector(`[data-type="${mode}"]`)
    if (activeBtn) {
        activeBtn.classList.add('active')
    }
    
    // อัพเดทราคาในรถเข็น
    updateCartPrices()
    
    // อัพเดทราคาในการ์ดสินค้า
    updateProductCardPrices()
    
    console.log(`💰 Payment mode changed to: ${mode}`)
}

// เพิ่มฟังก์ชันใหม่สำหรับอัพเดทราคาในการ์ดสินค้า
function updateProductCardPrices() {
    const productCards = document.querySelectorAll('.product-card')
    
    productCards.forEach(card => {
        // หา product ID จาก onclick attribute
        const onclickAttr = card.getAttribute('onclick')
        if (onclickAttr) {
            const productId = onclickAttr.match(/addToCart\('([^']+)'\)/)?.[1]
            const product = allProducts.find(p => p._id === productId)
            
            if (product) {
                const priceElement = card.querySelector('.product-price')
                if (priceElement) {
                    const price = currentPaymentMode === 'ค้างชำระ' ? product.credit_price : product.price
                    priceElement.textContent = `฿${price.toLocaleString()}`
                }
            }
        }
    })
    
    console.log(`🏷️ Updated product card prices for ${currentPaymentMode}`)
}


// =========================================
// Cart Management Functions (เพิ่มส่วนที่ขาดหายไป)
// =========================================

// แก้ไขฟังก์ชัน updateCartItemTotal
function updateCartItemTotal(row) {
    const productId = row.getAttribute('data-product-id')
    const product = allProducts.find(p => p._id === productId)
    
    if (!product) return
    
    const quantityInput = row.querySelector('.quantity-input')
    const priceCell = row.querySelector('.item-price')
    const totalCell = row.querySelector('.item-total')
    
    const quantity = parseInt(quantityInput.value)
    
    // ตรวจสอบขอบเขตจำนวน
    if (quantity < 1) {
        quantityInput.value = 1
        return
    }
    
    if (quantity > product.stock) {
        alert(`❌ สินค้าเหลือเพียง ${product.stock} ชิ้น`)
        quantityInput.value = product.stock
        return
    }
    
    // คำนวณราคาใหม่ตามจำนวน
    const unitPrice = calculateProductPrice(product, quantity)
    const totalPrice = unitPrice * quantity
    
    // อัพเดท UI
    priceCell.textContent = `฿${unitPrice.toLocaleString()}`
    totalCell.textContent = `฿${totalPrice.toLocaleString()}`
    
    updateTotalPrice()
}

// ลบรายการออกจากรถเข็น
function removeFromCart(row) {
    row.remove()
    updateTotalPrice()
    console.log('🗑️ Item removed from cart')
}

// ฟังก์ชันใหม่สำหรับอัพเดทราคาและยอดรวมในรถเข็น
function updateCartItemPriceAndTotal(row, product, quantity) {
    const priceCell = row.querySelector('.item-price')
    const totalCell = row.querySelector('.item-total')
    
    // คำนวณราคาใหม่ตามจำนวน
    const unitPrice = calculateProductPrice(product, quantity)
    const totalPrice = unitPrice * quantity
    
    // อัพเดท UI
    priceCell.textContent = `฿${unitPrice.toLocaleString()}`
    totalCell.textContent = `฿${totalPrice.toLocaleString()}`
    
    // แสดงข้อความแจ้งเตือนการเปลี่ยนแปลงราคา
    if (currentPaymentMode === 'เงินสด') {
        const wasWholesale = quantity - 1 >= product.wholesale_minimum
        const isWholesale = quantity >= product.wholesale_minimum
        
        // ถ้าเพิ่งถึงขั้นต่ำราคาส่ง
        if (!wasWholesale && isWholesale) {
            showWholesalePriceNotification(product.name, quantity, product.wholesale_minimum)
        }
        
        // ถ้าเพิ่งลดลงจากราคาส่ง
        if (wasWholesale && !isWholesale) {
            showRetailPriceNotification(product.name, quantity, product.wholesale_minimum)
        }
    }
}



// อัพเดทราคารวมทั้งหมด
function updateTotalPrice() {
    const totalCells = document.querySelectorAll('#cart-items .item-total')
    let total = 0
    
    totalCells.forEach(cell => {
        const amount = parseFloat(cell.textContent.replace('฿', '').replace(',', ''))
        total += amount
    })
    
    document.getElementById('total-price').textContent = total.toLocaleString()
}

//แก้ไขฟังก์ชัน changeQuantity
function changeQuantity(productId, change) {
    const row = document.querySelector(`tr[data-product-id="${productId}"]`)
    if (!row) return
    
    const quantityInput = row.querySelector('.quantity-input')
    const currentQty = parseInt(quantityInput.value)
    const newQty = currentQty + change
    
    const product = allProducts.find(p => p._id === productId)
    if (!product) return
    
    // ตรวจสอบขอบเขต
    if (newQty < 1) {
        if (confirm('ต้องการลบสินค้านี้ออกจากตะกร้าหรือไม่?')) {
            removeFromCart(row)
        }
        return
    }
    
    if (newQty > product.stock) {
        alert(`❌ สินค้าเหลือเพียง ${product.stock} ชิ้น`)
        return
    }
    
    quantityInput.value = newQty
    updateCartItemTotal(row)
}

// แก้ไขฟังก์ชัน submitCashCustomer() และ submitCreditNewCustomer()

// ยืนยันการชำระเงินสด
async function submitCashCustomer() {
    const customerName = document.getElementById('cash-customer-name').value.trim()
    const customerPhone = document.getElementById('cash-customer-phone').value.trim()
    
    if (!customerName || !customerPhone) {
        alert('❌ กรุณากรอกชื่อและเบอร์โทรศัพท์')
        return
    }
    
    // ปิด popup
    closeCashPopup()
    
    // เรียก API ชำระเงิน
    await processCheckout({
        name: customerName,
        phone: customerPhone
    }, 'cash')
}

// บันทึกลูกค้าใหม่และยืนยันการขาย
async function submitCreditNewCustomer() {
    const customerName = document.getElementById('credit-new-customer-name').value.trim()
    const customerPhone = document.getElementById('credit-new-customer-phone').value.trim()
    const customerAddress = document.getElementById('credit-new-customer-address').value.trim()
    
    if (!customerName || !customerPhone) {
        alert('❌ กรุณากรอกชื่อและเบอร์โทรศัพท์')
        return
    }
    
    // ปิด popup
    closeCreditNewCustomerPopup()
    
    // เรียก API ชำระเงิน
    await processCheckout({
        name: customerName,
        phone: customerPhone,
        address: customerAddress
    }, 'credit')
}

// ฟังก์ชันหลักสำหรับชำระเงิน
async function processCheckout(customerData, paymentType) {
    try {
        console.log('💰 Processing checkout...', { customerData, paymentType })
        
        // รวบรวมข้อมูลจากตะกร้า
        const cartItems = []
        const cartRows = document.querySelectorAll('#cart-items tr')
        
        cartRows.forEach(row => {
            const productId = row.getAttribute('data-product-id')
            const product = allProducts.find(p => p._id === productId)
            
            if (product) {
                const quantity = parseInt(row.querySelector('.quantity-input').value)
                const unitPrice = parseFloat(row.querySelector('.item-price').textContent.replace('฿', '').replace(',', ''))
                
                cartItems.push({
                    product_id: product._id,
                    product_name: product.name,
                    product_barcode: product.barcode,
                    quantity: quantity,
                    unit_price: unitPrice
                })
            }
        })
        
        const totalAmount = parseFloat(document.getElementById('total-price').textContent.replace(',', ''))
        
        // เรียก API
        const token = localStorage.getItem('token')
        const response = await fetch('/api/sales/checkout-with-customer-update', { // ← แก้บรรทัดนี้
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                customer_data: customerData,
                payment_type: paymentType,
                cart_items: cartItems,
                total_amount: totalAmount
            })
        })
        
        const result = await response.json()
        console.log('📥 Checkout response:', result)
        
        if (result.success) {
            // สร้างใบเสร็จ
            generateReceipt({
                customerName: customerData.name,
                customerPhone: customerData.phone,
                customerAddress: customerData.address,
                paymentType: paymentType === 'cash' ? 'เงินสด' : 'ค้างชำระ',
                orderNumber: result.data.order_number
            })
            
            alert(`✅ ${paymentType === 'cash' ? 'ชำระเงินสด' : 'บันทึกการขายเครดิต'}สำเร็จ!\nเลขที่: ${result.data.order_number}`)
        } else {
            alert('❌ เกิดข้อผิดพลาด: ' + result.message)
        }
        
    } catch (error) {
        console.error('❌ Checkout error:', error)
        alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message)
    }
}





// เรียกใช้เมื่อหน้าโหลด
document.addEventListener('DOMContentLoaded', function() {
    checkAuth()
    displayUserInfo()
    updateAllProfileButtons() // ← เพิ่มบรรทัดนี้
    // เพิ่มบรรทัดนี้
    loadPOSProducts()


    // เพิ่มส่วนนี้ - Payment Mode Buttons
    document.querySelectorAll('.select-payment').forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.getAttribute('data-type')
            switchPaymentMode(mode)
        })
    })

     // เพิ่มส่วนนี้ - Pay Button
    const payButton = document.querySelector('.pay')
    if (payButton) {
        payButton.addEventListener('click', processPayment)
    }
}) 