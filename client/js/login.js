// Login form handler
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault()
    
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    
    // เรียกใช้ login function จาก auth.js
    await handleLogin(username, password)
})