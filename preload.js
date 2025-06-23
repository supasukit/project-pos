const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // ฟังก์ชันทั้งหมดที่เกี่ยวกับข้อมูลลูกค้า/สินค้า
  getCustomers: (username) => ipcRenderer.invoke("get-customers", username),
  addCustomer: (data) => ipcRenderer.invoke("add-customer", data),
  deleteCustomer: (id) => ipcRenderer.invoke("delete-customer", id),
  updateCustomerBalance: (id, newBalance) => ipcRenderer.invoke("update-customer-balance", id, newBalance),
  getProducts: (username) => ipcRenderer.invoke("get-products", username),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  addProduct: (data) => ipcRenderer.invoke('add-product', data),
  openAddCustomer: () => ipcRenderer.send("open-add-customer"),
  openAddProduct: () => ipcRenderer.send("open-add-product"),
  getDefaultCustomerId: (username) => ipcRenderer.invoke('get-default-customer-id', username),
  getOrderDetail: (orderId) => ipcRenderer.invoke("get-order-detail", orderId),
  openWindow: (path, options) => ipcRenderer.invoke("openWindow", path, options),
  getBillHistory: (customerId) => ipcRenderer.invoke("get-bill-history", customerId),
  getBillDetails: (billId) => ipcRenderer.invoke("get-order-detail", billId),
  getDebtPaymentHistoryByCustomer: (customerId) => ipcRenderer.invoke("get-debt-payment-history-by-customer", customerId),
  updateBillStatus: (billId, data) => ipcRenderer.invoke('update-bill-status', { billId, data }),
  recordBillPayment: (paymentData) => ipcRenderer.invoke('record-bill-payment', paymentData),

  // ฟังก์ชันที่ต้องส่ง username
  getSalesData: (username) => ipcRenderer.invoke("get-sales-data", username),
  getDebtSummary: (username) => ipcRenderer.invoke("get-debt-summary", username),
  getTodaySales: (username) => ipcRenderer.invoke("get-today-sales", username),
  getSalesSummary: (username, period) => ipcRenderer.invoke("get-sales-summary", username, period),
  getTodayPaymentSummary: (username) => ipcRenderer.invoke("get-today-payment-summary", username),
  getPaymentTypeRatio: (username) => ipcRenderer.invoke("get-payment-type-ratio", username),
  getRecentSales: (username) => ipcRenderer.invoke("get-recent-sales", username),
  getOrderHistory: (username) => ipcRenderer.invoke("get-order-history", username),
  getUserProfile: (username) => ipcRenderer.invoke('get-user-profile', username),
  getDebtPaymentHistory: (username) => ipcRenderer.invoke("get-debt-payment-history", username),
  
  // ฟังก์ชันเกี่ยวกับ payment, order
  handleCreditPayment: (data) => ipcRenderer.invoke("handle-credit-payment", data),
  openCreditPayment: (amount) => ipcRenderer.invoke("open-credit-payment", amount),
  insertOrderHeader: (data) => ipcRenderer.invoke("insert-order-header", data),
  insertOrderItem: (data) => ipcRenderer.invoke("insert-order-item", data),
  updateStock: (data) => ipcRenderer.invoke("update-stock", data),
  savePaymentHistory: (data) => ipcRenderer.invoke("save-payment-history", data),
  updateOutstandingBalance: (data) => ipcRenderer.invoke("update-outstanding-balance", data),

  // ฟังก์ชันการ login/logout
  loginUser: (credentials) => ipcRenderer.invoke("login-user", credentials),
  registerUser: (data) => ipcRenderer.invoke("register-user", data),
  logoutUser: () => ipcRenderer.invoke("logout-user"),
  updateUserProfile: (data) => ipcRenderer.invoke("update-user-profile", data),

  openAddProductWithParams: (barcode, name, username) =>
  ipcRenderer.send("open-add-product-with-params", { barcode, name, username }),

});
