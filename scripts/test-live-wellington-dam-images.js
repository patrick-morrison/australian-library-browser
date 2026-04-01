#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const {
  launchApp,
  createProject,
  navigate,
  waitForPreview,
  clickSidebarCollect,
  waitForSidebarCollectState,
  expectManageSummary,
  screenshot,
  readManifest,
  cleanupProject
} = require("./live-e2e-helpers");

async function run() {
  const projectName = `Wellington Dam Photos ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    const targetUrl = "https://purl.slwa.wa.gov.au/slwa_b3507746_1";
    let previewReady = false;
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await navigate(page, targetUrl);
      try {
        await waitForPreview(page, "image", {
          timeout: 120000,
          markdownIncludes: targetUrl,
          imageSrcIncludes: "slwa_b3507746_1.jpg"
        });
        previewReady = true;
        break;
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(2000);
      }
    }
    if (!previewReady) {
      throw lastError || new Error("SLWA image preview did not settle.");
    }
    const previewShot = await screenshot(page, "wellington-dam-images-preview.png");

    await clickSidebarCollect(page);
    await waitForSidebarCollectState(page, "Collected", 120000);

    await expectManageSummary(page, "1 item");
    const manageShot = await screenshot(page, "wellington-dam-images-manage.png");

    const { manifest } = await readManifest(project.projectDir, project.projectSlug);
    const saved = Array.isArray(manifest.saved) ? manifest.saved : [];
    const imageItem = saved.find((entry) => Array.isArray(entry.assetFiles) ? entry.assetFiles.length : entry.assetFile);
    if (!imageItem) {
      throw new Error("Expected one saved image item in manifest.");
    }

    const metadataFile = Array.isArray(imageItem.metadataFiles) ? imageItem.metadataFiles[0] : imageItem.metadataFile;
    const imageMarkdown = await fs.readFile(path.join(project.projectDir, metadataFile), "utf8");
    if (!/Wellington Dam campsite/i.test(imageMarkdown)) {
      throw new Error("Saved image metadata markdown does not look like the Wellington Dam photo flow.");
    }

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          savedCount: saved.length,
          savedTitle: imageItem.title,
          markdownLength: imageMarkdown.length,
          screenshots: [previewShot, manageShot]
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
