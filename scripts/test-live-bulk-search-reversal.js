#!/usr/bin/env node

const {
  launchApp,
  createProject,
  navigate,
  waitForInlineActions,
  waitForInlineState,
  screenshot,
  readManifest,
  cleanupProject
} = require("./live-e2e-helpers");

const BASE_URL =
  "https://trove.nla.gov.au/search/advanced/category/newspapers?keyword=Wellington%20Dam&date.to=1936-01-01&l-state=Western%20Australia&keyword.not=Zealand";

function pageUrl(pageNumber) {
  const url = new URL(BASE_URL);
  if (pageNumber > 1) {
    url.searchParams.set("page", String(pageNumber));
  }
  return url.toString();
}

async function waitForQueueIdle(page, timeout = 180000) {
  await page.waitForFunction(
    () => {
      const queue = window.trovePerf?.queue?.();
      return Boolean(queue && !queue.running && !queue.current && Number(queue.waiting || 0) === 0);
    },
    null,
    { timeout }
  );
}

async function readSearchControls(page) {
  return page.evaluate(async () => {
    const webview = document.querySelector("#webview-stack webview");
    if (!webview) {
      return [];
    }
    return webview.executeJavaScript(
      `(() => Array.from(document.querySelectorAll(".trove-library-inline-actions")).map((group, index) => ({
        index,
        url: group.getAttribute("data-trove-library-url") || "",
        collectText: group.querySelector("button.collect")?.textContent?.trim() || "",
        ignoreText: group.querySelector("button.ignore")?.textContent?.trim() || "",
        collectWidth: Math.round(group.querySelector("button.collect")?.getBoundingClientRect().width || 0),
        ignoreWidth: Math.round(group.querySelector("button.ignore")?.getBoundingClientRect().width || 0)
      })))()`,
      true
    );
  });
}

async function clickSearchButton(page, url, action) {
  return page.evaluate(
    async ({ targetUrl, targetAction }) => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        return false;
      }
      return webview.executeJavaScript(
        `((payload) => {
          const normalize = (value) => {
            try {
              const url = new URL(value, location.href);
              url.hash = "";
              return url.toString().replace(/\\/$/, "");
            } catch {
              return String(value || "").trim();
            }
          };
          const target = normalize(payload.targetUrl);
          const group = Array.from(document.querySelectorAll(".trove-library-inline-actions")).find((entry) =>
            normalize(entry.getAttribute("data-trove-library-url") || "") === target
          );
          const button = group?.querySelector("button." + payload.targetAction);
          if (!button) {
            return false;
          }
          button.click();
          return true;
        })(${JSON.stringify({ targetUrl, targetAction })})`,
        true
      );
    },
    { targetUrl: url, targetAction: action }
  );
}

async function assertHarnessClean(page, label) {
  const snapshot = await page.evaluate(() => ({
    health: window.trovePerf.health(),
    layout: window.trovePerf.layout(),
    queue: window.trovePerf.queue()
  }));
  if (!snapshot.health.ok) {
    throw new Error(`${label} health issues:\n${JSON.stringify(snapshot.health.issues, null, 2)}`);
  }
  if (!snapshot.layout.ok) {
    throw new Error(`${label} layout issues:\n${JSON.stringify(snapshot.layout.issues, null, 2)}`);
  }
  return snapshot;
}

async function collectFromSearchPage(page, pageNumber, count, seenUrls) {
  await navigate(page, pageUrl(pageNumber));
  await waitForInlineActions(page, count, 90000);
  await assertHarnessClean(page, `page ${pageNumber} loaded`);
  const controls = await readSearchControls(page);
  const candidates = controls.filter((entry) => entry.url && !seenUrls.has(entry.url)).slice(0, count);
  if (candidates.length < count) {
    throw new Error(`Page ${pageNumber} only had ${candidates.length} new candidates.`);
  }
  const clicked = [];
  for (const candidate of candidates) {
    const startedAt = Date.now();
    const ok = await clickSearchButton(page, candidate.url, "collect");
    if (!ok) {
      throw new Error(`Could not click collect for ${candidate.url}`);
    }
    await waitForInlineState(page, { action: "collect", urlMatch: candidate.url, expectText: "Collected" }, 1500);
    clicked.push({ ...candidate, feedbackMs: Date.now() - startedAt });
    seenUrls.add(candidate.url);
  }
  return clicked;
}

