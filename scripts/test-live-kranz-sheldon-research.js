#!/usr/bin/env node

const {
  launchApp,
  createProject,
  navigate,
  screenshot,
  cleanupProject
} = require("./live-e2e-helpers");

const searches = [
  {
    label: "Kranz Sheldon architects Melville",
    url: "https://trove.nla.gov.au/search/category/newspapers?keyword=%22Kranz%20Sheldon%22%20architects%20Melville"
  },
  {
    label: "Iwanoff Kranz and Sheldon",
    url: "https://trove.nla.gov.au/search/category/newspapers?keyword=Iwanoff%20%22Kranz%20and%20Sheldon%22"
  }
];

async function waitForQuietHarness(page, label) {
  await page.waitForFunction(() => window.trovePerf?.health?.().ok === true, null, { timeout: 15000 });
  const state = await page.evaluate(() => ({
    health: window.trovePerf.health(),
    layout: window.trovePerf.layout(),
    message: document.querySelector("#message")?.textContent || ""
  }));
  if (!state.health.ok) {
    throw new Error(`${label} app health issues:\n${JSON.stringify(state.health.issues, null, 2)}`);
  }
  if (!state.layout.ok) {
    throw new Error(`${label} layout issues:\n${JSON.stringify(state.layout.issues, null, 2)}`);
  }
  return state;
}

async function saveCurrentSearch(page, label) {
  await page.click("#save-search-button");
  await page.waitForFunction(
    (needle) => {
      const text = document.querySelector("#message")?.textContent || "";
      return /Saved search URL/i.test(text) || text.includes(needle);
    },
    label,
    { timeout: 15000 }
  );
}

async function run() {
  const projectName = `Kranz Sheldon Architects Melville ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    const states = [];
    for (const search of searches) {
      await navigate(page, search.url);
      await page.waitForFunction(
        (targetUrl) => {
          const inputUrl = document.querySelector("#address-input")?.value || "";
          const status = document.querySelector("#page-status")?.textContent || "";
          return inputUrl === targetUrl && !/Loading/i.test(status);
        },
        search.url,
        { timeout: 45000 }
      );
      await saveCurrentSearch(page, search.label);
      states.push({ label: search.label, state: await waitForQuietHarness(page, search.label) });
    }

    await page.click("#mode-manage");
    await page.waitForSelector("#manage-view:not([hidden])");
    const layout = await page.evaluate(() => window.trovePerf.layout());
    if (!layout.ok) {
      throw new Error(`Library layout issues after Kranz/Sheldon searches:\n${JSON.stringify(layout.issues, null, 2)}`);
    }
    const shot = await screenshot(page, "kranz-sheldon-research-library.png");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          searches: states.map((entry) => ({
            label: entry.label,
            message: entry.state.message,
            healthOk: entry.state.health.ok,
            layoutOk: entry.state.layout.ok
          })),
          screenshot: shot
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
