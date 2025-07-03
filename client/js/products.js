// เก็บข้อมูลสินค้าไว้ใน global variable
let allProducts = []
// =========================================
// Products Page Functions
// =========================================

// Navigation Functions
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

function goHome() {
    window.location.href = '/pages/pos/index.html'
}


// =========================================
// Role & Permission Functions
// =========================================

// ตรวจสอบสิทธิ์การเพิ่มสินค้า (ทุก role ได้)
function canAddProducts() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.role === 'user' || user.role === 'employee' || user.role === 'admin'
}

// ตรวจสอบสิทธิ์การแก้ไข/ลบสินค้า (เฉพาะ user)
function canEditDeleteProducts() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.role === 'user' // แค่เจ้าของร้านเท่านั้น
}

// ตรวจสอบสิทธิ์การจัดการสต็อก (ทุก role ได้)
function canManageStock() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.role === 'user' || user.role === 'employee' || user.role === 'admin'
}

// ตรวจสอบสิทธิ์และแสดง UI ตามสิทธิ์
function initPermissions() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    
    // เพิ่มสินค้า - ทุก role ได้
    if (!canAddProducts()) {
        const addProductBtn = document.getElementById('add-product-btn')
        if (addProductBtn) {
            addProductBtn.style.display = 'none'
        }
    }
    
    // แสดงข้อความสิทธิ์การใช้งาน
    const sidebar = document.querySelector('.sidebar')
    if (sidebar) {
        const permissionMsg = document.createElement('div')
        permissionMsg.style.cssText = `
            background: #e8f4fd;
            border: 1px solid #bee5eb;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            font-size: 12px;
            color: #0c5460;
            text-align: center;
        `
        
        let permissionText = `<strong>👤 สิทธิ์การใช้งาน</strong><br>Role: ${user.role}<br>`
        
        if (user.role === 'user') {
            permissionText += `<small>✅ เพิ่ม/แก้ไข/ลบสินค้าได้<br>✅ จัดการสต็อกได้</small>`
        } else if (user.role === 'employee') {
            permissionText += `<small>✅ เพิ่มสินค้าได้<br>✅ จัดการสต็อกได้<br>❌ แก้ไข/ลบสินค้าไม่ได้</small>`
        } else {
            permissionText += `<small>❌ จัดการสินค้าไม่ได้</small>`
        }
        
        permissionMsg.innerHTML = permissionText
        sidebar.insertBefore(permissionMsg, sidebar.firstChild.nextSibling)
    }
    
    console.log(`📝 User role: ${user.role}`)
    console.log(`✅ Can add products: ${canAddProducts()}`)
    console.log(`✅ Can edit/delete: ${canEditDeleteProducts()}`)
    console.log(`✅ Can manage stock: ${canManageStock()}`)
}

// แก้ไขสินค้า (เฉพาะ user)
function editProduct(productId) {
    if (!canEditDeleteProducts()) {
        showNoPermissionMessage('แก้ไขสินค้า')
        return
    }
    
    console.log(`✏️ Editing product ID: ${productId}`)
    alert('🚧 ฟีเจอร์แก้ไขสินค้า (กำลังพัฒนา)')
}

// ลบสินค้า (เฉพาะ user)
function deleteProduct(productId, productName = '') {
    if (!canEditDeleteProducts()) {
        showNoPermissionMessage('ลบสินค้า')
        return
    }
    
    const confirmMessage = productName 
        ? `ต้องการลบสินค้า "${productName}" หรือไม่?`
        : `ต้องการลบสินค้ารหัส ${productId} หรือไม่?`
    
    if (!confirm(`🗑️ ${confirmMessage}\n\n⚠️ การลบจะไม่สามารถกู้คืนได้`)) {
        return
    }
    
    console.log(`🗑️ Deleting product ID: ${productId}`)
    alert('🚧 ฟีเจอร์ลบสินค้า (กำลังพัฒนา)')
}

