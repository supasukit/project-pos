// ✅ ก่อนโหลด login.html ต้องเช็กว่าเคยล็อกอินไว้ไหม
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem('username');
  
  if (username) {
    // ถ้ามี username อยู่ใน localStorage ➔ ข้าม login ไปหน้า index.html เลย
    window.location.href = "../index.html";
  }
});

// ✅ ฟังชั่น Login เมื่อกรอก username และ password
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  const success = await window.api.loginUser({ username, password });

  if (success) {
    // ✅ บันทึก username ลง localStorage
    localStorage.setItem('username', username);

    // ✅ เด้งไปหน้า index.html หลัง login สำเร็จ
    window.location.href = "../index.html";
  } else {
    // ❌ ถ้า username/password ผิด
    document.getElementById('error-message').style.display = 'block';
  }
});
