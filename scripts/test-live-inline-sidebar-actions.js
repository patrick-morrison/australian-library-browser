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

async function waitForCaptureVisible(page, timeout = 15000) {
  await page.waitForFunction(() => {
    const body = document.querySelector("#capture-body");
    const empty = document.querySelector("#capture-empty");
    const markdown = document.querySelector("#capture-markdown")?.innerText || "";
    return Boolean(body && !body.hidden && (!empty || empty.hidden) && markdown.length > 120);
  }, null, { timeout });
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
    await waitForInlineActions(page, 3, 60000);

    const previewTarget = "western mail";
    await clickInlineAction(page, { action: "preview", textMatch: previewTarget });
    await waitForInlineState(page, { textMatch: previewTarget, expectText: "Previewing…" }, 10000);
    await waitForPreview(page, "text", { timeout: 120000 });
    await waitForCaptureVisible(page, 15000);

    const collectTarget = "narrogin observer";
    await clickInlineAction(page, { action: "collect", textMatch: collectTarget });
    await waitForInlineState(page, { textMatch: collectTarget, expectText: "Collecting…" }, 10000);
    await waitForCaptureVisible(page, 15000);
    await waitForInlineState(page, { textMatch: collectTarget, expectText: "Collected" }, 120000);

    let manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) => Array.isArray(doc?.saved) && doc.saved.length === 1
    );

    const collectShot = await screenshot(page, "live-inline-collect-collected.png");

    const ignoreTarget = previewTarget;
    await clickInlineAction(page, { action: "ignore", textMatch: ignoreTarget });
    await waitForInlineState(page, { textMatch: ignoreTarget, expectText: "Ignoring…" }, 10000);
    await waitForCaptureVisible(page, 15000);
    await waitForInlineState(page, { textMatch: ignoreTarget, expectText: "Unignore", rowOpacity: 0.6 }, 120000);
    await page.waitForFunction(() => {
      const button = document.querySelector("#capture-ignore");
      return Boolean(button && /Unignore/i.test(button.textContent || ""));
    }, null, { timeout: 120000 });

    manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) =>
        Array.isArray(doc?.saved) &&
        doc.saved.length === 1 &&
        Array.isArray(doc?.ignored) &&
        doc.ignored.length === 1
    );

    const ignoreShot = await screenshot(page, "live-inline-ignore-greyed.png");

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
          screenshots: [collectShot, ignoreShot, sidebarCollectShot, sidebarIgnoreShot]
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
