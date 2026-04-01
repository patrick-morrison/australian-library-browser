const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");

const PROJECT_SUFFIX = ".trovelibrary";
const PROJECT_FILE = "project.yaml";
const DEFAULT_FOLDERS = {
  newspapers: "newspapers",
  images: "images",
  debug: "debug"
};
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

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
    rawMetadata: String(item.rawMetadata || "").trim()
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

function createProjectReadme(name, projectData) {
  return [
    `# ${name}`,
    "",
    "This is a self-describing `.trovelibrary` research package.",
    "",
    "## Structure",
    "",
    `- \`project.yaml\`: project metadata, saved items, ignored items, uncollected items, and source aliases.`,
    "- `items.csv`: flat inventory of collected, ignored, and uncollected items for spreadsheets, scripting, and audits.",
    `- \`${projectData.folders.newspapers}/\`: saved markdown captures for text-based records.`,
    `- \`${projectData.folders.images}/\`: saved images plus same-name markdown metadata sidecars.`,
    `- \`${projectData.folders.debug}/\`: reverse-engineering dumps such as page HTML, extracted JSON, and preview markdown.`,
    "",
    "## Preservation",
    "",
    "- The goal is that this folder still makes sense even if the original websites disappear.",
    "- `project.yaml` is the inventory and source map for the package.",
    "- `items.csv` is the quick ledger of what was collected or ignored.",
    "- Markdown captures keep citations, links, metadata, and extracted text together.",
    "- Image items include both the downloaded binary and a same-name markdown record.",
    "",
    "## Agent Notes",
    "",
    "- Coding agents can read `project.yaml` plus the markdown files directly.",
    "- Saved markdown is designed to be easy to search, summarize, and transform.",
    "- Image items are represented by a binary asset and a markdown metadata file with the same basename.",
    "- Add any project-specific conventions or prompts here if you want Codex or Claude Code to work with this library consistently.",
    ""
  ].join("\n");
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
    await fs.writeFile(path.join(projectDir, "README.md"), createProjectReadme(projectData.name || "Library", { folders }), "utf8");
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
  await fs.writeFile(path.join(projectDir, PROJECT_FILE), body, "utf8");
  await fs.writeFile(path.join(projectDir, "items.csv"), buildInventoryCsv(projectData), "utf8");
}

async function readProject(projectDir) {
  const projectFile = path.join(projectDir, PROJECT_FILE);

  try {
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

    const fallbackName = path.basename(projectDir, PROJECT_SUFFIX).replace(/-/g, " ");
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
    name: projectData.name || path.basename(projectDir, PROJECT_SUFFIX),
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
  const projectDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(PROJECT_SUFFIX))
    .map((entry) => path.join(rootDir, entry.name));

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
  let folderName = `${slug}${PROJECT_SUFFIX}`;
  let attempt = 1;

  while (true) {
    try {
      await fs.access(path.join(rootDir, folderName));
      attempt += 1;
      folderName = `${slug}-${attempt}${PROJECT_SUFFIX}`;
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
  if (item.source === "wa-museum") {
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

  if (item.description) {
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
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") || ""
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

async function saveItem(projectDir, incomingItem) {
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
    const fileBase = `${safeFileSlug(item.title, "article")}-${item.id}`;
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
  const fileBase = `${safeFileSlug(item.title, "image")}-${item.id}`;
  const imageTargets =
    item.attachments.filter((entry) => entry.imageUrl).length
      ? item.attachments.filter((entry) => entry.imageUrl)
      : [{ id: item.id, title: item.title, imageUrl: item.imageUrl, viewerUrl: item.url, thumbnailUrl: item.imageUrl }];
  const assetPaths = [];
  const metadataPaths = [];

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
    const imageBuffer = await downloadImageBuffer(target.imageUrl);
    const extension = inferExtension(target.imageUrl, imageBuffer.contentType);
    const indexedBase =
      imageTargets.length > 1
        ? `${safeFileSlug(targetItem.title, "image")}-${targetItem.id}`
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

module.exports = {
  createProject,
  listProjects,
  saveItem,
  ignoreItem,
  uncollectItem,
  unignoreItem,
  buildPreviewMarkdown,
  saveDebugCapture
};
