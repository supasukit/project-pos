let latestReceiptHTML = "";

window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const amount = parseFloat(urlParams.get("amount"));
  const cart = JSON.parse(decodeURIComponent(urlParams.get("cart")) || "[]");
  const username = localStorage.getItem("username");

  document.getElementById("amount").textContent = amount.toFixed(2);

  let pendingCustomerName = "";

  document.getElementById("confirm-btn").addEventListener("click", async () => {
    const name = document.getElementById("customer-name").value.trim();
    if (!name) {
      alert("กรุณากรอกชื่อลูกค้า");
      return;
    }

    try {
      const customers = await window.api.getCustomers(username);
      let customer = customers.find(c => c.name === name);

      if (!customer) {
        document.querySelector(".popup-container").style.display = "none";
        document.getElementById("new-customer-form").style.display = "block";
        document.getElementById("new-customer-name").value = name;
        pendingCustomerName = name;
        return;
      }

      await proceedOrder(customer.id);
      await showCreditReceipt(cart, amount, username, customer.name);

    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาด:", error);
    }
  });

  // ✅ เพิ่มลูกค้าใหม่
  document.getElementById("submit-new-customer").addEventListener("click", async () => {
    const phone = document.getElementById("new-customer-phone").value.trim();
    const address = document.getElementById("new-customer-address").value.trim();

    if (!pendingCustomerName || !phone || !address) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const result = await window.api.addCustomer({
        name: pendingCustomerName,
        phone,
        address,
        outstanding_balance: 0,
        username: username
      });

      alert("✅ เพิ่มลูกค้าใหม่สำเร็จ!");
      await proceedOrder(result.id);
      await showCreditReceipt(cart, amount, username, pendingCustomerName);

    } catch (error) {
      console.error("❌ เพิ่มลูกค้าใหม่ผิดพลาด:", error);
    }
  });

  document.getElementById("cancel-btn").addEventListener("click", () => {
    window.close();
  });

  document.getElementById("cancel-new-customer").addEventListener("click", () => {
    window.location.reload();
  });

  async function proceedOrder(customerId) {
    try {
      const name = pendingCustomerName || document.getElementById("customer-name").value.trim();
      const phone = document.getElementById("new-customer-phone")?.value?.trim() || "ไม่ระบุ";
      const address = document.getElementById("new-customer-address")?.value?.trim() || "ไม่ระบุ";

      await window.api.handleCreditPayment({
        name,
        phone,
        address,
        amount: amount,
        username: username
      });

      const orderId = await window.api.insertOrderHeader({
        customer_id: customerId,
        amount: amount,
        payment_type: "ค้างชำระ",
        username: username
      });

      for (const item of cart) {
        const price = item.quantity >= item.wholesale_minimum ? item.wholesale_price : item.retail_price;
        await window.api.insertOrderItem({
          order_id: orderId,
          product_id: item.id,
          quantity: item.quantity,
          price: price,
          username: username
        });
        await window.api.updateStock({
          product_id: item.id,
          quantity: item.quantity,
          username: username
        });
      }

      await window.api.savePaymentHistory({
        customer_id: customerId,
        amount: amount,
        payment_type: "ค้างชำระ",
        note: "บันทึกค้างชำระ (เครดิต)",
        username: username
      });

    } catch (error) {
      console.error("❌ สร้างคำสั่งซื้อผิดพลาด:", error);
    }
  }
});

async function showCreditReceipt(cart, total, username, customerName, autoPrint = false) {
  const oldReceipt = document.getElementById("receipt");
  if (oldReceipt) oldReceipt.remove(); // ✅ ล้างก่อนแสดงใหม่

  const profile = await window.api.getUserProfile(username);
  const now = new Date();
  const datetime = now.toLocaleString('th-TH');

  let html = `
    <h4>${profile.store_name}</h4>
    <p>${profile.store_address}</p>
    <p>โทร: ${profile.store_phone}</p>
    <hr>
    <p><strong>วันที่:</strong> ${datetime}</p>
    <p><strong>ลูกค้า:</strong> ${customerName}</p>
    <p style="color:red;"><strong>📌 ค้างชำระ - กรุณาชำระภายหลัง</strong></p>
    <table style="width:100%; margin-top:10px; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:6px;">สินค้า</th>
          <th style="border:1px solid #000;padding:6px;">จำนวน</th>
          <th style="border:1px solid #000;padding:6px;">ราคา</th>
          <th style="border:1px solid #000;padding:6px;">รวม</th>
        </tr>
      </thead>
      <tbody>
  `;

  cart.forEach(item => {
    const price = item.quantity >= item.wholesale_minimum ? item.wholesale_price : item.retail_price;
    const sum = price * item.quantity;
    html += `
      <tr>
        <td style="border:1px solid #000;padding:6px;">${item.name}</td>
        <td style="border:1px solid #000;padding:6px;">${item.quantity}</td>
        <td style="border:1px solid #000;padding:6px;">฿${price.toFixed(2)}</td>
        <td style="border:1px solid #000;padding:6px;">฿${sum.toFixed(2)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <hr>
    <p style="text-align:right;"><strong>ยอดรวม: ฿${total.toFixed(2)}</strong></p>
    <div class="receipt-buttons" style="text-align:right; margin-top:10px;">
      <button id="print-button">🖨 พิมพ์ใบเสร็จ</button>
      <button onclick="closeReceipt()">ปิด</button>
    </div>
  `;

  latestReceiptHTML = html;

  const container = document.createElement("div");
  container.id = "receipt";
  container.innerHTML = `<div id="receipt-content">${html}</div>`;
  document.body.appendChild(container);

  setTimeout(() => {
    const printBtn = document.getElementById("print-button");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        printDirectly(latestReceiptHTML);
      });
    }
  }, 100);
}

function printDirectly(html) {
  html = html || latestReceiptHTML;

  const printWindow = window.open("", "_blank", "width=800,height=1000");
  const fullHTML = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>ใบเสร็จ</title>
      <style>
        body { font-family: 'TH Sarabun New', sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 16px; }
        hr { margin: 10px 0; }
        @media print {
          .receipt-buttons { display: none; }
        }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      ${html}
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullHTML);
  printWindow.document.close();
}


function closeReceipt() {
  const el = document.getElementById("receipt");
  if (el) el.remove();
}
