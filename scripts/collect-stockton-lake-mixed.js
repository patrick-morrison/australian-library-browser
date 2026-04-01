#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { execFileSync } = require("child_process");

const yaml = require("js-yaml");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");

const TARGETS = [
  {
    label: "SLWA field guide",
    url: "https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb3059247__SStockton%20Lake__Orightresult__U__X1?lang=eng&suite=def",
    expectImage: false,
    minMarkdown: 300
  },
  {
    label: "SLWA thesis",
    url: "https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb1245499__SCollie%20coalfield__Orightresult__U__X6?lang=eng&suite=def",
    expectImage: false,
    minMarkdown: 320
  },
  {
    label: "SLWA image b1855152",
    url: "https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb1855152__SStockton%20Collie__P0%2C1__Orightresult__U__X2?lang=eng&suite=def",
    expectImage: true,
    minMarkdown: 180
  },
  {
    label: "SLWA image b1855507",
    url: "https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb1855507__SStockton%20Collie__P0%2C2__Orightresult__U__X2?lang=eng&suite=def",
    expectImage: true,
    minMarkdown: 180
  },
  {
    label: "SLWA image b1888536",
    url: "https://encore.slwa.wa.gov.au/iii/encore/record/C__Rb1888536__SStockton%20open%20cut%20Collie__P0%2C2__Orightresult__U__X1?lang=eng&suite=def",
    expectImage: true,
    minMarkdown: 180
  },
  {
    label: "Trove article 44829685",
    url: "https://trove.nla.gov.au/newspaper/article/44829685?searchTerm=Stockton%20open%20cut%20Collie",
    expectImage: false,
    minMarkdown: 500
  },
  {
    label: "Trove article 51751427",
    url: "https://trove.nla.gov.au/newspaper/article/51751427?searchTerm=Stockton%20open%20cut%20Collie",
    expectImage: false,
    minMarkdown: 500
  },
  {
    label: "Trove article 46781352",
    url: "https://trove.nla.gov.au/newspaper/article/46781352?searchTerm=Stockton%20open%20cut%20Collie",
    expectImage: false,
    minMarkdown: 500
  },
  {
    label: "Trove article 258821732",
    url: "https://trove.nla.gov.au/newspaper/article/258821732?searchTerm=Stockton%20Collie%20mine",
    expectImage: false,
    minMarkdown: 450
  },
  {
    label: "Trove article 47639758",
    url: "https://trove.nla.gov.au/newspaper/article/47639758?searchTerm=Stockton%20open%20cut%20Collie",
    expectImage: false,
    minMarkdown: 180
  }
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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
  await page.waitForTimeout(1800);
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
  await page.waitForTimeout(1000);
}

async function createProject(page, name) {
  await page.click("#mode-manage");
  await page.fill("#project-name", name);
  await page.press("#project-name", "Enter");
  await page.waitForSelector("#capture-panel");
  await page.waitForFunction(
    (projectName) => (document.querySelector("#project-details")?.textContent || "").includes(projectName),
    name,
    { timeout: 20000 }
  );
  return path.join(repoRoot, `${slugify(name)}.trovelibrary`);
}

async function previewState(page) {
  return page.evaluate(() => {
    const image = document.querySelector("#capture-image-gallery .capture-gallery-primary img");
    return {
      status: document.querySelector("#page-status")?.textContent?.trim() || "",
      kind: document.querySelector("#page-kind")?.textContent?.trim() || "",
      collectText: document.querySelector("#capture-collect")?.textContent?.trim() || "",
      markdownLength: document.querySelector("#capture-markdown")?.innerText?.length || 0,
      image: image
        ? {
            src: image.currentSrc || image.getAttribute("src") || "",
            naturalWidth: Number(image.naturalWidth || 0),
            naturalHeight: Number(image.naturalHeight || 0)
          }
        : null
    };
  });
}

async function collectCurrent(page) {
  await page.click("#capture-collect");
  await page.waitForFunction(() => {
    const button = document.querySelector("#capture-collect");
    return Boolean(button && /Collected/i.test(button.textContent || ""));
  }, null, { timeout: 60000 });
}

