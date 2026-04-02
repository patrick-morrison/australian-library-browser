const fs = require("fs/promises");
const os = require("os");
const path = require("path");

function getRegistryPath() {
  const explicitPath =
    process.env.AUSTRALIAN_LIBRARY_BROWSER_REGISTRY_PATH || process.env.TROVE_BROWSER_REGISTRY_PATH || "";
  if (explicitPath) {
    return explicitPath;
  }
  return path.join(os.homedir(), ".australian-library-browser", "library-directories.json");
}

function getLegacyRegistryPath() {
  return path.join(os.homedir(), ".trove-browser", "library-directories.json");
}

async function readRegistryJson() {
  const registryPath = getRegistryPath();
  try {
    const raw = await fs.readFile(registryPath, "utf8");
    return JSON.parse(raw);
  } catch {
    try {
      const raw = await fs.readFile(getLegacyRegistryPath(), "utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

async function readLibraryDirectories() {
  const parsed = await readRegistryJson();
  return Array.isArray(parsed?.directories) ? parsed.directories : [];
}

async function readHiddenProjectPaths() {
  const parsed = await readRegistryJson();
  return Array.isArray(parsed?.hiddenProjects) ? parsed.hiddenProjects : [];
}

async function writeLibraryDirectories(directories) {
  const hiddenProjects = await readHiddenProjectPaths();
  await writeRegistryState(directories, hiddenProjects);
}

async function writeRegistryState(directories, hiddenProjects) {
  const registryPath = getRegistryPath();
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(
    registryPath,
    JSON.stringify(
      {
        directories: [...new Set(directories.filter(Boolean))],
        hiddenProjects: [...new Set(hiddenProjects.filter(Boolean))]
      },
      null,
      2
    ),
    "utf8"
  );
}

async function registerLibraryDirectory(directory) {
  const directories = await readLibraryDirectories();
  directories.push(directory);
  await writeLibraryDirectories(directories);
}

async function hideProjectPath(projectPath) {
  const directories = await readLibraryDirectories();
  const hiddenProjects = await readHiddenProjectPaths();
  hiddenProjects.push(projectPath);
  await writeRegistryState(directories, hiddenProjects);
}

async function unhideProjectPath(projectPath) {
  const directories = await readLibraryDirectories();
  const hiddenProjects = (await readHiddenProjectPaths()).filter((entry) => entry !== projectPath);
  await writeRegistryState(directories, hiddenProjects);
}

module.exports = {
  getRegistryPath,
  readLibraryDirectories,
  readHiddenProjectPaths,
  writeLibraryDirectories,
  registerLibraryDirectory,
  hideProjectPath,
  unhideProjectPath
};
