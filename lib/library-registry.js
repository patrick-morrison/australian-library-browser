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

async function readHiddenProjectPaths() {
  try {
    const raw = await fs.readFile(getRegistryPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.hiddenProjects) ? parsed.hiddenProjects : [];
  } catch {
    return [];
  }
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
