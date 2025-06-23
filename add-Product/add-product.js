document.addEventListener("DOMContentLoaded", () => {
  // ✅ ดึงค่าจาก query string
  const params = new URLSearchParams(window.location.search);
  const barcode = params.get("barcode");
  const name = params.get("name");
  const username = params.get("username") || localStorage.getItem("username");

  if (!username) {
    alert("❌ ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    return;
  }

  // ✅ กรอกข้อมูลลง input
  if (barcode) document.getElementById("barcode").value = barcode;
  if (name) document.getElementById("name").value = name;

  // ✅ เพิ่มตัวอย่างราคาแบบ Real-time
  createPricePreview();
  
  // เพิ่ม Event Listeners สำหรับการอัปเดตตัวอย่างราคา
  ['retail_price', 'wholesale_price', 'credit_price'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', updatePricePreview);
      input.addEventListener('keyup', updatePricePreview);
    }
  });
  
  // ✅ แนะนำราคาเงินค้างชำระอัตโนมัติ
  const retailPriceInput = document.getElementById('retail_price');
  const creditPriceInput = document.getElementById('credit_price');
  
  retailPriceInput.addEventListener('input', function() {
    if (this.value && !creditPriceInput.value) {
      const retailPrice = parseFloat(this.value);
      const suggestedCreditPrice = Math.ceil(retailPrice * 1.05); // เพิ่ม 5%
      creditPriceInput.placeholder = `แนะนำ: ${suggestedCreditPrice} บาท (+5%)`;
    }
  });

  const form = document.getElementById("product-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const barcode = document.getElementById("barcode").value.trim();
    const retail_price = parseFloat(document.getElementById("retail_price").value);
    const wholesale_price = parseFloat(document.getElementById("wholesale_price").value);
    const credit_price = parseFloat(document.getElementById("credit_price").value); // ✅ เพิ่มใหม่
    const wholesale_minimum = parseInt(document.getElementById("wholesale_minimum").value);
    const stock = parseInt(document.getElementById("stock").value);
    const category = document.getElementById("category").value.trim();
    const imageFile = document.getElementById("image").files[0];

    // ✅ ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !barcode || isNaN(retail_price) || isNaN(stock)) {
      alert("❌ กรุณากรอกข้อมูลสินค้าให้ครบถ้วน");
      return;
    }

    // ✅ ตรวจสอบหมวดหมู่
    if (!category) {
      alert("❌ กรุณาเลือกหมวดหมู่สินค้า");
      return;
    }

    let base64Image = "";

    if (imageFile) {
      const reader = new FileReader();
      reader.onload = async function () {
        base64Image = reader.result;
        await saveProduct();
      };
      reader.readAsDataURL(imageFile);
    } else {
      await saveProduct();
    }

    async function saveProduct() {
      try {
        await window.api.addProduct({
          name,
          barcode,
          retail_price,
          wholesale_price,
          credit_price, // ✅ เพิ่มราคาขายเงินค้างชำระ
          wholesale_minimum,
          stock,
          category,
          image: base64Image,
          username,
        });

        alert("✅ เพิ่มสินค้าเรียบร้อยแล้ว!");
        form.reset();
        
        // ✅ รีเซ็ตตัวอย่างราคาด้วย
        updatePricePreview();
        
      } catch (error) {
        const msg = error?.message || JSON.stringify(error);
        alert("❌ เพิ่มสินค้าไม่สำเร็จ:\n" + msg);
      }
    }
  });

  // ✅ ปรับชื่อปุ่มโปรไฟล์
  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.textContent = username;
    profileBtn.addEventListener("click", () => {
      location.href = "admin.html";
    });
  }
});

// ✅ ฟังก์ชันสร้างตัวอย่างราคา
function createPricePreview() {
  const priceGroup = document.querySelector('.price-group');
  if (!priceGroup) return;
  
  const preview = document.createElement('div');
  preview.className = 'price-preview';
  preview.innerHTML = `
    <h4>💰 ตัวอย่างราคาขาย</h4>
    <div class="price-item">
      <span class="price-label">💵 ขายปลีก:</span>
      <span class="price-value" id="preview-retail">-</span>
    </div>
    <div class="price-item">
      <span class="price-label">📦 ขายส่ง:</span>
      <span class="price-value" id="preview-wholesale">-</span>
    </div>
    <div class="price-item">
      <span class="price-label">⏰ เงินค้างชำระ:</span>
      <span class="price-value" id="preview-credit">-</span>
    </div>
  `;
  priceGroup.appendChild(preview);
}

// ✅ ฟังก์ชันอัปเดตตัวอย่างราคา
function updatePricePreview() {
  const retail = document.getElementById('retail_price')?.value || '';
  const wholesale = document.getElementById('wholesale_price')?.value || '';
  const credit = document.getElementById('credit_price')?.value || '';
  
  const previewRetail = document.getElementById('preview-retail');
  const previewWholesale = document.getElementById('preview-wholesale');
  const previewCredit = document.getElementById('preview-credit');
  
  if (previewRetail) {
    previewRetail.textContent = retail ? `฿${Number(retail).toLocaleString()}` : '-';
  }
  if (previewWholesale) {
    previewWholesale.textContent = wholesale ? `฿${Number(wholesale).toLocaleString()}` : '-';
  }
  if (previewCredit) {
    previewCredit.textContent = credit ? `฿${Number(credit).toLocaleString()}` : '-';
  }
}
