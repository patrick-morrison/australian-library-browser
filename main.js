const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, session, clipboard } = require("electron");
const { JSDOM } = require("jsdom");

const libraryRegistry = require("./lib/library-registry");
const projectStore = require("./lib/project-store");
const sourceAdapters = require("./lib/source-adapters");

const workspaceRoot = process.cwd();
const execAsync = promisify(exec);
const customUserDataDir = String(process.env.TROVE_BROWSER_USER_DATA_DIR || "").trim();
if (customUserDataDir) {
  app.setPath("userData", path.resolve(customUserDataDir));
}
if (process.env.TROVE_BROWSER_DISABLE_GPU === "1") {
  app.disableHardwareAcceleration();
}
const WEBVIEW_PARTITION = "persist:trove-library";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const BROWSER_FETCH_HEADERS = {
  "user-agent": BROWSER_USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-AU,en;q=0.9",
  "upgrade-insecure-requests": "1"
};
let mainWindow = null;
let rendererReady = false;
let pendingTabUrls = [];

function normalizeIncomingUrl(value) {
  const trimmed = String(value || "").trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }
  try {
    return new URL(trimmed).toString();
  } catch {
    return "";
  }
}

function extractIncomingUrls(argv = []) {
  return [...new Set((Array.isArray(argv) ? argv : []).map(normalizeIncomingUrl).filter(Boolean))];
}

function queueTabUrls(urls = []) {
  const nextUrls = extractIncomingUrls(urls);
  if (!nextUrls.length) {
    return;
  }
  const seen = new Set(pendingTabUrls);
  for (const url of nextUrls) {
    if (!seen.has(url)) {
      pendingTabUrls.push(url);
      seen.add(url);
    }
  }
}

function flushPendingTabUrls() {
  if (!mainWindow || mainWindow.isDestroyed() || !rendererReady || !pendingTabUrls.length) {
    return;
  }
  const urls = pendingTabUrls.splice(0, pendingTabUrls.length);
  mainWindow.webContents.send("command:open-tabs", urls);
}

const disableSingleInstance = process.env.TROVE_BROWSER_DISABLE_SINGLE_INSTANCE === "1";
let hasSingleInstanceLock = true;
if (!disableSingleInstance) {
  const singleInstanceLock = app.requestSingleInstanceLock();
  hasSingleInstanceLock = singleInstanceLock;
  if (!singleInstanceLock) {
    app.quit();
  } else {
    queueTabUrls(process.argv.slice(1));
    app.on("second-instance", (_event, argv) => {
      queueTabUrls(argv.slice(1));
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
      flushPendingTabUrls();
    });
  }
} else {
  queueTabUrls(process.argv.slice(1));
}

async function listKnownProjects() {
  const directories = [workspaceRoot, ...(await libraryRegistry.readLibraryDirectories())];
  const uniqueDirectories = [...new Set(directories)];
  const hiddenProjects = new Set(await libraryRegistry.readHiddenProjectPaths());
  const grouped = await Promise.all(uniqueDirectories.map((directory) => projectStore.listProjects(directory)));
  const seen = new Set();
  return grouped
    .flat()
    .filter((project) => {
      if (seen.has(project.path)) {
        return false;
      }
      seen.add(project.path);
      return true;
    })
    .filter((project) => !hiddenProjects.has(project.path))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#efe3d0",
    title: "Trove Library Browser",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  window.loadFile(path.join(__dirname, "src/index.html"));
  return window;
}

function getCollectionSession() {
  return session.fromPartition(WEBVIEW_PARTITION);
}

async function fetchTextWithSession(collectionSession, targetUrl) {
  const response = await collectionSession.fetch(targetUrl, {
    method: "GET",
    headers: BROWSER_FETCH_HEADERS
  });
  return {
    response,
    finalUrl: response.url || targetUrl,
    html: await response.text()
  };
}

