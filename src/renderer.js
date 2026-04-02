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
  manageLayout: "cards",
  manageExpandedKey: "",
  debugOpen: false,
  captureRequestId: 0,
  sidebarWidth: 360,
  manageRenderToken: 0,
  captureBusy: null,
  saveProgress: null,
  actionQueue: [],
  actionQueueRunning: false,
  currentQueueJob: null,
  queuedActionIds: new Set(),
  actionNonce: 0,
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
  projectContextHide: document.getElementById("project-context-hide"),
  projectDetails: document.getElementById("project-details"),
  savedSearches: document.getElementById("saved-searches"),
  sourceList: document.getElementById("source-list"),
  pluginsSupported: document.getElementById("plugins-supported"),
  openProjectFolder: document.getElementById("open-project-folder"),
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
  pluginCopyPrompt: document.getElementById("plugin-copy-prompt"),
  pluginCopyProbeCommand: document.getElementById("plugin-copy-probe-command"),
  pluginPromptOutput: document.getElementById("plugin-prompt-output"),
  pluginStatus: document.getElementById("plugin-status"),
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
const BACKGROUND_FETCH_MAX_ENTRIES = 400;
const PREVIEW_MARKDOWN_MAX_ENTRIES = 400;
let webviewResizeObserver = null;

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

