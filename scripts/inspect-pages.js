#!/usr/bin/env node

const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

async function waitForLoad(page, url) {
  await page.evaluate(async (targetUrl) => {
    const webview = document.querySelector("#webview-stack webview");
    const waitLoad = () =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout waiting for did-stop-loading")), 45000);
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
            reject(new Error(event.errorDescription || "failed loading"));
          },
          { once: true }
        );
      });
    webview.loadURL(targetUrl);
    await waitLoad();
  }, url);
}

async function inspect(page, url, label) {
  await waitForLoad(page, url);
  await page.waitForTimeout(3000);
  const info = await page.evaluate(async () => {
    const webview = document.querySelector("#webview-stack webview");
    return webview.executeJavaScript(
      `({
        href: location.href,
        title: document.title,
        bodySnippet: (document.body?.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 260),
        links: document.querySelectorAll("a[href]").length,
        images: document.images.length
      })`,
      true
    );
  });
  const shot = `/tmp/${label}.png`;
  await page.screenshot({ path: shot, fullPage: false });
  return { label, url, shot, info };
}

async function main() {
  const repoRoot = process.cwd();
  const electronBinary = require("electron");
  const userDataDir = path.join(os.tmpdir(), `australian-library-browser-inspect-${process.pid}-${Date.now()}`);
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
  const page = await app.firstWindow();
  await page.waitForTimeout(2500);

  const cases = [
    ["example", "https://example.com/"],
    ["trove-search", "https://trove.nla.gov.au/search?keyword=wellington%20dam%20opening"],
    ["trove-article", "https://trove.nla.gov.au/newspaper/article/58768300"],
    ["slwa-search", "https://encore.slwa.wa.gov.au/iii/encore/search/C__SWellington%20Dam__Orightresult__U__X0?lang=eng&suite=def"]
  ];

  const results = [];
  for (const [label, url] of cases) {
    try {
      results.push(await inspect(page, url, label));
    } catch (error) {
      results.push({ label, url, error: error.message });
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
