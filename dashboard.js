document.addEventListener("DOMContentLoaded", async function () {
  const username = localStorage.getItem("username");
  
  if (!username) {
    location.href = "login.html"; // ถ้าไม่ได้ login กลับไปหน้า login
    return;
  }

  try {
    // ✅ โหลดข้อมูลสรุป
    const totalSales = await window.api.getSalesData(username);
    document.getElementById("total-sales").textContent = `฿${parseFloat(totalSales || 0).toLocaleString()}`;

    // 🔄 แก้ไข: ดึงข้อมูลลูกค้าและนับจาก customer_type แทน
    const customers = await window.api.getCustomers(username);
    
    // กรองลูกค้าที่ customer_type = 'ค้างชำระ'
    const pendingCustomers = customers.filter(customer => 
      customer.customer_type === 'ค้างชำระ'
    );
    
    // คำนวณยอดค้างชำระรวมจากลูกค้าประเภท 'ค้างชำระ'
    const totalDebt = pendingCustomers.reduce((sum, customer) => {
      return sum + (parseFloat(customer.outstanding_balance) || 0);
    }, 0);
    
    // อัปเดตการแสดงผล
    document.getElementById("pending-customers").textContent = `${pendingCustomers.length} คน`;
    document.getElementById("total-debt").textContent = `฿${totalDebt.toLocaleString()}`;
    
    console.log(`📊 สรุปลูกค้าค้างชำระ:`);
    console.log(`- จำนวน: ${pendingCustomers.length} คน`);
    console.log(`- ยอดรวม: ฿${totalDebt.toLocaleString()}`);

    const todaySales = await window.api.getTodaySales(username);
    document.getElementById("today-sales").textContent = `฿${parseFloat(todaySales || 0).toLocaleString()}`;

    // ✅ วาดกราฟ
    await renderSalesChart(username, "7days");
    await renderPaymentComparisonChart(username);
    await renderPaymentTypeChart(username);

    // ✅ โหลดรายการขายล่าสุด
    await renderRecentSales(username);

    // ✅ โหลดประวัติการขาย (บิลย้อนหลัง)
    await renderOrderHistory(username);

    // ✅ โหลดประวัติการจ่ายหนี้ (← เพิ่มตรงนี้!)
    await renderDebtPaymentHistory(username);

    // ✅ Event เลือกช่วงเวลา (7วัน / 30วัน / ปี)
    document.getElementById("sales-filter").addEventListener("change", async (e) => {
      await renderSalesChart(username, e.target.value);
    });

    // ✅ โหลดชื่อผู้ใช้ใส่ปุ่มโปรไฟล์
    const profileBtn = document.getElementById("profile-btn");
    if (profileBtn) {
      profileBtn.textContent = username;
      profileBtn.onclick = () => {
        location.href = "admin.html";
      };
    }

  } catch (error) {
    console.error("❌ โหลดข้อมูลล้มเหลว:", error);
    
    // แสดงค่าเริ่มต้นเมื่อเกิดข้อผิดพลาด
    document.getElementById("pending-customers").textContent = "0 คน";
    document.getElementById("total-debt").textContent = "฿0";
  }
});

// 📈 กราฟสรุปยอดขาย
async function renderSalesChart(username, filter) {
  const rawData = await window.api.getSalesSummary(username, filter);

  // 👉 กำหนดจำนวนวันตาม filter
  let numDays = 7;
  if (filter === "30days") numDays = 30;
  else if (filter === "1year") numDays = 365;

  // 👉 สร้างช่วงวันย้อนหลัง
  const dates = [];
  const salesMap = {};

  for (let i = numDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const label = date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: numDays > 30 ? 'short' : 'short', // สำหรับ 1 ปีใช้เดือนย่อ
      year: numDays > 30 ? '2-digit' : undefined
    });
    dates.push({ key, label });
    salesMap[key] = 0; // Default = 0
  }

  // 👉 ใส่ยอดขายจากฐานข้อมูล
  rawData.forEach(item => {
    const key = item.sale_date.split('T')[0];
    if (salesMap[key] !== undefined) {
      salesMap[key] = item.total_sales;
    }
  });

  // 👉 เตรียมข้อมูลกราฟ
  const labels = dates.map(d => d.label);
  const data = dates.map(d => salesMap[d.key]);

  const ctx = document.getElementById("sales-chart").getContext("2d");
  if (window.salesChart) window.salesChart.destroy();

  window.salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'ยอดขาย (บาท)',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}