async function resolveRenderedTroveBridgeUrl(targetUrl) {
  const bridgeWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      partition: WEBVIEW_PARTITION,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      javascript: true
    }
  });

  try {
    await bridgeWindow.loadURL(targetUrl, { userAgent: BROWSER_USER_AGENT });
    const bridgeUrl = await bridgeWindow.webContents.executeJavaScript(
      `
        new Promise((resolve) => {
          const normalize = (value) => {
            try {
              const url = new URL(value, location.href);
              url.hash = "";
              return url.toString();
            } catch {
              return "";
            }
          };
          const linkPattern = /purl\\.slwa\\.wa\\.gov\\.au|catalogue\\.slwa\\.wa\\.gov\\.au/i;
          const startedAt = Date.now();
          const timeoutMs = 7000;

          const dismissModal = () => {
            const modal = document.querySelector("#culturalModal, [role='dialog'], .modal");
            if (!modal) {
              return;
            }
            const button = Array.from(modal.querySelectorAll("button, a, [role='button']")).find((node) =>
              /don't show cultural advice|dont show cultural advice|close|dismiss|continue|ok/i.test(
                [node.textContent, node.getAttribute("aria-label"), node.getAttribute("title"), node.className].join(" ")
              )
            );
            button?.click?.();
          };

          const clickLocate = () => {
            const button = Array.from(document.querySelectorAll("button, a, [role='button']")).find((node) =>
              /locate/i.test(
                [node.textContent, node.getAttribute("aria-label"), node.getAttribute("title"), node.className].join(" ")
              )
            );
            button?.click?.();
          };

          const findBridge = () =>
            Array.from(document.querySelectorAll("a[href]"))
              .map((anchor) => normalize(anchor.href))
              .find((href) => href && linkPattern.test(href)) || "";

          const tick = () => {
            dismissModal();
            const direct = findBridge();
            if (direct) {
              resolve(direct);
              return;
            }
            clickLocate();
            const elapsed = Date.now() - startedAt;
            if (elapsed >= timeoutMs) {
              resolve("");
              return;
            }
            setTimeout(tick, 250);
          };

          tick();
        });
      `,
      true
    );
    return sourceAdapters.normalizeUrl(bridgeUrl, targetUrl);
  } catch {
    return "";
  } finally {
    if (!bridgeWindow.isDestroyed()) {
      bridgeWindow.destroy();
    }
  }
}

function mergeSlwaAttachmentSets(...sets) {
  const canonicalAttachmentKey = (entry) => {
    const candidates = [entry.viewerUrl, entry.imageUrl, entry.thumbnailUrl, entry.id].filter(Boolean);
    for (const candidate of candidates) {
      const normalized = sourceAdapters.normalizeUrl(candidate, candidate);
      const slwaMatch = normalized.match(
        /https?:\/\/purl\.slwa\.wa\.gov\.au\/(?:download\/)?(slwa_[a-z0-9]+)_(\d+)(?:\.(jpg|jpeg|png|tif|tiff|webp))?$/i
      );
      if (slwaMatch) {
        return `${slwaMatch[1].toLowerCase()}_${Number.parseInt(slwaMatch[2], 10)}`;
      }
      if (normalized) {
        return normalized;
      }
    }
    return "";
  };

  const map = new Map();
  for (const set of sets) {
    for (const entry of Array.isArray(set) ? set : []) {
      const key = canonicalAttachmentKey(entry);
      if (!key) {
        continue;
      }
      const existing = map.get(key) || {};
      map.set(key, {
        ...existing,
        ...entry,
        title: entry.title || existing.title || "",
        id: entry.id || existing.id || ""
      });
    }
  }
  return [...map.values()];
}

