// ✅ ตัวแปรหลัก
let selectedPaymentType = "เงินสด"; // เริ่มต้นเป็นเงินสด
let customerId = null;
let currentCustomerName = ""; // เก็บชื่อลูกค้าปัจจุบัน
let currentCustomerPhone = ""; // เก็บเบอร์โทรลูกค้าปัจจุบัน
// ✅ เพิ่มตัวแปรสำหรับค้างชำระ
let currentCreditCustomerName = ""; // เก็บชื่อลูกค้าค้างชำระ
let currentCreditCustomerPhone = ""; // เก็บเบอร์โทรลูกค้าค้างชำระ
let currentCreditCustomerAddress = ""; // เก็บที่อยู่ลูกค้าค้างชำระ
const cart = [];
let products = []; // ✅ ต้องอยู่ก่อนใช้ products
let isPaying = false; // สถานะเริ่มต้น

// ✅ หมวดหมู่สินค้า
const predefinedCategories = [
  "ยาฆ่าหญ้า24d", "ยาคุมเลน", "ยาคุมฆ่า", "ยาเก็บ", "ยาฆ่าแมลง",
  "ยาเชื้อรา", "ฮอร์โมน", "ปุ๋ยเกล็ด", "จับใบ", "ปุ๋ย",
  "ยาย่อยฟาง", "ยาคุมข้าวโพด", "ยาหว่านแมลง", "ยาหว่านหญ้า"
];

// ✅ ฟังก์ชันแก้ไข Barcode ภาษาไทย
function fixThaiBarcode(input) {
  const map = {
    "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
    "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9",
    "ๆ": "1", "ไ": "2", "ำ": "3", "พ": "4", "ะ": "5",
    "ั": "6", "ี": "7", "ร": "8", "น": "9", "ย": "0",
    "ฟ": "1", "ห": "2", "ก": "3", "ด": "4", "เ": "5",
    "้": "6", "่": "7", "า": "8", "ส": "9", "ว": "0",
    "(": "0", "/": "0", ")": "0", "-": "", "_": "",
    "ภ": "8", "ถ": "9", "ุ": "0", "฿": "1", "ฃ": "2", "ฅ": "3"
  };
  return input.split("").map(ch => map[ch] || (/\d/.test(ch) ? ch : "")).join("").trim();
}

// ✅ คำนวณราคาตามประเภทการชำระ - แก้ไขใหม่
function getPrice(item) {
  if (selectedPaymentType === "ค้างชำระ") {
    // ใช้ credit_price สำหรับค้างชำระ
    return item.credit_price || item.retail_price;
  } else if (selectedPaymentType === "เงินสด" && item.quantity >= item.wholesale_minimum) {
    // ใช้ wholesale_price ถ้าซื้อครบจำนวนขายส่ง
    return item.wholesale_price;
  }
  // ใช้ retail_price เป็น default
  return item.retail_price;
}

// ✅ เพิ่มสินค้าเข้าตะกร้า
// ✅ เพิ่มสินค้าเข้าตะกร้า - แก้ไขเพิ่ม credit_price
function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      retail_price: product.retail_price,
      wholesale_price: product.wholesale_price || product.retail_price,
      credit_price: product.credit_price || product.retail_price, // ← เพิ่มบรรทัดนี้
      wholesale_minimum: product.wholesale_minimum || 999999,
      quantity: 1,
      image: product.image
    });
  }
  renderCart();
  calculateTotal();
}

function getProductCardHTML(product) {
  const imageSrc = product.image || 'no-image.png';
  const productName = product.name;
  
  if (selectedPaymentType === "ค้างชำระ") {
    // แสดงแค่ราคา credit เท่านั้น
    const creditPrice = product.credit_price || product.retail_price;
    return `
      <img src="${imageSrc}" alt="รูป">
      <p><strong>${productName}</strong></p>
      <p style="color:#e74c3c;font-weight:bold;">ราคาเครดิต: ฿${creditPrice.toFixed(2)}</p>
    `;
  } else {
    // แสดงราคาปกติ (ขายปลีก/ขายส่ง)
    const retailPrice = product.retail_price.toFixed(2);
    const wholesalePrice = product.wholesale_price?.toFixed(2) || '-';
    return `
      <img src="${imageSrc}" alt="รูป">
      <p><strong>${productName}</strong></p>
      <p>ขายปลีก: ฿${retailPrice}</p>
      <p>ขายส่ง: ฿${wholesalePrice}</p>
    `;
  }
}


