#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const yaml = require("js-yaml");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function webviewEval(page, script) {
  return page.evaluate(async (source) => {
    const webview = document.querySelector("#webview-stack webview");
    if (!webview) {
      throw new Error("No webview is attached.");
    }
    return webview.executeJavaScript(source, true);
  }, script);
}

async function loadUrl(page, targetUrl) {
  await page.evaluate(async (url) => {
    const webview = document.querySelector("#webview-stack webview");
    if (!webview) {
      throw new Error("No webview is attached.");
    }
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
  await page.waitForTimeout(1600);
}

async function waitForInlineActions(page, minimum = 1, timeout = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const count = await webviewEval(
      page,
      `(() => document.querySelectorAll(".trove-library-inline-actions .preview").length)()`
    ).catch(() => 0);
    if (count >= minimum) {
      return count;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Timed out waiting for ${minimum} inline preview actions.`);
}

async function getWebviewLinks(page, selector) {
  return webviewEval(
    page,
    `(() => Array.from(document.querySelectorAll(${JSON.stringify(selector)})).map((node) => ({
      href: node.href || "",
      text: String(node.textContent || "").replace(/\\s+/g, " ").trim()
    })).filter((entry) => entry.href))()`
  );
}

async function clickInlinePreview(page, href) {
  const result = await webviewEval(
    page,
    `(() => {
      const normalize = (value) => {
        try {
          const url = new URL(value, location.href);
          url.hash = "";
          return url.toString().replace(/\\/$/, "");
        } catch {
          return String(value || "").trim();
        }
      };
      const target = normalize(${JSON.stringify(href)});
      const anchors = Array.from(document.querySelectorAll("a[href]")).filter((node) => normalize(node.href) === target);
      const anchor =
        anchors.find((node) => node.nextElementSibling?.classList?.contains("trove-library-inline-actions")) ||
        anchors.find((node) => node.dataset.troveLibraryBound === "true") ||
        anchors[0];
      const button = anchor?.nextElementSibling?.querySelector?.(".preview");
      if (!button) {
        return { ok: false, reason: "Preview button not found.", text: anchor?.textContent?.trim() || "" };
      }
      button.click();
      return { ok: true, text: anchor?.textContent?.trim() || "", href: target };
    })()`
  );
  if (!result?.ok) {
    throw new Error(result?.reason || `Could not click preview for ${href}`);
  }
  return result;
}

async function waitForPreview(page, options = {}) {
  const expectImage = Boolean(options.expectImage);
  const minMarkdown = options.minMarkdown ?? 120;
  await page.waitForFunction(
    ({ expectImage, minMarkdown }) => {
      const body = document.querySelector("#capture-body");
      const markdown = document.querySelector("#capture-markdown")?.innerText || "";
      const image = document.querySelector("#capture-image-gallery .capture-gallery-primary img");
      const imageReady = !expectImage || Boolean(image && image.naturalWidth > 0 && image.currentSrc);
      return Boolean(body && body.hidden === false && markdown.length >= minMarkdown && imageReady);
    },
    { expectImage, minMarkdown },
    { timeout: 60000 }
  );
  await page.waitForTimeout(800);
}

async function currentPreview(page) {
  return page.evaluate(() => {
    const image = document.querySelector("#capture-image-gallery .capture-gallery-primary img");
    return {
      status: document.querySelector("#page-status")?.textContent?.trim() || "",
      kind: document.querySelector("#page-kind")?.textContent?.trim() || "",
      markdownLength: document.querySelector("#capture-markdown")?.innerText?.length || 0,
      image: image
        ? {
            src: image.getAttribute("src") || "",
            currentSrc: image.currentSrc || "",
            naturalWidth: Number(image.naturalWidth || 0),
            naturalHeight: Number(image.naturalHeight || 0)
          }
        : null,
      collectText: document.querySelector("#capture-collect")?.textContent?.trim() || ""
    };
  });
}

async function collectCurrentPreview(page) {
  await page.click("#capture-collect");
  await page.waitForFunction(() => {
    const button = document.querySelector("#capture-collect");
    return Boolean(button && /Collected/i.test(button.textContent || ""));
  }, null, { timeout: 60000 });
}

async function createProject(page, name) {
  await page.click("#mode-manage");
  await page.fill("#project-name", name);
  await page.press("#project-name", "Enter");
  await page.waitForSelector("#capture-panel");
  await page.waitForFunction(
    (projectName) => {
      const details = document.querySelector("#project-details")?.textContent || "";
      return details.includes(projectName);
    },
    name,
    { timeout: 20000 }
  );
  return path.join(repoRoot, `${slugify(name)}.trovelibrary`);
}

async function takeShot(page, name) {
  const output = `/tmp/${name}.png`;
  await page.screenshot({ path: output, fullPage: false });
  return output;
}

function readYaml(filePath) {
  return fs.readFile(filePath, "utf8").then((body) => yaml.load(body));
}

function fileMime(filePath) {
  return execFileSync("file", ["--brief", "--mime-type", filePath], { encoding: "utf8" }).trim();
}

function imageDimensions(filePath) {
  const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], { encoding: "utf8" });
  const width = Number(output.match(/pixelWidth:\s+(\d+)/)?.[1] || 0);
  const height = Number(output.match(/pixelHeight:\s+(\d+)/)?.[1] || 0);
  return { width, height };
}

async function inspectProjectOutput(projectPath, options = {}) {
  const project = await readYaml(path.join(projectPath, "project.yaml"));
  const saved = Array.isArray(project.saved) ? project.saved : [];
  const errors = [];
  const samples = [];

  if (saved.length !== 10) {
    errors.push(`Expected 10 saved items, found ${saved.length}.`);
  }

  const itemsCsv = await fs.readFile(path.join(projectPath, "items.csv"), "utf8");
  if (!itemsCsv.includes("status,source,source_label")) {
    errors.push("items.csv header is missing.");
  }

  for (const entry of saved) {
    if (entry.file) {
      const markdownPath = path.join(projectPath, entry.file);
      const markdown = await fs.readFile(markdownPath, "utf8");
      if (markdown.length < 500) {
        errors.push(`Markdown too short for ${entry.title}.`);
      }
      if (!/- Citation: /i.test(markdown) || !/- Link: /i.test(markdown) || !/Source system:/i.test(markdown)) {
        errors.push(`Markdown header fields missing for ${entry.title}.`);
      }
      if (entry.type === "newspaper" && !/## Full Text/i.test(markdown)) {
        errors.push(`Full text section missing for ${entry.title}.`);
      }
      samples.push({ title: entry.title, markdownPath: entry.file });
      continue;
    }

    const assetFiles = Array.isArray(entry.assetFiles) ? entry.assetFiles : entry.assetFile ? [entry.assetFile] : [];
    const metadataFiles = Array.isArray(entry.metadataFiles) ? entry.metadataFiles : entry.metadataFile ? [entry.metadataFile] : [];
    if (!assetFiles.length || !metadataFiles.length) {
      errors.push(`Image entry missing asset or metadata files for ${entry.title}.`);
      continue;
    }
    for (const assetFile of assetFiles) {
      const assetPath = path.join(projectPath, assetFile);
      const mime = fileMime(assetPath);
      if (!mime.startsWith("image/")) {
        errors.push(`Asset is not an image for ${entry.title}: ${assetFile} (${mime}).`);
      }
      const { width, height } = imageDimensions(assetPath);
      if (width < (options.minImageWidth || 200) || height < (options.minImageHeight || 150)) {
        errors.push(`Image too small for ${entry.title}: ${assetFile} is ${width}x${height}.`);
      }
    }
    for (const metadataFile of metadataFiles) {
      const metadataPath = path.join(projectPath, metadataFile);
      const markdown = await fs.readFile(metadataPath, "utf8");
      if (markdown.length < 350) {
        errors.push(`Image metadata markdown too short for ${entry.title}: ${metadataFile}.`);
      }
      if (!/Image file:/i.test(markdown) && !/Image files:/i.test(markdown)) {
        errors.push(`Image file list missing from metadata markdown for ${entry.title}.`);
      }
      if (!/- Link: /i.test(markdown) || !/Source system:/i.test(markdown)) {
        errors.push(`Metadata header fields missing for ${entry.title}.`);
      }
    }
    samples.push({ title: entry.title, assetFiles, metadataFiles });
  }

  return { savedCount: saved.length, errors, samples };
}

async function collectMuseumProject(page, name) {
  const projectPath = await createProject(page, name);
  const searchUrl = "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia";
  console.log(`[museum] project ${path.basename(projectPath)}`);
  await loadUrl(page, searchUrl);
  await waitForInlineActions(page, 1);
  await takeShot(page, "audit-wa-museum-search");
  const museumLinks = await getWebviewLinks(page, ".wrap .title a[href]");
  console.log(`[museum] search links ${museumLinks.length}`);
  if (!museumLinks.length) {
    throw new Error("No WA Museum search results found.");
  }

  await clickInlinePreview(page, museumLinks[0].href);
  await waitForPreview(page, { expectImage: false, minMarkdown: 150 });
  const searchPreview = await currentPreview(page);
  if (searchPreview.markdownLength < 150) {
    throw new Error("WA Museum search-level preview markdown is too short.");
  }
  await collectCurrentPreview(page);
  await takeShot(page, "audit-wa-museum-search-preview");

  let collected = 1;
  let pageIndex = 0;
  const seen = new Set([museumLinks[0].href]);
  while (collected < 10 && pageIndex < 4) {
    const pageUrl =
      pageIndex === 0
        ? searchUrl
        : `https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia?page=${pageIndex}`;
    await loadUrl(page, pageUrl);
    const links = await getWebviewLinks(page, ".wrap .title a[href]");
    for (const link of links) {
      if (seen.has(link.href)) {
        continue;
      }
      seen.add(link.href);
      await loadUrl(page, link.href);
      await waitForPreview(page, { expectImage: false, minMarkdown: 150 });
      const detailPreview = await currentPreview(page);
      if (detailPreview.markdownLength < 150) {
        continue;
      }
      await collectCurrentPreview(page);
      collected += 1;
      console.log(`[museum] collected ${collected}: ${link.text || link.href}`);
      if (collected === 1) {
        await takeShot(page, "audit-wa-museum-detail-preview");
      }
      if (collected >= 10) {
        break;
      }
    }
    pageIndex += 1;
  }

  if (collected !== 10) {
    throw new Error(`WA Museum collection stopped at ${collected} items.`);
  }

  const inspection = await inspectProjectOutput(projectPath, { minImageWidth: 200, minImageHeight: 150 });
  if (inspection.errors.length) {
    throw new Error(`WA Museum output inspection failed:\n${inspection.errors.join("\n")}`);
  }
  return { projectPath, inspection };
}

async function collectTroveProject(page, name) {
  const projectPath = await createProject(page, name);
  const searchUrl = "https://trove.nla.gov.au/search/category/newspapers?keyword=wellington%20dam";
  console.log(`[trove] project ${path.basename(projectPath)}`);
  await loadUrl(page, searchUrl);
  await waitForInlineActions(page, 1);
  const searchLinks = await getWebviewLinks(page, '.result .title a[href*="/newspaper/article/"]');
  console.log(`[trove] page 1 links ${searchLinks.length}`);
  if (!searchLinks.length) {
    throw new Error("No Trove article search results found.");
  }

  await clickInlinePreview(page, searchLinks[0].href);
  await waitForPreview(page, { expectImage: false, minMarkdown: 400 });
  const searchPreview = await currentPreview(page);
  if (searchPreview.markdownLength < 400) {
    throw new Error("Trove search-level preview markdown is too short.");
  }
  await collectCurrentPreview(page);
  console.log(`[trove] collected 1 from search preview: ${searchLinks[0].text || searchLinks[0].href}`);
  await takeShot(page, "audit-trove-search-preview");

  let collected = 1;
  const seen = new Set([searchLinks[0].href]);
  const searchPages = [{ index: 1, links: searchLinks }];
  for (let pageIndex = 2; pageIndex <= 4; pageIndex += 1) {
    await loadUrl(page, `https://trove.nla.gov.au/search/category/newspapers?keyword=wellington%20dam&page=${pageIndex}`);
    const links = await getWebviewLinks(page, '.result .title a[href*="/newspaper/article/"]');
    searchPages.push({ index: pageIndex, links });
  }

  for (const searchPage of searchPages) {
    if (collected >= 10) {
      break;
    }
    console.log(`[trove] page ${searchPage.index} links ${searchPage.links.length}`);
    const links = searchPage.links;
    for (const link of links) {
      if (seen.has(link.href)) {
        continue;
      }
      seen.add(link.href);
      await loadUrl(page, link.href);
      await waitForPreview(page, { expectImage: false, minMarkdown: 500 });
      const detailPreview = await currentPreview(page);
      if (detailPreview.markdownLength < 500) {
        console.log(`[trove] skipped short preview: ${link.text || link.href}`);
        continue;
      }
      await collectCurrentPreview(page);
      collected += 1;
      console.log(`[trove] collected ${collected}: ${link.text || link.href}`);
      if (collected === 2) {
        await takeShot(page, "audit-trove-detail-preview");
      }
      if (collected >= 10) {
        break;
      }
    }
  }

  if (collected !== 10) {
    throw new Error(`Trove collection stopped at ${collected} items.`);
  }

  const inspection = await inspectProjectOutput(projectPath);
  if (inspection.errors.length) {
    throw new Error(`Trove output inspection failed:\n${inspection.errors.join("\n")}`);
  }
  return { projectPath, inspection };
}

async function collectSlwaProject(page, name) {
  const projectPath = await createProject(page, name);
  console.log(`[slwa] project ${path.basename(projectPath)}`);

  const catalogueSearch =
    "https://catalogue.slwa.wa.gov.au/search~S2/i?searchtype=X&searcharg=wellington+dam+campsite&searchscope=2";
  await loadUrl(page, catalogueSearch);
  await waitForInlineActions(page, 1);
  const catalogueLinks = await getWebviewLinks(page, 'a[href*="purl.slwa.wa.gov.au"], a[href*="catalogue.slwa.wa.gov.au/record=b"]');
  console.log(`[slwa] catalogue links ${catalogueLinks.length}`);
  if (!catalogueLinks.length) {
    throw new Error("No SLWA catalogue result links found.");
  }
  await clickInlinePreview(page, catalogueLinks[0].href);
  await waitForPreview(page, { expectImage: true, minMarkdown: 150 });
  const cataloguePreview = await currentPreview(page);
  if (!cataloguePreview.image?.naturalWidth || !/\.jpg/i.test(cataloguePreview.image.currentSrc || "")) {
    throw new Error("SLWA catalogue preview did not resolve to a rendered JPG image.");
  }
  await collectCurrentPreview(page);
  console.log(`[slwa] collected 1 from catalogue preview`);
  await takeShot(page, "audit-slwa-catalogue-preview");

  const multiImageRecord =
    "https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb2990186__SSwan%20River__P0%2C9__Orightresult__U__X6?lang=eng&suite=def";
  await loadUrl(page, multiImageRecord);
  await waitForPreview(page, { expectImage: true, minMarkdown: 180 });
  const multiPreview = await currentPreview(page);
  if (!multiPreview.image?.naturalWidth) {
    throw new Error("SLWA multi-image record did not render the primary image.");
  }
  await collectCurrentPreview(page);
  console.log(`[slwa] collected 2 from multi-image detail`);
  await takeShot(page, "audit-slwa-multi-detail-preview");

  let collected = 2;
  const seen = new Set([catalogueLinks[0].href, multiImageRecord]);
  for (let pageIndex = 0; pageIndex < 5 && collected < 10; pageIndex += 1) {
    const suffix = pageIndex === 0 ? "__Orightresult__U__X0" : `__P0%2C${pageIndex}__Orightresult__U__X0`;
    await loadUrl(
      page,
      `https://encore.slwa.wa.gov.au/iii/encore/search/C__SSwan%20River${suffix}?lang=eng&suite=def`
    );
    await waitForInlineActions(page, 1);
    const links = await getWebviewLinks(page, 'a[id^="recordDisplayLink2Component"][href]');
    console.log(`[slwa] search page ${pageIndex} links ${links.length}`);
    for (const link of links) {
      if (seen.has(link.href)) {
        continue;
      }
      seen.add(link.href);
      console.log(`[slwa] trying ${link.text || link.href}`);
      try {
        await loadUrl(page, link.href);
        await waitForPreview(page, { expectImage: true, minMarkdown: 150 });
      } catch (error) {
        console.log(`[slwa] skipped after preview timeout: ${link.text || link.href}`);
        continue;
      }
      const detailPreview = await currentPreview(page);
      if (!detailPreview.image?.naturalWidth) {
        console.log(`[slwa] skipped missing image: ${link.text || link.href}`);
        continue;
      }
      await collectCurrentPreview(page);
      collected += 1;
      console.log(`[slwa] collected ${collected}: ${link.text || link.href}`);
      if (collected >= 10) {
        break;
      }
    }
  }

  if (collected !== 10) {
    throw new Error(`SLWA collection stopped at ${collected} items.`);
  }

  const inspection = await inspectProjectOutput(projectPath, { minImageWidth: 200, minImageHeight: 150 });
  if (inspection.errors.length) {
    throw new Error(`SLWA output inspection failed:\n${inspection.errors.join("\n")}`);
  }

  const project = await readYaml(path.join(projectPath, "project.yaml"));
  const multiImageEntry = (project.saved || []).find((entry) => String(entry.id || "").includes("b2990186"));
  if (!multiImageEntry || !(Array.isArray(multiImageEntry.assetFiles) && multiImageEntry.assetFiles.length > 1)) {
    throw new Error("SLWA multi-image record did not save multiple image files.");
  }

  return { projectPath, inspection };
}

async function main() {
  const stamp = Date.now();
  const projectNames = {
    museum: `Audit WA Museum ${stamp}`,
    trove: `Audit Trove ${stamp}`,
    slwa: `Audit SLWA ${stamp}`
  };

  const electronBinary = require("electron");
  const userDataDir = path.join(os.tmpdir(), `trove-browser-audit-${process.pid}-${Date.now()}`);
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [repoRoot],
    cwd: repoRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "",
      TROVE_BROWSER_DISABLE_SINGLE_INSTANCE: "1",
      TROVE_BROWSER_USER_DATA_DIR: userDataDir
    }
  });

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    await page.waitForTimeout(2500);

    const museum = await collectMuseumProject(page, projectNames.museum);
    const trove = await collectTroveProject(page, projectNames.trove);
    const slwa = await collectSlwaProject(page, projectNames.slwa);

    console.log(
      JSON.stringify(
        {
          projects: {
            museum,
            trove,
            slwa
          }
        },
        null,
        2
      )
    );
  } finally {
    await app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