async function uncollectOnSearchPage(page, pageNumber, items) {
  await navigate(page, pageUrl(pageNumber));
  await waitForInlineActions(page, 1, 90000);
  const results = [];
  for (const item of items) {
    const startedAt = Date.now();
    page.once("dialog", (dialog) => dialog.accept());
    const ok = await clickSearchButton(page, item.url, "collect");
    if (!ok) {
      throw new Error(`Could not click uncollect for ${item.url}`);
    }
    await waitForInlineState(page, { action: "collect", urlMatch: item.url, expectText: "Collect" }, 5000);
    results.push({ ...item, uncollectFeedbackMs: Date.now() - startedAt });
  }
  return results;
}

async function run() {
  const projectName = `Bulk Search Reversal ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    const seenUrls = new Set();
    const pageOne = await collectFromSearchPage(page, 1, 10, seenUrls);
    const pageTwo = await collectFromSearchPage(page, 2, 10, seenUrls);
    const collected = [...pageOne.map((item) => ({ ...item, pageNumber: 1 })), ...pageTwo.map((item) => ({ ...item, pageNumber: 2 }))];
    await waitForQueueIdle(page);
    let { manifest } = await readManifest(project.projectDir, project.projectSlug);
    const savedAfterCollect = Array.isArray(manifest.saved) ? manifest.saved.length : 0;
    if (savedAfterCollect < collected.length) {
      throw new Error(`Expected at least ${collected.length} saved after collect, found ${savedAfterCollect}.`);
    }
    const collectShot = await screenshot(page, "bulk-search-collected-page-2.png");
    await assertHarnessClean(page, "after bulk collect");

    const uncollectedPageTwo = await uncollectOnSearchPage(page, 2, pageTwo);
    const uncollectedPageOne = await uncollectOnSearchPage(page, 1, pageOne);
    const uncollected = [...uncollectedPageTwo, ...uncollectedPageOne];
    await waitForQueueIdle(page);
    ({ manifest } = await readManifest(project.projectDir, project.projectSlug));
    const savedAfterUncollect = Array.isArray(manifest.saved) ? manifest.saved.length : 0;
    const uncollectedCount = Array.isArray(manifest.uncollected) ? manifest.uncollected.length : 0;
    if (savedAfterUncollect !== 0) {
      throw new Error(`Expected zero saved after uncollect, found ${savedAfterUncollect}.`);
    }
    if (uncollectedCount < collected.length) {
      throw new Error(`Expected at least ${collected.length} uncollected records, found ${uncollectedCount}.`);
    }
    const finalControls = await readSearchControls(page);
    const stuck = finalControls.filter((entry) => /Removing|Collecting/i.test(`${entry.collectText} ${entry.ignoreText}`));
    if (stuck.length) {
      throw new Error(`Search page has stuck transitional controls:\n${JSON.stringify(stuck, null, 2)}`);
    }
    const uncollectShot = await screenshot(page, "bulk-search-uncollected-page-1.png");
    await assertHarnessClean(page, "after bulk uncollect");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          collected: collected.length,
          uncollected: uncollected.length,
          maxCollectFeedbackMs: Math.max(...collected.map((item) => item.feedbackMs)),
          maxUncollectFeedbackMs: Math.max(...uncollected.map((item) => item.uncollectFeedbackMs)),
          savedAfterCollect,
          savedAfterUncollect,
          uncollectedCount,
          screenshots: [collectShot, uncollectShot]
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
