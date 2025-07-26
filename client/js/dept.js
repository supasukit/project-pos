let selectedCustomer = null
let allCustomersForPayment = []

document.addEventListener('DOMContentLoaded', function () {
  console.log('Debt payment page loaded')

  loadCustomersForPayment()

  document.getElementById('customer-name')?.addEventListener('input', searchCustomer)
  document.getElementById('confirm-btn')?.addEventListener('click', processPayment)
})

function getStoreUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    
    if (user.role === 'employee') {
        if (!user.parent_user_id) {
            throw new Error('Employee account ไม่มี parent_user_id กรุณาติดต่อผู้ดูแลระบบ')
        }
        return user.parent_user_id
    } else {
        return user._id || user.id
    }
}

async function loadCustomersForPayment () {
  try {
    const userId = getStoreUserId()
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/customers?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    if (result.success) {
      allCustomersForPayment = result.data.filter(c => c.credit_balance > 0)
      console.log(`Loaded ${allCustomersForPayment.length} customers with debt`)
    }
  } catch (error) {
    console.error('Error loading customers:', error)
  }
}

function searchCustomer () {
  const customerName = document.getElementById('customer-name').value.trim()
  const balanceInfo = document.getElementById('balance-info')
  const payAmountInput = document.getElementById('pay-amount')

  if (!customerName) {
    balanceInfo.textContent = 'ใส่ชื่อลูกค้าเพื่อดูยอดค้าง'
    selectedCustomer = null
    payAmountInput.value = ''
    return
  }

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

    payAmountInput.value = foundCustomer.credit_balance
    payAmountInput.max = foundCustomer.credit_balance
  } else {
    selectedCustomer = null
    balanceInfo.textContent = `ไม่พบลูกค้า "${customerName}" ที่มียอดค้างชำระ`
    balanceInfo.style.color = '#dc3545'
    payAmountInput.value = ''
  }
}

async function processPayment () {
  if (!selectedCustomer) {
    alert('กรุณาเลือกลูกค้าก่อน')
    return
  }

  const payAmount = parseFloat(document.getElementById('pay-amount').value)

  if (!payAmount || payAmount <= 0) {
    alert('กรุณากรอกจำนวนเงินที่ถูกต้อง')
    return
  }

  if (payAmount > selectedCustomer.credit_balance) {
    alert('จำนวนเงินเกินยอดค้างชำระ')
    return
  }

  if (!confirm(`ยืนยันรับชำระเงิน?\n\nลูกค้า: ${selectedCustomer.name}\nจำนวน: ฿${payAmount.toLocaleString()}\nคงเหลือ: ฿${(selectedCustomer.credit_balance - payAmount).toLocaleString()}`)) {
    return
  }

  try {
    console.log(`Processing payment: ${payAmount} for ${selectedCustomer.name}`)

    const userId = getStoreUserId()
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/customers/${selectedCustomer._id}/payment?userId=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: payAmount,
        payment_method: 'cash',
        notes: 'ชำระเงินค้างชำระ'
      })
    })

    const result = await response.json()

    if (result.success) {
      alert(`รับชำระเงินสำเร็จ!\n\nลูกค้า: ${selectedCustomer.name}\nจำนวน: ฿${payAmount.toLocaleString()}\nคงเหลือ: ฿${result.data.remaining_balance.toLocaleString()}`)

      document.getElementById('customer-name').value = ''
      document.getElementById('pay-amount').value = ''
      document.getElementById('balance-info').textContent = 'ใส่ชื่อลูกค้าเพื่อดูยอดค้าง'
      selectedCustomer = null

      loadCustomersForPayment()
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.message)
    }
  } catch (error) {
    console.error('Payment error:', error)
    alert('เกิดข้อผิดพลาดในการชำระเงิน')
  }
}