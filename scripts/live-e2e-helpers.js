#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const yaml = require("js-yaml");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const screenshotDir = path.join(repoRoot, "tmp", "e2e-live");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureScreenshotDir() {
  await fs.mkdir(screenshotDir, { recursive: true });
}

async function launchApp() {
  const electronBinary = require("electron");
  const userDataDir = path.join(os.tmpdir(), `australian-library-browser-e2e-${process.pid}-${Date.now()}`);
  return electron.launch({
    executablePath: electronBinary,
    args: [repoRoot],
    cwd: repoRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "",
      AUSTRALIAN_LIBRARY_BROWSER_DISABLE_SINGLE_INSTANCE: "1",
      AUSTRALIAN_LIBRARY_BROWSER_DISABLE_GPU: "1",
      AUSTRALIAN_LIBRARY_BROWSER_USER_DATA_DIR: userDataDir
    }
  });
}

async function createProject(page, projectName) {
  const projectSlug = slugify(projectName);
  const projectDir = path.join(repoRoot, projectSlug);
  console.log(`[live] creating project ${projectName}`);
  await page.click("#mode-manage");
  await page.click("#new-project-button");
  await page.waitForSelector("#project-dialog:not([hidden])");
  await page.fill("#project-dialog-name", projectName);
  await page.click("#project-dialog-form .primary-action");
  await page.waitForFunction(() => document.querySelector(".app-shell")?.classList.contains("mode-collect"), null, {
    timeout: 20000
  });
  await page.waitForFunction(
    (slug) => {
      const text = document.querySelector("#project-details")?.textContent || "";
      return text.toLowerCase().includes(slug);
    },
    projectSlug,
    { timeout: 20000 }
  );
  return { projectName, projectSlug, projectDir };
}

async function navigate(page, url) {
  console.log(`[live] navigate ${url}`);
  await page.evaluate((targetUrl) => {
    const input = document.querySelector("#address-input");
    const form = document.querySelector("#address-form");
    if (!(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error("Address form unavailable");
    }
    input.value = targetUrl;
    form.requestSubmit();
  }, url);
}

async function waitForInlineActions(page, minCount = 1, timeout = 30000) {
  console.log("[live] waiting for inline actions");
  await page.waitForSelector("#webview-stack webview", { timeout });
  let bestCount = 0;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const currentCount = await page.evaluate(async () => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        return 0;
      }
      return webview.executeJavaScript(
        `(() => document.querySelectorAll(".trove-library-inline-actions").length)()`,
        true
      ).catch(() => 0);
    });
    bestCount = Math.max(bestCount, Number(currentCount || 0));
    if (bestCount >= minCount) {
      break;
    }
    await page.waitForTimeout(250);
  }
  if (bestCount < minCount) {
    throw new Error(`Expected at least ${minCount} inline action groups, found ${bestCount}.`);
  }
  return bestCount;
}

async function webviewEval(page, expression, arg) {
  return page.evaluate(
    async ({ script, payload }) => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        throw new Error("Webview unavailable");
      }
      return webview.executeJavaScript(`(${script})(${JSON.stringify(payload)})`, true);
    },
    { script: expression, payload: arg }
  );
}

async function clickInlineAction(page, { action, textMatch = "", urlMatch = "", index = 0 }) {
  console.log(`[live] inline ${action} ${urlMatch || textMatch || `(index ${index})`}`);
  return webviewEval(
    page,
    `(payload) => {
      const groups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
      const normalizedNeedle = String(payload.textMatch || "").toLowerCase();
      const normalizedUrlNeedle = String(payload.urlMatch || "").toLowerCase();
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
      const candidates = groups
        .map((group) => {
          const button = group.querySelector("button." + payload.action);
          const container = resolveContainer(group);
          const text = String(container?.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();
          const url = String(group.getAttribute("data-trove-library-url") || "").toLowerCase();
          return { group, button, container, text, url };
        })
        .filter((entry) => entry.button)
        .filter((entry) => (normalizedUrlNeedle ? entry.url.includes(normalizedUrlNeedle) : true))
        .filter((entry) => (normalizedNeedle ? entry.text.includes(normalizedNeedle) : true));
      const entry = candidates[payload.index] || null;
      const button = entry?.button || null;
      if (!(button instanceof HTMLButtonElement)) {
        return { ok: false, count: candidates.length };
      }
      button.click();
      return {
        ok: true,
        text: button.textContent || "",
        containerText: String(entry.container?.textContent || "")
          .replace(/\\s+/g, " ")
          .trim()
          .slice(0, 500)
      };
    }`,
    { action, textMatch, urlMatch, index }
  );
}

