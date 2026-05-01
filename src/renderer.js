const sourceRegistry = window.CollectionSourcePlugins;
const WEBVIEW_PARTITION = "persist:trove-library";

const state = {
  projects: [],
  activeProjectPath: "",
  projectContextPath: "",
  tabs: [],
  activeTabId: "",
  plugins: sourceRegistry.listPlugins(),
  selectedProjectDirectory: "",
  projectSearches: [],
  savedSearchMenuOpen: false,
  mode: "collect",
  manageFilter: "saved",
  manageQuery: "",
  manageLayout: "compact",
  manageExpandedKey: "",
  debugOpen: false,
  captureRequestId: 0,
  sidebarWidth: 360,
  manageRenderToken: 0,
  captureBusy: null,
  saveProgress: null,
  actionQueue: [],
  actionQueueRunning: false,
  actionQueueTimer: null,
  currentQueueJob: null,
  queueTrayVisible: false,
  queueTrayRevealTimer: null,
  queuedActionIds: new Set(),
  actionNonce: 0,
  perfEvents: [],
  previewActionId: "",
  previewIntent: null,
  linkDialogSourceId: "trove",
  linkDialogUrls: [],
  queueTrayOpen: false
};

const elements = {
  newProjectButton: document.getElementById("new-project-button"),
  openProjectButton: document.getElementById("open-project-button"),
  projectDialog: document.getElementById("project-dialog"),
  projectDialogBackdrop: document.getElementById("project-dialog-backdrop"),
  projectDialogForm: document.getElementById("project-dialog-form"),
  projectDialogName: document.getElementById("project-dialog-name"),
  projectDialogLocation: document.getElementById("project-dialog-location"),
  projectDialogChooseLocation: document.getElementById("project-dialog-choose-location"),
  projectDialogCancel: document.getElementById("project-dialog-cancel"),
  modeCollect: document.getElementById("mode-collect"),
  modeManage: document.getElementById("mode-manage"),
  modePlugins: document.getElementById("mode-plugins"),
  projectCount: document.getElementById("project-count"),
  projectList: document.getElementById("project-list"),
  projectContextMenu: document.getElementById("project-context-menu"),
  projectContextOpenFolder: document.getElementById("project-context-open-folder"),
  projectContextOpenTerminal: document.getElementById("project-context-open-terminal"),
  projectContextHide: document.getElementById("project-context-hide"),
  projectDetails: document.getElementById("project-details"),
  savedSearches: document.getElementById("saved-searches"),
  sourceList: document.getElementById("source-list"),
  pluginsSupported: document.getElementById("plugins-supported"),
  openProjectFolder: document.getElementById("open-project-folder"),
  openProjectTerminal: document.getElementById("open-project-terminal"),
  openSearchesFolder: document.getElementById("open-searches-folder"),
  closeProjectButton: document.getElementById("close-project-button"),
  sidebarResizer: document.getElementById("sidebar-resizer"),
  addressForm: document.getElementById("address-form"),
  addressInput: document.getElementById("address-input"),
  tabs: document.getElementById("tabs"),
  collectView: document.getElementById("collect-view"),
  manageView: document.getElementById("manage-view"),
  pluginsView: document.getElementById("plugins-view"),
  manageSummary: document.getElementById("manage-summary"),
  manageList: document.getElementById("manage-list"),
  manageSearch: document.getElementById("manage-search"),
  filterAll: document.getElementById("filter-all"),
  filterSaved: document.getElementById("filter-saved"),
  filterIgnored: document.getElementById("filter-ignored"),
  filterUncollected: document.getElementById("filter-uncollected"),
  layoutCards: document.getElementById("layout-cards"),
  layoutCompact: document.getElementById("layout-compact"),
  openItemsCsv: document.getElementById("open-items-csv"),
  webviewStack: document.getElementById("webview-stack"),
  backButton: document.getElementById("back-button"),
  forwardButton: document.getElementById("forward-button"),
  reloadButton: document.getElementById("reload-button"),
  saveSearchButton: document.getElementById("save-search-button"),
  savedSearchesButton: document.getElementById("saved-searches-button"),
  savedSearchesMenu: document.getElementById("saved-searches-menu"),
  pageFindBar: document.getElementById("page-find-bar"),
  pageFindInput: document.getElementById("page-find-input"),
  pageFindCount: document.getElementById("page-find-count"),
  pageFindPrev: document.getElementById("page-find-prev"),
  pageFindNext: document.getElementById("page-find-next"),
  pageFindClose: document.getElementById("page-find-close"),
  newTabButton: document.getElementById("new-tab-button"),
  debugToggle: document.getElementById("debug-toggle"),
  pageStatus: document.getElementById("page-status"),
  pageKind: document.getElementById("page-kind"),
  message: document.getElementById("message"),
  capturePanel: document.getElementById("capture-panel"),
  captureEmpty: document.getElementById("capture-empty"),
  captureBody: document.getElementById("capture-body"),
  captureIgnore: document.getElementById("capture-ignore"),
  captureCollect: document.getElementById("capture-collect"),
  captureCopyMarkdown: document.getElementById("capture-copy-markdown"),
  captureFindBar: document.getElementById("capture-find-bar"),
  captureFindInput: document.getElementById("capture-find-input"),
  captureFindCount: document.getElementById("capture-find-count"),
  captureFindPrev: document.getElementById("capture-find-prev"),
  captureFindNext: document.getElementById("capture-find-next"),
  captureFindClose: document.getElementById("capture-find-close"),
  captureProgress: document.getElementById("capture-progress"),
  captureImageSection: document.getElementById("capture-image-section"),
  captureImageGallery: document.getElementById("capture-image-gallery"),
  captureMarkdown: document.getElementById("capture-markdown"),
  queueTray: document.getElementById("queue-tray"),
  queueTrayToggle: document.getElementById("queue-tray-toggle"),
  queueTrayCount: document.getElementById("queue-tray-count"),
  queueTrayCurrent: document.getElementById("queue-tray-current"),
  queueTrayMeta: document.getElementById("queue-tray-meta"),
  queueTrayPanel: document.getElementById("queue-tray-panel"),
  imageLightbox: document.getElementById("image-lightbox"),
  imageLightboxBackdrop: document.getElementById("image-lightbox-backdrop"),
  imageLightboxClose: document.getElementById("image-lightbox-close"),
  imageLightboxImg: document.getElementById("image-lightbox-img"),
  imageLightboxCaption: document.getElementById("image-lightbox-caption"),
  pluginSeedUrls: document.getElementById("plugin-seed-urls"),
  pluginDropZone: document.getElementById("plugin-drop-zone"),
  pluginUrlAnalysis: document.getElementById("plugin-url-analysis"),
  pluginOpenSelected: document.getElementById("plugin-open-selected"),
  pluginClearIntake: document.getElementById("plugin-clear-intake"),
  settingsOpenDebug: document.getElementById("settings-open-debug"),
  troveLinkExtractorStatus: document.getElementById("trove-link-extractor-status"),
  troveLinkDialog: document.getElementById("trove-link-dialog"),
  troveLinkDialogBackdrop: document.getElementById("trove-link-dialog-backdrop"),
  troveLinkDialogTitle: document.getElementById("trove-link-dialog-title"),
  troveLinkDialogCopy: document.getElementById("trove-link-dialog-copy"),
  troveLinkDialogLabel: document.getElementById("trove-link-dialog-label"),
  troveLinkDialogInput: document.getElementById("trove-link-dialog-input"),
  troveLinkDialogStatus: document.getElementById("trove-link-dialog-status"),
  troveLinkDialogPreview: document.getElementById("trove-link-dialog-preview"),
  troveLinkDialogCancel: document.getElementById("trove-link-dialog-cancel"),
  troveLinkDialogOpenUnresolved: document.getElementById("trove-link-dialog-open-unresolved"),
  troveLinkDialogOpen: document.getElementById("trove-link-dialog-open"),
  debugDrawer: document.getElementById("debug-drawer"),
  debugClose: document.getElementById("debug-close"),
  debugSavePage: document.getElementById("debug-save-page"),
  debugSaveItem: document.getElementById("debug-save-item"),
  debugSavePreview: document.getElementById("debug-save-preview"),
  debugPerfSnapshot: document.getElementById("debug-perf-snapshot"),
  debugForm: document.getElementById("debug-form"),
  debugCommand: document.getElementById("debug-command"),
  debugOutput: document.getElementById("debug-output"),
  debugCwd: document.getElementById("debug-cwd"),
  projectCardTemplate: document.getElementById("project-card-template"),
  manageItemTemplate: document.getElementById("manage-item-template")
};

const previewState = {
  item: null,
  markdown: "",
  origin: "page",
  tabId: "",
  pageUrl: "",
  imageIndex: 0,
  statusOverride: "",
  statusOverrideProjectPath: "",
  findOpen: false,
  findQuery: "",
  findMatches: [],
  findActiveIndex: -1
};

const pageFindState = {
  open: false,
  query: "",
  matches: 0,
  activeMatchOrdinal: 0
};

const backgroundFetchPendingCache = new Map();
const backgroundFetchResultCache = new Map();
const previewMarkdownCache = new Map();
const pageLoadingStartTimes = new Map();
const BACKGROUND_FETCH_MAX_ENTRIES = 400;
const PREVIEW_MARKDOWN_MAX_ENTRIES = 400;
const QUEUE_TRAY_REVEAL_DELAY_MS = 650;
const PREVIEW_CLICK_DEBOUNCE_MS = 80;
const PREVIEW_FETCH_TIMEOUT_MS = 18000;
const CAPTURE_FETCH_TIMEOUT_MS = 18000;
const WEBVIEW_LOAD_TIMEOUT_MS = 45000;
let webviewResizeObserver = null;
let previewClickTimer = null;
let pendingPreviewRequest = null;
let activePreviewLoading = null;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function renderMarkdownHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const chunks = [];
  let paragraph = [];
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    chunks.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }
    chunks.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      chunks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = trimmed.match(/^- (.*)$/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }
    if (trimmed === "---") {
      flushParagraph();
      flushList();
      chunks.push("<hr>");
      continue;
    }
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return chunks.join("");
}

function applySidebarWidth() {
  document.querySelector(".app-shell")?.style.setProperty("--sidebar-width", `${state.sidebarWidth}px`);
}

function getActiveProject() {
  return state.projects.find((project) => project.path === state.activeProjectPath) || null;
}

function getProjectByPath(projectPath) {
  if (!projectPath) {
    return null;
  }
  return state.projects.find((project) => project.path === projectPath) || null;
}

function renderProjectDialogLocation() {
  elements.projectDialogLocation.textContent = state.selectedProjectDirectory
    ? state.selectedProjectDirectory
    : "This workspace by default.";
}

function openProjectDialog() {
  renderProjectDialogLocation();
  elements.projectDialog.hidden = false;
  elements.projectDialogName.value = "";
  queueMicrotask(() => elements.projectDialogName.focus());
}

function closeProjectDialog() {
  elements.projectDialog.hidden = true;
  elements.projectDialogName.value = "";
}

function getSourceLinkDialogConfig(sourceId = state.linkDialogSourceId) {
  if (sourceId === "omni") {
    return {
      id: "omni",
      label: "Supported",
      intro: "Supported collection links were pulled from your notes. Open one link, every link, or only links that are not already collected or ignored.",
      placeholder: "Paste research notes here",
      emptyText: "Paste text to preview supported collection links.",
      extractorHint: "Looks for installed-source collection links only.",
      extractUrls: extractSupportedImportUrls,
      describeUrl: describeSupportedImportUrl
    };
  }
  if (sourceId === "slwa") {
    return {
      id: "slwa",
      label: "SLWA",
      intro: "Paste notes, catalogue text, or a rough link dump. SLWA catalogue, record, and media URLs will be pulled out, checked, and opened together as tabs.",
      placeholder: "Paste notes or article text with SLWA links here",
      emptyText: "Paste text to preview extracted SLWA links.",
      extractorHint: "Looks for SLWA catalogue, record, and media URLs inside unstructured text.",
      extractUrls: extractSlwaUrls,
      describeUrl: describeSlwaLinkUrl
    };
  }

  return {
    id: "trove",
    label: "Trove",
    intro: "Paste notes, article text, or a rough link dump. Trove URLs will be pulled out, checked, and opened together as tabs.",
    placeholder: "Paste notes or article text with Trove links here",
    emptyText: "Paste text to preview extracted Trove links.",
    extractorHint: "Looks for Trove article, work, and search URLs inside unstructured text.",
    extractUrls: extractTroveUrls,
    describeUrl: describeTroveLinkUrl
  };
}

function describeTroveLinkUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (/\/newspaper\/article\/(\d+)/i.test(path)) {
      const [, id] = path.match(/\/newspaper\/article\/(\d+)/i) || [];
      return {
        kind: "Article",
        summary: `newspaper/article/${id || ""}`,
        detail: parsed.hostname.replace(/^www\./i, "")
      };
    }
    if (/\/work\/(\d+)/i.test(path)) {
      const [, id] = path.match(/\/work\/(\d+)/i) || [];
      return {
        kind: "Work",
        summary: `work/${id || ""}`,
        detail: parsed.hostname.replace(/^www\./i, "")
      };
    }
    if (/\/search\//i.test(path) || path === "/search") {
      const query =
        parsed.searchParams.get("keyword") ||
        parsed.searchParams.get("q") ||
        parsed.searchParams.get("query") ||
        parsed.searchParams.get("searcharg") ||
        "";
      return {
        kind: "Search",
        summary: query ? `search · ${query}` : "search",
        detail: formatSavedSearchUrl(url)
      };
    }
    return {
      kind: "Trove",
      summary: path.replace(/^\//, "") || parsed.hostname,
      detail: formatSavedSearchUrl(url)
    };
  } catch {
    return {
      kind: "Trove",
      summary: url,
      detail: url
    };
  }
}

function describeSlwaLinkUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    if (/\/iii\/encore\/record\//i.test(path)) {
      return {
        kind: "Record",
        summary: path.replace(/^\/+/i, "").replace(/^iii\/encore\//i, ""),
        detail: host
      };
    }
    if (/\/iii\/encore\/search\//i.test(path) || /\/iii\/encore\/search/i.test(path)) {
      const query =
        parsed.searchParams.get("q") ||
        parsed.searchParams.get("searcharg") ||
        parsed.searchParams.get("term") ||
        "";
      return {
        kind: "Search",
        summary: query ? `search · ${query}` : "search",
        detail: `${host}${parsed.pathname}${parsed.search}`
      };
    }
    if (/^purl\.slwa\.wa\.gov\.au$/i.test(host)) {
      const filename = path.split("/").filter(Boolean).pop() || host;
      return {
        kind: /\/download\//i.test(path) || /\.(jpg|jpeg|png|tif|tiff|webp)$/i.test(path) ? "Media" : "PURL",
        summary: filename,
        detail: host
      };
    }
    if (/^catalogue\.slwa\.wa\.gov\.au$/i.test(host)) {
      const recordMatch = path.match(/record=([^/?#]+)/i);
      return {
        kind: "Catalogue",
        summary: recordMatch ? `record ${recordMatch[1]}` : path.replace(/^\//, "") || host,
        detail: host
      };
    }
    return {
      kind: "SLWA",
      summary: path.replace(/^\//, "") || host,
      detail: `${host}${parsed.search || ""}`
    };
  } catch {
    return {
      kind: "SLWA",
      summary: url,
      detail: url
    };
  }
}

function getPluginForUrl(url) {
  return state.plugins.find((plugin) => pluginMatchesUrl(plugin, url)) || null;
}

function describeSupportedImportUrl(url) {
  const plugin = getPluginForUrl(url);
  if (plugin?.id === "slwa") {
    return describeSlwaLinkUrl(url);
  }
  if (plugin?.id === "trove") {
    return describeTroveLinkUrl(url);
  }
  try {
    const parsed = new URL(url);
    return {
      kind: plugin?.label || "Supported",
      summary: parsed.pathname.replace(/^\//, "") || parsed.hostname,
      detail: parsed.hostname.replace(/^www\./i, "")
    };
  } catch {
    return {
      kind: plugin?.label || "Supported",
      summary: url,
      detail: url
    };
  }
}

function getSourceIdForUrl(url, fallback = state.linkDialogSourceId) {
  const plugin = getPluginForUrl(url);
  return plugin?.id || fallback || "trove";
}

function getLinkDialogItemStatus(url, project = getActiveProject(), sourceId = state.linkDialogSourceId) {
  if (!project || !url) {
    return "";
  }
  const effectiveSourceId = sourceId === "omni" ? getSourceIdForUrl(url, sourceId) : sourceId;
  const sourceLabel = getPluginForUrl(url)?.label || (effectiveSourceId === "slwa" ? "SLWA" : "Trove");
  return getEffectiveItemStatus(project, {
    url: ensureUrl(url),
    aliases: [ensureUrl(url)],
    source: effectiveSourceId,
    sourceLabel
  });
}

function getUnresolvedLinkDialogUrls(
  urls = state.linkDialogUrls,
  project = getActiveProject(),
  sourceId = state.linkDialogSourceId
) {
  return (Array.isArray(urls) ? urls : []).filter((url) => !getLinkDialogItemStatus(url, project, sourceId));
}

function renderTroveLinkDialogPreview() {
  const config = getSourceLinkDialogConfig();
  const urls = state.linkDialogUrls;
  const project = getActiveProject();
  const unresolvedUrls = getUnresolvedLinkDialogUrls(urls, project, config.id);
  if (elements.troveLinkDialogTitle) {
    elements.troveLinkDialogTitle.textContent = `Paste ${config.label} Links`;
  }
  if (elements.troveLinkDialogCopy) {
    elements.troveLinkDialogCopy.textContent = config.intro;
  }
  if (elements.troveLinkDialogLabel) {
    elements.troveLinkDialogLabel.textContent = "Source text";
  }
  if (elements.troveLinkDialogInput) {
    elements.troveLinkDialogInput.placeholder = config.placeholder;
  }
  elements.troveLinkDialogOpen.disabled = !urls.length;
  if (elements.troveLinkDialogOpenUnresolved) {
    elements.troveLinkDialogOpenUnresolved.disabled = !unresolvedUrls.length;
    elements.troveLinkDialogOpenUnresolved.textContent =
      config.id === "omni" ? "Open Not Yet Handled" : "Open Unresolved";
  }
  if (elements.troveLinkDialogOpen) {
    elements.troveLinkDialogOpen.textContent = config.id === "omni" ? "Open All" : "Open Tabs";
  }
  elements.troveLinkDialogStatus.textContent = urls.length
    ? `Found ${urls.length} ${config.label.toLowerCase()} link${urls.length === 1 ? "" : "s"}${project ? ` · ${unresolvedUrls.length} not collected or ignored` : ""}.`
    : `No ${config.label} links found yet.`;
  if (elements.troveLinkExtractorStatus) {
    elements.troveLinkExtractorStatus.textContent = urls.length
      ? `${urls.length} ${config.label} link${urls.length === 1 ? "" : "s"} ready to open from pasted text.`
      : config.extractorHint;
  }

  if (!urls.length) {
    elements.troveLinkDialogPreview.className = "trove-link-dialog-preview empty-state";
    elements.troveLinkDialogPreview.textContent = config.emptyText;
    return;
  }

  elements.troveLinkDialogPreview.className = "trove-link-dialog-preview";
  elements.troveLinkDialogPreview.innerHTML = urls
    .map((url, index) => {
      const meta = config.describeUrl(url);
      const status = getLinkDialogItemStatus(url, project, config.id);
      const statusBadge =
        status === "saved"
          ? '<span class="trove-link-preview-status is-saved">Collected</span>'
          : status === "ignored"
            ? '<span class="trove-link-preview-status is-ignored">Ignored</span>'
            : '<span class="trove-link-preview-status">Not collected/ignored</span>';
      return `
        <div class="trove-link-preview-item">
          <div class="trove-link-preview-head">
            <span class="trove-link-preview-index">Link ${index + 1}</span>
            <span class="trove-link-preview-kind">${escapeHtml(meta.kind)}</span>
            ${statusBadge}
            <button type="button" class="trove-link-preview-open" data-url="${escapeHtml(url)}">Open</button>
          </div>
          <strong class="trove-link-preview-summary">${escapeHtml(meta.summary)}</strong>
          <span class="trove-link-preview-url">${escapeHtml(meta.detail)}</span>
        </div>
      `
    })
    .join("");
}

function updateTroveLinkDialogFromInput() {
  const config = getSourceLinkDialogConfig();
  state.linkDialogUrls = config.extractUrls(elements.troveLinkDialogInput.value);
  renderTroveLinkDialogPreview();
}

function openTroveLinkDialog(sourceId = "trove") {
  state.linkDialogSourceId = sourceId;
  state.linkDialogUrls = [];
  elements.troveLinkDialogInput.value = "";
  renderTroveLinkDialogPreview();
  elements.troveLinkDialog.hidden = false;
  queueMicrotask(() => elements.troveLinkDialogInput.focus());
}

function closeTroveLinkDialog() {
  elements.troveLinkDialog.hidden = true;
  elements.troveLinkDialogInput.value = "";
  state.linkDialogUrls = [];
  renderTroveLinkDialogPreview();
}

async function refreshProjectSearches(project = getActiveProject()) {
  if (!project) {
    state.projectSearches = [];
    renderSavedSearchMenu();
    updateNavigationButtons();
    return;
  }
  state.projectSearches = await window.troveApi.listSearchExports(project.path);
  renderSavedSearchMenu();
  updateNavigationButtons();
}

function renderSavedSearches() {
  const project = getActiveProject();
  const searches = state.projectSearches || [];
  if (!elements.savedSearches || !elements.openSearchesFolder) {
    return;
  }
  elements.openSearchesFolder.disabled = !project;

  if (!project) {
    elements.savedSearches.className = "saved-searches empty-state";
    elements.savedSearches.textContent = "Select a project to see its saved searches.";
    return;
  }

  if (!searches.length) {
    elements.savedSearches.className = "saved-searches empty-state";
    elements.savedSearches.textContent = "No saved searches yet. Use Save while browsing result pages.";
    return;
  }

  const renderRow = (search) => `
    <button
      type="button"
      class="saved-search-item${isSearchCurrent(search.url || "") ? " is-current" : ""}"
      data-search-path="${escapeHtml(search.path)}"
      data-search-url="${escapeHtml(search.url || "")}"
    >
      <strong>${escapeHtml(search.label || search.name.replace(/\.url\.txt$/i, "").replace(/\.csv$/i, ""))}</strong>
      <span class="saved-search-meta">${escapeHtml(formatSavedSearchUrl(search.url || ""))}</span>
      <span class="saved-search-meta">${escapeHtml(formatDate(search.modifiedAt))}</span>
    </button>
  `;

  elements.savedSearches.className = "saved-searches";
  elements.savedSearches.innerHTML = searches.map(renderRow).join("");

  for (const container of [elements.savedSearches]) {
    container.querySelectorAll("[data-search-path]").forEach((button) => {
      button.addEventListener("click", () => {
        const url = button.getAttribute("data-search-url") || "";
        if (url) {
          const activeTab = getActiveTab();
          setMode("collect");
          if (activeTab) {
            void navigateExistingTab(activeTab, url);
          } else {
            createTab(url);
          }
          return;
        }
        void window.troveApi.openPath(button.getAttribute("data-search-path") || "");
      });
    });
  }
}

function closeSavedSearchMenu() {
  state.savedSearchMenuOpen = false;
  elements.savedSearchesMenu.hidden = true;
  elements.savedSearchesButton.setAttribute("aria-expanded", "false");
}

function openSavedSearchUrl(url) {
  if (!url) {
    return;
  }
  const activeTab = getActiveTab();
  setMode("collect");
  if (activeTab) {
    void navigateExistingTab(activeTab, url);
  } else {
    createTab(url);
  }
}

async function deleteSavedSearch(searchPath, searchName) {
  const project = getActiveProject();
  if (!project) {
    return;
  }
  const confirmed = window.confirm(`Delete this saved search?\n\n${searchName}`);
  if (!confirmed) {
    return;
  }
  await window.troveApi.deleteSearchExport(project.path, searchPath);
  await refreshProjectSearches(project);
  renderSavedSearches();
  renderSavedSearchMenu();
  setMessage(`Deleted saved search ${searchName}.`);
}

function renderSavedSearchMenu() {
  const project = getActiveProject();
  const searches = state.projectSearches || [];
  if (!elements.savedSearchesMenu || !elements.savedSearchesButton) {
    return;
  }

  elements.savedSearchesButton.disabled = !project || !searches.length;
  elements.savedSearchesButton.textContent = searches.length ? `Saved Searches (${searches.length})` : "Saved Searches";

  if (!project) {
    elements.savedSearchesMenu.innerHTML = '<div class="saved-searches-menu-empty">Select a library first.</div>';
    closeSavedSearchMenu();
    return;
  }

  if (!searches.length) {
    elements.savedSearchesMenu.innerHTML = '<div class="saved-searches-menu-empty">No saved searches yet.</div>';
    closeSavedSearchMenu();
    return;
  }

  elements.savedSearchesMenu.innerHTML = searches
    .map(
      (search) => `
        <div class="saved-searches-menu-row">
          <button type="button" class="saved-searches-menu-open${isSearchCurrent(search.url || "") ? " is-current" : ""}" data-search-url="${escapeHtml(search.url || "")}" data-search-path="${escapeHtml(search.path)}">
            <span class="saved-searches-menu-main">
              <strong>${escapeHtml(search.label || search.name.replace(/\.url\.txt$/i, "").replace(/\.csv$/i, ""))}</strong>
              <span class="saved-searches-menu-url">${escapeHtml(formatSavedSearchUrl(search.url || ""))}</span>
            </span>
            <span class="saved-searches-menu-meta">${escapeHtml(formatDate(search.modifiedAt))}</span>
          </button>
          <button
            type="button"
            class="saved-searches-menu-delete"
            data-search-delete="${escapeHtml(search.path)}"
            data-search-name="${escapeHtml(search.label || search.name.replace(/\.url\.txt$/i, "").replace(/\.csv$/i, ""))}"
            aria-label="Delete saved search ${escapeHtml(search.name)}"
          >
            Delete
          </button>
        </div>
      `
    )
    .join("");

  elements.savedSearchesMenu.querySelectorAll("[data-search-url]").forEach((button) => {
    button.addEventListener("click", () => {
      closeSavedSearchMenu();
      const url = button.getAttribute("data-search-url") || "";
      if (url) {
        openSavedSearchUrl(url);
        return;
      }
      void window.troveApi.openPath(button.getAttribute("data-search-path") || "");
    });
  });

  elements.savedSearchesMenu.querySelectorAll("[data-search-delete]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const searchPath = button.getAttribute("data-search-delete") || "";
      const searchName = button.getAttribute("data-search-name") || "saved search";
      void deleteSavedSearch(searchPath, searchName);
    });
  });

  elements.savedSearchesMenu.hidden = !state.savedSearchMenuOpen;
  elements.savedSearchesButton.setAttribute("aria-expanded", state.savedSearchMenuOpen ? "true" : "false");
}

function getActiveTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
}

function getTabById(tabId = "") {
  return state.tabs.find((tab) => tab.id === tabId) || null;
}

function getDefaultBrowseUrl() {
  return state.plugins[0]?.browseUrl || "https://trove.nla.gov.au/";
}

function getDefaultSearchUrl(query) {
  return `https://trove.nla.gov.au/search?keyword=${encodeURIComponent(query)}`;
}

function ensureUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return getDefaultBrowseUrl();
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (
    /^(?:trove\.nla\.gov\.au|nla\.gov\.au|encore\.slwa\.wa\.gov\.au|purl\.slwa\.wa\.gov\.au|catalogue\.slwa\.wa\.gov\.au|museum\.wa\.gov\.au|collection\.artgallery\.wa\.gov\.au)\b/i.test(
      trimmed
    )
  ) {
    return `https://${trimmed}`;
  }
  return getDefaultSearchUrl(trimmed);
}

