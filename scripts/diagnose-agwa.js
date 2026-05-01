#!/usr/bin/env node
// Diagnostic harness for AGWA page loading issues.
// Launches the app, loads AGWA search, waits, then dumps full state to stdout + screenshots.
//
// Usage:
//   node scripts/diagnose-agwa.js [url]
//
// Defaults to the AGWA ships search. Pass a different URL as the first argument.

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "tmp", "diagnose");
const targetUrl = process.argv[2] || "https://collection.artgallery.wa.gov.au/objects?query=ships";

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function outerState(page) {
  return page.evaluate(() => {
    const webview = document.querySelector(".browser-webview.is-active");
    return {
      addressInput: document.querySelector("#address-input")?.value || "",
      pageStatus: document.querySelector("#page-status")?.textContent?.trim() || "",
      pageKind: document.querySelector("#page-kind")?.textContent?.trim() || "",
      message: document.querySelector("#message")?.textContent?.trim() || "",
      captureMarkdown: (document.querySelector("#capture-markdown")?.textContent || "").slice(0, 300),
      webviewUrl: webview && typeof webview.getURL === "function" ? webview.getURL() : "(no webview)",
      webviewLoading: webview && typeof webview.isLoading === "function" ? webview.isLoading() : null
    };
  });
}

async function guestState(page) {
  return page.evaluate(async () => {
    const webview = document.querySelector(".browser-webview.is-active");
    if (!webview || typeof webview.executeJavaScript !== "function") {
      return { error: "active webview not found" };
    }
    return Promise.race([
      webview.executeJavaScript(`(() => {
        const clean = (v) => String(v || "").replace(/\\s+/g, " ").trim();
        const rectOf = (node) => {
          if (!node) return null;
          const r = node.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom >= 0 };
        };
        const cards = Array.from(document.querySelectorAll(".lightbox-item, .card, .object, .object-tile, .grid-item"));
        const visibleCards = cards.filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom >= 0; });
        const objectLinks = Array.from(document.querySelectorAll('a[href*="/objects/"]'));
        const actionGroups = Array.from(document.querySelectorAll(".trove-library-inline-actions"));
        const agwaCardActions = Array.from(document.querySelectorAll(".trove-library-inline-actions.agwa-card-actions"));
        const styleInstalled = Boolean(document.getElementById("trove-library-decorations"));
        const observerInstalled = Boolean(window.__troveLibraryObserver);
        const firstCard = cards[0];
        const firstActionGroup = actionGroups[0];
        return {
          href: location.href,
          readyState: document.readyState,
          title: document.title,
          scrollY: Math.round(window.scrollY),
          innerHeight: window.innerHeight,
          bodyScrollHeight: document.body ? document.body.scrollHeight : 0,
          resultText: clean(document.body?.innerText || "").match(/\\d+\\s+results?[^\\n]*/i)?.[0] || "",
          cards: cards.length,
          visibleCards: visibleCards.length,
          objectLinks: objectLinks.length,
          inlineActionGroups: actionGroups.length,
          agwaCardActionGroups: agwaCardActions.length,
          styleInstalled,
          observerInstalled,
          stateKey: (() => { try { const s = window.__troveLibraryPageState; return s ? { savedUrls: (s.savedUrls || []).length, ignoredUrls: (s.ignoredUrls || []).length, hasApply: typeof s.apply === "function" } : null; } catch { return null; } })(),
          firstCard: firstCard ? { className: firstCard.className, rect: rectOf(firstCard), text: clean(firstCard.innerText).slice(0, 200) } : null,
          firstObjectLink: objectLinks[0] ? { href: objectLinks[0].href, text: clean(objectLinks[0].textContent || "").slice(0, 120), bound: objectLinks[0].dataset.troveLibraryBound || "", rect: rectOf(objectLinks[0]) } : null,
          firstActionGroup: firstActionGroup ? { dataUrl: firstActionGroup.getAttribute("data-trove-library-url"), className: firstActionGroup.className, rect: rectOf(firstActionGroup), buttons: Array.from(firstActionGroup.querySelectorAll("button")).map(b => ({ className: b.className, text: b.textContent, rect: rectOf(b) })) } : null,
          consoleErrors: window.__troveLibraryDiagErrors || []
        };
      })()`, true),
      new Promise(resolve => setTimeout(() => resolve({ error: "executeJavaScript timed out after 8s" }), 8000))
    ]);
  });
}

async function navigate(page, url) {
  await page.evaluate((nextUrl) => {
    const input = document.querySelector("#address-input");
    const form = document.querySelector("#address-form");
    if (!(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error("Address bar unavailable");
    }
    input.value = nextUrl;
    form.requestSubmit();
  }, url);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const userDataDir = path.join(os.tmpdir(), `agwa-diagnose-${process.pid}-${Date.now()}`);
  let app;

  try {
    const electronBinary = require("electron");
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

    process.stderr.write(`Navigating to: ${targetUrl}\n`);
    await navigate(page, targetUrl);

    // Wait until the webview URL matches or 60s passes
    await page.waitForFunction(
      (url) => {
        const wv = document.querySelector(".browser-webview.is-active");
        return wv && typeof wv.getURL === "function" && wv.getURL().includes("collection.artgallery.wa.gov.au");
      },
      targetUrl,
      { timeout: 60000 }
    ).catch(() => {});

    const snapshots = [];

    // Snapshot at 1s, 5s, 10s, 20s after navigation lands
    for (const [label, delay] of [["1s", 1000], ["5s", 5000], ["10s", 10000], ["20s", 20000]]) {
      await page.waitForTimeout(delay - (snapshots.length > 0 ? [1000, 5000, 10000][snapshots.length - 1] : 0));
      const o = await outerState(page);
      const g = await guestState(page);
      const shotFile = await shot(page, `agwa-diagnose-${label}.png`);
      snapshots.push({ label, outer: o, guest: g, screenshot: shotFile });
      process.stderr.write(`[${label}] webview=${o.webviewUrl} loading=${o.webviewLoading} cards=${g.cards ?? "?"} actions=${g.inlineActionGroups ?? "?"} styleInstalled=${g.styleInstalled ?? "?"} observerInstalled=${g.observerInstalled ?? "?"}\n`);
    }

    console.log(JSON.stringify({ targetUrl, snapshots }, null, 2));
    process.stderr.write(`\nScreenshots written to: ${outDir}\n`);
  } finally {
    await app?.close().catch(() => {});
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
