window.addEventListener("DOMContentLoaded", async () => {
  const username = localStorage.getItem("username");

  if (!username) {
    alert("กรุณาเข้าสู่ระบบใหม่");
    location.href = "login.html";
    return;
  }

  // โหลดข้อมูลลูกค้าทั้งหมด
  await loadAllCustomers(username);

  // ✅ ปุ่มเพิ่มรายชื่อ (เปิดหน้าต่างใหม่แทน prompt)
  const addBtn = document.getElementById("add-customer-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      window.api.openAddCustomer(); // เรียก preload.js เพื่อส่ง IPC ไปยัง main.js
    });
  }

  // ✅ ปุ่มลูกค้าจ่ายเงินสด (customer_type = 'เงินสด')
  const cashBtn = document.getElementById("cash-customers-btn");
  if (cashBtn) {
    cashBtn.addEventListener("click", async () => {
      await loadCustomersByType(username, 'เงินสด');
      setActiveButton(cashBtn);
    });
  }

  // ✅ ปุ่มลูกค้าค้างชำระ (customer_type = 'ค้างชำระ')
  const pendingBtn = document.getElementById("pending-customers-btn");
  if (pendingBtn) {
    pendingBtn.addEventListener("click", async () => {
      await loadCustomersByType(username, 'ค้างชำระ');
      setActiveButton(pendingBtn);
    });
  }

  // ✅ ปุ่มจ่ายเงินค้างชำระ - เพิ่มใหม่!
  const paymentBtn = document.getElementById("payment-btn");
  if (paymentBtn) {
    paymentBtn.addEventListener("click", async () => {
      await showPaymentSearchPopup();
      setActiveButton(paymentBtn);
    });
  }

  // ✅ ตั้งชื่อปุ่มโปรไฟล์ตาม username
  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.textContent = username;
    profileBtn.addEventListener("click", () => {
      location.href = "admin.html";  // ✅ กดแล้วไป admin.html
    });
  }
});

// ✅ การตั้งค่าดอกเบี้ย
const INTEREST_CONFIG = {
  GRACE_PERIOD_MONTHS: 3,  // 3 เดือนไม่คิดดอกเบี้ย
  INTEREST_RATE_PER_MONTH: 2,  // 2% ต่อเดือน
  COMPOUND_INTEREST: false  // ดอกเบี้ยเดี่ยว
};

// ✅ ฟังก์ชันคำนวณดอกเบี้ย (แก้ไขปี พ.ศ./ค.ศ. + บอกจำนวนวัน)
function calculateInterest(billDate, originalAmount) {
  const today = new Date();
  let billCreatedDate = new Date(billDate);
  
  // 🔥 แปลงปี พ.ศ. เป็น ค.ศ.
  if (billCreatedDate.getFullYear() > 2100) {
    billCreatedDate.setFullYear(billCreatedDate.getFullYear() - 543);
  }
  
  console.log(`📅 วันที่บิล: ${billCreatedDate.toLocaleDateString('th-TH')}`);
  console.log(`📅 วันนี้: ${today.toLocaleDateString('th-TH')}`);
  
  const daysDiff = Math.floor((today - billCreatedDate) / (1000 * 60 * 60 * 24));
  const monthsDiff = Math.floor(daysDiff / 30);
  
  console.log(`📊 ต่างกัน: ${daysDiff} วัน (${monthsDiff} เดือน)`);
  
  // ถ้ายังไม่ถึง 3 เดือน
  if (monthsDiff < INTEREST_CONFIG.GRACE_PERIOD_MONTHS) {
    const graceDaysRemaining = (INTEREST_CONFIG.GRACE_PERIOD_MONTHS * 30) - daysDiff;
    
    return {
      isOverdue: false,
      overdueMonths: 0,
      interestAmount: 0,
      totalAmount: originalAmount,
      gracePeriodRemaining: INTEREST_CONFIG.GRACE_PERIOD_MONTHS - monthsDiff,
      graceDaysRemaining: Math.max(0, graceDaysRemaining),
      daysSinceCreated: daysDiff
    };
  }
  
  // คำนวณเดือนที่เกิน
  const overdueMonths = monthsDiff - INTEREST_CONFIG.GRACE_PERIOD_MONTHS;
  
  let interestAmount = 0;
  
  if (INTEREST_CONFIG.COMPOUND_INTEREST) {
    // ดอกเบี้ยทบต้น
    const monthlyRate = INTEREST_CONFIG.INTEREST_RATE_PER_MONTH / 100;
    interestAmount = originalAmount * (Math.pow(1 + monthlyRate, overdueMonths) - 1);
  } else {
    // ดอกเบี้ยเดี่ยว
    interestAmount = originalAmount * (INTEREST_CONFIG.INTEREST_RATE_PER_MONTH / 100) * overdueMonths;
  }
  
  return {
    isOverdue: true,
    overdueMonths: overdueMonths,
    totalMonths: monthsDiff,
    interestAmount: Math.round(interestAmount),
    totalAmount: Math.round(originalAmount + interestAmount),
    gracePeriodRemaining: 0,
    graceDaysRemaining: 0,
    daysSinceCreated: daysDiff
  };
}