function setSessionCacheEntry(cache, key, value, maxEntries) {
  if (!cache || !key) {
    return;
  }
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (typeof oldestKey === "undefined") {
      break;
    }
    cache.delete(oldestKey);
  }
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatSavedSearchUrl(value) {
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value);
    return url.search ? url.search.slice(1) : `${url.pathname}${url.search}`;
  } catch {
    const text = String(value).trim();
    const index = text.indexOf("?");
    return index >= 0 ? text.slice(index + 1) : text;
  }
}

function extractTroveUrls(value) {
  const text = String(value || "");
  const matches = text.match(/(?:https?:\/\/)?(?:trove\.nla\.gov\.au|nla\.gov\.au)\/[^\s<>"'“”]+/gi) || [];
  return [
    ...new Set(
      matches
        .map((entry) =>
          String(entry || "")
            .trim()
            .replace(/[),.;:'"”“’]+$/g, "")
            .replace(/#$/g, "")
        )
        .map((entry) => ensureUrl(entry))
        .filter((entry) => /^https?:\/\/(?:trove\.nla\.gov\.au|nla\.gov\.au)\//i.test(entry))
    )
  ];
}

function extractSlwaUrls(value) {
  const text = String(value || "");
  const matches =
    text.match(/(?:https?:\/\/)?(?:encore\.slwa\.wa\.gov\.au|purl\.slwa\.wa\.gov\.au|catalogue\.slwa\.wa\.gov\.au)\/[^\s<>"'“”]+/gi) ||
    [];
  return [
    ...new Set(
      matches
        .map((entry) =>
          String(entry || "")
            .trim()
            .replace(/[),.;:'"”“’]+$/g, "")
            .replace(/#$/g, "")
        )
        .map((entry) => ensureUrl(entry))
        .filter((entry) => /^https?:\/\/(?:encore\.slwa\.wa\.gov\.au|purl\.slwa\.wa\.gov\.au|catalogue\.slwa\.wa\.gov\.au)\//i.test(entry))
    )
  ];
}

function normalizeComparableUrl(value) {
  if (!value) {
    return "";
  }
  try {
    const url = new URL(String(value).trim());
    url.hash = "";
    url.searchParams.delete("startPos");
    return url.toString();
  } catch {
    return String(value).trim();
  }
}

function isCurrentPageAlreadySavedSearch() {
  const activeTab = getActiveTab();
  const project = getActiveProject();
  if (!activeTab?.url || !project) {
    return false;
  }
  const currentUrl = normalizeComparableUrl(activeTab.url);
  return (state.projectSearches || []).some((search) => normalizeComparableUrl(search.url) === currentUrl);
}

function isSearchCurrent(searchUrl) {
  const activeTab = getActiveTab();
  if (!activeTab?.url || !searchUrl) {
    return false;
  }
  return normalizeComparableUrl(activeTab.url) === normalizeComparableUrl(searchUrl);
}

function isKnownCollectionHost(hostname) {
  return [
    "trove.nla.gov.au",
    "catalogue.slwa.wa.gov.au",
    "encore.slwa.wa.gov.au",
    "purl.slwa.wa.gov.au",
    "museum.wa.gov.au",
    "collection.artgallery.wa.gov.au"
  ].includes(String(hostname || "").toLowerCase());
}

function isKnownSearchOrListUrl(url) {
  const normalizedUrl = ensureUrl(url);
  if (!normalizedUrl) {
    return false;
  }
  try {
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === "collection.artgallery.wa.gov.au") {
      return /^\/objects\/?$/i.test(parsed.pathname) || /^\/search\/?$/i.test(parsed.pathname);
    }
    if (host === "trove.nla.gov.au") {
      return /^\/search/i.test(parsed.pathname) || parsed.pathname === "/";
    }
    if (host === "encore.slwa.wa.gov.au") {
      return /\/iii\/encore\/search/i.test(parsed.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

function isAgwaSearchResultsUrl(url) {
  const normalizedUrl = ensureUrl(url);
  if (!normalizedUrl) {
    return false;
  }
  try {
    const parsed = new URL(normalizedUrl);
    return (
      parsed.hostname.toLowerCase() === "collection.artgallery.wa.gov.au" &&
      /^\/objects\/?$/i.test(parsed.pathname) &&
      parsed.searchParams.has("query")
    );
  } catch {
    return false;
  }
}

function setMessage(text) {
  elements.message.textContent = text;
}

function acknowledgeButtonPress(target) {
  if (!(target instanceof HTMLElement) || target.matches(":disabled, [aria-disabled='true']")) {
    return;
  }
  if (target.__troveAckTimer) {
    clearTimeout(target.__troveAckTimer);
  }
  target.classList.remove("is-acknowledged");
  target.getBoundingClientRect();
  target.classList.add("is-acknowledged");
  target.__troveAckTimer = setTimeout(() => {
    target.classList.remove("is-acknowledged");
    target.__troveAckTimer = null;
  }, 180);
}

function describeBusyAction(action) {
  if (action === "preview") {
    return "Previewing";
  }
  if (action === "collect") {
    return "Collecting";
  }
  if (action === "ignore") {
    return "Ignoring";
  }
  if (action === "unignore") {
    return "Unignoring";
  }
  if (action === "uncollect") {
    return "Removing";
  }
  return "Working";
}

function formatSaveProgressLabel(progress) {
  if (!progress?.total || progress.total <= 1) {
    return "";
  }
  const current = Math.max(0, Number(progress.current) || 0);
  const completed = Math.max(0, Number(progress.completed) || 0);
  const total = Math.max(0, Number(progress.total) || 0);
  if (progress.phase === "complete" || progress.phase === "saved") {
    return `Collected ${Math.min(completed || current, total)}/${total} images`;
  }
  if (progress.phase === "skipped") {
    return `Skipping broken image ${Math.min(current, total)} · ${Math.min(completed, total)}/${total}`;
  }
  return `Collecting image ${Math.min(current, total)}/${total}`;
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function formatDuration(ms) {
  const value = Math.max(0, Number(ms) || 0);
  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}s`;
}

function recordPerfEvent(name, fields = {}) {
  const event = {
    at: new Date().toISOString(),
    t: Math.round(nowMs()),
    name,
    ...fields
  };
  state.perfEvents.push(event);
  if (state.perfEvents.length > 160) {
    state.perfEvents.splice(0, state.perfEvents.length - 160);
  }
  return event;
}

function describeQueueState() {
  const now = Date.now();
  return {
    running: state.actionQueueRunning,
    waiting: state.actionQueue.length,
    current: state.currentQueueJob
      ? {
          id: state.currentQueueJob.id,
          action: state.currentQueueJob.action,
          source: state.currentQueueJob.source,
          title: summarizeQueueTarget(state.currentQueueJob),
          activeForMs: now - (state.currentQueueJob.startedAt || state.currentQueueJob.queuedAt || now),
          queuedForMs: now - (state.currentQueueJob.queuedAt || now)
        }
      : null,
    waitingJobs: state.actionQueue.map((job) => ({
      id: job.id,
      action: job.action,
      source: job.source,
      title: summarizeQueueTarget(job),
      queuedForMs: now - (job.queuedAt || now)
    }))
  };
}

function buildPerfSnapshotText() {
  const activeTab = getActiveTab();
  const displayedItem = getDisplayedItem();
  return JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      mode: state.mode,
      activeProjectPath: state.activeProjectPath,
      activeTab: activeTab
        ? {
            id: activeTab.id,
            title: activeTab.title,
            url: activeTab.url,
            didDomReady: activeTab.didDomReady
          }
        : null,
      capture: {
        requestId: state.captureRequestId,
        busy: state.captureBusy,
        saveProgress: state.saveProgress,
        previewActionId: state.previewActionId,
        displayedItem: displayedItem
          ? {
              key: displayedItem.key,
              title: displayedItem.title,
              source: displayedItem.source,
              type: displayedItem.type,
              url: displayedItem.url
            }
          : null
      },
      queue: describeQueueState(),
      cache: {
        fetchedItems: backgroundFetchResultCache.size,
        pendingFetches: backgroundFetchPendingCache.size,
        previewMarkdown: previewMarkdownCache.size
      },
      recentEvents: state.perfEvents.slice(-30)
    },
    null,
    2
  );
}

function getAppHealthIssues(snapshot = JSON.parse(buildPerfSnapshotText())) {
  const issues = [];
  const captureBusy = snapshot.capture?.busy;
  const queue = snapshot.queue || {};
  const hasQueueWork = Boolean(queue.current) || Number(queue.waiting || 0) > 0;
  if (captureBusy && !hasQueueWork && captureBusy.action !== "preview") {
    issues.push("Capture pane is busy but no queued action is running or waiting.");
  }
  if (snapshot.capture?.saveProgress && !hasQueueWork) {
    issues.push("Save progress is visible without active queue work.");
  }
  if (
    queue.current &&
    queue.current.source !== "inline" &&
    !captureBusy &&
    ["collect", "ignore", "uncollect", "unignore"].includes(queue.current.action)
  ) {
    issues.push("Queue is running an item action without capture busy state.");
  }
  if (queue.current?.activeForMs > 120000) {
    issues.push(`Queue action has been active for ${formatDuration(queue.current.activeForMs)}.`);
  }
  if (Number(queue.waiting || 0) > 0 && !queue.running && !queue.current) {
    issues.push("Queued work is waiting but the processor is not running.");
  }
  if (hasQueueWork && state.queueTrayVisible && elements.queueTray?.hidden) {
    issues.push("Queued work is active but the queue tray is hidden.");
  }
  return issues;
}

function getLayoutOverflowIssues() {
  const selectors = [
    ".library-panel",
    ".project-details",
    ".project-card",
    ".saved-search-item",
    ".manage-toolbar",
    ".manage-toolbar-actions",
    ".manage-table",
    ".manage-row-toggle",
    ".capture-body",
    ".capture-markdown"
  ];
  const issues = [];
  document.querySelectorAll(selectors.join(",")).forEach((node) => {
    if (!(node instanceof HTMLElement) || node.offsetParent === null) {
      return;
    }
    const horizontalOverflow = node.scrollWidth - node.clientWidth;
    if (horizontalOverflow > 1) {
      issues.push({
        selector: selectors.find((selector) => node.matches(selector)) || node.tagName.toLowerCase(),
        text: String(node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140),
        overflowX: Math.round(horizontalOverflow),
        width: Math.round(node.clientWidth)
      });
    }
  });
  return issues;
}

function summarizeQueueTarget(job) {
  const title = String(job?.item?.title || "").trim();
  if (title) {
    return title;
  }
  const rawUrl = ensureUrl(job?.url || job?.item?.url || "");
  if (!rawUrl) {
    return "item";
  }
  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() || parsed.hostname;
  } catch {
    return rawUrl;
  }
}

function renderQueueTray() {
  const hasActiveQueueWork = Boolean(state.currentQueueJob) || Boolean(state.saveProgress);
  const waitingCount = state.actionQueue.length;
  const hasQueueWork = hasActiveQueueWork || waitingCount > 0;
  const shouldShow = hasQueueWork && state.queueTrayVisible;
  if (!elements.queueTray) {
    return;
  }
  elements.queueTray.hidden = !shouldShow;
  if (!shouldShow) {
    state.queueTrayOpen = false;
    elements.queueTrayToggle?.setAttribute("aria-expanded", "false");
    if (elements.queueTrayPanel) {
      elements.queueTrayPanel.hidden = true;
    }
    if (elements.queueTrayCount) {
      elements.queueTrayCount.textContent = "";
    }
    elements.queueTrayCurrent.textContent = "";
    elements.queueTrayMeta.textContent = "";
    return;
  }

  const job = state.currentQueueJob;
  const verb = describeBusyAction(job?.action || state.captureBusy?.action || "collect");
  const targetLabel = summarizeQueueTarget(job);
  const progressLabel = state.saveProgress ? formatSaveProgressLabel(state.saveProgress) : "";
  const queueCount = (job ? 1 : 0) + waitingCount;
  const jobElapsed = job?.startedAt ? formatDuration(Date.now() - job.startedAt) : "";
  const oldestWait = waitingCount ? formatDuration(Date.now() - (state.actionQueue[0]?.queuedAt || Date.now())) : "";

  if (elements.queueTrayCount) {
    elements.queueTrayCount.textContent = String(queueCount);
  }
  if (elements.queueTrayToggle) {
    elements.queueTrayToggle.setAttribute("aria-expanded", state.queueTrayOpen ? "true" : "false");
  }
  if (elements.queueTrayPanel) {
    elements.queueTrayPanel.hidden = !state.queueTrayOpen;
  }

  elements.queueTrayCurrent.textContent = job ? `${verb} ${targetLabel}` : "Working through queue";
  const metaParts = [];
  if (progressLabel) {
    metaParts.push(progressLabel);
  }
  if (jobElapsed) {
    metaParts.push(`${jobElapsed} active`);
  }
  if (waitingCount > 0) {
    metaParts.push(`${waitingCount} waiting${oldestWait ? ` · oldest ${oldestWait}` : ""}`);
  }
  if (!metaParts.length && job?.source) {
    metaParts.push(job.source === "inline" ? "Queued from page" : "Queued from preview");
  }
  elements.queueTrayMeta.textContent = metaParts.join(" · ");
}

function hasQueueWork() {
  return Boolean(state.currentQueueJob) || Boolean(state.saveProgress) || state.actionQueue.length > 0;
}

function clearQueueTrayRevealTimer() {
  if (!state.queueTrayRevealTimer) {
    return;
  }
  clearTimeout(state.queueTrayRevealTimer);
  state.queueTrayRevealTimer = null;
}

function scheduleQueueTrayReveal() {
  if (!elements.queueTray) {
    return;
  }
  if (!hasQueueWork()) {
    clearQueueTrayRevealTimer();
    state.queueTrayVisible = false;
    state.queueTrayOpen = false;
    renderQueueTray();
    return;
  }
  if (state.queueTrayVisible || state.queueTrayRevealTimer) {
    renderQueueTray();
    return;
  }
  if (state.actionQueue.length > 1) {
    state.queueTrayVisible = true;
    renderQueueTray();
    return;
  }
  state.queueTrayRevealTimer = setTimeout(() => {
    state.queueTrayRevealTimer = null;
    if (!hasQueueWork()) {
      state.queueTrayVisible = false;
      state.queueTrayOpen = false;
      renderQueueTray();
      return;
    }
    state.queueTrayVisible = true;
    renderQueueTray();
  }, QUEUE_TRAY_REVEAL_DELAY_MS);
  renderQueueTray();
}

function setQueueTrayOpen(nextOpen) {
  state.queueTrayOpen = Boolean(nextOpen);
  renderQueueTray();
}

function scheduleActionQueueProcessing() {
  if (state.actionQueueTimer || state.actionQueueRunning) {
    return;
  }
  state.actionQueueTimer = setTimeout(() => {
    state.actionQueueTimer = null;
    void processActionQueue();
  }, 0);
}

function setButtonLoading(button, isLoading, label) {
  if (!button) {
    return;
  }
  if (!button.dataset.baseLabel) {
    button.dataset.baseLabel = button.textContent || "";
  }
  if (isLoading) {
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    button.textContent = label;
    return;
  }
  button.classList.remove("is-loading");
  button.removeAttribute("aria-busy");
  if (button.dataset.baseLabel) {
    button.textContent = button.dataset.baseLabel;
  }
}

function cloneItemSnapshot(item) {
  if (!item) {
    return null;
  }
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(item);
    } catch {
      // Fall back to JSON cloning below.
    }
  }
  try {
    return JSON.parse(JSON.stringify(item));
  } catch {
    return {
      ...item,
      aliases: Array.isArray(item.aliases) ? [...item.aliases] : []
    };
  }
}

function getBackgroundFetchCacheKey(url, mode = "full") {
  return `${ensureUrl(url)}::${mode}`;
}

function getCachedFetchedItem(url, mode = "full") {
  const cacheKey = getBackgroundFetchCacheKey(url, mode);
  const cached = backgroundFetchResultCache.get(cacheKey);
  if (!cached) {
    return null;
  }
  setSessionCacheEntry(backgroundFetchResultCache, cacheKey, cached, BACKGROUND_FETCH_MAX_ENTRIES);
  return cloneItemSnapshot(cached.item);
}

function withFetchTimeout(promise, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Preview timed out after ${timeoutMs}ms.`);
      error.code = "PREVIEW_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function cacheFetchedItem(url, mode, item) {
  if (!item) {
    return;
  }
  const cacheKey = getBackgroundFetchCacheKey(url, mode);
  setSessionCacheEntry(
    backgroundFetchResultCache,
    cacheKey,
    {
      item: cloneItemSnapshot(item)
    },
    BACKGROUND_FETCH_MAX_ENTRIES
  );
}

function getPreviewMarkdownCacheKey(item) {
  if (!item) {
    return "";
  }
  if (item.key) {
    return `key:${item.key}`;
  }
  const normalizedUrl = normalizeComparableUrl(item.url || item.canonicalUrl || "");
  if (normalizedUrl) {
    return `url:${normalizedUrl}`;
  }
  return `${item.source || "unknown"}:${item.type || "item"}:${item.id || item.title || ""}`;
}

async function buildPreviewMarkdownCached(item, options = {}) {
  const cacheKey = getPreviewMarkdownCacheKey(item);
  if (!options.force && cacheKey && previewMarkdownCache.has(cacheKey)) {
    const cached = previewMarkdownCache.get(cacheKey);
    setSessionCacheEntry(previewMarkdownCache, cacheKey, cached, PREVIEW_MARKDOWN_MAX_ENTRIES);
    return cached;
  }
  const markdown = await window.troveApi.previewMarkdown(item);
  if (cacheKey) {
    setSessionCacheEntry(previewMarkdownCache, cacheKey, markdown, PREVIEW_MARKDOWN_MAX_ENTRIES);
  }
  return markdown;
}

function setCaptureBusy(action, active, item = getDisplayedItem(), progressLabel = "", token = "") {
  if (!active) {
    if (token && state.captureBusy?.token && state.captureBusy.token !== token) {
      return;
    }
    state.captureBusy = null;
    setButtonLoading(elements.captureCollect, false);
    setButtonLoading(elements.captureIgnore, false);
    elements.captureProgress.hidden = true;
    elements.captureProgress.textContent = "";
    return;
  }
  state.captureBusy = { action, key: item?.key || "", url: item?.url || "", progressLabel, token };
  elements.captureProgress.textContent = progressLabel || "";
  elements.captureProgress.hidden = !progressLabel;
  if (action === "preview") {
    return;
  }
}

function getQueuedActionTargetKey(action, projectPath, item, url) {
  return [projectPath || "", action || "", item?.key || "", normalizeComparableUrl(url || item?.url || "")].join("::");
}

function buildQueuedActionTarget(item, url) {
  if (item) {
    const snapshot = cloneItemSnapshot(item);
    const normalizedUrl = ensureUrl(snapshot.url || url || "");
    snapshot.url = normalizedUrl || snapshot.url || "";
    snapshot.aliases = [...new Set([normalizedUrl, ...(snapshot.aliases || [])].filter(Boolean))];
    return snapshot;
  }
  const normalizedUrl = ensureUrl(url || "");
  if (!normalizedUrl) {
    return null;
  }
  return {
    url: normalizedUrl,
    aliases: [normalizedUrl]
  };
}

function buildInlineQueueStub(url, label = "") {
  const normalizedUrl = ensureUrl(url || "");
  if (!normalizedUrl) {
    return null;
  }
  let source = "unknown";
  if (/trove\.nla\.gov\.au/i.test(normalizedUrl)) {
    source = "trove";
  } else if (/slwa\.wa\.gov\.au/i.test(normalizedUrl)) {
    source = "slwa";
  } else if (/museum\.wa\.gov\.au/i.test(normalizedUrl)) {
    source = "wa-museum";
  } else if (/collection\.artgallery\.wa\.gov\.au/i.test(normalizedUrl)) {
    source = "agwa";
  }
  return {
    url: normalizedUrl,
    aliases: [normalizedUrl],
    title: String(label || normalizedUrl).trim(),
    source
  };
}

function queuedTargetsReferToSameRecord(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.key && right.key && left.key === right.key) {
    return true;
  }
  return itemsReferToSameRecord(left, right);
}

function getStatusAfterAction(action) {
  if (action === "collect") {
    return "saved";
  }
  if (action === "ignore") {
    return "ignored";
  }
  if (action === "uncollect" || action === "unignore") {
    return "";
  }
  return "";
}

function getQueuedIntentForItem(projectPath, item) {
  if (!projectPath || !item) {
    return "";
  }
  for (let index = state.actionQueue.length - 1; index >= 0; index -= 1) {
    const job = state.actionQueue[index];
    if (job.projectPath === projectPath && queuedTargetsReferToSameRecord(job.item, item)) {
      return getStatusAfterAction(job.action);
    }
  }
  if (
    state.currentQueueJob &&
    state.currentQueueJob.projectPath === projectPath &&
    queuedTargetsReferToSameRecord(state.currentQueueJob.item, item)
  ) {
    return getStatusAfterAction(state.currentQueueJob.action);
  }
  return "";
}

function getEffectiveItemStatus(project, item) {
  if (!project || !item) {
    return "";
  }
  const queuedStatus = getQueuedIntentForItem(project.path, item);
  if (queuedStatus === "saved" || queuedStatus === "ignored" || queuedStatus === "") {
    const hasQueuedIntent =
      queuedStatus !== "" ||
      Boolean(
        (state.currentQueueJob &&
          state.currentQueueJob.projectPath === project.path &&
          queuedTargetsReferToSameRecord(state.currentQueueJob.item, item)) ||
          state.actionQueue.some((job) => job.projectPath === project.path && queuedTargetsReferToSameRecord(job.item, item))
      );
    if (hasQueuedIntent) {
      return queuedStatus;
    }
  }
  return sourceRegistry.itemStatus(project, item);
}

function pruneQueuedActionsForTarget(projectPath, target, incomingAction) {
  if (!projectPath || !target || !state.actionQueue.length) {
    return false;
  }
  // Keep only the latest queued intent for the same record. This lets a later
  // uncollect/unignore supersede stale queued work before it starts.
  const nextQueue = [];
  let removedAny = false;
  for (const job of state.actionQueue) {
    const sameProject = job.projectPath === projectPath;
    const sameTarget = sameProject && queuedTargetsReferToSameRecord(job.item, target);
    if (sameTarget && job.action !== incomingAction) {
      state.queuedActionIds.delete(job.actionKey);
      removedAny = true;
      continue;
    }
    nextQueue.push(job);
  }
  state.actionQueue = nextQueue;
  return removedAny;
}

function hasSupersedingQueuedAction(projectPath, target) {
  if (!projectPath || !target) {
    return false;
  }
  return state.actionQueue.some(
    (job) => job.projectPath === projectPath && queuedTargetsReferToSameRecord(job.item, target)
  );
}

function shouldReflectQueuedActionInCapture(target, options = {}) {
  return options.source === "sidebar";
}

function beginPreviewIntent(origin = "link", context = getCaptureContext(), token = "") {
  state.previewIntent = {
    origin,
    token,
    tabId: context?.tabId || "",
    pageUrl: ensureUrl(context?.pageUrl || "")
  };
}

function clearPreviewIntent(token = "") {
  if (!state.previewIntent) {
    return;
  }
  if (token && state.previewIntent.token && state.previewIntent.token !== token) {
    return;
  }
  state.previewIntent = null;
}

function interruptPreviewWork() {
  const previewToken = state.previewActionId || state.captureBusy?.token || "";
  if (previewClickTimer) {
    clearTimeout(previewClickTimer);
    previewClickTimer = null;
  }
  pendingPreviewRequest = null;
  if (activePreviewLoading) {
    void applyImmediatePageLoading(
      activePreviewLoading.item,
      "preview",
      false,
      "",
      activePreviewLoading.context,
      activePreviewLoading.token
    );
    activePreviewLoading = null;
  }
  state.captureRequestId += 1;
  state.previewActionId = "";
  clearPreviewIntent(previewToken);
  if (state.captureBusy?.action === "preview") {
    setCaptureBusy("", false, null, "", previewToken);
  }
}

function hasPendingLinkPreviewForTab(tab = getActiveTab()) {
  return Boolean(
    tab &&
      state.previewIntent &&
      state.previewIntent.origin === "link" &&
      state.previewIntent.tabId === tab.id &&
      state.previewIntent.pageUrl &&
      ensureUrl(tab.url || "") === state.previewIntent.pageUrl
  );
}

function queueProjectAction(action, projectPath, itemOrUrl, options = {}) {
  const clickedAt = nowMs();
  const item = typeof itemOrUrl === "string" ? null : itemOrUrl;
  const url = typeof itemOrUrl === "string" ? itemOrUrl : itemOrUrl?.url || "";
  const target = buildQueuedActionTarget(item, url);
  if (!projectPath || !target) {
    return false;
  }

  const actionKey = getQueuedActionTargetKey(action, projectPath, target, target.url);
  const removedQueuedConflict = pruneQueuedActionsForTarget(projectPath, target, action);
  const currentJobMatchesTarget = Boolean(
    state.currentQueueJob &&
      state.currentQueueJob.projectPath === projectPath &&
      queuedTargetsReferToSameRecord(state.currentQueueJob.item, target)
  );
  const currentJobMatchesAction = currentJobMatchesTarget && state.currentQueueJob.action === action;
  const busyLabel = `${describeBusyAction(action)}…`;
  const project = getProjectByPath(projectPath);
  const currentStatus = project ? getEffectiveItemStatus(project, target) : "";
  const desiredStatus = getStatusAfterAction(action);
  const actionContext = options.context || getCaptureContext();
  const shouldReflectCapture = shouldReflectQueuedActionInCapture(target, options);
  void applyImmediatePageLoading(target, action, true, busyLabel, actionContext);

  if (currentJobMatchesAction) {
    if (shouldReflectCapture) {
      setCaptureBusy(action, true, target, busyLabel, state.currentQueueJob?.id || "");
    }
    if (shouldReflectCapture && isCaptureContextCurrent(actionContext) && queuedTargetsReferToSameRecord(getDisplayedItem(), target)) {
      setPreviewStatusOverride(desiredStatus, projectPath);
      renderCapturePane(getDisplayedItem() || target, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: desiredStatus
      });
    }
    void applyImmediatePageFeedback(target, desiredStatus, actionContext);
    renderQueueTray();
    return true;
  }

  if (state.queuedActionIds.has(actionKey)) {
    renderQueueTray();
    return true;
  }

  if (shouldReflectCapture && isCaptureContextCurrent(actionContext) && queuedTargetsReferToSameRecord(getDisplayedItem(), target)) {
    setPreviewStatusOverride(desiredStatus, projectPath);
    renderCapturePane(getDisplayedItem() || target, getDisplayedMarkdown(), {
      origin: previewState.origin,
      forcedStatus: desiredStatus
    });
  }
  void applyImmediatePageFeedback(target, desiredStatus, actionContext);
  if (!currentJobMatchesTarget && removedQueuedConflict && currentStatus === desiredStatus) {
    if (shouldReflectCapture) {
      setCaptureBusy("", false, null, "", "");
    }
    void applyImmediatePageLoading(target, action, false, "", actionContext);
    renderQueueTray();
    return true;
  }

  const job = {
    id: `action-${Date.now()}-${++state.actionNonce}`,
    action,
    actionKey,
    projectPath,
    item: target,
    url: target.url,
    context: actionContext,
    queuedAt: Date.now(),
    queuedAtMs: clickedAt,
    source: options.source || "",
    label: options.label || ""
  };
  state.queuedActionIds.add(actionKey);
  state.actionQueue.push(job);
  recordPerfEvent("queue.action.enqueued", {
    id: job.id,
    action,
    source: job.source,
    target: summarizeQueueTarget(job),
    waiting: state.actionQueue.length
  });
  scheduleQueueTrayReveal();
  if (shouldReflectQueuedActionInCapture(target, options)) {
    setCaptureBusy(action, true, target, busyLabel, job.id);
  }
  scheduleActionQueueProcessing();
  return true;
}

function getPreferredRefreshProjectPath(projectPath) {
  return state.activeProjectPath === projectPath ? projectPath : state.activeProjectPath;
}

function queueRefreshProjects(projectPath, options = {}) {
  void refreshProjects(getPreferredRefreshProjectPath(projectPath), options)
    .then(() => {
      const activeProject = getActiveProject();
      const displayedItem = getDisplayedItem();
      if (
        previewState.statusOverrideProjectPath &&
        previewState.statusOverrideProjectPath === activeProject?.path &&
        displayedItem
      ) {
        const liveStatus = getEffectiveItemStatus(activeProject, displayedItem);
        if (!previewState.statusOverride || liveStatus === previewState.statusOverride) {
          setPreviewStatusOverride("");
        }
        renderCapturePane(displayedItem, getDisplayedMarkdown(), { origin: previewState.origin });
      }
    })
    .catch(() => {});
}

async function resolveQueuedActionItem(job) {
  const item = cloneItemSnapshot(job?.item);
  if (!item) {
    throw new Error("Queued action is missing its target.");
  }
  if ((job?.action === "ignore" || job?.action === "unignore") && item.url) {
    return item;
  }
  if (item.supported || item.key || (item.title && item.url)) {
    return item;
  }
  let fetched = await fetchItemByUrl(job.url || item.url, { mode: "preview" });
  if (!fetched?.supported) {
    fetched = await fetchItemByUrl(job.url || item.url, { force: true, mode: "preview" });
  }
  if (!fetched?.supported) {
    throw new Error(fetched?.reason || "Could not load the queued item.");
  }
  return {
    ...fetched,
    aliases: [...new Set([job.url, fetched.url, ...(fetched.aliases || []), ...(item.aliases || [])].filter(Boolean))]
  };
}

async function processActionQueue() {
  if (state.actionQueueRunning) {
    return;
  }
  state.actionQueueRunning = true;
  try {
    while (state.actionQueue.length) {
      const job = state.actionQueue.shift();
      if (!job) {
        continue;
      }
      state.currentQueueJob = job;
      job.startedAt = Date.now();
      job.startedAtMs = nowMs();
      recordPerfEvent("queue.action.started", {
        id: job.id,
        action: job.action,
        source: job.source,
        queuedMs: Math.round(job.startedAtMs - (job.queuedAtMs || job.startedAtMs)),
        waiting: state.actionQueue.length
      });
      scheduleQueueTrayReveal();
      try {
        const item = await resolveQueuedActionItem(job);
        if (job.action === "collect") {
          await collectItem(item, job.projectPath, job.id, job.context);
        } else if (job.action === "uncollect") {
          await uncollectItem(item, job.projectPath, { skipConfirm: true, busyToken: job.id, context: job.context });
        } else if (job.action === "ignore") {
          await ignoreItemInProject(item, job.projectPath, job.id, job.context);
        } else if (job.action === "unignore") {
          await unignoreItem(item, job.projectPath, job.id, job.context);
        }
      } catch (error) {
        recordPerfEvent("queue.action.failed", {
          id: job.id,
          action: job.action,
          durationMs: Math.round(nowMs() - (job.startedAtMs || nowMs())),
          message: error.message || String(error)
        });
        setCaptureBusy("", false, null, "", job.id);
        void applyImmediatePageLoading(job.item, job.action, false, "", job.context);
        setMessage(error.message || `${describeBusyAction(job.action)} failed.`);
      } finally {
        if (state.currentQueueJob === job) {
          recordPerfEvent("queue.action.finished", {
            id: job.id,
            action: job.action,
            durationMs: Math.round(nowMs() - (job.startedAtMs || nowMs())),
            waiting: state.actionQueue.length
          });
        }
        state.queuedActionIds.delete(job.actionKey);
        state.currentQueueJob = null;
        setCaptureBusy("", false, null, "", job.id);
        const displayedItem = getDisplayedItem();
        if (displayedItem) {
          renderCapturePane(displayedItem, getDisplayedMarkdown(), { origin: previewState.origin });
        }
        renderQueueTray();
      }
    }
  } finally {
    state.actionQueueRunning = false;
    clearQueueTrayRevealTimer();
    if (!hasQueueWork()) {
      state.queueTrayVisible = false;
      state.queueTrayOpen = false;
    }
    renderQueueTray();
  }
}

function getCaptureContext() {
  const activeTab = getActiveTab();
  return {
    tabId: activeTab?.id || "",
    pageUrl: activeTab?.url || ""
  };
}

function isCaptureContextCurrent(context = {}) {
  const activeTab = getActiveTab();
  return Boolean(
    activeTab &&
      context &&
      activeTab.id === (context.tabId || "") &&
      ensureUrl(activeTab.url || "") === ensureUrl(context.pageUrl || "")
  );
}

function clearPreviewState() {
  previewState.item = null;
  previewState.markdown = "";
  previewState.origin = "page";
  previewState.tabId = "";
  previewState.pageUrl = "";
  previewState.imageIndex = 0;
  previewState.statusOverride = "";
  previewState.statusOverrideProjectPath = "";
  previewState.findMatches = [];
  previewState.findActiveIndex = -1;
}

function hasStickyPreview() {
  return hasRenderablePreviewContent(previewState.item, previewState.markdown);
}

function showStickyPreview() {
  if (!hasStickyPreview()) {
    return false;
  }
  renderCapturePane(previewState.item, previewState.markdown, { origin: previewState.origin });
  return true;
}

function itemsReferToSameRecord(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.key && right.key && left.key === right.key) {
    return true;
  }
  const leftUrls = [...new Set([left.url, ...(left.aliases || [])].filter(Boolean).map((value) => normalizeComparableUrl(value)))];
  const rightUrls = [...new Set([right.url, ...(right.aliases || [])].filter(Boolean).map((value) => normalizeComparableUrl(value)))];
  return leftUrls.some((value) => rightUrls.includes(value));
}

function setPreviewStatusOverride(status, projectPath = getActiveProject()?.path || "") {
  previewState.statusOverride = status || "";
  previewState.statusOverrideProjectPath = status ? projectPath || "" : "";
}

function getPreviewStatusOverride(project, item) {
  if (!project || !item) {
    return "";
  }
  if (!previewState.statusOverride || previewState.statusOverrideProjectPath !== project.path) {
    return "";
  }
  return itemsReferToSameRecord(previewState.item, item) ? previewState.statusOverride : "";
}

function setPreviewState(item, markdown, origin = "page", context = getCaptureContext()) {
  const previousItem = previewState.item;
  const previousStatusOverride = previewState.statusOverride;
  const previousStatusOverrideProjectPath = previewState.statusOverrideProjectPath;
  previewState.item = item || null;
  previewState.markdown = markdown || "";
  previewState.origin = origin;
  previewState.tabId = context.tabId || "";
  previewState.pageUrl = context.pageUrl || "";
  previewState.imageIndex = 0;
  if (previousStatusOverride && itemsReferToSameRecord(previousItem, item)) {
    previewState.statusOverride = previousStatusOverride;
    previewState.statusOverrideProjectPath = previousStatusOverrideProjectPath;
  } else {
    previewState.statusOverride = "";
    previewState.statusOverrideProjectPath = "";
  }
}

function getDisplayedItem() {
  return previewState.item || null;
}

function getDisplayedMarkdown() {
  return previewState.markdown || "";
}

function isTextEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest("input, textarea, select"));
}

function isFocusWithinCapturePane() {
  const activeElement = document.activeElement;
  return Boolean(activeElement instanceof Element && activeElement.closest("#capture-panel"));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function updateCaptureFindUi() {
  const matches = previewState.findMatches || [];
  const activeIndex = previewState.findActiveIndex;
  const countText = matches.length ? `${activeIndex + 1}/${matches.length}` : "0/0";
  elements.captureFindBar.hidden = !previewState.findOpen;
  elements.captureMarkdown.parentElement?.classList.toggle("has-find-open", previewState.findOpen);
  elements.captureFindCount.textContent = countText;
  elements.captureFindPrev.disabled = matches.length < 2;
  elements.captureFindNext.disabled = matches.length < 2;
}

function updatePageFindUi() {
  if (!elements.pageFindBar) {
    return;
  }
  elements.pageFindBar.hidden = !pageFindState.open;
  const total = Math.max(0, Number(pageFindState.matches) || 0);
  const active = Math.max(0, Number(pageFindState.activeMatchOrdinal) || 0);
  elements.pageFindCount.textContent = total ? `${Math.min(active || 1, total)}/${total}` : "0/0";
  elements.pageFindPrev.disabled = total < 2;
  elements.pageFindNext.disabled = total < 2;
}

function stopPageFind(action = "clearSelection") {
  const activeTab = getActiveTab();
  if (!activeTab?.webview?.isConnected) {
    return;
  }
  try {
    activeTab.webview.stopFindInPage(action);
  } catch {
    // Ignore pages that are still navigating.
  }
}

function runPageFind(options = {}) {
  const activeTab = getActiveTab();
  const query = String(pageFindState.query || "").trim();
  if (!activeTab?.webview?.isConnected) {
    return;
  }
  if (!query) {
    pageFindState.matches = 0;
    pageFindState.activeMatchOrdinal = 0;
    updatePageFindUi();
    stopPageFind("clearSelection");
    return;
  }
  try {
    activeTab.webview.findInPage(query, {
      findNext: Boolean(options.findNext),
      forward: options.forward !== false,
      matchCase: false
    });
  } catch {
    // Ignore transient navigation windows.
  }
}

function openPageFind(prefill = "") {
  if (state.mode !== "collect") {
    return;
  }
  const activeTab = getActiveTab();
  if (!activeTab?.webview) {
    return;
  }
  pageFindState.open = true;
  if (prefill && !pageFindState.query) {
    pageFindState.query = prefill;
  }
  elements.pageFindInput.value = pageFindState.query;
  updatePageFindUi();
  requestAnimationFrame(() => {
    elements.pageFindInput.focus();
    elements.pageFindInput.select();
  });
  runPageFind({ findNext: false, forward: true });
}

function closePageFind() {
  pageFindState.open = false;
  pageFindState.query = "";
  pageFindState.matches = 0;
  pageFindState.activeMatchOrdinal = 0;
  elements.pageFindInput.value = "";
  updatePageFindUi();
  stopPageFind("clearSelection");
}

function handlePageFindInput() {
  pageFindState.query = elements.pageFindInput.value || "";
  runPageFind({ findNext: false, forward: true });
}

function clearCaptureFindHighlights() {
  previewState.findMatches = [];
  previewState.findActiveIndex = -1;
  if (elements.captureMarkdown) {
    elements.captureMarkdown.innerHTML = renderMarkdownHtml(getDisplayedMarkdown());
  }
  updateCaptureFindUi();
}

function activateCaptureFindMatch(index, options = {}) {
  const matches = previewState.findMatches || [];
  if (!matches.length) {
    previewState.findActiveIndex = -1;
    updateCaptureFindUi();
    return;
  }
  const nextIndex = ((index % matches.length) + matches.length) % matches.length;
  previewState.findActiveIndex = nextIndex;
  matches.forEach((node, nodeIndex) => {
    node.classList.toggle("is-active", nodeIndex === nextIndex);
  });
  const activeNode = matches[nextIndex];
  if (activeNode && options.scroll !== false) {
    activeNode.scrollIntoView({ block: "center", behavior: options.behavior || "smooth" });
  }
  updateCaptureFindUi();
}

function applyCaptureFindHighlights() {
  const query = String(previewState.findQuery || "").trim();
  clearCaptureFindHighlights();
  if (!query || !elements.captureMarkdown) {
    return;
  }
  const root = elements.captureMarkdown;
  const matcher = new RegExp(escapeRegExp(query), "gi");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement?.closest("mark.capture-find-match")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  const matches = [];
  for (const node of textNodes) {
    const text = node.nodeValue || "";
    matcher.lastIndex = 0;
    let hasMatch = false;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let result = matcher.exec(text);
    while (result) {
      hasMatch = true;
      const matchText = result[0];
      const index = result.index;
      if (index > cursor) {
        fragment.append(document.createTextNode(text.slice(cursor, index)));
      }
      const mark = document.createElement("mark");
      mark.className = "capture-find-match";
      mark.textContent = matchText;
      fragment.append(mark);
      matches.push(mark);
      cursor = index + matchText.length;
      result = matcher.exec(text);
    }
    if (!hasMatch) {
      continue;
    }
    if (cursor < text.length) {
      fragment.append(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode?.replaceChild(fragment, node);
  }
  previewState.findMatches = matches;
  if (matches.length) {
    activateCaptureFindMatch(0, { scroll: false });
  } else {
    previewState.findActiveIndex = -1;
    updateCaptureFindUi();
  }
}

function openCaptureFind(prefill = "") {
  previewState.findOpen = true;
  if (prefill && !previewState.findQuery) {
    previewState.findQuery = prefill;
  }
  elements.captureFindInput.value = previewState.findQuery;
  updateCaptureFindUi();
  applyCaptureFindHighlights();
  queueMicrotask(() => {
    elements.captureFindInput.focus();
    elements.captureFindInput.select();
  });
}

function closeCaptureFind() {
  previewState.findOpen = false;
  previewState.findQuery = "";
  elements.captureFindInput.value = "";
  clearCaptureFindHighlights();
  updateCaptureFindUi();
}

function handleCaptureFindInput() {
  previewState.findQuery = elements.captureFindInput.value || "";
  applyCaptureFindHighlights();
}

function renderCaptureMarkdown(markdown) {
  elements.captureMarkdown.innerHTML = renderMarkdownHtml(markdown);
  if (previewState.findOpen) {
    applyCaptureFindHighlights();
  } else {
    updateCaptureFindUi();
  }
}

function hasMeaningfulItemTitle(item) {
  const title = String(item?.title || "").trim();
  if (!title) {
    return false;
  }
  return !/^[-–—]?\s*details\b/i.test(title);
}

function isStableExtractedItem(item) {
  if (!item?.supported) {
    return false;
  }
  if (!hasMeaningfulItemTitle(item)) {
    return false;
  }
  if (item.source === "trove" && /\/work\/\d+/i.test(item.url || "")) {
    return Boolean(item.imageUrl || item.contributor || (item.metadataFields || []).length);
  }
  return true;
}

function getItemAttachments(item) {
  if (Array.isArray(item?.attachments) && item.attachments.length) {
    return item.attachments;
  }
  if (item?.imageUrl) {
    return [
      {
        id: item.id || "",
        title: item.title || "",
        viewerUrl: item.url || "",
        imageUrl: item.imageUrl,
        thumbnailUrl: item.imageUrl
      }
    ];
  }
  return [];
}

function hasFullResolutionImage(entry) {
  return /\/(?:download\/)?slwa_[a-z0-9_./-]+\.(jpg|jpeg|png|tif|tiff|webp)(\?|$)|\/download\/.+\.(jpg|jpeg|png|tif|tiff|webp)(\?|$)/i.test(
    entry?.imageUrl || ""
  );
}

function hasInlinePreviewForActiveTab() {
  const activeTab = getActiveTab();
  return Boolean(
    activeTab &&
      previewState.item &&
      previewState.origin === "link" &&
      previewState.tabId === activeTab.id &&
      previewState.pageUrl === activeTab.url
  );
}

function hasCurrentPagePreviewForTab(tab = getActiveTab()) {
  return Boolean(
    tab &&
      previewState.item &&
      previewState.origin === "page" &&
      previewState.tabId === tab.id &&
      previewState.pageUrl === tab.url
  );
}

function hasRenderablePreviewContent(item, markdown) {
  if (String(markdown || "").trim()) {
    return true;
  }
  return item?.type === "image" && getItemAttachments(item).length > 0;
}

function resetCapturePane(message, kind = "Preview") {
  if (showStickyPreview()) {
    return;
  }
  closeImageLightbox();
  elements.captureEmpty.textContent = message;
  elements.captureEmpty.classList.toggle("is-loading", kind === "Loading");
  elements.captureBody.hidden = true;
  elements.captureEmpty.hidden = false;
  setCaptureBusy("", false);
  elements.captureIgnore.disabled = true;
  elements.captureCollect.disabled = true;
  elements.captureImageSection.hidden = true;
  elements.captureImageGallery.innerHTML = "";
  renderCaptureMarkdown("");
  elements.captureProgress.hidden = true;
  elements.captureProgress.textContent = "";
  elements.captureCopyMarkdown.disabled = true;
}

function renderCapturePane(item, markdown, options = {}) {
  if (!hasRenderablePreviewContent(item, markdown)) {
    if (hasStickyPreview() && !itemsReferToSameRecord(previewState.item, item)) {
      showStickyPreview();
      return;
    }
    resetCapturePane("Preview an item to load its markdown here.");
    return;
  }
  const project = getActiveProject();
  const status = options.forcedStatus || getPreviewStatusOverride(project, item) || getEffectiveItemStatus(project, item);
  const busy = state.captureBusy;
  const progress = state.saveProgress;
  const itemMatchesBusy =
    Boolean(
      busy &&
        item &&
        ((busy.key && item.key && busy.key === item.key) || (busy.url && item.url && busy.url === item.url))
    );
  const ignoreBlockedBySaved = status === "saved";
  elements.captureIgnore.disabled = !project || ignoreBlockedBySaved;
  elements.captureCollect.disabled = !project;
  const attachments = getItemAttachments(item);
  const isImageSet = item.type === "image" && attachments.length > 1;
  const collectLabel = status === "saved" ? "Collected" : isImageSet ? `Collect All (${attachments.length})` : "Collect";
  const ignoreLabel = ignoreBlockedBySaved ? "Saved" : status === "ignored" ? "Unignore" : "Ignore";
  elements.captureCollect.dataset.baseLabel = collectLabel;
  elements.captureIgnore.dataset.baseLabel = ignoreLabel;
  elements.captureCollect.textContent = collectLabel;
  elements.captureIgnore.textContent = ignoreLabel;
  elements.captureIgnore.title = ignoreBlockedBySaved ? "Uncollect before ignoring this item." : "";
  elements.captureIgnore.setAttribute(
    "aria-label",
    ignoreBlockedBySaved ? "Item is collected. Uncollect before ignoring." : ignoreLabel
  );
  elements.captureCollect.classList.toggle("is-complete", status === "saved");
  elements.captureIgnore.classList.toggle("is-complete", status === "ignored");
  elements.captureIgnore.classList.toggle("is-ignored-state", status === "ignored");
  elements.captureIgnore.classList.toggle("is-blocked-by-saved", ignoreBlockedBySaved);
  const progressMatchesItem =
    Boolean(
      progress &&
        item &&
        ((progress.key && item.key && progress.key === item.key) || (progress.url && item.url && progress.url === item.url))
    );
  const progressLabel = progressMatchesItem ? formatSaveProgressLabel(progress) : "";
  setButtonLoading(elements.captureCollect, false);
  setButtonLoading(elements.captureIgnore, false);
  elements.captureProgress.textContent = progressLabel;
  elements.captureProgress.hidden = !progressLabel;
  const showImage = item.type === "image" && attachments.length > 0;
  elements.captureImageSection.hidden = !showImage;
  if (showImage) {
    const selectedIndex = Math.max(0, Math.min(previewState.imageIndex || 0, attachments.length - 1));
    const selected = attachments[selectedIndex] || attachments[0];
    const mainSrc = escapeHtml(selected.imageUrl || selected.thumbnailUrl || "");
    const mainTitle = escapeHtml(selected.title || item.title || `Image ${selectedIndex + 1}`);
    const thumbs =
      attachments.length > 1
        ? `<div class="capture-thumbnail-strip">${attachments
            .map((entry, index) => {
              const src = escapeHtml(entry.thumbnailUrl || entry.imageUrl || "");
              const title = escapeHtml(entry.title || item.title || `Image ${index + 1}`);
              const selectedClass = index === selectedIndex ? " is-selected" : "";
              return `<button type="button" class="capture-thumbnail${selectedClass}" data-preview-image-index="${index}" aria-label="Preview ${title}">
                <img src="${src}" alt="${title}">
              </button>`;
            })
            .join("")}</div>`
        : "";
    elements.captureImageGallery.innerHTML = `
      <figure class="capture-gallery-item capture-gallery-primary">
        <button type="button" class="capture-gallery-link" data-open-image-lightbox="${mainSrc}" data-image-caption="${mainTitle}" aria-label="Open larger preview for ${mainTitle}">
          <img src="${mainSrc}" alt="${mainTitle}">
        </button>
        <figcaption>${mainTitle}</figcaption>
      </figure>
      ${thumbs}
    `;
  } else {
    elements.captureImageGallery.innerHTML = "";
  }
  renderCaptureMarkdown(markdown);
  elements.captureCopyMarkdown.disabled = !String(markdown || "").trim();
  elements.captureEmpty.classList.remove("is-loading");
  elements.captureEmpty.hidden = true;
  elements.captureBody.hidden = false;
}

function resolveActionContextTab(context = null) {
  return getTabById(context?.tabId || "") || getActiveTab();
}

async function applyImmediatePageFeedback(item, status, context = null) {
  const targetTab = resolveActionContextTab(context);
  if (!item) {
    return;
  }
  const urls = [...new Set([item.url, ...(item.aliases || [])].filter(Boolean))];
  if (!urls.length) {
    return;
  }
  const script = sourceRegistry.buildImmediateStatusScript({ status, urls });
  await safeExecuteJavaScript(targetTab, script, true, null, { requireReady: false });
}

async function applyImmediatePageLoading(item, action, active, label = "", context = null, token = "") {
  const targetTab = resolveActionContextTab(context);
  if (!item) {
    return;
  }
  const urls = [...new Set([item.url, ...(item.aliases || [])].filter(Boolean))];
  if (!urls.length) {
    return;
  }
  const loadingKey = `${context?.tabId || targetTab?.id || "tab"}::${action || "action"}::${normalizeComparableUrl(urls[0] || "")}`;
  if (active) {
    pageLoadingStartTimes.set(loadingKey, nowMs());
    recordPerfEvent("page.spinner.show", {
      action,
      source: context?.pageUrl ? "page" : "app",
      url: urls[0] || "",
      label,
      token
    });
  }
  const script = sourceRegistry.buildImmediateLoadingScript({ action, active, label, urls, token });
  await safeExecuteJavaScript(targetTab, script, true, null, { requireReady: false });
  if (!active) {
    const startedAt = pageLoadingStartTimes.get(loadingKey);
    pageLoadingStartTimes.delete(loadingKey);
    recordPerfEvent("page.spinner.hide", {
      action,
      url: urls[0] || "",
      durationMs: startedAt ? Math.round(nowMs() - startedAt) : null
    });
  }
}

async function handleSaveProgress(progress) {
  state.saveProgress = progress || null;
  if (progress?.phase) {
    recordPerfEvent("collect.progress", {
      phase: progress.phase,
      title: progress.title || "",
      current: progress.current || 0,
      total: progress.total || 0
    });
  }
  renderQueueTray();
  const displayedItem = getDisplayedItem();
  if (displayedItem) {
    renderCapturePane(displayedItem, getDisplayedMarkdown(), { origin: previewState.origin });
  }
  if (progress?.url || (Array.isArray(progress?.aliases) && progress.aliases.length)) {
    const progressItem = {
      url: progress.url || "",
      aliases: Array.isArray(progress.aliases) ? progress.aliases : []
    };
    await applyImmediatePageLoading(
      progressItem,
      "collect",
      progress?.phase !== "complete",
      formatSaveProgressLabel(progress),
      state.currentQueueJob?.context || null
    );
  }
}

function openImageLightbox(src, caption = "") {
  if (!src) {
    return;
  }
  elements.imageLightboxImg.src = src;
  elements.imageLightboxImg.alt = caption || "Preview image";
  elements.imageLightboxCaption.textContent = caption || "";
  elements.imageLightbox.hidden = false;
  elements.imageLightboxClose.focus();
}

function closeImageLightbox() {
  elements.imageLightbox.hidden = true;
  elements.imageLightboxImg.src = "";
  elements.imageLightboxImg.alt = "";
  elements.imageLightboxCaption.textContent = "";
}

function formatItemType(type) {
  if (type === "image") {
    return "image record";
  }
  if (type === "text") {
    return "text record";
  }
  return "newspaper article";
}

function formatItemTypeBadge(type) {
  if (type === "image") {
    return "Image";
  }
  if (type === "text") {
    return "Text";
  }
  return "Article";
}

function resolveItemLocalTargets(project, item) {
  if (!project || !item) {
    return [];
  }
  return [
    ...(Array.isArray(item.metadataFiles) ? item.metadataFiles : item.metadataFile ? [item.metadataFile] : []),
    ...(Array.isArray(item.assetFiles) ? item.assetFiles : item.assetFile ? [item.assetFile] : []),
    ...(item.file ? [item.file] : [])
  ]
    .filter(Boolean)
    .map((target) => `${project.path}/${target}`);
}

function summarizeNativeRecord(item) {
  if (!item) {
    return "saved";
  }
  const assetCount = Array.isArray(item.assetFiles) ? item.assetFiles.length : item.assetFile ? 1 : 0;
  const metadataCount = Array.isArray(item.metadataFiles) ? item.metadataFiles.length : item.metadataFile ? 1 : 0;
  if (item.type === "image") {
    if (assetCount && metadataCount) {
      return `${assetCount} image${assetCount === 1 ? "" : "s"} + ${metadataCount} sidecar${metadataCount === 1 ? "" : "s"}`;
    }
    if (assetCount) {
      return `${assetCount} image${assetCount === 1 ? "" : "s"} saved`;
    }
    if (metadataCount) {
      return `${metadataCount} metadata sidecar${metadataCount === 1 ? "" : "s"}`;
    }
    return "image record";
  }
  if (item.file) {
    return "markdown saved";
  }
  if (metadataCount) {
    return `${metadataCount} metadata sidecar${metadataCount === 1 ? "" : "s"}`;
  }
  return "saved";
}

function resolveItemMarkdownPath(project, item) {
  if (!project || !item) {
    return "";
  }
  if (item.file) {
    return `${project.path}/${item.file}`;
  }
  const metadataFile = Array.isArray(item.metadataFiles)
    ? item.metadataFiles.find(Boolean)
    : item.metadataFile || "";
  return metadataFile ? `${project.path}/${metadataFile}` : "";
}

async function loadManageItemMarkdown(project, item) {
  const markdownPath = resolveItemMarkdownPath(project, item);
  if (markdownPath) {
    try {
      return await window.troveApi.readTextFile(markdownPath);
    } catch {
      // Fall back to synthesized markdown when the sidecar is missing.
    }
  }
  return buildPreviewMarkdownCached(item);
}

function getManageItemImageSource(item) {
  if (item?.type !== "image") {
    return "";
  }
  return item.imageUrl || (Array.isArray(item.imageUrls) ? item.imageUrls.find(Boolean) : "") || "";
}

function getInventoryItemKey(item) {
  return String(item?.key || [item?.status || "", item?.source || "", item?.type || "", item?.id || item?.url || item?.title || ""].join(":"));
}

function formatInventoryStatus(status) {
  if (status === "saved") {
    return "Collected";
  }
  if (status === "ignored") {
    return "Ignored";
  }
  if (status === "uncollected") {
    return "Uncollected";
  }
  return "Item";
}

async function populateManageCard(card, project, item, renderToken) {
  const imageWrap = card.querySelector(".manage-item-image-wrap");
  const imageNode = card.querySelector(".manage-item-image");
  const markdownNode = card.querySelector(".manage-item-markdown");
  const imageSource = getManageItemImageSource(item);

  if (imageSource) {
    imageWrap.hidden = false;
    imageNode.src = imageSource;
    imageNode.alt = item.title || "";
    imageWrap.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openImageLightbox(imageSource, item.title || "");
    };
  } else {
    imageWrap.hidden = true;
    imageNode.removeAttribute("src");
    imageNode.alt = "";
    imageWrap.onclick = null;
  }

  try {
    const markdown = await loadManageItemMarkdown(project, item);
    if (renderToken !== state.manageRenderToken) {
      return;
    }
    markdownNode.innerHTML = renderMarkdownHtml(markdown);
  } catch {
    if (renderToken !== state.manageRenderToken) {
      return;
    }
    markdownNode.textContent = "Markdown preview unavailable.";
  }
}

function bindManageCardActions(card, project, item) {
  const localTargets = resolveItemLocalTargets(project, item);
  const openPage = card.querySelector(".manage-open-page");
  const openFile = card.querySelector(".manage-open-file");
  if (openPage) {
    openPage.addEventListener("click", () => {
      void openItemInApp(item);
    });
  }
  if (openFile) {
    openFile.disabled = !localTargets.length;
    openFile.addEventListener("click", async () => {
      if (!localTargets.length) {
        return;
      }
      await window.troveApi.openPath(localTargets[0]);
    });
  }
}

async function renderManageCompactList(project, inventory, renderToken) {
  const activeExpandedKey = inventory.some((item) => getInventoryItemKey(item) === state.manageExpandedKey)
    ? state.manageExpandedKey
    : "";
  state.manageExpandedKey = activeExpandedKey;

  const table = document.createElement("div");
  table.className = "manage-table";
  table.innerHTML = `
    <div class="manage-table-head">
      <span>Title</span>
      <span>Source</span>
      <span>Status</span>
      <span>Updated</span>
    </div>
  `;

  for (const item of inventory) {
    const itemKey = getInventoryItemKey(item);
    const row = document.createElement("section");
    row.className = "manage-row";
    row.dataset.itemKey = itemKey;
    row.classList.toggle("is-expanded", itemKey === activeExpandedKey);
    row.classList.toggle("is-ignored", item.status === "ignored");
    row.classList.toggle("is-uncollected", item.status === "uncollected");

    const title = escapeHtml(item.title || "Untitled item");
    const source = escapeHtml(item.sourceLabel || item.source || "");
    const status = escapeHtml(formatInventoryStatus(item.status));
    const updated = escapeHtml(formatDate(item.timestamp || item.savedAt || item.ignoredAt || item.uncollectedAt || ""));

    row.innerHTML = `
      <button type="button" class="manage-row-toggle" aria-expanded="${itemKey === activeExpandedKey ? "true" : "false"}">
        <span class="manage-row-title">${title}</span>
        <span class="manage-row-source">${source}</span>
        <span class="manage-row-status">${status}</span>
        <span class="manage-row-date">${updated}</span>
      </button>
    `;

    row.querySelector(".manage-row-toggle")?.addEventListener("click", () => {
      state.manageExpandedKey = state.manageExpandedKey === itemKey ? "" : itemKey;
      void renderManageList();
    });

    if (itemKey === activeExpandedKey) {
      const detail = document.createElement("div");
      detail.className = "manage-row-detail";
      const fragment = elements.manageItemTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".manage-item");
      card.classList.add("manage-item-detail");
      card.classList.toggle("is-ignored", item.status === "ignored");
      card.classList.toggle("is-uncollected", item.status === "uncollected");
      bindManageCardActions(card, project, item);
      detail.append(fragment);
      row.append(detail);
      table.append(row);
      void populateManageCard(card, project, item, renderToken);
      continue;
    }

    table.append(row);
  }

  elements.manageList.append(table);
}

async function openItemInApp(item) {
  if (!item?.url) {
    return;
  }
  setMode("collect");
  const activeTab = getActiveTab();
  if (activeTab) {
    void navigateExistingTab(activeTab, item.url);
  } else {
    createTab(item.url);
  }
}

function getPluginSeedUrls() {
  return extractSupportedImportUrls(elements.pluginSeedUrls?.value || "");
}

function appendPluginIntakeText(text, label = "") {
  const incoming = String(text || "").trim();
  if (!incoming) {
    return;
  }
  const current = String(elements.pluginSeedUrls?.value || "").trim();
  const heading = label ? `\n\n# ${label}\n` : "\n\n";
  elements.pluginSeedUrls.value = `${current}${current ? heading : label ? `# ${label}\n` : ""}${incoming}`.trim();
  renderPluginIntake();
}

function extractUrlsFromText(value) {
  const decoded = String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  const matches = decoded.match(/https?:\/\/[^\s<>"'`)\]}]+/gi) || [];
  return [
    ...new Set(
      matches
        .map((url) => url.replace(/[.,;:!?]+$/g, "").replace(/&quot$/i, ""))
        .map(ensureUrl)
        .filter(Boolean)
    )
  ];
}

function getSupportedImportUrlPatterns() {
  return [
    /https?:\/\/trove\.nla\.gov\.au\/newspaper\/article\/\d+/i,
    /https?:\/\/trove\.nla\.gov\.au\/work\/\d+/i,
    /https?:\/\/encore\.slwa\.wa\.gov\.au\/iii\/encore\/record\//i,
    /https?:\/\/purl\.slwa\.wa\.gov\.au\/[a-z0-9_./-]+/i,
    /https?:\/\/catalogue\.slwa\.wa\.gov\.au\/record=b\d+~S\d+/i,
    /https?:\/\/museum\.wa\.gov\.au\/maritime-archaeology-db\/artefacts\/[^/?#]+/i,
    /https?:\/\/collection\.artgallery\.wa\.gov\.au\/objects\/\d+\/[^/?#]+/i
  ];
}

function extractSupportedImportUrls(value) {
  const patterns = getSupportedImportUrlPatterns();
  return extractUrlsFromText(value).filter((url) => patterns.some((pattern) => pattern.test(url)));
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function bytesToLatinText(bytes) {
  let output = "";
  for (const byte of bytes) {
    output += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : " ";
  }
  return output;
}

function bytesToUtf16Text(bytes) {
  let output = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const code = bytes[index] | (bytes[index + 1] << 8);
    output += code >= 32 && code <= 0xffff ? String.fromCharCode(code) : " ";
  }
  return output;
}

async function inflateRawDeflate(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("DOCX decompression is not available in this Electron runtime.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractTextFromZipXml(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunks = [];
  let offset = 0;
  while (offset + 30 < bytes.length) {
    const signature = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const flags = bytes[offset + 6] | (bytes[offset + 7] << 8);
    const method = bytes[offset + 8] | (bytes[offset + 9] << 8);
    const compressedSize =
      bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
    const fileNameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
    const extraLength = bytes[offset + 28] | (bytes[offset + 29] << 8);
    const fileNameStart = offset + 30;
    const fileName = new TextDecoder().decode(bytes.slice(fileNameStart, fileNameStart + fileNameLength));
    const dataStart = fileNameStart + fileNameLength + extraLength;
    if (flags & 0x08 || compressedSize < 0 || dataStart + compressedSize > bytes.length) {
      offset = dataStart + Math.max(0, compressedSize);
      continue;
    }
    if (/\.(xml|rels)$/i.test(fileName)) {
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      try {
        const contentBytes = method === 0 ? compressed : method === 8 ? await inflateRawDeflate(compressed) : null;
        if (contentBytes) {
          chunks.push(decodeXmlEntities(new TextDecoder().decode(contentBytes)));
        }
      } catch {
        // Keep processing other zip entries.
      }
    }
    offset = dataStart + compressedSize;
  }
  return chunks.join("\n");
}

async function extractTextFromDroppedFile(file) {
  const name = String(file?.name || "dropped file");
  const extension = name.split(".").pop()?.toLowerCase() || "";
  const buffer = await file.arrayBuffer();
  if (extension === "docx") {
    return extractTextFromZipXml(buffer);
  }
  const bytes = new Uint8Array(buffer);
  const latinText = bytesToLatinText(bytes);
  if (extension === "pdf") {
    return `${latinText}\n${bytesToUtf16Text(bytes)}`;
  }
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return latinText;
  }
}

async function handlePluginDroppedFiles(files) {
  const dropped = Array.from(files || []);
  if (!dropped.length) {
    return;
  }
  elements.pluginDropZone?.classList.add("is-loading");
  try {
    const summaries = [];
    for (const file of dropped) {
      const text = await extractTextFromDroppedFile(file);
      const urls = extractSupportedImportUrls(text);
      if (urls.length) {
        appendPluginIntakeText(urls.join("\n"), file.name || "Dropped file");
      }
      summaries.push(`${file.name || "file"}: ${urls.length} URL${urls.length === 1 ? "" : "s"}`);
    }
    setMessage(`Imported ${summaries.join(" · ")}.`);
    openImportTriageDialogFromNotes();
  } catch (error) {
    setMessage(error.message || "Could not read dropped file.");
  } finally {
    elements.pluginDropZone?.classList.remove("is-loading", "is-dragging");
  }
}

function pluginMatchesUrl(plugin, url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return plugin.domains.some((domain) => {
      const normalizedDomain = String(domain || "").toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });
  } catch {
    return false;
  }
}

function classifyPluginSeedUrls(urls) {
  const groups = state.plugins.map((plugin) => ({ plugin, urls: [] }));
  for (const url of urls) {
    const group = groups.find((entry) => pluginMatchesUrl(entry.plugin, url));
    if (group) {
      group.urls.push(url);
    }
  }
  return {
    groups: groups.filter((entry) => entry.urls.length),
    unsupported: []
  };
}

function renderPluginUrlAnalysis(urls) {
  if (!elements.pluginUrlAnalysis) {
    return;
  }
  if (!urls.length) {
    elements.pluginUrlAnalysis.className = "plugin-url-analysis empty-state";
    const rawCount = extractUrlsFromText(elements.pluginSeedUrls?.value || "").length;
    elements.pluginUrlAnalysis.textContent = rawCount
      ? `No supported collection links found. Ignored ${rawCount} unsupported URL${rawCount === 1 ? "" : "s"}.`
      : "Paste or drop notes to find collection links.";
    return;
  }
  const classified = classifyPluginSeedUrls(urls);
  let itemIndex = 0;
  const renderTriageItem = (url, options = {}) => {
    itemIndex += 1;
    const checked = options.checked === false ? "" : " checked";
    const source = options.source || "New source";
    const className = options.unsupported ? "plugin-triage-item is-unsupported" : "plugin-triage-item";
    return `
      <label class="${className}">
        <input type="checkbox" class="plugin-triage-check" data-url="${escapeHtml(url)}"${checked}>
        <span>
          <strong>${escapeHtml(source)}</strong>
          <small>${escapeHtml(url)}</small>
        </span>
      </label>
    `;
  };
  const rows = [
    ...classified.groups.map(
      ({ plugin, urls: sourceUrls }) => `
        <div class="plugin-url-analysis-group">
          <div class="plugin-url-analysis-row">
            <strong>${escapeHtml(plugin.label)}</strong>
            <span>${sourceUrls.length} URL${sourceUrls.length === 1 ? "" : "s"}</span>
          </div>
          <div class="plugin-triage-list">
            ${sourceUrls.map((url) => renderTriageItem(url, { source: plugin.label })).join("")}
          </div>
        </div>
      `
    )
  ].filter(Boolean);
  elements.pluginUrlAnalysis.className = "plugin-url-analysis";
  elements.pluginUrlAnalysis.innerHTML = rows.join("");
}

function getSelectedPluginIntakeUrls() {
  return Array.from(elements.pluginUrlAnalysis?.querySelectorAll(".plugin-triage-check:checked") || [])
    .map((input) => input.getAttribute("data-url") || "")
    .filter(Boolean);
}

function renderPluginIntake() {
  const urls = getPluginSeedUrls();
  renderPluginUrlAnalysis(urls);
  if (elements.pluginOpenSelected) {
    elements.pluginOpenSelected.disabled = !getSelectedPluginIntakeUrls().length;
  }
  if (elements.pluginClearIntake) {
    elements.pluginClearIntake.disabled = !String(elements.pluginSeedUrls?.value || "").trim();
  }
}

function openImportTriageDialogFromNotes(urlsOverride = null) {
  const urls = Array.isArray(urlsOverride) ? urlsOverride : getPluginSeedUrls();
  if (!urls.length) {
    renderPluginIntake();
    return;
  }
  state.linkDialogSourceId = "omni";
  state.linkDialogUrls = urls;
  if (elements.troveLinkDialogInput) {
    elements.troveLinkDialogInput.value = elements.pluginSeedUrls?.value || urls.join("\n");
  }
  renderTroveLinkDialogPreview();
  elements.troveLinkDialog.hidden = false;
  queueMicrotask(() => elements.troveLinkDialogOpenUnresolved?.focus());
}

function renderMode() {
  document.querySelector(".app-shell")?.classList.remove("mode-collect", "mode-manage", "mode-plugins");
  document.querySelector(".app-shell")?.classList.add(`mode-${state.mode}`);
  elements.modeCollect.classList.toggle("is-active", state.mode === "collect");
  elements.modeManage.classList.toggle("is-active", state.mode === "manage");
  elements.modePlugins.classList.toggle("is-active", state.mode === "plugins");
  elements.collectView.hidden = state.mode !== "collect";
  elements.manageView.hidden = state.mode !== "manage";
  elements.pluginsView.hidden = state.mode !== "plugins";
  renderQueueTray();
}

function resetManageDefaults() {
  state.manageFilter = "saved";
  state.manageLayout = "compact";
  state.manageQuery = "";
  state.manageExpandedKey = "";
}

function setMode(mode) {
  if (mode === "manage") {
    resetManageDefaults();
  }
  state.mode = mode;
  closeProjectContextMenu();
  renderMode();
  renderProjectDetails();
  renderSavedSearches();
  renderPluginIntake();
}

function getDebugCwd() {
  return getActiveProject()?.path || "";
}

function renderDebugCwd() {
  elements.debugCwd.textContent = getDebugCwd()
    ? `Running in ${getDebugCwd()}`
    : "Running in workspace root.";
}

function toggleDebugDrawer(forceOpen = !state.debugOpen) {
  state.debugOpen = forceOpen;
  elements.debugDrawer.hidden = !state.debugOpen;
  if (state.debugOpen) {
    renderDebugCwd();
    elements.debugCommand.focus();
  }
}

function isWebviewReady(tab) {
  return Boolean(tab && tab.didDomReady && tab.webview?.isConnected);
}

async function safeExecuteJavaScript(target, script, userGesture = true, fallbackValue = null, options = {}) {
  if (!target) {
    return fallbackValue;
  }
  try {
    const isTab = Object.prototype.hasOwnProperty.call(target, "webview");
    const webview = isTab ? target.webview : target;
    const requireReady = options.requireReady !== false;
    if (!webview?.isConnected) {
      return fallbackValue;
    }
    if (isTab && requireReady && !isWebviewReady(target)) {
      return fallbackValue;
    }
    const execution = webview.executeJavaScript(script, userGesture);
    return await Promise.race([
      execution,
      new Promise((resolve) => {
        setTimeout(() => resolve(fallbackValue), 2000);
      })
    ]);
  } catch {
    return fallbackValue;
  }
}

function safeCanGo(tab, direction) {
  if (!tab?.webview?.isConnected) {
    return false;
  }
  try {
    return direction === "back" ? tab.webview.canGoBack() : tab.webview.canGoForward();
  } catch {
    return false;
  }
}

function isIgnorableNavigationError(error) {
  const message = String(error?.message || error || "");
  return /ERR_ABORTED\s*\(-?3\)/i.test(message);
}

function getElectronNetErrorCode(error) {
  const message = String(error?.message || error || "");
  const match = message.match(/ERR_[A-Z_]+/i);
  return match ? match[0].toUpperCase() : "";
}

function isTransientNetworkError(error) {
  return /ERR_(NETWORK_CHANGED|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|ADDRESS_UNREACHABLE|NETWORK_IO_SUSPENDED|CONNECTION_(TIMED_OUT|RESET|ABORTED|CLOSED|REFUSED)|TIMED_OUT)/i.test(
    String(error?.message || error || "")
  );
}

function describeTransientNetworkError(error) {
  const code = getElectronNetErrorCode(error);
  if (code === "ERR_NETWORK_CHANGED") {
    return "The network changed while reloading. Try refresh again once the connection settles.";
  }
  if (code === "ERR_INTERNET_DISCONNECTED") {
    return "The internet connection dropped while reloading.";
  }
  if (code === "ERR_NAME_NOT_RESOLVED") {
    return "The site could not be reached because DNS resolution failed.";
  }
  if (code === "ERR_ADDRESS_UNREACHABLE") {
    return "The site could not be reached from the current network.";
  }
  if (code) {
    return `The page could not be refreshed because the network is unavailable (${code}).`;
  }
  return "The page could not be refreshed because the network is unavailable.";
}

function buildTransientFetchFailure(url, error) {
  const normalizedUrl = ensureUrl(url);
  return {
    supported: false,
    url: normalizedUrl,
    aliases: normalizedUrl ? [normalizedUrl] : [],
    reason: describeTransientNetworkError(error),
    transient: true,
    errorCode: getElectronNetErrorCode(error)
  };
}

async function navigateExistingTab(target, url) {
  const nextUrl = ensureUrl(url);
  const webview = target?.webview || target;
  if (!nextUrl || !webview?.isConnected) {
    return false;
  }
  interruptPreviewWork();
  try {
    await webview.loadURL(nextUrl);
    return true;
  } catch (error) {
    if (isIgnorableNavigationError(error)) {
      return false;
    }
    setMessage(`Navigation failed: ${String(error?.message || error || "Unknown error")}`);
    return false;
  }
}

function getTabFallbackTitle(url = "") {
  const normalizedUrl = ensureUrl(url);
  if (!normalizedUrl) {
    return "New tab";
  }
  try {
    const parsed = new URL(normalizedUrl);
    if (/\/newspaper\/article\/\d+/i.test(parsed.pathname)) {
      const articleId = parsed.pathname.match(/\/newspaper\/article\/(\d+)/i)?.[1] || "";
      return articleId ? `Article ${articleId}` : "Article";
    }
    if (/\/work\/\d+/i.test(parsed.pathname)) {
      const workId = parsed.pathname.match(/\/work\/(\d+)/i)?.[1] || "";
      return workId ? `Work ${workId}` : "Work";
    }
    if (/\/search/i.test(parsed.pathname) || parsed.pathname === "/search") {
      const query =
        parsed.searchParams.get("keyword") ||
        parsed.searchParams.get("q") ||
        parsed.searchParams.get("query") ||
        parsed.searchParams.get("searcharg") ||
        "";
      return query ? query : "Search";
    }
    return parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() || parsed.hostname || normalizedUrl;
  } catch {
    return normalizedUrl;
  }
}

function openUrlInTab(url = getDefaultBrowseUrl(), options = {}) {
  const { activate = true, deferLoad = false } = options;
  const nextUrl = ensureUrl(url);
  const id = `tab-${crypto.randomUUID()}`;
  const webview = document.createElement("webview");
  if (!deferLoad) {
    webview.src = nextUrl;
  }
  webview.className = "browser-webview";
  if (activate) {
    webview.classList.add("is-active");
  }
  webview.setAttribute("partition", WEBVIEW_PARTITION);
  webview.setAttribute("useragent", navigator.userAgent.replace(/\s*Electron\/[^\s]+/i, ""));

  const tab = {
    id,
    url: nextUrl,
    title: deferLoad ? getTabFallbackTitle(nextUrl) : "New tab",
    webview,
    deferredUrl: deferLoad ? nextUrl : "",
    didDomReady: false,
    lastItem: null,
    extractionToken: "",
    extractionPromise: null,
    decorationSignature: "",
    refreshTimer: null,
    scriptRecoveryKey: "",
    listSettleTimer: null,
    loadingStartedAt: 0,
    loadWatchdogTimer: null
  };

  bindWebview(tab);
  state.tabs.push(tab);
  elements.webviewStack.append(webview);
  syncWebviewElementSize(tab);
  if (activate) {
    setActiveTab(id);
  } else {
    renderTabs();
    updateNavigationButtons();
  }
  return tab;
}

function createTab(url = getDefaultBrowseUrl()) {
  return openUrlInTab(url, { activate: true });
}

function openBackgroundTab(url, options = {}) {
  return openUrlInTab(url, { activate: false, deferLoad: Boolean(options.deferLoad) });
}

function loadDeferredTab(tab) {
  if (!tab?.deferredUrl || !tab.webview?.isConnected) {
    return;
  }
  const nextUrl = tab.deferredUrl;
  tab.deferredUrl = "";
  tab.didDomReady = false;
  invalidateTabCaches(tab);
  renderTabs();
  tab.webview.src = nextUrl;
}

function openUrlListInTabs(urls = []) {
  const normalizedUrls = [...new Set((Array.isArray(urls) ? urls : []).map((value) => ensureUrl(value)).filter(Boolean))];
  if (!normalizedUrls.length) {
    return [];
  }

  const opened = [];
  const activeTab = getActiveTab();
  const defaultBrowseUrl = getDefaultBrowseUrl();
  const canReuseActiveTab =
    activeTab?.webview &&
    ensureUrl(activeTab.url || "") === ensureUrl(defaultBrowseUrl) &&
    String(activeTab.title || "").trim().toLowerCase() === "new tab";

  if (canReuseActiveTab) {
    void navigateExistingTab(activeTab, normalizedUrls[0]);
    opened.push(activeTab);
  } else {
    opened.push(createTab(normalizedUrls[0]));
  }

  const eagerlyLoadedBackgroundCount = normalizedUrls.length > 2 ? 1 : normalizedUrls.length - 1;
  normalizedUrls.slice(1).forEach((url, index) => {
    opened.push(openBackgroundTab(url, { deferLoad: index >= eagerlyLoadedBackgroundCount }));
  });

  return opened;
}

function getTabItemStatus(tab, project = getActiveProject()) {
  const targetUrl = ensureUrl(tab?.deferredUrl || tab?.url || "");
  if (!project || !targetUrl || targetUrl === ensureUrl(getDefaultBrowseUrl())) {
    return "";
  }
  return getEffectiveItemStatus(project, {
    url: targetUrl,
    aliases: [targetUrl]
  });
}

function openTabFromPayload(payload) {
  const nextUrl = ensureUrl(typeof payload === "string" ? payload : payload?.url || "");
  if (!nextUrl) {
    return null;
  }
  const activate = typeof payload === "string" ? true : payload?.activate !== false;
  return activate ? createTab(nextUrl) : openBackgroundTab(nextUrl);
}

function installBrowserPageLinkInterceptors(tab) {
  if (!tab?.webview?.isConnected) {
    return;
  }

  const script = `
    (() => {
      if (window.__troveLibraryBrowserNavInstalled) {
        return;
      }
      window.__troveLibraryBrowserNavInstalled = true;
      const prefix = "__trove_library_browser_action__";
      const emit = (payload) => console.log(prefix + JSON.stringify(payload));
      const findAnchor = (target) => (target instanceof Element ? target.closest("a[href]") : null);
      document.addEventListener(
        "click",
        (event) => {
          const anchor = findAnchor(event.target);
          if (!anchor?.href || anchor.href.startsWith("javascript:")) {
            return;
          }
          const wantsNewTab =
            event.button === 1 ||
            event.metaKey ||
            event.ctrlKey ||
            anchor.target === "_blank";
          if (!wantsNewTab) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          emit({
            action: "open-tab",
            url: anchor.href,
            activate: Boolean(event.shiftKey || anchor.target === "_blank")
          });
        },
        true
      );

      document.addEventListener(
        "auxclick",
        (event) => {
          if (event.button !== 1) {
            return;
          }
          const anchor = findAnchor(event.target);
          if (!anchor?.href || anchor.href.startsWith("javascript:")) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          emit({
            action: "open-tab",
            url: anchor.href,
            activate: false
          });
        },
        true
      );
    })();
  `;

  void safeExecuteJavaScript(tab, script, true, null);
}

function closeTab(tabId) {
  if (state.tabs.length === 1) {
    return;
  }

  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) {
    return;
  }

  const [tab] = state.tabs.splice(index, 1);
  if (tab.refreshTimer) {
    clearTimeout(tab.refreshTimer);
  }
  clearListSettleTimer(tab);
  clearWebviewLoadWatchdog(tab);
  tab.webview.remove();

  if (state.activeTabId === tabId) {
    const fallback = state.tabs[Math.max(0, index - 1)] || state.tabs[0];
    setActiveTab(fallback.id);
  }

  renderTabs();
}

function setActiveTab(tabId) {
  state.activeTabId = tabId;
  for (const tab of state.tabs) {
    tab.webview.classList.toggle("is-active", tab.id === tabId);
  }
  syncWebviewElementSize(getActiveTab());
  const activeTab = getActiveTab();
  elements.addressInput.value = activeTab ? activeTab.url : "";
  renderTabs({ revealActive: true });
  updateNavigationButtons();
  if (activeTab?.deferredUrl) {
    loadDeferredTab(activeTab);
    return;
  }
  if (pageFindState.open && pageFindState.query) {
    updatePageFindUi();
    runPageFind({ findNext: false, forward: true });
  }
  scheduleTabRefresh(getActiveTab(), { delay: 0 });
}

function syncWebviewElementSize(tab = getActiveTab()) {
  if (!tab?.webview?.isConnected) {
    return;
  }
  const rect = elements.webviewStack.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(320, Math.round(rect.height));
  tab.webview.style.width = `${width}px`;
  tab.webview.style.height = `${height}px`;
}

function invalidateTabCaches(tab) {
  if (!tab) {
    return;
  }
  tab.lastItem = null;
  tab.extractionToken = "";
  tab.extractionPromise = null;
  tab.decorationSignature = "";
}

function getDecorationSignature(tab, project) {
  return JSON.stringify({
    url: tab?.url || "",
    projectPath: project?.path || "",
    updatedAt: project?.updatedAt || "",
    savedCount: project?.savedCount || 0,
    ignoredCount: project?.ignoredCount || 0
  });
}

function scheduleTabRefresh(tab = getActiveTab(), options = {}) {
  if (!tab) {
    return;
  }
  const {
    delay = 120,
    capture = true,
    decorations = true
  } = options;
  if (tab.refreshTimer) {
    clearTimeout(tab.refreshTimer);
  }
  tab.refreshTimer = setTimeout(async () => {
    tab.refreshTimer = null;
    try {
      if (tab.id !== state.activeTabId) {
        return;
      }
      if (decorations) {
        await applyProjectDecorations();
      }
      if (capture) {
        await updateCaptureState();
      }
    } catch (error) {
      console.error("Scheduled tab refresh failed.", error);
    }
  }, delay);
}

function renderSearchOrListCaptureState(tab = getActiveTab()) {
  if (!tab || !isKnownSearchOrListUrl(tab.url || tab.webview?.getURL?.() || "")) {
    return false;
  }
  elements.pageStatus.textContent = tab.title || "Search results";
  elements.pageKind.className = "page-kind";
  elements.pageKind.textContent = "This page itself is not directly collectible. Use Preview or Collect on the supported record links here.";
  if (!showStickyPreview()) {
    clearPreviewState();
    resetCapturePane(
      "This page is a search or list view, not the final record. Use the inline Preview or Collect buttons on supported result links."
    );
  }
  return true;
}

function clearListSettleTimer(tab) {
  if (tab?.listSettleTimer) {
    clearTimeout(tab.listSettleTimer);
    tab.listSettleTimer = null;
  }
}

function scheduleSearchListLoadingSettle(tab) {
  clearListSettleTimer(tab);
  tab.listSettleTimer = setTimeout(() => {
    tab.listSettleTimer = null;
    if (!tab.webview?.isConnected) {
      return;
    }
    const currentUrl = ensureUrl(tab.webview.getURL?.() || tab.url || "");
    if (!isKnownSearchOrListUrl(currentUrl)) {
      return;
    }
    tab.url = currentUrl;
    try {
      if (!tab.didDomReady && typeof tab.webview.isLoading === "function" && tab.webview.isLoading()) {
        tab.webview.stop();
      }
    } catch {
      // Leave the page visible and recover the surrounding app state.
    }
    updateNavigationButtons();
    if (tab.id === state.activeTabId) {
      renderSearchOrListCaptureState(tab);
      setMessage("Search results are ready.");
    }
  }, 8000);
}

function settleSearchListLoadingTab(tab) {
  if (!tab?.webview?.isConnected) {
    return false;
  }
  const currentUrl = ensureUrl(tab.webview.getURL?.() || tab.url || "");
  if (!isKnownSearchOrListUrl(currentUrl)) {
    return false;
  }
  tab.url = currentUrl;
  try {
    if (!tab.didDomReady && typeof tab.webview.isLoading === "function" && tab.webview.isLoading()) {
      tab.webview.stop();
    }
  } catch {
    // Leave the visible page alone and recover the surrounding app state.
  }
  tab.loadingStartedAt = 0;
  if (tab.scriptRecoveryKey !== currentUrl) {
    tab.scriptRecoveryKey = currentUrl;
    if (tab.id === state.activeTabId) {
      elements.pageStatus.textContent = "Recovering page";
      elements.pageKind.className = "page-kind";
      elements.pageKind.textContent = "The results page rendered but stopped answering the app. Reloading it once to restore controls.";
      setMessage("Reloading an unresponsive results view.");
    }
    try {
      tab.webview.reload();
      startWebviewLoadWatchdog(tab);
      return true;
    } catch {
      // Fall through to recovering the surrounding state.
    }
  }
  updateNavigationButtons();
  if (tab.id === state.activeTabId) {
    elements.addressInput.value = currentUrl;
    renderSearchOrListCaptureState(tab);
    setMessage("Search results are ready.");
  }
  return true;
}

function monitorWebviewRecoverability() {
  const now = nowMs();
  for (const tab of state.tabs) {
    if (!tab?.webview?.isConnected) {
      continue;
    }
    let currentUrl = "";
    let isLoading = false;
    try {
      currentUrl = ensureUrl(tab.webview.getURL?.() || tab.url || "");
      isLoading = typeof tab.webview.isLoading === "function" && tab.webview.isLoading();
    } catch {
      continue;
    }
    if (!isLoading) {
      tab.loadingStartedAt = 0;
      continue;
    }
    if (!tab.loadingStartedAt) {
      tab.loadingStartedAt = now;
    }
    if (isKnownSearchOrListUrl(currentUrl) && now - tab.loadingStartedAt > 8000) {
      settleSearchListLoadingTab(tab);
    }
  }
}

function nudgeWebviewLayout(tab) {
  if (!tab?.webview?.isConnected) {
    return;
  }
  const script = `
    (() => {
      try {
        const fallbackHeight = Math.max(window.innerHeight - 120, 480);
        const layoutRoot = document.querySelector("#ui-layout-main");
        if (layoutRoot && layoutRoot.getBoundingClientRect().height === 0) {
          layoutRoot.style.minHeight = fallbackHeight + "px";
        }
        if (document.documentElement) {
          document.documentElement.style.minHeight = Math.max(document.documentElement.clientHeight, fallbackHeight) + "px";
        }
        if (document.body) {
          document.body.style.minHeight = Math.max(document.body.clientHeight, fallbackHeight) + "px";
        }
        return {
          innerHeight: window.innerHeight,
          layoutHeight: layoutRoot ? layoutRoot.getBoundingClientRect().height : null
        };
      } catch (error) {
        return {
          error: String(error?.message || error || "layout nudge failed")
        };
      }
    })();
  `;

  for (const delay of [0, 250, 1000]) {
    setTimeout(() => {
      if (!tab.webview?.isConnected) {
        return;
      }
      void safeExecuteJavaScript(tab, script, true, null);
    }, delay);
  }
}

function dismissPageObstructions(tab) {
  if (!tab?.webview?.isConnected) {
    return;
  }
  const script = `
    (() => {
      try {
        const normalize = (value) => String(value || "").replace(/\\s+/g, " ").trim().toLowerCase();
        const findDismissButton = () => {
          const overlayRoots = Array.from(
            document.querySelectorAll('#culturalModal, [role="dialog"], .modal, .dialog, .popup, [aria-modal="true"]')
          );
          const exactMatchers = [
            /don't show cultural advice/i,
            /dont show cultural advice/i,
            /^[×x✕]$/i,
            /^close$/i,
            /^dismiss$/i,
            /^continue$/i,
            /^ok$/i
          ];
          const fuzzyMatchers = [/cultural advice/i, /close/i, /dismiss/i, /continue/i, /skip/i, /ok/i, /^[×x✕]$/i];
          const candidates = [];
          const collectButtons = (root) =>
            Array.from(root.querySelectorAll('button, [role="button"], a, .close, [data-dismiss], [data-bs-dismiss]')).filter((node) => {
              const combined = [
                node.textContent,
                node.getAttribute("aria-label"),
                node.getAttribute("title"),
                node.getAttribute("data-dismiss"),
                node.getAttribute("data-bs-dismiss"),
                node.className
              ].join(" ");
              return fuzzyMatchers.some((pattern) => pattern.test(combined));
            });

          for (const root of overlayRoots) {
            candidates.push(...collectButtons(root));
          }
          if (!candidates.length) {
            candidates.push(
              ...Array.from(document.querySelectorAll('button, [role="button"], a, .close, [data-dismiss], [data-bs-dismiss]')).filter((node) => {
                const combined = [
                  node.textContent,
                  node.getAttribute("aria-label"),
                  node.getAttribute("title"),
                  node.className
                ].join(" ");
                return /don't show cultural advice|dont show cultural advice|cultural advice/i.test(combined);
              })
            );
          }
          return (
            candidates.find((node) => {
              const value = normalize([
                node.textContent,
                node.getAttribute("aria-label"),
                node.getAttribute("title")
              ].join(" "));
              return /don't show cultural advice|dont show cultural advice/i.test(value);
            }) ||
            candidates.find((node) => {
              const value = normalize([
                node.textContent,
                node.getAttribute("aria-label"),
                node.getAttribute("title")
              ].join(" "));
              return exactMatchers.some((pattern) => pattern.test(value));
            }) ||
            candidates[0] ||
            null
          );
        };

        const dismissOnce = () => {
          const best = findDismissButton();
          if (best) {
            try {
              best.click();
              return true;
            } catch {
              return false;
            }
          }
          try {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
          } catch {
            // Ignore pages that do not accept synthetic keyboard events.
          }
          return false;
        };

        if (dismissOnce()) {
          return true;
        }
        if (!window.__troveLibraryObstructionDismissTimer) {
          let attempts = 0;
          window.__troveLibraryObstructionDismissTimer = window.setInterval(() => {
            attempts += 1;
            try {
              if (dismissOnce() || attempts >= 20) {
                window.clearInterval(window.__troveLibraryObstructionDismissTimer);
                window.__troveLibraryObstructionDismissTimer = null;
              }
            } catch {
              if (attempts >= 20) {
                window.clearInterval(window.__troveLibraryObstructionDismissTimer);
                window.__troveLibraryObstructionDismissTimer = null;
              }
            }
          }, 250);
        }
        return false;
      } catch {
        return false;
      }
    })();
  `;

  for (const delay of [250, 1000, 2500]) {
    setTimeout(() => {
      if (!tab.webview?.isConnected) {
        return;
      }
      void safeExecuteJavaScript(tab, script, true, null, { requireReady: false });
    }, delay);
  }
}

function clearWebviewLoadWatchdog(tab) {
  if (tab?.loadWatchdogTimer) {
    clearTimeout(tab.loadWatchdogTimer);
    tab.loadWatchdogTimer = null;
  }
}

function startWebviewLoadWatchdog(tab) {
  clearWebviewLoadWatchdog(tab);
  tab.loadWatchdogTimer = setTimeout(() => {
    tab.loadWatchdogTimer = null;
    if (!tab.webview?.isConnected || tab.didDomReady) {
      return;
    }
    try {
      if (typeof tab.webview.isLoading === "function" && tab.webview.isLoading()) {
        tab.webview.stop();
      }
    } catch {
      // The webview may detach during shutdown or tab replacement.
    }
    if (tab.id !== state.activeTabId) {
      return;
    }
    const failureReason = "This page stalled while loading. The browser is still usable; try refresh when the site responds.";
    elements.pageStatus.textContent = "Load stalled";
    elements.pageKind.className = "page-kind";
    elements.pageKind.textContent = failureReason;
    if (!showStickyPreview()) {
      clearPreviewState();
      resetCapturePane(failureReason, "Unavailable");
    }
    setMessage(failureReason);
  }, WEBVIEW_LOAD_TIMEOUT_MS);
}

function scheduleWebviewResponsivenessProbe(tab) {
  if (!tab?.webview?.isConnected || !isKnownSearchOrListUrl(tab.webview.getURL?.() || tab.url || "")) {
    return;
  }
  setTimeout(async () => {
    if (!tab.webview?.isConnected) {
      return;
    }
    if (!tab.didDomReady) {
      return;
    }
    const currentUrl = ensureUrl(tab.webview.getURL?.() || tab.url || "");
    if (!isKnownSearchOrListUrl(currentUrl)) {
      return;
    }
    const probe = await safeExecuteJavaScript(
      tab,
      "document.readyState",
      true,
      "__trove_probe_timeout__",
      { requireReady: false }
    );
    if (probe !== "__trove_probe_timeout__" || tab.scriptRecoveryKey === currentUrl) {
      return;
    }
    tab.scriptRecoveryKey = currentUrl;
    if (tab.id === state.activeTabId) {
      elements.pageStatus.textContent = "Recovering page";
      elements.pageKind.className = "page-kind";
      elements.pageKind.textContent = "The page rendered but stopped answering the app. Reloading it once to restore controls.";
      setMessage("Reloading an unresponsive page view.");
    }
    try {
      tab.webview.reload();
      startWebviewLoadWatchdog(tab);
    } catch {
      void navigateExistingTab(tab, currentUrl);
    }
  }, 1200);
}

function scheduleSearchInlineActionProbe(tab) {
  if (!tab?.webview?.isConnected || !isAgwaSearchResultsUrl(tab.webview.getURL?.() || tab.url || "")) {
    return;
  }
  setTimeout(async () => {
    if (!tab.webview?.isConnected) {
      return;
    }
    if (!tab.didDomReady) {
      return;
    }
    const currentUrl = ensureUrl(tab.webview.getURL?.() || tab.url || "");
    if (!isAgwaSearchResultsUrl(currentUrl) || tab.scriptRecoveryKey === currentUrl) {
      return;
    }
    const actionCount = await safeExecuteJavaScript(
      tab,
      `(() => document.querySelectorAll(".trove-library-inline-actions").length)();`,
      true,
      "__trove_probe_timeout__",
      { requireReady: false }
    );
    if (Number(actionCount) > 0) {
      return;
    }
    tab.scriptRecoveryKey = currentUrl;
    if (tab.id === state.activeTabId) {
      elements.pageStatus.textContent = "Recovering page";
      elements.pageKind.className = "page-kind";
      elements.pageKind.textContent = "The results page rendered without collection controls. Reloading it once to restore them.";
      setMessage("Reloading the results view to restore collection controls.");
    }
    try {
      tab.webview.reload();
      startWebviewLoadWatchdog(tab);
    } catch {
      void navigateExistingTab(tab, currentUrl);
    }
  }, 2200);
}

function bindWebview(tab) {
  tab.webview.addEventListener("console-message", (event) => {
    try {
      const inlinePrefix = "__trove_library_action__";
      const browserPrefix = "__trove_library_browser_action__";
      if (event.message.startsWith(inlinePrefix)) {
        const payload = JSON.parse(event.message.slice(inlinePrefix.length));
        void handleInlineAction(payload);
        return;
      }
      if (event.message.startsWith(browserPrefix)) {
        const payload = JSON.parse(event.message.slice(browserPrefix.length));
        if (payload?.action === "open-tab" && payload.url) {
          openTabFromPayload(payload);
        }
      }
    } catch {
      // Ignore malformed page messages.
    }
  });

  tab.webview.addEventListener("dom-ready", async () => {
    clearWebviewLoadWatchdog(tab);
    tab.didDomReady = true;
    installBrowserPageLinkInterceptors(tab);
    syncWebviewElementSize(tab);
    nudgeWebviewLayout(tab);
    dismissPageObstructions(tab);
    scheduleTabRefresh(tab, { delay: 0 });
  });

  tab.webview.addEventListener("page-title-updated", (event) => {
    tab.title = event.title || "Untitled";
    renderTabs();
  });

  tab.webview.addEventListener("did-start-loading", () => {
    tab.didDomReady = false;
    tab.loadingStartedAt = nowMs();
    scheduleSearchListLoadingSettle(tab);
    startWebviewLoadWatchdog(tab);
    updateNavigationButtons();
    invalidateTabCaches(tab);
    if (state.previewIntent?.tabId === tab.id) {
      clearPreviewIntent(state.previewIntent.token || "");
    }
    if (tab.id === state.activeTabId) {
      elements.pageStatus.textContent = "Loading";
      elements.pageKind.textContent = "Waiting for a supported collection page";
      if (!showStickyPreview()) {
        resetCapturePane("Loading page. The capture pane will update when the record or result preview is ready.", "Loading");
      }
    }
  });

  tab.webview.addEventListener("did-fail-load", (event) => {
    if (event.isMainFrame === false || Number(event.errorCode) === -3) {
      return;
    }
    clearWebviewLoadWatchdog(tab);
    clearListSettleTimer(tab);
    tab.didDomReady = false;
    updateNavigationButtons();
    if (tab.id !== state.activeTabId) {
      return;
    }
    const failureReason = isTransientNetworkError(event.errorDescription || event.errorCode)
      ? describeTransientNetworkError(event.errorDescription || event.errorCode)
      : `Page load failed: ${String(event.errorDescription || event.errorCode || "Unknown error")}`;
    elements.pageStatus.textContent = "Reload failed";
    elements.pageKind.className = "page-kind";
    elements.pageKind.textContent = failureReason;
    if (!showStickyPreview()) {
      clearPreviewState();
      resetCapturePane(failureReason, "Unavailable");
    }
    setMessage(failureReason);
  });

  const syncNavigation = async () => {
    clearWebviewLoadWatchdog(tab);
    const nextUrl = tab.webview.getURL();
    const urlChanged = nextUrl !== tab.url;
    tab.url = nextUrl;
    if (urlChanged) {
      invalidateTabCaches(tab);
      tab.scriptRecoveryKey = "";
      if (state.previewIntent?.tabId === tab.id) {
        clearPreviewIntent(state.previewIntent.token || "");
      }
    }
    if (tab.id === state.activeTabId) {
      elements.addressInput.value = tab.url;
    }
    renderTabs();
    updateNavigationButtons();
    if (tab.id === state.activeTabId && pageFindState.open && pageFindState.query) {
      updatePageFindUi();
      runPageFind({ findNext: false, forward: true });
    }
    syncWebviewElementSize(tab);
    nudgeWebviewLayout(tab);
    dismissPageObstructions(tab);
    try {
      const stillLoading = typeof tab.webview.isLoading === "function" && tab.webview.isLoading();
      if (!stillLoading) {
        tab.loadingStartedAt = 0;
      }
      if (isKnownSearchOrListUrl(tab.url) && stillLoading) {
        scheduleSearchListLoadingSettle(tab);
      } else {
        clearListSettleTimer(tab);
      }
    } catch {
      // Ignore transient webview state during navigation.
    }
    scheduleWebviewResponsivenessProbe(tab);
    scheduleSearchInlineActionProbe(tab);
    if (isKnownSearchOrListUrl(tab.url)) {
      scheduleTabRefresh(tab, { delay: 90 });
      for (const delay of [900, 2200, 5000]) {
        const expectedUrl = tab.url;
        setTimeout(async () => {
          if (!tab.webview?.isConnected || tab.url !== expectedUrl) {
            return;
          }
          try {
            await applyProjectDecorations();
            if (tab.id === state.activeTabId) {
              await updateCaptureState();
            }
          } catch (error) {
            console.error("Search/list decoration refresh failed.", error);
          }
        }, delay);
      }
    } else {
      scheduleTabRefresh(tab, { delay: 90 });
    }
  };

  tab.webview.addEventListener("did-stop-loading", syncNavigation);
  tab.webview.addEventListener("did-navigate", syncNavigation);
  tab.webview.addEventListener("did-navigate-in-page", syncNavigation);
  tab.webview.addEventListener("found-in-page", (event) => {
    if (tab.id !== state.activeTabId || !pageFindState.open) {
      return;
    }
    pageFindState.matches = Number(event.result?.matches) || 0;
    pageFindState.activeMatchOrdinal = Number(event.result?.activeMatchOrdinal) || 0;
    updatePageFindUi();
  });

  tab.webview.addEventListener("new-window", (event) => {
    event.preventDefault();
    openTabFromPayload({
      url: event.url,
      activate: event.disposition === "foreground-tab" || event.disposition === "new-window"
    });
  });
}

function renderTabs(options = {}) {
  const { revealActive = false } = options;
  const previousScrollLeft = elements.tabs.scrollLeft;
  elements.tabs.hidden = state.tabs.length <= 1;
  elements.tabs.innerHTML = "";
  let activeButton = null;
  const project = getActiveProject();
  for (const tab of state.tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab";
    button.classList.toggle("is-active", tab.id === state.activeTabId);
    button.classList.toggle("is-deferred", Boolean(tab.deferredUrl));
    const tabStatus = getTabItemStatus(tab, project);
    button.classList.toggle("is-saved", tabStatus === "saved");
    button.classList.toggle("is-ignored", tabStatus === "ignored");
    if (tab.id === state.activeTabId) {
      activeButton = button;
    }

    const main = document.createElement("span");
    main.className = "tab-main";

    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = tab.title || getTabFallbackTitle(tab.url) || "New tab";
    main.append(label);

    if (tab.deferredUrl) {
      const badge = document.createElement("span");
      badge.className = "tab-badge";
      badge.textContent = "Queued";
      main.append(badge);
    }

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "tab-close";
    closeButton.textContent = "×";
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    });

    button.append(main, closeButton);
    button.addEventListener("click", () => setActiveTab(tab.id));
    elements.tabs.append(button);
  }
  requestAnimationFrame(() => {
    elements.tabs.scrollLeft = previousScrollLeft;
    if (revealActive) {
      activeButton?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
}

function bindTabScroller() {
  elements.tabs.addEventListener(
    "wheel",
    (event) => {
      if (elements.tabs.hidden || elements.tabs.scrollWidth <= elements.tabs.clientWidth + 1) {
        return;
      }
      const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!dominantDelta) {
        return;
      }
      event.preventDefault();
      elements.tabs.scrollBy({
        left: dominantDelta,
        behavior: "auto"
      });
    },
    { passive: false }
  );
}

function bindSidebarResizer() {
  const minWidth = 280;
  const maxWidth = 640;
  let activePointerId = null;
  let frame = 0;
  let pendingWidth = 0;

  const applyPendingWidth = () => {
    frame = 0;
    if (!pendingWidth) {
      return;
    }
    state.sidebarWidth = pendingWidth;
    applySidebarWidth();
    syncWebviewElementSize();
  };

  const onPointerMove = (event) => {
    if (activePointerId !== event.pointerId) {
      return;
    }
    const shellRect = document.querySelector(".app-shell")?.getBoundingClientRect();
    if (!shellRect) {
      return;
    }
    pendingWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(event.clientX - shellRect.left - 12)));
    if (!frame) {
      frame = window.requestAnimationFrame(applyPendingWidth);
    }
  };

  const stopDrag = () => {
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    if (pendingWidth) {
      state.sidebarWidth = pendingWidth;
      applySidebarWidth();
      syncWebviewElementSize();
      pendingWidth = 0;
    }
    document.body.classList.remove("is-resizing-sidebar");
    elements.sidebarResizer.classList.remove("is-dragging");
    if (activePointerId !== null) {
      try {
        elements.sidebarResizer.releasePointerCapture(activePointerId);
      } catch {
        // Ignore browsers that already released the capture.
      }
    }
    activePointerId = null;
  };

  elements.sidebarResizer.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    activePointerId = event.pointerId;
    pendingWidth = 0;
    document.body.classList.add("is-resizing-sidebar");
    elements.sidebarResizer.classList.add("is-dragging");
    elements.sidebarResizer.setPointerCapture(event.pointerId);
  });
  elements.sidebarResizer.addEventListener("pointermove", onPointerMove);
  elements.sidebarResizer.addEventListener("pointerup", stopDrag);
  elements.sidebarResizer.addEventListener("pointercancel", stopDrag);
  elements.sidebarResizer.addEventListener("lostpointercapture", stopDrag);
}

function renderSources() {
  elements.sourceList.innerHTML = "";
  if (elements.pluginsSupported) {
    elements.pluginsSupported.innerHTML = "";
  }

  for (const plugin of state.plugins) {
    const article = document.createElement("article");
    article.className = "source-card";

    const heading = document.createElement("div");
    heading.className = "source-card-head";
    heading.innerHTML = `<strong>${plugin.label}</strong><span class="section-count">Built in</span>`;

    const copy = document.createElement("p");
    copy.className = "message-text";
    copy.textContent = plugin.description;

    const meta = document.createElement("p");
    meta.className = "source-domains";
    meta.textContent = plugin.domains.join(" · ");

    const actions = document.createElement("div");
    actions.className = "source-card-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-button source-open";
    button.textContent = `Open ${plugin.label}`;
    button.addEventListener("click", () => {
      setMode("collect");
      const activeTab = getActiveTab();
      if (activeTab) {
        void navigateExistingTab(activeTab, plugin.browseUrl);
      } else {
        createTab(plugin.browseUrl);
      }
    });

    actions.append(button);
    if (plugin.id === "trove" || plugin.id === "slwa") {
      const pasteButton = document.createElement("button");
      pasteButton.type = "button";
      pasteButton.className = "ghost-button source-open";
      pasteButton.textContent = "Paste Links";
      pasteButton.addEventListener("click", () => {
        openTroveLinkDialog(plugin.id);
      });
      actions.append(pasteButton);
    }

    article.append(heading, copy, meta, actions);
    elements.sourceList.append(article);

    if (elements.pluginsSupported) {
      const pluginCard = document.createElement("article");
      pluginCard.className = "plugin-source-card plugin-source-card-compact";
      pluginCard.innerHTML = `
        <div class="plugin-source-top">
          <div>
            <strong>${plugin.label}</strong>
            <div class="plugin-source-meta">${plugin.domains.join(" · ")}</div>
          </div>
          <span class="source-badge">Built in</span>
        </div>
      `;
      const browseButton = document.createElement("button");
      browseButton.type = "button";
      browseButton.className = "ghost-button";
      browseButton.textContent = "Browse";
      browseButton.addEventListener("click", () => {
      setMode("collect");
      const activeTab = getActiveTab();
      if (activeTab) {
          void navigateExistingTab(activeTab, plugin.browseUrl);
        } else {
          createTab(plugin.browseUrl);
        }
      });
      pluginCard.append(browseButton);
      elements.pluginsSupported.append(pluginCard);
    }
  }
}

function renderProjects() {
  const activeProject = getActiveProject();
  elements.projectCount.textContent = String(state.projects.length);
  elements.projectList.innerHTML = "";

  if (!state.projects.length) {
    elements.projectList.innerHTML = '<div class="empty-state">No libraries found yet.</div>';
    return;
  }

  for (const project of state.projects) {
    const fragment = elements.projectCardTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".project-card");
    const textCount = project.counts.texts || project.counts.newspapers || 0;
    const imageCount = project.counts.images || 0;
    button.classList.toggle("is-active", activeProject?.path === project.path);
    fragment.querySelector(".project-name").textContent = project.folderName;
    fragment.querySelector(".project-meta").textContent = `${textCount} articles · ${imageCount} images`;
    button.title = "Click to open. Right-click for folder, terminal, and close actions.";
    button.addEventListener("click", async () => {
      closeProjectContextMenu();
      state.activeProjectPath = project.path;
      await refreshProjectSearches(project);
      renderProjects();
      renderProjectDetails();
      renderSavedSearches();
      renderSavedSearchMenu();
      renderManageList();
      await applyProjectDecorations();
      await updateCaptureState();
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openProjectContextMenu(event.clientX, event.clientY, project.path, button);
    });
    elements.projectList.append(fragment);
  }
}

function renderProjectDetails() {
  const project = getActiveProject();
  elements.openProjectFolder.disabled = !project;
  elements.openProjectTerminal.disabled = !project;
  elements.closeProjectButton.disabled = !project;

  if (!project) {
    elements.projectDetails.className = "project-details empty-state";
    elements.projectDetails.textContent = "Create or select a project to start filing articles and images.";
    return;
  }

  if (state.mode === "collect") {
    elements.projectDetails.className = "project-details project-details-compact";
    elements.projectDetails.innerHTML = `
      <div>
        <strong>${project.folderName}</strong>
      </div>
    `;
    return;
  }

  const textCount = project.counts.texts || project.counts.newspapers || 0;
  const imageCount = project.counts.images || 0;
  const ignoredCount = project.ignoredCount || 0;
  const uncollectedCount = project.uncollectedCount || 0;
  const summaryParts = [
    `${textCount} article${textCount === 1 ? "" : "s"}`,
    `${imageCount} image${imageCount === 1 ? "" : "s"}`
  ];
  if (ignoredCount) {
    summaryParts.push(`${ignoredCount} ignored`);
  }
  if (uncollectedCount) {
    summaryParts.push(`${uncollectedCount} uncollected`);
  }

  elements.projectDetails.className = "project-details";
  elements.projectDetails.innerHTML = `
    <div>
      <strong>${project.folderName}</strong>
    </div>
    <div class="message-text">${summaryParts.join(" · ")}</div>
    <div class="message-text">Updated ${formatDate(project.updatedAt)}</div>
  `;
}


function closeProjectContextMenu() {
  elements.projectContextMenu.hidden = true;
  state.projectContextPath = "";
  document.querySelector(".project-card.is-context-target")?.classList.remove("is-context-target");
}

function openProjectContextMenu(x, y, projectPath, targetButton) {
  state.projectContextPath = projectPath;
  document.querySelector(".project-card.is-context-target")?.classList.remove("is-context-target");
  targetButton.classList.add("is-context-target");
  elements.projectContextMenu.hidden = false;
  const maxLeft = window.innerWidth - elements.projectContextMenu.offsetWidth - 12;
  const maxTop = window.innerHeight - elements.projectContextMenu.offsetHeight - 12;
  elements.projectContextMenu.style.left = `${Math.max(12, Math.min(x, maxLeft))}px`;
  elements.projectContextMenu.style.top = `${Math.max(12, Math.min(y, maxTop))}px`;
}

async function hideProjectFromPane(projectPath = state.projectContextPath) {
  if (!projectPath) {
    return;
  }

  const project = state.projects.find((entry) => entry.path === projectPath);
  await window.troveApi.hideProject(projectPath);
  closeProjectContextMenu();
  const nextPreferredPath = state.activeProjectPath === projectPath ? null : state.activeProjectPath;
  await refreshProjects(nextPreferredPath);
  setMode("manage");
  setMessage(`Closed ${project?.name || "library"} from the sidebar. Use Open Existing to bring it back.`);
}

function getProjectInventory(project) {
  if (!project) {
    return [];
  }

  const saved = (project.saved || []).map((item) => ({ ...item, status: "saved", timestamp: item.savedAt || "" }));
  const ignored = (project.ignored || []).map((item) => ({ ...item, status: "ignored", timestamp: item.ignoredAt || "" }));
  const uncollected = (project.uncollected || []).map((item) => ({
    ...item,
    status: "uncollected",
    timestamp: item.uncollectedAt || ""
  }));
  return [...saved, ...ignored, ...uncollected].sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
}

async function renderManageList() {
  const project = getActiveProject();
  const renderToken = ++state.manageRenderToken;
  elements.openItemsCsv.disabled = !project;

  if (!project) {
    elements.manageSummary.textContent = "0 items";
    elements.manageList.className = "manage-list empty-state";
    elements.manageList.textContent = "Select a project to manage its collected items.";
    return;
  }

  const inventory = getProjectInventory(project).filter((item) => {
    if (state.manageFilter === "all") {
      return true;
    }
    return item.status === state.manageFilter;
  }).filter((item) => {
    const query = state.manageQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    const haystack = [
      item.title,
      item.url,
      item.sourceLabel,
      item.source,
      item.type,
      summarizeNativeRecord(item)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
  const forceCompactLayout = inventory.length > 120 && state.manageLayout === "cards";
  const effectiveManageLayout = forceCompactLayout ? "compact" : state.manageLayout;

  elements.filterAll.classList.toggle("is-active", state.manageFilter === "all");
  elements.filterSaved.classList.toggle("is-active", state.manageFilter === "saved");
  elements.filterIgnored.classList.toggle("is-active", state.manageFilter === "ignored");
  elements.filterUncollected.classList.toggle("is-active", state.manageFilter === "uncollected");
  elements.layoutCards?.classList.toggle("is-active", effectiveManageLayout === "cards");
  elements.layoutCompact?.classList.toggle("is-active", effectiveManageLayout === "compact");
  if (elements.layoutCards) {
    elements.layoutCards.disabled = forceCompactLayout;
    elements.layoutCards.title = forceCompactLayout
      ? "Large filters use Compact layout to keep the library responsive."
      : "";
  }
  if (elements.manageSearch && elements.manageSearch.value !== state.manageQuery) {
    elements.manageSearch.value = state.manageQuery;
  }
  elements.manageSummary.textContent = `${inventory.length} item${inventory.length === 1 ? "" : "s"}${
    forceCompactLayout ? " · compact" : ""
  }`;
  elements.manageList.innerHTML = "";

  if (!inventory.length) {
    state.manageExpandedKey = "";
    elements.manageList.className = "manage-list empty-state";
    elements.manageList.textContent = "No items in this filter yet.";
    return;
  }

  elements.manageList.className = `manage-list${effectiveManageLayout === "compact" ? " is-compact" : ""}`;
  if (effectiveManageLayout === "compact") {
    await renderManageCompactList(project, inventory, renderToken);
    return;
  }

  for (const item of inventory) {
    const fragment = elements.manageItemTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".manage-item");
    card.classList.toggle("is-ignored", item.status === "ignored");
    card.classList.toggle("is-uncollected", item.status === "uncollected");
    card.classList.toggle("is-compact", state.manageLayout === "compact");
    bindManageCardActions(card, project, item);
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      void openItemInApp(item);
    });
    elements.manageList.append(fragment);
    void populateManageCard(card, project, item, renderToken);
  }
}

function updateNavigationButtons() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    elements.backButton.disabled = true;
    elements.forwardButton.disabled = true;
    elements.reloadButton.disabled = true;
    elements.saveSearchButton.disabled = true;
    return;
  }

  const connected = Boolean(activeTab.webview?.isConnected);
  elements.backButton.disabled = !connected;
  elements.forwardButton.disabled = !connected;
  elements.reloadButton.disabled = !connected;
  elements.saveSearchButton.disabled =
    !getActiveProject() || !ensureUrl(activeTab.url || "") || isCurrentPageAlreadySavedSearch();
}

async function applyProjectDecorations() {
  const activeTab = getActiveTab();
  if (!isWebviewReady(activeTab)) {
    return;
  }

  try {
    const project = getActiveProject();
    const signature = getDecorationSignature(activeTab, project);
    if (activeTab.decorationSignature === signature) {
      return;
    }
    const payload = sourceRegistry.projectStatePayload(project);
    const ran = await safeExecuteJavaScript(activeTab, sourceRegistry.buildDecorationScript(payload), true, null);
    if (ran !== null) {
      activeTab.decorationSignature = signature;
    }
  } catch {
    // Ignore pages that reject script execution during navigation.
  }
}

async function extractItemFromWebview(webview, cacheTarget = null) {
  if (!webview?.isConnected) {
    return { supported: false, reason: "Wait for the page to attach and load." };
  }

  if (cacheTarget?.extractionPromise) {
    return cacheTarget.extractionPromise;
  }

  let extractionPromise = null;
  extractionPromise = (async () => {
    const token = crypto.randomUUID();
    if (cacheTarget) {
      cacheTarget.extractionToken = token;
    }

    const startedAt = Date.now();
    const timeoutMs = 10000;
    let lastUnsupported = { supported: false, reason: "Waiting for the collection page to finish loading." };
    let lastSupported = null;

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const result = await safeExecuteJavaScript(
          webview,
          sourceRegistry.buildExtractionScript(),
          true,
          null,
          { requireReady: false }
        );
        if (result?.supported) {
          lastSupported = result;
          if (!isStableExtractedItem(result)) {
            lastUnsupported = {
              supported: false,
              reason: "Waiting for the record details to finish loading."
            };
            await new Promise((resolve) => setTimeout(resolve, 350));
            continue;
          }
          if (cacheTarget && cacheTarget.extractionToken === token) {
            cacheTarget.lastItem = {
              url: cacheTarget.url,
              result
            };
          }
          return result;
        }
        lastUnsupported = result || lastUnsupported;
      } catch {
        lastUnsupported = { supported: false, reason: "This page is still loading." };
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    return lastSupported || lastUnsupported;
  })();

  if (cacheTarget) {
    cacheTarget.extractionPromise = extractionPromise;
  }

  try {
    return await extractionPromise;
  } finally {
    if (cacheTarget?.extractionPromise === extractionPromise) {
      cacheTarget.extractionPromise = null;
    }
  }
}

async function extractCurrentItem() {
  const activeTab = getActiveTab();
  if (!isWebviewReady(activeTab)) {
    return { supported: false, reason: "Wait for the page to finish loading." };
  }

  if (activeTab.lastItem && activeTab.lastItem.url === activeTab.url) {
    return activeTab.lastItem.result;
  }

  const extracted = await extractItemFromWebview(activeTab.webview, activeTab);
  if (
    !extracted?.supported &&
    /https?:\/\/purl\.slwa\.wa\.gov\.au\/download\/slwa_[a-z0-9_]+\.(jpg|jpeg|png|tif|tiff|webp)(\?[^#]*)?$/i.test(activeTab.url || "")
  ) {
    return fetchItemByUrl(activeTab.url, { force: true, timeoutMs: CAPTURE_FETCH_TIMEOUT_MS });
  }
  return extracted;
}

async function fetchItemByUrl(url, options = {}) {
  const mode = options.mode || "full";
  const normalizedUrl = ensureUrl(url);
  const cacheKey = getBackgroundFetchCacheKey(normalizedUrl, mode);
  if (!options.force) {
    const cached = getCachedFetchedItem(normalizedUrl, mode);
    if (cached) {
      return cached;
    }
  }
  if (!options.force && backgroundFetchPendingCache.has(cacheKey)) {
    return withFetchTimeout(
      backgroundFetchPendingCache.get(cacheKey),
      Number(options.timeoutMs || (mode === "preview" ? PREVIEW_FETCH_TIMEOUT_MS : 0))
    );
  }

  const pending = window.troveApi.fetchItemByUrl(normalizedUrl, options);
  const timeoutMs = Number(options.timeoutMs || (mode === "preview" ? PREVIEW_FETCH_TIMEOUT_MS : 0));
  const pendingWithTimeout = withFetchTimeout(pending, timeoutMs);
  backgroundFetchPendingCache.set(cacheKey, pending);

  try {
    const item = await pendingWithTimeout;
    if (item?.supported) {
      cacheFetchedItem(normalizedUrl, mode, item);
    }
    return item;
  } catch (error) {
    if (isTransientNetworkError(error)) {
      return buildTransientFetchFailure(normalizedUrl, error);
    }
    throw error;
  } finally {
    if (backgroundFetchPendingCache.get(cacheKey) === pending) {
      backgroundFetchPendingCache.delete(cacheKey);
    }
  }
}

async function resolveSlwaBridgeUrlFromWebview(webview) {
  if (!webview?.isConnected) {
    return "";
  }

  const script = `
    (() => {
      try {
        const dismissModal = () => {
          const modal = document.querySelector("#culturalModal");
          if (!modal) {
            return;
          }
          const closeButton =
            modal.querySelector("button.close, .close, [data-dismiss='modal'], .btn-primary, button, a");
          try {
            closeButton?.click?.();
          } catch {
            // Ignore site-specific click failures.
          }
        };
        dismissModal();
        const locateButton = document.querySelector("button.work-actions-borrow");
        try {
          locateButton?.click?.();
        } catch {
          // Ignore site-specific click failures.
        }
        const holdingLink = Array.from(document.querySelectorAll("a[href]")).find((anchor) =>
          /purl\\.slwa\\.wa\\.gov\\.au|catalogue\\.slwa\\.wa\\.gov\\.au/i.test(anchor.href)
        );
        return holdingLink?.href || "";
      } catch {
        return "";
      }
    })();
  `;

  return safeExecuteJavaScript(webview, script, true, "");
}

async function maybeBridgeCurrentPageItem(item, activeTab) {
  if (!item?.supported || item.source !== "trove" || !/\/work\/\d+/i.test(item.url || activeTab?.url || "")) {
    return item;
  }

  try {
    const bridgedFromBackground = await fetchItemByUrl(item.url || activeTab?.url || "", {
      mode: "preview"
    });
    if (bridgedFromBackground?.supported && bridgedFromBackground.source === "slwa") {
      bridgedFromBackground.aliases = [
        ...new Set([...(bridgedFromBackground.aliases || []), item.url, ...(item.aliases || [])])
      ];
      bridgedFromBackground.bridgedFrom = {
        source: item.source,
        url: item.url
      };
      return bridgedFromBackground;
    }
  } catch {
    // Fall back to the live in-page bridge below.
  }

  const bridgeUrl = await resolveSlwaBridgeUrlFromWebview(activeTab?.webview);
  if (!bridgeUrl) {
    return item;
  }

  let bridged = await fetchItemByUrl(bridgeUrl, { mode: "preview" });
  if (!bridged?.supported) {
    bridged = await fetchItemByUrl(bridgeUrl, { force: true, mode: "preview" });
  }
  if (!bridged?.supported) {
    return item;
  }

  bridged.aliases = [...new Set([...(bridged.aliases || []), item.url, ...(item.aliases || []), bridgeUrl])];
  bridged.bridgedFrom = {
    source: item.source,
    url: item.url
  };
  return bridged;
}

async function maybeHydrateSlwaCurrentPageItem(item) {
  if (!item?.supported || item.source !== "slwa") {
    return item;
  }
  const attachments = getItemAttachments(item);
  const needsHydration =
    Boolean(item.viewAllUrl) ||
    (Array.isArray(item.viewerUrls) && item.viewerUrls.length > 1) ||
    /encore\.slwa\.wa\.gov\.au\/iii\/encore\/record\//i.test(item.url || "") ||
    attachments.some((entry) => entry.imageUrl && !hasFullResolutionImage(entry));
  if (!needsHydration) {
    return item;
  }
  let hydrated = await fetchItemByUrl(item.viewAllUrl || item.url, { mode: "preview" });
  if (!hydrated?.supported) {
    hydrated = await fetchItemByUrl(item.viewAllUrl || item.url, { force: true, mode: "preview" });
  }
  if (!hydrated?.supported) {
    return item;
  }
  hydrated.aliases = [...new Set([...(hydrated.aliases || []), item.url, ...(item.aliases || [])])];
  return hydrated;
}

async function showCaptureItem(item, origin = "page", context = getCaptureContext(), requestId = 0) {
  const markdown =
    requestId
      ? await withFetchTimeout(
          buildPreviewMarkdownCached(item),
          origin === "link" ? PREVIEW_FETCH_TIMEOUT_MS : CAPTURE_FETCH_TIMEOUT_MS
        )
      : await buildPreviewMarkdownCached(item);
  if (requestId && requestId !== state.captureRequestId) {
    return false;
  }
  if (!hasRenderablePreviewContent(item, markdown)) {
    return false;
  }
  setPreviewState(item, markdown, origin, context);
  renderCapturePane(item, markdown, { origin });
  void warmCollectableItem(item);
  return true;
}

function clearActivePreviewLoading(token, item, context) {
  if (activePreviewLoading?.token === token) {
    activePreviewLoading = null;
  }
  void applyImmediatePageLoading(item, "preview", false, "", context, token);
}

function queuePreviewItemFromUrl(url) {
  const normalizedUrl = ensureUrl(url);
  if (!normalizedUrl) {
    return;
  }
  const placeholder = { url: normalizedUrl, aliases: [normalizedUrl] };
  const context = getCaptureContext();
  const requestId = ++state.captureRequestId;
  const previewToken = `preview-${requestId}`;

  if (previewClickTimer) {
    clearTimeout(previewClickTimer);
    previewClickTimer = null;
  }
  if (activePreviewLoading?.token && activePreviewLoading.token !== previewToken) {
    clearActivePreviewLoading(activePreviewLoading.token, activePreviewLoading.item, activePreviewLoading.context);
  }

  state.previewActionId = previewToken;
  beginPreviewIntent("link", context, previewToken);
  activePreviewLoading = { item: placeholder, context, token: previewToken };
  void applyImmediatePageLoading(placeholder, "preview", true, "", context, previewToken);
  setMessage("Loading preview…");
  if (!hasStickyPreview()) {
    resetCapturePane("Loading preview.", "Loading");
  }
  setCaptureBusy("preview", true, placeholder, "Loading preview", previewToken);

  pendingPreviewRequest = { url: normalizedUrl, context, requestId, token: previewToken, placeholder };
  previewClickTimer = setTimeout(() => {
    const request = pendingPreviewRequest;
    pendingPreviewRequest = null;
    previewClickTimer = null;
    if (request && state.previewActionId === request.token && request.requestId === state.captureRequestId) {
      void runPreviewItemFromUrl(request);
    }
  }, PREVIEW_CLICK_DEBOUNCE_MS);
}

async function runPreviewItemFromUrl(request) {
  const { url, context, requestId, token: previewToken, placeholder } = request;
  try {
    const item = await fetchItemByUrl(url, { mode: "preview", timeoutMs: PREVIEW_FETCH_TIMEOUT_MS });
    if (requestId !== state.captureRequestId || state.previewActionId !== previewToken) {
      return;
    }
    if (!item?.supported) {
      if (!showStickyPreview()) {
        clearPreviewState();
        resetCapturePane(item?.reason || "Could not build a preview for that link.");
      }
      setMessage(item?.reason || "Could not build a preview for that link.");
      return;
    }
    const clickedUrl = ensureUrl(url);
    const itemWithClickedAlias = {
      ...item,
      aliases: [...new Set([clickedUrl, item.url, ...(item.aliases || [])].filter(Boolean))]
    };
    const rendered = await showCaptureItem(itemWithClickedAlias, "link", context, requestId);
    if (!rendered || requestId !== state.captureRequestId || state.previewActionId !== previewToken) {
      return;
    }
    elements.pageStatus.textContent = itemWithClickedAlias.title || "Preview";
    elements.pageKind.className = "page-kind";
    elements.pageKind.textContent = `${itemWithClickedAlias.sourceLabel || "Source"} · ${formatItemType(itemWithClickedAlias.type)}`;
    setMessage(`Previewing ${itemWithClickedAlias.title}.`);
  } catch (error) {
    if (requestId !== state.captureRequestId || state.previewActionId !== previewToken) {
      return;
    }
    const message =
      error?.code === "PREVIEW_TIMEOUT"
        ? "Preview is taking too long. Try again when the source responds."
        : error?.message || "Could not build a preview for that link.";
    if (!showStickyPreview()) {
      clearPreviewState();
      resetCapturePane(message);
    }
    setMessage(message);
  } finally {
    if (state.previewActionId === previewToken) {
      state.previewActionId = "";
      clearPreviewIntent(previewToken);
      setCaptureBusy("", false, null, "", previewToken);
      clearActivePreviewLoading(previewToken, placeholder, context);
    } else if (activePreviewLoading?.token === previewToken) {
      clearActivePreviewLoading(previewToken, placeholder, context);
    }
  }
}

async function collectItem(item, projectPath = getActiveProject()?.path, busyToken = "", context = null) {
  if (!projectPath) {
    setMessage("Select a project before collecting.");
    return;
  }
  try {
    const startedAt = nowMs();
    const savableItem = await ensureCollectableItem(item);
    recordPerfEvent("collect.item.ready", {
      token: busyToken,
      title: savableItem?.title || item?.title || "",
      hydrateMs: Math.round(nowMs() - startedAt)
    });
    await window.troveApi.saveItem(projectPath, savableItem);
    recordPerfEvent("collect.item.saved", {
      token: busyToken,
      title: savableItem?.title || "",
      totalMs: Math.round(nowMs() - startedAt)
    });
    const superseded = hasSupersedingQueuedAction(projectPath, savableItem);
    if (!superseded && isCaptureContextCurrent(context) && itemsReferToSameRecord(getDisplayedItem(), savableItem)) {
      setPreviewStatusOverride("saved", projectPath);
      previewState.item = savableItem;
      renderCapturePane(getDisplayedItem() || savableItem, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: "saved"
      });
    }
    if (!superseded) {
      await applyImmediatePageFeedback(savableItem, "saved", context);
    }
    if (!superseded && isCaptureContextCurrent(context)) {
      setMessage(`Collected ${savableItem.title}.`);
    }
    const activeTab = getActiveTab();
    if (activeTab) {
      activeTab.lastItem = null;
    }
    if (busyToken) {
      queueRefreshProjects(projectPath, { skipCapture: true });
    } else {
      await refreshProjects(getPreferredRefreshProjectPath(projectPath), { skipCapture: true });
    }
  } finally {
    state.saveProgress = null;
    renderQueueTray();
    if (!busyToken) {
      setCaptureBusy("", false, null, "", busyToken);
    }
    await applyImmediatePageLoading(item, "collect", false, "", context);
    if (!hasSupersedingQueuedAction(projectPath, item) && isCaptureContextCurrent(context) && getDisplayedItem()) {
      renderCapturePane(getDisplayedItem(), getDisplayedMarkdown(), { origin: previewState.origin });
    }
  }
}

async function uncollectItem(item, projectPath = getActiveProject()?.path, options = {}) {
  if (!projectPath) {
    setMessage("Select a project before removing collected items.");
    return;
  }
  const confirmed =
    options.skipConfirm ||
    window.confirm(`Delete this collected record from the library?\n\n${item.title}`);
  if (!confirmed) {
    return;
  }
  try {
    await window.troveApi.uncollectItem(projectPath, item);
    const superseded = hasSupersedingQueuedAction(projectPath, item);
    if (!superseded && isCaptureContextCurrent(options.context) && itemsReferToSameRecord(getDisplayedItem(), item)) {
      setPreviewStatusOverride("", projectPath);
      renderCapturePane(getDisplayedItem() || item, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: ""
      });
    }
    if (!superseded) {
      await applyImmediatePageFeedback(item, "", options.context);
    }
    if (!superseded && isCaptureContextCurrent(options.context)) {
      setMessage(`Removed ${item.title} from the library.`);
    }
    const activeTab = getActiveTab();
    if (activeTab) {
      activeTab.lastItem = null;
    }
    if (options.busyToken) {
      queueRefreshProjects(projectPath, { skipCapture: true });
    } else {
      await refreshProjects(getPreferredRefreshProjectPath(projectPath), { skipCapture: true });
    }
  } finally {
    if (!options.busyToken) {
      setCaptureBusy("", false, null, "", "");
    }
    await applyImmediatePageLoading(item, "uncollect", false, "", options.context);
  }
}

async function unignoreItem(item, projectPath = getActiveProject()?.path, busyToken = "", context = null) {
  if (!projectPath) {
    setMessage("Select a project before changing ignored items.");
    return;
  }
  try {
    await window.troveApi.unignoreItem(projectPath, item);
    const superseded = hasSupersedingQueuedAction(projectPath, item);
    if (!superseded && isCaptureContextCurrent(context) && itemsReferToSameRecord(getDisplayedItem(), item)) {
      setPreviewStatusOverride("", projectPath);
      renderCapturePane(getDisplayedItem() || item, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: ""
      });
    }
    if (!superseded) {
      await applyImmediatePageFeedback(item, "", context);
    }
    if (!superseded && isCaptureContextCurrent(context)) {
      setMessage(`Unignored ${item.title}.`);
    }
    const activeTab = getActiveTab();
    if (activeTab) {
      activeTab.lastItem = null;
    }
    if (busyToken) {
      queueRefreshProjects(projectPath, { skipCapture: true });
    } else {
      await refreshProjects(getPreferredRefreshProjectPath(projectPath), { skipCapture: true });
    }
  } finally {
    if (!busyToken) {
      setCaptureBusy("", false, null, "", busyToken);
    }
    await applyImmediatePageLoading(item, "unignore", false, "", context);
  }
}

async function ignoreItemInProject(item, projectPath = getActiveProject()?.path, busyToken = "", context = null) {
  if (!projectPath) {
    setMessage("Select a project before ignoring items.");
    return;
  }
  try {
    await window.troveApi.ignoreItem(projectPath, item);
    const superseded = hasSupersedingQueuedAction(projectPath, item);
    if (!superseded && isCaptureContextCurrent(context) && itemsReferToSameRecord(getDisplayedItem(), item)) {
      setPreviewStatusOverride("ignored", projectPath);
      renderCapturePane(getDisplayedItem() || item, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: "ignored"
      });
    }
    if (!superseded) {
      await applyImmediatePageFeedback(item, "ignored", context);
    }
    if (!superseded && isCaptureContextCurrent(context)) {
      setMessage(`Ignored ${item.title}.`);
    }
    const activeTab = getActiveTab();
    if (activeTab) {
      activeTab.lastItem = null;
    }
    if (busyToken) {
      queueRefreshProjects(projectPath, { skipCapture: true });
    } else {
      await refreshProjects(getPreferredRefreshProjectPath(projectPath), { skipCapture: true });
    }
  } finally {
    if (!busyToken) {
      setCaptureBusy("", false, null, "", busyToken);
    }
    await applyImmediatePageLoading(item, "ignore", false, "", context);
  }
}

async function ensureCollectableItem(item) {
  if (!item?.supported || item.source !== "slwa" || item.type !== "image") {
    return item;
  }
  const attachments = getItemAttachments(item);
  const needsFullFetch =
    attachments.length > 1 ||
    Boolean(item.viewAllUrl) ||
    attachments.some((entry) => !hasFullResolutionImage(entry));
  if (!needsFullFetch) {
    return item;
  }
  const targetUrl = item.viewAllUrl || item.url;
  const fullItem = await fetchItemByUrl(targetUrl, { mode: "full" });
  if (fullItem?.supported) {
    return fullItem;
  }
  const forcedFullItem = await fetchItemByUrl(targetUrl, { force: true, mode: "full" });
  return forcedFullItem?.supported ? forcedFullItem : item;
}

function needsCollectWarmup(item) {
  if (!item?.supported || item.source !== "slwa" || item.type !== "image") {
    return false;
  }
  const attachments = getItemAttachments(item);
  return (
    attachments.length > 1 ||
    Boolean(item.viewAllUrl) ||
    attachments.some((entry) => !hasFullResolutionImage(entry))
  );
}

async function warmCollectableItem(item) {
  if (!needsCollectWarmup(item)) {
    return;
  }
  const targetUrl = item.viewAllUrl || item.url;
  if (!targetUrl) {
    return;
  }
  try {
    await fetchItemByUrl(targetUrl, { mode: "full" });
  } catch {
    // Best-effort warmup only. Collection still does its own checked fetch.
  }
}

async function hydratePreviewAttachmentAtIndex(index) {
  const item = getDisplayedItem();
  if (!item?.supported || item.source !== "slwa" || item.type !== "image") {
    return;
  }
  const attachments = getItemAttachments(item);
  const target = attachments[index];
  if (!target?.viewerUrl || hasFullResolutionImage(target)) {
    return;
  }
  const hydratedItem = await fetchItemByUrl(target.viewerUrl, { force: true, mode: "single" });
  const hydratedAttachment = getItemAttachments(hydratedItem)[0];
  if (!hydratedAttachment?.imageUrl) {
    return;
  }
  const nextAttachments = attachments.map((entry, entryIndex) =>
    entryIndex === index
      ? {
          ...entry,
          ...hydratedAttachment,
          thumbnailUrl: entry.thumbnailUrl || hydratedAttachment.thumbnailUrl || hydratedAttachment.imageUrl
        }
      : entry
  );
  previewState.item = {
    ...item,
    attachments: nextAttachments,
    imageUrl: index === 0 ? hydratedAttachment.imageUrl : item.imageUrl,
    imageUrls: nextAttachments.map((entry) => entry.imageUrl || entry.thumbnailUrl).filter(Boolean),
    viewerUrls: nextAttachments.map((entry) => entry.viewerUrl).filter(Boolean)
  };
}

async function collectItemFromUrl(url) {
  const project = getActiveProject();
  if (!project) {
    setMessage("Select a project before collecting.");
    return;
  }
  const normalizedUrl = ensureUrl(url);
  const status = getEffectiveItemStatus(project, { url: normalizedUrl, aliases: [normalizedUrl] });
  const action = status === "saved" ? "uncollect" : "collect";
  if (action === "uncollect") {
    const confirmed = window.confirm("Are you sure you want to uncollect this item?");
    if (!confirmed) {
      return;
    }
  }
  const cachedItem = action === "collect" ? getCachedFetchedItem(normalizedUrl, "preview") : null;
  const queued = queueProjectAction(action, project.path, cachedItem || normalizedUrl, { source: "inline" });
  if (queued) {
    setMessage(`${describeBusyAction(action)} queued.`);
  }
}

async function toggleIgnoreItemFromUrl(url, label = "") {
  const project = getActiveProject();
  if (!project) {
    setMessage("Select a project before ignoring items.");
    return;
  }
  const normalizedUrl = ensureUrl(url);
  const status = getEffectiveItemStatus(project, { url: normalizedUrl, aliases: [normalizedUrl] });
  if (status === "saved") {
    setMessage("Collected items must be uncollected before they can be ignored.");
    return;
  }
  const action = status === "ignored" ? "unignore" : "ignore";
  const target = buildInlineQueueStub(normalizedUrl, label);
  const queued = queueProjectAction(action, project.path, target || normalizedUrl, { source: "inline" });
  if (queued) {
    setMessage(`${describeBusyAction(action)} queued.`);
  }
}

async function handleInlineAction(payload) {
  if (!payload?.action || !payload?.url) {
    return;
  }
  if (payload.action === "preview-link") {
    queuePreviewItemFromUrl(payload.url);
    return;
  }
  if (payload.action === "collect-link") {
    await collectItemFromUrl(payload.url);
    return;
  }
  if (payload.action === "ignore-link") {
    await toggleIgnoreItemFromUrl(payload.url, payload.label || "");
  }
}

function setDebugOutput(text) {
  elements.debugOutput.textContent = text;
}

function renderPerfSnapshot() {
  setDebugOutput(buildPerfSnapshotText());
  setMessage("Captured performance snapshot.");
}

async function getCurrentPageHtml() {
  const activeTab = getActiveTab();
  if (!isWebviewReady(activeTab)) {
    throw new Error("Wait for the page to finish loading before dumping HTML.");
  }
  return safeExecuteJavaScript(activeTab, "document.documentElement.outerHTML", true, "");
}

async function saveCurrentSearchResults() {
  const project = getActiveProject();
  if (!project) {
    setMessage("Select a project before saving a search.");
    return;
  }
  const activeTab = getActiveTab();
  if (!activeTab?.webview?.isConnected) {
    setMessage("Open a page before saving a search.");
    return;
  }

  const searchExport = {
    pageTitle: activeTab.title || "",
    pageUrl: activeTab.url || ""
  };
  if (!searchExport.pageUrl) {
    setMessage("No search URL was available for this page.");
    return;
  }
  const saved = await window.troveApi.saveSearchResults(project.path, searchExport);
  await refreshProjectSearches(project);
  renderSavedSearches();
  renderSavedSearchMenu();
  setMessage(`Saved search URL to ${saved.file}. Use the Saved Searches menu to reopen it.`);
}

async function saveDebugCapture(kind) {
  const project = getActiveProject();
  const activeTab = getActiveTab();
  if (!activeTab) {
    setMessage("Open a page before saving debug artifacts.");
    return;
  }

  const capture = {
    title: activeTab.title,
    url: activeTab.url,
    notes: `Captured from ${activeTab.url}`
  };

  if (kind === "page") {
    capture.pageHtml = await getCurrentPageHtml();
    try {
      const item = await extractCurrentItem();
      if (item?.supported) {
        capture.itemJson = item;
      }
    } catch {
      // Keep the HTML dump even if structured extraction fails.
    }
  }

  if (kind === "item" || kind === "preview") {
    const item = getDisplayedItem() || (await extractCurrentItem());
    if (!item?.supported) {
      setMessage(item?.reason || "No supported item on this page yet.");
      return;
    }
    capture.title = item.title;
    capture.itemJson = item;
    if (kind === "preview") {
      capture.previewMarkdown = getDisplayedMarkdown() || (await buildPreviewMarkdownCached(item));
    }
  }

  const written = await window.troveApi.saveDebugCapture(project?.path || "", capture);
  setDebugOutput(`Saved debug capture:\n${Object.entries(written).map(([name, file]) => `${name}: ${file}`).join("\n")}`);
  setMessage(`Saved debug ${kind} artifact${kind === "page" ? "s" : ""}.`);
}

async function runDebugCommand(command) {
  const trimmed = String(command || "").trim();
  if (!trimmed) {
    return;
  }
  setDebugOutput(`$ ${trimmed}\n`);
  const result = await window.troveApi.runDebugCommand(trimmed, getDebugCwd());
  setDebugOutput(
    [`$ ${trimmed}`, result.stdout?.trim() || "", result.stderr?.trim() || "", result.success ? "" : "[exit: failed]"]
      .filter(Boolean)
      .join("\n\n")
  );
}

async function updateCaptureState() {
  const project = getActiveProject();
  const activeTab = getActiveTab();
  elements.captureCollect.disabled = !project || !getDisplayedItem();
  elements.captureIgnore.disabled = !project || !getDisplayedItem();
  if (!activeTab) {
    elements.pageStatus.textContent = "Ready";
    elements.pageKind.className = "page-kind";
    elements.pageKind.textContent = "Open a supported collection page.";
    if (!showStickyPreview()) {
      resetCapturePane("Open a page to start browsing. Supported record pages will render their capture preview here.");
    }
    return;
  }

  // A user-clicked link preview has priority over background page capture until
  // it either resolves or fails. Otherwise scheduled page refreshes can stomp
  // on an in-flight explicit preview before it lands.
  if (hasPendingLinkPreviewForTab(activeTab)) {
    return;
  }

  const requestId = ++state.captureRequestId;
  const activeUrl = activeTab.url || "";

  if (renderSearchOrListCaptureState(activeTab)) {
    return;
  }

  if (!hasInlinePreviewForActiveTab() && !hasCurrentPagePreviewForTab(activeTab) && !hasStickyPreview()) {
    resetCapturePane("Reading the current page and preparing its capture preview.", "Loading");
  }

  try {
    let item = await extractCurrentItem();
    if (requestId !== state.captureRequestId) {
      return;
    }

    if (!item?.supported) {
      let activeHostname = "";
      try {
        activeHostname = new URL(activeUrl).hostname.toLowerCase();
      } catch {
        activeHostname = "";
      }
      if (isKnownCollectionHost(activeHostname)) {
        const fallback = await fetchItemByUrl(activeUrl, {
          force: true,
          mode: "preview",
          timeoutMs: CAPTURE_FETCH_TIMEOUT_MS
        });
        if (requestId !== state.captureRequestId) {
          return;
        }
        if (fallback?.supported) {
          item = fallback;
        }
      }
    }

    if (!item?.supported) {
      const activeUrl = activeTab.url || "";
      let activeHostname = "";
      try {
        activeHostname = new URL(activeUrl).hostname.toLowerCase();
      } catch {
        activeHostname = "";
      }
      const knownCollectionHost = isKnownCollectionHost(activeHostname);
      elements.pageStatus.textContent = activeTab.title || "Page";
      elements.pageKind.className = "page-kind";
      elements.pageKind.textContent = knownCollectionHost
        ? "This page itself is not directly collectible. Use Preview or Collect on the supported record links here."
        : "Browse normally or preview a supported link from the page.";
      if (hasInlinePreviewForActiveTab() && previewState.item) {
        renderCapturePane(previewState.item, previewState.markdown, { origin: previewState.origin });
      } else {
        if (!showStickyPreview()) {
          clearPreviewState();
          resetCapturePane(
            knownCollectionHost
              ? "This page is a search or list view, not the final record. Use the inline Preview or Collect buttons on supported result links."
              : item?.reason || "This page is not supported yet. The browser will stay out of the way until you hit a supported record."
          );
        }
      }
      if (!project) {
        setMessage("Create or select a project first.");
      } else if (item?.reason) {
        setMessage(item.reason);
      }
      return;
    }

    const context = getCaptureContext();
    const needsFollowUp =
      Boolean(item?.supported) &&
      ((item.source === "trove" && /\/work\/\d+/i.test(item.url || activeTab?.url || "")) || item.source === "slwa");

    if (needsFollowUp && !hasCurrentPagePreviewForTab(activeTab)) {
      await showCaptureItem(item, "page", context, requestId);
      if (requestId !== state.captureRequestId) {
        return;
      }
    }

    item = await maybeBridgeCurrentPageItem(item, activeTab);
    if (requestId !== state.captureRequestId) {
      return;
    }
    item = await maybeHydrateSlwaCurrentPageItem(item);
    if (requestId !== state.captureRequestId) {
      return;
    }

    const rendered = await showCaptureItem(item, "page", context, requestId);
    if (!rendered || requestId !== state.captureRequestId) {
      return;
    }

    const status = getEffectiveItemStatus(project, item);
    elements.pageStatus.textContent = item.title;
    elements.pageKind.className = "page-kind";
    elements.pageKind.textContent = `${item.sourceLabel} · ${formatItemType(item.type)}`;
    if (status === "saved") {
      elements.pageKind.classList.add("item-state-saved");
      elements.pageKind.textContent += " · already saved";
    } else if (status === "ignored") {
      elements.pageKind.classList.add("item-state-ignored");
      elements.pageKind.textContent += " · ignored";
    }
  } catch (error) {
    const failureReason = isTransientNetworkError(error)
      ? describeTransientNetworkError(error)
      : error?.message || "Could not refresh the capture preview.";
    elements.pageStatus.textContent = activeTab.title || "Page";
    elements.pageKind.className = "page-kind";
    elements.pageKind.textContent = failureReason;
    if (!showStickyPreview()) {
      clearPreviewState();
      resetCapturePane(failureReason, "Unavailable");
    }
    setMessage(failureReason);
  }
}

document.addEventListener("pointerdown", (event) => {
  if (
    state.savedSearchMenuOpen &&
    event.target instanceof Element &&
    !event.target.closest(".toolbar-searches")
  ) {
    closeSavedSearchMenu();
  }
});

document.addEventListener("click", (event) => {
  if (
    !elements.projectContextMenu.hidden &&
    event.target instanceof Element &&
    !event.target.closest("#project-context-menu") &&
    !event.target.closest(".project-card")
  ) {
    closeProjectContextMenu();
  }
  if (
    state.queueTrayOpen &&
    event.target instanceof Element &&
    !event.target.closest("#queue-tray")
  ) {
    setQueueTrayOpen(false);
  }
  const lightboxTrigger =
    event.target instanceof Element ? event.target.closest("[data-open-image-lightbox]") : null;
  if (lightboxTrigger) {
    event.preventDefault();
    openImageLightbox(
      lightboxTrigger.getAttribute("data-open-image-lightbox") || "",
      lightboxTrigger.getAttribute("data-image-caption") || ""
    );
    return;
  }
  const previewImageTarget =
    event.target instanceof Element ? event.target.closest("[data-preview-image-index]") : null;
  if (previewImageTarget && getDisplayedItem()) {
    event.preventDefault();
    const nextIndex = Number.parseInt(previewImageTarget.getAttribute("data-preview-image-index") || "0", 10) || 0;
    previewState.imageIndex = nextIndex;
    renderCapturePane(getDisplayedItem(), getDisplayedMarkdown(), { origin: previewState.origin });
    void hydratePreviewAttachmentAtIndex(nextIndex).then(() => {
      if (getDisplayedItem()) {
        renderCapturePane(getDisplayedItem(), getDisplayedMarkdown(), { origin: previewState.origin });
      }
    });
    return;
  }
});

document.addEventListener(
  "pointerdown",
  (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const button = event.target.closest("button");
    if (button) {
      acknowledgeButtonPress(button);
    }
  },
  true
);

document.addEventListener("contextmenu", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest(".project-card")) {
    closeProjectContextMenu();
  }
});