function fileMime(filePath) {
  return execFileSync("file", ["--brief", "--mime-type", filePath], { encoding: "utf8" }).trim();
}

function imageDimensions(filePath) {
  const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], { encoding: "utf8" });
  return {
    width: Number(output.match(/pixelWidth:\s+(\d+)/)?.[1] || 0),
    height: Number(output.match(/pixelHeight:\s+(\d+)/)?.[1] || 0)
  };
}

async function inspectProject(projectPath) {
  const project = yaml.load(await fs.readFile(path.join(projectPath, "project.yaml"), "utf8"));
  const saved = Array.isArray(project.saved) ? project.saved : [];
  const errors = [];

  if (saved.length !== TARGETS.length) {
    errors.push(`Expected ${TARGETS.length} saved items, found ${saved.length}.`);
  }

  for (const entry of saved) {
    if (entry.file) {
      const markdown = await fs.readFile(path.join(projectPath, entry.file), "utf8");
      if (markdown.length < 350) {
        errors.push(`Short markdown for ${entry.title}.`);
      }
      if (!/- Citation: /i.test(markdown) || !/- Link: /i.test(markdown)) {
        errors.push(`Markdown header fields missing for ${entry.title}.`);
      }
      continue;
    }

    const assetFiles = Array.isArray(entry.assetFiles) ? entry.assetFiles : entry.assetFile ? [entry.assetFile] : [];
    const metadataFiles = Array.isArray(entry.metadataFiles) ? entry.metadataFiles : entry.metadataFile ? [entry.metadataFile] : [];
    if (!assetFiles.length || !metadataFiles.length) {
      errors.push(`Image files missing for ${entry.title}.`);
      continue;
    }
    for (const assetFile of assetFiles) {
      const assetPath = path.join(projectPath, assetFile);
      const mime = fileMime(assetPath);
      const { width, height } = imageDimensions(assetPath);
      if (!mime.startsWith("image/")) {
        errors.push(`Non-image asset for ${entry.title}: ${assetFile} (${mime}).`);
      }
      if (width < 200 || height < 150) {
        errors.push(`Small image for ${entry.title}: ${assetFile} ${width}x${height}.`);
      }
    }
    for (const metadataFile of metadataFiles) {
      const markdown = await fs.readFile(path.join(projectPath, metadataFile), "utf8");
      if (!/Image file:/i.test(markdown) && !/Image files:/i.test(markdown)) {
        errors.push(`Image metadata file list missing for ${entry.title}.`);
      }
    }
  }

  return { savedCount: saved.length, errors, saved };
}

async function main() {
  const stamp = Date.now();
  const projectName = `Stockton Lake Mixed ${stamp}`;
  const electronBinary = require("electron");
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [repoRoot],
    cwd: repoRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: ""
    }
  });

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    await page.waitForTimeout(2500);
    const projectPath = await createProject(page, projectName);

    const captured = [];
    for (const target of TARGETS) {
      console.log(`[collect] ${target.label}`);
      await loadUrl(page, target.url);
      await waitForPreview(page, target);
      const state = await previewState(page);
      if (target.expectImage && !state.image?.naturalWidth) {
        throw new Error(`Preview image missing for ${target.label}.`);
      }
      if (state.markdownLength < target.minMarkdown) {
        throw new Error(`Preview markdown too short for ${target.label}.`);
      }
      await collectCurrent(page);
      captured.push({
        label: target.label,
        url: target.url,
        status: state.status,
        kind: state.kind,
        image: state.image
      });
    }

    await page.screenshot({ path: "/tmp/stockton-lake-mixed-final.png", fullPage: false });

    const inspection = await inspectProject(projectPath);
    if (inspection.errors.length) {
      throw new Error(`Project inspection failed:\n${inspection.errors.join("\n")}`);
    }

    console.log(JSON.stringify({ projectPath, captured, inspection }, null, 2));
  } finally {
    await app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