// จัดการสต็อกสินค้า (ทุก role ได้)
function manageStock(productId) {
    if (!canManageStock()) {
        showNoPermissionMessage('จัดการสต็อกสินค้า')
        return
    }
    
    console.log(`📦 Managing stock for product ID: ${productId}`)
    alert('🚧 ฟีเจอร์จัดการสต็อก (กำลังพัฒนา)')
}

// เติมสต็อกสินค้า (ทุก role ได้)
function addStock(productId) {
    if (!canManageStock()) {
        showNoPermissionMessage('เติมสต็อกสินค้า')
        return
    }
    
    const quantity = prompt('📦 กรอกจำนวนที่ต้องการเติม:')
    
    if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
        console.log(`📦 Adding ${quantity} items to product ID: ${productId}`)
        alert(`✅ เติมสต็อก ${quantity} ชิ้น สำเร็จ! (จำลอง)`)
        
        // TODO: เรียก API เติมสต็อก
    } else {
        alert('❌ กรุณากรอกจำนวนที่ถูกต้อง')
    }
}




// =========================================
// Popup Functions
// =========================================

// เปิด popup เพิ่มสินค้า
async function openAddProductPopup() {

    // ตรวจสอบสิทธิ์การเพิ่มสินค้า
    if (!canAddProducts()) {
        showNoPermissionMessage('เพิ่มสินค้า')
        return
    }

    try {
        console.log('🔄 Loading add product form...')
        
        // แสดง loading
        const popup = document.getElementById('add-product-popup')
        const popupContent = document.getElementById('add-product-popup-content')
        
        popupContent.innerHTML = '<div style="text-align: center; padding: 50px;">🔄 กำลังโหลด...</div>'
        popup.classList.remove('hidden')
        
        // โหลดเนื้อหาจาก add-product.html
        const response = await fetch('/pages/product/add-product.html')
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const htmlContent = await response.text()
        
        // ดึงเฉพาะ body content ออกมา
        const parser = new DOMParser()
        const doc = parser.parseFromString(htmlContent, 'text/html')
        const bodyContent = doc.body.innerHTML
        
        // ใส่เนื้อหาใน popup
        popupContent.innerHTML = bodyContent
        
        // โหลด CSS สำหรับ add-product (ถ้าต้องการ)
        if (!document.querySelector('link[href*="add-products.css"]')) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = '../../styles/pages/add-products.css'
            document.head.appendChild(link)
        }
        
        // เรียกใช้ script สำหรับ form handling
        initAddProductForm()
        
        console.log('✅ Add product form loaded successfully')
        
    } catch (error) {
        console.error('❌ Error loading add product form:', error)
        
        const popupContent = document.getElementById('add-product-popup-content')
        popupContent.innerHTML = `
            <div style="text-align: center; padding: 50px; color: red;">
                <h3>❌ เกิดข้อผิดพลาด</h3>
                <p>ไม่สามารถโหลดฟอร์มเพิ่มสินค้าได้</p>
                <button onclick="closeAddProductPopup()" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ปิด
                </button>
            </div>
        `
    }
}

// ปิด popup เพิ่มสินค้า
function closeAddProductPopup() {
    const popup = document.getElementById('add-product-popup')
    popup.classList.add('hidden')
    
    // เคลียร์เนื้อหา popup
    const popupContent = document.getElementById('add-product-popup-content')
    popupContent.innerHTML = ''
    
    console.log('🚫 Add product popup closed')
}

// เริ่มต้น form handling สำหรับเพิ่มสินค้า
function initAddProductForm() {
    const form = document.getElementById('product-form')
    
    if (form) {
        // ลบ event listener เก่า (ถ้ามี)
        form.removeEventListener('submit', handleAddProduct)
        
        // เพิ่ม event listener ใหม่
        form.addEventListener('submit', handleAddProduct)
        
        // จัดการ image preview
        const imageInput = document.getElementById('image')
        if (imageInput) {
            imageInput.addEventListener('change', handleImagePreview)
        }
        
        console.log('📝 Add product form initialized')
    }
}