elements.imageLightboxBackdrop.addEventListener("click", () => {
  closeImageLightbox();
});

elements.imageLightboxClose.addEventListener("click", () => {
  closeImageLightbox();
});

async function refreshProjects(preferredPath = state.activeProjectPath, options = {}) {
  state.projects = await window.troveApi.listProjects();
  if (preferredPath === null) {
    state.activeProjectPath = "";
  } else if (!state.projects.length) {
    state.activeProjectPath = "";
  } else if (!state.projects.some((project) => project.path === preferredPath)) {
    state.activeProjectPath = state.projects[0].path;
  } else {
    state.activeProjectPath = preferredPath;
  }
  if (previewState.statusOverrideProjectPath && previewState.statusOverrideProjectPath !== state.activeProjectPath) {
    setPreviewStatusOverride("");
  }

  await refreshProjectSearches();
  renderProjects();
  renderProjectDetails();
  renderSavedSearches();
  renderManageList();
  renderTabs();
  renderDebugCwd();
  await applyProjectDecorations();
  if (!options.skipCapture) {
    await updateCaptureState();
  }
}

async function chooseProjectLocation() {
  const selected = await window.troveApi.chooseProjectDirectory();
  if (!selected) {
    return;
  }
  state.selectedProjectDirectory = selected;
  renderProjectDialogLocation();
  setMessage(`New libraries will be created in ${selected}.`);
}

