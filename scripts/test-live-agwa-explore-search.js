#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const screenshotDir = path.join(repoRoot, "tmp", "e2e-live");
const exploreUrl = "https://collection.artgallery.wa.gov.au/explore";

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

async function executeInActiveWebview(page, source) {
  return page.evaluate(async (script) => {
    const webview = document.querySelector(".browser-webview.is-active");
    if (!webview || typeof webview.executeJavaScript !== "function") {
      throw new Error("Active webview is unavailable.");
    }
    return Promise.race([
      webview.executeJavaScript(script, true),
      new Promise((resolve) => {
        setTimeout(() => resolve({ error: "webview executeJavaScript timed out" }), 6000);
      })
    ]);
  }, source);
}

async function readOuterState(page) {
  return page.evaluate(() => {
    const webview = document.querySelector(".browser-webview.is-active");
    return {
      address: document.querySelector("#address-input")?.value || "",
      pageStatus: document.querySelector("#page-status")?.textContent?.trim() || "",
      pageKind: document.querySelector("#page-kind")?.textContent?.trim() || "",
      webviewUrl: webview && typeof webview.getURL === "function" ? webview.getURL() : "",
      isLoading: webview && typeof webview.isLoading === "function" ? webview.isLoading() : null
    };
  });
}

async function clickVisibleAgwaAction(app, page, action) {
  const size = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const ratios = {
    preview: { x: 0.666, y: 0.958 },
    collect: { x: 0.679, y: 0.958 }
  };
  const point = ratios[action] || ratios.preview;
  const hostPoint = {
    x: Math.round(size.width * point.x),
    y: Math.round(size.height * point.y)
  };
  const hit = await app.evaluate(
    async ({ BrowserWindow, webContents }, clickPoint) => {
      const guest = webContents
        .getAllWebContents()
        .find((contents) => /collection\.artgallery\.wa\.gov\.au\/objects/i.test(contents.getURL()));
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) {
        return { ok: false, reason: "BrowserWindow not found" };
      }
      guest?.focus();
      window.webContents.focus();
      window.webContents.sendInputEvent({ type: "mouseMove", x: clickPoint.x, y: clickPoint.y });
      window.webContents.sendInputEvent({ type: "mouseDown", x: clickPoint.x, y: clickPoint.y, button: "left", clickCount: 1 });
      window.webContents.sendInputEvent({ type: "mouseUp", x: clickPoint.x, y: clickPoint.y, button: "left", clickCount: 1 });
      return { ok: true, method: "host-coordinate-click", x: clickPoint.x, y: clickPoint.y, guestUrl: guest?.getURL() || "" };
    },
    hostPoint
  );
  if (!hit.ok) {
    throw new Error(`Could not click AGWA ${action} action: ${JSON.stringify(hit)}`);
  }
  return hit;
}

