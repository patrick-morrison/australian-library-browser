#!/usr/bin/env node

const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");

async function main() {
  const targetUrl = process.argv[2] || "https://purl.slwa.wa.gov.au/slwa_b3507746_1";
  const electronBinary = require("electron");
  const projectName = `Preview Verify ${Date.now()}`;
  const projectFolder = path.join(repoRoot, `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.trovelibrary`);
  const userDataDir = path.join(os.tmpdir(), `australian-library-browser-verify-${process.pid}-${Date.now()}`);
  let app;

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
    await page.fill("#project-name", projectName);
    await page.press("#project-name", "Enter");
    await page.waitForSelector("#capture-panel");
    await page.fill("#address-input", targetUrl);
    await page.press("#address-input", "Enter");

    await page.waitForFunction(() => {
      const body = document.querySelector("#capture-body");
      return Boolean(body && body.hidden === false);
    }, null, { timeout: 60000 });

    await page.waitForFunction(() => {
      const image = document.querySelector("#capture-image-gallery .capture-gallery-primary img");
      if (!image) {
        return false;
      }
      const source = String(image.currentSrc || image.getAttribute("src") || "");
      return source.includes(".jpg") && Number(image.naturalWidth || 0) > 0;
    }, null, { timeout: 60000 });

    await page.waitForTimeout(2000);

    const payload = await page.evaluate(() => {
      const image = document.querySelector("#capture-image-gallery .capture-gallery-primary img");
      return {
        pageStatus: document.querySelector("#page-status")?.textContent?.trim() || "",
        pageKind: document.querySelector("#page-kind")?.textContent?.trim() || "",
        captureHidden: Boolean(document.querySelector("#capture-body")?.hidden),
        image: image
          ? {
              src: image.getAttribute("src") || "",
              currentSrc: image.currentSrc || "",
              complete: Boolean(image.complete),
              naturalWidth: Number(image.naturalWidth || 0),
              naturalHeight: Number(image.naturalHeight || 0),
              clientWidth: Number(image.clientWidth || 0),
              clientHeight: Number(image.clientHeight || 0),
              alt: image.alt || ""
            }
          : null,
        markdownLength: document.querySelector("#capture-markdown")?.innerText?.length || 0
      };
    });

    const shot = "/tmp/slwa-preview-verify.png";
    await page.screenshot({ path: shot, fullPage: false });
    console.log(JSON.stringify({ targetUrl, shot, payload }, null, 2));
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
