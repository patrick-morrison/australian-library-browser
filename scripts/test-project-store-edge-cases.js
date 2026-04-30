#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const yaml = require("js-yaml");

const projectStore = require("../lib/project-store");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function listFiles(root) {
  const entries = await fs.readdir(root);
  return entries.sort();
}

async function readProject(projectPath) {
  const manifestPath = path.join(projectPath, `${path.basename(projectPath)}.trovelibrary`);
  let raw = "";
  try {
    raw = await fs.readFile(manifestPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    raw = await fs.readFile(path.join(projectPath, "project.yaml"), "utf8");
  }
  return yaml.load(raw) || {};
}

async function testDuplicateNewspaperSave(rootDir) {
  const project = await projectStore.createProject(rootDir, "Duplicate Newspaper");
  const item = {
    source: "trove",
    sourceLabel: "Trove",
    type: "newspaper",
    id: "12345",
    title: "Duplicate Wellington Dam Article",
    url: "https://trove.nla.gov.au/newspaper/article/12345",
    aliases: ["https://trove.nla.gov.au/newspaper/article/12345"],
    citation: "Synthetic citation",
    description: "Synthetic description",
    fullText: "Synthetic full text"
  };

  await projectStore.saveItem(project.path, item);
  await projectStore.saveItem(project.path, item);

  const files = await listFiles(path.join(project.path, "newspapers"));
  const projectData = await readProject(project.path);
  assert(files.length === 1, `expected one markdown file after duplicate save, got ${files.length}`);
  assert((projectData.saved || []).length === 1, "duplicate newspaper save should keep one saved entry");
}

async function testDuplicateImageSave(rootDir) {
  const project = await projectStore.createProject(rootDir, "Duplicate Image");
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? "image/png" : null;
      }
    },
    async arrayBuffer() {
      return Uint8Array.from([137, 80, 78, 71]).buffer;
    }
  });

  try {
    const item = {
      source: "slwa",
      sourceLabel: "SLWA",
      type: "image",
      id: "b3507746",
      title: "Duplicate Swan River Image",
      url: "https://purl.slwa.wa.gov.au/slwa_b3507746_1",
      aliases: ["https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb3507746?lang=eng&suite=def"],
      citation: "Synthetic image citation",
      imageUrl: "https://purl.slwa.wa.gov.au/download/slwa_b3507746_1.png",
      attachments: [
        {
          id: "b3507746_1",
          title: "Duplicate Swan River Image",
          viewerUrl: "https://purl.slwa.wa.gov.au/slwa_b3507746_1",
          imageUrl: "https://purl.slwa.wa.gov.au/download/slwa_b3507746_1.png",
          thumbnailUrl: "https://purl.slwa.wa.gov.au/download/slwa_b3507746_1.png"
        }
      ]
    };

    await projectStore.saveItem(project.path, item);
    await projectStore.saveItem(project.path, item);

    const files = await listFiles(path.join(project.path, "images"));
    const imageFiles = files.filter((file) => file.endsWith(".png"));
    const markdownFiles = files.filter((file) => file.endsWith(".md"));
    const projectData = await readProject(project.path);
    assert(imageFiles.length === 1, `expected one image asset after duplicate image save, got ${imageFiles.length}`);
    assert(markdownFiles.length === 1, `expected one sidecar after duplicate image save, got ${markdownFiles.length}`);
    assert((projectData.saved || []).length === 1, "duplicate image save should keep one saved entry");
  } finally {
    global.fetch = originalFetch;
  }
}

