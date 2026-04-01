#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const { Client } = require("../node_modules/@modelcontextprotocol/sdk/dist/cjs/client/index.js");
const { StdioClientTransport } = require("../node_modules/@modelcontextprotocol/sdk/dist/cjs/client/stdio.js");

const repoRoot = path.resolve(__dirname, "..");

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "trove-library-mcp-"));
  const registryPath = path.join(tempRoot, "library-registry.json");
  const projectRoot = path.join(tempRoot, "libraries");
  const projectName = `MCP Smoke ${Date.now()}`;
  const client = new Client(
    {
      name: "trove-browser-mcp-smoke",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(repoRoot, "mcp/server.js")],
    cwd: repoRoot,
    env: {
      ...process.env,
      TROVE_BROWSER_REGISTRY_PATH: registryPath
    },
    stderr: "pipe"
  });

  let stderr = "";
  transport.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);
    for (const required of ["list_projects", "create_project", "get_project_inventory", "read_item_markdown", "search_markdown", "save_project_note", "open_urls_in_tabs"]) {
      if (!toolNames.includes(required)) {
        throw new Error(`Missing MCP tool: ${required}`);
      }
    }

    const created = await client.callTool({
      name: "create_project",
      arguments: {
        name: projectName,
        root_dir: projectRoot
      }
    });

    if (!JSON.stringify(created).includes(projectName)) {
      throw new Error("create_project did not report the created library.");
    }

    const listed = await client.callTool({
      name: "list_projects",
      arguments: {}
    });

    if (!JSON.stringify(listed).includes(projectName)) {
      throw new Error("New project was not returned by list_projects.");
    }

    const inventory = await client.callTool({
      name: "get_project_inventory",
      arguments: {
        project: projectName,
        status: "all"
      }
    });

    if (!JSON.stringify(inventory).includes("No matching items.")) {
      throw new Error("Expected an empty inventory for a fresh project.");
    }

    await client.callTool({
      name: "save_project_note",
      arguments: {
        project: projectName,
        heading: "Smoke Test",
        body: "This note was written by the MCP smoke test."
      }
    });

    const resources = await client.listResources();
    const resourceUris = resources.resources.map((resource) => resource.uri);
    if (!resourceUris.includes("trovelibrary://projects")) {
      throw new Error("Projects resource is not registered.");
    }

    const projectSlug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const manifest = await client.readResource({
      uri: `trovelibrary://project/${projectSlug}/manifest`
    });

    if (!JSON.stringify(manifest).includes(projectName)) {
      throw new Error("Manifest resource did not return the created project.");
    }

    console.log("MCP smoke test passed.");
    console.log(`Created project: ${projectName}`);
  } finally {
    await transport.close().catch(() => {});
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
