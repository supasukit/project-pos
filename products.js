window.addEventListener("DOMContentLoaded", async () => {
  const username = localStorage.getItem("username");
  console.log("📦 username:", username);

  if (!username) {
    alert("กรุณา Login ใหม่");
    location.href = "/login/login.html";
    return;
  }

  const products = await window.api.getProducts(username);
  const container = document.getElementById("product-list");

  products.forEach(product => {
    const div = document.createElement("div");
    div.classList.add("product-card");

    div.setAttribute("data-category", product.category || "ไม่ระบุ");

    const imageTag = product.image
      ? `<img src="${product.image}" alt="รูปสินค้า">`
      : `<img src="no-image.png" alt="ไม่มีรูป">`;

    div.innerHTML = `
      ${imageTag}
      <p><strong>ชื่อสินค้า:</strong> ${product.name}</p>
      <p>จำนวนเหลือ ${product.stock}</p>
    `;

    div.onclick = () => showPopup(product);
    container.appendChild(div);
  });

  const addBtn = document.getElementById("add-product-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      window.api.openAddProduct();
    });
  }

  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.textContent = username;
    profileBtn.addEventListener("click", () => {
      location.href = "admin.html";
    });
  }

  // ✅ โฟกัสช่องยิงบาร์โค้ดเสมอ
  const scanner = document.getElementById("barcode-scanner");
  window.addEventListener("click", () => scanner.focus());
  window.addEventListener("keydown", () => scanner.focus());

  // ✅ เมื่อยิงบาร์โค้ดแล้ว Enter
  scanner.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const code = scanner.value.trim();
    scanner.value = "";

    if (!code) return;

    const match = products.find(p => p.barcode === code);
    if (match) {
      showPopup(match);
    } else {
      // ✅ ส่งชื่อสินค้าเริ่มต้น + barcode + username ไปหน้าเพิ่มสินค้า
      window.api.openAddProductWithParams(code, "สินค้าใหม่", username);
    }
  });
});

function showPopup(product) {
  const popup = document.getElementById("popup");
  const info = document.getElementById("popup-info");

  const imageTag = product.image
    ? `<img src="${product.image}" alt="รูปสินค้า">`
    : `<p><em>ไม่มีรูปภาพ</em></p>`;

  info.innerHTML = `
  ${imageTag}
  <p><strong>ชื่อ:</strong> ${product.name}</p>
  <p><strong>หมวดหมู่:</strong> ${product.category || "-"}</p>
  <p><strong>ราคาขาย:</strong> ฿${product.retail_price}</p>
  <p><strong>ราคาค้างชำระ:</strong> ฿${product.credit_price ? Math.round(product.credit_price) : "-"}</p>
  <p><strong>ราคาส่ง:</strong> ฿${product.wholesale_price || "-"}</p>
  <p><strong>ขั้นต่ำขายส่ง:</strong> ${product.wholesale_minimum || "-"} ชิ้น</p>
  <p><strong>บาร์โค้ด:</strong> ${product.barcode}</p>
  <p><strong>จำนวน:</strong> ${product.stock} ชิ้น</p>
  `;


  document.getElementById("delete-btn").onclick = async () => {
    const confirmDelete = confirm("คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?");
    if (!confirmDelete) return;

    await window.api.deleteProduct(product.id);
    popup.classList.add("hidden");
    location.reload();
  };

  popup.classList.remove("hidden");
}

function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// ✅ ปุ่มกรองหมวดหมู่
document.querySelectorAll(".category-btn").forEach(button => {
  button.addEventListener("click", () => {
    // เอา .active ออกจากปุ่มอื่น
    document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    const selectedCategory = button.dataset.category;
    filterCategory(selectedCategory);
  });
});

function filterCategory(category) {
  const allCards = document.querySelectorAll(".product-card");
  allCards.forEach(card => {
    const cardCategory = card.getAttribute("data-category");
    if (category === "ทั้งหมด" || cardCategory === category) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

document.getElementById("search-bar").addEventListener("input", function () {
  const query = this.value.toLowerCase();
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach(card => {
    const productName = card.querySelector("p strong").parentNode.textContent.toLowerCase();
    if (productName.includes(query)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
});