async function openExistingProject() {
  const selected = await window.troveApi.chooseProjectFolder();
  if (!selected) {
    return;
  }
  await refreshProjects(selected);
  setMessage(`Opened ${selected.split("/").pop()}.`);
}

async function openProjectFolderPath(projectPath) {
  if (!projectPath) {
    return;
  }
  await window.troveApi.openPath(projectPath);
}

async function openProjectTerminalPath(projectPath) {
  if (!projectPath) {
    return;
  }
  try {
    await window.troveApi.openTerminal(projectPath);
    setMessage(`Opened terminal in ${projectPath.split("/").pop()}.`);
  } catch (error) {
    setMessage(error?.message || "Could not open terminal.");
  }
}

async function closeActiveProject() {
  if (!getActiveProject()) {
    return;
  }
  await refreshProjects(null);
  setMessage("Closed active project.");
}

elements.projectDialogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = elements.projectDialogName.value.trim();
  if (!name) {
    setMessage("Enter a project name first.");
    return;
  }

  try {
    const project = await window.troveApi.createProject(state.selectedProjectDirectory, name);
    closeProjectDialog();
    setMessage(`Created ${project.folderName}.`);
    setMode("collect");
    await refreshProjects(project.path);
  } catch (error) {
    setMessage(error.message || "Could not create project.");
  }
});

