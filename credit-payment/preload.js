const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getCustomers: () => ipcRenderer.invoke("get-customers"),
  addCustomer: (data) => ipcRenderer.invoke("add-customer", data),
  getSalesData: () => ipcRenderer.invoke("get-sales-data"),
  getDebtSummary: () => ipcRenderer.invoke("get-debt-summary"),
  openAddCustomer: () => ipcRenderer.send("open-add-customer"),
  deleteCustomer: (id) => ipcRenderer.invoke("delete-customer", id),
  updateCustomerBalance: (id, newBalance) => ipcRenderer.invoke("update-customer-balance", id, newBalance),
  getProducts: () => ipcRenderer.invoke("get-products"),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  addProduct: (data) => ipcRenderer.invoke("add-product", data),
  openAddProduct: () => ipcRenderer.send("open-add-product") ,// <--- เพิ่มบรรทัดนี้
  processPayment: (data) => ipcRenderer.invoke("process-payment", data),
  handleCreditPayment: (data) => ipcRenderer.invoke("handle-credit-payment", data),
  openCreditPayment: (amount) => ipcRenderer.send("open-credit-payment", amount),
  openCreditPayment: (amount) => ipcRenderer.invoke("open-credit-payment", amount),
  handleCreditPayment: (data) => ipcRenderer.invoke("handle-credit-payment", data),
  saveCreditHistory: (data) => ipcRenderer.invoke("save-credit-history", data), // เพิ่มให้บันทึก history ด้วย
});