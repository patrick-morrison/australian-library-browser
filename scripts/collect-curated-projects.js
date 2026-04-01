#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const { chromium } = require("playwright");

const projectStore = require("../lib/project-store");
const { extractItemFromHtml } = require("../lib/source-adapters");

const repoRoot = path.resolve(__dirname, "..");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureProject(name) {
  const expectedFolder = path.join(repoRoot, `${slugify(name)}.trovelibrary`);
  try {
    await fs.access(expectedFolder);
    const projects = await projectStore.listProjects(repoRoot);
    const existing = projects.find((project) => project.path === expectedFolder);
    if (existing) {
      return existing;
    }
  } catch {
    // Create below.
  }
  return projectStore.createProject(repoRoot, name);
}

async function fetchDetail(page, url, waitForSelector, waitMs = 1500) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(waitMs);
  const html = await page.content();
  return extractItemFromHtml(page.url(), html);
}

function uniqueByUrl(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry?.url || seen.has(entry.url)) {
      return false;
    }
    seen.add(entry.url);
    return true;
  });
}

function extractYear(value) {
  const match = String(value || "").match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function topCounts(items, getter, limit = 5) {
  const counts = new Map();
  for (const item of items) {
    const values = getter(item).filter(Boolean);
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function fieldValues(item, label) {
  return (item.metadataFields || [])
    .filter((field) => String(field.label || "").trim().toLowerCase() === label.toLowerCase())
    .map((field) => String(field.value || "").trim())
    .filter(Boolean);
}

function summarizeMuseum(items) {
  const materials = topCounts(items, (item) => fieldValues(item, "Material"));
  const statuses = topCounts(items, (item) => fieldValues(item, "Status"));
  const locations = topCounts(items, (item) => fieldValues(item, "Site Location"));
  const imageCount = items.filter((item) => item.type === "image").length;
  return [
    "# Collection Report",
    "",
    "## Scope",
    "",
    `- 20 Batavia object records collected from the WA Museum Maritime Archaeology Databases.`,
    `- ${imageCount} of the saved records include downloadable images; ${items.length - imageCount} are metadata-only captures.`,
    "",
    "## What Stands Out",
    "",
    materials.length
      ? `- Repeated material groups: ${materials.map(([value, count]) => `${value} (${count})`).join(", ")}.`
      : "- Material data was not extracted consistently enough to rank.",
    statuses.length
      ? `- Status fields in this set are dominated by: ${statuses.map(([value, count]) => `${value} (${count})`).join(", ")}.`
      : "- Status metadata was sparse in the collected set.",
    locations.length
      ? `- Site location signals are concentrated in: ${locations.map(([value, count]) => `${value} (${count})`).join(", ")}.`
      : "- Site location metadata was sparse in the collected set.",
    `- The saved set mixes utilitarian cargo and shipboard material: ${items.slice(0, 6).map((item) => item.title).join("; ")}.`,
    "",
    "## Next Pass",
    "",
    "- Review any metadata-only records and decide whether they justify a second image-hunting pass.",
    "- Group related objects by material or registration number if the next step is interpretation rather than capture."
  ].join("\n");
}

function summarizeTrove(items) {
  const publications = topCounts(items, (item) => {
    const title = String(item.title || "");
    const match = title.match(/-\s+([^()-]+(?:\([^)]*\))?)\s+-\s+\d{1,2}\s+\w+\s+\d{4}$/);
    return match ? [match[1].trim()] : [];
  });
  const years = items.map((item) => extractYear(item.citation) || extractYear(item.title)).filter(Boolean);
  const yearMin = years.length ? Math.min(...years) : null;
  const yearMax = years.length ? Math.max(...years) : null;
  const keywordCounts = topCounts(items, (item) => {
    const text = `${item.title} ${item.description} ${item.fullText}`.toLowerCase();
    return [
      /opening|officially opened/.test(text) ? "opening and ceremony" : "",
      /irrigation|scheme/.test(text) ? "irrigation scheme" : "",
      /water|overflow|reservoir|supply/.test(text) ? "water supply and storage" : "",
      /harvey|collie|brunswick/.test(text) ? "south-west local impact" : "",
      /touris|sight|picnic|holiday/.test(text) ? "tourism and recreation" : ""
    ].filter(Boolean);
  });
  return [
    "# Collection Report",
    "",
    "## Scope",
    "",
    `- 20 Trove newspaper articles collected for the Wellington Dam topic.`,
    yearMin && yearMax ? `- The current set spans ${yearMin} to ${yearMax}.` : "- The current set spans multiple publication years.",
    "",
    "## What Stands Out",
    "",
    publications.length
      ? `- Most represented publications: ${publications.map(([value, count]) => `${value} (${count})`).join(", ")}.`
      : "- Publication names were too inconsistent to rank cleanly.",
    keywordCounts.length
      ? `- Recurrent themes: ${keywordCounts.map(([value, count]) => `${value} (${count})`).join(", ")}.`
      : "- Themes need a more careful manual pass against the OCR text.",
    `- The set captures both project milestones and aftermath: ${items.slice(0, 5).map((item) => item.title).join("; ")}.`,
    "",
    "## Next Pass",
    "",
    "- Split core construction/opening coverage from later water-management and tourism reporting.",
    "- Manually flag any false-positive Wellington references if you want a stricter WA-only dossier."
  ].join("\n");
}

function summarizeSlwa(items) {
  const years = items.map((item) => extractYear(item.title) || extractYear(item.description)).filter(Boolean);
  const yearMin = years.length ? Math.min(...years) : null;
  const yearMax = years.length ? Math.max(...years) : null;
  const themes = topCounts(items, (item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return [
      /yacht|sailing|skiff|regatta/.test(text) ? "boating and racing" : "",
      /bridge|foreshore|bicton|perth/.test(text) ? "river edge and built landscape" : "",
      /prince charles|marathon|actor/.test(text) ? "public events" : "",
      /river/.test(text) ? "river views" : ""
    ].filter(Boolean);
  });
  return [
    "# Collection Report",
    "",
    "## Scope",
    "",
    `- 10 SLWA image records collected for the Swan River.`,
    yearMin && yearMax ? `- The visible date spread runs from ${yearMin} to ${yearMax}.` : "- The set spans multiple periods of Swan River imagery.",
    "",
    "## What Stands Out",
    "",
    themes.length
      ? `- Dominant visual themes: ${themes.map(([value, count]) => `${value} (${count})`).join(", ")}.`
      : "- The image themes need a more careful manual pass.",
    `- Representative records: ${items.slice(0, 5).map((item) => item.title).join("; ")}.`,
    "",
    "## Next Pass",
    "",
    "- Separate transport / bridge scenes from recreation / regatta scenes if the next step is curation.",
    "- Expand the set with shoreline or industry-specific searches if you want a broader river visual history."
  ].join("\n");
}

async function writeProjectReport(project, queryLabel, reportMarkdown) {
  const reportPath = path.join(project.path, "REPORT.md");
  await fs.writeFile(reportPath, reportMarkdown, "utf8");

  const readmePath = path.join(project.path, "README.md");
  let readme = await fs.readFile(readmePath, "utf8");
  const marker = "## Collection Brief";
  const brief = [
    marker,
    "",
    `- Focus: ${queryLabel}`,
    "- Report: `REPORT.md`",
    "- This library was collected sequentially from live source pages rather than via a bulk import.",
    ""
  ].join("\n");
  if (readme.includes(marker)) {
    readme = readme.replace(new RegExp(`${marker}[\\s\\S]*$`), brief.trimEnd());
  } else {
    readme = `${readme.trimEnd()}\n\n${brief}`;
  }
  await fs.writeFile(readmePath, readme, "utf8");
}

async function saveMuseumCollection(browser) {
  const project = await ensureProject("Batavia Objects WA Museum");
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
  const candidates = [];

  for (let pageIndex = 0; pageIndex < 4 && candidates.length < 20; pageIndex += 1) {
    const url =
      pageIndex === 0
        ? "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia"
        : `https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia?page=${pageIndex}`;
    await searchPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await searchPage.waitForTimeout(1500);
    const links = await searchPage.evaluate(() =>
      Array.from(document.querySelectorAll(".wrap .title a[href]")).map((anchor) => ({
        title: String(anchor.textContent || "").replace(/\s+/g, " ").trim(),
        url: anchor.href
      }))
    );
    for (const link of uniqueByUrl(links)) {
      if (!candidates.some((candidate) => candidate.url === link.url)) {
        candidates.push(link);
      }
      if (candidates.length >= 20) {
        break;
      }
    }
  }

  console.log(`[museum] candidate records ${candidates.length}`);
  const collected = [];
  for (const candidate of candidates.slice(0, 20)) {
    try {
      const item = await fetchDetail(detailPage, candidate.url, "h1", 1500);
      if (!item?.supported) {
        continue;
      }
      await projectStore.saveItem(project.path, item);
      collected.push(item);
      console.log(`[museum] ${collected.length}/20 ${item.title}`);
    } catch (error) {
      console.error(`[museum] skip ${candidate.url}: ${error.message}`);
    }
  }

  await context.close();
  await writeProjectReport(project, "Batavia object records from the WA Museum Maritime Archaeology Databases", summarizeMuseum(collected));
  return { project, items: collected };
}

async function saveTroveCollection(browser) {
  const project = await ensureProject("Wellington Dam Trove");
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
  const candidates = [];

  for (let pageIndex = 1; pageIndex <= 8 && candidates.length < 40; pageIndex += 1) {
    const url =
      pageIndex === 1
        ? "https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam"
        : `https://trove.nla.gov.au/search/category/newspapers?keyword=Wellington%20Dam&page=${pageIndex}`;
    await searchPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await searchPage.waitForFunction(
      () => document.querySelectorAll('a[href*="/newspaper/article/"]').length > 0,
      { timeout: 12000 }
    ).catch(() => {});
    await searchPage.waitForTimeout(3200);
    const links = await searchPage.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]"))
        .filter((anchor) => /\/newspaper\/article\/\d+/i.test(anchor.href))
        .map((anchor) => ({
          title: String(anchor.textContent || "").replace(/\s+/g, " ").trim(),
          url: anchor.href
        }))
        .filter((entry) => entry.title.length > 8)
    );
    for (const link of uniqueByUrl(links.filter((entry) => entry.title.length > 8))) {
      if (!candidates.some((candidate) => candidate.url === link.url)) {
        candidates.push(link);
      }
      if (candidates.length >= 40) {
        break;
      }
    }
  }

  console.log(`[trove] candidate records ${candidates.length}`);
  const collected = [];
  for (const candidate of candidates) {
    if (collected.length >= 20) {
      break;
    }
    try {
      const item = await fetchDetail(detailPage, candidate.url, "#fulltextContents, .detailsPanel", 2200);
      if (!item?.supported || item.source !== "trove") {
        continue;
      }
      await projectStore.saveItem(project.path, item);
      collected.push(item);
      console.log(`[trove] ${collected.length}/20 ${item.title}`);
    } catch (error) {
      console.error(`[trove] skip ${candidate.url}: ${error.message}`);
    }
  }

  await context.close();
  await writeProjectReport(project, 'Trove newspaper coverage for the phrase "Wellington Dam"', summarizeTrove(collected));
  return { project, items: collected };
}

