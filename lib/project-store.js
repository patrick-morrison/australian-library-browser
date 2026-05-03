const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");

const PROJECT_SUFFIX = ".trovelibrary";
const LEGACY_PROJECT_FILE = "project.yaml";
const DEFAULT_FOLDERS = {
  newspapers: "newspapers",
  images: "images",
  debug: "debug",
  searches: "searches"
};
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const HOST_FETCH_INTERVAL_MS = Number(process.env.TROVE_BROWSER_HOST_FETCH_INTERVAL_MS || 900);
const hostFetchQueues = new Map();

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDateIso() {
  return new Date().toISOString();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function paceHostRequest(targetUrl) {
  if (!HOST_FETCH_INTERVAL_MS) {
    return;
  }
  let hostname = "";
  try {
    hostname = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return;
  }
  const previous = hostFetchQueues.get(hostname) || Promise.resolve();
  const queued = previous.catch(() => {}).then(() => delay(HOST_FETCH_INTERVAL_MS));
  hostFetchQueues.set(hostname, queued);
  await queued;
  if (hostFetchQueues.get(hostname) === queued) {
    hostFetchQueues.delete(hostname);
  }
}

function buildSearchBookmarkLabel(pageTitle, pageUrl) {
  const title = String(pageTitle || "").replace(/\s+/g, " ").trim();
  const normalizedTitle = title.replace(/\s*-\s*Trove$/i, "").trim();
  try {
    const url = new URL(pageUrl);
    const candidates = [
      url.searchParams.get("keyword"),
      url.searchParams.get("q"),
      url.searchParams.get("query"),
      url.searchParams.get("searcharg"),
      url.searchParams.get("SearchTerm")
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const query = candidates[0] || "";
    const facets = [
      url.searchParams.get("l-state"),
      url.searchParams.get("l-decade"),
      url.searchParams.get("date.from")
        ? `from ${url.searchParams.get("date.from")}`
        : "",
      url.searchParams.get("date.to")
        ? `to ${url.searchParams.get("date.to")}`
        : "",
      url.pathname.includes("/advanced/") ? "advanced" : ""
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const facetSuffix = facets.length ? ` · ${facets.join(" · ")}` : "";
    if (query) {
      return `${query}${facetSuffix}`;
    }
    if (normalizedTitle) {
      return `${normalizedTitle}${facetSuffix}`;
    }
  } catch {
    // Fall back to the page title.
  }
  return normalizedTitle || "Saved search";
}

function normalizeUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    if ((url.protocol === "http:" && url.hostname === "nla.gov.au") || url.hostname === "nla.gov.au") {
      url.protocol = "https:";
    }
    if (/^(purl|catalogue|encore)\.slwa\.wa\.gov\.au$/i.test(url.hostname)) {
      url.protocol = "https:";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value).trim();
  }
}

function getItemId(item) {
  if (item.id) {
    return String(item.id);
  }

  const url = item.url || item.canonicalUrl || "";
  const articleMatch = url.match(/\/newspaper\/article\/(\d+)/i);
  if (articleMatch) {
    return articleMatch[1];
  }

  const workMatch = url.match(/\/work\/(\d+)/i);
  if (workMatch) {
    return workMatch[1];
  }

  return slugify(url) || `item-${Date.now()}`;
}

function getItemKey(item) {
  const source = item.source || "unknown";
  const type = item.type || "item";
  const id = getItemId(item);
  return `${source}:${type}:${id}`;
}

function safeFileSlug(value, fallback = "item") {
  const slug = slugify(value);
  return slug || fallback;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseTroveCitationDate(citation) {
  const text = String(citation || "");
  const monthNames = "January|February|March|April|May|June|July|August|September|October|November|December";
  const dayMonthYear = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\b`, "i"));
  if (dayMonthYear) {
    return {
      display: `${dayMonthYear[1]} ${dayMonthYear[2]} ${dayMonthYear[3]}`,
      year: Number(dayMonthYear[3])
    };
  }
  const dayMonth = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\b`, "i"));
  const leadingYear = text.match(/^\s*(18\d{2}|19\d{2}|20\d{2})\b/);
  if (dayMonth && leadingYear) {
    return {
      display: `${dayMonth[1]} ${dayMonth[2]} ${leadingYear[1]}`,
      year: Number(leadingYear[1])
    };
  }
  const year = text.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
  if (year) {
    return {
      display: year[1],
      year: Number(year[1])
    };
  }
  return { display: "", year: 0 };
}

function parseTroveCitationNewspaper(citation) {
  const text = String(citation || "").replace(/\s+/g, " ").trim();
  const quoted = text.match(/'[^']+'\s*,\s*([^,]+),/);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }
  const beforePlace = text.match(/^(.+?)\s+\((?:[^)]+)\),\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}/i);
  if (beforePlace?.[1]) {
    return beforePlace[1].replace(/^The\s+/i, "The ").trim();
  }
  return text.split("(")[0].trim().replace(/[,.]+$/g, "");
}

function parseTroveCitationPage(citation) {
  const match = String(citation || "").match(/\bpage\s+([A-Za-z0-9-]+)/i);
  return match?.[1] || "";
}