async function hydrateSlwaGalleryItem(collectionSession, item, options = {}) {
  if (!item?.supported || item.source !== "slwa") {
    return item;
  }

  const mode = options.mode || "full";

  let workingItem = item;
  const workingUrl = sourceAdapters.normalizeUrl(workingItem.url || "", workingItem.url || "");
  const viewAllUrl = sourceAdapters.normalizeUrl(workingItem.viewAllUrl || "", workingItem.url || "");
  if (mode === "full" && viewAllUrl && viewAllUrl !== workingUrl) {
    const rootFetch = await fetchTextWithSession(collectionSession, viewAllUrl);
    const rootItem = sourceAdapters.extractItemFromHtml(rootFetch.finalUrl, rootFetch.html);
    if (rootItem?.supported && rootItem.source === "slwa") {
      workingItem = {
        ...rootItem,
        aliases: [...new Set([...(rootItem.aliases || []), ...(workingItem.aliases || []), workingItem.url])],
        viewAllUrl: rootItem.viewAllUrl || viewAllUrl
      };
    }
  }

  const seedAttachments = Array.isArray(workingItem.attachments) ? workingItem.attachments : [];
  const seedViewerUrls = Array.isArray(workingItem.viewerUrls) ? workingItem.viewerUrls : [];
  const viewerUrls = [...new Set([...seedViewerUrls, ...seedAttachments.map((entry) => entry.viewerUrl).filter(Boolean)])];
  if (!viewerUrls.length) {
    return workingItem;
  }

  const hydratedAttachments = [];
  const aliasSet = new Set([...(workingItem.aliases || []), workingItem.url, workingItem.viewAllUrl].filter(Boolean));
  const targetViewerUrls =
    mode === "full" ? viewerUrls.slice(0, 40) : viewerUrls.slice(0, 1);
  for (const viewerUrl of targetViewerUrls) {
    try {
      const viewerFetch = await fetchTextWithSession(collectionSession, viewerUrl);
      const viewerItem = sourceAdapters.extractItemFromHtml(viewerFetch.finalUrl, viewerFetch.html);
      if (viewerItem?.supported && viewerItem.source === "slwa") {
        const primaryAttachment =
          (Array.isArray(viewerItem.attachments) && viewerItem.attachments[0]) ||
          {
            id: viewerItem.id,
            title: viewerItem.title,
            viewerUrl: viewerItem.url,
            imageUrl: viewerItem.imageUrl,
            thumbnailUrl: viewerItem.imageUrl
          };
        hydratedAttachments.push(primaryAttachment);
        for (const alias of viewerItem.aliases || []) {
          aliasSet.add(alias);
        }
        aliasSet.add(viewerItem.url);
      }
    } catch {
      // Keep the record usable even if one child image fails to hydrate.
    }
  }

  const attachments = mergeSlwaAttachmentSets(seedAttachments, hydratedAttachments);
  if (!attachments.length) {
    return workingItem;
  }

  return {
    ...workingItem,
    type: "image",
    attachments,
    imageUrl: attachments[0]?.imageUrl || attachments[0]?.thumbnailUrl || workingItem.imageUrl || "",
    imageUrls: attachments.map((entry) => entry.imageUrl || entry.thumbnailUrl).filter(Boolean),
    viewerUrls: attachments.map((entry) => entry.viewerUrl).filter(Boolean),
    aliases: [...aliasSet]
  };
}

