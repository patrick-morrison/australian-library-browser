#!/usr/bin/env node

const path = require("path");

const {
  launchApp,
  createProject,
  screenshot,
  cleanupProject
} = require("./live-e2e-helpers");

async function run() {
  const projectName = `Kranz Sheldon Architects Melville 683 Items ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    await page.evaluate(() => {
      const savedSearchesButton = document.querySelector("#saved-searches-button");
      const addressInput = document.querySelector("#address-input");
      if (savedSearchesButton) {
        savedSearchesButton.textContent = "Searches (12)";
      }
      if (addressInput instanceof HTMLInputElement) {
        addressInput.value = "https://trove.nla.gov.au/newspaper/article/58768300";
      }
    });
    await page.setViewportSize({ width: 900, height: 720 });
    await page.waitForTimeout(200);
    let layout = await page.evaluate(() => window.trovePerf.layout());
    if (!layout.ok) {
      throw new Error(`Collect toolbar overflow at narrow size:\n${JSON.stringify(layout.issues, null, 2)}`);
    }
    const collectNarrowShot = await screenshot(page, "layout-polish-collect-toolbar-narrow.png");

    await page.click("#mode-manage");
    await page.waitForSelector("#manage-view:not([hidden])");
    await page.evaluate(() => {
      const details = document.querySelector("#project-details");
      const count = document.querySelector("#manage-summary");
      const projectCardMeta = document.querySelector(".project-card .project-meta");
      const savedSearches = document.querySelector("#saved-searches");
      if (details) {
        details.innerHTML = `
          <div><strong>kranz-sheldon-architects-in-melville-with-a-deliberately-long-library-folder-name</strong></div>
          <div class="message-text">683 articles · 27 images · 118 ignored · 42 uncollected · kranz sheldon architects melville civic centre library town planning western australia</div>
          <div class="message-text">Updated 30 Apr 2026</div>
        `;
      }
      if (count) {
        count.textContent = "683 items";
      }
      if (projectCardMeta) {
        projectCardMeta.textContent = "683 articles · 27 images · 118 ignored · 42 uncollected";
      }
      if (savedSearches) {
        savedSearches.className = "saved-searches";
        savedSearches.innerHTML = `
          <button type="button" class="saved-search-item">
            <strong>"Kranz Sheldon" architects Melville town planning Western Australia</strong>
            <span class="saved-search-meta">keyword=%22Kranz%20Sheldon%22%20architects%20Melville%20Western%20Australia · 30 Apr 2026</span>
          </button>
        `;
      }
    });

    await page.setViewportSize({ width: 1180, height: 780 });
    await page.waitForTimeout(200);
    layout = await page.evaluate(() => window.trovePerf.layout());
    if (!layout.ok) {
      throw new Error(`Layout overflow at desktop size:\n${JSON.stringify(layout.issues, null, 2)}`);
    }
    const desktopShot = await screenshot(page, "layout-polish-library-desktop.png");

    await page.setViewportSize({ width: 900, height: 720 });
    await page.waitForTimeout(200);
    layout = await page.evaluate(() => window.trovePerf.layout());
    if (!layout.ok) {
      throw new Error(`Layout overflow at narrow size:\n${JSON.stringify(layout.issues, null, 2)}`);
    }
    const narrowShot = await screenshot(page, "layout-polish-library-narrow.png");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          screenshots: [collectNarrowShot, desktopShot, narrowShot]
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
