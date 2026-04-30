#!/usr/bin/env node

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
  readManifest,
  cleanupProject
} = require("./live-e2e-helpers");

const sites = [
  {
    label: "Trove",
    searchUrl: "https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam&l-state=Western%20Australia",
    detailUrl: "https://trove.nla.gov.au/newspaper/article/85178391",
    previewKind: "text",
    previewIncludes: "https://trove.nla.gov.au/newspaper/article/85178391",
    collectMode: "rapid-reversal"
  },
  {
    label: "SLWA",
    searchUrl: "https://encore.slwa.wa.gov.au/iii/encore/search/C__SWellington%20Dam__Orightresult__U?lang=eng&suite=def",
    detailUrl: "https://purl.slwa.wa.gov.au/slwa_b3507746_1",
    previewKind: "image",
    previewIncludes: "https://purl.slwa.wa.gov.au/slwa_b3507746_1",
    collectMode: "collect"
  },
  {
    label: "WA Museum",
    searchUrl: "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia",
    detailUrl: "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/bat3868-bronze",
    previewKind: "any",
    previewIncludes: "museum.wa.gov.au/maritime-archaeology-db/artefacts",
    collectMode: "collect"
  }
];

async function harnessSnapshot(page, label) {
  const snapshot = await page.evaluate(() => ({
    health: window.trovePerf.health(),
    layout: window.trovePerf.layout(),
    queue: window.trovePerf.queue(),
    collectText: document.querySelector("#capture-collect")?.textContent?.trim() || "",
    ignoreText: document.querySelector("#capture-ignore")?.textContent?.trim() || "",
    progressText: document.querySelector("#capture-progress")?.textContent?.trim() || ""
  }));
  if (!snapshot.health.ok) {
    throw new Error(`${label} health issues:\n${JSON.stringify(snapshot.health.issues, null, 2)}`);
  }
  if (!snapshot.layout.ok) {
    throw new Error(`${label} layout issues:\n${JSON.stringify(snapshot.layout.issues, null, 2)}`);
  }
  if (/Removing/i.test(`${snapshot.collectText} ${snapshot.ignoreText}`)) {
    throw new Error(`${label} left a primary action stuck in a removing state.`);
  }
  return snapshot;
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

async function exerciseSearchPageActions(page, label) {
  const collectIndex = 2;
  const ignoreIndex = 3;
  const collectResult = await clickInlineAction(page, { action: "collect", index: collectIndex });
  if (!collectResult.ok) {
    throw new Error(`${label} could not click inline Collect on the search page.`);
  }
  await waitForInlineState(page, { action: "collect", index: collectIndex, expectText: "Collected" }, 1500);

  const ignoreResult = await clickInlineAction(page, { action: "ignore", index: ignoreIndex });
  if (!ignoreResult.ok) {
    throw new Error(`${label} could not click inline Ignore on the search page.`);
  }
  await waitForInlineState(page, { action: "ignore", index: ignoreIndex, expectText: "Unignore" }, 1500);

  await waitForQueueIdle(page);
  await harnessSnapshot(page, `${label} search inline collect/ignore`);
}

async function assertInlineButtonGeometryStable(page, label) {
  const readRects = () =>
    page.evaluate(async () => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        return null;
      }
      return webview.executeJavaScript(
        `(() => {
          const group = Array.from(document.querySelectorAll(".trove-library-inline-actions")).find(
            (candidate) => candidate.querySelectorAll("button").length === 3
          );
          if (!group) {
            return null;
          }
          const groupRect = group.getBoundingClientRect();
          return {
            groupWidth: Math.round(groupRect.width),
            buttons: Array.from(group.querySelectorAll("button")).map((button) => {
              const rect = button.getBoundingClientRect();
              return {
                cls: button.className,
                text: button.textContent.trim(),
                width: Math.round(rect.width),
                left: Math.round(rect.left)
              };
            })
          };
        })()`,
        true
      );
    });
  const startedAt = Date.now();
  let before = null;
  while (Date.now() - startedAt < 30000) {
    before = await readRects();
    if (before?.buttons?.length === 3) {
      break;
    }
    await page.waitForTimeout(250);
  }
  if (!before || before.buttons.length !== 3) {
    throw new Error(`${label} expected exactly three inline buttons: ${JSON.stringify(before)}`);
  }
  await page.evaluate(async () => {
    const webview = document.querySelector("#webview-stack webview");
    await webview.executeJavaScript(
      `(() => Array.from(document.querySelectorAll(".trove-library-inline-actions")).find((group) => group.querySelectorAll("button").length === 3)?.querySelector("button.preview")?.click())()`,
      true
    );
  });
  await page.waitForTimeout(80);
  const after = await readRects();
  if (!after || after.buttons.length !== before.buttons.length) {
    throw new Error(`${label} inline button count changed after click.`);
  }
  before.buttons.forEach((button, index) => {
    const next = after.buttons[index];
    if (Math.abs(next.width - button.width) > 1 || Math.abs(next.left - button.left) > 1) {
      throw new Error(
        `${label} inline button moved after click: ${JSON.stringify({ before: button, after: next })}`
      );
    }
  });
  if (Math.abs(after.groupWidth - before.groupWidth) > 1) {
    throw new Error(`${label} inline action group width changed after click.`);
  }
}