async function scrollAgwaResultsToActions(app, page) {
  return app.evaluate(async ({ BrowserWindow, webContents }) => {
    const guest = webContents
      .getAllWebContents()
      .find((contents) => /collection\.artgallery\.wa\.gov\.au\/objects/i.test(contents.getURL()));
    const window = BrowserWindow.getAllWindows()[0];
    if (!guest) {
      return { ok: false, reason: "AGWA guest webContents not found" };
    }
    guest.focus();
    window?.webContents.focus();
    const bounds = window?.getBounds?.() || { width: 2960, height: 1726 };
    const x = Math.round(bounds.width * 0.68);
    const y = Math.round(bounds.height * 0.72);
    for (let index = 0; index < 18; index += 1) {
      window?.webContents.sendInputEvent({ type: "mouseMove", x, y });
      window?.webContents.sendInputEvent({ type: "mouseWheel", x, y, deltaY: 980, canScroll: true });
      guest.sendInputEvent({ type: "mouseWheel", x: Math.round(bounds.width * 0.42), y: Math.round(bounds.height * 0.62), deltaY: 980, canScroll: true });
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return { ok: true, method: "guest-and-host-wheel", guestUrl: guest.getURL() };
  });
}

async function readAgwaSearchState(page) {
  return executeInActiveWebview(
    page,
    `(() => {
      const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
      const rectSummary = (node) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight
        };
      };
      const cards = Array.from(document.querySelectorAll(".lightbox-item, .card, .object, .object-tile, .grid-item"));
      const objectLinks = Array.from(document.querySelectorAll('a[href*="/objects/"]'));
      const visibleCards = cards.filter((card) => {
        const rect = card.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight;
      });
      return {
        title: document.title,
        href: location.href,
        readyState: document.readyState,
        scrollY: Math.round(window.scrollY),
        innerHeight: window.innerHeight,
        bodyHeight: document.body?.scrollHeight || 0,
        resultText: clean(document.body?.innerText || "").match(/\\d+ results[^\\n]*/i)?.[0] || "",
        objectLinks: objectLinks.length,
        cards: cards.length,
        visibleCards: visibleCards.length,
        inlineActions: document.querySelectorAll(".trove-library-inline-actions").length,
        firstCard: cards[0] ? {
          className: cards[0].className,
          text: clean(cards[0].innerText).slice(0, 220),
          rect: rectSummary(cards[0])
        } : null,
        firstObjectLink: objectLinks[0] ? {
          href: objectLinks[0].href,
          text: clean(objectLinks[0].textContent || objectLinks[0].querySelector("img")?.alt || ""),
          rect: rectSummary(objectLinks[0]),
          cardRect: rectSummary(objectLinks[0].closest(".lightbox-item, .card, .object, .object-tile, .grid-item"))
        } : null
      };
    })();`
  );
}

async function main() {
  const electronBinary = require("electron");
  const userDataDir = path.join(os.tmpdir(), `australian-library-browser-agwa-explore-${process.pid}-${Date.now()}`);
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
    await navigate(page, exploreUrl);
    await page.waitForFunction(
      () => {
        const webview = document.querySelector(".browser-webview.is-active");
        return webview && typeof webview.getURL === "function" && /collection\.artgallery\.wa\.gov\.au\/explore/i.test(webview.getURL());
      },
      null,
      { timeout: 30000 }
    );
    await page.waitForTimeout(2500);
    const before = await executeInActiveWebview(
      page,
      `(() => {
        const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
        return Array.from(document.querySelectorAll('input, textarea, button, a')).slice(0, 120).map((node) => ({
          tag: node.tagName,
          type: node.getAttribute("type") || "",
          name: node.getAttribute("name") || "",
          id: node.id || "",
          placeholder: node.getAttribute("placeholder") || "",
          text: clean(node.textContent || node.value || "").slice(0, 80)
        }));
      })();`
    );
    const beforeShot = await screenshot(page, "agwa-explore-before-search.png");

    const submitResult = await executeInActiveWebview(
      page,
      `(() => {
        const candidates = Array.from(document.querySelectorAll('input[type="search"], input[name="query"], input[name="keyword"], input[type="text"], input:not([type])'));
        const isSearchLike = (node) => /search|keyword|query|collection/i.test([node.name, node.id, node.placeholder, node.getAttribute("aria-label")].join(" "));
        const formScore = (node) => {
          const form = node.closest("form");
          const action = String(form?.action || form?.getAttribute("action") || "");
          let score = 0;
          if (/objects|search|explore/i.test(action)) score += 4;
          if (isSearchLike(node)) score += 3;
          if (/^query$/i.test(node.id || node.name || "")) score += 3;
          return score;
        };
        const visibleCandidates = candidates
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              node,
              rect,
              score: formScore(node),
              visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
            };
          })
          .filter((entry) => entry.visible);
        const input =
          candidates
            .map((node) => ({ node, score: formScore(node) }))
            .sort((a, b) => b.score - a.score)[0]?.node ||
          visibleCandidates.sort((a, b) => b.score - a.score)[0]?.node ||
          candidates[0];
        if (!input) {
          return { ok: false, reason: "search input not found", candidates: candidates.length };
        }
        input.scrollIntoView({ block: "center" });
        input.focus();
        input.value = "ships";
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "ships" }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        const form = input.closest("form");
        const submit = form?.querySelector('button[type="submit"], input[type="submit"]') ||
          Array.from(document.querySelectorAll('button, input[type="submit"], a')).find((node) => /search/i.test(String(node.textContent || node.value || node.getAttribute("aria-label") || "")));
        if (submit instanceof HTMLElement) {
          submit.click();
        } else if (form?.requestSubmit) {
          form.requestSubmit();
        } else {
          input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
        }
        return {
          ok: true,
          input: { id: input.id, name: input.name, placeholder: input.placeholder },
          formAction: form?.action || "",
          candidateCount: candidates.length
        };
      })();`
    );
    if (!submitResult?.ok) {
      throw new Error(`Could not submit AGWA explore search: ${JSON.stringify({ submitResult, before }, null, 2)}`);
    }

    try {
      await page.waitForFunction(
        () => {
          const webview = document.querySelector(".browser-webview.is-active");
          const url = webview && typeof webview.getURL === "function" ? webview.getURL() : "";
          return /collection\.artgallery\.wa\.gov\.au\/objects/i.test(url) && /query=ships/i.test(url);
        },
        null,
        { timeout: 60000 }
      );
    } catch (error) {
      const stalledShot = await screenshot(page, "agwa-explore-search-submit-stalled.png");
      const stalledOuter = await readOuterState(page);
      throw new Error(
        `AGWA explore search did not navigate to result URL: ${JSON.stringify(
          { submitResult, stalledOuter, stalledShot },
          null,
          2
        )}`
      );
    }
    await page.waitForTimeout(16000);

    const outer = await readOuterState(page);
    const searchShot = await screenshot(page, "agwa-explore-search-ready.png");
    const scrollResult = await scrollAgwaResultsToActions(app, page);
    if (!scrollResult.ok) {
      throw new Error(`Could not expose AGWA inline actions: ${JSON.stringify(scrollResult)}`);
    }
    await page.waitForTimeout(800);
    const actionsShot = await screenshot(page, "agwa-explore-actions-visible.png");
    const previewClick = await clickVisibleAgwaAction(app, page, "preview");
    try {
      await page.waitForFunction(
        () => {
          const status = document.querySelector("#page-status")?.textContent || "";
          const markdown = document.querySelector("#capture-markdown")?.textContent || "";
          return !/^Loading$/i.test(status.trim()) && /collection\.artgallery\.wa\.gov\.au\/objects\//i.test(markdown);
        },
        null,
        { timeout: 30000 }
      );
    } catch (error) {
      const previewMissShot = await screenshot(page, "agwa-explore-preview-click-missed.png");
      const previewMissOuter = await readOuterState(page);
      const agwaState = await readAgwaSearchState(page).catch((stateError) => ({
        error: String(stateError?.message || stateError || "AGWA state read failed")
      }));
      throw new Error(
        `AGWA preview click did not land: ${JSON.stringify(
          { previewClick, previewMissOuter, agwaState, actionsShot, previewMissShot },
          null,
          2
        )}`
      );
    }
    const previewOuter = await readOuterState(page);
    const collectClick = await clickVisibleAgwaAction(app, page, "collect");
    await page.waitForFunction(
      () => {
        const message = document.querySelector("#message")?.textContent || "";
        const buttons = Array.from(document.querySelectorAll("webview"));
        return /Collected|Saved|queued|Queue/i.test(message) || buttons.length > 0;
      },
      null,
      { timeout: 30000 }
    );
    const afterShot = await screenshot(page, "agwa-explore-after-search.png");

    console.log(
      JSON.stringify(
        {
          exploreUrl,
          beforeShot,
          searchShot,
          actionsShot,
          afterShot,
          beforeControls: before,
          submitResult,
          outer,
          scrollResult,
          previewClick,
          previewOuter,
          collectClick
        },
        null,
        2
      )
    );

    if (outer.isLoading || /^Loading$/i.test(outer.pageStatus)) {
      throw new Error(`AGWA search stayed in loading state: ${JSON.stringify(outer, null, 2)}`);
    }
  } finally {
    await app?.close().catch(() => {});
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
