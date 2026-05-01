#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const screenshotDir = path.join(repoRoot, "tmp", "e2e-live");
const targetUrl = "https://collection.artgallery.wa.gov.au/objects?query=ships";

async function ensureScreenshotDir() {
  await fs.mkdir(screenshotDir, { recursive: true });
}

async function screenshot(page, name) {
  await ensureScreenshotDir();
  const shot = path.join(screenshotDir, name);
  await page.screenshot({ path: shot, fullPage: false });
  return shot;
}

async function navigate(page, url) {
  await page.evaluate((nextUrl) => {
    const input = document.querySelector("#address-input");
    const form = document.querySelector("#address-form");
    if (!(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error("Address form is unavailable.");
    }
    input.value = nextUrl;
    form.requestSubmit();
  }, url);
}

async function readAgwaState(page) {
  return page.evaluate(() => {
    const activeWebview = document.querySelector(".browser-webview.is-active");
    const webviewUrl = activeWebview && typeof activeWebview.getURL === "function" ? activeWebview.getURL() : "";
    const isLoading = activeWebview && typeof activeWebview.isLoading === "function" ? activeWebview.isLoading() : null;
    return {
      address: document.querySelector("#address-input")?.value || "",
      pageStatus: document.querySelector("#page-status")?.textContent?.trim() || "",
      pageKind: document.querySelector("#page-kind")?.textContent?.trim() || "",
      captureEmpty: document.querySelector("#capture-empty")?.textContent?.replace(/\s+/g, " ").trim() || "",
      webviewUrl,
      isLoading,
      bodyText: document.body?.textContent?.replace(/\s+/g, " ").trim().slice(0, 600) || ""
    };
  });
}

async function readAgwaWebviewState(page) {
  return page.evaluate(async () => {
    const activeWebview = document.querySelector(".browser-webview.is-active");
    if (!activeWebview || typeof activeWebview.executeJavaScript !== "function") {
      return { error: "active webview unavailable" };
    }
    return activeWebview.executeJavaScript(
      `(() => {
        const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
        const cards = Array.from(document.querySelectorAll(".lightbox-item, .card, .object, .object-tile, .grid-item"));
        const objectLinks = Array.from(document.querySelectorAll('a[href*="/objects/"]'));
        const actions = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
        return {
          title: document.title,
          readyState: document.readyState,
          href: location.href,
          objectLinks: objectLinks.length,
          cards: cards.length,
          inlineActions: actions.length,
          firstObjectLink: objectLinks[0] ? {
            href: objectLinks[0].href,
            text: clean(objectLinks[0].textContent || objectLinks[0].querySelector("img")?.alt || ""),
            cardClass: objectLinks[0].closest(".lightbox-item, .card, .object, .object-tile, .grid-item")?.className || ""
          } : null,
          firstAction: actions[0] ? {
            text: clean(actions[0].textContent),
            className: actions[0].className,
            rect: (() => {
              const rect = actions[0].getBoundingClientRect();
              return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            })()
          } : null
        };
      })();`,
      true
    );
  });
}

async function main() {
  const electronBinary = require("electron");
  const userDataDir = path.join(os.tmpdir(), `australian-library-browser-agwa-${process.pid}-${Date.now()}`);
  let app;

  try {
    app = await electron.launch({
      executablePath: electronBinary,
      args: [repoRoot],
      cwd: repoRoot,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "",
        AUSTRALIAN_LIBRARY_BROWSER_DISABLE_SINGLE_INSTANCE: "1",
        AUSTRALIAN_LIBRARY_BROWSER_USER_DATA_DIR: userDataDir
      }
    });

    const page = await app.firstWindow();
    await page.waitForSelector("#address-form", { timeout: 20000 });
    await navigate(page, targetUrl);
    await page.waitForFunction(
      () => {
        const webview = document.querySelector(".browser-webview.is-active");
        if (!webview || typeof webview.getURL !== "function") {
          return false;
        }
        const url = webview.getURL();
        const status = document.querySelector("#page-status")?.textContent || "";
        const kind = document.querySelector("#page-kind")?.textContent || "";
        return (
          /collection\.artgallery\.wa\.gov\.au\/objects/i.test(url) &&
          !/^Loading$/i.test(status.trim()) &&
          !/Waiting for a supported collection page/i.test(kind)
        );
      },
      null,
      { timeout: 60000 }
    );

    const state = await readAgwaState(page);
    const webviewState = await readAgwaWebviewState(page);
    const shot = await screenshot(page, "agwa-search-ships-load.png");
    if (state.isLoading || /^Loading$/i.test(state.pageStatus)) {
      throw new Error(`AGWA search still appears to be loading: ${JSON.stringify(state, null, 2)}`);
    }

    console.log(
      JSON.stringify(
        {
          targetUrl,
          screenshot: shot,
          state,
          webviewState
        },
        null,
        2
      )
    );
  } finally {
    await app?.close().catch(() => {});
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
