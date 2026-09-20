/* eslint-disable */
// Preload — pont sécurisé entre Electron et le rendu
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("jangDesktop", {
  version: "1.0.0",
  platform: process.platform,
  isElectron: true,
});
