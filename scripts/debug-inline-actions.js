#!/usr/bin/env node

const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");

async function main() {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    throw new Error("Usage: node scripts/debug-inline-actions.js <url>");
  }

  const electronBinary = require("electron");
  const userDataDir = path.join(os.tmpdir(), `australian-library-browser-inline-debug-${process.pid}-${Date.now()}`);
  const app = await electron.launch({
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

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    await page.click("#mode-manage");
    await page.fill("#project-name", `Inline Debug ${Date.now()}`);
    await page.press("#project-name", "Enter");
    await page.waitForSelector("#capture-panel");

    await page.evaluate(async (url) => {
      const webview = document.querySelector("#webview-stack webview");
      const waitLoad = () =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`timeout loading ${url}`)), 60000);
          const done = () => {
            clearTimeout(timeout);
            resolve();
          };
          webview.addEventListener("did-stop-loading", done, { once: true });
          webview.addEventListener(
            "did-fail-load",
            (event) => {
              if (event.errorCode === -3) {
                return;
              }
              clearTimeout(timeout);
              reject(new Error(event.errorDescription || `failed loading ${url}`));
            },
            { once: true }
          );
        });
      webview.loadURL(url);
      await waitLoad();
    }, targetUrl);

    await page.waitForTimeout(5000);

    const payload = await page.evaluate(async () => {
      const webview = document.querySelector("#webview-stack webview");
      return webview.executeJavaScript(
        `(() => {
          const links = Array.from(document.querySelectorAll("a[href]"))
            .slice(0, 40)
            .map((anchor) => ({
              href: anchor.href,
              text: String(anchor.textContent || "").replace(/\\s+/g, " ").trim(),
              parentClass: anchor.parentElement?.className || "",
              bound: anchor.dataset.troveLibraryBound || "",
              nextClass: anchor.nextElementSibling?.className || ""
            }));
          return {
            url: location.href,
            title: document.title,
            styleInstalled: Boolean(document.getElementById("trove-library-decorations")),
            actionCount: document.querySelectorAll(".trove-library-inline-actions .preview").length,
            boundCount: document.querySelectorAll("a[data-trove-library-bound='true']").length,
            links
          };
        })()`,
        true
      );
    });

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