async function waitForInlineState(
  page,
  { action = "", textMatch = "", urlMatch = "", index = 0, expectText = "", rowOpacity, rowContains = "" },
  timeout = 60000
) {
  await page.waitForFunction(
    async (payload) => {
      const webview = document.querySelector("#webview-stack webview");
      if (!webview) {
        return false;
      }
      try {
        return await webview.executeJavaScript(
          `((config) => {
            const needle = String(config.textMatch || "").toLowerCase();
            const urlNeedle = String(config.urlMatch || "").toLowerCase();
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
            const groups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
            const candidates = groups.map((group, groupIndex) => {
              const buttons = Array.from(group.querySelectorAll("button"));
              const button = config.action
                ? buttons.find((candidate) => candidate.classList.contains(config.action)) || null
                : buttons.find((candidate) => {
                    if (!config.expectText) {
                      return true;
                    }
                    return String(candidate.textContent || "").replace(/\\s+/g, " ").trim() === config.expectText;
                  }) || buttons[0] || null;
              const container = resolveContainer(group);
              const text = String(container?.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();
              const url = String(group.getAttribute("data-trove-library-url") || "").toLowerCase();
              return { button, container, text, url, groupIndex };
            }).filter((candidate) => {
              if (needle && !candidate.text.includes(needle)) {
                return false;
              }
              if (urlNeedle && !candidate.url.includes(urlNeedle)) {
                return false;
              }
              return true;
            });
            const entry = candidates[Number(config.index || 0)] || null;
            const button = entry?.button || null;
            const container = entry?.container || null;
            if (!button || !container) {
              return false;
            }
            const buttonText = String(button.textContent || "").replace(/\\s+/g, " ").trim();
            const rowText = String(container?.textContent || "").replace(/\\s+/g, " ").trim();
            const rowStyle = container ? getComputedStyle(container) : null;
            if (config.expectText && buttonText !== config.expectText) {
              return false;
            }
            if (config.rowContains && !rowText.toLowerCase().includes(String(config.rowContains).toLowerCase())) {
              return false;
            }
            if (config.rowOpacity != null) {
              const opacity = Number(rowStyle?.opacity || 1);
              if (opacity > Number(config.rowOpacity)) {
                return false;
              }
            }
            return true;
          })(${JSON.stringify(payload)})`,
          true
        );
      } catch {
        return false;
      }
    },
    { action, textMatch, urlMatch, index, expectText, rowOpacity, rowContains },
    { timeout }
  );
}

async function waitForPreview(page, kind, options = {}) {
  const normalizedOptions = typeof options === "number" ? { timeout: options } : options;
  const timeout = normalizedOptions.timeout || 90000;
  const markdownIncludes = String(normalizedOptions.markdownIncludes || "");
  const imageSrcIncludes = String(normalizedOptions.imageSrcIncludes || "");
  console.log(`[live] waiting for ${kind} preview`);
  await page.waitForFunction(
    ({ expectKind, expectedMarkdown, expectedImageSrc }) => {
      const body = document.querySelector("#capture-body");
      if (!body || body.hidden) {
        return false;
      }
      const markdown = document.querySelector("#capture-markdown")?.innerText || "";
      const image = document.querySelector("#capture-image-gallery .capture-gallery-primary img");
      const imageSrc = String(image?.currentSrc || image?.src || "");
      if (expectKind === "text") {
        return markdown.length > 250 && /Link:/i.test(markdown) && (!expectedMarkdown || markdown.includes(expectedMarkdown));
      }
      if (expectKind === "image") {
        const expectedImage = expectedImageSrc ? imageSrc.includes(expectedImageSrc) : /\.jpg/i.test(imageSrc);
        return (
          markdown.length > 120 &&
          Boolean(image && image.naturalWidth > 300 && expectedImage) &&
          (!expectedMarkdown || markdown.includes(expectedMarkdown)) &&
          (!expectedImageSrc || expectedImage)
        );
      }
      return markdown.length > 100 && (!expectedMarkdown || markdown.includes(expectedMarkdown));
    },
    { expectKind: kind, expectedMarkdown: markdownIncludes, expectedImageSrc: imageSrcIncludes },
    { timeout }
  );
}

async function clickSidebarCollect(page) {
  console.log("[live] sidebar collect");
  await page.click("#capture-collect");
}

async function waitForSidebarActionFeedback(
  page,
  { selector, busyText, finalText = "", expectQueue = true },
  timeout = 1500
) {
  await page.waitForFunction(
    ({ buttonSelector, busyNeedle, finalNeedle, shouldExpectQueue }) => {
      const button = document.querySelector(buttonSelector);
      if (!(button instanceof HTMLButtonElement)) {
        return false;
      }
      const text = String(button.textContent || "").replace(/\s+/g, " ").trim();
      const isBusy = button.getAttribute("aria-busy") === "true" || button.classList.contains("is-loading");
      const hasBusyText = busyNeedle ? text.includes(busyNeedle) : false;
      const hasFinalText = finalNeedle ? text.includes(finalNeedle) : false;
      const queueVisible = !document.querySelector("#queue-tray")?.hasAttribute("hidden");
      if (isBusy && hasBusyText && (!shouldExpectQueue || queueVisible)) {
        return true;
      }
      return Boolean(hasFinalText);
    },
    {
      buttonSelector: selector,
      busyNeedle: busyText,
      finalNeedle: finalText,
      shouldExpectQueue: expectQueue
    },
    { timeout }
  );
}

async function waitForSidebarCollectState(page, expectedText, timeout = 90000) {
  await page.waitForFunction(
    (text) => {
      const button = document.querySelector("#capture-collect");
      return Boolean(button && String(button.textContent || "").includes(text));
    },
    expectedText,
    { timeout }
  );
}

async function confirmDialog(page) {
  page.once("dialog", (dialog) => dialog.accept());
}

async function expectManageSummary(page, text, timeout = 30000) {
  await page.click("#mode-manage");
  await page.waitForFunction(
    (value) => (document.querySelector("#manage-summary")?.textContent || "").includes(value),
    text,
    { timeout }
  );
}

async function screenshot(page, name) {
  await ensureScreenshotDir();
  const shot = path.join(screenshotDir, name);
  await page.screenshot({ path: shot, fullPage: false });
  return shot;
}

async function readManifest(projectDir, projectSlug) {
  const manifestPath = path.join(projectDir, `${projectSlug}.trovelibrary`);
  const manifest = yaml.load(await fs.readFile(manifestPath, "utf8"));
  return { manifestPath, manifest };
}

async function cleanupProject(projectDir) {
  await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
}

module.exports = {
  repoRoot,
  screenshotDir,
  slugify,
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
  confirmDialog,
  expectManageSummary,
  screenshot,
  readManifest,
  cleanupProject
};
