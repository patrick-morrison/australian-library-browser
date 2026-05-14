#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { extractItemFromHtml } = require("../lib/source-adapters");

const repoRoot = path.resolve(__dirname, "..");
const pluginScriptPath = path.join(repoRoot, "src", "source-plugins.js");

const extractionFixtures = [
  {
    name: "trove-article",
    file: "test/fixtures/trove-article.html",
    url: "https://trove.nla.gov.au/newspaper/article/58768300",
    expect: { supported: true, source: "trove", type: "newspaper" }
  },
  {
    name: "nla-object-viewer",
    file: "test/fixtures/nla-object-viewer.html",
    url: "https://nla.gov.au/nla.obj-4161786467/view",
    expect: { supported: true, source: "trove", type: "image" }
  },
  {
    name: "slwa-record",
    file: "test/fixtures/slwa-record.html",
    url: "https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb3507773?lang=eng&suite=def",
    expect: { supported: true, source: "slwa", type: "image" }
  },
  {
    name: "slwa-viewer",
    file: "test/fixtures/slwa-viewer.html",
    url: "https://purl.slwa.wa.gov.au/slwa_b3507773_1",
    expect: { supported: true, source: "slwa", type: "image" }
  },
  {
    name: "wa-museum-record",
    file: "test/fixtures/wa-museum-record.html",
    url: "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/bat3868-bronze",
    expect: { supported: true, source: "wa-museum", type: "image" }
  },
  {
    name: "agwa-record",
    file: "test/fixtures/agwa-record.html",
    url: "https://collection.artgallery.wa.gov.au/objects/4492/not-titled-fishing-near-a-wreck-aborigines-plundering-the-wreck-of-the-william-wise",
    expect: { supported: true, source: "agwa", type: "image" }
  }
];

const decorationFixtures = [
  {
    name: "trove-search-links",
    file: "test/fixtures/trove-search.html",
    payload: { saved: [], ignored: [] },
    minInlineActions: 2
  },
  {
    name: "slwa-search-links",
    file: "test/fixtures/slwa-search.html",
    payload: { saved: [], ignored: [] },
    minInlineActions: 1
  },
  {
    name: "agwa-search-links",
    file: "test/fixtures/agwa-search.html",
    payload: { saved: [], ignored: [] },
    minInlineActions: 1,
    maxInlineActions: 1
  }
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runDecorationFixture(browser, fixture) {
  const page = await browser.newPage();
  await page.route("**/*", (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith("data:") || requestUrl.startsWith("file:")) {
      route.continue();
      return;
    }
    route.abort();
  });

  const html = fs.readFileSync(path.join(repoRoot, fixture.file), "utf8");
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ path: pluginScriptPath });
  const result = await page.evaluate((payload) => {
    const script = window.CollectionSourcePlugins.buildDecorationScript(payload);
    eval(script);
    return {
      inlineActions: document.querySelectorAll(".trove-library-inline-actions").length,
      hasBadge: Boolean(document.querySelector("#trove-library-page-badge"))
    };
  }, fixture.payload);
  await page.close();
  assert(
    result.inlineActions >= fixture.minInlineActions,
    `${fixture.name}: expected at least ${fixture.minInlineActions} inline actions, got ${result.inlineActions}`
  );
  if (Number.isFinite(fixture.maxInlineActions)) {
    assert(
      result.inlineActions <= fixture.maxInlineActions,
      `${fixture.name}: expected at most ${fixture.maxInlineActions} inline actions, got ${result.inlineActions}`
    );
  }
  return result;
}

async function main() {
  const extractionResults = extractionFixtures.map((fixture) => {
    const html = fs.readFileSync(path.join(repoRoot, fixture.file), "utf8");
    const item = extractItemFromHtml(fixture.url, html);
    assert(item.supported === fixture.expect.supported, `${fixture.name}: supported mismatch`);
    assert(item.source === fixture.expect.source, `${fixture.name}: source mismatch`);
    assert(item.type === fixture.expect.type, `${fixture.name}: type mismatch`);
    return {
      name: fixture.name,
      title: item.title,
      source: item.source,
      type: item.type
    };
  });

  const browser = await chromium.launch({ headless: true });
  try {
    const decorationResults = [];
    for (const fixture of decorationFixtures) {
      const result = await runDecorationFixture(browser, fixture);
      decorationResults.push({ name: fixture.name, ...result });
    }

    console.log(
      JSON.stringify(
        {
          extractionResults,
          decorationResults
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
