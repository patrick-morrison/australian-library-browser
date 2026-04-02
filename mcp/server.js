#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const { McpServer, ResourceTemplate } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const libraryRegistry = require("../lib/library-registry");
const projectStore = require("../lib/project-store");
const yaml = require("js-yaml");
const z = require("zod/v4");

const workspaceRoot = process.cwd();

function normalizeProjectSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.trovelibrary$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listKnownProjects() {
  const directories = [workspaceRoot, ...(await libraryRegistry.readLibraryDirectories())];
  const uniqueDirectories = [...new Set(directories)];
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
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function readProjectYaml(project) {
  const raw = await fs.readFile(path.join(project.path, project.manifestName || "project.yaml"), "utf8");
  return yaml.load(raw) || {};
}

async function resolveProject(projectRef) {
  const projects = await listKnownProjects();
  const normalized = normalizeProjectSlug(projectRef);
  const found = projects.find((project) => {
    return (
      normalizeProjectSlug(project.name) === normalized ||
      normalizeProjectSlug(project.folderName) === normalized ||
      normalizeProjectSlug(project.path) === normalized
    );
  });

  if (!found) {
    throw new Error(`Project not found: ${projectRef}`);
  }

  return found;
}

function inventoryEntries(project) {
  const saved = (project.saved || []).map((item) => ({ ...item, status: "saved", timestamp: item.savedAt || "" }));
  const ignored = (project.ignored || []).map((item) => ({ ...item, status: "ignored", timestamp: item.ignoredAt || "" }));
  return [...saved, ...ignored].sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
}

function itemFilePath(project, item) {
  const relative = item.file || item.metadataFile || item.assetFile || "";
  return relative ? path.join(project.path, relative) : "";
}

async function readItemContent(project, item) {
  const targetPath = itemFilePath(project, item);
  if (!targetPath) {
    return "";
  }
  return fs.readFile(targetPath, "utf8");
}

function findInventoryItem(project, itemKey) {
  return inventoryEntries(project).find((item) => item.key === itemKey);
}

async function searchMarkdown(projects, query) {
  const needle = String(query || "").toLowerCase();
  const results = [];

  for (const project of projects) {
    for (const item of inventoryEntries(project)) {
      const targetPath = itemFilePath(project, item);
      if (!targetPath || !targetPath.endsWith(".md")) {
        continue;
      }

      const content = await fs.readFile(targetPath, "utf8");
      const lowered = content.toLowerCase();
      const index = lowered.indexOf(needle);
      if (index === -1) {
        continue;
      }

      const snippet = content.slice(Math.max(0, index - 120), Math.min(content.length, index + 220)).replace(/\s+/g, " ").trim();
      results.push({
        project: project.name,
        projectSlug: normalizeProjectSlug(project.name),
        itemKey: item.key,
        title: item.title,
        path: path.relative(project.path, targetPath),
        snippet
      });
    }
  }

  return results;
}

function textResult(text, structuredContent = undefined) {
  return {
    content: [{ type: "text", text }],
    structuredContent
  };
}

async function buildProjectsResource() {
  const projects = await listKnownProjects();
  return JSON.stringify(
    projects.map((project) => ({
      name: project.name,
      slug: normalizeProjectSlug(project.name),
      path: project.path,
      savedCount: project.savedCount,
      ignoredCount: project.ignoredCount,
      counts: project.counts
    })),
    null,
    2
  );
}

async function openUrlsInBrowserTabs(urls) {
  const normalizedUrls = [...new Set((Array.isArray(urls) ? urls : []).map((value) => String(value || "").trim()).filter(Boolean))];
  if (!normalizedUrls.length) {
    throw new Error("No URLs supplied.");
  }

  const child = spawn(process.execPath, [path.join(workspaceRoot, "scripts/open-tabs-cli.js"), ...normalizedUrls], {
    cwd: workspaceRoot,
    detached: true,
    stdio: "ignore",
    env: process.env
  });
  child.unref();
  return normalizedUrls;
}

async function main() {
  const server = new McpServer({
    name: "trove-library-browser",
    version: "0.1.0"
  });

  server.registerTool(
    "list_projects",
    {
      description: "List all known .trovelibrary projects available to the app and MCP server.",
      inputSchema: {}
    },
    async () => {
      const projects = await listKnownProjects();
      return textResult(
        projects.map((project) => `${project.name} (${project.savedCount} saved, ${project.ignoredCount} ignored)`).join("\n") || "No projects found.",
        {
          projects: projects.map((project) => ({
            name: project.name,
            slug: normalizeProjectSlug(project.name),
            path: project.path,
            savedCount: project.savedCount,
            ignoredCount: project.ignoredCount,
            counts: project.counts
          }))
        }
      );
    }
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new .trovelibrary project, optionally in a chosen parent directory.",
      inputSchema: {
        name: z.string().describe("Human-readable project name."),
        root_dir: z.string().optional().describe("Optional parent directory where the .trovelibrary folder should be created.")
      }
    },
    async ({ name, root_dir }) => {
      const baseDir = root_dir || workspaceRoot;
      const project = await projectStore.createProject(baseDir, name);
      if (baseDir !== workspaceRoot) {
        await libraryRegistry.registerLibraryDirectory(baseDir);
      }
      return textResult(`Created ${project.folderName} in ${baseDir}`, {
        project: {
          name: project.name,
          slug: normalizeProjectSlug(project.name),
          path: project.path,
          folderName: project.folderName
        }
      });
    }
  );

  server.registerTool(
    "get_project_inventory",
    {
      description: "Return the collected and ignored inventory for a single project.",
      inputSchema: {
        project: z.string().describe("Project name, folder name, or slug."),
        status: z.enum(["all", "saved", "ignored"]).optional().describe("Optional inventory filter.")
      }
    },
    async ({ project, status = "all" }) => {
      const selected = await resolveProject(project);
      const entries = inventoryEntries(selected).filter((entry) => status === "all" || entry.status === status);
      return textResult(
        entries.map((entry) => `[${entry.status}] ${entry.title} <${entry.url}>`).join("\n") || "No matching items.",
        { project: selected.name, entries }
      );
    }
  );

  server.registerTool(
    "read_item_markdown",
    {
      description: "Read the markdown capture or metadata markdown for a collected item.",
      inputSchema: {
        project: z.string().describe("Project name, folder name, or slug."),
        item_key: z.string().describe("Inventory key such as trove:newspaper:58768300.")
      }
    },
    async ({ project, item_key }) => {
      const selected = await resolveProject(project);
      const item = findInventoryItem(selected, item_key);
      if (!item) {
        return textResult(`Item not found: ${item_key}`);
      }
      const targetPath = itemFilePath(selected, item);
      if (!targetPath || !targetPath.endsWith(".md")) {
        return textResult(`No markdown file available for ${item_key}.`);
      }
      const content = await readItemContent(selected, item);
      return textResult(content, {
        project: selected.name,
        itemKey: item.key,
        path: targetPath
      });
    }
  );

  server.registerTool(
    "search_markdown",
    {
      description: "Search markdown captures across one project or all projects.",
      inputSchema: {
        query: z.string().describe("Case-insensitive text to search for in saved markdown."),
        project: z.string().optional().describe("Optional project name, folder name, or slug.")
      }
    },
    async ({ query, project }) => {
      const projects = project ? [await resolveProject(project)] : await listKnownProjects();
      const results = await searchMarkdown(projects, query);
      return textResult(
        results.map((result) => `${result.project}: ${result.title}\n${result.snippet}`).join("\n\n") || "No matches.",
        { results }
      );
    }
  );

  server.registerTool(
    "save_project_note",
    {
      description: "Append a note to a project's README so coding agents and humans share the same context.",
      inputSchema: {
        project: z.string().describe("Project name, folder name, or slug."),
        heading: z.string().describe("Section heading for the note."),
        body: z.string().describe("Markdown note body.")
      }
    },
    async ({ project, heading, body }) => {
      const selected = await resolveProject(project);
      const readmePath = path.join(selected.path, "README.md");
      const previous = await fs.readFile(readmePath, "utf8");
      const next = `${previous.trim()}\n\n## ${heading}\n\n${body.trim()}\n`;
      await fs.writeFile(readmePath, next, "utf8");
      return textResult(`Updated ${readmePath}`);
    }
  );

  server.registerTool(
    "open_urls_in_tabs",
    {
      description: "Open one or more URLs as tabs in The Australian Library Browser app. If the app is already running, the tabs are added to that window.",
      inputSchema: {
        urls: z.array(z.string()).min(1).describe("One or more absolute http(s) URLs to open in browser tabs.")
      }
    },
    async ({ urls }) => {
      const opened = await openUrlsInBrowserTabs(urls);
      return textResult(`Opening ${opened.length} tab${opened.length === 1 ? "" : "s"} in The Australian Library Browser.`, {
        urls: opened
      });
    }
  );

  server.registerResource(
    "projects",
    "trovelibrary://projects",
    {
      title: "Project List",
      description: "Known .trovelibrary packages available to the browser and MCP server.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "trovelibrary://projects",
          mimeType: "application/json",
          text: await buildProjectsResource()
        }
      ]
    })
  );

  server.registerResource(
    "project-manifest",
    new ResourceTemplate("trovelibrary://project/{slug}/manifest", {}),
    {
      title: "Project Manifest",
      description: "Parsed project.yaml content for a specific project.",
      mimeType: "application/json"
    },
    async (_uri, variables) => {
      const project = await resolveProject(variables.slug);
      const manifest = await readProjectYaml(project);
      return {
        contents: [
          {
            uri: `trovelibrary://project/${variables.slug}/manifest`,
            mimeType: "application/json",
            text: JSON.stringify({ path: project.path, manifest }, null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    "project-csv",
    new ResourceTemplate("trovelibrary://project/{slug}/inventory.csv", {}),
    {
      title: "Project Inventory CSV",
      description: "Spreadsheet-friendly project inventory.",
      mimeType: "text/csv"
    },
    async (_uri, variables) => {
      const project = await resolveProject(variables.slug);
      const csv = await fs.readFile(path.join(project.path, "items.csv"), "utf8");
      return {
        contents: [
          {
            uri: `trovelibrary://project/${variables.slug}/inventory.csv`,
            mimeType: "text/csv",
            text: csv
          }
        ]
      };
    }
  );

  server.registerResource(
    "project-readme",
    new ResourceTemplate("trovelibrary://project/{slug}/readme", {}),
    {
      title: "Project README",
      description: "Human and agent instructions for a project package.",
      mimeType: "text/markdown"
    },
    async (_uri, variables) => {
      const project = await resolveProject(variables.slug);
      const readme = await fs.readFile(path.join(project.path, "README.md"), "utf8");
      return {
        contents: [
          {
            uri: `trovelibrary://project/${variables.slug}/readme`,
            mimeType: "text/markdown",
            text: readme
          }
        ]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server error:", error);
  process.exit(1);
});