async function fetchItemByUrl(targetUrl) {
  const collectionSession = getCollectionSession();
  const options = arguments[1] || {};
  const directSlwaViewerUrl = sourceAdapters.buildSlwaViewerUrlFromDownloadUrl(targetUrl);
  if (directSlwaViewerUrl) {
    const viewerFetch = await fetchTextWithSession(collectionSession, directSlwaViewerUrl);
    const viewerItem = sourceAdapters.extractItemFromHtml(viewerFetch.finalUrl, viewerFetch.html);
    if (viewerItem?.supported) {
      const hydratedItem = await hydrateSlwaGalleryItem(collectionSession, {
        ...viewerItem,
        aliases: [...new Set([...(viewerItem.aliases || []), sourceAdapters.normalizeUrl(targetUrl, targetUrl)])]
      }, options);
      return {
        ...hydratedItem,
        fetchedUrl: viewerFetch.finalUrl,
        status: viewerFetch.response.status
      };
    }
  }

  const { response, finalUrl, html } = await fetchTextWithSession(collectionSession, targetUrl);

  if (new URL(finalUrl).hostname === "catalogue.slwa.wa.gov.au") {
    const classicDocument = new JSDOM(html, { url: finalUrl }).window.document;
    const recordId = sourceAdapters.findSlwaClassicRecordId(classicDocument, finalUrl);
    const viewerUrl = sourceAdapters.findSlwaViewerUrl(classicDocument, finalUrl);

    if (viewerUrl) {
      const viewerFetch = await fetchTextWithSession(collectionSession, viewerUrl);
      const viewerItem = sourceAdapters.extractItemFromHtml(viewerFetch.finalUrl, viewerFetch.html);
      if (viewerItem?.supported) {
        return {
          ...viewerItem,
          aliases: [...new Set([...(viewerItem.aliases || []), finalUrl])],
          fetchedUrl: viewerFetch.finalUrl,
          status: viewerFetch.response.status
        };
      }
    }

    if (recordId) {
      const classicRecordUrl = `https://catalogue.slwa.wa.gov.au/record=${recordId}~S2`;
      if (sourceAdapters.normalizeUrl(finalUrl, finalUrl) !== sourceAdapters.normalizeUrl(classicRecordUrl, classicRecordUrl)) {
        const classicRecordFetch = await fetchTextWithSession(collectionSession, classicRecordUrl);
        const classicRecordDocument = new JSDOM(classicRecordFetch.html, { url: classicRecordFetch.finalUrl }).window.document;
        const classicViewerUrl = sourceAdapters.findSlwaViewerUrl(classicRecordDocument, classicRecordFetch.finalUrl);
        if (classicViewerUrl) {
          const viewerFetch = await fetchTextWithSession(collectionSession, classicViewerUrl);
          const viewerItem = sourceAdapters.extractItemFromHtml(viewerFetch.finalUrl, viewerFetch.html);
          if (viewerItem?.supported) {
            return {
              ...viewerItem,
              aliases: [...new Set([...(viewerItem.aliases || []), finalUrl, classicRecordFetch.finalUrl])],
              fetchedUrl: viewerFetch.finalUrl,
              status: viewerFetch.response.status
            };
          }
        }
      }

      const encoreUrl = sourceAdapters.buildSlwaEncoreRecordUrl(recordId);
      const encoreFetch = await fetchTextWithSession(collectionSession, encoreUrl);
      const encoreItem = sourceAdapters.extractItemFromHtml(encoreFetch.finalUrl, encoreFetch.html);
      if (encoreItem?.supported) {
        return {
          ...encoreItem,
          aliases: [...new Set([...(encoreItem.aliases || []), finalUrl])],
          fetchedUrl: encoreFetch.finalUrl,
          status: encoreFetch.response.status
        };
      }
    }
  }

  const item = sourceAdapters.extractItemFromHtml(finalUrl, html);

  if (!item?.supported) {
    return {
      ...item,
      fetchedUrl: finalUrl,
      status: response.status
    };
  }

  if (item.source === "trove" && /\/work\/\d+/i.test(item.url || finalUrl)) {
    const bridgeUrl = await resolveRenderedTroveBridgeUrl(finalUrl);
    const normalizedBridgeUrl = sourceAdapters.normalizeUrl(bridgeUrl, finalUrl);
    if (normalizedBridgeUrl && normalizedBridgeUrl !== sourceAdapters.normalizeUrl(finalUrl, finalUrl)) {
      const bridgedItem = await fetchItemByUrl(normalizedBridgeUrl, options);
      if (bridgedItem?.supported) {
        return {
          ...bridgedItem,
          aliases: [
            ...new Set([
              ...(bridgedItem.aliases || []),
              sourceAdapters.normalizeUrl(finalUrl, finalUrl),
              ...(item.aliases || []),
              normalizedBridgeUrl
            ])
          ],
          bridgedFrom: {
            source: item.source,
            url: sourceAdapters.normalizeUrl(finalUrl, finalUrl)
          }
        };
      }
    }
  }

  const hydratedItem = await hydrateSlwaGalleryItem(collectionSession, item, options);

  return {
    ...hydratedItem,
    fetchedUrl: finalUrl,
    status: response.status
  };
}

