window.addEventListener("DOMContentLoaded", async () => {
  const username = localStorage.getItem("username");
  const customers = await window.api.getCustomers(username);

  const nameInput = document.getElementById("customer-name");
  const info = document.getElementById("balance-info");
  const amountInput = document.getElementById("pay-amount");
  const confirmBtn = document.getElementById("confirm-btn");

  let currentCustomer = null;

  nameInput.addEventListener("input", () => {
    const name = nameInput.value.trim();
    currentCustomer = customers.find(c => c.name === name);
    if (currentCustomer) {
      info.textContent = `ยอดค้าง: ฿${currentCustomer.outstanding_balance.toFixed(2)}`;
    } else {
      info.textContent = "❌ ไม่พบลูกค้าคนนี้";
    }
  });

  confirmBtn.addEventListener("click", async () => {
    if (!currentCustomer) {
      alert("❌ กรุณากรอกชื่อลูกค้าที่ถูกต้อง");
      return;
    }

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0 || amount > currentCustomer.outstanding_balance) {
      alert("❌ จำนวนเงินไม่ถูกต้อง");
      return;
    }

    await window.api.savePaymentHistory({
      customer_id: currentCustomer.id,
      amount,
      payment_type: "จ่ายหนี้",
      note: "ลูกค้าชำระยอดค้างชำระ",
      username
    });

    await window.api.updateOutstandingBalance({
      customer_id: currentCustomer.id,
      amount: -amount,
      username
    });

    alert(`✅ ชำระเงิน ฿${amount.toFixed(2)} สำเร็จแล้ว`);
    window.close();
  });
});
