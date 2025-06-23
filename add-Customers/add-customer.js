window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("customer-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const balance = parseFloat(document.getElementById("balance").value.trim()) || 0;
    const username = localStorage.getItem("username"); // ✅ เติมตรงนี้

    if (!name || !phone || !address || isNaN(balance)) {
      showToast("❌ กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const result = await window.api.addCustomer({
        name,
        phone,
        address,
        outstanding_balance: balance,
        username, // ✅ เติมตรงนี้
      });

      showToast(`✅ เพิ่มข้อมูลเรียบร้อย (ID: ${result.id})`);
      console.log("เพิ่มลูกค้าแล้ว:", result);
      form.reset();
    } catch (err) {
      console.error(err);
      showToast("❌ เพิ่มข้อมูลไม่สำเร็จ");
    }
  });
});

// ✅ ฟังก์ชัน Toast (ไม่แตะ ไม่ลบของเดิม)
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}
