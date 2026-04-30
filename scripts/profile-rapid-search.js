#!/usr/bin/env node

const { performance } = require("perf_hooks");

const {
  launchApp,
  createProject,
  navigate,
  waitForInlineActions,
  screenshot,
  cleanupProject
} = require("./live-e2e-helpers");

function parseArgs(argv) {
  const args = [...argv];
  const config = {
    url: "https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam&l-state=Western%20Australia",
    clicks: 3
  };
  while (args.length) {
    const value = args.shift();
    if (value === "--clicks") {
      config.clicks = Math.max(1, Number.parseInt(args.shift() || "3", 10) || 3);
      continue;
    }
    if (!config.url || config.url === "https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam&l-state=Western%20Australia") {
      config.url = value;
    }
  }
  return config;
}

async function webviewEval(page, expression, payload) {
  return page.evaluate(
    async ({ script, arg }) => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        throw new Error("Webview unavailable");
      }
      return webview.executeJavaScript(`(${script})(${JSON.stringify(arg)})`, true);
    },
    { script: expression, arg: payload }
  );
}

async function collectPreviewTargets(page, count) {
  return webviewEval(
    page,
    `(requiredCount) => {
      const groups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
      const resolveContainer = (group) => {
        let pointer = group;
        while (pointer && pointer !== document.body) {
          const text = String(pointer.textContent || "").replace(/\\s+/g, " ").trim();
          const links = pointer.querySelectorAll("a[href]").length;
          if (text.length > 60 && links > 0) {
            return pointer;
          }
          pointer = pointer.parentElement;
        }
        return group.parentElement || group;
      };
      return groups
        .map((group, index) => {
          const preview = group.querySelector("button.preview");
          const container = resolveContainer(group);
          const link = container?.querySelector("a[href]");
          const titleLink = container?.querySelector(".title a[href]") || link;
          const text = String(container?.textContent || "").replace(/\\s+/g, " ").trim();
          return {
            index,
            text,
            title: String(titleLink?.textContent || "").replace(/\\s+/g, " ").trim(),
            href: link?.href || "",
            previewText: String(preview?.textContent || "").trim()
          };
        })
        .filter((entry) => entry.href && entry.previewText)
        .slice(0, requiredCount);
    }`,
    count
  );
}

async function clickPreviewAtIndex(page, index) {
  return webviewEval(
    page,
    `(targetIndex) => {
      const groups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
      const group = groups[targetIndex];
      const button = group?.querySelector("button.preview");
      if (!(button instanceof HTMLButtonElement)) {
        return { ok: false };
      }
      button.click();
      return { ok: true, text: String(button.textContent || "").trim() };
    }`,
    index
  );
}

async function waitForPreviewingAtIndex(page, index, timeout = 10000) {
  await page.waitForFunction(
    async (targetIndex) => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        return false;
      }
      try {
        return await webview.executeJavaScript(
          `((index) => {
            const groups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
            const button = groups[index]?.querySelector("button.preview");
            return Boolean(button && button.classList.contains("is-loading"));
          })(${JSON.stringify(targetIndex)})`,
          true
        );
      } catch {
        return false;
      }
    },
    index,
    { timeout }
  );
}

async function getPreviewLoadingState(page) {
  return webviewEval(
    page,
    `() => {
      const groups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
      return groups
        .map((group, index) => {
          const button = group.querySelector("button.preview");
          return {
            index,
            loading: Boolean(button?.classList.contains("is-loading")),
            text: String(button?.textContent || "").trim()
          };
        })
        .filter((entry) => entry.loading);
    }`,
    null
  );
}

async function waitForPreviewIdle(page, timeout = 15000) {
  await page.waitForFunction(
    async () => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        return false;
      }
      try {
        return await webview.executeJavaScript(
          `(() => !document.querySelector(".trove-library-inline-actions button.preview.is-loading"))()`,
          true
        );
      } catch {
        return false;
      }
    },
    null,
    { timeout }
  );
}

async function getAppSnapshot(page) {
  return page.evaluate(() => {
    const snapshot = window.trovePerf?.snapshot?.() || null;
    const status = document.querySelector("#page-status")?.textContent || "";
    const empty = document.querySelector("#capture-empty")?.textContent || "";
    const markdown = document.querySelector("#capture-markdown")?.innerText || "";
    return {
      status,
      empty,
      markdownStart: markdown.slice(0, 500),
      snapshot
    };
  });
}

