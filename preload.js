const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("troveApi", {
  listProjects: () => ipcRenderer.invoke("projects:list"),
  createProject: (targetDir, name) => ipcRenderer.invoke("projects:create", targetDir, name),
  hideProject: (projectPath) => ipcRenderer.invoke("projects:hide", projectPath),
  saveItem: (projectPath, item) => ipcRenderer.invoke("projects:save-item", projectPath, item),
  ignoreItem: (projectPath, item) => ipcRenderer.invoke("projects:ignore-item", projectPath, item),
  uncollectItem: (projectPath, item) => ipcRenderer.invoke("projects:uncollect-item", projectPath, item),
  unignoreItem: (projectPath, item) => ipcRenderer.invoke("projects:unignore-item", projectPath, item),
  previewMarkdown: (item) => ipcRenderer.invoke("items:preview-markdown", item),
  fetchItemByUrl: (targetUrl, options) => ipcRenderer.invoke("items:fetch-by-url", targetUrl, options || {}),
  runDebugCommand: (command, cwd) => ipcRenderer.invoke("debug:run-command", command, cwd),
  saveDebugCapture: (targetDir, capture) => ipcRenderer.invoke("debug:save-capture", targetDir, capture),
  saveSearchResults: (projectPath, searchExport) => ipcRenderer.invoke("projects:save-search-results", projectPath, searchExport),
  listSearchExports: (projectPath) => ipcRenderer.invoke("projects:list-searches", projectPath),
  deleteSearchExport: (projectPath, searchPath) => ipcRenderer.invoke("projects:delete-search", projectPath, searchPath),
  chooseProjectDirectory: () => ipcRenderer.invoke("dialog:choose-project-directory"),
  chooseProjectFolder: () => ipcRenderer.invoke("dialog:choose-project-folder"),
  openPath: (targetPath) => ipcRenderer.invoke("shell:open-path", targetPath),
  showItemInFolder: (targetPath) => ipcRenderer.invoke("shell:show-item-in-folder", targetPath),
  openTerminal: (targetPath) => ipcRenderer.invoke("shell:open-terminal", targetPath),
  readTextFile: (targetPath) => ipcRenderer.invoke("files:read-text", targetPath),
  readFileBytes: (targetPath) => ipcRenderer.invoke("files:read-bytes", targetPath),
  copyText: (value) => ipcRenderer.invoke("clipboard:write-text", value),
  notifyRendererReady: () => ipcRenderer.send("renderer:ready"),
  onSaveProgress: (callback) => {
    ipcRenderer.on("projects:save-progress", (_event, payload) => callback(payload));
  },
  onContextNewTab: (callback) => {
    ipcRenderer.on("context:new-tab", (_event, payload) => callback(payload));
  },
  onCommandOpenTabs: (callback) => {
    ipcRenderer.on("command:open-tabs", (_event, payload) => callback(payload));
  }
});
