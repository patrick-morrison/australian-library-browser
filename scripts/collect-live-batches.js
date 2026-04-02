#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const { chromium } = require("playwright");
const projectStore = require("../lib/project-store");
const { extractItemFromHtml } = require("../lib/source-adapters");

const repoRoot = path.resolve(__dirname, "..");
const batchRoot = process.env.TROVE_BATCH_OUTPUT_ROOT || "";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

async function createBatchProjects() {
  const rootDir =
    batchRoot ||
    (await fs.mkdtemp(path.join(os.tmpdir(), "australian-library-browser-batch-")));
  return {
    rootDir,
    museum: await projectStore.createProject(rootDir, `Batavia Objects WA Museum ${Date.now()}`),
    trove: await projectStore.createProject(rootDir, `Wellington Dam Trove ${Date.now()}`),
    slwa: await projectStore.createProject(rootDir, `Swan River SLWA ${Date.now()}`)
  };
}

function cleanHref(url) {
  try {
    const next = new URL(url);
    if (next.hostname === "museum.wa.gov.au") {
      next.protocol = "https:";
    }
    next.searchParams.delete("searchTerm");
    next.hash = "";
    return next.toString();
  } catch {
    return String(url || "").trim();
  }
}

async function collectDetail(page, project, url, waitMs = 1500) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(waitMs);
  const html = await page.content();
  const item = extractItemFromHtml(page.url(), html);
  if (!item?.supported) {
    return { ok: false, url: page.url(), reason: item?.reason || "unsupported" };
  }
  await projectStore.saveItem(project.path, item);
  return { ok: true, url: page.url(), item };
}

async function collectMuseum(searchPage, detailPage, project, targetCount) {
  const found = [];
  const saved = [];

  for (let pageIndex = 0; pageIndex < 3 && found.length < targetCount; pageIndex += 1) {
    const url =
      pageIndex === 0
        ? "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia"
        : `https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia?page=${pageIndex}`;
    await searchPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await searchPage.waitForTimeout(1500);
    if (pageIndex === 0) {
      await searchPage.screenshot({ path: "/tmp/batch-museum-search.png" });
    }
    const links = await searchPage.evaluate(() =>
      Array.from(document.querySelectorAll(".wrap .title a[href]")).map((anchor) => ({
        title: String(anchor.textContent || "").replace(/\s+/g, " ").trim(),
        href: anchor.href
      }))
    );
    for (const link of links) {
      const href = cleanHref(link.href);
      if (!found.some((entry) => entry.href === href)) {
        found.push({ title: link.title, href });
      }
      if (found.length >= targetCount) {
        break;
      }
    }
  }

  for (const [index, entry] of found.entries()) {
    const result = await collectDetail(detailPage, project, entry.href, 1200);
    if (index === 0) {
      await detailPage.screenshot({ path: "/tmp/batch-museum-detail.png" });
    }
    if (result.ok) {
      saved.push({
        title: result.item.title,
        type: result.item.type,
        url: result.item.url
      });
    }
  }

  return saved;
}

async function collectTrove(searchPage, detailPage, project, targetCount) {
  const seen = new Set();
  const saved = [];

  for (let pageIndex = 1; pageIndex <= 3 && saved.length < targetCount; pageIndex += 1) {
    const url = `https://trove.nla.gov.au/search/category/newspapers?keyword=wellington%20dam&page=${pageIndex}`;
    await searchPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await searchPage.waitForSelector('a[href*="/newspaper/article/"]', { timeout: 15000 }).catch(() => {});
    await searchPage.waitForTimeout(1500);
    if (pageIndex === 1) {
      await searchPage.screenshot({ path: "/tmp/batch-trove-search.png" });
    }
    const links = await searchPage.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]"))
        .filter((anchor) => /\/newspaper\/article\/\d+/i.test(anchor.href))
        .map((anchor) => ({
          title: String(anchor.textContent || "").replace(/\s+/g, " ").trim(),
          href: anchor.href
        }))
        .filter((entry) => entry.title)
    );

    for (const link of links) {
      const href = cleanHref(link.href);
      if (seen.has(href)) {
        continue;
      }
      seen.add(href);
      const result = await collectDetail(detailPage, project, href, 2200);
      if (!result.ok) {
        continue;
      }
      if (saved.length === 0) {
        await detailPage.screenshot({ path: "/tmp/batch-trove-detail.png" });
      }
      saved.push({
        title: result.item.title,
        type: result.item.type,
        url: result.item.url
      });
      if (saved.length >= targetCount) {
        break;
      }
    }
  }

  return saved;
}

async function collectSlwa(searchPage, detailPage, project, targetCount) {
  const seen = new Set();
  const saved = [];

  for (let pageIndex = 0; pageIndex < 5 && saved.length < targetCount; pageIndex += 1) {
    const suffix = pageIndex === 0 ? "__Orightresult__U__X0" : `__P0%2C${pageIndex}__Orightresult__U__X0`;
    const url = `https://encore.slwa.wa.gov.au/iii/encore/search/C__SSwan%20River${suffix}?lang=eng&suite=def`;
    await searchPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await searchPage.waitForTimeout(2500);
    if (pageIndex === 0) {
      await searchPage.screenshot({ path: "/tmp/batch-slwa-search.png" });
    }
    const links = await searchPage.evaluate(() =>
      Array.from(document.querySelectorAll('a[id^="recordDisplayLink2Component"][href]')).map((anchor) => ({
        title: String(anchor.textContent || "").replace(/\s+/g, " ").trim(),
        href: anchor.href
      }))
    );

    for (const entry of links) {
      const href = cleanHref(entry.href);
      if (seen.has(href)) {
        continue;
      }
      seen.add(href);
      const result = await collectDetail(detailPage, project, href, 1800);
      if (!result.ok || result.item.type !== "image") {
        continue;
      }
      if (saved.length === 0) {
        await detailPage.screenshot({ path: "/tmp/batch-slwa-detail.png" });
      }
      saved.push({
        title: result.item.title,
        type: result.item.type,
        url: result.item.url
      });
      if (saved.length >= targetCount) {
        break;
      }
    }
  }

  return saved;
}

async function main() {
  const projects = await createBatchProjects();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    userAgent: USER_AGENT,
    locale: "en-AU",
    extraHTTPHeaders: {
      "Accept-Language": "en-AU,en;q=0.9",
      "Upgrade-Insecure-Requests": "1"
    }
  });

  const searchPage = await context.newPage();
  const detailPage = await context.newPage();

  try {
    const summary = {
      outputRoot: projects.rootDir,
      projects: {
        museum: projects.museum,
        trove: projects.trove,
        slwa: projects.slwa
      },
      museum: await collectMuseum(searchPage, detailPage, projects.museum, 20),
      trove: await collectTrove(searchPage, detailPage, projects.trove, 20),
      slwa: await collectSlwa(searchPage, detailPage, projects.slwa, 10)
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
