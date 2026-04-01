#!/usr/bin/env node

const path = require("path");
const { chromium } = require("playwright");

const PROBE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const PROBE_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-AU,en;q=0.9",
  "Upgrade-Insecure-Requests": "1"
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseArgs(argv) {
  const args = {
    waitMs: 4000,
    urls: []
  };

  for (const arg of argv) {
    if (arg.startsWith("--wait=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value >= 0) {
        args.waitMs = value;
      }
      continue;
    }
    args.urls.push(arg);
  }

  return args;
}

async function probePage(page, url, waitMs) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });
  await page.waitForTimeout(waitMs);

  const details = await page.evaluate(() => {
    const summarizeLink = (anchor) => ({
      text: String(anchor.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180),
      href: anchor.href,
      id: anchor.id || "",
      className: String(anchor.className || "").replace(/\s+/g, " ").trim(),
      context: [
        anchor.parentElement?.className || "",
        anchor.parentElement?.parentElement?.className || ""
      ]
        .join(" <- ")
        .replace(/\s+/g, " ")
        .trim()
    });

    const links = Array.from(document.querySelectorAll("a[href]"));
    const recordishLinks = links
      .filter((anchor) => {
        const href = anchor.href;
        if (!href) {
          return false;
        }
        return (
          /record|article|work|image|viewer|item|object|manifest|detail|display/i.test(href) ||
          /record|result|title|image|thumbnail|object|detail/i.test(
            [
              anchor.id,
              anchor.className,
              anchor.parentElement?.className,
              anchor.parentElement?.parentElement?.className
            ]
              .filter(Boolean)
              .join(" ")
          )
        );
      })
      .map(summarizeLink)
      .filter((link) => link.text || link.href)
      .slice(0, 40);

    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((node) => String(node.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 20);

    return {
      finalUrl: location.href,
      title: document.title,
      bodySnippet: String(document.body?.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500),
      headings,
      counts: {
        links: document.querySelectorAll("a[href]").length,
        images: document.images.length,
        forms: document.forms.length,
        buttons: document.querySelectorAll("button, [role='button']").length
      },
      recordishLinks
    };
  });

  const shotPath = path.join("/tmp", `source-probe-${slugify(details.title || url)}.png`);
  await page.screenshot({ path: shotPath, fullPage: false });

  return {
    requestedUrl: url,
    screenshot: shotPath,
    ...details
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.urls.length) {
    console.error("Usage: node scripts/probe-source.js [--wait=4000] <url> <url> ...");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    locale: "en-AU",
    userAgent: PROBE_USER_AGENT,
    extraHTTPHeaders: PROBE_HEADERS
  });
  const page = await context.newPage();

  const results = [];
  try {
    for (const url of args.urls) {
      try {
        results.push(await probePage(page, url, args.waitMs));
      } catch (error) {
        results.push({
          requestedUrl: url,
          error: error.message
        });
      }
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