async function waitForCaptureMatch(page, target, timeout = 120000) {
  const matched = await page.waitForFunction(
    (expected) => {
      const status = (document.querySelector("#page-status")?.textContent || "").toLowerCase();
      const markdown = document.querySelector("#capture-markdown")?.innerText || "";
      const expectedUrl = String(expected.href || "");
      const expectedCanonicalUrl = expectedUrl.replace(/[?#].*$/, "");
      const expectedTitle = String(expected.title || "").toLowerCase();
      const normalizeTitle = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return (
        (expectedUrl && markdown.includes(expectedUrl)) ||
        (expectedCanonicalUrl && markdown.includes(expectedCanonicalUrl)) ||
        (expectedTitle &&
          (normalizeTitle(status).includes(normalizeTitle(expectedTitle)) ||
            normalizeTitle(markdown).includes(normalizeTitle(expectedTitle))))
      );
    },
    target,
    { timeout }
  );
  return Boolean(await matched.jsonValue());
}

async function waitForCaptureSettled(page, target, timeout = 35000) {
  return page.waitForFunction(
    (expected) => {
      const status = (document.querySelector("#page-status")?.textContent || "").toLowerCase();
      const empty = (document.querySelector("#capture-empty")?.textContent || "").toLowerCase();
      const markdown = document.querySelector("#capture-markdown")?.innerText || "";
      const expectedUrl = String(expected.href || "");
      const expectedCanonicalUrl = expectedUrl.replace(/[?#].*$/, "");
      const expectedTitle = String(expected.title || "").toLowerCase();
      const normalizeTitle = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const matched =
        (expectedUrl && markdown.includes(expectedUrl)) ||
        (expectedCanonicalUrl && markdown.includes(expectedCanonicalUrl)) ||
        (expectedTitle &&
          (normalizeTitle(status).includes(normalizeTitle(expectedTitle)) ||
            normalizeTitle(markdown).includes(normalizeTitle(expectedTitle))));
      const failed =
        status.includes("taking too long") ||
        status.includes("could not build") ||
        empty.includes("taking too long") ||
        empty.includes("could not build");
      return matched || failed ? { matched, failed, status, empty } : false;
    },
    target,
    { timeout }
  ).then((handle) => handle.jsonValue());
}

async function run() {
  const { url, clicks } = parseArgs(process.argv.slice(2));
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, `Rapid Search Profile ${Date.now()}`);

    const navigationStarted = performance.now();
    await navigate(page, url);
    await waitForInlineActions(page, clicks, 90000);
    const inlineReadyMs = Math.round(performance.now() - navigationStarted);

    const targets = await collectPreviewTargets(page, clicks);
    if (targets.length < clicks) {
      throw new Error(`Only found ${targets.length} previewable results.`);
    }
    console.log(`[profile] collected ${targets.length} preview targets`);

    const clickProfiles = [];
    for (const target of targets) {
      console.log(`[profile] preview click ${target.index}: ${target.title || target.href}`);
      const clickStarted = performance.now();
      const clicked = await clickPreviewAtIndex(page, target.index);
      if (!clicked?.ok) {
        throw new Error(`Could not click preview at index ${target.index}.`);
      }
      await waitForPreviewingAtIndex(page, target.index, 10000);
      clickProfiles.push({
        index: target.index,
        href: target.href,
        label: target.text.slice(0, 140),
        ackMs: Math.round(performance.now() - clickStarted)
      });
      const loadingState = await getPreviewLoadingState(page);
      if (loadingState.length > 1) {
        throw new Error(`Expected only the latest preview spinner, found ${loadingState.length}.`);
      }
      await page.waitForTimeout(60);
    }

    const lastTarget = targets[targets.length - 1];
    const finalPreviewStarted = performance.now();
    let settled = null;
    try {
      settled = await waitForCaptureSettled(page, lastTarget, 45000);
    } catch (error) {
      const loadingState = await getPreviewLoadingState(page).catch(() => []);
      const appSnapshot = await getAppSnapshot(page).catch((snapshotError) => ({
        error: snapshotError?.message || String(snapshotError)
      }));
      throw new Error(
        `Final preview did not settle before timeout.\n${JSON.stringify({ loadingState, appSnapshot }, null, 2)}`
      );
    }
    const finalPreviewMs = Math.round(performance.now() - finalPreviewStarted);
    await waitForPreviewIdle(page, 15000);
    if (!settled?.matched) {
      throw new Error(`Final preview did not render: ${settled?.status || settled?.empty || "unknown preview state"}`);
    }

    const inlineShot = await screenshot(page, "rapid-search-inline-state.png");
    const previewShot = await screenshot(page, "rapid-search-final-preview.png");

    console.log(
      JSON.stringify(
        {
          projectName: project.projectName,
          projectDir: project.projectDir,
          url,
          inlineReadyMs,
          clickProfiles,
          finalTarget: {
            href: lastTarget.href,
            label: lastTarget.text.slice(0, 140)
          },
          finalPreviewMs,
          screenshots: [inlineShot, previewShot]
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
