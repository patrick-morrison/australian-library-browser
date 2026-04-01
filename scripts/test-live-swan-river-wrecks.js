#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const {
  launchApp,
  createProject,
  navigate,
  waitForInlineActions,
  waitForPreview,
  clickSidebarCollect,
  waitForSidebarCollectState,
  expectManageSummary,
  screenshot,
  readManifest,
  cleanupProject
} = require("./live-e2e-helpers");

async function run() {
  const projectName = `Swan River Wrecks ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    await navigate(page, "https://trove.nla.gov.au/search/category/newspapers?keyword=%22swan%20river%22%20wreck*");
    const inlineCount = await waitForInlineActions(page, 3);
    const searchShot = await screenshot(page, "swan-river-wrecks-search.png");

    await navigate(page, "https://trove.nla.gov.au/newspaper/article/76063666");
    await waitForPreview(page, "text", {
      markdownIncludes: "https://trove.nla.gov.au/newspaper/article/76063666"
    });
    const previewShot = await screenshot(page, "swan-river-wrecks-preview.png");

    await clickSidebarCollect(page);
    await waitForSidebarCollectState(page, "Collected");

    await expectManageSummary(page, "1 item");
    const manageShot = await screenshot(page, "swan-river-wrecks-manage.png");

    const { manifest } = await readManifest(project.projectDir, project.projectSlug);
    const saved = Array.isArray(manifest.saved) ? manifest.saved : [];
    const textItem = saved.find((entry) => entry.file && /newspapers\//.test(entry.file));
    if (!textItem) {
      throw new Error("Expected one saved newspaper item in manifest.");
    }

    const textMarkdown = await fs.readFile(path.join(project.projectDir, textItem.file), "utf8");
    if (!textMarkdown.includes("https://trove.nla.gov.au/newspaper/article/76063666") || textMarkdown.length < 800) {
      throw new Error("Saved markdown does not look like the expected Swan River article capture.");
    }

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          inlineCount,
          savedCount: saved.length,
          savedTitle: textItem.title,
          markdownLength: textMarkdown.length,
          screenshots: [searchShot, previewShot, manageShot]
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
