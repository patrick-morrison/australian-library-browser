#!/usr/bin/env node

const { performance } = require("perf_hooks");

const {
  launchApp,
  createProject,
  navigate,
  waitForPreview,
  waitForSidebarCollectState,
  screenshot,
  cleanupProject
} = require("./live-e2e-helpers");

function parseArgs(argv) {
  const args = [...argv];
  let kind = "";
  const urls = [];
  while (args.length) {
    const value = args.shift();
    if (value === "--kind") {
      kind = String(args.shift() || "").trim().toLowerCase();
      continue;
    }
    urls.push(value);
  }
  return {
    kind,
    url:
      urls[0] ||
      "https://trove.nla.gov.au/newspaper/article/85178391"
  };
}

function inferKind(url, explicitKind) {
  if (explicitKind === "image" || explicitKind === "text") {
    return explicitKind;
  }
  if (/purl\.slwa\.wa\.gov\.au|\/category\/images|\/work\//i.test(url)) {
    return "image";
  }
  return "text";
}

async function waitForCollectAcknowledged(page, timeout = 10000) {
  await page.waitForFunction(() => {
    const button = document.querySelector("#capture-collect");
    const text = String(button?.textContent || "").trim();
    return Boolean(button && (/Collecting/i.test(text) || /Collected/i.test(text)));
  }, null, { timeout });
}

async function profileApiFlow(page, targetUrl) {
  return page.evaluate(async (url) => {
    const now = () => performance.now();
    const timings = {};

    const fetchStarted = now();
    const item = await window.troveApi.fetchItemByUrl(url, { mode: "preview" });
    timings.fetchPreviewMs = Math.round(now() - fetchStarted);

    let markdownLength = 0;
    if (item?.supported) {
      const markdownStarted = now();
      const markdown = await window.troveApi.previewMarkdown(item);
      timings.previewMarkdownMs = Math.round(now() - markdownStarted);
      markdownLength = String(markdown || "").length;
    }

    return {
      supported: Boolean(item?.supported),
      title: item?.title || "",
      type: item?.type || "",
      source: item?.source || "",
      markdownLength,
      timings
    };
  }, targetUrl);
}

async function installSaveProgressProbe(page) {
  await page.evaluate(() => {
    window.__troveProfileSaveProgress = [];
    if (window.__troveProfileSaveProgressInstalled) {
      return;
    }
    window.__troveProfileSaveProgressInstalled = true;
    window.troveApi.onSaveProgress((payload) => {
      window.__troveProfileSaveProgress.push({
        phase: payload?.phase || "",
        current: Number(payload?.current) || 0,
        completed: Number(payload?.completed) || 0,
        total: Number(payload?.total) || 0,
        ts: performance.now()
      });
    });
  });
}

async function readSaveProgressProfile(page) {
  return page.evaluate(() => {
    const events = Array.isArray(window.__troveProfileSaveProgress) ? window.__troveProfileSaveProgress : [];
    if (!events.length) {
      return {
        events: [],
        phases: {}
      };
    }
    const startedAt = events[0].ts;
    const summarise = (phase) => {
      const match = events.find((event) => event.phase === phase);
      return match ? Math.round(match.ts - startedAt) : null;
    };
    return {
      events: events.map((event) => ({
        phase: event.phase,
        current: event.current,
        completed: event.completed,
        total: event.total,
        atMs: Math.round(event.ts - startedAt)
      })),
      phases: {
        firstProgressMs: 0,
        firstDownloadMs: summarise("downloading"),
        firstSavedMs: summarise("saved"),
        completeMs: summarise("complete")
      }
    };
  });
}

async function run() {
  const { url, kind: requestedKind } = parseArgs(process.argv.slice(2));
  const kind = inferKind(url, requestedKind);
  const projectName = `Profile Flow ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    const apiProfile = await profileApiFlow(page, url);

    const previewStarted = performance.now();
    await navigate(page, url);
    await waitForPreview(page, kind, { timeout: 120000 });
    const previewReadyMs = Math.round(performance.now() - previewStarted);
    const previewShot = await screenshot(page, "profile-flow-preview.png");

    await installSaveProgressProbe(page);
    const collectClickStarted = performance.now();
    await page.click("#capture-collect");
    await waitForCollectAcknowledged(page, 10000);
    const collectAckMs = Math.round(performance.now() - collectClickStarted);
    await waitForSidebarCollectState(page, "Collected", 120000);
    const collectCompletedMs = Math.round(performance.now() - collectClickStarted);
    const saveProgressProfile = await readSaveProgressProfile(page);
    const collectedShot = await screenshot(page, "profile-flow-collected.png");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          url,
          kind,
          apiProfile,
          uiTimings: {
            previewReadyMs,
            collectAckMs,
            collectCompletedMs
          },
          saveProgressProfile,
          screenshots: [previewShot, collectedShot]
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
