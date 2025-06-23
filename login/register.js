document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const owner_name = document.getElementById('owner_name').value.trim(); // ✅ เพิ่มอ่าน owner_name
  const store_name = document.getElementById('store_name').value.trim();
  const store_phone = document.getElementById('store_phone').value.trim();
  const store_address = document.getElementById('store_address').value.trim();

  const success = await window.api.registerUser({
    username,
    password,
    owner_name,     // ✅ ส่ง owner_name ไปด้วย
    store_name,
    store_phone,
    store_address
  });

  if (success) {
    alert("สมัครสมาชิกสำเร็จ!");
    window.location.href = 'login.html'; // ✅ กลับไปหน้า login
  } else {
    document.getElementById('error-message').style.display = 'block';
  }
});
