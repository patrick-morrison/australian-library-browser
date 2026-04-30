#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

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

const SEARCH_URL =
  "https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam&l-state=Western%20Australia";
const SECOND_SEARCH_URL =
  "https://trove.nla.gov.au/search/category/newspapers?keyword=%22Kranz%20Sheldon%22%20architects%20Melville";
const PREVIEW_TARGET = "https://trove.nla.gov.au/newspaper/article/260382127";
const COLLECT_TARGET = "https://trove.nla.gov.au/newspaper/article/85178391";
const IGNORE_TARGET = "https://trove.nla.gov.au/newspaper/article/32472857";

async function waitForManifest(projectDir, projectSlug, predicate, timeout = 120000) {
  const manifestPath = path.join(projectDir, `${projectSlug}.trovelibrary`);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const manifest = yaml.load(await fs.readFile(manifestPath, "utf8"));
      if (predicate(manifest)) {
        return manifest;
      }
    } catch {
      // The manifest may not exist yet or may be mid-write.
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for manifest condition in ${manifestPath}`);
}

async function saveCurrentSearch(page, label) {
  await page.click("#save-search-button");
  await page.waitForFunction(
    () => /Saved search URL/i.test(document.querySelector("#message")?.textContent || ""),
    null,
    { timeout: 15000 }
  );
  return label;
}

async function captureHarnessStep(page, label, timings, screenshots = []) {
  const startedAt = Date.now();
  await page.waitForFunction(() => Boolean(window.trovePerf?.health && window.trovePerf?.layout), null, {
    timeout: 15000
  });
  const snapshot = await page.evaluate(() => ({
    health: window.trovePerf.health(),
    layout: window.trovePerf.layout(),
    perf: window.trovePerf.snapshot(),
    status: document.querySelector("#page-status")?.textContent || "",
    message: document.querySelector("#message")?.textContent || "",
    queueVisible: !document.querySelector("#queue-tray")?.hasAttribute("hidden")
  }));
  timings.push({
    label,
    checkedMs: Date.now() - startedAt,
    status: snapshot.status,
    message: snapshot.message,
    queueVisible: snapshot.queueVisible,
    healthIssues: snapshot.health.issues.length,
    layoutIssues: snapshot.layout.issues.length,
    queue: snapshot.perf.queue
  });
  if (!snapshot.health.ok) {
    throw new Error(`${label} app health issues:\n${JSON.stringify(snapshot.health.issues, null, 2)}`);
  }
  if (!snapshot.layout.ok) {
    throw new Error(`${label} layout issues:\n${JSON.stringify(snapshot.layout.issues, null, 2)}`);
  }
  return { label, snapshot, screenshots };
}

async function timed(label, timings, fn) {
  const startedAt = Date.now();
  const result = await fn();
  timings.push({ label, durationMs: Date.now() - startedAt });
  return result;
}

async function waitForQueueIdle(page, timeout = 120000) {
  await page.waitForFunction(
    () => {
      const queue = window.trovePerf?.queue?.();
      return Boolean(queue && !queue.running && !queue.current && Number(queue.waiting || 0) === 0);
    },
    null,
    { timeout }
  );
}

async function run() {
  const projectName = `Workflow Harness ${Date.now()}`;
  const app = await launchApp();
  let project;
  const timings = [];
  const screenshots = [];

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await timed("create project", timings, () => createProject(page, projectName));
    await captureHarnessStep(page, "after project create", timings);

    await timed("navigate primary search", timings, () => navigate(page, SEARCH_URL));
    await timed("wait inline actions", timings, () => waitForInlineActions(page, 4, 60000));
    await timed("save primary search", timings, () => saveCurrentSearch(page, "Wellington Dam"));
    screenshots.push(await screenshot(page, "workflow-harness-search.png"));
    await captureHarnessStep(page, "after saved search", timings);

    await timed("preview inline result", timings, () => clickInlineAction(page, { action: "preview", urlMatch: PREVIEW_TARGET }));
    await timed("preview button feedback", timings, () =>
      waitForInlineState(page, { action: "preview", urlMatch: PREVIEW_TARGET, expectText: "Preview" }, 10000)
    );
    await timed("preview loaded", timings, () =>
      waitForPreview(page, "text", { markdownIncludes: PREVIEW_TARGET, timeout: 90000 })
    );
    screenshots.push(await screenshot(page, "workflow-harness-preview.png"));
    await captureHarnessStep(page, "after preview", timings);

    await timed("navigate collect target", timings, () => navigate(page, COLLECT_TARGET));
    await timed("collect preview loaded", timings, () =>
      waitForPreview(page, "text", { markdownIncludes: COLLECT_TARGET, timeout: 90000 })
    );
    await timed("sidebar collect click", timings, () => clickSidebarCollect(page));
    await timed("sidebar collect instant feedback", timings, () =>
      waitForSidebarActionFeedback(
        page,
        { selector: "#capture-collect", busyText: "Collecting", finalText: "Collected" },
        1500
      )
    );
    await timed("sidebar collect saved", timings, () => waitForSidebarCollectState(page, "Collected", 120000));
    await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) => Array.isArray(doc?.saved) && doc.saved.length === 1
    );
    await timed("sidebar collect queue idle", timings, () => waitForQueueIdle(page));
    screenshots.push(await screenshot(page, "workflow-harness-collected.png"));
    await captureHarnessStep(page, "after collect", timings);

    await timed("navigate ignore target", timings, () => navigate(page, IGNORE_TARGET));
    await timed("ignore preview loaded", timings, () =>
      waitForPreview(page, "text", { markdownIncludes: IGNORE_TARGET, timeout: 90000 })
    );
    await timed("sidebar ignore click", timings, () => page.click("#capture-ignore"));
    await timed("sidebar ignore instant feedback", timings, () =>
      waitForSidebarActionFeedback(
        page,
        { selector: "#capture-ignore", busyText: "Ignoring", finalText: "Unignore" },
        1500
      )
    );
    await page.waitForFunction(
      () => /Unignore/i.test(document.querySelector("#capture-ignore")?.textContent || ""),
      null,
      { timeout: 120000 }
    );
    const manifest = await waitForManifest(
      project.projectDir,
      project.projectSlug,
      (doc) => Array.isArray(doc?.saved) && doc.saved.length === 1 && Array.isArray(doc?.ignored) && doc.ignored.length === 1
    );
    await timed("sidebar ignore queue idle", timings, () => waitForQueueIdle(page));
    screenshots.push(await screenshot(page, "workflow-harness-ignored.png"));
    await captureHarnessStep(page, "after ignore", timings);

    await timed("navigate secondary search", timings, () => navigate(page, SECOND_SEARCH_URL));
    await timed("save secondary search", timings, () => saveCurrentSearch(page, "Kranz Sheldon"));
    await timed("final queue idle", timings, () => waitForQueueIdle(page));
    await page.click("#mode-manage");
    await page.waitForSelector("#manage-view:not([hidden])");
    screenshots.push(await screenshot(page, "workflow-harness-library.png"));
    await captureHarnessStep(page, "library review", timings);

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          savedCount: manifest.saved.length,
          ignoredCount: manifest.ignored.length,
          timings,
          screenshots
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
