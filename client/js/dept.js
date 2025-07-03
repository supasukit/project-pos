// ตัวแปรเก็บข้อมูล
let selectedCustomer = null
let allCustomersForPayment = []

// เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', function() {
    console.log('💳 Debt payment page loaded')
    
    // โหลดข้อมูลลูกค้า
    loadCustomersForPayment()
    
    // Event listeners
    document.getElementById('customer-name')?.addEventListener('input', searchCustomer)
    document.getElementById('confirm-btn')?.addEventListener('click', processPayment)
})

// โหลดข้อมูลลูกค้าทั้งหมด
async function loadCustomersForPayment() {
    try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/customers', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        
        const result = await response.json()
        if (result.success) {
            allCustomersForPayment = result.data.filter(c => c.credit_balance > 0) // เฉพาะที่มียอดค้าง
            console.log(`📋 Loaded ${allCustomersForPayment.length} customers with debt`)
        }
    } catch (error) {
        console.error('❌ Error loading customers:', error)
    }
}

// ค้นหาลูกค้า
function searchCustomer() {
    const customerName = document.getElementById('customer-name').value.trim()
    const balanceInfo = document.getElementById('balance-info')
    const payAmountInput = document.getElementById('pay-amount')
    
    if (!customerName) {
        balanceInfo.textContent = 'ใส่ชื่อลูกค้าเพื่อดูยอดค้าง'
        selectedCustomer = null
        payAmountInput.value = ''
        return
    }
    
    // หาลูกค้าที่ตรงกัน
    const foundCustomer = allCustomersForPayment.find(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase()) ||
        c.phone.includes(customerName)
    )
    
    if (foundCustomer) {
        selectedCustomer = foundCustomer
        balanceInfo.innerHTML = `
            <strong>พบลูกค้า:</strong> ${foundCustomer.name} (${foundCustomer.phone})<br>
            <strong>ยอดค้างชำระ:</strong> <span style="color: #dc3545; font-weight: bold;">฿${foundCustomer.credit_balance.toLocaleString()}</span>
        `
        balanceInfo.style.color = '#28a745'
        
        // ตั้งค่าจำนวนเงินเต็มจำนวน
        payAmountInput.value = foundCustomer.credit_balance
        payAmountInput.max = foundCustomer.credit_balance
    } else {
        selectedCustomer = null
        balanceInfo.textContent = `❌ ไม่พบลูกค้า "${customerName}" ที่มียอดค้างชำระ`
        balanceInfo.style.color = '#dc3545'
        payAmountInput.value = ''
    }
}

// ดำเนินการชำระเงิน
async function processPayment() {
    if (!selectedCustomer) {
        alert('❌ กรุณาเลือกลูกค้าก่อน')
        return
    }
    
    const payAmount = parseFloat(document.getElementById('pay-amount').value)
    
    if (!payAmount || payAmount <= 0) {
        alert('❌ กรุณากรอกจำนวนเงินที่ถูกต้อง')
        return
    }
    
    if (payAmount > selectedCustomer.credit_balance) {
        alert('❌ จำนวนเงินเกินยอดค้างชำระ')
        return
    }
    
    if (!confirm(`ยืนยันรับชำระเงิน?\n\nลูกค้า: ${selectedCustomer.name}\nจำนวน: ฿${payAmount.toLocaleString()}\nคงเหลือ: ฿${(selectedCustomer.credit_balance - payAmount).toLocaleString()}`)) {
        return
    }
    
    try {
        console.log(`💰 Processing payment: ${payAmount} for ${selectedCustomer.name}`)
        
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/customers/${selectedCustomer._id}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: payAmount,
                payment_method: 'cash',
                notes: 'ชำระเงินค้างชำระ'
            })
        })
        
        const result = await response.json()
        
        if (result.success) {
            alert(`✅ รับชำระเงินสำเร็จ!\n\nลูกค้า: ${selectedCustomer.name}\nจำนวน: ฿${payAmount.toLocaleString()}\nคงเหลือ: ฿${result.data.remaining_balance.toLocaleString()}`)
            
            // รีเซ็ตฟอร์ม
            document.getElementById('customer-name').value = ''
            document.getElementById('pay-amount').value = ''
            document.getElementById('balance-info').textContent = 'ใส่ชื่อลูกค้าเพื่อดูยอดค้าง'
            selectedCustomer = null
            
            // โหลดข้อมูลใหม่
            loadCustomersForPayment()
            
        } else {
            alert('❌ เกิดข้อผิดพลาด: ' + result.message)
        }
        
    } catch (error) {
        console.error('❌ Payment error:', error)
        alert('❌ เกิดข้อผิดพลาดในการชำระเงิน')
    }
}
