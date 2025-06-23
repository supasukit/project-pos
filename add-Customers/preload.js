const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  addCustomer: (customer) => ipcRenderer.invoke("add-customer", customer),
});
