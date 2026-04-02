#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const screenshotDir = path.join(repoRoot, "tmp", "e2e-live");

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
  const projectFolderName = slugify(projectName);
  const projectFolder = path.join(repoRoot, projectFolderName);
  const userDataDir = path.join(os.tmpdir(), `australian-library-browser-smoke-${process.pid}-${Date.now()}`);
  let app;

  async function ensureScreenshotDir() {
    await fs.mkdir(screenshotDir, { recursive: true });
  }

  async function screenshot(page, name) {
    await ensureScreenshotDir();
    const shot = path.join(screenshotDir, name);
    await page.screenshot({ path: shot, fullPage: false });
    return shot;
  }

  async function navigate(page, targetUrl) {
    await page.evaluate((url) => {
      const input = document.querySelector("#address-input");
      const form = document.querySelector("#address-form");
      if (!(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
        throw new Error("Address form is unavailable.");
      }
      input.value = url;
      form.requestSubmit();
    }, targetUrl);
  }

  try {
    app = await electron.launch({
      executablePath: electronBinary,
      args: [repoRoot],
      cwd: repoRoot,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "",
        AUSTRALIAN_LIBRARY_BROWSER_DISABLE_SINGLE_INSTANCE: "1",
        AUSTRALIAN_LIBRARY_BROWSER_USER_DATA_DIR: userDataDir
      }
    });

    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    await page.click("#mode-manage");
    await page.click("#new-project-button");
    await page.waitForSelector("#project-dialog:not([hidden])");
    await page.fill("#project-dialog-name", projectName);
    await page.click("#project-dialog-form .primary-action");
    await page.waitForSelector("#capture-panel");
    await page.waitForFunction(() => document.querySelector(".app-shell")?.classList.contains("mode-collect"), null, {
      timeout: 20000
    });
    await page.waitForFunction(
      (folderName) => {
        return Array.from(document.querySelectorAll(".project-card .project-name")).some((node) =>
          node.textContent.includes(folderName)
        );
      },
      projectFolderName,
      { timeout: 20000 }
    );

    await navigate(page, "https://example.com/");
    await page.waitForFunction(() => {
      const text = document.querySelector("#capture-empty")?.textContent || "";
      return text.includes("not supported") || text.includes("Browse normally");
    }, null, { timeout: 20000 });
    const unsupportedShot = await screenshot(page, "smoke-unsupported-page.png");

    await navigate(page, "https://trove.nla.gov.au/newspaper/article/58768300");
    await page.waitForFunction(() => !document.querySelector("#capture-body")?.hasAttribute("hidden"), null, { timeout: 45000 });
    await page.waitForFunction(() => {
      const markdown = document.querySelector("#capture-markdown")?.textContent || "";
      return markdown.includes("Link: https://trove.nla.gov.au/newspaper/article/58768300");
    }, null, { timeout: 15000 });
    const previewShot = await screenshot(page, "smoke-trove-preview.png");

    await page.evaluate(() => {
      const button = document.querySelector("#debug-toggle");
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Debug button is unavailable.");
      }
      button.click();
    });
    await page.waitForSelector("#debug-drawer:not([hidden])");
    await page.evaluate(() => {
      const button = document.querySelector("#debug-close");
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Debug close button is unavailable.");
      }
      button.click();
    });
    await page.waitForFunction(() => document.querySelector("#debug-drawer")?.hasAttribute("hidden"), null, { timeout: 10000 });

    console.log("Electron smoke test passed.");
    console.log(`Created project during test: ${path.basename(projectFolder)}`);
    console.log(
      JSON.stringify(
        {
          screenshots: [unsupportedShot, previewShot]
        },
        null,
        2
      )
    );
  } finally {
    await app?.close().catch(() => {});
    await fs.rm(projectFolder, { recursive: true, force: true }).catch(() => {});
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
