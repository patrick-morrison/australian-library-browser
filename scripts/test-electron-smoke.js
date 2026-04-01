#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function main() {
  const electronBinary = require("electron");
  const projectName = `Playwright Smoke ${Date.now()}`;
  const projectFolder = path.join(repoRoot, `${slugify(projectName)}.trovelibrary`);
  let app;

  try {
    app = await electron.launch({
      executablePath: electronBinary,
      args: [repoRoot],
      cwd: repoRoot,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: ""
      }
    });

    const page = await app.firstWindow();
    await page.waitForSelector("#mode-projects");
    await page.click("#mode-projects");
    await page.fill("#project-name", projectName);
    await page.press("#project-name", "Enter");
    await page.waitForSelector("#capture-panel");
    await page.waitForFunction(
      (name) => {
        return Array.from(document.querySelectorAll(".project-card .project-name")).some((node) => node.textContent.includes(name));
      },
      projectName,
      { timeout: 20000 }
    );

    await page.fill("#address-input", "https://example.com/");
    await page.press("#address-input", "Enter");
    await page.waitForFunction(() => {
      const text = document.querySelector("#capture-empty")?.textContent || "";
      return text.includes("not supported") || text.includes("Browse normally");
    }, null, { timeout: 20000 });

    await page.fill("#address-input", "https://trove.nla.gov.au/newspaper/article/58768300");
    await page.press("#address-input", "Enter");
    await page.waitForFunction(() => !document.querySelector("#capture-body")?.hasAttribute("hidden"), null, { timeout: 45000 });
    await page.waitForFunction(() => {
      const markdown = document.querySelector("#capture-markdown")?.textContent || "";
      return markdown.includes("Link: https://trove.nla.gov.au/newspaper/article/58768300");
    }, null, { timeout: 15000 });

    await page.click("#debug-toggle");
    await page.waitForSelector("#debug-drawer:not([hidden])");
    await page.click("#debug-close");
    await page.waitForFunction(() => document.querySelector("#debug-drawer")?.hasAttribute("hidden"), null, { timeout: 10000 });

    console.log("Electron smoke test passed.");
    console.log(`Created project during test: ${path.basename(projectFolder)}`);
  } finally {
    await app?.close().catch(() => {});
    await fs.rm(projectFolder, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