async function testIgnoreRemovesSavedFiles(rootDir) {
  const project = await projectStore.createProject(rootDir, "Ignore Cleanup");
  const item = {
    source: "trove",
    sourceLabel: "Trove",
    type: "newspaper",
    id: "54321",
    title: "Ignored Wellington Dam Article",
    url: "https://trove.nla.gov.au/newspaper/article/54321",
    aliases: ["https://trove.nla.gov.au/newspaper/article/54321"],
    citation: "Synthetic citation",
    description: "Synthetic description",
    fullText: "Synthetic full text"
  };

  await projectStore.saveItem(project.path, item);
  await projectStore.ignoreItem(project.path, item);

  const files = await listFiles(path.join(project.path, "newspapers"));
  const projectData = await readProject(project.path);
  assert(files.length === 0, `expected saved markdown to be removed on ignore, got ${files.length} files`);
  assert((projectData.saved || []).length === 0, "ignored item should be removed from saved inventory");
  assert((projectData.ignored || []).length === 1, "ignored item should be added to ignored inventory");
}

async function testUncollectRemovesSavedEntry(rootDir) {
  const project = await projectStore.createProject(rootDir, "Uncollect Cleanup");
  const item = {
    source: "trove",
    sourceLabel: "Trove",
    type: "newspaper",
    id: "67890",
    title: "Collected Then Removed",
    url: "https://trove.nla.gov.au/newspaper/article/67890",
    aliases: ["https://trove.nla.gov.au/newspaper/article/67890"],
    citation: "Synthetic citation",
    description: "Synthetic description",
    fullText: "Synthetic full text"
  };

  await projectStore.saveItem(project.path, item);
  await projectStore.uncollectItem(project.path, item);

  const files = await listFiles(path.join(project.path, "newspapers"));
  const projectData = await readProject(project.path);
  assert(files.length === 0, `expected saved markdown to be removed on uncollect, got ${files.length} files`);
  assert((projectData.saved || []).length === 0, "uncollect should remove the item from saved inventory");
  assert((projectData.uncollected || []).length === 1, "uncollect should retain the item in uncollected inventory");
}

async function testUnignoreRemovesIgnoredEntry(rootDir) {
  const project = await projectStore.createProject(rootDir, "Unignore Cleanup");
  const item = {
    source: "trove",
    sourceLabel: "Trove",
    type: "newspaper",
    id: "98765",
    title: "Ignored Then Restored",
    url: "https://trove.nla.gov.au/newspaper/article/98765",
    aliases: ["https://trove.nla.gov.au/newspaper/article/98765"],
    citation: "Synthetic citation",
    description: "Synthetic description",
    fullText: "Synthetic full text"
  };

  await projectStore.ignoreItem(project.path, item);
  await projectStore.unignoreItem(project.path, item);

  const projectData = await readProject(project.path);
  assert((projectData.ignored || []).length === 0, "unignore should remove the item from ignored inventory");
}

async function testResaveClearsUncollectedEntry(rootDir) {
  const project = await projectStore.createProject(rootDir, "Resave Clears Uncollected");
  const item = {
    source: "trove",
    sourceLabel: "Trove",
    type: "newspaper",
    id: "11223",
    title: "Recollected Article",
    url: "https://trove.nla.gov.au/newspaper/article/11223",
    aliases: ["https://trove.nla.gov.au/newspaper/article/11223"],
    citation: "Synthetic citation",
    description: "Synthetic description",
    fullText: "Synthetic full text"
  };

  await projectStore.saveItem(project.path, item);
  await projectStore.uncollectItem(project.path, item);
  await projectStore.saveItem(project.path, item);

  const projectData = await readProject(project.path);
  assert((projectData.saved || []).length === 1, "resave should restore the saved entry");
  assert((projectData.uncollected || []).length === 0, "resave should clear the uncollected entry");
}

async function main() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "australian-library-browser-store-"));
  try {
    await testDuplicateNewspaperSave(rootDir);
    await testDuplicateImageSave(rootDir);
    await testIgnoreRemovesSavedFiles(rootDir);
    await testUncollectRemovesSavedEntry(rootDir);
    await testUnignoreRemovesIgnoredEntry(rootDir);
    await testResaveClearsUncollectedEntry(rootDir);
    console.log("Project store edge cases passed.");
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