// ✅ แสดงรายการในตะกร้าแบบเดิม (แก้ไข ID ให้ตรงกับ HTML)
function renderCart() {
  const cartItems = document.getElementById("cart-items");
  if (!cartItems) return;
  
  cartItems.innerHTML = "";
  
  if (cart.length === 0) {
    return;
  }
  
  cart.forEach((item, index) => {
    const price = getPrice(item);
    const total = price * item.quantity;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>
        <button onclick="decreaseQuantity(${index})" style="padding:2px 6px;">-</button>
        <span style="margin:0 8px;">${item.quantity}</span>
        <button onclick="increaseQuantity(${index})" style="padding:2px 6px;">+</button>
      </td>
      <td>฿${price.toFixed(2)}</td>
      <td>฿${total.toFixed(2)}</td>
      <td><button onclick="removeFromCart(${index})" style="background:#dc3545; color:white; padding:2px 8px;">ลบ</button></td>
    `;
    cartItems.appendChild(tr);
  });
}

// ✅ เพิ่มจำนวนสินค้า
function increaseQuantity(index) {
  cart[index].quantity += 1;
  renderCart();
  calculateTotal();
}

// ✅ ลดจำนวนสินค้า
function decreaseQuantity(index) {
  if (cart[index].quantity > 1) {
    cart[index].quantity -= 1;
  } else {
    cart.splice(index, 1);
  }
  renderCart();
  calculateTotal();
}

// ✅ ลบสินค้าออกจากตะกร้า
function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
  calculateTotal();
}

// ✅ คำนวณยอดรวม (แก้ไข ID ให้ตรงกับ HTML)
function calculateTotal() {
  const totalElement = document.getElementById("total-price");
  if (!totalElement) return;
  
  const total = cart.reduce((sum, item) => {
    const price = getPrice(item);
    return sum + (price * item.quantity);
  }, 0);
  
  totalElement.textContent = total.toFixed(2);
}

// ✅ เน้นปุ่มชำระเงิน
function highlightPayment(paymentType) {
  document.querySelectorAll(".select-payment").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.type === paymentType) {
      btn.classList.add("active");
    }
  });
}

// ✅ แสดง Loading
function showLoading(show) {
  const loader = document.getElementById("loading");
  if (loader) {
    loader.style.display = show ? "block" : "none";
  }
}

// ✅ ปรับปรุง showCashCustomerPopup - **แก้ไขการ Focus**
function showCashCustomerPopup() {
  const popup = document.getElementById("cash-popup");
  const nameInput = document.getElementById("cash-customer-name");
  const phoneInput = document.getElementById("cash-customer-phone");

  if (popup && nameInput && phoneInput) {
    showLoading(false); 

    [nameInput, phoneInput].forEach(input => {
      input.removeAttribute('disabled');
      input.removeAttribute('readonly');
      input.removeAttribute('tabindex');
      input.disabled = false;
      input.readOnly = false;
      input.tabIndex = 0;
      input.value = "";
      input.classList.remove('disabled', 'readonly');
      input.style.pointerEvents = 'auto';
      input.style.userSelect = 'text';
      input.style.cursor = 'text';
    });

    popup.style.display = "flex";

    setTimeout(() => {
      requestAnimationFrame(() => {
        nameInput.focus(); // <<<<<<<<<<<< แก้ไขตรงนี้ ลดความซับซ้อน เหลือ .focus() อย่างเดียว
        console.log("🔍 activeElement (หลัง focus ใน rAF):", document.activeElement);
        console.log("🔍 (In rAF) Name Input - disabled:", nameInput.disabled, "readonly:", nameInput.readOnly, "value:", nameInput.value);
        console.log("🔍 (In rAF) Phone Input - disabled:", phoneInput.disabled, "readonly:", phoneInput.readOnly, "value:", phoneInput.value);
      });

      // Event listeners และ logs เดิมจากโค้ดของคุณ (แสดงสถานะก่อน rAF)
      nameInput.addEventListener('input', function () {
        console.log('✅ Name input working:', this.value);
      }, { once: true });

      phoneInput.addEventListener('input', function () {
        console.log('✅ Phone input working:', this.value);
      }, { once: true });

      console.log("🔍 (Before rAF) Name Input - disabled:", nameInput.disabled, "readonly:", nameInput.readOnly);
      console.log("🔍 (Before rAF) Phone Input - disabled:", phoneInput.disabled, "readonly:", phoneInput.readOnly);
    }, 250); // Timeout เดิม
  } else {
    console.error("Cash popup elements not found!");
    isPaying = false; 
  }
}

function closeCashPopup() {
  const popup = document.getElementById("cash-popup");
  if (popup) {
    popup.style.display = "none";
  }
  
  const nameInput = document.getElementById("cash-customer-name");
  const phoneInput = document.getElementById("cash-customer-phone");
  
  if (nameInput && phoneInput) {
    nameInput.value = "";
    phoneInput.value = "";
    nameInput.disabled = false;
    phoneInput.disabled = false;
    nameInput.readOnly = false;
    phoneInput.readOnly = false;
  }
  
  showLoading(false);
  isPaying = false; 
}

async function submitCashCustomer() {
  const nameInput = document.getElementById("cash-customer-name");
  const phoneInput = document.getElementById("cash-customer-phone");
  
  const customerName = nameInput ? nameInput.value.trim() : "";
  const customerPhone = phoneInput ? phoneInput.value.trim() : "";
  
  if (!customerName) {
    alert("กรุณากรอกชื่อลูกค้า");
    nameInput.focus();
    return;
  }
  
  if (!customerPhone) {
    alert("กรุณากรอกเบอร์โทรศัพท์");
    phoneInput.focus();
    return;
  }
  
  currentCustomerName = customerName;
  currentCustomerPhone = customerPhone;
  closeCashPopup(); 
  
  isPaying = true; 
  showLoading(true);
  await processCashPayment();
}

async function processCashPayment() {
  try {
    const total = cart.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
    const username = localStorage.getItem("username");

    let savedCustomerId = null;
    try {
      savedCustomerId = await window.api.addCustomer({
        name: currentCustomerName,
        phone: currentCustomerPhone,
        address: "ไม่ระบุ", 
        outstanding_balance: 0,
        customer_type: selectedPaymentType,
        username: username
      });
    } catch (error) {
      console.log("ไม่สามารถบันทึกข้อมูลลูกค้า:", error);
    }

    const orderId = await window.api.insertOrderHeader({
      customer_id: savedCustomerId?.id || null,
      username,
      amount: total,
      payment_type: selectedPaymentType,
    });

    for (const item of cart) {
      const price = getPrice(item);
      await window.api.insertOrderItem({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price,
        username
      });
      await window.api.updateStock({
        product_id: item.id,
        quantity: item.quantity,
        username
      });
    }

    await window.api.savePaymentHistory({
      customer_id: savedCustomerId?.id || null,
      amount: total,
      payment_type: selectedPaymentType,
      note: `${selectedPaymentType} - ลูกค้า: ${currentCustomerName} (${currentCustomerPhone})`,
      username
    });

    await showReceipt(cart, total, username, selectedPaymentType, {
      name: currentCustomerName,
      phone: currentCustomerPhone
    });

    alert(`✅ บันทึกการขายสำเร็จ!\nลูกค้า: ${currentCustomerName}\nยอดรวม: ฿${total.toFixed(2)}`);

    // ✅ รีเซ็ต input fields
    const nameInput = document.getElementById("cash-customer-name");
    const phoneInput = document.getElementById("cash-customer-phone");
    if (nameInput && phoneInput) {
      nameInput.value = "";
      phoneInput.value = "";
      nameInput.removeAttribute('disabled');
      phoneInput.removeAttribute('disabled');
      nameInput.removeAttribute('readonly');
      phoneInput.removeAttribute('readonly');
      nameInput.disabled = false;
      phoneInput.disabled = false;
      nameInput.readOnly = false;
      phoneInput.readOnly = false;
    }
    
    // ✅ รีเซ็ตตัวแปรและสถานะ
    isPaying = false;
    currentCustomerName = "";
    currentCustomerPhone = "";
    showLoading(false);
    
    // ✅ ปิด popup
    closeCashPopup();
    
    // ✅ ล้างตะกร้าและอัปเดต UI แทน reload
    cart.length = 0;
    renderCart();
    calculateTotal();
    
    // ✅ โหลดสินค้าใหม่
    await loadAndRenderProducts();
    
    console.log("✅ รีเซ็ตเสร็จสิ้น ไม่ต้อง reload");

    // ❌ เอาบรรทัดนี้ออก - มันทำให้ input พิมพ์ไม่ได้
    // setTimeout(() => {
    //   window.location.reload();
    // }, 300);

  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err);
    alert("❌ เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล");
    
    // ✅ รีเซ็ต input fields เมื่อ error
    const nameInput = document.getElementById("cash-customer-name");
    const phoneInput = document.getElementById("cash-customer-phone");
    if (nameInput && phoneInput) {
      nameInput.value = "";
      phoneInput.value = "";
      nameInput.removeAttribute('disabled');
      phoneInput.removeAttribute('disabled');
      nameInput.removeAttribute('readonly');
      phoneInput.removeAttribute('readonly');
      nameInput.disabled = false;
      phoneInput.disabled = false;
      nameInput.readOnly = false;
      phoneInput.readOnly = false;
    }
    
    showLoading(false);
    isPaying = false;
    closeCashPopup();
  }
}


function showCreditCustomerPopup() {
  const popup = document.getElementById("credit-popup");
  const nameInput = document.getElementById("credit-customer-name");
  
  if (popup && nameInput) {
    showLoading(false);
    
    nameInput.value = "";
    nameInput.removeAttribute('disabled');
    nameInput.removeAttribute('readonly');
    nameInput.disabled = false;
    nameInput.readOnly = false;
    nameInput.classList.remove('disabled', 'readonly');
    
    popup.style.display = "flex";
    
    setTimeout(() => {
      nameInput.disabled = false;
      nameInput.readOnly = false;
      nameInput.focus();
      nameInput.select();
      console.log("🔍 Credit Name Input - disabled:", nameInput.disabled, "readonly:", nameInput.readOnly);
    }, 150);
  } else {
    console.error("Credit popup elements not found!");
    isPaying = false; 
  }
}

function closeCreditPopup() {
  const popup = document.getElementById("credit-popup");
  if (popup) {
    popup.style.display = "none";
  }
  
  const nameInput = document.getElementById("credit-customer-name");
  if (nameInput) {
    nameInput.value = "";
    nameInput.disabled = false;
    nameInput.readOnly = false;
  }
  
  showLoading(false);
  isPaying = false; 
}

async function submitCreditCustomer() {
  const nameInput = document.getElementById("credit-customer-name");
  const customerName = nameInput ? nameInput.value.trim() : "";
  
  if (!customerName) {
    alert("กรุณากรอกชื่อลูกค้า");
    if (nameInput) nameInput.focus();
    return;
  }
  
  const username = localStorage.getItem("username");
  isPaying = true; 
  showLoading(true); 

  try {
    const customers = await window.api.getCustomers(username);
    const existingCustomer = customers.find(c => 
      c.name.toLowerCase().trim() === customerName.toLowerCase().trim()
    );

    if (existingCustomer) {
      currentCreditCustomerName = existingCustomer.name;
      currentCreditCustomerPhone = existingCustomer.phone || "";
      currentCreditCustomerAddress = existingCustomer.address || "";
      
      closeCreditPopup(); 
      isPaying = true; 
      showLoading(true);
      await processCreditPayment();
    } else {
      currentCreditCustomerName = customerName;
      closeCreditPopup(); 
      // isPaying is now false due to closeCreditPopup, 
      // showCreditNewCustomerPopup will be the active interaction
      showCreditNewCustomerPopup(); 
    }
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการตรวจสอบลูกค้า:", error);
    alert("เกิดข้อผิดพลาดในการตรวจสอบข้อมูลลูกค้า: " + error.message);
    isPaying = false; 
    showLoading(false);
    closeCreditPopup(); 
  }
}

function showCreditNewCustomerPopup() {
  const popup = document.getElementById("credit-new-customer-popup");
  const nameInput = document.getElementById("credit-new-customer-name");
  const phoneInput = document.getElementById("credit-new-customer-phone");
  const addressInput = document.getElementById("credit-new-customer-address");
  
  if (popup && nameInput && phoneInput && addressInput) {
    showLoading(false);
    
    popup.style.display = "flex";
    
    nameInput.value = currentCreditCustomerName; 
    phoneInput.value = "";
    addressInput.value = "";
    
    [nameInput, phoneInput, addressInput].forEach(input => {
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        input.classList.remove('disabled', 'readonly');
    });
        
    setTimeout(() => {
      phoneInput.focus();
      phoneInput.select();
    }, 100);
  } else {
    console.error("Credit new customer popup elements not found!");
    isPaying = false; 
  }
}

function closeCreditNewCustomerPopup() {
  const popup = document.getElementById("credit-new-customer-popup");
  if (popup) {
    popup.style.display = "none";
  }
  
  const nameInput = document.getElementById("credit-new-customer-name");
  const phoneInput = document.getElementById("credit-new-customer-phone");
  const addressInput = document.getElementById("credit-new-customer-address");
  
  if (nameInput && phoneInput && addressInput) {
    nameInput.value = "";
    phoneInput.value = "";
    addressInput.value = "";
    nameInput.disabled = false;
    phoneInput.disabled = false;
    addressInput.disabled = false;
    nameInput.readOnly = false;
    phoneInput.readOnly = false;
    addressInput.readOnly = false;
  }
  
  showLoading(false);
  isPaying = false; 
}

async function submitCreditNewCustomer() {
  const nameInput = document.getElementById("credit-new-customer-name");
  const phoneInput = document.getElementById("credit-new-customer-phone");
  const addressInput = document.getElementById("credit-new-customer-address");
  
  const customerName = nameInput ? nameInput.value.trim() : "";
  const customerPhone = phoneInput ? phoneInput.value.trim() : "";
  const customerAddress = addressInput ? addressInput.value.trim() : "";
  
  if (!customerName) { alert("กรุณากรอกชื่อลูกค้า"); if (nameInput) nameInput.focus(); return; }
  if (!customerPhone) { alert("กรุณากรอกเบอร์โทรศัพท์"); if (phoneInput) phoneInput.focus(); return; }
  if (!customerAddress) { alert("กรุณากรอกที่อยู่"); if (addressInput) addressInput.focus(); return; }
  
  currentCreditCustomerName = customerName;
  currentCreditCustomerPhone = customerPhone;
  currentCreditCustomerAddress = customerAddress;
  
  closeCreditNewCustomerPopup(); 
  
  isPaying = true; 
  showLoading(true);
  await processCreditPayment();
}

async function processCreditPayment() {
  try {
    const total = cart.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
    const username = localStorage.getItem("username");

    let savedCustomer = null;
    try {
      const customers = await window.api.getCustomers(username);
      const existingCustomer = customers.find(c => 
        c.name.toLowerCase().trim() === currentCreditCustomerName.toLowerCase().trim()
      );

      if (existingCustomer) {
        savedCustomer = existingCustomer;
        console.log(`✅ ใช้ข้อมูลลูกค้าเก่า: ${currentCreditCustomerName} (ID: ${existingCustomer.id})`);
        const newBalance = (existingCustomer.outstanding_balance || 0) + total;
        await window.api.updateCustomerBalance(existingCustomer.id, newBalance);
        console.log(`✅ อัปเดตยอดค้างใหม่: ฿${newBalance.toFixed(2)}`);
      } else {
        savedCustomer = await window.api.addCustomer({
          name: currentCreditCustomerName,
          phone: currentCreditCustomerPhone,
          address: currentCreditCustomerAddress, 
          outstanding_balance: total,
          customer_type: selectedPaymentType,
          username: username
        });
        console.log(`✅ สร้างลูกค้าใหม่: ${currentCreditCustomerName} ยอดค้าง: ฿${total.toFixed(2)}`);
      }
    } catch (error) {
      console.error("❌ ไม่สามารถจัดการข้อมูลลูกค้า:", error);
    }

    const orderId = await window.api.insertOrderHeader({
      customer_id: savedCustomer?.id || null,
      username,
      amount: total,
      payment_type: selectedPaymentType,
    });

    for (const item of cart) {
      const price = getPrice(item);
      await window.api.insertOrderItem({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price,
        username
      });
      await window.api.updateStock({
        product_id: item.id,
        quantity: item.quantity,
        username
      });
    }

    await window.api.savePaymentHistory({
      customer_id: savedCustomer?.id || null,
      amount: total,
      payment_type: selectedPaymentType,
      note: `${selectedPaymentType} - ลูกค้า: ${currentCreditCustomerName} (${currentCreditCustomerPhone}) ยอดค้าง: ฿${total.toFixed(2)}`,
      username
    });

    await showReceipt(cart, total, username, selectedPaymentType, {
      name: currentCreditCustomerName,
      phone: currentCreditCustomerPhone,
      address: currentCreditCustomerAddress
    });

    alert(`✅ บันทึก${selectedPaymentType}สำเร็จ!\nลูกค้า: ${currentCreditCustomerName}\nยอดค้าง: ฿${total.toFixed(2)}`);

    const creditNameInput = document.getElementById("credit-customer-name");
    const creditNewNameInput = document.getElementById("credit-new-customer-name");
    const creditNewPhoneInput = document.getElementById("credit-new-customer-phone");
    const creditNewAddressInput = document.getElementById("credit-new-customer-address");
    [creditNameInput, creditNewNameInput, creditNewPhoneInput, creditNewAddressInput].forEach(input => {
      if (input) {
        input.value = "";
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        input.disabled = false;
        input.readOnly = false;
        input.classList.remove('disabled', 'readonly');
      }
    });
    
    isPaying = false; 
    currentCreditCustomerName = "";
    currentCreditCustomerPhone = "";
    currentCreditCustomerAddress = "";
    showLoading(false);

    

  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err);
    alert("❌ เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล: " + err.message);
    
    const creditNameInput = document.getElementById("credit-customer-name");
    const creditNewNameInput = document.getElementById("credit-new-customer-name");
    const creditNewPhoneInput = document.getElementById("credit-new-customer-phone");
    const creditNewAddressInput = document.getElementById("credit-new-customer-address");
    [creditNameInput, creditNewNameInput, creditNewPhoneInput, creditNewAddressInput].forEach(input => {
      if (input) {
        input.value = "";
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        input.disabled = false;
        input.readOnly = false;
        input.classList.remove('disabled', 'readonly');
      }
    });
    
    showLoading(false);
    isPaying = false; 
  }
}

function resetAllPaymentStates() {
  isPaying = false;
  currentCustomerName = "";
  currentCustomerPhone = "";
  currentCreditCustomerName = "";
  currentCreditCustomerPhone = "";
  currentCreditCustomerAddress = "";
  
  showLoading(false);
  
  closeCashPopup();
  closeCreditPopup();
  closeCreditNewCustomerPopup();
  
  selectedPaymentType = "เงินสด";
  highlightPayment("เงินสด");
  
  console.log("🔄 รีเซ็ตสถานะการชำระเงินทั้งหมดแล้ว");
}

async function loadAndRenderProducts() {
  const scrollArea = document.getElementById("product-scroll-area");
  if (!scrollArea) return;
  
  scrollArea.innerHTML = "";

  const username = localStorage.getItem("username");

  await renderLatestProductsSection(username, scrollArea);

  const grouped = {};
  predefinedCategories.forEach(cat => grouped[cat] = []);
  
  products.forEach(product => {
    const cat = product.category || "ไม่ระบุ";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(product);
  });

  predefinedCategories.forEach(category => {
    const items = grouped[category] || [];
    const section = document.createElement("div");
    section.className = "category-section";
    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `<span class="category-title">${category}</span>
      ${items.length > 10 ? '<button class="show-more-btn">ดูเพิ่มเติม</button>' : ""}`;
    const grid = document.createElement("div");
    grid.className = "category-product-grid-main";
    
    if (items.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-category";
      emptyDiv.innerHTML = `<div style="padding:20px;text-align:center;color:#666;background:#f8f9fa;border:2px dashed #ddd;border-radius:8px;margin:10px 0;"><p style="margin:0;font-style:italic;">ยังไม่มีสินค้าในหมวด "${category}"</p></div>`;
      grid.appendChild(emptyDiv);
    } else {
      const displayItems = items.slice(0, 10);
      const hiddenItems = items.slice(10);
      displayItems.forEach(product => {
        const div = document.createElement("div");
        div.className = "product-card";
        div.innerHTML = getProductCardHTML(product); // ← ใช้ฟังก์ชันใหม่
        div.onclick = () => addToCart(product);
        grid.appendChild(div);
      });

      let hiddenGrid = null;
      if (hiddenItems.length > 0) {
        hiddenGrid = document.createElement("div");
        hiddenGrid.className = "category-product-grid-hidden";
        hiddenGrid.style.display = "none";
        hiddenItems.forEach(product => {
          const div = document.createElement("div");
          div.className = "product-card";
          div.innerHTML = getProductCardHTML(product); // ← ใช้ฟังก์ชันใหม่
          div.onclick = () => addToCart(product);
          hiddenGrid.appendChild(div);
        });
        const btn = header.querySelector(".show-more-btn");
        if (btn && hiddenGrid) {
          btn.addEventListener("click", () => {
            const isVisible = hiddenGrid.style.display !== "none";
            hiddenGrid.style.display = isVisible ? "none" : "grid";
            btn.textContent = isVisible ? "ดูเพิ่มเติม" : "ซ่อน";
          });
        }
        section.appendChild(header);
        section.appendChild(grid);
        section.appendChild(hiddenGrid);
      } else {
        section.appendChild(header);
        section.appendChild(grid);
      }
    }
    if (items.length === 0) {
      section.appendChild(header);
      section.appendChild(grid);
    }
    scrollArea.appendChild(section);
  });
}


// ✅ อัปเดตฟังก์ชัน renderLatestProductsSection ให้ใช้ราคาตามประเภท
async function renderLatestProductsSection(username, scrollArea) {
  try {
    const latest = await window.api.getRecentSales(username);
    if (!latest || latest.length === 0) return;

    const section = document.createElement("div");
    section.className = "category-section latest-sales-section";
    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `<span class="category-title">🔥 สินค้าที่ขายล่าสุด</span>`;
    const grid = document.createElement("div");
    grid.className = "category-product-grid-main";
    const displayItems = latest.slice(0, 10);
    
    displayItems.forEach(sale => {
      const product = products.find(p => p.name === sale.product_name);
      const div = document.createElement("div");
      div.className = "product-card latest-product-card";
      
      if (product) {
        // ใช้ราคาตามประเภทการชำระ
        let priceDisplay = "";
        if (selectedPaymentType === "ค้างชำระ") {
          const creditPrice = product.credit_price || product.retail_price;
          priceDisplay = `<p style="color:#e74c3c;font-weight:bold;">ราคาเครดิต: ฿${creditPrice.toLocaleString()}</p>`;
        } else {
          priceDisplay = `<p style="color:#ff6b35;font-weight:bold;">฿${parseFloat(sale.amount).toLocaleString()}</p>`;
        }
        
        div.innerHTML = `
          <img src="${product?.image||'no-image.png'}" alt="รูป">
          <p><strong>${sale.product_name}</strong></p>
          <p>ขายล่าสุด: ${sale.quantity} ชิ้น</p>
          ${priceDisplay}
          <p style="font-size:11px;color:#666;">${new Date(sale.sale_date).toLocaleDateString('th-TH')}</p>
        `;
        div.onclick = () => addToCart(product);
        div.style.cursor = "pointer";
      } else {
        div.innerHTML = `
          <img src="no-image.png" alt="รูป">
          <p><strong>${sale.product_name}</strong></p>
          <p>ขายล่าสุด: ${sale.quantity} ชิ้น</p>
          <p style="color:#ff6b35;font-weight:bold;">฿${parseFloat(sale.amount).toLocaleString()}</p>
          <p style="font-size:11px;color:#666;">${new Date(sale.sale_date).toLocaleDateString('th-TH')}</p>
        `;
        div.style.opacity = "0.7";
        div.style.cursor = "not-allowed";
      }
      grid.appendChild(div);
    });
    section.appendChild(header);
    section.appendChild(grid);
    scrollArea.appendChild(section);
  } catch (error) {
    console.error("❌ ไม่สามารถโหลดข้อมูลการขายล่าสุด:", error);
  }
}


async function renderLatestProducts(username) {
  const latestContainer = document.getElementById("latest-products");
  if (!latestContainer) return;
  try {
    const latest = await window.api.getRecentSales(username);
    latestContainer.innerHTML = "";
    if (!latest || latest.length === 0) {
      latestContainer.innerHTML = "<p>ยังไม่มีประวัติการขาย</p>";
      return;
    }
    latest.forEach(sale => {
      const div = document.createElement("div");
      div.className = "product-card";
      div.innerHTML = `<p><strong>${sale.product_name}</strong></p><p>จำนวน: ${sale.quantity}</p><p>ยอดขาย: ฿${parseFloat(sale.amount).toLocaleString()}</p><p style="font-size:12px;color:#666;">${new Date(sale.sale_date).toLocaleDateString('th-TH')}</p>`;
      latestContainer.appendChild(div);
    });
  } catch (error) {
    console.error("❌ ไม่สามารถโหลดข้อมูลการขายล่าสุด:", error);
    latestContainer.innerHTML = "<p>ไม่สามารถโหลดข้อมูลได้</p>";
  }
}

async function showReceipt(cart, total, username, paymentType, customerInfo = null) {
  try {
    const profile = await window.api.getUserProfile(username);
    const now = new Date();
    const datetime = now.toLocaleString('th-TH');

    let html = `
      <h2 style="text-align:center;">ใบรับเงิน</h2>  <!-- ✅ หัวใบเสร็จ -->
      <h4>${profile.store_name || "-"}</h4>
      <p>${profile.store_address || "-"}</p>
      <p>โทร: ${profile.store_phone || "-"}</p>
      <hr>
      <p><strong>วันที่:</strong> ${datetime}</p>
    `;

    if (customerInfo) {
      html += `<p><strong>ลูกค้า:</strong> ${customerInfo.name}</p>`;
      html += `<p><strong>เบอร์โทร:</strong> ${customerInfo.phone}</p>`;
    }

    if (paymentType === "ค้างชำระ") {
      html += `<p style="color:red;"><strong>📌 ค้างชำระ - กรุณาชำระภายหลัง</strong></p>`;
    } else if (paymentType === "เงินสด") {
      html += `<p style="color:green;"><strong>💵 ชำระเงินสด</strong></p>`;
    }

    html += `
      <table style="width:100%;margin-top:10px;">
        <thead>
          <tr><th>สินค้า</th><th>จำนวน</th><th>ราคา</th><th>รวม</th></tr>
        </thead>
        <tbody>
    `;

    cart.forEach(item => {
      const price = getPrice(item);
      const sum = price * item.quantity;
      html += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>฿${price.toFixed(2)}</td><td>฿${sum.toFixed(2)}</td></tr>`;
    });

    html += `
        </tbody>
      </table>
      <hr>
      <p style="text-align:right;"><strong>ยอดรวม: ฿${total.toFixed(2)}</strong></p>

      <div style="margin-top:50px;">
        <p style="text-align:right;">.................................</p>
        <p style="text-align:right;">ลงชื่อผู้รับเงิน</p>
      </div>
    `

    const receiptContent = document.getElementById("receipt-content");
    const receiptModal = document.getElementById("receipt");
    if (receiptContent) receiptContent.innerHTML = html;
    if (receiptModal) receiptModal.style.display = "flex";
  } catch (error) {
    console.error("❌ ไม่สามารถแสดงใบเสร็จได้:", error);
  }
}