function getLinkDialogItemStatus(url, project = getActiveProject(), sourceId = state.linkDialogSourceId) {
  if (!project || !url) {
    return "";
  }
  const sourceLabel = sourceId === "slwa" ? "SLWA" : "Trove";
  return getEffectiveItemStatus(project, {
    url: ensureUrl(url),
    aliases: [ensureUrl(url)],
    source: sourceId,
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
  }
  elements.troveLinkDialogStatus.textContent = urls.length
    ? `Found ${urls.length} ${config.label} link${urls.length === 1 ? "" : "s"}${project ? ` · ${unresolvedUrls.length} unresolved` : ""}.`
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
            : "";
      return `
        <div class="trove-link-preview-item">
          <div class="trove-link-preview-head">
            <span class="trove-link-preview-index">Link ${index + 1}</span>
            <span class="trove-link-preview-kind">${escapeHtml(meta.kind)}</span>
            ${statusBadge}
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
    /^(?:trove\.nla\.gov\.au|nla\.gov\.au|encore\.slwa\.wa\.gov\.au|purl\.slwa\.wa\.gov\.au|catalogue\.slwa\.wa\.gov\.au|museum\.wa\.gov\.au)\b/i.test(
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
    "museum.wa.gov.au"
  ].includes(String(hostname || "").toLowerCase());
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
  const shouldShow = state.mode === "collect" && (hasActiveQueueWork || waitingCount > 0);
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
  if (waitingCount > 0) {
    metaParts.push(`${waitingCount} waiting`);
  }
  if (!metaParts.length && job?.source) {
    metaParts.push(job.source === "inline" ? "Queued from page" : "Queued from preview");
  }
  elements.queueTrayMeta.textContent = metaParts.join(" · ");
}

function setQueueTrayOpen(nextOpen) {
  state.queueTrayOpen = Boolean(nextOpen);
  renderQueueTray();
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
  if (action === "collect" || action === "uncollect") {
    setButtonLoading(elements.captureCollect, true, progressLabel || `${describeBusyAction(action)}…`);
    elements.captureIgnore.disabled = true;
    return;
  }
  if (action === "ignore" || action === "unignore") {
    setButtonLoading(elements.captureIgnore, true, `${describeBusyAction(action)}…`);
    elements.captureCollect.disabled = true;
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
  if (shouldReflectQueuedActionInCapture(target, options)) {
    setCaptureBusy(action, true, target, busyLabel, currentJobMatchesAction ? state.currentQueueJob?.id || "" : "");
  }
  void applyImmediatePageLoading(target, action, true, busyLabel, options.context || getCaptureContext());

  if (currentJobMatchesAction) {
    renderQueueTray();
    return true;
  }

  if (state.queuedActionIds.has(actionKey)) {
    renderQueueTray();
    return true;
  }

  const project = getProjectByPath(projectPath);
  const currentStatus = project ? getEffectiveItemStatus(project, target) : "";
  const desiredStatus = getStatusAfterAction(action);
  if (!currentJobMatchesTarget && removedQueuedConflict && currentStatus === desiredStatus) {
    if (shouldReflectQueuedActionInCapture(target, options)) {
      setCaptureBusy("", false, null, "", "");
    }
    void applyImmediatePageLoading(target, action, false, "", options.context || getCaptureContext());
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
    context: options.context || getCaptureContext(),
    queuedAt: Date.now(),
    source: options.source || "",
    label: options.label || ""
  };
  state.queuedActionIds.add(actionKey);
  state.actionQueue.push(job);
  renderQueueTray();
  if (shouldReflectQueuedActionInCapture(target, options)) {
    setCaptureBusy(action, true, target, busyLabel, job.id);
  }
  void processActionQueue();
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
      renderQueueTray();
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
        setCaptureBusy("", false, null, "", job.id);
        void applyImmediatePageLoading(job.item, job.action, false, "", job.context);
        setMessage(error.message || `${describeBusyAction(job.action)} failed.`);
      } finally {
        state.queuedActionIds.delete(job.actionKey);
        state.currentQueueJob = null;
        renderQueueTray();
      }
    }
  } finally {
    state.actionQueueRunning = false;
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
  elements.captureIgnore.disabled = !project || status === "saved" || itemMatchesBusy;
  elements.captureCollect.disabled = !project || itemMatchesBusy;
  const attachments = getItemAttachments(item);
  const isImageSet = item.type === "image" && attachments.length > 1;
  const collectLabel = status === "saved" ? "Collected" : isImageSet ? `Collect All (${attachments.length})` : "Collect";
  const ignoreLabel = status === "ignored" ? "Unignore" : "Ignore";
  elements.captureCollect.dataset.baseLabel = collectLabel;
  elements.captureIgnore.dataset.baseLabel = ignoreLabel;
  elements.captureCollect.textContent = collectLabel;
  elements.captureIgnore.textContent = ignoreLabel;
  elements.captureCollect.classList.toggle("is-complete", status === "saved");
  elements.captureIgnore.classList.toggle("is-complete", status === "ignored");
  elements.captureIgnore.classList.toggle("is-ignored-state", status === "ignored");
  const progressMatchesItem =
    Boolean(
      progress &&
        item &&
        ((progress.key && item.key && progress.key === item.key) || (progress.url && item.url && progress.url === item.url))
    );
  const progressLabel = progressMatchesItem ? formatSaveProgressLabel(progress) : "";
  setButtonLoading(
    elements.captureCollect,
    Boolean(itemMatchesBusy && (busy.action === "collect" || busy.action === "uncollect")),
    progressLabel || busy?.progressLabel || `${describeBusyAction(busy?.action)}…`
  );
  setButtonLoading(
    elements.captureIgnore,
    Boolean(itemMatchesBusy && (busy.action === "ignore" || busy.action === "unignore")),
    `${describeBusyAction(busy?.action)}…`
  );
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

async function applyImmediatePageLoading(item, action, active, label = "", context = null) {
  const targetTab = resolveActionContextTab(context);
  if (!item) {
    return;
  }
  const urls = [...new Set([item.url, ...(item.aliases || [])].filter(Boolean))];
  if (!urls.length) {
    return;
  }
  const script = sourceRegistry.buildImmediateLoadingScript({ action, active, label, urls });
  await safeExecuteJavaScript(targetTab, script, true, null, { requireReady: false });
}

async function handleSaveProgress(progress) {
  state.saveProgress = progress || null;
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
  return String(elements.pluginSeedUrls?.value || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildPluginPrompt(urls) {
  const seeds = urls.length ? urls.map((url) => `- ${url}`).join("\n") : "- https://example-library/search?q=wellington+dam";
  return `Use the trove-browser repo to reverse engineer a new collection source integration.

Source URLs:
${seeds}

Workflow:
1. Run \`npm run probe:source -- "<url1>" "<url2>" ...\` on the seed URLs.
2. Inspect the screenshots and DOM summaries from the probe output.
3. Add fixture coverage for search/detail/media variants.
4. Implement a source adapter and inline-result-link heuristics.
5. Verify with \`npm run test:fixtures\`, \`npm run test:e2e\`, and fresh Electron screenshots.
6. Keep the browser footprint minimal and the collect sidebar focused on preview + collect/ignore.

Constraints:
- Degrade cleanly when a page is unsupported.
- Only add inline Preview/Collect controls to actual entry/result links.
- Save text records as markdown and image records as image + markdown sidecar.
- Preserve saved/ignored alias recognition.

If the site blocks automated browsing, say so explicitly and identify the smallest missing input needed from me to finish the integration in one more round.`;
}

function buildPluginProbeCommand(urls) {
  if (!urls.length) {
    return 'npm run probe:source -- "https://example-library/search?q=wellington+dam"';
  }
  return `npm run probe:source -- ${urls.map((url) => `"${url}"`).join(" ")}`;
}

function renderPluginIntake() {
  const urls = getPluginSeedUrls();
  elements.pluginPromptOutput.textContent = buildPluginPrompt(urls);
  elements.pluginStatus.textContent = urls.length
    ? `Ready to probe ${urls.length} URL${urls.length === 1 ? "" : "s"} and generate a new-source integration prompt.`
    : "Paste URLs to generate a reusable Codex/Claude integration prompt.";
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

function setMode(mode) {
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
    refreshTimer: null
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
    if (tab.id !== state.activeTabId) {
      return;
    }
    if (decorations) {
      await applyProjectDecorations();
    }
    if (capture) {
      await updateCaptureState();
    }
  }, delay);
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
        const buttonCandidates = [];
        const overlayRoots = Array.from(
          document.querySelectorAll('[role="dialog"], .modal, .dialog, .popup, [aria-modal="true"]')
        );
        const exactMatchers = [/don't show cultural advice/i, /dont show cultural advice/i, /^close$/i, /^dismiss$/i];
        const fuzzyMatchers = [/close/i, /dismiss/i, /skip/i];
        const collectButtons = (root) =>
          Array.from(root.querySelectorAll('button, [role="button"], a')).filter((node) => {
            const combined = [
              node.textContent,
              node.getAttribute("aria-label"),
              node.getAttribute("title"),
              node.className
            ].join(" ");
            return fuzzyMatchers.some((pattern) => pattern.test(combined));
          });

        for (const root of overlayRoots) {
          buttonCandidates.push(...collectButtons(root));
        }
        if (!buttonCandidates.length) {
          buttonCandidates.push(
            ...Array.from(document.querySelectorAll('button, [role="button"], a')).filter((node) => {
              const combined = [
                node.textContent,
                node.getAttribute("aria-label"),
                node.getAttribute("title"),
                node.className
              ].join(" ");
              return /don't show cultural advice|dont show cultural advice/i.test(combined);
            })
          );
        }

        const best =
          buttonCandidates.find((node) => {
            const value = normalize([
              node.textContent,
              node.getAttribute("aria-label"),
              node.getAttribute("title")
            ].join(" "));
            return exactMatchers.some((pattern) => pattern.test(value));
          }) ||
          buttonCandidates[0];

        if (best) {
          try {
            best.click();
            return true;
          } catch {
            return false;
          }
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
      void safeExecuteJavaScript(tab, script, true, null);
    }, delay);
  }
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

  const syncNavigation = async () => {
    const nextUrl = tab.webview.getURL();
    const urlChanged = nextUrl !== tab.url;
    tab.url = nextUrl;
    if (urlChanged) {
      invalidateTabCaches(tab);
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
    scheduleTabRefresh(tab, { delay: 90 });
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
      pluginCard.className = "plugin-source-card";
      pluginCard.innerHTML = `
        <div class="plugin-source-top">
          <strong>${plugin.label}</strong>
          <div class="plugin-capabilities">
            <span class="source-badge">Images</span>
            <span class="source-badge">Texts</span>
          </div>
        </div>
        <p class="message-text">${plugin.description}</p>
        <div class="plugin-source-meta">${plugin.domains.join(" · ")}</div>
      `;
      const browseButton = document.createElement("button");
      browseButton.type = "button";
      browseButton.className = "ghost-button";
      browseButton.textContent = `Browse ${plugin.label}`;
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
    button.title = "Click to open. Right-click to hide this library from the list.";
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

  elements.filterAll.classList.toggle("is-active", state.manageFilter === "all");
  elements.filterSaved.classList.toggle("is-active", state.manageFilter === "saved");
  elements.filterIgnored.classList.toggle("is-active", state.manageFilter === "ignored");
  elements.filterUncollected.classList.toggle("is-active", state.manageFilter === "uncollected");
  elements.layoutCards?.classList.toggle("is-active", state.manageLayout === "cards");
  elements.layoutCompact?.classList.toggle("is-active", state.manageLayout === "compact");
  if (elements.manageSearch && elements.manageSearch.value !== state.manageQuery) {
    elements.manageSearch.value = state.manageQuery;
  }
  elements.manageSummary.textContent = `${inventory.length} item${inventory.length === 1 ? "" : "s"}`;
  elements.manageList.innerHTML = "";

  if (!inventory.length) {
    state.manageExpandedKey = "";
    elements.manageList.className = "manage-list empty-state";
    elements.manageList.textContent = "No items in this filter yet.";
    return;
  }

  elements.manageList.className = `manage-list${state.manageLayout === "compact" ? " is-compact" : ""}`;
  if (state.manageLayout === "compact") {
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

  elements.backButton.disabled = !safeCanGo(activeTab, "back");
  elements.forwardButton.disabled = !safeCanGo(activeTab, "forward");
  elements.reloadButton.disabled = !activeTab.webview?.isConnected;
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
    await safeExecuteJavaScript(activeTab, sourceRegistry.buildDecorationScript(payload), true, null);
    activeTab.decorationSignature = signature;
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
        const result = await webview.executeJavaScript(sourceRegistry.buildExtractionScript(), true);
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
    return fetchItemByUrl(activeTab.url, { force: true });
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
    return backgroundFetchPendingCache.get(cacheKey);
  }

  const pending = window.troveApi.fetchItemByUrl(normalizedUrl, options);
  backgroundFetchPendingCache.set(cacheKey, pending);

  try {
    const item = await pending;
    if (item?.supported) {
      cacheFetchedItem(normalizedUrl, mode, item);
    }
    return item;
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
  const markdown = await buildPreviewMarkdownCached(item);
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

async function previewItemFromUrl(url) {
  const placeholder = { url: ensureUrl(url), aliases: [ensureUrl(url)] };
  const context = getCaptureContext();
  const requestId = ++state.captureRequestId;
  const previewToken = `preview-${requestId}`;
  state.previewActionId = previewToken;
  beginPreviewIntent("link", context, previewToken);
  void applyImmediatePageLoading(placeholder, "preview", true, "", context);
  setCaptureBusy("preview", true, placeholder, "Previewing…", previewToken);
  setMessage("Loading linked item preview…");
  if (!hasStickyPreview()) {
    resetCapturePane("Loading the linked record into the capture pane.", "Loading");
  }
  try {
    const item = await fetchItemByUrl(url, { mode: "preview" });
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
    setMessage(`Previewing ${itemWithClickedAlias.title}.`);
  } finally {
    if (state.previewActionId === previewToken) {
      state.previewActionId = "";
    }
    clearPreviewIntent(previewToken);
    setCaptureBusy("", false, null, "", previewToken);
    void applyImmediatePageLoading(placeholder, "preview", false, "", context);
  }
}

async function collectItem(item, projectPath = getActiveProject()?.path, busyToken = "", context = null) {
  if (!projectPath) {
    setMessage("Select a project before collecting.");
    return;
  }
  try {
    const savableItem = await ensureCollectableItem(item);
    await window.troveApi.saveItem(projectPath, savableItem);
    if (isCaptureContextCurrent(context) && itemsReferToSameRecord(getDisplayedItem(), savableItem)) {
      setPreviewStatusOverride("saved", projectPath);
      previewState.item = savableItem;
      renderCapturePane(getDisplayedItem() || savableItem, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: "saved"
      });
    }
    await applyImmediatePageFeedback(savableItem, "saved", context);
    if (isCaptureContextCurrent(context)) {
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
    setCaptureBusy("", false, null, "", busyToken);
    await applyImmediatePageLoading(item, "collect", false, "", context);
    if (isCaptureContextCurrent(context) && getDisplayedItem()) {
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
    if (isCaptureContextCurrent(options.context) && itemsReferToSameRecord(getDisplayedItem(), item)) {
      setPreviewStatusOverride("", projectPath);
      renderCapturePane(getDisplayedItem() || item, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: ""
      });
    }
    await applyImmediatePageFeedback(item, "", options.context);
    if (isCaptureContextCurrent(options.context)) {
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
    setCaptureBusy("", false, null, "", options.busyToken || "");
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
    if (isCaptureContextCurrent(context) && itemsReferToSameRecord(getDisplayedItem(), item)) {
      setPreviewStatusOverride("", projectPath);
      renderCapturePane(getDisplayedItem() || item, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: ""
      });
    }
    await applyImmediatePageFeedback(item, "", context);
    if (isCaptureContextCurrent(context)) {
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
    setCaptureBusy("", false, null, "", busyToken);
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
    if (isCaptureContextCurrent(context) && itemsReferToSameRecord(getDisplayedItem(), item)) {
      setPreviewStatusOverride("ignored", projectPath);
      renderCapturePane(getDisplayedItem() || item, getDisplayedMarkdown(), {
        origin: previewState.origin,
        forcedStatus: "ignored"
      });
    }
    await applyImmediatePageFeedback(item, "ignored", context);
    if (isCaptureContextCurrent(context)) {
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
    setCaptureBusy("", false, null, "", busyToken);
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
    await previewItemFromUrl(payload.url);
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

  if (!hasInlinePreviewForActiveTab() && !hasCurrentPagePreviewForTab(activeTab) && !hasStickyPreview()) {
    resetCapturePane("Reading the current page and preparing its capture preview.", "Loading");
  }

  let item = await extractCurrentItem();
  if (requestId !== state.captureRequestId) {
    return;
  }

  if (!item?.supported) {
    const activeUrl = activeTab.url || "";
    let activeHostname = "";
    try {
      activeHostname = new URL(activeUrl).hostname.toLowerCase();
    } catch {
      activeHostname = "";
    }
    if (isKnownCollectionHost(activeHostname)) {
      const fallback = await fetchItemByUrl(activeUrl, { force: true, mode: "preview" });
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
  await window.troveApi.openPath(project.path);
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
elements.projectContextHide.addEventListener("click", () => {
  void hideProjectFromPane();
});

elements.pluginSeedUrls.addEventListener("input", () => {
  renderPluginIntake();
});

elements.pluginCopyPrompt.addEventListener("click", async () => {
  await window.troveApi.copyText(elements.pluginPromptOutput.textContent || "");
  setMessage("Copied new-source integration prompt.");
});

elements.pluginCopyProbeCommand.addEventListener("click", async () => {
  await window.troveApi.copyText(buildPluginProbeCommand(getPluginSeedUrls()));
  setMessage("Copied source probe command.");
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
  setMessage(`Opening ${urls.length} unresolved ${config.label} tab${urls.length === 1 ? "" : "s"}.`);
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
  getActiveTab()?.webview.goBack();
});
elements.forwardButton.addEventListener("click", () => {
  interruptPreviewWork();
  getActiveTab()?.webview.goForward();
});
elements.reloadButton.addEventListener("click", () => {
  interruptPreviewWork();
  getActiveTab()?.webview.reload();
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
  createTab();
  await refreshProjects("");
  window.troveApi.notifyRendererReady();
});
