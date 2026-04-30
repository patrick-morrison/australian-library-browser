#!/usr/bin/env node

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const zlib = require("zlib");

const { launchApp, screenshot } = require("./live-e2e-helpers");

const MORRISON_DRAFT_LINK_DUMP = `# old Morrison 2025 Wellington Dam Draft.docx
http://schemas.openxmlformats.org/package/2006/content-types
http://schemas.openxmlformats.org/package/2006/relationships
http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties
http://schemas.microsoft.com/office/2011/relationships/webextensiontaskpanes
http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument
http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties
http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink
https://trove.nla.gov.au/newspaper/article/32587872?searchTerm=%22Wellington%20Dam%22
https://trove.nla.gov.au/newspaper/article/252933603?searchTerm=%22Wellington%20Dam%22
https://trove.nla.gov.au/newspaper/article/256091918?searchTerm=%22Dampier%20Flat%22
https://ro.uow.edu.au/articles/journal_contribution/Archaeological_investigations_at_Olympic_dam_in_arid_northeast_south_Australia/27709839?file=50454714
https://trove.nla.gov.au/newspaper/article/210765300?searchTerm=%22Dampier%20Flat%22
https://trove.nla.gov.au/newspaper/article/252937371?searchTerm=%22Dampier%20Flat%22
http://schemas.openxmlformats.org/officeDocument/2006/relationships/header
http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer
http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes
http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering
https://trove.nla.gov.au/newspaper/article/32472857?searchTerm=%22Wellington%20Dam%22
https://trove.nla.gov.au/newspaper/article/252936718?searchTerm=%22Dampier%20Flat%22
https://trove.nla.gov.au/newspaper/article/252938422?searchTerm=%22Wellington%20Dam%22
https://trove.nla.gov.au/newspaper/article/210771134?searchTerm=%22Dampier%20Flat%22
https://trove.nla.gov.au/newspaper/article/251721251
https://en.wikipedia.org/wiki/Clarrie_Hall_Dam?utm_source=chatgpt.com
https://academic.oup.com/ahr/article-abstract/129/4/1677/7915335
http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings
https://trove.nla.gov.au/newspaper/article/32486175?searchTerm=%22Wellington%20Dam%22
https://trove.nla.gov.au/newspaper/article/210862690?searchTerm=%22Dampier%20Flat%22
https://trove.nla.gov.au/newspaper/article/32565831?searchTerm=%22Dampier%20Flat%22
https://en.wikipedia.org/wiki/Old_Adaminaby_and_Lake_Eucumbene?utm_source=chatgpt.com
http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme
https://trove.nla.gov.au/newspaper/article/252936718?searchTerm=%22Wellington%20Dam%22
https://trove.nla.gov.au/newspaper/article/252934979?searchTerm=%22Wellington%20Dam%22
https://dardanupheritagecollective.org.au/stories-of-places/wellington-mills/
http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings
https://trove.nla.gov.au/newspaper/article/37691886?searchTerm=%22Wellington%20Dam%22
https://trove.nla.gov.au/newspaper/article/210773646?searchTerm=%22Dampier%20Flat%22
https://trove.nla.gov.au/newspaper/article/256093308?searchTerm=%22Dampier%20Flat%22
https://trove.nla.gov.au/newspaper/article/32768941
https://www.harveyhistoryonline.com/?p=5062
http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable
https://trove.nla.gov.au/newspaper/article/84991861?searchTerm=%22Wellington%20Dam%22`;

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return ~crc >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

function zipEntry(name, content) {
  const raw = Buffer.from(content);
  const compressed = zlib.deflateRawSync(raw);
  const nameBuffer = Buffer.from(name);
  const checksum = crc32(raw);
  const localHeader = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(checksum),
    u32(compressed.length),
    u32(raw.length),
    u16(nameBuffer.length),
    u16(0),
    nameBuffer,
    compressed
  ]);
  const centralHeader = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(checksum),
    u32(compressed.length),
    u32(raw.length),
    u16(nameBuffer.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    nameBuffer
  ]);
  return { localHeader, centralHeader };
}

function buildDocxXmlZip(entries) {
  let offset = 0;
  const locals = [];
  const centrals = [];
  for (const [name, content] of entries) {
    const entry = zipEntry(name, content);
    const central = Buffer.from(entry.centralHeader);
    central.writeUInt32LE(offset, 42);
    locals.push(entry.localHeader);
    centrals.push(central);
    offset += entry.localHeader.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(centrals.length),
    u16(centrals.length),
    u32(centralDir.length),
    u32(offset),
    u16(0)
  ]);
  return Buffer.concat([...locals, centralDir, end]);
}