elements.newProjectButton.addEventListener("click", () => {
  openProjectDialog();
});
elements.projectDialogChooseLocation.addEventListener("click", () => {
  void chooseProjectLocation();
});
elements.projectDialogCancel.addEventListener("click", () => {
  closeProjectDialog();
});
elements.projectDialogBackdrop.addEventListener("click", () => {
  closeProjectDialog();
});
elements.openProjectButton.addEventListener("click", () => {
  void openExistingProject();
});
elements.modeCollect.addEventListener("click", () => setMode("collect"));
elements.modeManage.addEventListener("click", () => {
  setMode("manage");
  renderManageList();
});
elements.modePlugins.addEventListener("click", () => setMode("plugins"));
elements.filterAll.addEventListener("click", () => {
  state.manageFilter = "all";
  renderManageList();
});
elements.filterSaved.addEventListener("click", () => {
  state.manageFilter = "saved";
  renderManageList();
});
elements.filterIgnored.addEventListener("click", () => {
  state.manageFilter = "ignored";
  renderManageList();
});
elements.filterUncollected.addEventListener("click", () => {
  state.manageFilter = "uncollected";
  renderManageList();
});
elements.layoutCards?.addEventListener("click", () => {
  state.manageLayout = "cards";
  renderManageList();
});
elements.layoutCompact?.addEventListener("click", () => {
  state.manageLayout = "compact";
  renderManageList();
});
elements.manageSearch?.addEventListener("input", (event) => {
  state.manageQuery = event.target.value || "";
  renderManageList();
});
elements.openItemsCsv.addEventListener("click", async () => {
  const project = getActiveProject();
  if (!project) {
    return;
  }
  await window.troveApi.openPath(`${project.path}/items.csv`);
});

