const { JSDOM } = require("jsdom");

function normalizeUrl(value, baseUrl = "https://example.com/") {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value, baseUrl);
    url.hash = "";
    if (url.hostname === "nla.gov.au") {
      url.protocol = "https:";
    }
    if (/^(purl|catalogue|encore)\.slwa\.wa\.gov\.au$/i.test(url.hostname)) {
      url.protocol = "https:";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value).trim();
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function uniqueValues(values, baseUrl) {
  return [...new Set(values.map((value) => normalizeUrl(value, baseUrl)).filter(Boolean))];
}

function pickMeta(document, selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (!node) {
      continue;
    }
    const value = node.getAttribute("content") || node.getAttribute("href") || node.textContent || "";
    const cleaned = String(value).trim();
    if (cleaned) {
      return cleaned;
    }
  }
  return "";
}

function nextSectionContent(heading) {
  const chunks = [];
  let pointer = heading.nextElementSibling;
  while (pointer && !/^H[23]$/i.test(pointer.tagName || "")) {
    const text = cleanText(pointer.textContent || "");
    if (text) {
      chunks.push(text);
    }
    pointer = pointer.nextElementSibling;
  }
  return chunks.join(" ");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDom(html, url) {
  return new JSDOM(html, { url }).window.document;
}

function normalizeTitleForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSlwaEncoreSearchUrl(query) {
  const encoded = encodeURIComponent(String(query || "").trim());
  return encoded
    ? `https://encore.slwa.wa.gov.au/iii/encore/search/C__S${encoded}__Orightresult__U?lang=eng&suite=def`
    : "";
}

function buildSlwaEncoreRecordUrl(brn) {
  const cleaned = String(brn || "").trim().replace(/^\.?b/i, "b");
  return cleaned ? `https://encore.slwa.wa.gov.au/iii/encore/record/C__R${cleaned}?lang=eng&suite=def` : "";
}

function buildSlwaViewerUrlFromDownloadUrl(value) {
  const normalized = normalizeUrl(value, value);
  const match = normalized.match(
    /https?:\/\/purl\.slwa\.wa\.gov\.au\/download\/(slwa_[a-z0-9_]+)\.(jpg|jpeg|png|tif|tiff|webp)(\?[^#]*)?$/i
  );
  return match ? `https://purl.slwa.wa.gov.au/${match[1]}` : "";
}

function stripImageExtension(value) {
  return String(value || "").replace(/\.(jpg|jpeg|png|tif|tiff|webp)$/i, "");
}

function normalizeAttachment(entry, currentUrl) {
  const viewerUrl = normalizeUrl(entry.viewerUrl || "", currentUrl);
  const imageUrl = normalizeUrl(entry.imageUrl || "", currentUrl);
  const thumbnailUrl = normalizeUrl(entry.thumbnailUrl || imageUrl, currentUrl);
  const title = cleanText(entry.title || "");
  const id =
    cleanText(entry.id || "") ||
    viewerUrl.match(/slwa_([a-z0-9_]+)/i)?.[1] ||
    imageUrl.match(/slwa_([a-z0-9_]+)/i)?.[1] ||
    "";
  if (!viewerUrl && !imageUrl && !thumbnailUrl) {
    return null;
  }
  return {
    id,
    title,
    viewerUrl,
    imageUrl,
    thumbnailUrl
  };
}

function extractSlwaPurlCollectionItems(document, currentUrl) {
  return Array.from(document.querySelectorAll("ul.collection a.object[href]"))
    .map((anchor) =>
      normalizeAttachment(
        {
          viewerUrl: anchor.getAttribute("href") || "",
          thumbnailUrl: anchor.querySelector("img")?.getAttribute("src") || "",
          title: anchor.querySelector("h2")?.textContent || anchor.getAttribute("title") || ""
        },
        currentUrl
      )
    )
    .filter(Boolean);
}

function extractSlwaEncoreAttachments(document, currentUrl) {
  return Array.from(document.querySelectorAll("#thumbnailImagesTable tbody tr"))
    .map((row) => {
      const cells = Array.from(row.querySelectorAll("td")).map((node) => cleanText(node.textContent));
      const imageUrl = normalizeUrl(
        cells[1] || cells[0] || row.querySelector("img")?.getAttribute("src") || "",
        currentUrl
      );
      const viewerUrl = imageUrl ? stripImageExtension(imageUrl) : "";
      return normalizeAttachment(
        {
          imageUrl,
          thumbnailUrl: imageUrl,
          viewerUrl,
          title: cells[3] || ""
        },
        currentUrl
      );
    })
    .filter(Boolean);
}

function extractSlwaRecordCandidates(document, currentUrl) {
  return Array.from(document.querySelectorAll('a[id^="recordDisplayLink2Component"][href]'))
    .map((anchor) => ({
      title: cleanText(anchor.textContent || ""),
      url: normalizeUrl(anchor.href, currentUrl)
    }))
    .filter((entry) => entry.title && entry.url);
}

function findBestSlwaRecordCandidate(document, currentUrl, preferredTitle = "") {
  const preferred = normalizeTitleForMatch(preferredTitle);
  const candidates = extractSlwaRecordCandidates(document, currentUrl);
  if (!candidates.length) {
    return null;
  }
  if (!preferred) {
    return candidates[0];
  }

  const ranked = candidates
    .map((candidate) => {
      const normalized = normalizeTitleForMatch(candidate.title);
      let score = 0;
      if (normalized === preferred) {
        score += 100;
      }
      if (normalized.startsWith(preferred) || preferred.startsWith(normalized)) {
        score += 60;
      }
      if (normalized.includes(preferred) || preferred.includes(normalized)) {
        score += 40;
      }
      if (/\bpicture\b|\bphoto(graph)?\b|\bimage\b/.test(candidate.title.toLowerCase())) {
        score += 10;
      }
      return { ...candidate, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0] || null;
}

function findSlwaClassicRecordId(document, currentUrl) {
  const currentMatch = normalizeUrl(currentUrl, currentUrl).match(/\/record=(b\d+)~/i);
  if (currentMatch) {
    return currentMatch[1].toLowerCase();
  }

  const bookmarkLink = Array.from(document.querySelectorAll('a[href]'))
    .map((anchor) => normalizeUrl(anchor.href, currentUrl))
    .find((href) => /\/record=(b\d+)~/i.test(href));
  const bookmarkMatch = bookmarkLink?.match(/\/record=(b\d+)~/i);
  return bookmarkMatch?.[1]?.toLowerCase() || "";
}

function findSlwaViewerUrl(document, currentUrl) {
  const directViewer = Array.from(document.querySelectorAll('a[href]'))
    .map((anchor) => normalizeUrl(anchor.href, currentUrl))
    .find((href) => /https?:\/\/purl\.slwa\.wa\.gov\.au\/slwa_[a-z0-9_./-]+$/i.test(href));
  if (directViewer) {
    return directViewer;
  }

  const imageCandidate = Array.from(document.querySelectorAll("img[src], a[href]"))
    .map((node) => normalizeUrl(node.getAttribute("src") || node.getAttribute("href") || "", currentUrl))
    .find((href) => /https?:\/\/purl\.slwa\.wa\.gov\.au\/slwa_[a-z0-9_./-]+\.(jpg|jpeg|png|tif|tiff|webp)$/i.test(href));
  if (imageCandidate) {
    return imageCandidate.replace(/\.(jpg|jpeg|png|tif|tiff|webp)$/i, "");
  }

  return "";
}

function extractTrove(document, currentUrl) {
  const pathname = new URL(currentUrl).pathname.toLowerCase();
  const canonicalUrl = normalizeUrl(pickMeta(document, ['link[rel="canonical"]']) || currentUrl, currentUrl);
  const headingTitle = cleanText(document.querySelector("h1")?.textContent || "");
  const title =
    headingTitle ||
    cleanText(pickMeta(document, ['meta[property="og:title"]', 'meta[name="twitter:title"]'])) ||
    cleanText((document.title || "").replace(/\s*-\s*Trove$/i, ""));

  if (/\/newspaper\/article\/\d+/i.test(pathname)) {
    const citationMap = {};
    for (const term of document.querySelectorAll(".detailsPanel dt")) {
      const label = cleanText(term.textContent);
      const detail = cleanText(term.nextElementSibling?.textContent || "");
      if (label && detail) {
        citationMap[label] = detail;
      }
    }

    const fullText = Array.from(document.querySelectorAll("#fulltextContents .paragraph"))
      .map((paragraph) =>
        Array.from(paragraph.querySelectorAll(".read"))
          .map((line) => cleanText(line.textContent))
          .filter(Boolean)
          .join(" ")
      )
      .filter(Boolean)
      .join("\n\n");

    const articleId = canonicalUrl.match(/\/newspaper\/article\/(\d+)/i)?.[1] || "";
    const articleIdentifier = cleanText(document.querySelector(".detailsPanel dd a")?.textContent || "");
    return {
      supported: true,
      source: "trove",
      sourceLabel: "Trove",
      type: "newspaper",
      id: articleId,
      title,
      url: canonicalUrl,
      aliases: uniqueValues([canonicalUrl, articleIdentifier], currentUrl),
      citation:
        citationMap["Harvard/Australian citation"] ||
        citationMap["APA citation"] ||
        citationMap["MLA citation"] ||
        "",
      sourceTitle: pickMeta(document, ['meta[property="og:title"]']),
      description: pickMeta(document, ['meta[name="description"]', 'meta[property="og:description"]']),
      fullText,
      imageUrl: normalizeUrl(
        pickMeta(document, ['meta[property="og:image"]', 'meta[name="twitter:image"]']),
        currentUrl
      ),
      metadataFields: Object.entries(citationMap).map(([label, value]) => ({ label, value })),
      rawMetadata: ""
    };
  }

  const workId = canonicalUrl.match(/\/work\/(\d+)/i)?.[1] || "";
  const imageCandidates = Array.from(document.querySelectorAll("img"))
    .map((image) => {
      const width = Number(image.getAttribute("width") || 0);
      const height = Number(image.getAttribute("height") || 0);
      return {
        src: normalizeUrl(image.getAttribute("src") || image.getAttribute("data-src") || "", currentUrl),
        area: width * height
      };
    })
    .filter((image) => image.src && !/favicon|logo|icon|avatar|spinner|loader/i.test(image.src))
    .sort((left, right) => right.area - left.area);
  const metadataFields = [];
  for (const term of Array.from(document.querySelectorAll("dt")).slice(0, 20)) {
    const label = cleanText(term.textContent);
    const value = cleanText(term.nextElementSibling?.textContent || "");
    if (label && value) {
      metadataFields.push({ label, value });
    }
  }
  const candidateImage =
    imageCandidates[0]?.src || normalizeUrl(pickMeta(document, ['meta[property="og:image"]']), currentUrl);
  if (/\/work\/\d+/i.test(pathname)) {
    const contributor = cleanText(document.querySelector(".contributor")?.textContent || "");
    const bridgeSearchUrl =
      /state library of wa|state library of western australia/i.test(contributor) && title
        ? buildSlwaEncoreSearchUrl(title)
        : "";
    return {
      supported: true,
      source: "trove",
      sourceLabel: "Trove",
      type: candidateImage ? "image" : "text",
      id: workId || slugify(title || canonicalUrl) || "image",
      title,
      url: canonicalUrl,
      aliases: uniqueValues([canonicalUrl], currentUrl),
      citation: metadataFields.find((field) => /citation/i.test(field.label))?.value || title,
      description:
        pickMeta(document, ['meta[name="description"]', 'meta[property="og:description"]']) ||
        cleanText(document.querySelector("main p")?.textContent || ""),
      fullText: "",
      sourceTitle: cleanText((document.title || "").replace(/\s*-\s*Trove$/i, "")),
      imageUrl: candidateImage,
      contributor,
      bridgeSearchUrl,
      metadataFields,
      rawMetadata: cleanText(document.querySelector("main")?.textContent || "").slice(0, 4000)
    };
  }

  return { supported: false };
}

function extractSlwa(document, currentUrl) {
  const url = new URL(currentUrl);
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  const isViewer = hostname === "purl.slwa.wa.gov.au";
  const isCatalogue = hostname.includes("slwa.wa.gov.au") && /\/iii\/encore\/record\//i.test(pathname);
  if (!isViewer && !isCatalogue) {
    return { supported: false };
  }

  if (isViewer) {
    const collectionItems = extractSlwaPurlCollectionItems(document, currentUrl);
    if (collectionItems.length) {
      const title = cleanText(
        document.querySelector("h1")?.textContent ||
          pickMeta(document, ['meta[property="og:title"]']) ||
          document.title
      );
      const permalink = cleanText(
        document.querySelector("#the_permalink")?.value ||
          pickMeta(document, ['meta[property="og:url"]']) ||
          currentUrl
      );
      const catalogueUrl = normalizeUrl(
        document.querySelector(".view_on_catalogue")?.href ||
          document.querySelector(".jump_catalogue")?.href ||
          document.querySelector(".panel_link .jump_catalogue")?.href ||
          "",
        currentUrl
      );
      const brn = cleanText(document.querySelector(".the_brn")?.textContent || "");
      const metadataFields = [];
      for (const heading of document.querySelectorAll(".panel_detail h3")) {
        const label = cleanText(heading.textContent);
        const value = nextSectionContent(heading);
        if (label && value) {
          metadataFields.push({ label, value });
        }
      }
      return {
        supported: true,
        source: "slwa",
        sourceLabel: "SLWA",
        type: "image",
        id: brn || slugify(permalink) || "slwa-record",
        title,
        url: normalizeUrl(permalink, currentUrl),
        aliases: uniqueValues(
          [
            permalink,
            catalogueUrl,
            ...collectionItems.flatMap((entry) => [entry.viewerUrl, entry.imageUrl, entry.thumbnailUrl])
          ],
          currentUrl
        ),
        citation: `${title}. State Library of Western Australia. ${permalink}`,
        description: metadataFields.map((field) => `${field.label}: ${field.value}`).join(" "),
        fullText: "",
        sourceTitle: "State Library of Western Australia",
        imageUrl: collectionItems[0]?.imageUrl || collectionItems[0]?.thumbnailUrl || "",
        imageUrls: collectionItems.map((entry) => entry.imageUrl || entry.thumbnailUrl).filter(Boolean),
        viewerUrls: collectionItems.map((entry) => entry.viewerUrl).filter(Boolean),
        attachments: collectionItems,
        metadataFields,
        rawMetadata: cleanText(document.querySelector(".panel_detail")?.textContent || "").slice(0, 4000)
      };
    }

    const title = cleanText(
      document.querySelector("h1")?.textContent ||
        pickMeta(document, ['meta[property="og:title"]']) ||
        document.title
    );
    const permalink = cleanText(
      document.querySelector("#the_permalink")?.value ||
        pickMeta(document, ['meta[property="og:url"]']) ||
        currentUrl
    );
    const catalogueUrl = normalizeUrl(
      document.querySelector(".view_on_catalogue")?.href ||
        document.querySelector(".jump_catalogue")?.href ||
        "",
      currentUrl
    );
    const downloadHref = document.querySelector(".button_download")?.getAttribute("href") || "";
    const previewImageUrl = normalizeUrl(
      document.querySelector("#download_confirmation img")?.getAttribute("src") ||
        document.querySelector(".lgePreview")?.getAttribute("src") ||
        document.querySelector("#noscript_fallback")?.getAttribute("src") ||
        pickMeta(document, ['meta[property="og:image"]']),
      currentUrl
    );
    const imageUrl = normalizeUrl(previewImageUrl || downloadHref, currentUrl);
    const brn = cleanText(document.querySelector(".the_brn")?.textContent || "");
    const viewAllUrl = normalizeUrl(document.querySelector(".header_meta_links a")?.href || "", currentUrl);
    const metadataFields = [];
    for (const heading of document.querySelectorAll(".panel_detail h3")) {
      const label = cleanText(heading.textContent);
      const value = nextSectionContent(heading);
      if (label && value) {
        metadataFields.push({ label, value });
      }
    }
    return {
      supported: true,
      source: "slwa",
      sourceLabel: "SLWA",
      type: "image",
      id: brn || slugify(permalink) || "slwa-item",
      title,
      url: normalizeUrl(permalink, currentUrl),
      aliases: uniqueValues(
        [
          permalink,
          catalogueUrl,
          viewAllUrl,
          imageUrl,
          downloadHref
        ],
        currentUrl
      ),
      citation: `${title}. State Library of Western Australia. ${permalink}`,
      description: metadataFields.map((field) => `${field.label}: ${field.value}`).join(" "),
      fullText: "",
      sourceTitle: "State Library of Western Australia",
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
      viewerUrls: [normalizeUrl(permalink, currentUrl)],
      viewAllUrl,
      attachments: [
        normalizeAttachment(
          {
            id: brn,
            title,
            viewerUrl: permalink,
            imageUrl,
            thumbnailUrl: imageUrl
          },
          currentUrl
        )
      ].filter(Boolean),
      metadataFields,
      rawMetadata: cleanText(document.querySelector(".panel_detail")?.textContent || "").slice(0, 4000)
    };
  }

  const title = cleanText(
    document.querySelector(".dpBibTitle")?.textContent ||
      (document.querySelector("title")?.textContent || "").replace(/^Encore\s*--\s*/i, "")
  );
  if (!title) {
    return { supported: false };
  }
  const attachments = extractSlwaEncoreAttachments(document, currentUrl);
  const firstAttachment = attachments[0] || null;
  const imageUrl = normalizeUrl(
    firstAttachment?.imageUrl ||
      pickMeta(document, ['meta[property="og:image"]']) ||
      document.querySelector(".record-cover-image img")?.getAttribute("src") ||
      "",
    currentUrl
  );
  const linkedCatalogueUrl = normalizeUrl(currentUrl, currentUrl);
  const itemTitle = firstAttachment?.title || title || "SLWA record";
  const idMatch =
    imageUrl.match(/slwa_([a-z0-9_]+)/i) ||
    linkedCatalogueUrl.match(/b(\d+)/i) ||
    currentUrl.match(/b(\d+)/i);
  const viewerUrl = imageUrl && /slwa_[a-z0-9_]+\.(jpg|jpeg|png|tif|tiff|webp)/i.test(imageUrl) ? stripImageExtension(imageUrl) : "";
  const metadataFields = [];
  const headingNodes = Array.from(document.querySelectorAll(".bibDisplayContentMain h3, .bibInfoLabel"));
  for (const node of headingNodes.slice(0, 20)) {
    const label = cleanText(node.textContent);
    const value =
      cleanText(node.nextElementSibling?.textContent || "") ||
      cleanText(node.parentElement?.querySelector(".bibInfoData")?.textContent || "");
    if (label && value) {
      metadataFields.push({ label, value });
    }
  }
  return {
    supported: true,
    source: "slwa",
    sourceLabel: "SLWA",
    type: imageUrl ? "image" : "text",
    id: idMatch?.[1] || slugify(itemTitle) || "slwa-record",
    title: itemTitle,
    url: normalizeUrl(currentUrl, currentUrl),
    aliases: uniqueValues(
      [currentUrl, linkedCatalogueUrl, imageUrl, viewerUrl, ...attachments.flatMap((entry) => [entry.viewerUrl, entry.imageUrl])],
      currentUrl
    ),
    citation: `${itemTitle}. State Library of Western Australia. ${normalizeUrl(currentUrl, currentUrl)}`,
    description:
      cleanText(document.querySelector(".briefcitTitle, .itemsSectionHeader, .recordMessage")?.textContent || "") ||
      cleanText(document.querySelector(".dpBibTitle")?.textContent || ""),
    fullText: "",
    sourceTitle: "State Library of Western Australia",
    imageUrl,
    imageUrls: attachments.map((entry) => entry.imageUrl).filter(Boolean),
    viewerUrls: attachments.map((entry) => entry.viewerUrl).filter(Boolean),
    attachments,
    metadataFields,
    rawMetadata: cleanText(document.body?.textContent || "").slice(0, 4000)
  };
}

function extractWaMuseum(document, currentUrl) {
  const url = new URL(currentUrl);
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  if (hostname !== "museum.wa.gov.au" || !/\/maritime-archaeology-db\/artefacts\/[^/]+/i.test(pathname)) {
    return { supported: false };
  }
  if (/\/artefacts\/search(?:\/|$)/i.test(pathname) || /\/artefacts\/browse(?:\/|$)/i.test(pathname)) {
    return { supported: false };
  }

  const title = cleanText(document.querySelector("h1")?.textContent || document.title.replace(/\s*\|.*$/, ""));
  if (!title) {
    return { supported: false };
  }

  const collection = cleanText(document.querySelector(".content h2")?.textContent || "Maritime Archaeology Databases");
  const description = cleanText(
    Array.from(document.querySelectorAll(".content > p"))
      .map((node) => node.textContent || "")
      .find((text) => cleanText(text))
  );
  const metadataFields = [];
  for (const row of Array.from(document.querySelectorAll(".details p"))) {
    const label = cleanText(row.querySelector("strong.label")?.textContent || "").replace(/:$/, "");
    const clone = row.cloneNode(true);
    clone.querySelectorAll("strong.label").forEach((node) => node.remove());
    const value = cleanText(clone.textContent || "");
    if (label && value) {
      metadataFields.push({ label, value });
    }
  }

  const imageCandidates = Array.from(document.querySelectorAll("img"))
    .map((image) => normalizeUrl(image.getAttribute("src") || image.getAttribute("data-src") || "", currentUrl))
    .filter(Boolean)
    .filter((src) => !/mapbox|wrecks_map|logo|icon/i.test(src));
  const imageUrl = imageCandidates[0] || "";
  const id = slugify(title) || slugify(currentUrl) || "wa-museum-record";
  const rawMetadata = cleanText(document.querySelector(".content")?.textContent || "").slice(0, 4000);

  return {
    supported: true,
    source: "wa-museum",
    sourceLabel: "WA Museum",
    type: imageUrl ? "image" : "text",
    id,
    title,
    url: normalizeUrl(currentUrl, currentUrl),
    aliases: uniqueValues([currentUrl], currentUrl),
    citation: `${title}. Maritime Archaeology Databases, Western Australian Museum. ${normalizeUrl(currentUrl, currentUrl)}`,
    sourceTitle: collection,
    description,
    fullText: "",
    imageUrl,
    metadataFields,
    rawMetadata
  };
}

function extractItemFromHtml(url, html) {
  const document = buildDom(html, url);
  const extractors = [extractTrove, extractSlwa, extractWaMuseum];
  for (const extract of extractors) {
    try {
      const result = extract(document, url);
      if (result?.supported) {
        result.aliases = uniqueValues(result.aliases || [], url);
        return result;
      }
    } catch {
      // Try next adapter.
    }
  }
  return {
    supported: false,
    reason: "This page is not supported by an installed collection plugin."
  };
}

module.exports = {
  buildSlwaEncoreRecordUrl,
  buildSlwaViewerUrlFromDownloadUrl,
  normalizeUrl,
  extractItemFromHtml,
  buildSlwaEncoreSearchUrl,
  findBestSlwaRecordCandidate,
  findSlwaClassicRecordId,
  findSlwaViewerUrl
};