function closeReceipt() {
  const receiptModal = document.getElementById("receipt");
  if (receiptModal) receiptModal.style.display = "none";
}

function printReceipt() {
  const receiptContent = document.getElementById("receipt-content");
  if (!receiptContent) return;
  const old = document.getElementById("print-frame");
  if (old) old.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "print-frame";
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>ใบเสร็จ</title><style>body{font-family:'TH Sarabun New',sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th,td{border:1px solid #000;padding:6px;font-size:16px;}</style></head><body>${receiptContent.innerHTML}</body></html>`);
  doc.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 300);
  };
}

document.addEventListener("DOMContentLoaded", async function () {
  const barcodeInput = document.getElementById("barcode-scanner");
  if (barcodeInput) {
  window.addEventListener("click", (e) => {
    const cashPopup = document.getElementById("cash-popup");
    const creditPopup = document.getElementById("credit-popup");
    const creditNewPopup = document.getElementById("credit-new-customer-popup");
    if ((cashPopup && cashPopup.style.display !== "none") ||
        (creditPopup && creditPopup.style.display !== "none") ||
        (creditNewPopup && creditNewPopup.style.display !== "none")) {
      return;
    }
    barcodeInput.focus();
  });

  window.addEventListener("keydown", (e) => {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
      return;
    }
    barcodeInput.focus();
  });

  // ✅ เพิ่มส่วนนี้เพื่อยิงบาร์โค้ดแล้วใส่สินค้า
  barcodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const rawBarcode = fixThaiBarcode(barcodeInput.value.trim());
    console.log("🔍 Barcode ยิงเข้า:", rawBarcode);

    const foundProduct = products.find(p => p.barcode === rawBarcode);
    if (foundProduct) {
      console.log("✅ เจอสินค้า:", foundProduct.name);
      addToCart(foundProduct);
      barcodeInput.value = "";
    } else {
      alert(`❌ ไม่พบสินค้าที่มีบาร์โค้ด: ${rawBarcode}`);
      barcodeInput.value = "";
    }
  }
});

}


  const username = localStorage.getItem("username");
  if (!username) {
    alert("กรุณา Login ใหม่");
    location.href = "/login/login.html";
    return;
  }

  try {
    products = await window.api.getProducts(username);
    await loadAndRenderProducts();
    await renderLatestProducts(username);
    renderCart();
    calculateTotal();
    
    const profileBtn = document.getElementById("profile-btn");
    if (profileBtn) {
      profileBtn.textContent = username;
      profileBtn.onclick = () => { location.href = "admin.html"; };
    }

    document.querySelectorAll(".select-payment").forEach(btn => {
      btn.addEventListener("click", async () => {
        selectedPaymentType = btn.dataset.type;
        document.querySelectorAll(".select-payment").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderCart();
        calculateTotal();
        await loadAndRenderProducts();
      });
    });

    const payButton = document.querySelector(".pay");
    if (payButton) {
      payButton.addEventListener("click", async () => {
        if (isPaying) {
          console.log("🚫 กำลังประมวลผลการชำระเงินก่อนหน้าอยู่ กรุณารอสักครู่");
          return;
        }
        
        if (cart.length === 0) {
          alert("ยังไม่มีสินค้าในรายการ");
          return;
        }

        if (!selectedPaymentType) {
          alert("กรุณาเลือกวิธีชำระเงินก่อน");
          return;
        }

        isPaying = true; 

        try {
          if (selectedPaymentType === "เงินสด") {
            showCashCustomerPopup();
          } else if (selectedPaymentType === "ค้างชำระ") {
            showCreditCustomerPopup();
          } else {
            console.warn(`ประเภทการชำระเงิน ${selectedPaymentType} ไม่มีการเปิด Popup. กำลังรีเซ็ต isPaying.`);
            isPaying = false; 
          }
        } catch (err) {
          console.error("❌ เกิดข้อผิดพลาดหลักในส่วนการชำระเงิน:", err);
          alert("❌ เกิดข้อผิดพลาดระหว่างการจัดการการชำระเงิน");
          isPaying = false; 
          showLoading(false);
        }
      });
    }

    const cashNameInput = document.getElementById("cash-customer-name");
    const cashPhoneInput = document.getElementById("cash-customer-phone");
    if (cashNameInput) {
      cashNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (cashPhoneInput) cashPhoneInput.focus(); }
      });
    }
    if (cashPhoneInput) {
      cashPhoneInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); submitCashCustomer(); }
      });
    }

    const creditNameInput = document.getElementById("credit-customer-name");
    if (creditNameInput) {
      creditNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); submitCreditCustomer(); }
      });
    }

    const creditNewNameInput = document.getElementById("credit-new-customer-name");
    const creditNewPhoneInput = document.getElementById("credit-new-customer-phone");
    const creditNewAddressInput = document.getElementById("credit-new-customer-address");
    if (creditNewNameInput) {
      creditNewNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (creditNewPhoneInput) creditNewPhoneInput.focus(); }
      });
    }
    if (creditNewPhoneInput) {
      creditNewPhoneInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (creditNewAddressInput) creditNewAddressInput.focus(); }
      });
    }
    if (creditNewAddressInput) {
      creditNewAddressInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); submitCreditNewCustomer(); }
      });
    }

    const payDebtButton = document.querySelector(".pay-debt");
    if (payDebtButton) {
      payDebtButton.addEventListener("click", () => {
        window.api.openWindow("debt-payment/debt.html", { width: 450, height: 400 });
      });
    }
    
  } catch (error) {
    console.error("❌ ไม่สามารถโหลดข้อมูลเริ่มต้น:", error);
    alert("❌ เกิดข้อผิดพลาดในการโหลดข้อมูล");
    isPaying = false; 
    showLoading(false);
  }
});