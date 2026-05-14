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
  const projectName = `NLA Object Viewer ${Date.now()}`;
  const targetUrl = "https://nla.gov.au/nla.obj-4161786467/view";
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    await navigate(page, targetUrl);
    await waitForPreview(page, "image", {
      timeout: 120000,
      markdownIncludes: "https://nla.gov.au/nla.obj-4161786467",
      imageSrcIncludes: "/nla.obj-4161786467/image"
    });
    const previewShot = await screenshot(page, "nla-object-viewer-preview.png");

    await clickSidebarCollect(page);
    await waitForSidebarCollectState(page, "Collected", 120000);
    await expectManageSummary(page, "1 item");
    const manageShot = await screenshot(page, "nla-object-viewer-manage.png");

    const { manifest } = await readManifest(project.projectDir, project.projectSlug);
    const saved = Array.isArray(manifest.saved) ? manifest.saved : [];
    const imageItem = saved.find((entry) => entry.url === "https://nla.gov.au/nla.obj-4161786467");
    if (!imageItem) {
      throw new Error("Expected the NLA object viewer item in the saved manifest.");
    }
    const metadataFile = Array.isArray(imageItem.metadataFiles) ? imageItem.metadataFiles[0] : imageItem.metadataFile;
    const imageMarkdown = await fs.readFile(path.join(project.projectDir, metadataFile), "utf8");
    if (!/Town plan of Ipoh/i.test(imageMarkdown) || !/National Library of Australia/i.test(imageMarkdown)) {
      throw new Error("Saved NLA object metadata markdown did not include expected record details.");
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
