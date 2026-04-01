(function () {
  function normalizeUrl(value) {
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value, window.location?.href || "https://example.com");
      url.hash = "";
      if (url.hostname === "nla.gov.au") {
        url.protocol = "https:";
      }
      return url.toString().replace(/\/$/, "");
    } catch {
      return String(value).trim();
    }
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean).map((value) => normalizeUrl(value)).filter(Boolean))];
  }

  function makeItemKey(item) {
    return [item.source || "unknown", item.type || "item", item.id || ""].join(":");
  }

  function commonHelpersSource() {
    return `
      const helpers = {
        normalizeUrl(value) {
          if (!value) {
            return "";
          }
          try {
            const url = new URL(value, location.href);
            url.hash = "";
            if (url.hostname === "nla.gov.au") {
              url.protocol = "https:";
            }
            return url.toString().replace(/\\/$/, "");
          } catch {
            return String(value).trim();
          }
        },
        cleanText(value) {
          return String(value || "").replace(/\\s+/g, " ").trim();
        },
        pickMeta(...selectors) {
          for (const selector of selectors) {
            const node = document.querySelector(selector);
            if (!node) {
              continue;
            }
            const value = node.getAttribute("content") || node.getAttribute("href") || node.textContent;
            const cleaned = String(value || "").trim();
            if (cleaned) {
              return cleaned;
            }
          }
          return "";
        },
        nextSectionContent(heading) {
          const chunks = [];
          let pointer = heading.nextElementSibling;
          while (pointer && !/^H[23]$/i.test(pointer.tagName)) {
            const text = (pointer.innerText || pointer.textContent || "").replace(/\\s+/g, " ").trim();
            if (text) {
              chunks.push(text);
            }
            pointer = pointer.nextElementSibling;
          }
          return chunks.join(" ");
        },
        slugify(value) {
          return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        },
        stripImageExtension(value) {
          return String(value || "").replace(/\\.(jpg|jpeg|png|tif|tiff|webp)$/i, "");
        },
        normalizeAttachment(entry) {
          const viewerUrl = helpers.normalizeUrl(entry.viewerUrl || "");
          const imageUrl = helpers.normalizeUrl(entry.imageUrl || "");
          const thumbnailUrl = helpers.normalizeUrl(entry.thumbnailUrl || imageUrl);
          const title = helpers.cleanText(entry.title || "");
          const id =
            helpers.cleanText(entry.id || "") ||
            viewerUrl.match(/slwa_([a-z0-9_]+)/i)?.[1] ||
            imageUrl.match(/slwa_([a-z0-9_]+)/i)?.[1] ||
            "";
          if (!viewerUrl && !imageUrl && !thumbnailUrl) {
            return null;
          }
          return { id, title, viewerUrl, imageUrl, thumbnailUrl };
        }
      };
    `;
  }

  function troveExtractorSource() {
    return `
      () => {
        const path = location.pathname.toLowerCase();
        const canonicalUrl = helpers.normalizeUrl(helpers.pickMeta('link[rel="canonical"]') || location.href);
        const titleFromHeading = document.querySelector("h1")?.textContent?.trim() || "";
        const title =
          titleFromHeading ||
          helpers.pickMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') ||
          document.title.replace(/\\s*-\\s*Trove$/i, "").trim();
        if (/\\/newspaper\\/article\\/\\d+/i.test(path)) {
          const citationTerms = Array.from(document.querySelectorAll(".detailsPanel dt"));
          const citationMap = {};
          for (const term of citationTerms) {
            const label = helpers.cleanText(term.textContent);
            const detail = helpers.cleanText(term.nextElementSibling?.textContent || "");
            if (label && detail) {
              citationMap[label] = detail;
            }
          }
          const fullText = Array.from(document.querySelectorAll("#fulltextContents .paragraph"))
            .map((paragraph) =>
              Array.from(paragraph.querySelectorAll(".read"))
                .map((line) => helpers.cleanText(line.textContent))
                .filter(Boolean)
                .join(" ")
            )
            .filter(Boolean)
            .join("\\n\\n");
          const articleId = canonicalUrl.match(/\\/newspaper\\/article\\/(\\d+)/i)?.[1] || "";
          const articleIdentifier = helpers.cleanText(
            document.querySelector(".detailsPanel dd a")?.textContent || ""
          );
          return {
            supported: true,
            source: "trove",
            sourceLabel: "Trove",
            type: "newspaper",
            id: articleId,
            title,
            url: canonicalUrl,
            aliases: [canonicalUrl, articleIdentifier],
            citation:
              citationMap["Harvard/Australian citation"] ||
              citationMap["APA citation"] ||
              citationMap["MLA citation"] ||
              "",
            sourceTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "",
            description: helpers.pickMeta('meta[name="description"]', 'meta[property="og:description"]'),
            fullText,
            imageUrl: helpers.normalizeUrl(
              helpers.pickMeta('meta[property="og:image"]', 'meta[name="twitter:image"]')
            ),
            metadataFields: Object.entries(citationMap).map(([label, value]) => ({ label, value })),
            rawMetadata: ""
          };
        }

        const workId = canonicalUrl.match(/\\/work\\/(\\d+)/i)?.[1] || "";
        const imageNodes = Array.from(document.images)
          .filter((image) => image.currentSrc || image.src)
          .map((image) => ({
            src: helpers.normalizeUrl(image.currentSrc || image.src),
            area: (image.naturalWidth || image.width || 0) * (image.naturalHeight || image.height || 0)
          }))
          .filter((image) =>
            image.src &&
            !/favicon|logo|icon|avatar|spinner|loader/i.test(image.src) &&
            image.area > 40000
          )
          .sort((left, right) => right.area - left.area);
        const metadataFields = [];
        for (const term of Array.from(document.querySelectorAll("dt")).slice(0, 20)) {
          const label = helpers.cleanText(term.textContent);
          const value = helpers.cleanText(term.nextElementSibling?.textContent || "");
          if (label && value) {
            metadataFields.push({ label, value });
          }
        }
        const mainText = document.querySelector("main")?.innerText?.replace(/\\n{3,}/g, "\\n\\n").trim() || "";
        const description =
          helpers.pickMeta('meta[name="description"]', 'meta[property="og:description"]') ||
          Array.from(document.querySelectorAll("main p"))
            .map((node) => helpers.cleanText(node.textContent))
            .find(Boolean) ||
          "";
        const contributor = helpers.cleanText(document.querySelector(".contributor")?.textContent || "");
        const candidateImage =
          imageNodes[0]?.src || helpers.normalizeUrl(helpers.pickMeta('meta[property="og:image"]'));
        if (/\\/work\\/\\d+/i.test(path)) {
          return {
            supported: true,
            source: "trove",
            sourceLabel: "Trove",
            type: candidateImage ? "image" : "text",
            id: workId || helpers.slugify(title || canonicalUrl) || "image",
            title,
            url: canonicalUrl,
            aliases: [canonicalUrl],
            citation: metadataFields.find((field) => /citation/i.test(field.label))?.value || title,
            description,
            fullText: "",
            sourceTitle: document.title.replace(/\\s*-\\s*Trove$/i, "").trim(),
            imageUrl: candidateImage,
            contributor,
            metadataFields,
            rawMetadata: mainText.slice(0, 4000)
          };
        }
        return { supported: false };
      }
    `;
  }

  function slwaExtractorSource() {
    return `
      () => {
        const hostname = location.hostname.toLowerCase();
        const isViewer = hostname === "purl.slwa.wa.gov.au";
        const isCatalogue = hostname.includes("slwa.wa.gov.au") && /\\/iii\\/encore\\/record\\//i.test(location.pathname);
        if (!isViewer && !isCatalogue) {
          return { supported: false };
        }

        if (isViewer) {
          const collectionItems = Array.from(document.querySelectorAll("ul.collection a.object[href]"))
            .map((anchor) =>
              helpers.normalizeAttachment({
                viewerUrl: anchor.getAttribute("href") || "",
                thumbnailUrl: anchor.querySelector("img")?.getAttribute("src") || "",
                title: anchor.querySelector("h2")?.textContent || anchor.getAttribute("title") || ""
              })
            )
            .filter(Boolean);
          if (collectionItems.length) {
            const title = helpers.cleanText(
              document.querySelector("h1")?.textContent ||
              helpers.pickMeta('meta[property="og:title"]') ||
              document.title
            );
            const permalink =
              helpers.cleanText(document.querySelector("#the_permalink")?.value) ||
              helpers.pickMeta('meta[property="og:url"]') ||
              location.href;
            const catalogueUrl = helpers.normalizeUrl(
              document.querySelector(".view_on_catalogue")?.href ||
              document.querySelector(".jump_catalogue")?.href ||
              document.querySelector(".panel_link .jump_catalogue")?.href ||
              ""
            );
            const brn = helpers.cleanText(document.querySelector(".the_brn")?.textContent || "");
            const metadataFields = [];
            for (const heading of Array.from(document.querySelectorAll(".panel_detail h3"))) {
              const label = helpers.cleanText(heading.textContent);
              const value = helpers.nextSectionContent(heading);
              if (label && value) {
                metadataFields.push({ label, value });
              }
            }
            return {
              supported: true,
              source: "slwa",
              sourceLabel: "SLWA",
              type: "image",
              id: brn || helpers.slugify(permalink) || "slwa-record",
              title,
              url: helpers.normalizeUrl(permalink),
              aliases: [
                helpers.normalizeUrl(permalink),
                catalogueUrl,
                ...collectionItems.flatMap((entry) => [entry.viewerUrl, entry.imageUrl, entry.thumbnailUrl])
              ],
              citation: title + ". State Library of Western Australia. " + permalink,
              description: metadataFields.map((field) => field.label + ": " + field.value).join(" "),
              fullText: "",
              sourceTitle: "State Library of Western Australia",
              imageUrl: collectionItems[0]?.imageUrl || collectionItems[0]?.thumbnailUrl || "",
              imageUrls: collectionItems.map((entry) => entry.imageUrl || entry.thumbnailUrl).filter(Boolean),
              viewerUrls: collectionItems.map((entry) => entry.viewerUrl).filter(Boolean),
              attachments: collectionItems,
              metadataFields,
              rawMetadata: document.querySelector(".panel_detail")?.innerText?.slice(0, 4000) || ""
            };
          }

          const title = helpers.cleanText(
            document.querySelector("h1")?.textContent ||
            helpers.pickMeta('meta[property="og:title"]') ||
            document.title
          );
          const permalink =
            helpers.cleanText(document.querySelector("#the_permalink")?.value) ||
            helpers.pickMeta('meta[property="og:url"]') ||
            location.href;
          const catalogueUrl = helpers.normalizeUrl(
            document.querySelector(".view_on_catalogue")?.href ||
            document.querySelector(".jump_catalogue")?.href ||
            ""
          );
          const downloadHref = document.querySelector(".button_download")?.getAttribute("href") || "";
          const imageUrl = helpers.normalizeUrl(
            downloadHref ||
            document.querySelector("#noscript_fallback")?.getAttribute("src") ||
            helpers.pickMeta('meta[property="og:image"]')
          );
          const brn = helpers.cleanText(document.querySelector(".the_brn")?.textContent || "");
          const viewAllUrl = helpers.normalizeUrl(document.querySelector(".header_meta_links a")?.href || "");
          const metadataFields = [];
          for (const heading of Array.from(document.querySelectorAll(".panel_detail h3"))) {
            const label = helpers.cleanText(heading.textContent);
            const value = helpers.nextSectionContent(heading);
            if (label && value) {
              metadataFields.push({ label, value });
            }
          }
          const citation = title + ". State Library of Western Australia. " + permalink;
          return {
            supported: true,
            source: "slwa",
            sourceLabel: "SLWA",
            type: "image",
            id: brn || helpers.slugify(permalink) || "slwa-item",
            title,
            url: helpers.normalizeUrl(permalink),
            aliases: [
              helpers.normalizeUrl(permalink),
              catalogueUrl,
              viewAllUrl,
              imageUrl
            ],
            citation,
            description: metadataFields.map((field) => field.label + ": " + field.value).join(" "),
            fullText: "",
            sourceTitle: "State Library of Western Australia",
            imageUrl,
            imageUrls: imageUrl ? [imageUrl] : [],
            viewerUrls: [helpers.normalizeUrl(permalink)],
            viewAllUrl,
            attachments: [
              helpers.normalizeAttachment({
                id: brn,
                title,
                viewerUrl: permalink,
                imageUrl,
                thumbnailUrl: imageUrl
              })
            ].filter(Boolean),
            metadataFields,
            rawMetadata: document.querySelector(".panel_detail")?.innerText?.slice(0, 4000) || ""
          };
        }

        const title = helpers.cleanText(
          document.querySelector(".dpBibTitle")?.textContent ||
          document.querySelector("title")?.textContent.replace(/^Encore\\s*--\\s*/i, "") ||
          ""
        );
        if (!title) {
          return { supported: false };
        }
        const attachments = Array.from(document.querySelectorAll("#thumbnailImagesTable tbody tr"))
          .map((row) => {
            const cells = Array.from(row.querySelectorAll("td")).map((node) => helpers.cleanText(node.textContent));
            const imageUrl = helpers.normalizeUrl(
              cells[1] ||
              cells[0] ||
              row.querySelector("img")?.getAttribute("src") ||
              ""
            );
            return helpers.normalizeAttachment({
              imageUrl,
              thumbnailUrl: imageUrl,
              viewerUrl: imageUrl ? helpers.stripImageExtension(imageUrl) : "",
              title: cells[3] || ""
            });
          })
          .filter(Boolean);
        const imageUrl = helpers.normalizeUrl(
          attachments[0]?.imageUrl ||
          helpers.pickMeta('meta[property="og:image"]') ||
          document.querySelector(".record-cover-image img")?.getAttribute("src") ||
          ""
        );
        const linkedCatalogueUrl = helpers.normalizeUrl(location.href);
        const itemTitle = attachments[0]?.title || title || "SLWA record";
        const idMatch =
          imageUrl.match(/slwa_([a-z0-9_]+)/i) ||
          linkedCatalogueUrl.match(/b(\\d+)/i) ||
          location.href.match(/b(\\d+)/i);
        const viewerUrl =
          imageUrl && /slwa_[a-z0-9_]+\\.(jpg|jpeg|png|tif|tiff|webp)/i.test(imageUrl)
            ? helpers.stripImageExtension(imageUrl)
            : "";
        const metadataFields = [];
        const headingNodes = Array.from(document.querySelectorAll(".bibDisplayContentMain h3, .bibInfoLabel"));
        for (const node of headingNodes.slice(0, 20)) {
          const label = helpers.cleanText(node.textContent);
          const value =
            helpers.cleanText(node.nextElementSibling?.textContent || "") ||
            helpers.cleanText(node.parentElement?.querySelector(".bibInfoData")?.textContent || "");
          if (label && value) {
            metadataFields.push({ label, value });
          }
        }
        return {
          supported: true,
          source: "slwa",
          sourceLabel: "SLWA",
          type: imageUrl ? "image" : "text",
          id: idMatch?.[1] || helpers.slugify(itemTitle) || "slwa-record",
          title: itemTitle,
          url: helpers.normalizeUrl(location.href),
          aliases: [
            helpers.normalizeUrl(location.href),
            linkedCatalogueUrl,
            imageUrl,
            helpers.normalizeUrl(viewerUrl),
            ...attachments.flatMap((entry) => [entry.viewerUrl, entry.imageUrl])
          ],
          citation: itemTitle + ". State Library of Western Australia. " + helpers.normalizeUrl(location.href),
          description:
            helpers.cleanText(document.querySelector(".briefcitTitle, .itemsSectionHeader, .recordMessage")?.textContent || "") ||
            helpers.cleanText(document.querySelector(".dpBibTitle")?.textContent || ""),
          fullText: "",
          sourceTitle: "State Library of Western Australia",
          imageUrl,
          imageUrls: attachments.map((entry) => entry.imageUrl).filter(Boolean),
          viewerUrls: attachments.map((entry) => entry.viewerUrl).filter(Boolean),
          attachments,
          metadataFields,
          rawMetadata: document.body.innerText.slice(0, 4000)
        };
      }
    `;
  }

  function waMuseumExtractorSource() {
    return `
      () => {
        const hostname = location.hostname.toLowerCase();
        const pathname = location.pathname.toLowerCase();
        if (hostname !== "museum.wa.gov.au" || !/\\/maritime-archaeology-db\\/artefacts\\/[^/]+/i.test(pathname)) {
          return { supported: false };
        }
        if (/\\/artefacts\\/search(?:\\/|$)/i.test(pathname) || /\\/artefacts\\/browse(?:\\/|$)/i.test(pathname)) {
          return { supported: false };
        }

        const title = helpers.cleanText(
          document.querySelector("h1")?.textContent ||
          document.title.replace(/\\s*\\|.*$/, "")
        );
        if (!title) {
          return { supported: false };
        }

        const collection = helpers.cleanText(
          document.querySelector(".content h2")?.textContent || "Maritime Archaeology Databases"
        );
        const description = helpers.cleanText(
          Array.from(document.querySelectorAll(".content > p"))
            .map((node) => node.textContent || "")
            .find((text) => helpers.cleanText(text))
        );
        const metadataFields = [];
        for (const row of Array.from(document.querySelectorAll(".details p"))) {
          const label = helpers.cleanText(row.querySelector("strong.label")?.textContent || "").replace(/:$/, "");
          const clone = row.cloneNode(true);
          clone.querySelectorAll("strong.label").forEach((node) => node.remove());
          const value = helpers.cleanText(clone.textContent || "");
          if (label && value) {
            metadataFields.push({ label, value });
          }
        }
        const imageCandidates = Array.from(document.querySelectorAll("img"))
          .map((image) => helpers.normalizeUrl(image.currentSrc || image.src || ""))
          .filter(Boolean)
          .filter((src) => !/mapbox|wrecks_map|logo|icon/i.test(src));
        const imageUrl = imageCandidates[0] || "";
        return {
          supported: true,
          source: "wa-museum",
          sourceLabel: "WA Museum",
          type: imageUrl ? "image" : "text",
          id: helpers.slugify(title) || helpers.slugify(location.href) || "wa-museum-record",
          title,
          url: helpers.normalizeUrl(location.href),
          aliases: [helpers.normalizeUrl(location.href)],
          citation: title + ". Maritime Archaeology Databases, Western Australian Museum. " + helpers.normalizeUrl(location.href),
          description,
          fullText: "",
          sourceTitle: collection,
          imageUrl,
          metadataFields,
          rawMetadata: helpers.cleanText(document.querySelector(".content")?.textContent || "").slice(0, 4000)
        };
      }
    `;
  }

  const plugins = [
    {
      id: "trove",
      label: "Trove",
      description: "Newspaper articles and image records from the National Library of Australia.",
      browseUrl: "https://trove.nla.gov.au/",
      domains: ["trove.nla.gov.au", "nla.gov.au"],
      extractorSource: troveExtractorSource()
    },
    {
      id: "slwa",
      label: "SLWA",
      description: "State Library of Western Australia catalogue and media viewer records.",
      browseUrl: "https://encore.slwa.wa.gov.au/",
      domains: ["encore.slwa.wa.gov.au", "purl.slwa.wa.gov.au", "catalogue.slwa.wa.gov.au"],
      extractorSource: slwaExtractorSource()
    },
    {
      id: "wa-museum",
      label: "WA Museum",
      description: "Maritime Archaeology Databases object records from the Western Australian Museum.",
      browseUrl: "https://museum.wa.gov.au/maritime-archaeology-db/artefacts/search/Batavia",
      domains: ["museum.wa.gov.au"],
      extractorSource: waMuseumExtractorSource()
    }
  ];

  function listPlugins() {
    return plugins.map((plugin) => ({
      id: plugin.id,
      label: plugin.label,
      description: plugin.description,
      browseUrl: plugin.browseUrl,
      domains: plugin.domains
    }));
  }

  function supportedLinkPatterns() {
    return [
      /https?:\/\/trove\.nla\.gov\.au\/newspaper\/article\/\d+/i,
      /https?:\/\/trove\.nla\.gov\.au\/work\/\d+/i,
      /https?:\/\/encore\.slwa\.wa\.gov\.au\/iii\/encore\/record\//i,
      /https?:\/\/purl\.slwa\.wa\.gov\.au\/[a-z0-9_./-]+/i,
      /https?:\/\/catalogue\.slwa\.wa\.gov\.au\/record=b\d+~S\d+/i,
      /https?:\/\/museum\.wa\.gov\.au\/maritime-archaeology-db\/artefacts\/[^/?#]+/i
    ];
  }

  function buildExtractionScript() {
    return `
      (() => {
        ${commonHelpersSource()}
        const extractors = [${plugins.map((plugin) => plugin.extractorSource).join(",")}];
        for (const extract of extractors) {
          try {
            const result = extract();
            if (result?.supported) {
              result.aliases = [...new Set((result.aliases || []).filter(Boolean))];
              return result;
            }
          } catch (error) {
            // Try the next source plugin.
          }
        }
        return {
          supported: false,
          reason: "This page is not supported by an installed collection plugin."
        };
      })();
    `;
  }

  function projectStatePayload(project) {
    if (!project) {
      return { saved: [], ignored: [] };
    }

    const mapEntries = (entries) =>
      entries.map((item) => ({
        key: item.key,
        urls: uniqueValues([item.url, ...(item.aliases || [])])
      }));

    return {
      saved: mapEntries(project.saved || []),
      ignored: mapEntries(project.ignored || [])
    };
  }

  function buildDecorationScript(payload) {
    return `
      (() => {
        const state = ${JSON.stringify(payload)};
        const styleId = "trove-library-decorations";
        const badgeId = "trove-library-page-badge";
        const actionClass = "trove-library-inline-actions";
        const actionPrefix = "__trove_library_action__";
        const root = document.head || document.documentElement;
        const normalize = ${normalizeUrl.toString()};
        const supportedPatterns = [${supportedLinkPatterns()
          .map((pattern) => pattern.toString())
          .join(",")}];
        const savedUrls = new Set(state.saved.flatMap((item) => item.urls.map((url) => normalize(url))));
        const ignoredUrls = new Set(state.ignored.flatMap((item) => item.urls.map((url) => normalize(url))));
        const isSupportedLink = (href) => supportedPatterns.some((pattern) => pattern.test(href));
        const cleanText = (value) => String(value || "").replace(/\\s+/g, " ").trim();
        const isEntryLink = (anchor, href) => {
          if (!anchor || !href || !isSupportedLink(href)) {
            return false;
          }
          let host = "";
          try {
            host = new URL(href).hostname.toLowerCase();
          } catch {
            host = location.hostname.toLowerCase();
          }
          const text = cleanText(anchor.textContent);
          if (host === "trove.nla.gov.au") {
            if (!text || text.length < 8) {
              return false;
            }
            if (anchor.closest(".quicknav, .thumbnail-column, nav, header, footer, .pagination, .custom-control-label, .crumb")) {
              return false;
            }
            return Boolean(
              anchor.closest(".result .title") ||
                anchor.closest(".result")?.querySelector(".title a") === anchor ||
                anchor.closest("[class*='result'] .title") ||
                anchor.closest(".result")
            );
          }
          if (host === "encore.slwa.wa.gov.au") {
            return Boolean(
              anchor.closest(".search-result-item") &&
                anchor.closest(".dpBibTitle") &&
                /^recordDisplayLink2Component/i.test(anchor.id || "")
            );
          }
          if (location.hostname.toLowerCase() === "catalogue.slwa.wa.gov.au") {
            if (anchor.closest("nav, header, footer, .menu")) {
              return false;
            }
            return Boolean(
              /https?:\/\/purl\.slwa\.wa\.gov\.au\/[a-z0-9_./-]+/i.test(href) ||
              /https?:\/\/catalogue\.slwa\.wa\.gov\.au\/record=b\d+~S\d+/i.test(href)
            ) && Boolean(anchor.closest(".viewPanel, .briefcitDetail, .browseEntry, .bibRecordLink, .page"));
          }
          if (host === "museum.wa.gov.au") {
            if (anchor.closest(".pager, .breadcrumb, nav, header, footer, .menu, .skip-links")) {
              return false;
            }
            return Boolean(anchor.closest(".wrap") && anchor.parentElement?.classList.contains("title"));
          }
          return false;
        };
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.textContent = \`
            a.trove-library-saved {
              background: rgba(216, 240, 219, 0.9) !important;
              box-shadow: inset 0 0 0 2px rgba(33, 81, 54, 0.32) !important;
              color: #215136 !important;
            }
            a.trove-library-ignored {
              background: rgba(231, 224, 216, 0.92) !important;
              box-shadow: inset 0 0 0 2px rgba(108, 98, 88, 0.28) !important;
              color: #6c6258 !important;
              opacity: 0.68 !important;
            }
            .\${actionClass} {
              display: inline-flex;
              gap: 6px;
              margin-left: 8px;
              vertical-align: middle;
              flex-wrap: wrap;
            }
            .\${actionClass} button {
              border: 0;
              border-radius: 999px;
              padding: 4px 10px;
              font: 600 12px/1.1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              cursor: pointer;
            }
            .\${actionClass} .preview {
              background: rgba(45, 91, 74, 0.12);
              color: #244b3c;
            }
            .\${actionClass} .collect {
              background: rgba(157, 63, 38, 0.12);
              color: #7f311c;
            }
            .\${actionClass} .collect.saved {
              background: rgba(216, 240, 219, 0.95);
              color: #215136;
            }
            .\${actionClass} .collect.ignored {
              background: rgba(231, 224, 216, 0.95);
              color: #6c6258;
            }
            #\${badgeId} {
              position: fixed;
              right: 18px;
              bottom: 18px;
              z-index: 2147483647;
              padding: 10px 14px;
              border-radius: 999px;
              font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
            }
            #\${badgeId}.saved {
              background: #d8f0db;
              color: #215136;
            }
            #\${badgeId}.ignored {
              background: #e7e0d8;
              color: #6c6258;
            }
          \`;
          root.appendChild(style);
        }
        const emit = (payload) => {
          console.log(actionPrefix + JSON.stringify(payload));
        };
        const ensureInlineActions = (anchor, href) => {
          if (anchor.dataset.troveLibraryBound === "true") {
            const existing = anchor.nextElementSibling;
            if (existing && existing.classList.contains(actionClass)) {
              const collect = existing.querySelector(".collect");
              if (savedUrls.has(href)) {
                collect.classList.add("saved");
                collect.classList.remove("ignored");
                collect.textContent = "Collected";
              } else if (ignoredUrls.has(href)) {
                collect.classList.add("ignored");
                collect.classList.remove("saved");
                collect.textContent = "Ignored";
              } else {
                collect.classList.remove("saved", "ignored");
                collect.textContent = "Collect";
              }
            }
            return;
          }
          anchor.dataset.troveLibraryBound = "true";
          const controls = document.createElement("span");
          controls.className = actionClass;
          const preview = document.createElement("button");
          preview.type = "button";
          preview.className = "preview";
          preview.textContent = "Preview";
          preview.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            emit({ action: "preview-link", url: href, label: anchor.textContent.trim() });
          });
          const collect = document.createElement("button");
          collect.type = "button";
          collect.className = "collect";
          collect.textContent = "Collect";
          collect.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            emit({ action: "collect-link", url: href, label: anchor.textContent.trim() });
          });
          controls.append(preview, collect);
          anchor.insertAdjacentElement("afterend", controls);
          ensureInlineActions(anchor, href);
        };
        const apply = () => {
          document.querySelectorAll("a.trove-library-saved, a.trove-library-ignored").forEach((node) => {
            node.classList.remove("trove-library-saved", "trove-library-ignored");
          });
          document.querySelectorAll("a[href]").forEach((anchor) => {
            const href = normalize(anchor.href);
            if (!href) {
              return;
            }
            if (isEntryLink(anchor, href)) {
              ensureInlineActions(anchor, href);
            }
            if (savedUrls.has(href)) {
              anchor.classList.add("trove-library-saved");
            } else if (ignoredUrls.has(href)) {
              anchor.classList.add("trove-library-ignored");
            }
          });
          const currentUrl = normalize(location.href);
          let badge = document.getElementById(badgeId);
          if (badge) {
            badge.remove();
          }
          if (!currentUrl) {
            return;
          }
          if (!savedUrls.has(currentUrl) && !ignoredUrls.has(currentUrl)) {
            return;
          }
          badge = document.createElement("div");
          badge.id = badgeId;
          if (savedUrls.has(currentUrl)) {
            badge.className = "saved";
            badge.textContent = "Saved in library";
          } else {
            badge.className = "ignored";
            badge.textContent = "Ignored in library";
          }
          document.body.appendChild(badge);
        };
        apply();
        if (!window.__troveLibraryObserver) {
          window.__troveLibraryObserver = new MutationObserver(() => apply());
          window.__troveLibraryObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
      })();
    `;
  }

  function buildImmediateStatusScript(payload) {
    return `
      (() => {
        const status = ${JSON.stringify(payload.status || "")};
        const urls = new Set((${JSON.stringify(payload.urls || [])} || []).map((value) => (${normalizeUrl.toString()})(value)).filter(Boolean));
        const badgeId = "trove-library-page-badge";
        const actionClass = "trove-library-inline-actions";
        if (!urls.size) {
          return;
        }

        document.querySelectorAll("a[href]").forEach((anchor) => {
          const href = (${normalizeUrl.toString()})(anchor.href);
          if (!href || !urls.has(href)) {
            return;
          }
          anchor.classList.remove("trove-library-saved", "trove-library-ignored");
          anchor.classList.add(status === "saved" ? "trove-library-saved" : "trove-library-ignored");
          const controls = anchor.nextElementSibling;
          if (controls && controls.classList.contains(actionClass)) {
            const collect = controls.querySelector(".collect");
            if (collect) {
              collect.classList.remove("saved", "ignored");
              if (status === "saved") {
                collect.classList.add("saved");
                collect.textContent = "Collected";
                collect.disabled = true;
              } else if (status === "ignored") {
                collect.classList.add("ignored");
                collect.textContent = "Ignored";
                collect.disabled = true;
              } else {
                collect.textContent = "Collect";
                collect.disabled = false;
              }
            }
          }
        });

        const currentUrl = (${normalizeUrl.toString()})(location.href);
        const existingBadge = document.getElementById(badgeId);
        if (existingBadge) {
          existingBadge.remove();
        }
        if (currentUrl && urls.has(currentUrl)) {
          if (!status) {
            return;
          }
          const badge = document.createElement("div");
          badge.id = badgeId;
          badge.className = status === "saved" ? "saved" : "ignored";
          badge.textContent = status === "saved" ? "Collected in library" : "Ignored in library";
          document.body.appendChild(badge);
        }
      })();
    `;
  }

  function itemStatus(project, item) {
    if (!project || !item) {
      return "";
    }

    const key = makeItemKey(item);
    if ((project.saved || []).some((entry) => entry.key === key)) {
      return "saved";
    }
    if ((project.ignored || []).some((entry) => entry.key === key)) {
      return "ignored";
    }

    const aliases = uniqueValues([item.url, ...(item.aliases || [])]);
    if (
      (project.saved || []).some((entry) =>
        uniqueValues([entry.url, ...(entry.aliases || [])]).some((alias) => aliases.includes(alias))
      )
    ) {
      return "saved";
    }
    if (
      (project.ignored || []).some((entry) =>
        uniqueValues([entry.url, ...(entry.aliases || [])]).some((alias) => aliases.includes(alias))
      )
    ) {
      return "ignored";
    }
    return "";
  }

  window.CollectionSourcePlugins = {
    listPlugins,
    buildExtractionScript,
    buildDecorationScript,
    buildImmediateStatusScript,
    projectStatePayload,
    itemStatus,
    makeItemKey
  };
})();