function buildArticleMetadata(item) {
  if (item.source !== "trove" || item.type !== "newspaper") {
    return {};
  }
  const citation = item.citation || "";
  const parsedDate = parseTroveCitationDate(citation);
  const year = parsedDate.year || 0;
  return {
    newspaperTitle: String(item.newspaperTitle || parseTroveCitationNewspaper(citation) || item.sourceTitle || "").trim(),
    publicationDate: String(item.publicationDate || parsedDate.display || "").trim(),
    publicationYear: year || "",
    publicationDecade: year ? `${Math.floor(year / 10) * 10}s` : "",
    publicationPage: String(item.publicationPage || parseTroveCitationPage(citation) || "").trim()
  };
}

function inferExtension(url, contentType) {
  const typeMap = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/tiff": ".tif",
    "image/gif": ".gif"
  };

  if (contentType && typeMap[contentType.split(";")[0].trim().toLowerCase()]) {
    return typeMap[contentType.split(";")[0].trim().toLowerCase()];
  }

  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    if (ext) {
      return ext.slice(0, 6).toLowerCase();
    }
  } catch {
    return ".jpg";
  }

  return ".jpg";
}

function normalizeIncomingItem(item) {
  const url = normalizeUrl(item.url || item.canonicalUrl || "");
  const source = String(item.source || "unknown").trim().toLowerCase();
  const type = item.type === "image" ? "image" : item.type === "text" ? "text" : "newspaper";
  const id = getItemId({ ...item, url });
  const title = String(item.title || "Untitled").trim();
  const aliases = ensureArray(item.aliases)
    .map((alias) => normalizeUrl(alias))
    .filter(Boolean);
  const attachments = ensureArray(item.attachments)
    .map((entry, index) => {
      const viewerUrl = normalizeUrl(entry.viewerUrl || "");
      const imageUrl = normalizeUrl(entry.imageUrl || "");
      const thumbnailUrl = normalizeUrl(entry.thumbnailUrl || imageUrl);
      const title = String(entry.title || "").trim() || title;
      const entryId =
        String(entry.id || "").trim() ||
        viewerUrl.match(/slwa_([a-z0-9_]+)/i)?.[1] ||
        imageUrl.match(/slwa_([a-z0-9_]+)/i)?.[1] ||
        `${id}-${index + 1}`;
      if (!viewerUrl && !imageUrl && !thumbnailUrl) {
        return null;
      }
      return {
        id: entryId,
        title,
        viewerUrl,
        imageUrl,
        thumbnailUrl
      };
    })
    .filter(Boolean);
  const imageUrls = [
    ...ensureArray(item.imageUrls).map((value) => normalizeUrl(value)).filter(Boolean),
    ...attachments.map((entry) => entry.imageUrl).filter(Boolean)
  ];
  const viewerUrls = [
    ...ensureArray(item.viewerUrls).map((value) => normalizeUrl(value)).filter(Boolean),
    ...attachments.map((entry) => entry.viewerUrl).filter(Boolean)
  ];
  const viewAllUrl = normalizeUrl(item.viewAllUrl || "");
  const primaryImageUrl =
    attachments.find((entry) => entry.imageUrl)?.imageUrl ||
    normalizeUrl(item.imageUrl || "") ||
    imageUrls[0] ||
    attachments[0]?.thumbnailUrl ||
    "";
  const articleMetadata = buildArticleMetadata({
    ...item,
    source,
    type,
    citation: String(item.citation || "").trim(),
    sourceTitle: String(item.sourceTitle || "").trim()
  });

  return {
    ...item,
    source,
    sourceLabel: String(item.sourceLabel || source.toUpperCase()).trim(),
    id,
    key: getItemKey({ source, type, id }),
    type,
    url,
    canonicalUrl: url,
    aliases: [...new Set([url, ...aliases])],
    title,
    citation: String(item.citation || "").trim(),
    description: String(item.description || "").trim(),
    sourceTitle: String(item.sourceTitle || "").trim(),
    fullText: String(item.fullText || "").trim(),
    imageUrl: primaryImageUrl,
    imageUrls: [...new Set(imageUrls)],
    viewerUrls: [...new Set(viewerUrls)],
    viewAllUrl,
    attachments,
    metadataFields: ensureArray(item.metadataFields)
      .map((field) => ({
        label: String(field.label || "").trim(),
        value: String(field.value || "").trim()
      }))
      .filter((field) => field.label && field.value),
    rawMetadata: String(item.rawMetadata || "").trim(),
    ...articleMetadata
  };
}

function createProjectDocument(name) {
  const now = formatDateIso();
  const slug = safeFileSlug(name, "library");
  return {
    name,
    slug,
    createdAt: now,
    updatedAt: now,
    folders: { ...DEFAULT_FOLDERS },
    saved: [],
    ignored: [],
    uncollected: []
  };
}