async function run() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "trove-omni-intake-"));
  const markdownPath = path.join(tmpDir, "research-notes.md");
  const docxPath = path.join(tmpDir, "research-notes.docx");
  const app = await launchApp();

  try {
    await fs.writeFile(
      markdownPath,
      [
        "# Notes",
        "Trove: https://trove.nla.gov.au/newspaper/article/32575438.",
        "Unknown: https://example-library.test/record/123"
      ].join("\n")
    );
    await fs.writeFile(
      docxPath,
      buildDocxXmlZip([
        [
          "word/document.xml",
          '<w:document><w:body><w:t>SLWA https://purl.slwa.wa.gov.au/slwa_b3507768_1 and WA Museum https://museum.wa.gov.au/maritime-archaeology-db/artefacts/BAT3868</w:t></w:body></w:document>'
        ],
        [
          "word/_rels/document.xml.rels",
          '<Relationships><Relationship Target="https://trove.nla.gov.au/work/123456"/></Relationships>'
        ]
      ])
    );

    const page = await app.firstWindow();
    await page.waitForSelector("#mode-plugins");
    await page.click("#mode-plugins");
    await page.waitForSelector("#plugin-drop-zone");
    await page.fill("#plugin-seed-urls", MORRISON_DRAFT_LINK_DUMP);
    await page.dispatchEvent("#plugin-seed-urls", "input");
    await page.click("#plugin-open-selected");
    await page.waitForSelector("#trove-link-dialog:not([hidden])");
    const pasteResult = await page.evaluate(() => ({
      analysis: document.querySelector("#plugin-url-analysis")?.textContent || "",
      modal: document.querySelector("#trove-link-dialog")?.textContent || "",
      previewItems: document.querySelectorAll("#trove-link-dialog-preview .trove-link-preview-item").length,
      openOneCount: document.querySelectorAll("#trove-link-dialog-preview .trove-link-preview-open").length,
      openAllText: document.querySelector("#trove-link-dialog-open")?.textContent || "",
      openUnhandledText: document.querySelector("#trove-link-dialog-open-unresolved")?.textContent || ""
    }));
    if (pasteResult.previewItems < 18 || pasteResult.openOneCount !== pasteResult.previewItems) {
      throw new Error(`Morrison draft import did not triage supported links correctly:\n${JSON.stringify(pasteResult, null, 2)}`);
    }
    for (const unsupportedNeedle of ["schemas.openxmlformats.org", "wikipedia.org", "ro.uow.edu.au", "harveyhistoryonline.com"]) {
      if (pasteResult.analysis.includes(unsupportedNeedle) || pasteResult.modal.includes(unsupportedNeedle)) {
        throw new Error(`Unsupported URL leaked into omni import triage: ${unsupportedNeedle}`);
      }
    }
    for (const expectedText of ["Not collected/ignored", "Open", "Open All", "Open Not Yet Handled"]) {
      if (!pasteResult.modal.includes(expectedText) && !pasteResult.openAllText.includes(expectedText) && !pasteResult.openUnhandledText.includes(expectedText)) {
        throw new Error(`Morrison draft import missing triage affordance: ${expectedText}`);
      }
    }
    await page.click("#trove-link-dialog-cancel");
    await page.fill("#plugin-seed-urls", "");
    await page.dispatchEvent("#plugin-seed-urls", "input");

    const input = await page.locator("#plugin-drop-zone").elementHandle();
    await input.dispatchEvent("drop", {
      dataTransfer: await page.evaluateHandle(
        async ({ markdown, docx }) => {
          const read = async (filePath, type) => {
            const data = await window.troveApi.readFileBytes(filePath);
            return new File([Uint8Array.from(data)], filePath.split("/").pop(), { type });
          };
          const files = [
            await read(markdown, "text/markdown"),
            await read(docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
          ];
          const transfer = new DataTransfer();
          for (const file of files) {
            transfer.items.add(file);
          }
          return transfer;
        },
        { markdown: markdownPath, docx: docxPath }
      )
    });

    await page.waitForFunction(() => {
      const text = document.querySelector("#plugin-url-analysis")?.textContent || "";
      return /Trove/.test(text) && /SLWA/.test(text) && /WA Museum/.test(text) && !/New source candidates/.test(text);
    }, null, { timeout: 10000 });

    const result = await page.evaluate(() => ({
      intake: document.querySelector("#plugin-seed-urls")?.value || "",
      analysis: document.querySelector("#plugin-url-analysis")?.textContent || "",
      status: document.querySelector("#plugin-status")?.textContent || "",
      selectedCount: document.querySelectorAll(".plugin-triage-check:checked").length,
      openSelectedDisabled: document.querySelector("#plugin-open-selected")?.disabled,
      layout: window.trovePerf.layout()
    }));
    if (!result.layout.ok) {
      throw new Error(`Omni intake layout overflow:\n${JSON.stringify(result.layout.issues, null, 2)}`);
    }
    const expected = [
      "https://trove.nla.gov.au/newspaper/article/32575438",
      "https://purl.slwa.wa.gov.au/slwa_b3507768_1",
      "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/BAT3868"
    ];
    for (const url of expected) {
      if (!result.intake.includes(url)) {
        throw new Error(`Omni intake missed ${url}`);
      }
    }
    if (result.selectedCount < 3 || result.openSelectedDisabled) {
      throw new Error("Import triage did not select supported links by default.");
    }
    if (result.analysis.includes("example-library.test")) {
      throw new Error("Unsupported dropped URL leaked into import triage.");
    }
    const shot = await screenshot(page, "omni-intake-classified.png");
    console.log(JSON.stringify({ status: result.status, analysis: result.analysis, screenshot: shot }, null, 2));
  } finally {
    await app.close().catch(() => {});
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
