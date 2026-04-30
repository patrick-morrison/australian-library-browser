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
  waitForSidebarActionFeedback,
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

    const previewClick = await clickInlineAction(page, { action: "preview", urlMatch: previewTarget });
    if (!previewClick.ok) {
      throw new Error(`Could not click inline Preview for ${previewTarget}.`);
    }
    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/260382127",
      timeout: 60000
    });
    const previewShot = await screenshot(page, "live-inline-preview-loaded.png");
    const previewSnapshot = await readCaptureSnapshot(page);
    if (!previewSnapshot.markdown.toLowerCase().includes("https://trove.nla.gov.au/newspaper/article/260382127")) {
      throw new Error("Preview pane did not settle on the previewed search result.");
    }

    const collectClick = await clickInlineAction(page, { action: "collect", urlMatch: collectTarget });
    if (!collectClick.ok) {
      throw new Error(`Could not click inline Collect for ${collectTarget}.`);
    }
    await waitForInlineState(page, { action: "collect", urlMatch: collectTarget, expectText: "Collected" }, 1500);
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

    const ignoreClick = await clickInlineAction(page, { action: "ignore", urlMatch: ignoreTarget });
    if (!ignoreClick.ok) {
      throw new Error(`Could not click inline Ignore for ${ignoreTarget}.`);
    }
    await waitForInlineState(page, { action: "ignore", urlMatch: ignoreTarget, expectText: "Unignore", rowOpacity: 0.6 }, 1500);
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

    const unignoreClick = await clickInlineAction(page, { action: "ignore", urlMatch: ignoreTarget });
    if (!unignoreClick.ok) {
      throw new Error(`Could not click inline Unignore for ${ignoreTarget}.`);
    }
    await waitForInlineState(page, { action: "ignore", urlMatch: ignoreTarget, expectText: "Ignore" }, 1500);
    await waitForInlineState(page, { action: "ignore", urlMatch: ignoreTarget, expectText: "Ignore" }, 120000);

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

    const persistIgnoreIndex = 4;
    const persistIgnoreClick = await clickInlineAction(page, { action: "ignore", index: persistIgnoreIndex });
    if (!persistIgnoreClick.ok) {
      throw new Error(`Could not click inline Ignore for result index ${persistIgnoreIndex}.`);
    }
    await waitForInlineState(page, { action: "ignore", index: persistIgnoreIndex, expectText: "Unignore" }, 1500);
    await navigate(page, "https://trove.nla.gov.au/newspaper/article/85178391");
    manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) =>
        Array.isArray(doc?.saved) &&
        doc.saved.length === 1 &&
        Array.isArray(doc?.ignored) &&
        doc.ignored.length === 1
    );

    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/85178391"
    });

    await clickSidebarCollect(page);
    await waitForSidebarActionFeedback(
      page,
      { selector: "#capture-collect", busyText: "Collecting", finalText: "Collected" },
      1500
    );
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
    await waitForSidebarActionFeedback(
      page,
      { selector: "#capture-ignore", busyText: "Ignoring", finalText: "Unignore" },
      1500
    );
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
        doc.ignored.length === 2
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