// จัดการการส่งฟอร์มเพิ่มสินค้า
async function handleAddProduct(event) {
    event.preventDefault()
    
    console.log('📝 Submitting add product form...')
    
    // ดึงข้อมูลจาก form elements โดยตรง
    const productData = {
        name: document.getElementById('name')?.value.trim() || '',
        barcode: document.getElementById('barcode')?.value.trim() || '',
        price: parseFloat(document.getElementById('retail_price')?.value || 0),
        wholesale_price: parseFloat(document.getElementById('wholesale_price')?.value || 0),
        credit_price: parseFloat(document.getElementById('credit_price')?.value || 0),
        wholesale_minimum: parseInt(document.getElementById('wholesale_minimum')?.value || 1),
        stock: parseInt(document.getElementById('stock')?.value || 0),
        category: document.getElementById('category')?.value.trim() || '',
        description: document.getElementById('description')?.value.trim() || ''
    }
    
    // เพิ่ม Base64 image (ถ้ามี)
    const imageBase64 = document.getElementById('image-base64')?.value
    if (imageBase64) {
        productData.image_base64 = imageBase64
    }
    
    // Validation
    if (!productData.name || !productData.barcode || !productData.price || !productData.category) {
        alert('❌ กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
        return
    }
    
    try {
        // แสดง loading บน submit button
        const submitBtn = document.getElementById('submit-btn')
        if (!submitBtn) {
            throw new Error('Submit button not found')
        }
        
        const originalText = submitBtn.textContent
        submitBtn.disabled = true
        submitBtn.textContent = '🔄 กำลังบันทึก...'
        
        // เรียก API เพิ่มสินค้า
        console.log('📤 Sending product data to API:', productData)
        
        const token = localStorage.getItem('token')
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        })
        
        const result = await response.json()
        console.log('📥 API Response:', result)
        
        if (result.success) {
            alert('✅ เพิ่มสินค้าสำเร็จ!')
            
            // รีเซ็ต form
            document.getElementById('product-form').reset()
            clearImagePreview()
            
            // ปิด popup
            closeAddProductPopup()
            
            // โหลดรายการสินค้าใหม่
            loadProducts()
            
        } else {
            alert('❌ เกิดข้อผิดพลาด: ' + result.message)
        }
        
    } catch (error) {
        console.error('❌ Error adding product:', error)
        alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message)
    } finally {
        // คืนสถานะปุ่ม
        const submitBtn = document.getElementById('submit-btn')
        if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.textContent = '✅ เพิ่มสินค้า'
        }
    }
}

// จัดการ image preview
function handleImagePreview(event) {
    const file = event.target.files[0]
    const previewContainer = document.getElementById('image-preview-container')
    const base64Input = document.getElementById('image-base64')
    
    if (file) {
        const reader = new FileReader()
        
        reader.onload = function(e) {
            const base64String = e.target.result
            
            // แสดงตัวอย่างรูป
            previewContainer.innerHTML = `
                <div style="margin-top: 10px;">
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">ตัวอย่างรูปภาพ:</p>
                    <img src="${base64String}" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; border-radius: 4px;">
                    <button type="button" onclick="clearImagePreview()" style="display: block; margin-top: 5px; padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 12px; cursor: pointer;">
                         ลบรูป
                    </button>
                </div>
            `
            
            // เก็บ Base64 string
            if (base64Input) {
                base64Input.value = base64String
            }
        }
        
        reader.readAsDataURL(file)
    }
}