function showModal(title, content) {
  // ลบ Modal เดิม (ถ้ามี)
  const existingModal = document.getElementById('customModal');
  if (existingModal) {
    existingModal.remove();
  }

  // สร้าง Modal ใหม่
  const modal = document.createElement('div');
  modal.id = 'customModal';
  modal.className = 'custom-modal'; // เพิ่ม class
  
  modal.innerHTML = `
    <div class="custom-modal-backdrop" onclick="this.parentElement.remove()">
      <div class="custom-modal-content" onclick="event.stopPropagation()">
        <button class="custom-modal-close" onclick="document.getElementById('customModal').remove()">×</button>
        <h3 class="custom-modal-title">${title}</h3>
        <div class="custom-modal-body">${content}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ✅ ฟังก์ชันโหลดลูกค้าทั้งหมด
async function loadAllCustomers(username) {
  const customers = await window.api.getCustomers(username);
  displayCustomers(customers);
  clearActiveButtons();
}

// ✅ ฟังก์ชันโหลดลูกค้าตามประเภท (เงินสด หรือ ค้างชำระ)
async function loadCustomersByType(username, customerType) {
  const customers = await window.api.getCustomers(username);
  const filteredCustomers = customers.filter(customer => customer.customer_type === customerType);
  displayCustomers(filteredCustomers);
}

// ✅ ฟังก์ชันแสดงรายการลูกค้า
function displayCustomers(customers) {
  const container = document.getElementById("customer-list");
  container.innerHTML = ''; // ล้างข้อมูลเก่า

  if (customers.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 50px;">ไม่พบข้อมูลลูกค้า</p>';
    return;
  }

  customers.forEach((customer) => {
    const div = document.createElement("div");
    div.classList.add("customer-card");
    
    // เพิ่มคลาสตามประเภทลูกค้า
    if (customer.customer_type === 'เงินสด') {
      div.classList.add("customer-type-cash");
    } else {
      div.classList.add("customer-type-credit");
    }
    
    // แสดงข้อมูลพร้อมประเภทลูกค้า
    const customerTypeLabel = customer.customer_type === 'เงินสด' ? 
      '<span class="customer-badge badge-cash">💰 เงินสด</span>' : 
      '<span class="customer-badge badge-credit">⏰ ค้างชำระ</span>';
    
    div.innerHTML = `
      <p><strong>ชื่อ:</strong> ${customer.name}</p>
      <p><strong>ที่อยู่:</strong> ${customer.address}</p>
      <p><strong>เบอร์:</strong> ${customer.phone}</p>
      <p><strong>ประเภท:</strong> ${customerTypeLabel}</p>
      <p><strong>ยอดค้างชำระ:</strong> ${customer.outstanding_balance} บาท</p>
    `;
    div.onclick = () => showPopup(customer);
    container.appendChild(div);
  });
}

// ✅ ตั้งปุ่มให้เป็น active
function setActiveButton(activeBtn) {
  // ลบ active class จากทุกปุ่ม
  clearActiveButtons();
  // เพิ่ม active class ให้ปุ่มที่เลือก
  activeBtn.classList.add('active');
}

// ✅ ล้าง active class จากทุกปุ่ม
function clearActiveButtons() {
  const buttons = document.querySelectorAll('.sidebar .user');
  buttons.forEach(btn => btn.classList.remove('active'));
}

// ✅ แสดง popup ค้นหาลูกค้าเพื่อจ่ายเงิน
async function showPaymentSearchPopup() {
  // ลบ popup เก่าก่อน
  const existingPopup = document.getElementById("payment-search-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "payment-search-popup";
  popup.className = "payment-search-popup"; // ใช้ class แทน inline style

  popup.innerHTML = `
    <div class="payment-popup-content">
      <div class="payment-popup-header">
        <h2>💳 จ่ายเงินค้างชำระ</h2>
        <span class="payment-popup-close" onclick="closePaymentSearchPopup()">&times;</span>
      </div>
      
      <div class="payment-popup-body">
        <div class="search-section">
          <label class="search-label">🔍 ค้นหาลูกค้า:</label>
          <div class="search-input-group">
            <input type="text" id="customer-search-input" 
                   placeholder="กรอกชื่อลูกค้าที่ต้องการค้นหา..."
                   class="search-input" />
            <button onclick="searchCustomerForPayment()" class="search-button">
              ค้นหา
            </button>
          </div>
        </div>
        
        <div id="customer-bills-container" class="bills-container">
          <p class="placeholder-text">
            กรุณาค้นหาลูกค้าเพื่อดูบิลที่ค้างชำระ
          </p>
        </div>
      </div>
      
      <div class="payment-popup-footer">
        <button onclick="closePaymentSearchPopup()" class="close-button">
          ปิด
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Focus ที่ input field
  setTimeout(() => {
    document.getElementById("customer-search-input").focus();
  }, 100);

  // เพิ่ม Enter key listener
  document.getElementById("customer-search-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchCustomerForPayment();
    }
  });
}

