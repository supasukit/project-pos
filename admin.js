document.addEventListener("DOMContentLoaded", async function () {
  const username = localStorage.getItem("username");
  console.log("⚡ username localStorage:", username);

  if (!username) {
    alert("ไม่มี session กรุณา login ใหม่");
    location.href = "login/login.html";
    return;
  }

  // ✅ ตั้งชื่อปุ่มโปรไฟล์
  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.textContent = username;
    profileBtn.onclick = () => {
      location.href = "admin.html";
    };
  }

  // ✅ logout function
  document.getElementById("logout-btn").addEventListener("click", async () => {
    const confirmed = confirm("คุณต้องการออกจากระบบหรือไม่?");
    if (confirmed) {
      await window.api.logoutUser();
      localStorage.removeItem("username");
      location.href = "login/login.html";
    }
  });

  try {
    const profile = await window.api.getUserProfile(username);
    console.log("⚡ profile result:", profile);

    if (profile) {
      document.getElementById("store-name").value = profile.store_name || "-";
      document.getElementById("owner-name").value = profile.owner_name || "-";
      document.getElementById("store-phone").value = profile.store_phone || "-";
      document.getElementById("store-address").value = profile.store_address || "-";
      document.getElementById("user-name").value = profile.username || "-";
    } else {
      alert("ไม่พบข้อมูลร้านค้า กรุณา login ใหม่");
      location.href = "login.html";
    }
  } catch (error) {
    console.error("🔥 ERROR โหลดโปรไฟล์:", error);
    alert("เกิดข้อผิดพลาด");
  }

  // ✅ ปุ่มแก้ไขโปรไฟล์
  const editButton = document.querySelector(".sidebar button");
  let isEditing = false;

  editButton.addEventListener("click", async () => {
    isEditing = !isEditing;

    const fields = ["owner-name", "store-name", "store-address", "store-phone"];
    fields.forEach(id => {
      const field = document.getElementById(id);
      field.readOnly = !isEditing;
      field.style.border = isEditing ? "1px solid #aaa" : "none";
      field.style.background = isEditing ? "#fff" : "transparent";
    });

    if (!isEditing) {
      // ✅ กด "บันทึก" → ส่งข้อมูลกลับไปอัปเดต
      const updated = {
        username,
        owner_name: document.getElementById("owner-name").value,
        store_name: document.getElementById("store-name").value,
        store_address: document.getElementById("store-address").value,
        store_phone: document.getElementById("store-phone").value
      };

      try {
        await window.api.updateUserProfile(updated);
        alert("✅ บันทึกข้อมูลเรียบร้อย");
      } catch (error) {
        console.error("❌ บันทึกข้อมูลผิดพลาด:", error);
        alert("เกิดข้อผิดพลาดขณะบันทึกข้อมูล");
      }

      editButton.textContent = "✏️ แก้ไขโปรไฟล์";
    } else {
      editButton.textContent = "💾 บันทึกข้อมูล";
    }
  });
});