elements.openProjectFolder.addEventListener("click", async () => {
  const project = getActiveProject();
  if (!project) {
    return;
  }
  await openProjectFolderPath(project.path);
});
elements.openProjectTerminal.addEventListener("click", async () => {
  const project = getActiveProject();
  if (!project) {
    return;
  }
  await openProjectTerminalPath(project.path);
});
elements.openSearchesFolder.addEventListener("click", async () => {
  const project = getActiveProject();
  if (!project) {
    return;
  }
  await window.troveApi.openPath(`${project.path}/${project.folders?.searches || "searches"}`);
});
elements.closeProjectButton.addEventListener("click", () => {
  void closeActiveProject();
});
elements.projectContextOpenFolder.addEventListener("click", () => {
  const projectPath = state.projectContextPath;
  closeProjectContextMenu();
  void openProjectFolderPath(projectPath);
});
elements.projectContextOpenTerminal.addEventListener("click", () => {
  const projectPath = state.projectContextPath;
  closeProjectContextMenu();
  void openProjectTerminalPath(projectPath);
});
elements.projectContextHide.addEventListener("click", () => {
  void hideProjectFromPane();
});

elements.pluginSeedUrls.addEventListener("input", () => {
  renderPluginIntake();
});
elements.pluginSeedUrls.addEventListener("paste", (event) => {
  const pasted = event.clipboardData?.getData("text/html") || event.clipboardData?.getData("text/plain") || "";
  if (!pasted || !extractSupportedImportUrls(pasted).length) {
    return;
  }
  queueMicrotask(() => {
    renderPluginIntake();
    openImportTriageDialogFromNotes();
  });
});
elements.pluginUrlAnalysis?.addEventListener("change", (event) => {
  if (event.target?.classList?.contains("plugin-triage-check") && elements.pluginOpenSelected) {
    elements.pluginOpenSelected.disabled = !getSelectedPluginIntakeUrls().length;
  }
});
elements.pluginOpenSelected?.addEventListener("click", () => {
  const urls = getSelectedPluginIntakeUrls();
  if (!urls.length) {
    return;
  }
  openImportTriageDialogFromNotes(urls);
});
elements.pluginClearIntake?.addEventListener("click", () => {
  elements.pluginSeedUrls.value = "";
  renderPluginIntake();
  setMessage("Cleared imported notes.");
});
elements.pluginDropZone?.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.pluginDropZone.classList.add("is-dragging");
});
elements.pluginDropZone?.addEventListener("dragleave", () => {
  elements.pluginDropZone.classList.remove("is-dragging");
});
elements.pluginDropZone?.addEventListener("drop", (event) => {
  event.preventDefault();
  void handlePluginDroppedFiles(event.dataTransfer?.files || []);
});