// ลบ image preview
function clearImagePreview() {
    document.getElementById('image-preview-container').innerHTML = ''
    document.getElementById('image').value = ''
    document.getElementById('image-base64').value = ''
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
// Products Loading Function (แก้ปัญหา error)
// =========================================

// โหลดรายการสินค้าจาก API

// โหลดรายการสินค้าจาก API
async function loadProducts() {
    try {
        console.log('🔄 Loading products from API...')
        
        // ดึง user ID จาก localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const userId = user._id || user.id  // ใช้ user ID แทน username
        
        if (!userId) {
            throw new Error('ไม่พบข้อมูล user ID')
        }
        
        // เรียก API พร้อม user ID
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/products?userId=${userId}`, {  // ← เปลี่ยนเป็น userId
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
        console.log('📥 Products loaded:', result)
        
        if (result.success && result.data) {
            allProducts = result.data
            displayProducts(result.data)
        } else {
            displayProducts([])
        }
        
    } catch (error) {
        console.error('❌ Error loading products:', error)
        
        const productsContainer = document.getElementById('products-container')
        if (productsContainer) {
            productsContainer.innerHTML = `
                <div style="padding: 20px; color: red;">
                    ❌ ไม่สามารถโหลดสินค้าได้: ${error.message}
                </div>
            `
        }
    }
}



// แสดงรายการสินค้าเป็น cards
function displayProducts(products) {
    const productsContainer = document.getElementById('products-container')
    
    if (!productsContainer) {
        console.error('❌ Products container not found')
        return
    }
    
    if (!products || products.length === 0) {
        productsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #666;">
                <h3>📦 ยังไม่มีสินค้า</h3>
                <p>เริ่มต้นเพิ่มสินค้าของคุณได้เลย</p>
                <button onclick="openAddProductPopup()" style="margin-top: 10px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ➕ เพิ่มสินค้าแรก
                </button>
            </div>
        `
        return
    }
    
    // สร้าง HTML สำหรับแต่ละสินค้า
    const productsHTML = products.map(product => {
        const imageUrl = product.image_base64 || '/images/no-image.png'
        const stockClass = product.stock <= 10 ? 'low-stock' : ''
        
        return `
            <div class="product-card" onclick="showProductDetails('${product._id}')" data-id="${product._id}">
                <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/images/no-image.png'">
                <h3>${product.name}</h3>
                <p class="barcode">รหัส: ${product.barcode}</p>
                <p class="stock ${stockClass}">คงเหลือ: ${product.stock} ชิ้น</p>
                <p class="price">฿${product.price.toLocaleString()}</p>
            </div>
        `
    }).join('')
    
    // แสดงผล
    productsContainer.innerHTML = productsHTML
    
    console.log(`✅ Displayed ${products.length} products as cards`)
}


// เพิ่มฟังก์ชันแสดงรายละเอียดสินค้า
function showProductDetails(productId) {
    console.log(`👁️ Showing details for product ID: ${productId}`)
    
    // หาจากข้อมูลที่มีแล้ว แทนการเรียก API
    const product = allProducts.find(p => p._id === productId)
    if (product) {
        displayProductPopup(product)
    } else {
        alert('❌ ไม่พบข้อมูลสินค้า')
    }
}
// แสดง popup รายละเอียดสินค้า
function displayProductPopup(product) {
    const popup = document.getElementById('popup')
    const popupInfo = document.getElementById('popup-info')
    
    if (!popup || !popupInfo) {
        console.error('❌ Product detail popup elements not found')
        return
    }
    
    const imageUrl = product.image_base64 || '/images/no-image.png'
    const canEdit = canEditDeleteProducts()
    
    popupInfo.innerHTML = `
        <img src="${imageUrl}" alt="${product.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;">
        <h2>${product.name}</h2>
        <p><strong>รหัสสินค้า:</strong> ${product.barcode}</p>
        <p><strong>หมวดหมู่:</strong> ${product.category}</p>
        <p><strong>ราคาขายปลีก:</strong> ฿${product.price.toLocaleString()}</p>
        <p><strong>ราคาขายส่ง:</strong> ฿${product.wholesale_price.toLocaleString()}</p>
        <p><strong>ราคาขายเครดิต:</strong> ฿${product.credit_price.toLocaleString()}</p>
        <p><strong>จำนวนขั้นต่ำ (ขายส่ง):</strong> ${product.wholesale_minimum} ชิ้น</p>
        <p><strong>สต็อกคงเหลือ:</strong> <span style="color: ${product.stock <= 10 ? '#dc3545' : '#28a745'}; font-weight: bold;">${product.stock} ชิ้น</span></p>
        ${product.description ? `<p><strong>รายละเอียด:</strong> ${product.description}</p>` : ''}
        
        <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
            <button onclick="addStock('${product._id}')" style="background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                📦 เติมสต็อก
            </button>
            ${canEdit ? `
                <button onclick="editProduct('${product._id}')" style="background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                    ✏️ แก้ไข
                </button>
                <button onclick="deleteProduct('${product._id}', '${product.name}')" style="background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                    🗑️ ลบ
                </button>
            ` : ''}
        </div>
    `
    
    popup.classList.remove('hidden')
}

// ปิด popup รายละเอียดสินค้า
function closePopup() {
    const popup = document.getElementById('popup')
    if (popup) {
        popup.classList.add('hidden')
    }
}

// =========================================
// Category Functions
// =========================================

// โหลดหมวดหมู่จาก API
async function loadCategories() {
    try {
        console.log('🔄 Loading categories from API...')
        
        // ดึง user ID
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const userId = user._id || user.id
        
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/products/categories?userId=${userId}`, {  // ← เพิ่ม userId
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
        console.log('📥 Categories loaded:', result)
        
        if (result.success && result.data) {
            displayCategories(result.data)
        } else {
            displayCategories([])
        }
        
    } catch (error) {
        console.error('❌ Error loading categories:', error)
        displayCategories([])
    }
}

// แสดงหมวดหมู่ใน sidebar
function displayCategories(categories) {
    const categoryContainer = document.getElementById('category-buttons')
    
    if (!categoryContainer) {
        console.error('❌ Category container not found')
        return
    }
    
    if (!categories || categories.length === 0) {
        categoryContainer.innerHTML = '<p style="color: #999; font-size: 12px; text-align: center;">ยังไม่มีหมวดหมู่</p>'
        return
    }
    
    // สร้าง HTML สำหรับแต่ละหมวดหมู่
    const categoriesHTML = `
        <button class="category-btn" onclick="filterByCategory('all')">
            📂 ทั้งหมด
        </button>
        ${categories.map(category => `
            <button class="category-btn" onclick="filterByCategory('${category}')">
                🏷️ ${category}
            </button>
        `).join('')}
    `
    
    categoryContainer.innerHTML = categoriesHTML
    
    console.log(`✅ Displayed ${categories.length} categories`)
}

// กรองสินค้าตามหมวดหมู่
function filterByCategory(category) {
    console.log(`🏷️ Filtering by category: ${category}`)
    
    // ลบ active class จากปุ่มทั้งหมด
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active')
    })
    
    // เพิ่ม active class ให้ปุ่มที่ถูกกด
    event.target.classList.add('active')
    
    // กรองสินค้า
    if (category === 'all') {
        displayProducts(allProducts)
    } else {
        const filteredProducts = allProducts.filter(product => product.category === category)
        displayProducts(filteredProducts)
    }
}


// =========================================
// Event Listeners
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Products page loaded')
    
   
    
    // ตรวจสอบการ login
    checkAuth()
    
    // ตรวจสอบสิทธิ์และปรับ UI
    initPermissions()
    
    // อัพเดทปุ่ม profile
    updateProfileButton()
    
    // โหลดสินค้า
    loadProducts()
    
    loadCategories()  // ← เพิ่มบรรทัดนี้

    // Navigation buttons
    document.getElementById('home-btn')?.addEventListener('click', goHome)
    document.getElementById('dashboard-btn')?.addEventListener('click', goToDashboard)
    document.getElementById('customers-btn')?.addEventListener('click', goToCustomers)
    document.getElementById('products-btn')?.addEventListener('click', goToProducts)
    document.getElementById('profile-btn')?.addEventListener('click', goToAdmin)
    
    // Add product button
    document.getElementById('add-product-btn')?.addEventListener('click', function() {
        console.log('🖱️ Add product button clicked')
        openAddProductPopup()
    })
    
    // Close popup when clicking outside
    window.addEventListener('click', function(event) {
        const popup = document.getElementById('add-product-popup')
        if (event.target === popup) {
            closeAddProductPopup()
        }
    })
    
    console.log('✅ Products page initialized with API integration')
})

