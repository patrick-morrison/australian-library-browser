#!/usr/bin/env node

const path = require("path");
const { chromium } = require("playwright");

const projectStore = require("../lib/project-store");
const sourceAdapters = require("../lib/source-adapters");

const repoRoot = path.resolve(__dirname, "..");
const SEARCH_TERMS = [
  "wreck",
  "ship",
  "ships",
  "barque",
  "harbour",
  "fremantle harbour",
  "sailing",
  "boat",
  "hms",
  "swan river"
];
const TARGET_COUNT = 20;
const AGWA_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function searchUrl(term, page = 1) {
  const url = new URL("https://collection.artgallery.wa.gov.au/objects");
  url.searchParams.set("query", term);
  url.searchParams.set("page", String(page));
  url.searchParams.set("direction", "asc");
  url.searchParams.set("sort", "");
  url.searchParams.set("hasImages", "false");
  url.searchParams.set("view", "lightbox");
  url.searchParams.set("searchType", "simple");
  url.searchParams.set("facetedResults", "true");
  return url.toString();
}

function normalizeCandidateTitle(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function relevanceScore(item) {
  const text = [
    item.title,
    item.description,
    item.rawMetadata,
    ...(item.metadataFields || []).flatMap((field) => [field.label, field.value])
  ]
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const term of [
    "wreck",
    "hms",
    "ship",
    "barque",
    "boat",
    "sailing",
    "harbour",
    "fremantle",
    "swan river",
    "vessel",
    "yacht",
    "convoy"
  ]) {
    if (text.includes(term)) {
      score += 1;
    }
  }
  if (/wreck|hms|barque|ship|boat|harbour|sailing|vessel|yacht|convoy/i.test(item.title || "")) {
    score += 3;
  }
  if (item.imageUrl) {
    score += 1;
  }
  return score;
}

async function collectSearchCandidates(page) {
  const byUrl = new Map();
  for (const term of SEARCH_TERMS) {
    for (const pageIndex of [1, 2]) {
      await page.goto(searchUrl(term, pageIndex), { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2500);
      const links = await page.evaluate((queryTerm) => {
        const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
        return Array.from(document.querySelectorAll('a[href*="/objects/"]'))
          .map((anchor) => ({
            url: new URL(anchor.href, location.href).toString().replace(/#.*$/, ""),
            title: clean(anchor.textContent || anchor.querySelector("img")?.alt || ""),
            term: queryTerm
          }))
          .filter((entry) => /\/objects\/\d+\//i.test(entry.url));
      }, term);
      for (const link of links) {
        const existing = byUrl.get(link.url) || { ...link, terms: [] };
        existing.title = normalizeCandidateTitle(existing.title || link.title);
        existing.terms = [...new Set([...(existing.terms || []), term])];
        byUrl.set(link.url, existing);
      }
    }
  }
  return [...byUrl.values()];
}

async function extractLiveItem(page, candidate) {
  await page.goto(candidate.url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const html = await page.content();
  const finalUrl = page.url();
  const item = sourceAdapters.extractItemFromHtml(finalUrl, html);
  if (!item?.supported || item.source !== "agwa") {
    return null;
  }
  return {
    ...item,
    aliases: [...new Set([...(item.aliases || []), candidate.url, finalUrl])],
    metadataFields: [
      ...(item.metadataFields || []),
      { label: "Collector search terms", value: candidate.terms.join(", ") }
    ]
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "en-AU",
    userAgent: AGWA_USER_AGENT,
    extraHTTPHeaders: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-AU,en;q=0.9"
    }
  });
  const page = await context.newPage();
  const detailPage = await context.newPage();
  const project = await projectStore.createProject(repoRoot, `AGWA Shipwreck Historic Ships ${Date.now()}`);
  const saved = [];
  const skipped = [];

  try {
    const candidates = await collectSearchCandidates(page);
    console.log(`[agwa] candidate object links ${candidates.length}`);
    for (const candidate of candidates) {
      if (saved.length >= TARGET_COUNT) {
        break;
      }
      try {
        const item = await extractLiveItem(detailPage, candidate);
        if (!item) {
          skipped.push({ url: candidate.url, reason: "unsupported" });
          continue;
        }
        if (relevanceScore(item) < 3) {
          skipped.push({ url: candidate.url, title: item.title, reason: "low relevance" });
          continue;
        }
        const summary = await projectStore.saveItem(project.path, item);
        const savedEntry =
          summary.saved.find((entry) => entry.url === item.url) ||
          summary.saved.find((entry) => (entry.aliases || []).includes(item.url)) ||
          null;
        saved.push({
          title: item.title,
          url: item.url,
          file: savedEntry?.metadataFile || savedEntry?.file || "",
          image: savedEntry?.assetFile || "",
          score: relevanceScore(item)
        });
        console.log(`[agwa] ${saved.length}/${TARGET_COUNT} ${item.title}`);
      } catch (error) {
        skipped.push({ url: candidate.url, reason: error.message });
      }
    }

    console.log(
      JSON.stringify(
        {
          projectPath: project.path,
          savedCount: saved.length,
          saved,
          skipped: skipped.slice(0, 20)
        },
        null,
        2
      )
    );
    if (saved.length < TARGET_COUNT) {
      throw new Error(`Only saved ${saved.length}/${TARGET_COUNT} AGWA ship-related records.`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