elements.settingsOpenDebug?.addEventListener("click", () => {
  toggleDebugDrawer(true);
  setMessage("Debug tools opened. Use dumps and perf snapshots before adding a new adapter.");
});

elements.troveLinkDialogInput?.addEventListener("input", () => {
  updateTroveLinkDialogFromInput();
});

elements.troveLinkDialogCancel?.addEventListener("click", () => {
  closeTroveLinkDialog();
});

elements.troveLinkDialogBackdrop?.addEventListener("click", () => {
  closeTroveLinkDialog();
});
elements.troveLinkDialogPreview?.addEventListener("click", (event) => {
  const button = event.target?.closest?.(".trove-link-preview-open");
  const url = button?.getAttribute?.("data-url") || "";
  if (!url) {
    return;
  }
  setMode("collect");
  openUrlListInTabs([url]);
  closeTroveLinkDialog();
  setMessage("Opening selected link.");
});

elements.troveLinkDialogOpen?.addEventListener("click", () => {
  const config = getSourceLinkDialogConfig();
  const urls = [...state.linkDialogUrls];
  if (!urls.length) {
    return;
  }
  setMode("collect");
  openUrlListInTabs(urls);
  closeTroveLinkDialog();
  setMessage(`Opening ${urls.length} ${config.label} tab${urls.length === 1 ? "" : "s"}.`);
});
elements.troveLinkDialogOpenUnresolved?.addEventListener("click", () => {
  const config = getSourceLinkDialogConfig();
  const urls = getUnresolvedLinkDialogUrls();
  if (!urls.length) {
    return;
  }
  setMode("collect");
  openUrlListInTabs(urls);
  closeTroveLinkDialog();
  setMessage(`Opening ${urls.length} ${config.id === "omni" ? "not yet handled" : "unresolved"} ${config.label} tab${urls.length === 1 ? "" : "s"}.`);
});