async function assertSidebarButtonGeometryStable(page, before, label) {
  const after = await page.evaluate(() => {
    const collect = document.querySelector("#capture-collect")?.getBoundingClientRect();
    const ignore = document.querySelector("#capture-ignore")?.getBoundingClientRect();
    return {
      collect: collect ? { width: Math.round(collect.width), left: Math.round(collect.left) } : null,
      ignore: ignore ? { width: Math.round(ignore.width), left: Math.round(ignore.left) } : null
    };
  });
  for (const key of ["collect", "ignore"]) {
    if (!before[key] || !after[key]) {
      throw new Error(`${label} missing ${key} button geometry.`);
    }
    if (Math.abs(after[key].width - before[key].width) > 1 || Math.abs(after[key].left - before[key].left) > 1) {
      throw new Error(`${label} ${key} button moved: ${JSON.stringify({ before: before[key], after: after[key] })}`);
    }
  }
  return after;
}

async function collectNormally(page, label) {
  await clickSidebarCollect(page);
  await waitForSidebarActionFeedback(
    page,
    { selector: "#capture-collect", busyText: "Collecting", finalText: "Collected" },
    1500
  );
  await waitForSidebarCollectState(page, "Collected", 120000);
  await waitForQueueIdle(page);
  return harnessSnapshot(page, `${label} collect`);
}

async function rapidCollectReversal(page, label) {
  let geometry = await page.evaluate(() => {
    const collect = document.querySelector("#capture-collect")?.getBoundingClientRect();
    const ignore = document.querySelector("#capture-ignore")?.getBoundingClientRect();
    return {
      collect: collect ? { width: Math.round(collect.width), left: Math.round(collect.left) } : null,
      ignore: ignore ? { width: Math.round(ignore.width), left: Math.round(ignore.left) } : null
    };
  });
  await clickSidebarCollect(page);
  await page.waitForFunction(() => /Collected/i.test(document.querySelector("#capture-collect")?.textContent || ""), null, {
    timeout: 1500
  });
  geometry = await assertSidebarButtonGeometryStable(page, geometry, `${label} after collect`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#capture-collect");
  await page.waitForFunction(() => /^Collect$/i.test((document.querySelector("#capture-collect")?.textContent || "").trim()), null, {
    timeout: 5000
  });
  geometry = await assertSidebarButtonGeometryStable(page, geometry, `${label} after uncollect`);
  await page.click("#capture-collect");
  await page.waitForFunction(() => /Collected/i.test(document.querySelector("#capture-collect")?.textContent || ""), null, {
    timeout: 1500
  });
  await assertSidebarButtonGeometryStable(page, geometry, `${label} after recollect`);
  await waitForQueueIdle(page);
  const snapshot = await harnessSnapshot(page, `${label} rapid collect reversal`);
  if (!/Collected/i.test(snapshot.collectText)) {
    throw new Error(`${label} rapid reversal did not settle on Collected.`);
  }
  return snapshot;
}

async function run() {
  const projectName = `Supported Sites Harness ${Date.now()}`;
  const app = await launchApp();
  let project;
  const screenshots = [];
  const results = [];

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    for (const site of sites) {
      await navigate(page, site.searchUrl);
      const inlineCount = await waitForInlineActions(page, 1, 90000);
      await assertInlineButtonGeometryStable(page, `${site.label} search`);
      await exerciseSearchPageActions(page, site.label);
      screenshots.push(await screenshot(page, `supported-${site.label.toLowerCase().replace(/\s+/g, "-")}-search.png`));
      await harnessSnapshot(page, `${site.label} search`);

      await navigate(page, site.detailUrl);
      await waitForPreview(page, site.previewKind, {
        markdownIncludes: site.previewIncludes,
        timeout: 120000
      });
      screenshots.push(await screenshot(page, `supported-${site.label.toLowerCase().replace(/\s+/g, "-")}-detail.png`));
      await harnessSnapshot(page, `${site.label} detail`);

      const collectSnapshot =
        site.collectMode === "rapid-reversal"
          ? await rapidCollectReversal(page, site.label)
          : await collectNormally(page, site.label);
      results.push({
        label: site.label,
        inlineCount,
        collectText: collectSnapshot.collectText,
        progressText: collectSnapshot.progressText
      });
    }

    const { manifest } = await readManifest(project.projectDir, project.projectSlug);
    const savedCount = Array.isArray(manifest.saved) ? manifest.saved.length : 0;
    if (savedCount < sites.length) {
      throw new Error(`Expected at least ${sites.length} saved items, found ${savedCount}.`);
    }

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          savedCount,
          results,
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