function createProjectReadme(projectDir, name, projectData) {
  const manifestName = getProjectManifestFilename(projectDir);
  return [
    `# ${name}`,
    "",
    "This is a self-describing research package.",
    "",
    "## Structure",
    "",
    `- \`${manifestName}\`: project metadata, saved items, ignored items, uncollected items, and source aliases.`,
    "- `items.csv`: flat inventory of collected, ignored, and uncollected items for spreadsheets, scripting, and audits.",
    `- \`${projectData.folders.newspapers}/\`: saved markdown captures for text-based records.`,
    `- \`${projectData.folders.images}/\`: saved images plus same-name markdown metadata sidecars.`,
    `- \`${projectData.folders.debug}/\`: reverse-engineering dumps such as page HTML, extracted JSON, and preview markdown.`,
    `- \`${projectData.folders.searches}/\`: saved search URL bookmarks so you can reopen live search pages later.`,
    "",
    "## Preservation",
    "",
    "- The goal is that this folder still makes sense even if the original websites disappear.",
    `- \`${manifestName}\` is the inventory and source map for the package.`,
    "- `items.csv` is the quick ledger of what was collected or ignored.",
    "- Markdown captures keep citations, links, metadata, and extracted text together.",
    "- Image items include both the downloaded binary and a same-name markdown record.",
    "",
    "## Agent Notes",
    "",
    `- Coding agents can read \`${manifestName}\` plus the markdown files directly.`,
    "- Saved markdown is designed to be easy to search, summarize, and transform.",
    "- Image items are represented by a binary asset and a markdown metadata file with the same basename.",
    "- Agents should treat the library as recursive research material: read the saved body, notice strengths, gaps, repeated phrasing, names, places, and themes, then suggest the next search terms from that evidence.",
    "- Save those follow-up search URLs into the library so the path from one tranche of material to the next stays visible.",
    "- Add any project-specific conventions or prompts here if you want Codex or Claude Code to work with this library consistently.",
    ""
  ].join("\n");
}

function getProjectManifestFilename(projectDir) {
  const basename = path.basename(projectDir);
  return basename.endsWith(PROJECT_SUFFIX) ? basename : `${basename}${PROJECT_SUFFIX}`;
}

function getProjectManifestPath(projectDir) {
  return path.join(projectDir, getProjectManifestFilename(projectDir));
}

async function getExistingProjectManifestPath(projectDir) {
  const manifestPath = getProjectManifestPath(projectDir);
  try {
    await fs.access(manifestPath);
    return manifestPath;
  } catch {}

  const legacyPath = path.join(projectDir, LEGACY_PROJECT_FILE);
  try {
    await fs.access(legacyPath);
    return legacyPath;
  } catch {}

  return "";
}

async function isProjectDirectory(projectDir) {
  const manifestPath = await getExistingProjectManifestPath(projectDir);
  return Boolean(manifestPath);
}

async function ensureProjectFolders(projectDir, projectData) {
  await fs.mkdir(projectDir, { recursive: true });
  const folders = { ...DEFAULT_FOLDERS, ...(projectData.folders || {}) };
  await Promise.all(
    Object.values(folders).map((folderName) => fs.mkdir(path.join(projectDir, folderName), { recursive: true }))
  );
  try {
    await fs.access(path.join(projectDir, "README.md"));
  } catch {
    await fs.writeFile(
      path.join(projectDir, "README.md"),
      createProjectReadme(projectDir, projectData.name || "Library", { folders }),
      "utf8"
    );
  }
  projectData.folders = folders;
}

async function writeProject(projectDir, projectData) {
  projectData.updatedAt = formatDateIso();
  await ensureProjectFolders(projectDir, projectData);
  const body = yaml.dump(projectData, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false
  });
  await fs.writeFile(getProjectManifestPath(projectDir), body, "utf8");
  await fs.rm(path.join(projectDir, LEGACY_PROJECT_FILE), { force: true }).catch(() => {});
  await fs.writeFile(path.join(projectDir, "items.csv"), buildInventoryCsv(projectData), "utf8");
}

async function readProject(projectDir) {
  const projectFile = await getExistingProjectManifestPath(projectDir);

  try {
    if (!projectFile) {
      throw Object.assign(new Error("manifest missing"), { code: "ENOENT" });
    }
    const raw = await fs.readFile(projectFile, "utf8");
    const parsed = yaml.load(raw) || {};
    parsed.saved = ensureArray(parsed.saved);
    parsed.ignored = ensureArray(parsed.ignored);
    parsed.uncollected = ensureArray(parsed.uncollected);
    parsed.folders = { ...DEFAULT_FOLDERS, ...(parsed.folders || {}) };
    await ensureProjectFolders(projectDir, parsed);
    return parsed;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    const fallbackName = path.basename(projectDir).replace(/-/g, " ");
    const projectData = createProjectDocument(fallbackName);
    await writeProject(projectDir, projectData);
    return projectData;
  }
}

function toRelative(projectDir, targetPath) {
  return path.relative(projectDir, targetPath).split(path.sep).join("/");
}

function projectSummary(projectDir, projectData) {
  const saved = ensureArray(projectData.saved);
  const ignored = ensureArray(projectData.ignored);
  const uncollected = ensureArray(projectData.uncollected);
  const recentSaved = [...saved]
    .sort((left, right) => String(right.savedAt || "").localeCompare(String(left.savedAt || "")))
    .slice(0, 10);

  return {
    path: projectDir,
    folderName: path.basename(projectDir),
    manifestName: getProjectManifestFilename(projectDir),
    name: projectData.name || path.basename(projectDir),
    createdAt: projectData.createdAt || "",
    updatedAt: projectData.updatedAt || "",
    folders: projectData.folders || { ...DEFAULT_FOLDERS },
    savedCount: saved.length,
    ignoredCount: ignored.length,
    uncollectedCount: uncollected.length,
    counts: {
      newspapers: saved.filter((item) => item.type === "newspaper").length,
      texts: saved.filter((item) => item.type !== "image").length,
      images: saved.filter((item) => item.type === "image").length
    },
    sourceCounts: saved.reduce((accumulator, item) => {
      const source = item.source || "unknown";
      accumulator[source] = (accumulator[source] || 0) + 1;
      return accumulator;
    }, {}),
    saved,
    ignored,
    uncollected,
    recentSaved
  };
}

