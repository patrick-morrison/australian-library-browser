#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const yaml = require("js-yaml");

const {
  launchApp,
  createProject,
  navigate,
  waitForInlineActions,
  waitForPreview,
  clickSidebarCollect,
  waitForSidebarCollectState,
  confirmDialog,
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
      // keep polling while the manifest settles
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for manifest condition in ${manifestPath}`);
}

async function run() {
  const projectName = `Workflow Wellington Dam ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    await navigate(page, "https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam&l-state=Western%20Australia");
    await waitForInlineActions(page, 3, 45000);
    await screenshot(page, "workflow-wellington-search-initial.png");

    await navigate(page, "https://trove.nla.gov.au/newspaper/article/32575438");
    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/32575438"
    });
    await clickSidebarCollect(page);
    await waitForSidebarCollectState(page, "Collected", 120000);

    let manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) => Array.isArray(doc?.saved) && doc.saved.length === 1
    );

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
      (doc) => Array.isArray(doc?.saved) && doc.saved.length === 1 && Array.isArray(doc?.ignored) && doc.ignored.length === 1
    );

    await navigate(page, "https://trove.nla.gov.au/newspaper/article/32575438");
    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/32575438"
    });
    await confirmDialog(page);
    await clickSidebarCollect(page);
    await waitForSidebarCollectState(page, "Collect", 120000);

    manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) =>
        Array.isArray(doc?.saved) &&
        doc.saved.length === 0 &&
        Array.isArray(doc?.ignored) &&
        doc.ignored.length === 1 &&
        Array.isArray(doc?.uncollected) &&
        doc.uncollected.length === 1
    );

    await page.click("#mode-manage");
    await page.waitForFunction(() => {
      const summary = document.querySelector("#manage-summary")?.textContent || "";
      return summary.includes("0 items");
    }, null, { timeout: 30000 });
    await page.click("#filter-ignored");
    await page.waitForFunction(() => {
      const summary = document.querySelector("#manage-summary")?.textContent || "";
      return summary.includes("1 item");
    }, null, { timeout: 30000 });
    await page.click("#filter-uncollected");
    await page.waitForFunction(() => {
      const summary = document.querySelector("#manage-summary")?.textContent || "";
      return summary.includes("1 item");
    }, null, { timeout: 30000 });
    await page.click("#layout-compact");
    await page.waitForFunction(() => document.querySelector("#manage-list")?.classList.contains("is-compact"), null, {
      timeout: 10000
    });

    const manageShot = await screenshot(page, "workflow-wellington-library.png");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          savedCount: manifest.saved.length,
          ignoredCount: manifest.ignored.length,
          uncollectedCount: manifest.uncollected.length,
          screenshot: manageShot
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
