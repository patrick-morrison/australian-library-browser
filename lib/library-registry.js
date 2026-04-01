const fs = require("fs/promises");
const os = require("os");
const path = require("path");

function getRegistryPath() {
  return process.env.TROVE_BROWSER_REGISTRY_PATH || path.join(os.homedir(), ".trove-browser", "library-directories.json");
}

async function readLibraryDirectories() {
  try {
    const raw = await fs.readFile(getRegistryPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.directories) ? parsed.directories : [];
  } catch {
    return [];
  }
}

async function writeLibraryDirectories(directories) {
  const registryPath = getRegistryPath();
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(
    registryPath,
    JSON.stringify({ directories: [...new Set(directories.filter(Boolean))] }, null, 2),
    "utf8"
  );
}

async function registerLibraryDirectory(directory) {
  const directories = await readLibraryDirectories();
  directories.push(directory);
  await writeLibraryDirectories(directories);
}

module.exports = {
  getRegistryPath,
  readLibraryDirectories,
  writeLibraryDirectories,
  registerLibraryDirectory
};