// ✅ ค้นหาลูกค้าและแสดงบิลที่ค้างชำระ
async function searchCustomerForPayment() {  
  const searchTerm = document.getElementById("customer-search-input").value.trim();
  const container = document.getElementById("customer-bills-container");
  
  if (!searchTerm) {
    container.innerHTML = '<p class="placeholder-text">กรุณากรอกชื่อลูกค้า</p>';
    return;
  }

  try {
    container.innerHTML = '<p class="loading-text">🔍 กำลังค้นหา...</p>';
    
    const username = localStorage.getItem("username");
    const customers = await window.api.getCustomers(username);
    
    // ค้นหาลูกค้าที่ตรงกับชื่อ
    const matchingCustomers = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      customer.customer_type === 'ค้างชำระ' &&
      customer.outstanding_balance > 0
    );

    if (matchingCustomers.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <p>ไม่พบลูกค้าที่ค้างชำระ</p>
          <small>ชื่อ: "${searchTerm}"</small>
        </div>
      `;
      return;
    }

    // แสดงลูกค้าที่พบพร้อมข้อมูลโดยละเอียด
    let html = '';
    for (const customer of matchingCustomers) {
      // ดึงประวัติบิลของลูกค้า
      const bills = await window.api.getBillHistory(customer.id);
      const unpaidBills = bills.filter(bill => 
        bill.status !== 'จ่ายครบ' && 
        (bill.total_amount - (bill.amount_paid || 0)) > 0
      );

      html += `
        <div class="customer-detail-card">
          <div class="customer-header">
            <h3>👤 ${customer.name}</h3>
            <div class="customer-info-grid">
              <p><strong>📍 ที่อยู่:</strong> ${customer.address}</p>
              <p><strong>📞 เบอร์:</strong> ${customer.phone}</p>
              <p><strong>💰 ยอดค้างชำระรวม:</strong> 
                <span class="amount-highlight">฿${Number(customer.outstanding_balance).toLocaleString()}</span>
              </p>
              <p><strong>📋 จำนวนบิลค้าง:</strong> ${unpaidBills.length} บิล</p>
            </div>
          </div>
          
          <div class="customer-bills">
            ${unpaidBills.length === 0 ? 
              '<p class="no-bills">ไม่มีบิลค้างชำระ</p>' :
              `
                <h4 class="bills-title">📋 รายการบิลที่ค้างชำระ:</h4>
                ${unpaidBills.map((bill, index) => {
                  const remaining = bill.total_amount - (bill.amount_paid || 0);
                  const interestInfo = calculateInterest(bill.created_at, remaining);
                  const totalWithInterest = interestInfo.totalAmount;
                  const amountPaid = bill.amount_paid || 0;
                  
                  return `
                    <div class="bill-card ${index % 2 === 0 ? 'even' : 'odd'}">
                      <div class="bill-content">
                        <div class="bill-info">
                          <div class="bill-header">
                            <span class="bill-badge ${interestInfo.isOverdue ? 'overdue' : 'normal'}">
                              บิล #${bill.bill_number || bill.id} ${interestInfo.isOverdue ? '⚠️' : ''}
                            </span>
                            <span class="bill-date">
                              📅 ${new Date(bill.created_at).toLocaleDateString('th-TH')}
                            </span>
                          </div>
                           
                          <div class="bill-amounts">
                            <div class="amount-item">
                              <span class="amount-label">💰 ยอดรวม:</span>
                              <strong class="amount-value">฿${Number(bill.total_amount).toLocaleString()}</strong>
                            </div>
                            <div class="amount-item">
                              <span class="amount-label">💸 จ่ายแล้ว:</span>
                              <strong class="amount-paid">฿${Number(amountPaid).toLocaleString()}</strong>
                            </div>
                            <div class="amount-item">
                              <span class="amount-label">🔴 คงค้าง:</span>
                              <strong class="amount-remaining">฿${Number(remaining).toLocaleString()}</strong>
                            </div>
                            ${interestInfo.isOverdue ? `
                             <div class="amount-item">
                                <span class="amount-label">💸 ดอกเบี้ย:</span>
                                 <strong class="interest-amount">฿${Number(interestInfo.interestAmount).toLocaleString()}</strong>
                            </div>
                            <div class="amount-item">
                               <span class="amount-label">🔥 รวมจ่าย:</span>
                                <strong class="total-payment">฿${Number(totalWithInterest).toLocaleString()}</strong>
                             </div>
                             ` : `
                             <div class="amount-item">
                               <span class="amount-label">✅ สถานะ:</span>
                               <strong class="no-interest">ยังไม่มีดอกเบี้ย</strong>
                             </div>
                             <div class="amount-item">
                              <span class="amount-label">⏰ เหลือเวลา:</span>
                              <strong class="grace-period">${interestInfo.graceDaysRemaining} วัน</strong>
                             </div>
                            `}
                          </div>
                        </div>
                        
                        <div class="bill-actions">
                          <button onclick="paySpecificBill(${customer.id}, ${bill.id}, ${interestInfo.isOverdue ? totalWithInterest : remaining}, '${customer.name}', '${bill.bill_number || bill.id}')"
                                  class="pay-full-btn">
                            ✅ เคลียร์บิลนี้
                          </button>
                          <button onclick="payPartialBill(${customer.id}, ${bill.id}, ${interestInfo.isOverdue ? totalWithInterest : remaining}, '${customer.name}', '${bill.bill_number || bill.id}')"
                                  class="pay-partial-btn">
                            💰 จ่ายบางส่วน
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
                
                <div class="pay-all-section">
                  <p class="pay-all-title">💳 ชำระหนี้ทั้งหมดของ ${customer.name}</p>
                  <button onclick="payAllCustomerDebt(${customer.id}, '${customer.name}', ${customer.outstanding_balance})"
                          class="pay-all-btn">
                    จ่ายทั้งหมด ฿${Number(customer.outstanding_balance).toLocaleString()}
                  </button>
                </div>
              `
            }
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `
      <div class="error-message">
        <p>เกิดข้อผิดพลาด: ${error.message}</p>
      </div>
    `;
  }
}

// ✅ จ่ายเคลียร์บิลเฉพาะ - แสดงข้อมูลโดยละเอียดก่อนจ่าย
function paySpecificBill(customerId, billId, amount, customerName, billNumber) {
  window.api.getBillDetails(billId).then(billDetails => {
    let itemsList = '';
    if (billDetails.items && billDetails.items.length > 0) {
      itemsList = billDetails.items.map((item, index) => 
        `${index + 1}. ${item.product_name} (${item.quantity} x ฿${Number(item.price).toLocaleString()}) = ฿${Number(item.quantity * item.price).toLocaleString()}`
      ).join('\n');
    }
    
    const confirmMessage = 
      `📋 ข้อมูลบิลที่จะเคลียร์:\n\n` +
      `👤 ลูกค้า: ${customerName}\n` +
      `🧾 บิล #${billNumber}\n` +
      `📅 วันที่: ${new Date(billDetails.created_at || billDetails.date).toLocaleDateString('th-TH')}\n` +
      `💰 ยอดรวม: ฿${Number(billDetails.total_amount).toLocaleString()}\n` +
      `💸 จ่ายแล้ว: ฿${Number(billDetails.amount_paid || 0).toLocaleString()}\n` +
      `🔴 คงค้าง: ฿${Number(amount).toLocaleString()}\n\n` +
      `📦 รายการสินค้า:\n${itemsList || 'ไม่มีข้อมูลสินค้า'}\n\n` +
      `✅ ยืนยันการเคลียร์บิลนี้ทั้งหมด?`;
    
    showBeautifulConfirm(confirmMessage, (confirmed) => {
      if (confirmed) {
        // อัปเดตสถานะบิลเป็น "จ่ายครบ"
        updateBillStatus(billId, 'จ่ายครบ', billDetails.total_amount).then(() => {
          // ลดยอดค้างชำระของลูกค้า
          return reduceCustomerBalance(customerId, amount);
        }).then(() => {
          showBeautifulSuccess(
            `เคลียร์บิล #${billNumber} เรียบร้อย!`,
            `จ่าย: ฿${Number(amount).toLocaleString()}\nบิลนี้เปลี่ยนเป็นสถานะ "จ่ายครบ"`
          );
          
          // รีเฟรชข้อมูล
          searchCustomerForPayment();
          const username = localStorage.getItem("username");
          loadAllCustomers(username);
        }).catch(error => {
          showBeautifulError("เกิดข้อผิดพลาด", error.message);
        });
      }
    });
  }).catch(error => {
    showBeautifulError("เกิดข้อผิดพลาด", error.message);
  });
}

