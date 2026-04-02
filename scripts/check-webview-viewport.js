#!/usr/bin/env node

const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

async function loadUrl(page, targetUrl) {
  await page.evaluate(async (url) => {
    const webview = document.querySelector("#webview-stack webview");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 45000);
      webview.addEventListener(
        "did-stop-loading",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
      webview.addEventListener(
        "did-fail-load",
        (event) => {
          if (event.errorCode === -3) {
            return;
          }
          clearTimeout(timeout);
          reject(new Error(event.errorDescription || "failed"));
        },
        { once: true }
      );
      webview.loadURL(url);
    });
  }, targetUrl);
}

async function main() {
  const electronBinary = require("electron");
  const userDataDir = path.join(os.tmpdir(), `trove-browser-viewport-${process.pid}-${Date.now()}`);
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [process.cwd()],
    cwd: process.cwd(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "",
      TROVE_BROWSER_DISABLE_SINGLE_INSTANCE: "1",
      TROVE_BROWSER_USER_DATA_DIR: userDataDir
    }
  });
  const page = await app.firstWindow();
  await page.waitForTimeout(2500);
  await loadUrl(page, process.argv[2] || "https://trove.nla.gov.au/search?keyword=wellington%20dam%20opening");
  await page.waitForTimeout(3000);

  const metrics = await page.evaluate(async () => {
    const webview = document.querySelector("#webview-stack webview");
    return webview.executeJavaScript(
      `({
        href: location.href,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        bodyClientHeight: document.body ? document.body.clientHeight : null,
        bodyScrollHeight: document.body ? document.body.scrollHeight : null,
        docClientHeight: document.documentElement ? document.documentElement.clientHeight : null,
        docScrollHeight: document.documentElement ? document.documentElement.scrollHeight : null,
        layoutHeight: document.querySelector("#ui-layout-main") ? document.querySelector("#ui-layout-main").getBoundingClientRect().height : null,
        layoutScrollHeight: document.querySelector("#ui-layout-main") ? document.querySelector("#ui-layout-main").scrollHeight : null,
        appRootHeight: document.querySelector("#app") ? document.querySelector("#app").getBoundingClientRect().height : null,
        bodyOverflowY: document.body ? getComputedStyle(document.body).overflowY : null,
        docOverflowY: document.documentElement ? getComputedStyle(document.documentElement).overflowY : null
      })`,
      true
    );
  });

  console.log(JSON.stringify(metrics, null, 2));
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