async function saveSlwaCollection(browser) {
  const project = await ensureProject("Swan River SLWA");
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
  const candidates = [];

  for (let pageIndex = 0; pageIndex < 8 && candidates.length < 40; pageIndex += 1) {
    const suffix = pageIndex === 0 ? "__Orightresult__U__X0" : `__P0%2C${pageIndex}__Orightresult__U__X0`;
    const url = `https://encore.slwa.wa.gov.au/iii/encore/search/C__SSwan%20River${suffix}?lang=eng&suite=def`;
    await searchPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await searchPage.waitForFunction(
      () => document.querySelectorAll('a[id^="recordDisplayLink2Component"]').length > 0,
      { timeout: 12000 }
    ).catch(() => {});
    await searchPage.waitForTimeout(2500);
    const links = await searchPage.evaluate(() =>
      Array.from(document.querySelectorAll('a[id^="recordDisplayLink2Component"][href]')).map((anchor) => ({
        title: String(anchor.textContent || "").replace(/\s+/g, " ").trim(),
        url: anchor.href
      }))
    );
    for (const link of uniqueByUrl(links)) {
      if (!candidates.some((candidate) => candidate.url === link.url)) {
        candidates.push(link);
      }
      if (candidates.length >= 40) {
        break;
      }
    }
  }

  console.log(`[slwa] candidate records ${candidates.length}`);
  const collected = [];
  for (const candidate of candidates) {
    if (collected.length >= 10) {
      break;
    }
    try {
      const item = await fetchDetail(detailPage, candidate.url, ".dpBibTitle, #thumbnailImagesTable, .record-cover-image img", 1800);
      if (!item?.supported || item.source !== "slwa" || item.type !== "image") {
        continue;
      }
      await projectStore.saveItem(project.path, item);
      collected.push(item);
      console.log(`[slwa] ${collected.length}/10 ${item.title}`);
    } catch (error) {
      console.error(`[slwa] skip ${candidate.url}: ${error.message}`);
    }
  }

  await context.close();
  await writeProjectReport(project, 'SLWA image records for the search "Swan River"', summarizeSlwa(collected));
  return { project, items: collected };
}

async function printSummary(projectPath) {
  const raw = await fs.readFile(path.join(projectPath, "project.yaml"), "utf8");
  const project = yaml.load(raw) || {};
  return {
    path: projectPath,
    saved: Array.isArray(project.saved) ? project.saved.length : 0,
    ignored: Array.isArray(project.ignored) ? project.ignored.length : 0
  };
}

async function main() {
  const wanted = new Set(process.argv.slice(2));
  const runAll = !wanted.size;
  const browser = await chromium.launch({ headless: true });
  try {
    const summary = {};
    if (runAll || wanted.has("museum")) {
      const museum = await saveMuseumCollection(browser);
      summary.museum = await printSummary(museum.project.path);
    }
    if (runAll || wanted.has("trove")) {
      const trove = await saveTroveCollection(browser);
      summary.trove = await printSummary(trove.project.path);
    }
    if (runAll || wanted.has("slwa")) {
      const slwa = await saveSlwaCollection(browser);
      summary.slwa = await printSummary(slwa.project.path);
    }
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