async function listProjects(rootDir) {
  let entries = [];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const projectDirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const projectDir = path.join(rootDir, entry.name);
    if (await isProjectDirectory(projectDir)) {
      projectDirs.push(projectDir);
    }
  }

  const projects = await Promise.all(
    projectDirs.map(async (projectDir) => {
      const projectData = await readProject(projectDir);
      return projectSummary(projectDir, projectData);
    })
  );

  return projects.sort((left, right) => left.name.localeCompare(right.name));
}

async function createProject(rootDir, name) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new Error("Project name is required.");
  }

  const slug = safeFileSlug(trimmedName, "library");
  let folderName = `${slug}`;
  let attempt = 1;

  while (true) {
    try {
      await fs.access(path.join(rootDir, folderName));
      attempt += 1;
      folderName = `${slug}-${attempt}`;
    } catch {
      break;
    }
  }

  const projectDir = path.join(rootDir, folderName);
  const projectData = createProjectDocument(trimmedName);
  await writeProject(projectDir, projectData);
  return projectSummary(projectDir, projectData);
}

function buildNewspaperMarkdown(item) {
  if (item.source === "wa-museum" || item.source === "agwa") {
    const lines = [
      `# ${item.title}`,
      "",
      `- Citation: ${item.citation || "Not found on page"}`,
      `- Link: ${item.url}`,
      `- Saved: ${formatDateIso()}`,
      `- Source system: ${item.sourceLabel || item.source || "Unknown"}`,
      item.sourceTitle ? `- Collection: ${item.sourceTitle}` : null,
      `- Record ID: ${item.id}`,
      ""
    ].filter(Boolean);

    appendPreferredMetadata(lines, item);

    if (item.description) {
      lines.push("## Description", "", item.description, "");
    }

    appendRemainingMetadata(lines, item);
    return lines.join("\n");
  }

  const sections = [
    `# ${item.title}`,
    "",
    `- Citation: ${item.citation || "Not found on page"}`,
    `- Link: ${item.url}`,
    `- Saved: ${formatDateIso()}`,
    `- Source system: ${item.sourceLabel || item.source || "Unknown"}`,
    item.sourceTitle ? `- Collection: ${item.sourceTitle}` : null,
    `- Record ID: ${item.id}`,
    ""
  ].filter(Boolean);

  if (item.description) {
    sections.push("## Summary", "", item.description, "");
  }

  const articleMetadata = buildArticleMetadata(item);
  const facts = [
    articleMetadata.newspaperTitle ? `- Newspaper: ${articleMetadata.newspaperTitle}` : null,
    articleMetadata.publicationDate ? `- Publication date: ${articleMetadata.publicationDate}` : null,
    articleMetadata.publicationDecade ? `- Decade: ${articleMetadata.publicationDecade}` : null,
    articleMetadata.publicationPage ? `- Page: ${articleMetadata.publicationPage}` : null
  ].filter(Boolean);
  if (facts.length) {
    sections.push("## Article Metadata", "", ...facts, "");
  }

  sections.push("## Full Text", "", item.fullText || "_No text could be extracted from this page._", "");
  return sections.join("\n");
}

function getPreferredMetadataFields(item) {
  if (item.source !== "wa-museum") {
    return [];
  }

  const preferredOrder = [
    "site location",
    "site area code",
    "number of items",
    "material",
    "registration number",
    "id",
    "status"
  ];
  const byLabel = new Map((item.metadataFields || []).map((field) => [String(field.label || "").trim().toLowerCase(), field]));
  return preferredOrder.map((key) => byLabel.get(key)).filter(Boolean);
}

function appendPreferredMetadata(lines, item) {
  const preferred = getPreferredMetadataFields(item);
  if (!preferred.length) {
    return;
  }

  lines.push("## Key Facts", "");
  for (const field of preferred) {
    lines.push(`- ${field.label}: ${field.value}`);
  }
  lines.push("");
}

function appendRemainingMetadata(lines, item) {
  const metadataFields = ensureArray(item.metadataFields);
  if (!metadataFields.length) {
    if (item.rawMetadata) {
      lines.push("## Metadata", "", item.rawMetadata, "");
    }
    return;
  }

  const preferredLabels = new Set(getPreferredMetadataFields(item).map((field) => String(field.label || "").trim().toLowerCase()));
  const remaining = metadataFields.filter((field) => !preferredLabels.has(String(field.label || "").trim().toLowerCase()));
  if (!remaining.length) {
    return;
  }

  lines.push("## Metadata", "");
  for (const field of remaining) {
    lines.push(`- ${field.label}: ${field.value}`);
  }
  lines.push("");
}

function normalizeComparableText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function descriptionDuplicatesMetadata(item) {
  const description = normalizeComparableText(item.description);
  if (!description) {
    return false;
  }
  const metadataText = normalizeComparableText(
    ensureArray(item.metadataFields)
      .map((field) => `${field.label}: ${field.value}`)
      .join(" ")
  );
  return Boolean(metadataText) && description === metadataText;
}