// ✅ จ่ายบางส่วนของบิล - แสดงข้อมูลโดยละเอียดก่อนจ่าย
function payPartialBill(customerId, billId, maxAmount, customerName, billNumber) {
  window.api.getBillDetails(billId).then(billDetails => {
    let itemsList = '';
    if (billDetails.items && billDetails.items.length > 0) {
      itemsList = billDetails.items.map((item, index) => 
        `${index + 1}. ${item.product_name} (${item.quantity} x ฿${Number(item.price).toLocaleString()}) = ฿${Number(item.quantity * item.price).toLocaleString()}`
      ).join('\n');
    }
    
    const billInfo = 
      `📋 ข้อมูลบิลที่จะจ่าย:\n\n` +
      `👤 ลูกค้า: ${customerName}\n` +
      `🧾 บิล #${billNumber}\n` +
      `📅 วันที่: ${new Date(billDetails.created_at || billDetails.date).toLocaleDateString('th-TH')}\n` +
      `💰 ยอดรวม: ฿${Number(billDetails.total_amount).toLocaleString()}\n` +
      `💸 จ่ายแล้ว: ฿${Number(billDetails.amount_paid || 0).toLocaleString()}\n` +
      `🔴 คงค้าง: ฿${Number(maxAmount).toLocaleString()}\n\n` +
      `📦 รายการสินค้า:\n${itemsList || 'ไม่มีข้อมูลสินค้า'}\n\n` +
      `💵 กรุณาใส่จำนวนเงินที่จ่าย (สูงสุด ฿${Number(maxAmount).toLocaleString()}):`;
    
    showBeautifulPrompt(billInfo, '', (paymentAmount) => {
      if (paymentAmount === null) return;
      
      const amount = parseFloat(paymentAmount);
      
      if (isNaN(amount) || amount <= 0) {
        showBeautifulError("ข้อมูลไม่ถูกต้อง", "กรุณาใส่จำนวนเงินที่ถูกต้อง");
        return;
      }
      
      if (amount > maxAmount) {
        showBeautifulError("ข้อมูลไม่ถูกต้อง", "จำนวนเงินที่จ่ายไม่สามารถมากกว่ายอดค้างชำระได้");
        return;
      }
      
      const newAmountPaid = (billDetails.amount_paid || 0) + amount;
      const remainingBillAmount = billDetails.total_amount - newAmountPaid;
      const newStatus = remainingBillAmount <= 0 ? 'จ่ายครบ' : 'ค้างชำระ';
      
      const confirmMessage = 
        `📝 สรุปการจ่ายเงิน:\n\n` +
        `👤 ลูกค้า: ${customerName}\n` +
        `🧾 บิล #${billNumber}\n` +
        `💵 จ่ายครั้งนี้: ฿${Number(amount).toLocaleString()}\n` +
        `💸 จ่ายรวม: ฿${Number(newAmountPaid).toLocaleString()}\n` +
        `🔴 เหลือในบิล: ฿${Number(remainingBillAmount).toLocaleString()}\n` +
        `📊 สถานะบิล: ${newStatus}\n\n` +
        `✅ ยืนยันการจ่ายเงิน?`;
      
      showBeautifulConfirm(confirmMessage, (confirmed) => {
        if (confirmed) {
          // อัปเดตข้อมูลการจ่ายเงินในบิล
          updateBillStatus(billId, newStatus, newAmountPaid).then(() => {
            // ลดยอดค้างชำระของลูกค้า
            return reduceCustomerBalance(customerId, amount);
          }).then(() => {
            showBeautifulSuccess(
              `บันทึกการจ่ายเงินเรียบร้อย!`,
              `บิล #${billNumber}\n` +
              `จ่ายครั้งนี้: ฿${Number(amount).toLocaleString()}\n` +
              `เหลือในบิล: ฿${Number(remainingBillAmount).toLocaleString()}\n` +
              `สถานะ: ${newStatus}`
            );
            
            searchCustomerForPayment();
            const username = localStorage.getItem("username");
            loadAllCustomers(username);
          }).catch(error => {
            showBeautifulError("เกิดข้อผิดพลาด", error.message);
          });
        }
      });
    });
  }).catch(error => {
    showBeautifulError("เกิดข้อผิดพลาด", error.message);
  });
}

// ✅ จ่ายหนี้ทั้งหมดของลูกค้า
function payAllCustomerDebt(customerId, customerName, totalAmount) {
  const confirmMessage = 
    `💳 ยืนยันการจ่ายหนี้ทั้งหมด?\n\n` +
    `👤 ลูกค้า: ${customerName}\n` +
    `💰 ยอดรวม: ฿${Number(totalAmount).toLocaleString()}\n\n` +
    `🔥 จะเคลียร์บิลทั้งหมดของลูกค้าคนนี้\n` +
    `✅ ยืนยัน?`;
  
  showBeautifulConfirm(confirmMessage, (confirmed) => {
    if (confirmed) {
      // เคลียร์ทุกบิลของลูกค้า
      clearAllCustomerBills(customerId).then(() => {
        // ตั้งยอดค้างชำระเป็น 0
        return window.api.updateCustomerBalance(customerId, 0);
      }).then(() => {
        showBeautifulSuccess(
          `จ่ายหนี้ครบแล้ว!`,
          `${customerName} ไม่มีหนี้ค้างชำระแล้ว\nบิลทั้งหมดเปลี่ยนเป็นสถานะ "จ่ายครบ"`
        );
        
        searchCustomerForPayment();
        const username = localStorage.getItem("username");
        loadAllCustomers(username);
      }).catch(error => {
        showBeautifulError("เกิดข้อผิดพลาด", error.message);
      });
    }
  });
}

// ✅ ปิด popup ค้นหาการจ่ายเงิน
function closePaymentSearchPopup() {
  const popup = document.getElementById("payment-search-popup");
  if (popup) {
    popup.remove();
  }
}

// ✅ แสดง popup สำหรับจ่ายเงินค้างชำระ
async function showPaymentPopup(username) {
  const customers = await window.api.getCustomers(username);
  const creditCustomers = customers.filter(customer => 
    customer.customer_type === 'ค้างชำระ' && customer.outstanding_balance > 0
  );

  const popup = document.getElementById("payment-popup");
  const info = document.getElementById("payment-info");

  if (creditCustomers.length === 0) {
    info.innerHTML = '<p style="text-align: center; color: #666;">ไม่มีลูกค้าค้างชำระ</p>';
  } else {
    let html = '';
    creditCustomers.forEach(customer => {
      html += `
        <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">
          <p><strong>${customer.name}</strong></p>
          <p>ยอดค้างชำระ: ${customer.outstanding_balance} บาท</p>
          <button onclick="payCustomerDebt(${customer.id}, ${customer.outstanding_balance})">
            จ่ายหนี้ทั้งหมด
          </button>
        </div>
      `;
    });
    info.innerHTML = html;
  }

  popup.classList.remove("hidden");
}

// ✅ จ่ายหนี้ลูกค้า
async function payCustomerDebt(customerId, amount) {
  const confirmed = confirm(`คุณต้องการจ่ายหนี้จำนวน ${amount} บาท ใช่หรือไม่?`);
  if (confirmed) {
    await window.api.updateCustomerBalance(customerId, 0); // ตั้งยอดค้างชำระเป็น 0
    alert("จ่ายหนี้เรียบร้อยแล้ว");
    closePaymentPopup();
    // โหลดข้อมูลใหม่
    const username = localStorage.getItem("username");
    loadAllCustomers(username);
  }
}