elements.addressForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }
  const nextUrl = ensureUrl(elements.addressInput.value);
  activeTab.url = nextUrl;
  invalidateTabCaches(activeTab);
  elements.pageStatus.textContent = "Loading";
  elements.pageKind.className = "page-kind";
  elements.pageKind.textContent = "Waiting for a supported collection page";
  setMessage("Loading page…");
  if (!showStickyPreview()) {
    resetCapturePane("Loading page. The capture pane will update when the record or result preview is ready.", "Loading");
  }
  void navigateExistingTab(activeTab, nextUrl);
  scheduleTabRefresh(activeTab, { delay: 1500 });
});

elements.backButton.addEventListener("click", () => {
  interruptPreviewWork();
  const webview = getActiveTab()?.webview;
  if (!webview?.isConnected) {
    return;
  }
  try {
    if (typeof webview.canGoBack !== "function" || webview.canGoBack()) {
      webview.goBack();
    }
  } catch {
    // Navigation recovery controls should never wedge the surrounding UI.
  }
});
elements.forwardButton.addEventListener("click", () => {
  interruptPreviewWork();
  const webview = getActiveTab()?.webview;
  if (!webview?.isConnected) {
    return;
  }
  try {
    if (typeof webview.canGoForward !== "function" || webview.canGoForward()) {
      webview.goForward();
    }
  } catch {
    // Navigation recovery controls should never wedge the surrounding UI.
  }
});
elements.reloadButton.addEventListener("click", () => {
  interruptPreviewWork();
  const activeTab = getActiveTab();
  const webview = activeTab?.webview;
  if (!webview?.isConnected) {
    return;
  }
  try {
    if (typeof webview.stop === "function" && typeof webview.isLoading === "function" && webview.isLoading()) {
      webview.stop();
    }
    webview.reload();
    startWebviewLoadWatchdog(activeTab);
  } catch {
    const fallbackUrl = ensureUrl(activeTab?.url || webview.getURL?.() || "");
    if (fallbackUrl) {
      void navigateExistingTab(activeTab, fallbackUrl);
    }
  }
});
elements.saveSearchButton.addEventListener("click", () => {
  void saveCurrentSearchResults();
});
elements.savedSearchesButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (elements.savedSearchesButton.disabled) {
    return;
  }
  state.savedSearchMenuOpen = !state.savedSearchMenuOpen;
  renderSavedSearchMenu();
});
elements.queueTrayToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (elements.queueTray.hidden) {
    return;
  }
  setQueueTrayOpen(!state.queueTrayOpen);
});
elements.newTabButton.addEventListener("click", () => createTab());
elements.debugToggle.addEventListener("click", () => toggleDebugDrawer());
elements.debugClose.addEventListener("click", () => toggleDebugDrawer(false));
elements.debugSavePage.addEventListener("click", () => {
  void saveDebugCapture("page");
});
elements.debugSaveItem.addEventListener("click", () => {
  void saveDebugCapture("item");
});
elements.debugSavePreview.addEventListener("click", () => {
  void saveDebugCapture("preview");
});
elements.debugPerfSnapshot?.addEventListener("click", () => {
  renderPerfSnapshot();
});
elements.debugForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runDebugCommand(elements.debugCommand.value);
});
elements.captureCopyMarkdown.addEventListener("click", async () => {
  const markdown = getDisplayedMarkdown();
  if (!String(markdown || "").trim()) {
    return;
  }
  await window.troveApi.copyText(markdown);
  setMessage("Copied markdown preview.");
});

elements.captureFindInput.addEventListener("input", () => {
  handleCaptureFindInput();
});
elements.captureFindInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    activateCaptureFindMatch(
      previewState.findActiveIndex + (event.shiftKey ? -1 : 1),
      { behavior: "smooth" }
    );
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeCaptureFind();
    elements.captureMarkdown.focus?.();
  }
});
elements.captureFindPrev.addEventListener("click", () => {
  activateCaptureFindMatch(previewState.findActiveIndex - 1, { behavior: "smooth" });
});
elements.captureFindNext.addEventListener("click", () => {
  activateCaptureFindMatch(previewState.findActiveIndex + 1, { behavior: "smooth" });
});
elements.captureFindClose.addEventListener("click", () => {
  closeCaptureFind();
});
elements.pageFindInput?.addEventListener("input", () => {
  handlePageFindInput();
});
elements.pageFindInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runPageFind({ findNext: true, forward: !event.shiftKey });
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePageFind();
  }
});
elements.pageFindPrev?.addEventListener("click", () => {
  runPageFind({ findNext: true, forward: false });
});
elements.pageFindNext?.addEventListener("click", () => {
  runPageFind({ findNext: true, forward: true });
});
elements.pageFindClose?.addEventListener("click", () => {
  closePageFind();
});

elements.captureCollect.addEventListener("click", async () => {
  const project = getActiveProject();
  if (!project) {
    setMessage("Select a project before collecting.");
    return;
  }
  const currentItem = getDisplayedItem();
  const target = currentItem || { url: ensureUrl(getActiveTab()?.url || "") };
  const currentStatus = target ? getEffectiveItemStatus(project, target) : "";
  const action = currentStatus === "saved" ? "uncollect" : "collect";
  if (action === "uncollect") {
    const confirmed = window.confirm("Are you sure you want to uncollect this item?");
    if (!confirmed) {
      return;
    }
  }
  if (!target?.url && !target?.supported) {
    setMessage("This item cannot be collected.");
    return;
  }
  const queued = queueProjectAction(action, project.path, target, { source: "sidebar" });
  if (queued) {
    setMessage(`${describeBusyAction(action)} queued.`);
  }
});

elements.captureIgnore.addEventListener("click", async () => {
  const project = getActiveProject();
  if (!project) {
    setMessage("Select a project before ignoring items.");
    return;
  }
  const currentItem = getDisplayedItem();
  const target = currentItem || { url: ensureUrl(getActiveTab()?.url || "") };
  const currentStatus = target ? getEffectiveItemStatus(project, target) : "";
  if (currentStatus === "saved") {
    setMessage("Collected items must be uncollected before they can be ignored.");
    return;
  }
  const action = currentStatus === "ignored" ? "unignore" : "ignore";
  if (!target?.url && !target?.supported) {
    setMessage("This item cannot be ignored.");
    return;
  }
  const queued = queueProjectAction(action, project.path, target, { source: "sidebar" });
  if (queued) {
    setMessage(`${describeBusyAction(action)} queued.`);
  }
});

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "f") {
    if (!isTextEditableTarget(event.target) && state.mode === "collect") {
      event.preventDefault();
      if (isFocusWithinCapturePane()) {
        const selection = window.getSelection?.();
        const selectedText = selection ? String(selection).trim() : "";
        openCaptureFind(selectedText);
      } else {
        openPageFind("");
      }
      return;
    }
  }
  if ((event.key === "Enter" || event.key === " ") && event.target instanceof Element) {
    const button = event.target.closest("button");
    if (button) {
      acknowledgeButtonPress(button);
    }
  }
  if (event.key !== "Escape") {
    return;
  }
  if (previewState.findOpen) {
    closeCaptureFind();
    return;
  }
  if (pageFindState.open) {
    closePageFind();
    return;
  }
  if (state.savedSearchMenuOpen) {
    closeSavedSearchMenu();
    return;
  }
  if (!elements.projectDialog.hidden) {
    closeProjectDialog();
    return;
  }
  if (!elements.troveLinkDialog.hidden) {
    closeTroveLinkDialog();
    return;
  }
  if (!elements.projectContextMenu.hidden) {
    closeProjectContextMenu();
    return;
  }
  if (state.queueTrayOpen) {
    setQueueTrayOpen(false);
    return;
  }
  if (!elements.imageLightbox.hidden) {
    closeImageLightbox();
    return;
  }
  if (!elements.debugDrawer.hidden) {
    toggleDebugDrawer(false);
  }
});

window.addEventListener("DOMContentLoaded", async () => {
  window.trovePerf = {
    snapshot: () => JSON.parse(buildPerfSnapshotText()),
    events: () => [...state.perfEvents],
    queue: () => describeQueueState(),
    health: () => {
      const snapshot = JSON.parse(buildPerfSnapshotText());
      const issues = getAppHealthIssues(snapshot);
      return {
        ok: issues.length === 0,
        issues,
        snapshot
      };
    },
    layout: () => {
      const issues = getLayoutOverflowIssues();
      return {
        ok: issues.length === 0,
        issues
      };
    }
  };
  applySidebarWidth();
  renderProjectDialogLocation();
  renderTroveLinkDialogPreview();
  renderMode();
  renderManageList();
  renderDebugCwd();
  renderSources();
  renderPluginIntake();
  bindTabScroller();
  bindSidebarResizer();
  webviewResizeObserver = new ResizeObserver(() => {
    syncWebviewElementSize();
    nudgeWebviewLayout(getActiveTab());
  });
  webviewResizeObserver.observe(elements.webviewStack);
  window.addEventListener("resize", () => {
    syncWebviewElementSize();
    nudgeWebviewLayout(getActiveTab());
  });
  window.troveApi.onSaveProgress((payload) => {
    void handleSaveProgress(payload);
  });
  window.troveApi.onContextNewTab((payload) => {
    openTabFromPayload(payload);
  });
  window.troveApi.onCommandOpenTabs((urls) => {
    openUrlListInTabs(urls);
  });
  setInterval(monitorWebviewRecoverability, 1500);
  createTab();
  await refreshProjects("");
  window.troveApi.notifyRendererReady();
});
