#!/usr/bin/env node

const {
  launchApp,
  createProject,
  navigate,
  waitForInlineActions,
  screenshot,
  cleanupProject
} = require("./live-e2e-helpers");

async function run() {
  const projectName = `Wellington Dam Image Search ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    await navigate(page, "https://trove.nla.gov.au/search/category/images?keyword=Wellington%20Dam%20campsite");
    const inlineCount = await waitForInlineActions(page, 1, 45000);
    if (inlineCount < 1) {
      throw new Error("Expected at least one inline action on the Wellington Dam image search page.");
    }
    const searchShot = await screenshot(page, "wellington-dam-images-search.png");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          inlineCount,
          screenshot: searchShot
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