function buildImageMarkdown(item, assetFilenames) {
  const files = ensureArray(assetFilenames).filter(Boolean);
  const lines = [
    `# ${item.title}`,
    "",
    `- Citation: ${item.citation || "Not found on page"}`,
    `- Link: ${item.url}`,
    `- Saved: ${formatDateIso()}`,
    `- Source system: ${item.sourceLabel || item.source || "Unknown"}`,
    `- Record ID: ${item.id}`,
    ""
  ];

  if (item.sourceTitle) {
    lines.splice(6, 0, `- Collection: ${item.sourceTitle}`);
  }

  if (files.length === 1) {
    lines.splice(item.sourceTitle ? 7 : 6, 0, `- Image file: ${files[0]}`);
  } else if (files.length > 1) {
    lines.splice(item.sourceTitle ? 7 : 6, 0, `- Image files: ${files.join(", ")}`);
  }

  if (item.description && !descriptionDuplicatesMetadata(item)) {
    lines.push("## Description", "", item.description, "");
  }

  appendPreferredMetadata(lines, item);
  appendRemainingMetadata(lines, item);

  return lines.join("\n");
}

function buildPreviewMarkdown(incomingItem) {
  const item = normalizeIncomingItem(incomingItem);
  if (item.type === "image") {
    const imageNames = (item.imageUrls.length ? item.imageUrls : [item.imageUrl])
      .filter(Boolean)
      .map((value, index) => {
        try {
          return path.basename(new URL(value).pathname || `image-${index + 1}.jpg`) || `image-${index + 1}.jpg`;
        } catch {
          return path.basename(value) || `image-${index + 1}.jpg`;
        }
      });
    return buildImageMarkdown(item, imageNames);
  }
  return buildNewspaperMarkdown(item);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildInventoryCsv(projectData) {
  const header = [
    "status",
    "source",
    "source_label",
    "type",
    "id",
    "title",
    "url",
    "aliases",
    "citation",
    "newspaper_title",
    "publication_date",
    "publication_year",
    "publication_decade",
    "publication_page",
    "file",
    "asset_file",
    "metadata_file",
    "saved_at",
    "ignored_at",
    "uncollected_at"
  ];

  const rows = [
    ...ensureArray(projectData.saved).map((item) => ({
      status: "saved",
      source: item.source || "",
      source_label: item.sourceLabel || "",
      type: item.type || "",
      id: item.id || "",
      title: item.title || "",
      url: item.url || "",
      aliases: ensureArray(item.aliases).join(" | "),
      citation: item.citation || "",
      newspaper_title: item.newspaperTitle || "",
      publication_date: item.publicationDate || "",
      publication_year: item.publicationYear || "",
      publication_decade: item.publicationDecade || "",
      publication_page: item.publicationPage || "",
      file: item.file || "",
      asset_file: ensureArray(item.assetFiles).length ? ensureArray(item.assetFiles).join(" | ") : item.assetFile || "",
      metadata_file: ensureArray(item.metadataFiles).length ? ensureArray(item.metadataFiles).join(" | ") : item.metadataFile || "",
      saved_at: item.savedAt || "",
      ignored_at: "",
      uncollected_at: ""
    })),
    ...ensureArray(projectData.ignored).map((item) => ({
      status: "ignored",
      source: item.source || "",
      source_label: item.sourceLabel || "",
      type: item.type || "",
      id: item.id || "",
      title: item.title || "",
      url: item.url || "",
      aliases: ensureArray(item.aliases).join(" | "),
      citation: item.citation || "",
      newspaper_title: item.newspaperTitle || "",
      publication_date: item.publicationDate || "",
      publication_year: item.publicationYear || "",
      publication_decade: item.publicationDecade || "",
      publication_page: item.publicationPage || "",
      file: "",
      asset_file: "",
      metadata_file: "",
      saved_at: "",
      ignored_at: item.ignoredAt || "",
      uncollected_at: ""
    })),
    ...ensureArray(projectData.uncollected).map((item) => ({
      status: "uncollected",
      source: item.source || "",
      source_label: item.sourceLabel || "",
      type: item.type || "",
      id: item.id || "",
      title: item.title || "",
      url: item.url || "",
      aliases: ensureArray(item.aliases).join(" | "),
      citation: item.citation || "",
      newspaper_title: item.newspaperTitle || "",
      publication_date: item.publicationDate || "",
      publication_year: item.publicationYear || "",
      publication_decade: item.publicationDecade || "",
      publication_page: item.publicationPage || "",
      file: "",
      asset_file: "",
      metadata_file: "",
      saved_at: "",
      ignored_at: "",
      uncollected_at: item.uncollectedAt || ""
    }))
  ];

  return [
    header.join(","),
    ...rows.map((row) => header.map((key) => escapeCsv(row[key])).join(","))
  ].join("\n");
}

async function writeUniqueFile(folderPath, baseName, extension, content, encoding = "utf8") {
  let candidate = `${baseName}${extension}`;
  let counter = 1;

  while (true) {
    const fullPath = path.join(folderPath, candidate);
    try {
      await fs.access(fullPath);
      counter += 1;
      candidate = `${baseName}-${counter}${extension}`;
    } catch {
      await fs.writeFile(fullPath, content, encoding);
      return fullPath;
    }
  }
}

async function downloadImageBuffer(url) {
  await paceHostRequest(url);
  const response = await fetch(url, {
    headers: {
      "user-agent": BROWSER_USER_AGENT,
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "accept-language": "en-AU,en;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`Image download failed with ${response.status}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error(`Image download returned non-image content type: ${contentType || "unknown"}.`);
  }
  if (!buffer.length) {
    throw new Error("Image download returned an empty file.");
  }
  return {
    buffer,
    contentType
  };
}

function replaceByKey(entries, nextEntry) {
  const filtered = entries.filter((entry) => entry.key !== nextEntry.key);
  filtered.push(nextEntry);
  return filtered;
}

function entryProjectFiles(entry) {
  if (!entry) {
    return [];
  }
  return [
    ...(entry.file ? [entry.file] : []),
    ...(ensureArray(entry.assetFiles).length ? ensureArray(entry.assetFiles) : entry.assetFile ? [entry.assetFile] : []),
    ...(ensureArray(entry.metadataFiles).length ? ensureArray(entry.metadataFiles) : entry.metadataFile ? [entry.metadataFile] : [])
  ].filter(Boolean);
}

async function removeEntryFiles(projectDir, entry) {
  const targets = [...new Set(entryProjectFiles(entry))];
  await Promise.all(
    targets.map(async (target) => {
      try {
        await fs.rm(path.join(projectDir, target), { force: true });
      } catch {
        // Best-effort cleanup only.
      }
    })
  );
}

async function saveItem(projectDir, incomingItem, onProgress) {
  const item = normalizeIncomingItem(incomingItem);
  const projectData = await readProject(projectDir);
  const folders = projectData.folders || DEFAULT_FOLDERS;
  const now = formatDateIso();
  const existingSavedEntry = ensureArray(projectData.saved).find((entry) => entry.key === item.key) || null;

  projectData.ignored = ensureArray(projectData.ignored).filter((entry) => entry.key !== item.key);
  projectData.uncollected = ensureArray(projectData.uncollected).filter((entry) => entry.key !== item.key);
  if (existingSavedEntry) {
    await removeEntryFiles(projectDir, existingSavedEntry);
  }

  if (item.type !== "image") {
    const folderPath = path.join(projectDir, folders.newspapers);
    const fileBase = `${safeFileSlug(item.title, "article")}-${safeFileSlug(item.id, "item")}`;
    const markdownPath = await writeUniqueFile(folderPath, fileBase, ".md", buildNewspaperMarkdown(item));
    const savedEntry = {
      key: item.key,
      source: item.source,
      sourceLabel: item.sourceLabel,
      id: item.id,
      type: item.type,
      title: item.title,
      url: item.url,
      aliases: item.aliases,
      citation: item.citation,
      sourceTitle: item.sourceTitle,
      description: item.description,
      metadataFields: item.metadataFields,
      rawMetadata: item.rawMetadata,
      newspaperTitle: item.newspaperTitle,
      publicationDate: item.publicationDate,
      publicationYear: item.publicationYear,
      publicationDecade: item.publicationDecade,
      publicationPage: item.publicationPage,
      file: toRelative(projectDir, markdownPath),
      savedAt: now
    };

    projectData.saved = replaceByKey(ensureArray(projectData.saved), savedEntry);
    await writeProject(projectDir, projectData);
    return projectSummary(projectDir, projectData);
  }

  if (!item.imageUrl) {
    throw new Error("This page does not expose a downloadable image.");
  }

  const folderPath = path.join(projectDir, folders.images);
  const fileBase = `${safeFileSlug(item.title, "image")}-${safeFileSlug(item.id, "item")}`;
  const imageTargets =
    item.attachments.filter((entry) => entry.imageUrl).length
      ? item.attachments.filter((entry) => entry.imageUrl)
      : [{ id: item.id, title: item.title, imageUrl: item.imageUrl, viewerUrl: item.url, thumbnailUrl: item.imageUrl }];
  const assetPaths = [];
  const metadataPaths = [];
  const progress = typeof onProgress === "function" ? onProgress : () => {};

  progress({
    key: item.key,
    url: item.url,
    aliases: item.aliases,
    type: item.type,
    title: item.title,
    phase: "start",
    current: 0,
    total: imageTargets.length
  });

  for (let index = 0; index < imageTargets.length; index += 1) {
    const target = imageTargets[index];
    const targetItem = normalizeIncomingItem({
      ...item,
      id: target.id || `${item.id}-${index + 1}`,
      title: target.title || item.title,
      url: target.viewerUrl || item.url,
      imageUrl: target.imageUrl,
      imageUrls: [target.imageUrl].filter(Boolean),
      attachments: [target]
    });
    try {
      progress({
        key: item.key,
        url: item.url,
        aliases: item.aliases,
        type: item.type,
        title: item.title,
        attachmentTitle: targetItem.title,
        phase: "downloading",
        current: index + 1,
        total: imageTargets.length
      });
      const imageBuffer = await downloadImageBuffer(target.imageUrl);
      const extension = inferExtension(target.imageUrl, imageBuffer.contentType);
      const indexedBase =
        imageTargets.length > 1
          ? `${safeFileSlug(targetItem.title, "image")}-${safeFileSlug(targetItem.id, "item")}`
          : fileBase;
      const assetPath = await writeUniqueFile(folderPath, indexedBase, extension, imageBuffer.buffer, undefined);
      const metadataPath = await writeUniqueFile(
        folderPath,
        path.basename(assetPath, extension),
        ".md",
        buildImageMarkdown(targetItem, [path.basename(assetPath)])
      );
      assetPaths.push(assetPath);
      metadataPaths.push(metadataPath);
      progress({
        key: item.key,
        url: item.url,
        aliases: item.aliases,
        type: item.type,
        title: item.title,
        attachmentTitle: targetItem.title,
        phase: "saved",
        current: index + 1,
        total: imageTargets.length
      });
    } catch {
      // Skip broken upstream attachments rather than writing empty or non-image files.
      progress({
        key: item.key,
        url: item.url,
        aliases: item.aliases,
        type: item.type,
        title: item.title,
        attachmentTitle: targetItem.title,
        phase: "skipped",
        current: index + 1,
        total: imageTargets.length
      });
    }
  }

  if (!assetPaths.length || !metadataPaths.length) {
    throw new Error("This image record did not expose a valid downloadable image.");
  }

  const savedEntry = {
    key: item.key,
    source: item.source,
    sourceLabel: item.sourceLabel,
    id: item.id,
    type: item.type,
    title: item.title,
    url: item.url,
    aliases: item.aliases,
    citation: item.citation,
    imageUrl: item.imageUrl,
    imageUrls: item.imageUrls,
    assetFile: assetPaths[0] ? toRelative(projectDir, assetPaths[0]) : "",
    metadataFile: metadataPaths[0] ? toRelative(projectDir, metadataPaths[0]) : "",
    assetFiles: assetPaths.map((assetPath) => toRelative(projectDir, assetPath)),
    metadataFiles: metadataPaths.map((metadataPath) => toRelative(projectDir, metadataPath)),
    savedAt: now
  };

  projectData.saved = replaceByKey(ensureArray(projectData.saved), savedEntry);
  await writeProject(projectDir, projectData);
  progress({
    key: item.key,
    url: item.url,
    aliases: item.aliases,
    type: item.type,
    title: item.title,
    phase: "complete",
    current: assetPaths.length,
    total: imageTargets.length
  });
  return projectSummary(projectDir, projectData);
}

async function ignoreItem(projectDir, incomingItem) {
  const item = normalizeIncomingItem(incomingItem);
  const projectData = await readProject(projectDir);
  const existingSavedEntry = ensureArray(projectData.saved).find((entry) => entry.key === item.key) || null;
  const ignoredEntry = {
    key: item.key,
    source: item.source,
    sourceLabel: item.sourceLabel,
    id: item.id,
    type: item.type,
    title: item.title,
    url: item.url,
    aliases: item.aliases,
    citation: item.citation,
    ignoredAt: formatDateIso()
  };

  if (existingSavedEntry) {
    await removeEntryFiles(projectDir, existingSavedEntry);
  }
  projectData.saved = ensureArray(projectData.saved).filter((entry) => entry.key !== item.key);
  projectData.uncollected = ensureArray(projectData.uncollected).filter((entry) => entry.key !== item.key);
  projectData.ignored = replaceByKey(ensureArray(projectData.ignored), ignoredEntry);
  await writeProject(projectDir, projectData);
  return projectSummary(projectDir, projectData);
}

async function uncollectItem(projectDir, incomingItem) {
  const item = normalizeIncomingItem(incomingItem);
  const projectData = await readProject(projectDir);
  const existingSavedEntry = ensureArray(projectData.saved).find((entry) => entry.key === item.key) || null;
  const uncollectedEntry = {
    key: item.key,
    source: existingSavedEntry?.source || item.source,
    sourceLabel: existingSavedEntry?.sourceLabel || item.sourceLabel,
    id: existingSavedEntry?.id || item.id,
    type: existingSavedEntry?.type || item.type,
    title: existingSavedEntry?.title || item.title,
    url: existingSavedEntry?.url || item.url,
    aliases: existingSavedEntry?.aliases || item.aliases,
    citation: existingSavedEntry?.citation || item.citation,
    sourceTitle: existingSavedEntry?.sourceTitle || item.sourceTitle,
    description: existingSavedEntry?.description || item.description,
    metadataFields: existingSavedEntry?.metadataFields || item.metadataFields,
    rawMetadata: existingSavedEntry?.rawMetadata || item.rawMetadata,
    newspaperTitle: existingSavedEntry?.newspaperTitle || item.newspaperTitle,
    publicationDate: existingSavedEntry?.publicationDate || item.publicationDate,
    publicationYear: existingSavedEntry?.publicationYear || item.publicationYear,
    publicationDecade: existingSavedEntry?.publicationDecade || item.publicationDecade,
    publicationPage: existingSavedEntry?.publicationPage || item.publicationPage,
    uncollectedAt: formatDateIso()
  };

  if (existingSavedEntry) {
    await removeEntryFiles(projectDir, existingSavedEntry);
  }

  projectData.saved = ensureArray(projectData.saved).filter((entry) => entry.key !== item.key);
  projectData.uncollected = replaceByKey(ensureArray(projectData.uncollected), uncollectedEntry);
  await writeProject(projectDir, projectData);
  return projectSummary(projectDir, projectData);
}

async function unignoreItem(projectDir, incomingItem) {
  const item = normalizeIncomingItem(incomingItem);
  const projectData = await readProject(projectDir);
  projectData.ignored = ensureArray(projectData.ignored).filter((entry) => entry.key !== item.key);
  await writeProject(projectDir, projectData);
  return projectSummary(projectDir, projectData);
}

async function saveDebugCapture(targetDir, capture) {
  const folderPath = path.join(targetDir, DEFAULT_FOLDERS.debug);
  await fs.mkdir(folderPath, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = safeFileSlug(capture.title || capture.url || "page", "page");
  const base = `${stamp}-${slug}`;
  const written = {};

  if (capture.pageHtml) {
    const htmlPath = path.join(folderPath, `${base}.html`);
    await fs.writeFile(htmlPath, capture.pageHtml, "utf8");
    written.html = htmlPath;
  }

  if (capture.itemJson) {
    const jsonPath = path.join(folderPath, `${base}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(capture.itemJson, null, 2), "utf8");
    written.json = jsonPath;
  }

  if (capture.previewMarkdown) {
    const markdownPath = path.join(folderPath, `${base}.md`);
    await fs.writeFile(markdownPath, capture.previewMarkdown, "utf8");
    written.markdown = markdownPath;
  }

  if (capture.notes) {
    const notePath = path.join(folderPath, `${base}.txt`);
    await fs.writeFile(notePath, capture.notes, "utf8");
    written.notes = notePath;
  }

  return written;
}

function buildSearchResultsCsv(searchExport) {
  const header = ["position", "title", "url", "source_page", "source_title", "saved_at"];
  const rows = ensureArray(searchExport.rows).map((row, index) => ({
    position: row.position || index + 1,
    title: row.title || "",
    url: row.url || "",
    source_page: searchExport.pageUrl || "",
    source_title: searchExport.pageTitle || "",
    saved_at: formatDateIso()
  }));

  return [header.join(","), ...rows.map((row) => header.map((key) => escapeCsv(row[key])).join(","))].join("\n");
}

async function saveSearchResults(projectDir, searchExport) {
  const projectData = await readProject(projectDir);
  const pageUrl = String(searchExport?.pageUrl || "").trim();
  if (!pageUrl) {
    throw new Error("No search URL was available for this page.");
  }

  const folderPath = path.join(projectDir, projectData.folders?.searches || DEFAULT_FOLDERS.searches);
  await fs.mkdir(folderPath, { recursive: true });
  const label = buildSearchBookmarkLabel(searchExport.pageTitle || "", pageUrl);
  const titleBase = safeFileSlug(label, "search");
  const filePath = await writeUniqueFile(
    folderPath,
    titleBase,
    ".url.txt",
    `${label}\n${pageUrl}\n`
  );
  return {
    path: filePath,
    file: toRelative(projectDir, filePath),
    count: 1,
    url: pageUrl,
    label
  };
}

async function readSavedSearchBookmark(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return { label: "", url: "" };
  }
  if (lines.length === 1 && /^https?:\/\//i.test(lines[0])) {
    return {
      label: buildSearchBookmarkLabel("", lines[0]),
      url: lines[0]
    };
  }
  const label = lines[0];
  const url = lines.find((line) => /^https?:\/\//i.test(line)) || "";
  return {
    label: label || buildSearchBookmarkLabel("", url),
    url
  };
}

async function readLegacySearchCsvUrl(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      return "";
    }
    const header = lines[0].split(",");
    const sourcePageIndex = header.indexOf("source_page");
    if (sourcePageIndex >= 0) {
      const row = lines[1].split(",");
      return String(row[sourcePageIndex] || "").replace(/^"|"$/g, "").trim();
    }
    return "";
  } catch {
    return "";
  }
}

async function listSearchExports(projectDir) {
  const projectData = await readProject(projectDir);
  const folderPath = path.join(projectDir, projectData.folders?.searches || DEFAULT_FOLDERS.searches);
  let entries = [];
  try {
    entries = await fs.readdir(folderPath, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && (/\.url\.txt$/i.test(entry.name) || /\.csv$/i.test(entry.name)))
      .map(async (entry) => {
        const absolutePath = path.join(folderPath, entry.name);
        const stats = await fs.stat(absolutePath);
        let url = "";
        let label = "";
        if (/\.url\.txt$/i.test(entry.name)) {
          const bookmark = await readSavedSearchBookmark(absolutePath);
          url = bookmark.url;
          label = bookmark.label;
        } else {
          url = await readLegacySearchCsvUrl(absolutePath);
          label = buildSearchBookmarkLabel(entry.name.replace(/\.csv$/i, ""), url);
        }
        return {
          name: entry.name,
          label: label || buildSearchBookmarkLabel(entry.name.replace(/\.url\.txt$/i, "").replace(/\.csv$/i, ""), url),
          path: absolutePath,
          relativePath: toRelative(projectDir, absolutePath),
          modifiedAt: stats.mtime.toISOString(),
          url
        };
      })
  );

  return files.sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
}

async function deleteSearchExport(projectDir, searchPath) {
  const projectData = await readProject(projectDir);
  const folderPath = path.join(projectDir, projectData.folders?.searches || DEFAULT_FOLDERS.searches);
  const resolvedFolderPath = path.resolve(folderPath);
  const resolvedSearchPath = path.resolve(String(searchPath || ""));
  if (!resolvedSearchPath.startsWith(`${resolvedFolderPath}${path.sep}`) && resolvedSearchPath !== resolvedFolderPath) {
    throw new Error("Saved search path is outside this library.");
  }
  await fs.unlink(resolvedSearchPath);
}

module.exports = {
  createProject,
  listProjects,
  isProjectDirectory,
  saveItem,
  ignoreItem,
  uncollectItem,
  unignoreItem,
  buildPreviewMarkdown,
  saveDebugCapture,
  saveSearchResults,
  listSearchExports,
  deleteSearchExport
};
