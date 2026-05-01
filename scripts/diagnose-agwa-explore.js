#!/usr/bin/env node
// Diagnostic harness for the AGWA /explore → search form → results flow.
// Captures state snapshots at each stage to show where things go wrong.
//
// Usage:
//   node scripts/diagnose-agwa-explore.js [search-term]
//
// Defaults to searching "ships".

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "tmp", "diagnose");
const searchTerm = process.argv[2] || "ships";
const exploreUrl = "https://collection.artgallery.wa.gov.au/explore";

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
      webviewUrl: webview && typeof webview.getURL === "function" ? webview.getURL() : "(no webview)",
      webviewLoading: webview && typeof webview.isLoading === "function" ? webview.isLoading() : null,
      didDomReady: webview?.__diagDidDomReady ?? null
    };
  });
}

async function guestState(page, label) {
  const result = await page.evaluate(async () => {
    const webview = document.querySelector(".browser-webview.is-active");
    if (!webview || typeof webview.executeJavaScript !== "function") {
      return { error: "active webview not found" };
    }
    return Promise.race([
      webview.executeJavaScript(`(() => {
        const clean = (v) => String(v || "").replace(/\\s+/g, " ").trim();
        const cards = Array.from(document.querySelectorAll(".lightbox-item, .card, .object, .object-tile, .grid-item"));
        const visibleCards = cards.filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom >= 0; });
        const objectLinks = Array.from(document.querySelectorAll('a[href*="/objects/"]'));
        const actionGroups = document.querySelectorAll(".trove-library-inline-actions");
        const agwaCardActions = document.querySelectorAll(".trove-library-inline-actions.agwa-card-actions");
        return {
          href: location.href,
          readyState: document.readyState,
          title: document.title,
          resultText: clean(document.body?.innerText || "").match(/\\d+\\s+results?[^\\n]*/i)?.[0] || "",
          bodyTextSnippet: clean(document.body?.innerText || "").slice(0, 400),
          cards: cards.length,
          visibleCards: visibleCards.length,
          objectLinks: objectLinks.length,
          inlineActionGroups: actionGroups.length,
          agwaCardActionGroups: agwaCardActions.length,
          styleInstalled: Boolean(document.getElementById("trove-library-decorations")),
          observerInstalled: Boolean(window.__troveLibraryObserver),
          pageStateKey: (() => { try { const s = window.__troveLibraryPageState; return s ? { hasApply: typeof s.apply === "function" } : null; } catch { return null; } })(),
          firstCard: cards[0] ? { className: cards[0].className, text: clean(cards[0].innerText).slice(0, 120) } : null,
          firstObjectLink: objectLinks[0] ? { href: objectLinks[0].href, bound: objectLinks[0].dataset.troveLibraryBound || "" } : null
        };
      })()`, true),
      new Promise(resolve => setTimeout(() => resolve({ error: "executeJavaScript timed out after 8s" }), 8000))
    ]);
  });
  process.stderr.write(`[${label}] ${result.error ? `ERROR: ${result.error}` : `url=${result.href?.split("?")[1] || result.href} cards=${result.cards} visible=${result.visibleCards} links=${result.objectLinks} actions=${result.inlineActionGroups} style=${result.styleInstalled} observer=${result.observerInstalled}`}\n`);
  return result;
}

