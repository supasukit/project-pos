const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  addProduct: (data) => ipcRenderer.invoke("add-product", data),
});
