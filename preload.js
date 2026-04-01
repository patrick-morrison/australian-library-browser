const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("troveApi", {
  listProjects: () => ipcRenderer.invoke("projects:list"),
  createProject: (targetDir, name) => ipcRenderer.invoke("projects:create", targetDir, name),
  saveItem: (projectPath, item) => ipcRenderer.invoke("projects:save-item", projectPath, item),
  ignoreItem: (projectPath, item) => ipcRenderer.invoke("projects:ignore-item", projectPath, item),
  uncollectItem: (projectPath, item) => ipcRenderer.invoke("projects:uncollect-item", projectPath, item),
  unignoreItem: (projectPath, item) => ipcRenderer.invoke("projects:unignore-item", projectPath, item),
  previewMarkdown: (item) => ipcRenderer.invoke("items:preview-markdown", item),
  fetchItemByUrl: (targetUrl, options) => ipcRenderer.invoke("items:fetch-by-url", targetUrl, options || {}),
  runDebugCommand: (command, cwd) => ipcRenderer.invoke("debug:run-command", command, cwd),
  saveDebugCapture: (targetDir, capture) => ipcRenderer.invoke("debug:save-capture", targetDir, capture),
  chooseProjectDirectory: () => ipcRenderer.invoke("dialog:choose-project-directory"),
  openPath: (targetPath) => ipcRenderer.invoke("shell:open-path", targetPath),
  readTextFile: (targetPath) => ipcRenderer.invoke("files:read-text", targetPath),
  openExternal: (targetUrl) => ipcRenderer.invoke("shell:open-external", targetUrl),
  copyText: (value) => ipcRenderer.invoke("clipboard:write-text", value),
  onContextNewTab: (callback) => {
    ipcRenderer.on("context:new-tab", (_event, payload) => callback(payload));
  }
});