// ✅ ปิด popup การจ่ายเงิน
function closePaymentPopup() {
  document.getElementById("payment-popup").classList.add("hidden");
}

// ✅ popup แสดงรายละเอียดลูกค้า
function showPopup(customer) {
  const popup = document.getElementById("popup");
  const info = document.getElementById("popup-info");

  const customerTypeLabel = customer.customer_type === 'เงินสด' ? '💰 เงินสด' : '⏰ ค้างชำระ';

  // สร้างปุ่มประวัติสำหรับทุกประเภทลูกค้า
  const historyButtons = `
    <button id="bill-history-btn">📋 ดูประวัติบิล</button>
    ${customer.customer_type === 'ค้างชำระ' ? 
      '<button id="payment-history-btn">💳 ดูประวัติการจ่ายเงิน</button>' : ''
    }
  `;

  info.innerHTML = `
    <div style="margin-bottom: 20px;">
      <p><strong>ชื่อ:</strong> ${customer.name}</p>
      <p><strong>ที่อยู่:</strong> 
        <input type="text" id="edit-address" value="${customer.address}" 
               style="width: 100%; padding: 5px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;" />
      </p>
      <p><strong>เบอร์โทร:</strong> 
        <input type="text" id="edit-phone" value="${customer.phone}" 
               style="width: 100%; padding: 5px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;" />
      </p>
      <p><strong>ประเภท:</strong> ${customerTypeLabel}</p>
      <p><strong>ยอดค้างชำระ:</strong> ${customer.outstanding_balance} บาท</p>
      <p><strong>วันที่สร้าง:</strong> ${customer.created_at}</p>
    </div>
    
    <div style="margin: 15px 0; text-align: center;">
      <button id="save-btn" style="
        padding: 10px 20px; 
        background-color: #28a745; 
        color: white; 
        border: none; 
        border-radius: 5px; 
        cursor: pointer;
        font-size: 14px;
        margin-right: 10px;
      ">💾 บันทึกการแก้ไข</button>
    </div>
    
    <div style="margin: 15px 0; text-align: center;">
      ${historyButtons}
    </div>
    
    <div style="margin-top: 15px; text-align: center;">
      <button onclick="closePopup()" style="
        padding: 10px 20px; 
        background-color: #6c757d; 
        color: white; 
        border: none; 
        border-radius: 5px; 
        cursor: pointer;
        font-size: 14px;
      ">❌ ปิด</button>
    </div>
  `;

  // ✅ ฟังก์ชันบันทึกข้อมูลที่แก้ไข (เฉพาะที่อยู่และเบอร์โทร)
  document.getElementById("save-btn").addEventListener("click", async () => {
    const newAddress = document.getElementById("edit-address").value.trim();
    const newPhone = document.getElementById("edit-phone").value.trim();
    
    // ตรวจสอบข้อมูล
    if (!newAddress) {
      alert("กรุณากรอกที่อยู่");
      return;
    }
    
    if (!newPhone) {
      alert("กรุณากรอกเบอร์โทร");
      return;
    }

    try {
      // เรียก API เพื่ออัปเดตข้อมูลลูกค้า
      await window.api.updateCustomerInfo(customer.id, {
        address: newAddress,
        phone: newPhone
      });
      
      alert("บันทึกข้อมูลเรียบร้อย");
      closePopup();
      
      // โหลดข้อมูลลูกค้าใหม่
      const username = localStorage.getItem("username");
      loadAllCustomers(username);
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  });

  // ✅ ฟังก์ชันดูประวัติบิล (สำหรับทุกประเภทลูกค้า)
  const billHistoryBtn = document.getElementById("bill-history-btn");
  if (billHistoryBtn) {
    billHistoryBtn.addEventListener("click", async () => {
      await showBillHistory(customer.id, customer.name);
    });
  }

  // ✅ ฟังก์ชันดูประวัติการจ่ายเงิน (เฉพาะลูกค้าค้างชำระ)
  const paymentHistoryBtn = document.getElementById("payment-history-btn");
  if (paymentHistoryBtn) {
    paymentHistoryBtn.addEventListener("click", async () => {
      await showPaymentHistory(customer.id, customer.name);
    });
  }

  popup.classList.remove("hidden");
}

// ✅ ปิด popup
function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// ✅ แสดงประวัติบิลของลูกค้า
async function showBillHistory(customerId, customerName) {
  try {
    const bills = await window.api.getBillHistory(customerId);
    
    const popup = document.createElement("div");
    popup.id = "bill-history-popup";
    popup.className = "popup";
    popup.innerHTML = `
      <div class="popup-content" style="width: 500px; max-height: 80vh;">
        <span class="close" onclick="closeBillHistory()">&times;</span>
        <h2>📋 ประวัติบิลของ ${customerName}</h2>
        <div id="bill-history-content">
          ${bills.length === 0 ? 
            '<p style="text-align: center; color: #666;">ไม่มีประวัติบิล</p>' : 
            bills.map(bill => `
              <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <p><strong>เลขที่บิล:</strong> ${bill.bill_number || bill.id}</p>
                <p><strong>วันที่:</strong> ${bill.created_at}</p>
                <p><strong>ยอดรวม:</strong> ${bill.total_amount} บาท</p>
                <p><strong>สถานะ:</strong> ${bill.status || 'ค้างชำระ'}</p>
                <button onclick="viewBillDetails(${bill.id})">ดูรายละเอียด</button>
              </div>
            `).join('')
          }
        </div>
        <button onclick="closeBillHistory()" style="margin-top: 10px;">ปิด</button>
      </div>
    `;
    
    document.body.appendChild(popup);
  } catch (error) {
    alert("ไม่สามารถโหลดประวัติบิลได้: " + error.message);
  }
}

// ✅ แสดงประวัติการจ่ายเงิน (ดึงข้อมูลจากบิลแทน)
async function showPaymentHistory(customerId, customerName) {
  try {
    console.log('🔍 กำลังค้นหาประวัติของ:', customerName, 'ID:', customerId);
    
    // ดึงข้อมูลลูกค้า
    const username = localStorage.getItem("username");
    const customers = await window.api.getCustomers(username);
    const customer = customers.find(c => c.id === customerId);
    
    // ดึงประวัติบิลทั้งหมด
    const allBills = await window.api.getBillHistory(customerId);
    
    // สร้างประวัติการจ่ายเงินจากบิลที่มีการจ่าย
    let paymentHistory = [];
    
    allBills.forEach(bill => {
      const amountPaid = bill.amount_paid || 0;
      const totalAmount = bill.total_amount || 0;
      
      if (amountPaid > 0) {
        // ถ้าจ่ายครบ - สร้าง 1 รายการ
        if (bill.status === 'จ่ายครบ') {
          paymentHistory.push({
            id: `bill_${bill.id}_full`,
            bill_id: bill.id,
            bill_number: bill.bill_number || bill.id,
            amount: amountPaid,
            total_amount: totalAmount,
            payment_type: 'เคลียร์บิลทั้งหมด',
            date: bill.updated_at || bill.created_at,
            note: `เคลียร์บิล #${bill.bill_number || bill.id} ทั้งหมด`
          });
        } 
        // ถ้าจ่ายบางส่วน
        else if (amountPaid < totalAmount && amountPaid > 0) {
          paymentHistory.push({
            id: `bill_${bill.id}_partial`,
            bill_id: bill.id,
            bill_number: bill.bill_number || bill.id,
            amount: amountPaid,
            total_amount: totalAmount,
            payment_type: 'จ่ายบางส่วน',
            date: bill.updated_at || bill.created_at,
            note: `จ่ายบางส่วนบิล #${bill.bill_number || bill.id} (เหลือ ฿${(totalAmount - amountPaid).toLocaleString()})`
          });
        }
      }
    });

    // เรียงตามวันที่ใหม่สุดก่อน
    paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    let paymentHistoryHTML = '<div style="max-height: 500px; overflow-y: auto;">';
    paymentHistoryHTML += '<h4 style="margin: 0 0 20px 0; color: #333; text-align: center;">📋 ประวัติการจ่ายเงินของ ' + customerName + '</h4>';

    // แสดงข้อมูลลูกค้าปัจจุบัน
    const currentBalance = customer ? (customer.outstanding_balance || 0) : 0;
    
    paymentHistoryHTML += '<div style="background: linear-gradient(135deg, #6c757d, #495057); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">';
    paymentHistoryHTML += '<h5 style="margin: 0; font-size: 16px;">👤 ข้อมูลลูกค้าปัจจุบัน</h5>';
    paymentHistoryHTML += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 10px; font-size: 14px;">';
    
    if (customer) {
      paymentHistoryHTML += '<div><strong>🔴 ยอดค้าง</strong><br>฿' + Number(currentBalance).toLocaleString() + '</div>';
      if (customer.phone) {
        paymentHistoryHTML += '<div><strong>📞 เบอร์</strong><br>' + customer.phone + '</div>';
      }
      if (customer.address) {
        paymentHistoryHTML += '<div><strong>📍 ที่อยู่</strong><br>' + customer.address.substring(0, 20) + '...</div>';
      }
    }
    
    paymentHistoryHTML += '</div></div>';

    // ถ้าไม่มีประวัติการจ่าย
    if (!paymentHistory || paymentHistory.length === 0) {
      paymentHistoryHTML += '<div style="text-align: center; padding: 40px; color: #6c757d;">';
      paymentHistoryHTML += '<div style="font-size: 48px; margin-bottom: 15px;">💸</div>';
      paymentHistoryHTML += '<h5>ยังไม่มีประวัติการจ่ายเงิน</h5>';
      paymentHistoryHTML += '<p>ลูกค้าท่านนี้ยังไม่เคยจ่ายเงินเลย</p>';
      paymentHistoryHTML += '</div>';
    } else {
      // คำนวณยอดรวมที่จ่าย
      const totalPaid = paymentHistory.reduce((sum, payment) => {
        const amount = parseFloat(payment.amount) || 0;
        return sum + amount;
      }, 0);
      
      // สรุปยอดการจ่าย
      paymentHistoryHTML += '<div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">';
      paymentHistoryHTML += '<h5 style="margin: 0; font-size: 16px;">💰 สรุปการจ่ายเงิน</h5>';
      paymentHistoryHTML += '<div style="font-size: 24px; font-weight: bold; margin-top: 5px;">฿' + Number(totalPaid).toLocaleString() + '</div>';
      paymentHistoryHTML += '<small>จากการจ่าย ' + paymentHistory.length + ' ครั้ง</small>';
      paymentHistoryHTML += '</div>';

      // แสดงรายการการจ่ายเงิน
      paymentHistory.forEach((payment, index) => {
        const paymentDate = new Date(payment.date).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        paymentHistoryHTML += '<div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: ' + (index % 2 === 0 ? '#f8f9fa' : '#ffffff') + '; transition: all 0.2s;" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,0.1)\'" onmouseout="this.style.boxShadow=\'none\'">';
        
        paymentHistoryHTML += '<div style="display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: center;">';
        
        // ซ้าย - ข้อมูลการจ่าย
        paymentHistoryHTML += '<div>';
        
        // หัวข้อ
        paymentHistoryHTML += '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">';
        paymentHistoryHTML += '<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">💸 ' + payment.payment_type + '</span>';
        paymentHistoryHTML += '<span style="color: #6c757d; font-size: 14px;">📅 ' + paymentDate + '</span>';
        paymentHistoryHTML += '</div>';
        
        // รายละเอียด
        paymentHistoryHTML += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 14px;">';
        
        // ยอดจ่าย
        paymentHistoryHTML += '<div><span style="color: #6c757d;">💰 ยอดจ่าย:</span><br>';
        paymentHistoryHTML += '<strong style="color: #28a745; font-size: 16px;">฿' + Number(parseFloat(payment.amount) || 0).toLocaleString() + '</strong></div>';
        
        // บิลที่เกี่ยวข้อง
        paymentHistoryHTML += '<div><span style="color: #6c757d;">🧾 บิล #:</span><br>';
        paymentHistoryHTML += '<strong style="color: #007bff;">' + payment.bill_number + '</strong></div>';
        
        // ยอดรวมบิล
        if (payment.total_amount) {
          paymentHistoryHTML += '<div><span style="color: #6c757d;">📋 ยอดบิล:</span><br>';
          paymentHistoryHTML += '<strong style="color: #333;">฿' + Number(payment.total_amount).toLocaleString() + '</strong></div>';
        }
        
        paymentHistoryHTML += '</div>';
        
        // หมายเหตุ
        if (payment.note && payment.note.trim() !== '' && payment.note !== '-') {
          paymentHistoryHTML += '<div style="margin-top: 10px; padding: 8px 12px; background: #e9f7ef; border-radius: 6px; border-left: 4px solid #28a745;">';
          paymentHistoryHTML += '<small style="color: #155724;">📝 ' + payment.note + '</small>';
          paymentHistoryHTML += '</div>';
        }
        
        paymentHistoryHTML += '</div>'; // ปิด ซ้าย
        
        // ขวา - ไอคอนสถานะ
        paymentHistoryHTML += '<div style="text-align: center;">';
        paymentHistoryHTML += '<div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #28a745, #20c997); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">✓</div>';
        paymentHistoryHTML += '<small style="color: #6c757d; margin-top: 5px; display: block;">จ่ายแล้ว</small>';
        paymentHistoryHTML += '</div>';
        
        paymentHistoryHTML += '</div>'; // ปิด grid
        paymentHistoryHTML += '</div>'; // ปิด container
      });
    }

    paymentHistoryHTML += '</div>';

    // แสดงใน Modal
    showModal('ประวัติการจ่ายเงิน', paymentHistoryHTML);

  } catch (error) {
    console.error('❌ Error loading payment history:', error);
    showModal('เกิดข้อผิดพลาด', 
      '<div style="text-align: center; color: #dc3545; padding: 20px;">' +
      '<div style="font-size: 48px; margin-bottom: 15px;">❌</div>' +
      '<h5>ไม่สามารถโหลดประวัติการจ่ายเงินได้</h5>' +
      '<p>กรุณาลองใหม่อีกครั้ง</p>' +
      '<small style="color: #6c757d;">รายละเอียด: ' + error.message + '</small>' +
      '</div>'
    );
  }
}

// ✅ ดูรายละเอียดบิล
async function viewBillDetails(billId) {
  try {
    const billDetails = await window.api.getBillDetails(billId);
    console.log('Bill Details:', billDetails);
    
    // ปิด popup เก่าก่อน (ถ้ามี)
    const existingPopup = document.getElementById('bill-details-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // สร้าง popup ใหม่สำหรับแสดงรายละเอียดบิล
    const popup = document.createElement("div");
    popup.id = "bill-details-popup";
    popup.className = "popup";
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    // สร้างตารางรายการสินค้า
    let itemsHTML = '';
    if (billDetails.items && Array.isArray(billDetails.items) && billDetails.items.length > 0) {
      itemsHTML = billDetails.items.map(item => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.product_name || 'ไม่ระบุ'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity || 0}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">฿${Number(item.price || 0).toLocaleString()}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">฿${Number((item.quantity || 0) * (item.price || 0)).toLocaleString()}</td>
        </tr>
      `).join('');
    } else {
      itemsHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666; border: 1px solid #ddd;">ไม่มีรายการสินค้า</td></tr>';
    }

    // คำนวณยอดเงิน
    const totalAmount = Number(billDetails.total_amount || 0);
    const amountPaid = Number(billDetails.amount_paid || 0);
    const outstanding = totalAmount - amountPaid;
    const isPaid = outstanding <= 0;

    popup.innerHTML = `
      <div style="
        background: white;
        border-radius: 10px;
        padding: 20px;
        width: 90%;
        max-width: 700px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333;">🧾 รายละเอียดบิล #${billDetails.id}</h2>
          <span onclick="document.getElementById('bill-details-popup').remove()" 
                style="font-size: 24px; cursor: pointer; color: #666; hover: color: #000;">&times;</span>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p style="margin: 5px 0;"><strong>ลูกค้า:</strong> ${billDetails.customer_name || 'ไม่ระบุ'}</p>
            <p style="margin: 5px 0;"><strong>วันที่:</strong> ${billDetails.date || billDetails.created_at || 'ไม่ระบุ'}</p>
            <p style="margin: 5px 0;"><strong>ยอดรวม:</strong> ฿${totalAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>จ่ายแล้ว:</strong> ฿${amountPaid.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>คงเหลือ:</strong> ฿${outstanding.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>สถานะ:</strong> 
              <span style="color: ${isPaid ? '#28a745' : '#dc3545'}; font-weight: bold;">
                ${isPaid ? "✅ จ่ายครบ" : "⏰ ค้างชำระ"}
              </span>
            </p>
          </div>
        </div>

        <h3 style="color: #333; margin-bottom: 15px;">📦 รายการสินค้า</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #e9ecef;">
                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">สินค้า</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">จำนวน</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">ราคาต่อหน่วย</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">รวม</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8f9fa; font-weight: bold;">
                <td colspan="3" style="padding: 12px; border: 1px solid #ddd; text-align: right;">ยอดรวมทั้งหมด:</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right; color: #007bff;">฿${totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button onclick="document.getElementById('bill-details-popup').remove()" 
                  style="
                    padding: 12px 24px; 
                    background-color: #007bff; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    cursor: pointer;
                    font-size: 16px;
                    transition: background-color 0.2s;
                  "
                  onmouseover="this.style.backgroundColor='#0056b3'"
                  onmouseout="this.style.backgroundColor='#007bff'">
            ปิด
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    
  } catch (error) {
    console.error('Error loading bill details:', error);
    alert("ไม่สามารถโหลดรายละเอียดบิลได้: " + error.message);
  }
}

// ✅ ปิด popup ประวัติบิล
function closeBillHistory() {
  const popup = document.getElementById("bill-history-popup");
  if (popup) {
    popup.remove();
  }
}

// ✅ ระบบ Popup สวยสำหรับ Confirm และ Prompt
function showBeautifulConfirm(message, callback) {
  const existingPopup = document.getElementById("beautiful-confirm-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "beautiful-confirm-popup";
  popup.className = "beautiful-popup";

  const lines = message.split('\n');
  const title = lines[0] || 'ยืนยันการทำรายการ';
  const content = lines.slice(1).join('\n');

  popup.innerHTML = `
    <div class="beautiful-popup-content">
      <div class="beautiful-popup-header confirm-header">
        <div class="beautiful-popup-icon">❓</div>
        <h2>${title}</h2>
      </div>
      <div class="beautiful-popup-body">${content}</div>
      <div class="beautiful-popup-actions">
        <button onclick="closeBeautifulConfirm(false)" class="btn-cancel">❌ ยกเลิก</button>
        <button onclick="closeBeautifulConfirm(true)" class="btn-confirm">✅ ยืนยัน</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  window.currentConfirmCallback = callback;
}

function closeBeautifulConfirm(result) {
  const popup = document.getElementById("beautiful-confirm-popup");
  if (popup) {
    popup.remove();
    if (window.currentConfirmCallback) {
      window.currentConfirmCallback(result);
      window.currentConfirmCallback = null;
    }
  }
}

// ✅ ระบบ Prompt สวย
function showBeautifulPrompt(message, defaultValue = '', callback) {
  const existingPopup = document.getElementById("beautiful-prompt-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "beautiful-prompt-popup";
  popup.className = "beautiful-popup";

  const lines = message.split('\n');
  const title = lines[0] || 'กรุณาใส่ข้อมูล';
  const content = lines.slice(1, -1).join('\n');
  const inputLabel = lines[lines.length - 1] || '';

  popup.innerHTML = `
    <div class="beautiful-popup-content">
      <div class="beautiful-popup-header prompt-header">
        <div class="beautiful-popup-icon">💬</div>
        <h2>${title}</h2>
      </div>
      <div class="beautiful-popup-body">
        <div class="prompt-content">${content}</div>
        <div class="prompt-input-group">
          <label class="prompt-label">${inputLabel}</label>
          <input type="text" id="prompt-input" value="${defaultValue}" 
                 class="prompt-input" placeholder="กรุณาใส่ข้อมูล..." />
        </div>
      </div>
      <div class="beautiful-popup-actions">
        <button onclick="closeBeautifulPrompt(null)" class="btn-cancel">❌ ยกเลิก</button>
        <button onclick="closeBeautifulPrompt('submit')" class="btn-confirm">✅ ยืนยัน</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  setTimeout(() => {
    const input = document.getElementById("prompt-input");
    input.focus();
    input.select();
    
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        closeBeautifulPrompt('submit');
      }
    });
  }, 100);

  window.currentPromptCallback = callback;
}

function closeBeautifulPrompt(action) {
  const popup = document.getElementById("beautiful-prompt-popup");
  if (popup) {
    const input = document.getElementById("prompt-input");
    const value = action === 'submit' ? input.value : null;
    
    popup.remove();
    if (window.currentPromptCallback) {
      window.currentPromptCallback(value);
      window.currentPromptCallback = null;
    }
  }
}

// ✅ ฟังก์ชัน showBeautifulSuccess และ showBeautifulError
function showBeautifulSuccess(title, message) {
  const existingPopup = document.getElementById("beautiful-success-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "beautiful-success-popup";
  popup.className = "beautiful-popup";

  popup.innerHTML = `
    <div class="beautiful-popup-content">
      <div class="beautiful-popup-header success-header">
        <div class="beautiful-popup-icon">✅</div>
        <h2>${title}</h2>
      </div>
      <div class="beautiful-popup-body">${message}</div>
      <div class="beautiful-popup-actions">
        <button onclick="closeBeautifulSuccess()" class="btn-success">ตกลง</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  
  setTimeout(() => {
    closeBeautifulSuccess();
  }, 3000);
}

function closeBeautifulSuccess() {
  const popup = document.getElementById("beautiful-success-popup");
  if (popup) {
    popup.remove();
  }
}

function showBeautifulError(title, message) {
  const existingPopup = document.getElementById("beautiful-error-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "beautiful-error-popup";
  popup.className = "beautiful-popup";

  popup.innerHTML = `
    <div class="beautiful-popup-content">
      <div class="beautiful-popup-header error-header">
        <div class="beautiful-popup-icon">❌</div>
        <h2>${title}</h2>
      </div>
      <div class="beautiful-popup-body">${message}</div>
      <div class="beautiful-popup-actions">
        <button onclick="closeBeautifulError()" class="btn-error">ตกลง</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
}

function closeBeautifulError() {
  const popup = document.getElementById("beautiful-error-popup");
  if (popup) {
    popup.remove();
  }
}

// ✅ Helper Functions สำหรับระบบจ่ายเงิน
async function updateBillStatus(billId, status, amountPaid) {
  try {
    if (window.api.updateBillStatus) {
      await window.api.updateBillStatus(billId, {
        status: status,
        amount_paid: amountPaid
      });
    } else {
      console.log(`Updating bill ${billId}: status=${status}, amount_paid=${amountPaid}`);
    }
  } catch (error) {
    console.error("Error updating bill status:", error);
    throw error;
  }
}

async function reduceCustomerBalance(customerId, reduceAmount) {
  try {
    const username = localStorage.getItem("username");
    const customers = await window.api.getCustomers(username);
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      throw new Error("ไม่พบข้อมูลลูกค้า");
    }
    
    const oldBalance = customer.outstanding_balance;
    const newBalance = Math.max(0, oldBalance - reduceAmount);
    
    console.log(`🔍 Debug การจ่ายเงิน:`);
    console.log(`- ลูกค้า ID: ${customerId}`);
    console.log(`- ยอดเดิม: ฿${oldBalance.toLocaleString()}`);
    console.log(`- จ่าย: ฿${reduceAmount.toLocaleString()}`);
    console.log(`- ยอดใหม่: ฿${newBalance.toLocaleString()}`);
    
    await window.api.updateCustomerBalance(customerId, newBalance);
    
    console.log(`✅ อัปเดตยอดค้างชำระเรียบร้อย`);
    
    return newBalance;
    
  } catch (error) {
    console.error("❌ Error reducing customer balance:", error);
    throw error;
  }
}

async function clearAllCustomerBills(customerId) {
  try {
    const bills = await window.api.getBillHistory(customerId);
    const unpaidBills = bills.filter(bill => bill.status !== 'จ่ายครบ');
    
    for (const bill of unpaidBills) {
      await updateBillStatus(bill.id, 'จ่ายครบ', bill.total_amount);
    }
    
    console.log(`✅ เคลียร์บิลทั้งหมด: ${unpaidBills.length} บิล`);
    
  } catch (error) {
    console.error("Error clearing all bills:", error);
    throw error;
  }
}

async function recalculateCustomerBalance(customerId) {
  try {
    const bills = await window.api.getBillHistory(customerId);
    const unpaidBills = bills.filter(bill => 
      bill.status !== 'จ่ายครบ' && 
      (bill.total_amount - (bill.amount_paid || 0)) > 0
    );
    
    let correctBalance = 0;
    unpaidBills.forEach(bill => {
      correctBalance += (bill.total_amount - (bill.amount_paid || 0));
    });
    
    await window.api.updateCustomerBalance(customerId, correctBalance);
    
    console.log(`🔄 คำนวณยอดใหม่: ฿${correctBalance} จากบิลที่เหลือ ${unpaidBills.length} บิล`);
    
    return correctBalance;
    
  } catch (error) {
    console.error("Error recalculating balance:", error);
    throw error;
  }
}

console.log("✅ ระบบจ่ายเงินที่ถูกต้องโหลดเรียบร้อย:");
console.log("- จ่ายทีละบิล: เปลี่ยนสถานะบิล + ลดยอดค้างชำระ");
console.log("- จ่ายบางส่วน: อัปเดต amount_paid + ลดยอดค้างชำระ"); 
console.log("- จ่ายทั้งหมด: เคลียร์ทุกบิล + ตั้งยอดเป็น 0");