// 📊 เปรียบเทียบเงินสด vs เครดิต วันนี้
async function renderPaymentComparisonChart(username) {
  const rawData = await window.api.getTodayPaymentSummary(username);

  const labels = rawData.map(item => item.payment_type);
  const data = rawData.map(item => item.total);

  const ctx = document.getElementById("payment-comparison-chart").getContext("2d");
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#4caf50', '#f44336', '#2196f3', '#ff9800']
      }]
    },
    options: {
      responsive: true
    }
  });
}

// 🥧 สัดส่วนประเภทการจ่ายทั้งหมด
async function renderPaymentTypeChart(username) {
  const rawData = await window.api.getPaymentTypeRatio(username);

  const labels = rawData.map(item => item.payment_type);
  const data = rawData.map(item => item.total);

  const ctx = document.getElementById("payment-type-chart").getContext("2d");
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#4caf50', '#f44336', '#2196f3', '#ff9800']
      }]
    },
    options: {
      responsive: true
    }
  });
}

// 🧾 โหลดรายการขายล่าสุด
async function renderRecentSales(username) {
  const sales = await window.api.getRecentSales(username);
  const tbody = document.querySelector("#recent-sales-table tbody");
  tbody.innerHTML = '';

  sales.forEach(sale => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(sale.sale_date).toLocaleDateString('th-TH')}</td>
      <td>${sale.product_name}</td>
      <td>${sale.quantity}</td>
      <td>฿${parseFloat(sale.amount).toLocaleString()}</td>
    `;
    tbody.appendChild(row);
  });
}

// 🧾 โหลดประวัติการขาย (บิลย้อนหลัง)
async function renderOrderHistory(username) {
  const orders = await window.api.getOrderHistory(username);
  const tbody = document.getElementById('order-history-body');
  tbody.innerHTML = '';

  orders.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(order.date).toLocaleDateString('th-TH')}</td>
      <td>${order.customer_name || 'ไม่ระบุ'}</td>
      <td>฿${parseFloat(order.total_amount).toLocaleString()}</td>
      <td>${mapPaymentType(order.payment_type)}</td>
      <td><button onclick="viewOrderDetail(${order.id})">ดู</button></td>
    `;
    tbody.appendChild(row);
  });
}

function mapPaymentType(type) {
  if (type === 'cash' || type === 'เงินสด') return 'เงินสด';
  if (type === 'credit' || type === 'ค้างชำระ') return 'ค้างชำระ';
  return type;
}

