const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('carmineDesktop', {
  isDesktop: true,
  platform: process.platform,
  spotifyRedirectUri: () => ipcRenderer.invoke('spotify:redirect-uri'),
  spotifyLogin: (clientId) => ipcRenderer.invoke('spotify:login', clientId),
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
  version: () => ipcRenderer.invoke('desktop:version'),
})