async function navigateApp(page, url) {
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

async function submitExploreSearch(page, term) {
  return page.evaluate(async (searchTerm) => {
    const webview = document.querySelector(".browser-webview.is-active");
    if (!webview || typeof webview.executeJavaScript !== "function") {
      return { ok: false, reason: "no webview" };
    }
    return Promise.race([
      webview.executeJavaScript(`(() => {
        const candidates = Array.from(document.querySelectorAll('input[type="search"], input[name="query"], input[name="keyword"], input[type="text"]'));
        const input = candidates.find(n => /search|query|keyword/i.test([n.name, n.id, n.placeholder, n.getAttribute("aria-label")].join(" "))) || candidates[0];
        if (!input) return { ok: false, reason: "no search input found", inputs: candidates.length };
        input.focus();
        input.value = ${JSON.stringify(searchTerm)};
        input.dispatchEvent(new InputEvent("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        const form = input.closest("form");
        const submit = form?.querySelector('button[type="submit"]');
        if (submit) { submit.click(); }
        else if (form?.requestSubmit) { form.requestSubmit(); }
        else { input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })); }
        return { ok: true, inputId: input.id, inputName: input.name, formAction: form?.action || "" };
      })()`, true),
      new Promise(resolve => setTimeout(() => resolve({ ok: false, reason: "executeJS timed out" }), 6000))
    ]);
  }, term);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const userDataDir = path.join(os.tmpdir(), `agwa-explore-diagnose-${process.pid}-${Date.now()}`);
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

    // Step 1: Navigate to /explore
    process.stderr.write(`Step 1: Navigating to ${exploreUrl}\n`);
    await navigateApp(page, exploreUrl);
    await page.waitForFunction(
      () => {
        const wv = document.querySelector(".browser-webview.is-active");
        return wv && typeof wv.getURL === "function" && /\/explore/i.test(wv.getURL());
      },
      null,
      { timeout: 30000 }
    );
    await page.waitForTimeout(3000);
    const exploreShot = await shot(page, "explore-diag-1-explore-loaded.png");
    const exploreOuter = await outerState(page);
    const exploreGuest = await guestState(page, "explore-loaded");

    // Step 2: Submit the search form
    process.stderr.write(`\nStep 2: Submitting search for "${searchTerm}"\n`);
    const submitResult = await submitExploreSearch(page, searchTerm);
    process.stderr.write(`Submit result: ${JSON.stringify(submitResult)}\n`);

    if (!submitResult?.ok) {
      const failShot = await shot(page, "explore-diag-2-submit-fail.png");
      console.log(JSON.stringify({ stage: "submit-failed", submitResult, exploreOuter, exploreGuest, failShot }, null, 2));
      return;
    }

    // Step 3: Wait for URL to change to /objects
    process.stderr.write(`\nStep 3: Waiting for navigation to /objects...\n`);
    const navStart = Date.now();
    let navigationLanded = false;
    try {
      await page.waitForFunction(
        () => {
          const wv = document.querySelector(".browser-webview.is-active");
          const url = wv && typeof wv.getURL === "function" ? wv.getURL() : "";
          return /\/objects/i.test(url) && /query=/i.test(url);
        },
        null,
        { timeout: 60000 }
      );
      navigationLanded = true;
      process.stderr.write(`Navigation landed after ${Date.now() - navStart}ms\n`);
    } catch {
      process.stderr.write(`Navigation did NOT land within 60s\n`);
    }

    const navShot = await shot(page, "explore-diag-3-nav-result.png");
    const navOuter = await outerState(page);
    const navGuest = await guestState(page, "nav-result");

    // Step 4: Snapshots over time while page settles
    const settling = [];
    for (const [label, wait] of [["5s", 5000], ["10s", 5000], ["20s", 10000]]) {
      await page.waitForTimeout(wait);
      const o = await outerState(page);
      const g = await guestState(page, label);
      const s = await shot(page, `explore-diag-4-settle-${label}.png`);
      settling.push({ label, outer: o, guest: g, screenshot: s });
    }

    console.log(JSON.stringify({
      searchTerm,
      exploreUrl,
      navigationLanded,
      navigationMs: Date.now() - navStart,
      stages: {
        exploreLoaded: { outer: exploreOuter, guest: exploreGuest, screenshot: exploreShot },
        submitResult,
        navResult: { outer: navOuter, guest: navGuest, screenshot: navShot },
        settling
      }
    }, null, 2));

    process.stderr.write(`\nDone. Screenshots in: ${outDir}\n`);
  } finally {
    await app?.close().catch(() => {});
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
