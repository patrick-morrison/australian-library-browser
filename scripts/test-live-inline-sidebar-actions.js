#!/usr/bin/env node

const path = require("path");
const fs = require("fs/promises");

const yaml = require("js-yaml");

const {
  launchApp,
  createProject,
  navigate,
  waitForInlineActions,
  clickInlineAction,
  waitForInlineState,
  waitForPreview,
  clickSidebarCollect,
  waitForSidebarCollectState,
  screenshot,
  cleanupProject
} = require("./live-e2e-helpers");

async function waitForManifest(projectDir, projectSlug, predicate, timeout = 90000) {
  const manifestPath = path.join(projectDir, `${projectSlug}.trovelibrary`);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const manifest = yaml.load(await fs.readFile(manifestPath, "utf8"));
      if (predicate(manifest)) {
        return manifest;
      }
    } catch {
      // keep polling while files settle
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for manifest condition in ${manifestPath}`);
}

async function readCaptureSnapshot(page) {
  return page.evaluate(() => {
    const markdown = document.querySelector("#capture-markdown")?.innerText || "";
    const collectText = document.querySelector("#capture-collect")?.textContent || "";
    const ignoreText = document.querySelector("#capture-ignore")?.textContent || "";
    const emptyHidden = Boolean(document.querySelector("#capture-empty")?.hidden);
    return {
      markdown,
      collectText: String(collectText).replace(/\s+/g, " ").trim(),
      ignoreText: String(ignoreText).replace(/\s+/g, " ").trim(),
      emptyHidden
    };
  });
}

async function run() {
  const projectName = `Inline Sidebar Actions ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    await navigate(page, "https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam&l-state=Western%20Australia");
    await waitForInlineActions(page, 4, 60000);

    const previewTarget = "https://trove.nla.gov.au/newspaper/article/260382127";
    const collectTarget = "https://trove.nla.gov.au/newspaper/article/209256127";
    const ignoreTarget = "https://trove.nla.gov.au/newspaper/article/253406851";

    await clickInlineAction(page, { action: "preview", urlMatch: previewTarget });
    await waitForInlineState(page, { action: "preview", urlMatch: previewTarget, expectText: "Previewing…" }, 10000);
    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/260382127",
      timeout: 60000
    });
    const previewShot = await screenshot(page, "live-inline-preview-loaded.png");
    const previewSnapshot = await readCaptureSnapshot(page);
    if (!previewSnapshot.markdown.toLowerCase().includes("https://trove.nla.gov.au/newspaper/article/260382127")) {
      throw new Error("Preview pane did not settle on the previewed search result.");
    }

    await clickInlineAction(page, { action: "collect", urlMatch: collectTarget });
    await waitForInlineState(page, { action: "collect", urlMatch: collectTarget, expectText: "Collecting…" }, 10000);
    const duringCollect = await readCaptureSnapshot(page);
    if (!duringCollect.markdown.toLowerCase().includes("https://trove.nla.gov.au/newspaper/article/260382127")) {
      throw new Error("Preview pane was contaminated by inline collect on another row.");
    }
    if (/collecting/i.test(duringCollect.collectText)) {
      throw new Error("Sidebar collect button should not enter collecting state for another row's inline collect.");
    }
    if (/collected/i.test(duringCollect.collectText)) {
      throw new Error("Sidebar collect button should not flip to Collected for another row's inline collect.");
    }
    await waitForInlineState(page, { action: "collect", urlMatch: collectTarget, expectText: "Collected" }, 120000);

    let manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) => Array.isArray(doc?.saved) && doc.saved.length === 1
    );

    const collectShot = await screenshot(page, "live-inline-collect-collected.png");
    const afterCollectSnapshot = await readCaptureSnapshot(page);
    if (!afterCollectSnapshot.markdown.toLowerCase().includes("https://trove.nla.gov.au/newspaper/article/260382127")) {
      throw new Error("Preview pane changed after inline collect on a different row.");
    }
    if (/collected/i.test(afterCollectSnapshot.collectText)) {
      throw new Error("Sidebar collect button should stay scoped to the previewed article after another row is collected.");
    }

    await clickInlineAction(page, { action: "ignore", urlMatch: ignoreTarget });
    await waitForInlineState(page, { action: "ignore", urlMatch: ignoreTarget, expectText: "Ignoring…" }, 10000);
    await waitForInlineState(page, { action: "ignore", urlMatch: ignoreTarget, expectText: "Unignore", rowOpacity: 0.6 }, 120000);
    const ignoreShot = await screenshot(page, "live-inline-ignore-greyed.png");

    manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) =>
        Array.isArray(doc?.saved) &&
        doc.saved.length === 1 &&
        Array.isArray(doc?.ignored) &&
        doc.ignored.length === 1
    );

    const afterIgnoreSnapshot = await readCaptureSnapshot(page);
    if (!afterIgnoreSnapshot.markdown.toLowerCase().includes("https://trove.nla.gov.au/newspaper/article/260382127")) {
      throw new Error("Preview pane changed after inline ignore on a different row.");
    }

    await clickInlineAction(page, { action: "ignore", urlMatch: ignoreTarget });
    await waitForInlineState(page, { action: "ignore", urlMatch: ignoreTarget, expectText: "Unignoring…" }, 10000);
    await page.waitForFunction(
      (urlNeedle) => {
        const groups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
        const target = groups.find((group) =>
          String(group.getAttribute("data-trove-library-url") || "").toLowerCase().includes(String(urlNeedle).toLowerCase())
        );
        const ignoreButton = target?.querySelector(".ignore");
        const container =
          target?.closest(".result, .search-result-item, .briefcitDetail, .browseEntry, .bibRecordLink, article, li, tr, .record, .item, .wrap") ||
          target?.parentElement;
        if (!ignoreButton || !container) {
          return false;
        }
        const buttonText = String(ignoreButton.textContent || "").replace(/\s+/g, " ").trim();
        const opacity = Number(getComputedStyle(container).opacity || 1);
        return buttonText === "Ignore" && opacity >= 0.95;
      },
      ignoreTarget,
      { timeout: 120000 }
    );

    manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) =>
        Array.isArray(doc?.saved) &&
        doc.saved.length === 1 &&
        Array.isArray(doc?.ignored) &&
        doc.ignored.length === 0
    );

    const unignoreShot = await screenshot(page, "live-inline-unignore-cleared.png");

    await navigate(page, "https://trove.nla.gov.au/newspaper/article/85178391");
    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/85178391"
    });

    await clickSidebarCollect(page);
    await waitForSidebarCollectState(page, "Collected", 120000);

    manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) =>
        Array.isArray(doc?.saved) &&
        doc.saved.length === 2 &&
        Array.isArray(doc?.ignored) &&
        doc.ignored.length === 1
    );

    const sidebarCollectShot = await screenshot(page, "live-sidebar-collect-collected.png");

    await navigate(page, "https://trove.nla.gov.au/newspaper/article/32472857");
    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/32472857"
    });

    await page.click("#capture-ignore");
    await page.waitForFunction(() => {
      const button = document.querySelector("#capture-ignore");
      return Boolean(button && /Unignore/i.test(button.textContent || ""));
    }, null, { timeout: 120000 });

    manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) =>
        Array.isArray(doc?.saved) &&
        doc.saved.length === 2 &&
        Array.isArray(doc?.ignored) &&
        doc.ignored.length === 1
    );

    const sidebarIgnoreShot = await screenshot(page, "live-sidebar-ignore-unignore.png");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          savedCount: manifest.saved.length,
          ignoredCount: manifest.ignored.length,
          screenshots: [previewShot, collectShot, ignoreShot, unignoreShot, sidebarCollectShot, sidebarIgnoreShot]
        },
        null,
        2
      )
    );
  } finally {
    await app.close().catch(() => {});
    if (project) {
      await cleanupProject(project.projectDir);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
