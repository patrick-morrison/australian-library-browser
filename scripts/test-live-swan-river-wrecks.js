#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const yaml = require("js-yaml");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function createProject(page, name, slug) {
  console.log("[live] creating project");
  await page.click("#mode-manage");
  await page.click("#new-project-button");
  await page.waitForSelector("#project-dialog:not([hidden])");
  await page.fill("#project-dialog-name", name);
  await page.click("#project-dialog-form .primary-action");
  await page.waitForFunction(() => document.querySelector(".app-shell")?.classList.contains("mode-collect"), null, {
    timeout: 20000
  });
  await page.waitForFunction(
    (projectSlug) => {
      const text = document.querySelector("#project-details")?.textContent || "";
      return text.toLowerCase().includes(projectSlug);
    },
    slug,
    { timeout: 20000 }
  );
}

async function navigate(page, url) {
  console.log(`[live] navigate ${url}`);
  await page.evaluate((targetUrl) => {
    const input = document.querySelector("#address-input");
    const form = document.querySelector("#address-form");
    if (!(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error("Address form unavailable");
    }
    input.value = targetUrl;
    form.requestSubmit();
  }, url);
}

async function waitForInlineActions(page) {
  console.log("[live] waiting for inline actions");
  await page.waitForSelector("#webview-stack webview", { timeout: 15000 });
  await page.waitForTimeout(7000);
  return page.evaluate(async () => {
    const webview = document.querySelector("#webview-stack webview");
    if (!webview) {
      return 0;
    }
    return webview.executeJavaScript(
      `(() => document.querySelectorAll(".trove-library-inline-actions").length)()`,
      true
    );
  });
}

async function waitForPreview(page, kind) {
  console.log(`[live] waiting for ${kind} preview`);
  await page.waitForFunction(
    (expectKind) => {
      const body = document.querySelector("#capture-body");
      if (!body || body.hidden) {
        return false;
      }
      const markdown = document.querySelector("#capture-markdown")?.innerText || "";
      const img = document.querySelector("#capture-image-gallery .capture-gallery-primary img");
      if (expectKind === "text") {
        return markdown.length > 250 && /Link:/i.test(markdown);
      }
      if (expectKind === "image") {
        return markdown.length > 120 && Boolean(img && img.naturalWidth > 0);
      }
      return markdown.length > 100;
    },
    kind,
    { timeout: 90000 }
  );
}

async function collectCurrent(page) {
  console.log("[live] collecting current item");
  await page.click("#capture-collect");
  try {
    await page.waitForFunction(() => {
      const button = document.querySelector("#capture-collect");
      return Boolean(button && /Collected/i.test(button.textContent || ""));
    }, null, { timeout: 45000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      buttonText: document.querySelector("#capture-collect")?.textContent || "",
      ignoreText: document.querySelector("#capture-ignore")?.textContent || "",
      pageStatus: document.querySelector("#page-status")?.textContent || "",
      pageKind: document.querySelector("#page-kind")?.textContent || "",
      message: document.querySelector("#message")?.textContent || "",
      progress: document.querySelector("#capture-progress")?.textContent || ""
    }));
    console.error("[live] collect did not settle", diagnostics);
    throw error;
  }
}

async function run() {
  const projectName = `Swan River Wrecks ${Date.now()}`;
  const projectSlug = slugify(projectName);
  const projectDir = path.join(repoRoot, projectSlug);
  const electronBinary = require("electron");

  const app = await electron.launch({
    executablePath: electronBinary,
    args: [repoRoot],
    cwd: repoRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: ""
    }
  });

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    await createProject(page, projectName, projectSlug);

    await navigate(page, "https://trove.nla.gov.au/search/category/newspapers?keyword=%22swan%20river%22%20wreck*");
    const inlineCount = await waitForInlineActions(page);
    console.log(`[live] inline action count = ${inlineCount}`);
    if (inlineCount < 1) {
      throw new Error(`Expected inline actions on the Trove search page, found ${inlineCount}.`);
    }

    await navigate(page, "https://trove.nla.gov.au/newspaper/article/76063666");
    await waitForPreview(page, "text");
    await collectCurrent(page);

    await navigate(page, "https://purl.slwa.wa.gov.au/slwa_b2990186_1");
    await waitForPreview(page, "image");
    await collectCurrent(page);

    await page.click("#mode-manage");
    console.log("[live] checking inventory");
    await page.waitForFunction(() => {
      return (document.querySelector("#manage-summary")?.textContent || "").includes("2 items");
    }, null, { timeout: 30000 });

    const manifestPath = path.join(projectDir, `${projectSlug}.trovelibrary`);
    const manifest = yaml.load(await fs.readFile(manifestPath, "utf8"));
    const itemsCsv = await fs.readFile(path.join(projectDir, "items.csv"), "utf8");
    const saved = Array.isArray(manifest.saved) ? manifest.saved : [];
    const textItem = saved.find((entry) => entry.file && /newspapers\//.test(entry.file));
    const imageItem = saved.find((entry) => (Array.isArray(entry.assetFiles) ? entry.assetFiles.length : entry.assetFile));

    if (saved.length < 2 || !textItem || !imageItem) {
      throw new Error("Expected one saved text item and one saved image item.");
    }

    const textMarkdown = await fs.readFile(path.join(projectDir, textItem.file), "utf8");
    const metadataFile = Array.isArray(imageItem.metadataFiles) ? imageItem.metadataFiles[0] : imageItem.metadataFile;
    const imageMarkdown = await fs.readFile(path.join(projectDir, metadataFile), "utf8");

    console.log(
      JSON.stringify(
        {
          projectName,
          projectDir,
          inlineCount,
          savedCount: saved.length,
          textItem: textItem.title,
          imageItem: imageItem.title,
          textMarkdownLength: textMarkdown.length,
          imageMarkdownLength: imageMarkdown.length,
          itemsCsvRows: itemsCsv.trim().split("\n").length - 1
        },
        null,
        2
      )
    );
  } finally {
    await app.close().catch(() => {});
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
