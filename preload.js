const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("brainGameMeta", {
  platform: process.platform,
  electron: process.versions.electron,
  chrome: process.versions.chrome
});

contextBridge.exposeInMainWorld("brainDb", {
  ensureUser: (username) => ipcRenderer.invoke("stats:ensure-user", username),
  addSession: (session) => ipcRenderer.invoke("stats:add-session", session),
  getOverview: (username, limit = 50, trendDays = 120) =>
    ipcRenderer.invoke("stats:get-overview", { username, limit, trendDays }),
  deleteSession: (username, sessionId) =>
    ipcRenderer.invoke("stats:delete-session", { username, sessionId })
});