function installWebContentsContextMenus(mainWindow) {
  if (app.__troveLibraryContextMenusInstalled) {
    return;
  }
  app.__troveLibraryContextMenusInstalled = true;
  app.on("web-contents-created", (_event, contents) => {
    if (typeof contents.setWindowOpenHandler === "function") {
      contents.setWindowOpenHandler((details) => {
        mainWindow.webContents.send("context:new-tab", {
          url: details.url,
          activate: details.disposition === "foreground-tab" || details.disposition === "new-window"
        });
        return { action: "deny" };
      });
    }
    contents.on("context-menu", (_menuEvent, params) => {
      const template = [];

      if (params.linkURL) {
        template.push({
          label: "Open Link in New Tab",
          click: () => {
            mainWindow.webContents.send("context:new-tab", {
              url: params.linkURL,
              activate: false
            });
          }
        });
        template.push({
          label: "Copy Link",
          click: () => {
            clipboard.writeText(params.linkURL);
          }
        });
        template.push({
          label: "Open Link Externally",
          click: () => {
            void shell.openExternal(params.linkURL);
          }
        });
      }

      if (!params.linkURL && !params.isEditable) {
        template.push({
          label: "Duplicate Tab",
          click: () => {
            mainWindow.webContents.send("context:new-tab", {
              url: contents.getURL(),
              activate: false
            });
          }
        });
        template.push({
          label: "Reload",
          click: () => {
            contents.reload();
          }
        });
      }

      if (params.isEditable) {
        template.push({ role: "cut" }, { role: "copy" }, { role: "paste" });
      } else if (params.selectionText) {
        template.push({ role: "copy" });
      }

      if (!template.length) {
        return;
      }

      Menu.buildFromTemplate(template).popup({
        window: BrowserWindow.fromWebContents(contents) || mainWindow
      });
    });
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) {
    return;
  }
  ipcMain.handle("projects:list", async () => listKnownProjects());
  ipcMain.handle("projects:create", async (_event, targetDir, name) => {
    const baseDir = targetDir || workspaceRoot;
    const project = await projectStore.createProject(baseDir, name);
    if (baseDir !== workspaceRoot) {
      await libraryRegistry.registerLibraryDirectory(baseDir);
    }
    await libraryRegistry.unhideProjectPath(project.path);
    return project;
  });
  ipcMain.handle("projects:hide", async (_event, projectPath) => {
    await libraryRegistry.hideProjectPath(projectPath);
    return true;
  });
  ipcMain.handle("projects:save-item", async (event, projectPath, item) =>
    projectStore.saveItem(projectPath, item, (progress) => {
      event.sender.send("projects:save-progress", progress);
    })
  );
  ipcMain.handle("projects:save-search-results", async (_event, projectPath, searchExport) =>
    projectStore.saveSearchResults(projectPath, searchExport)
  );
  ipcMain.handle("projects:list-searches", async (_event, projectPath) => projectStore.listSearchExports(projectPath));
  ipcMain.handle("projects:delete-search", async (_event, projectPath, searchPath) =>
    projectStore.deleteSearchExport(projectPath, searchPath)
  );
  ipcMain.handle("projects:ignore-item", async (_event, projectPath, item) => projectStore.ignoreItem(projectPath, item));
  ipcMain.handle("projects:uncollect-item", async (_event, projectPath, item) =>
    projectStore.uncollectItem(projectPath, item)
  );
  ipcMain.handle("projects:unignore-item", async (_event, projectPath, item) =>
    projectStore.unignoreItem(projectPath, item)
  );
  ipcMain.handle("items:preview-markdown", async (_event, item) => projectStore.buildPreviewMarkdown(item));
  ipcMain.handle("items:fetch-by-url", async (_event, targetUrl, options) => fetchItemByUrl(targetUrl, options || {}));
  ipcMain.handle("debug:run-command", async (_event, command, cwd) => {
    const targetCwd = cwd || workspaceRoot;
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: targetCwd,
        maxBuffer: 1024 * 1024 * 4,
        shell: "/bin/zsh"
      });
      return {
        cwd: targetCwd,
        stdout,
        stderr,
        success: true
      };
    } catch (error) {
      return {
        cwd: targetCwd,
        stdout: error.stdout || "",
        stderr: error.stderr || error.message || "",
        success: false
      };
    }
  });
  ipcMain.handle("debug:save-capture", async (_event, targetDir, capture) => {
    return projectStore.saveDebugCapture(targetDir || workspaceRoot, capture);
  });
  ipcMain.handle("dialog:choose-project-directory", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose Library Location",
      buttonLabel: "Use This Folder",
      properties: ["openDirectory", "createDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("dialog:choose-project-folder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Open Existing Library",
      buttonLabel: "Open Library",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    const projectPath = result.filePaths[0];
    if (!(await projectStore.isProjectDirectory(projectPath))) {
      throw new Error("Choose a library folder.");
    }
    await libraryRegistry.registerLibraryDirectory(path.dirname(projectPath));
    await libraryRegistry.unhideProjectPath(projectPath);
    return projectPath;
  });
  ipcMain.handle("files:read-text", async (_event, targetPath) => fs.readFile(targetPath, "utf8"));
  ipcMain.handle("shell:open-path", async (_event, targetPath) => shell.openPath(targetPath));
  ipcMain.handle("shell:open-external", async (_event, targetUrl) => shell.openExternal(targetUrl));
  ipcMain.handle("clipboard:write-text", async (_event, value) => {
    clipboard.writeText(String(value || ""));
    return true;
  });
  ipcMain.on("renderer:ready", () => {
    rendererReady = true;
    flushPendingTabUrls();
  });

  mainWindow = createWindow();
  mainWindow.on("closed", () => {
    mainWindow = null;
    rendererReady = false;
  });
  installWebContentsContextMenus(mainWindow);
  mainWindow.webContents.on("did-finish-load", () => {
    flushPendingTabUrls();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      rendererReady = false;
      installWebContentsContextMenus(mainWindow);
      mainWindow.webContents.on("did-finish-load", () => {
        flushPendingTabUrls();
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