async function viewOrderDetail(orderId) {
  try {
    const order = await window.api.getOrderDetail(orderId); // ต้องมีใน preload.js + main.js ด้วย
    const profile = await window.api.getUserProfile(order.username);
    const datetime = new Date(order.date).toLocaleString("th-TH");

    let html = `
      <h4>${profile.store_name || "-"}</h4>
      <p>${profile.store_address || "-"}</p>
      <p>โทร: ${profile.store_phone || "-"}</p>
      <hr>
      <p><strong>วันที่:</strong> ${datetime}</p>
    `;

    if (order.payment_type === "ค้างชำระ") {
      html += `<p style="color:red;"><strong>📌 ค้างชำระ - กรุณาชำระภายหลัง</strong></p>`;
    }

    html += `
      <table style="width:100%; margin-top:10px;">
        <thead>
          <tr><th>สินค้า</th><th>จำนวน</th><th>ราคา</th><th>รวม</th></tr>
        </thead>
        <tbody>
    `;

    order.items.forEach(item => {
      const total = item.price * item.quantity;
      html += `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>฿${item.price.toFixed(2)}</td>
          <td>฿${total.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <hr>
      <p style="text-align:right;"><strong>ยอดรวม: ฿${parseFloat(order.total_amount).toFixed(2)}</strong></p>
    `;

    document.getElementById("receipt-content").innerHTML = html;
    document.getElementById("receipt").style.display = "flex";

  } catch (err) {
    console.error("❌ ไม่สามารถโหลดใบเสร็จ:", err);
    alert("เกิดข้อผิดพลาดในการดึงใบเสร็จ");
  }
}

// 💳 โหลดประวัติการจ่ายหนี้ - แสดงใครมาจ่ายเมื่อไหร่เท่าไหร่
async function renderDebtPaymentHistory(username) {
  const tbody = document.getElementById('debt-payment-history-body');
  const loadingIndicator = document.getElementById('loading-indicator');
  
  try {
    // แสดง loading state
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }
    
    // ตรวจสอบว่า element มีอยู่จริง
    if (!tbody) {
      throw new Error('ไม่พบตารางสำหรับแสดงประวัติการจ่ายหนี้');
    }

    // ตรวจสอบ username
    if (!username || typeof username !== 'string') {
      throw new Error('ข้อมูล username ไม่ถูกต้อง');
    }

    // ตรวจสอบว่า API มีอยู่จริง
    if (!window.api || typeof window.api.getCustomers !== 'function') {
      throw new Error('API สำหรับโหลดข้อมูลไม่พร้อมใช้งาน');
    }

    // ล้างข้อมูลเก่า
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">🔍 กำลังโหลด...</td></tr>';

    // ดึงข้อมูลลูกค้าทั้งหมด
    const customers = await window.api.getCustomers(username);
    
    // สร้างรายการประวัติการจ่ายเงินแบบง่าย
    let paymentHistory = [];

    // วนลูปหาลูกค้าที่มีการจ่ายเงิน
    for (const customer of customers) {
      try {
        if (!customer.id) continue;
        
        // ดึงประวัติบิลของลูกค้า
        const bills = await window.api.getBillHistory(customer.id);
        
        // หาบิลที่มีการจ่ายเงิน
        const paidBills = bills.filter(bill => {
          const amountPaid = parseFloat(bill.amount_paid) || 0;
          return amountPaid > 0;
        });

        // สร้างรายการง่ายๆ สำหรับแต่ละการจ่าย
        paidBills.forEach(bill => {
          const amountPaid = parseFloat(bill.amount_paid) || 0;
          const paymentDate = bill.updated_at || bill.created_at;
          
          paymentHistory.push({
            customer_name: customer.name || 'ไม่ระบุชื่อ',
            amount: amountPaid,
            date: paymentDate,
            note: `จ่ายบิล #${bill.bill_number || bill.id}`
          });
        });
        
      } catch (billError) {
        console.warn(`⚠️ ไม่สามารถโหลดบิลของ ${customer.name}:`, billError.message);
      }
    }

    // เรียงตามวันที่ใหม่สุดก่อน
    paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    // ล้างข้อมูลเก่า
    tbody.innerHTML = '';

    // ถ้าไม่มีประวัติ
    if (paymentHistory.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="4" class="text-center text-muted" style="padding: 40px;">
          <div style="color: #6c757d;">
            <div style="font-size: 48px; margin-bottom: 10px;">💸</div>
            <p>ยังไม่มีใครมาจ่ายเงิน</p>
          </div>
        </td>
      `;
      tbody.appendChild(emptyRow);
      return;
    }

    // แสดงรายการประวัติการจ่ายเงิน
    paymentHistory.forEach((entry, index) => {
      try {
        const row = document.createElement('tr');
        
        // จัดรูปแบบวันที่
        let formattedDate = '-';
        if (entry.date) {
          const date = new Date(entry.date);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }

        // จัดรูปแบบจำนวนเงิน
        let formattedAmount = '฿0';
        if (entry.amount !== null && entry.amount !== undefined) {
          const amount = parseFloat(entry.amount);
          if (!isNaN(amount)) {
            formattedAmount = `฿${amount.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          }
        }

        // ป้องกัน XSS
        const customerName = escapeHtml(entry.customer_name || 'ไม่ระบุ');
        const note = escapeHtml(entry.note || '-');

        // เพิ่มสีให้แถวสลับกัน
        const rowClass = index % 2 === 0 ? 'table-row-even' : 'table-row-odd';
        row.className = rowClass;

        row.innerHTML = `
          <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">
            <span style="color: #6c757d; font-size: 12px;">${formattedDate}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">
            <strong style="color: #333;">${customerName}</strong>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #dee2e6; text-align: right;">
            <span style="color: #28a745; font-weight: bold; font-size: 16px;">${formattedAmount}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            ${note}
          </td>
        `;
        
        // เพิ่มเอฟเฟกต์ hover
        row.addEventListener('mouseenter', function() {
          this.style.backgroundColor = '#f8f9fa';
        });
        
        row.addEventListener('mouseleave', function() {
          this.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
        });

        tbody.appendChild(row);
        
      } catch (rowError) {
        console.error(`❌ ข้อผิดพลาดในการสร้างแถวที่ ${index + 1}:`, rowError);
      }
    });

    // แสดงสถิติรวมที่ด้านบน (ถ้าต้องการ)
    const totalAmount = paymentHistory.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
    console.log(`📊 สรุป: มีการจ่ายเงิน ${paymentHistory.length} ครั้ง รวม ฿${totalAmount.toLocaleString()}`);

  } catch (err) {
    console.error("❌ โหลดประวัติการจ่ายหนี้ล้มเหลว:", err);
    
    // แสดงข้อความข้อผิดพลาด
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger" style="padding: 40px;">
            <div style="color: #dc3545;">
              <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
              <h5>เกิดข้อผิดพลาด</h5>
              <p>${err.message || 'ไม่สามารถโหลดข้อมูลได้'}</p>
              <button onclick="renderDebtPaymentHistory('${username}')" 
                      style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🔄 ลองใหม่
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    
    // แสดง notification (ถ้ามี)
    if (typeof showNotification === 'function') {
      showNotification('error', 'ไม่สามารถโหลดประวัติการจ่ายหนี้ได้');
    }
    
  } finally {
    // ซ่อน loading state
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

// ฟังก์ชันช่วยสำหรับ escape HTML เพื่อป้องกัน XSS
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ฟังก์ชันสำหรับรีเฟรชข้อมูล
function refreshDebtPaymentHistory(username) {
  return renderDebtPaymentHistory(username);
}

// ฟังก์ชันสำหรับค้นหาในประวัติ (ถ้าต้องการ)
function searchPaymentHistory(searchTerm) {
  const rows = document.querySelectorAll('#debt-payment-history-body tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const isMatch = text.includes(searchTerm.toLowerCase());
    row.style.display = isMatch ? '' : 'none';
  });
}

// 🔄 เพิ่มฟังก์ชันช่วยสำหรับรีเฟรชข้อมูลลูกค้าค้างชำระ
async function refreshDebtSummary(username) {
  try {
    const customers = await window.api.getCustomers(username);
    
    // กรองลูกค้าที่ customer_type = 'ค้างชำระ'
    const pendingCustomers = customers.filter(customer => 
      customer.customer_type === 'ค้างชำระ'
    );
    
    // คำนวณยอดค้างชำระรวม
    const totalDebt = pendingCustomers.reduce((sum, customer) => {
      return sum + (parseFloat(customer.outstanding_balance) || 0);
    }, 0);
    
    // อัปเดตการแสดงผล
    document.getElementById("pending-customers").textContent = `${pendingCustomers.length} คน`;
    document.getElementById("total-debt").textContent = `฿${totalDebt.toLocaleString()}`;
    
    console.log(`🔄 รีเฟรชข้อมูลลูกค้าค้างชำระ:`);
    console.log(`- จำนวน: ${pendingCustomers.length} คน`);
    console.log(`- ยอดรวม: ฿${totalDebt.toLocaleString()}`);
    
    return {
      total_customers: pendingCustomers.length,
      total_debt: totalDebt,
      customers: pendingCustomers
    };
    
  } catch (error) {
    console.error("❌ ไม่สามารถรีเฟรชข้อมูลลูกค้าค้างชำระได้:", error);
    throw error;
  }
}