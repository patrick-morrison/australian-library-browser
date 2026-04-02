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

  function getMatchKeys(value) {
    const normalized = normalizeUrl(value);
    if (!normalized) {
      return [];
    }

    const keys = [normalized];

    try {
      const url = new URL(normalized);
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname;
      const pathnameWithSearch = `${url.pathname}${url.search}`;

      if (hostname === "trove.nla.gov.au" || hostname === "nla.gov.au") {
        const articleMatch =
          pathname.match(/\/newspaper\/article\/(\d+)/i) ||
          normalized.match(/nla\.news-article(\d+)/i);
        if (articleMatch) {
          keys.push(`trove:newspaper:${articleMatch[1]}`);
        }
        const workMatch = pathname.match(/\/work\/(\d+)/i);
        if (workMatch) {
          keys.push(`trove:work:${workMatch[1]}`);
        }
      }

      if (/^(purl|catalogue|encore)\.slwa\.wa\.gov\.au$/i.test(hostname)) {
        const assetMatch = normalized.match(/slwa_([a-z0-9]+(?:_[0-9]+)?)/i);
        if (assetMatch) {
          const assetId = assetMatch[1].toLowerCase();
          keys.push(`slwa:${assetId}`);
          const parentId = assetId.replace(/_\d+$/, "");
          if (parentId && parentId !== assetId) {
            keys.push(`slwa:${parentId}`);
          }
        }
        const recordMatch =
          pathnameWithSearch.match(/\/record=b([a-z0-9]+)(?:~|$)/i) ||
          pathnameWithSearch.match(/\/record\/C__Rb([a-z0-9]+)__/i);
        if (recordMatch) {
          keys.push(`slwa:${recordMatch[1].toLowerCase()}`);
        }
      }

      if (hostname === "museum.wa.gov.au") {
        const artefactMatch = pathname.match(/\/maritime-archaeology-db\/artefacts\/([^/?#]+)/i);
        if (artefactMatch) {
          keys.push(`wamuseum:${artefactMatch[1].toLowerCase()}`);
        }
      }
    } catch {
      return [normalized];
    }

    return [...new Set(keys.filter(Boolean))];
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
        const getMetadataDescription = (metadataFields) => {
          const preferredLabels = ["summary", "description", "abstract", "notes", "scope and content"];
          const normalized = Array.isArray(metadataFields) ? metadataFields : [];
          for (const preferredLabel of preferredLabels) {
            const field = normalized.find((entry) => helpers.cleanText(entry?.label || "").toLowerCase() === preferredLabel);
            if (field?.value) {
              return helpers.cleanText(field.value);
            }
          }
          return "";
        };
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
              description: getMetadataDescription(metadataFields),
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
          const previewImageUrl = helpers.normalizeUrl(
            document.querySelector("#download_confirmation img")?.getAttribute("src") ||
            document.querySelector(".lgePreview")?.getAttribute("src") ||
            document.querySelector("#noscript_fallback")?.getAttribute("src") ||
            helpers.pickMeta('meta[property="og:image"]')
          );
          const imageUrl = helpers.normalizeUrl(previewImageUrl || downloadHref);
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
              imageUrl,
              helpers.normalizeUrl(downloadHref)
            ],
            citation,
            description: getMetadataDescription(metadataFields),
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
        const stateKey = "__troveLibraryPageState";
        const root = document.head || document.documentElement;
        const normalizeUrl = ${normalizeUrl.toString()};
        const normalize = normalizeUrl;
        const getMatchKeys = ${getMatchKeys.toString()};
        const supportedPatterns = [${supportedLinkPatterns()
          .map((pattern) => pattern.toString())
          .join(",")}];
        const pageState = window[stateKey] || (window[stateKey] = {});
        pageState.savedUrls = Array.from(new Set(state.saved.flatMap((item) => item.urls.map((url) => normalize(url))).filter(Boolean)));
        pageState.ignoredUrls = Array.from(new Set(state.ignored.flatMap((item) => item.urls.map((url) => normalize(url))).filter(Boolean)));
        pageState.savedMatchKeys = Array.from(
          new Set(state.saved.flatMap((item) => item.urls.flatMap((url) => getMatchKeys(url))).filter(Boolean))
        );
        pageState.ignoredMatchKeys = Array.from(
          new Set(state.ignored.flatMap((item) => item.urls.flatMap((url) => getMatchKeys(url))).filter(Boolean))
        );
        const isSupportedLink = (href) => supportedPatterns.some((pattern) => pattern.test(href));
        const cleanText = (value) => String(value || "").replace(/\\s+/g, " ").trim();
        const getSavedUrls = () => new Set((window[stateKey]?.savedUrls || []).map((url) => normalize(url)).filter(Boolean));
        const getIgnoredUrls = () => new Set((window[stateKey]?.ignoredUrls || []).map((url) => normalize(url)).filter(Boolean));
        const getSavedMatchKeys = () => new Set((window[stateKey]?.savedMatchKeys || []).filter(Boolean));
        const getIgnoredMatchKeys = () => new Set((window[stateKey]?.ignoredMatchKeys || []).filter(Boolean));
        const getControlGroupsForUrl = (href) => {
          const normalizedHref = normalize(href);
          if (!normalizedHref) {
            return [];
          }
          const targetMatchKeys = getMatchKeys(normalizedHref);
          return Array.from(document.querySelectorAll("." + actionClass)).filter((group) => {
            const groupUrl = normalize(group.getAttribute("data-trove-library-url") || "");
            if (!groupUrl) {
              return false;
            }
            if (groupUrl === normalizedHref) {
              return true;
            }
            const groupMatchKeys = getMatchKeys(groupUrl);
            return groupMatchKeys.some((key) => targetMatchKeys.includes(key));
          });
        };
        const getControlGroupForAnchor = (anchor, href) => {
          const normalizedHref = normalize(href);
          const adjacent = anchor.nextElementSibling;
          if (
            adjacent &&
            adjacent.classList.contains(actionClass) &&
            normalize(adjacent.getAttribute("data-trove-library-url") || "") === normalizedHref
          ) {
            return adjacent;
          }
          return getControlGroupsForUrl(normalizedHref)[0] || null;
        };
        const getEntryContainer = (anchor, href) => {
          if (!anchor || !href) {
            return null;
          }
          let host = "";
          try {
            host = new URL(href).hostname.toLowerCase();
          } catch {
            host = location.hostname.toLowerCase();
          }
          if (host === "trove.nla.gov.au") {
            return anchor.closest(".result") || anchor.closest("[class*='result']");
          }
          if (host === "encore.slwa.wa.gov.au") {
            return anchor.closest(".search-result-item");
          }
          if (host === "catalogue.slwa.wa.gov.au" || host === "purl.slwa.wa.gov.au") {
            return anchor.closest(".briefcitDetail, .browseEntry, .bibRecordLink, tr, li");
          }
          if (host === "museum.wa.gov.au") {
            return anchor.closest(".wrap");
          }
          return null;
        };
        const resolveStatusForHref = (href) => {
          const normalizedHref = normalize(href);
          if (!normalizedHref) {
            return "";
          }
          const savedUrls = getSavedUrls();
          const ignoredUrls = getIgnoredUrls();
          if (savedUrls.has(normalizedHref)) {
            return "saved";
          }
          if (ignoredUrls.has(normalizedHref)) {
            return "ignored";
          }
          const matchKeys = getMatchKeys(normalizedHref);
          const savedMatchKeys = getSavedMatchKeys();
          const ignoredMatchKeys = getIgnoredMatchKeys();
          if (matchKeys.some((key) => savedMatchKeys.has(key))) {
            return "saved";
          }
          if (matchKeys.some((key) => ignoredMatchKeys.has(key))) {
            return "ignored";
          }
          return "";
        };
        const getEffectiveStatusForHref = (href, loadingAction = "") => {
          if (loadingAction === "collect") {
            return "saved";
          }
          if (loadingAction === "ignore") {
            return "ignored";
          }
          if (loadingAction === "uncollect" || loadingAction === "unignore") {
            return "";
          }
          return resolveStatusForHref(href);
        };
        const resolveEntryStatus = (anchor, href) => {
          const loadingEntry = window[stateKey]?.loadingByUrl?.[normalize(href)] || null;
          const directStatus = getEffectiveStatusForHref(href, loadingEntry?.action || "");
          if (directStatus) {
            return directStatus;
          }
          if (!isEntryLink(anchor, href)) {
            return "";
          }
          const entryContainer = getEntryContainer(anchor, href);
          if (!entryContainer) {
            return "";
          }
          const linkStatuses = Array.from(entryContainer.querySelectorAll("a[href]"))
            .filter((node) => isEntryLink(node, node.href))
            .map((node) => {
              const nodeHref = normalize(node.href);
              const nodeLoadingEntry = window[stateKey]?.loadingByUrl?.[nodeHref] || null;
              return getEffectiveStatusForHref(node.href, nodeLoadingEntry?.action || "");
            })
            .filter(Boolean);
          return linkStatuses.includes("saved") ? "saved" : linkStatuses.includes("ignored") ? "ignored" : "";
        };
        const isEntryLink = (anchor, href) => {
          if (!anchor || !href || !isSupportedLink(href)) {
            return false;
          }
          let host = "";
          let hrefPathWithSearch = "";
          try {
            const parsedHref = new URL(href);
            host = parsedHref.hostname.toLowerCase();
            hrefPathWithSearch = (parsedHref.pathname + parsedHref.search).toLowerCase();
          } catch {
            host = location.hostname.toLowerCase();
            hrefPathWithSearch = "";
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
              host === "purl.slwa.wa.gov.au" ||
              (host === "catalogue.slwa.wa.gov.au" && hrefPathWithSearch.includes("/record=b"))
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
        const getControlsEntryContainer = (controls) =>
          controls.closest(".result, .search-result-item, .briefcitDetail, .browseEntry, .bibRecordLink, article, li, tr, .record, .item, .wrap") ||
          controls.parentElement;
        const applyControlsState = (controls) => {
          if (!controls) {
            return;
          }
          const href = normalize(controls.getAttribute("data-trove-library-url") || "");
          if (!href) {
            return;
          }
          const loadingByUrl = window[stateKey]?.loadingByUrl || {};
          const loadingEntry = loadingByUrl[href] || null;
          const loadingAction = loadingEntry?.action || "";
          const loadingLabel = loadingEntry?.label || "";
          const effectiveStatus = getEffectiveStatusForHref(href, loadingAction);
          const entryContainer = getControlsEntryContainer(controls);
          const preview = controls.querySelector(".preview");
          const collect = controls.querySelector(".collect");
          const ignore = controls.querySelector(".ignore");

          entryContainer?.classList.remove("trove-library-entry-saved", "trove-library-entry-ignored");
          if (effectiveStatus === "saved" || effectiveStatus === "ignored") {
            entryContainer?.classList.add(effectiveStatus === "saved" ? "trove-library-entry-saved" : "trove-library-entry-ignored");
          }

          if (preview) {
            preview.classList.toggle("is-loading", loadingAction === "preview");
            preview.disabled = loadingAction === "preview";
            preview.textContent = loadingAction === "preview" ? loadingLabel || "Previewing…" : "Preview";
          }
          if (collect) {
            collect.classList.remove("saved", "ignored");
            collect.classList.toggle("is-loading", loadingAction === "collect" || loadingAction === "uncollect");
            collect.disabled = loadingAction === "collect" || loadingAction === "uncollect";
            if (effectiveStatus === "saved") {
              collect.classList.add("saved");
              collect.textContent =
                loadingAction === "collect"
                  ? loadingLabel || "Collecting…"
                  : loadingAction === "uncollect"
                    ? loadingLabel || "Removing…"
                    : "Collected";
              collect.disabled = loadingAction === "uncollect";
            } else {
              collect.textContent =
                loadingAction === "uncollect"
                  ? loadingLabel || "Removing…"
                  : loadingAction === "collect"
                    ? loadingLabel || "Collecting…"
                    : "Collect";
            }
          }
          if (ignore) {
            ignore.classList.remove("ignored");
            ignore.classList.toggle("is-loading", loadingAction === "ignore" || loadingAction === "unignore");
            ignore.disabled = loadingAction === "unignore";
            if (effectiveStatus === "saved") {
              ignore.textContent = "Ignore";
              ignore.hidden = true;
              ignore.disabled = true;
            } else if (effectiveStatus === "ignored") {
              ignore.classList.add("ignored");
              ignore.textContent = loadingAction === "unignore" ? loadingLabel || "Unignoring…" : "Unignore";
              ignore.hidden = false;
              ignore.disabled = loadingAction === "unignore";
            } else {
              ignore.textContent =
                loadingAction === "unignore"
                  ? loadingLabel || "Unignoring…"
                  : loadingAction === "ignore"
                    ? loadingLabel || "Ignoring…"
                    : "Ignore";
              ignore.hidden = false;
            }
          }
        };
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.textContent = \`
            a.trove-library-saved {
              color: #2f6b57 !important;
              font-weight: 700 !important;
            }
            a.trove-library-ignored {
              color: inherit !important;
            }
            .trove-library-entry-saved {
              background: transparent !important;
              box-shadow: none !important;
            }
            .trove-library-entry-ignored {
              opacity: 0.5 !important;
            }
            .trove-library-entry-ignored * {
              color: inherit !important;
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
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              white-space: nowrap;
            }
            .\${actionClass} .preview {
              min-inline-size: 88px;
            }
            .\${actionClass} .collect {
              min-inline-size: 104px;
            }
            .\${actionClass} .ignore {
              min-inline-size: 96px;
            }
            .\${actionClass} button.is-loading {
              opacity: 0.92;
              pointer-events: none;
            }
            .\${actionClass} button.is-loading::before {
              content: "";
              width: 10px;
              height: 10px;
              border-radius: 999px;
              border: 2px solid currentColor;
              border-right-color: transparent;
              animation: troveLibrarySpin 0.8s linear infinite;
            }
            .\${actionClass} .preview {
              background: rgba(45, 91, 74, 0.12);
              color: #244b3c;
            }
            .\${actionClass} .collect {
              background: rgba(157, 63, 38, 0.12);
              color: #7f311c;
            }
            .\${actionClass} .ignore {
              background: rgba(108, 98, 88, 0.12);
              color: #6c6258;
            }
            .\${actionClass} .collect.saved {
              background: #2f6b57;
              color: #f6f3ee;
              font-weight: 700;
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
            #\${badgeId}.loading {
              background: rgba(255, 255, 255, 0.96);
              color: #5b4c3d;
              display: inline-flex;
              align-items: center;
              gap: 8px;
            }
            #\${badgeId}.loading::before {
              content: "";
              width: 12px;
              height: 12px;
              border-radius: 999px;
              border: 2px solid currentColor;
              border-right-color: transparent;
              animation: troveLibrarySpin 0.8s linear infinite;
            }
            @keyframes troveLibrarySpin {
              to {
                transform: rotate(360deg);
              }
            }
          \`;
          root.appendChild(style);
        }
        const emit = (payload) => {
          console.log(actionPrefix + JSON.stringify(payload));
        };
        const beginInlineLoading = (url, action, button, label) => {
          if (!button) {
            return;
          }
          const normalizedUrl = normalize(url);
          const currentState = window[stateKey] || (window[stateKey] = {});
          const loadingByUrl = { ...(currentState.loadingByUrl || {}) };
          if (normalizedUrl) {
            loadingByUrl[normalizedUrl] = { action, label };
            currentState.loadingByUrl = loadingByUrl;
          }
          button.classList.add("is-loading");
          button.disabled = true;
          button.textContent = label;
          currentState.apply?.();
        };
        const ensureInlineActions = (anchor, href, forcedStatus = "") => {
          const normalizedHref = normalize(href);
          if (anchor.dataset.troveLibraryBound === "true") {
            const existing = getControlGroupForAnchor(anchor, href);
            if (existing && existing.classList.contains(actionClass)) {
              applyControlsState(existing);
            }
            return;
          }
          anchor.dataset.troveLibraryBound = "true";
          const controls = document.createElement("span");
          controls.className = actionClass;
          controls.setAttribute("data-trove-library-url", normalizedHref);
          const preview = document.createElement("button");
          preview.type = "button";
          preview.className = "preview";
          preview.setAttribute("data-trove-library-url", normalizedHref);
          preview.textContent = "Preview";
          preview.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            beginInlineLoading(href, "preview", preview, "Previewing…");
            emit({ action: "preview-link", url: href, label: anchor.textContent.trim() });
          });
          const collect = document.createElement("button");
          collect.type = "button";
          collect.className = "collect";
          collect.setAttribute("data-trove-library-url", normalizedHref);
          collect.textContent = "Collect";
          collect.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            beginInlineLoading(
              href,
              collect.classList.contains("saved") ? "uncollect" : "collect",
              collect,
              collect.classList.contains("saved") ? "Removing…" : "Collecting…"
            );
            emit({ action: "collect-link", url: href, label: anchor.textContent.trim() });
          });
          const ignore = document.createElement("button");
          ignore.type = "button";
          ignore.className = "ignore";
          ignore.setAttribute("data-trove-library-url", normalizedHref);
          ignore.textContent = "Ignore";
          ignore.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            beginInlineLoading(
              href,
              ignore.classList.contains("ignored") ? "unignore" : "ignore",
              ignore,
              ignore.classList.contains("ignored") ? "Unignoring…" : "Ignoring…"
            );
            emit({ action: "ignore-link", url: href, label: anchor.textContent.trim() });
          });
          controls.append(preview, collect, ignore);
          anchor.insertAdjacentElement("afterend", controls);
          applyControlsState(controls);
        };
        const apply = () => {
          document.querySelectorAll("a.trove-library-saved, a.trove-library-ignored").forEach((node) => {
            node.classList.remove("trove-library-saved", "trove-library-ignored");
          });
          document.querySelectorAll(".trove-library-entry-saved, .trove-library-entry-ignored").forEach((node) => {
            node.classList.remove("trove-library-entry-saved", "trove-library-entry-ignored");
          });
          document.querySelectorAll("a[href]").forEach((anchor) => {
            const href = normalize(anchor.href);
            if (!href) {
              return;
            }
            const entryLink = isEntryLink(anchor, href);
            const entryStatus = resolveEntryStatus(anchor, href);
            if (entryLink) {
              ensureInlineActions(anchor, href, entryStatus);
            }
            const entryContainer = entryLink ? getEntryContainer(anchor, href) : null;
            if (entryStatus === "saved") {
              anchor.classList.add("trove-library-saved");
              entryContainer?.classList.add("trove-library-entry-saved");
            } else if (entryStatus === "ignored") {
              anchor.classList.add("trove-library-ignored");
              entryContainer?.classList.add("trove-library-entry-ignored");
            }
          });
          document.querySelectorAll("." + actionClass).forEach((controls) => {
            applyControlsState(controls);
          });
          const currentUrl = normalize(location.href);
          let badge = document.getElementById(badgeId);
          if (badge) {
            badge.remove();
          }
          if (!currentUrl) {
            return;
          }
          const currentStatus = resolveStatusForHref(currentUrl);
          if (!currentStatus) {
            const loadingEntry = window[stateKey]?.loadingByUrl?.[currentUrl];
            const loadingAction = loadingEntry?.action;
            if (!loadingAction) {
              return;
            }
            badge = document.createElement("div");
            badge.id = badgeId;
            badge.className = "loading";
            badge.textContent =
              loadingEntry?.label ||
              (loadingAction === "preview"
                ? "Building preview…"
                : loadingAction === "collect"
                  ? "Collecting…"
                  : loadingAction === "ignore"
                    ? "Ignoring…"
                    : loadingAction === "unignore"
                      ? "Unignoring…"
                      : loadingAction === "uncollect"
                        ? "Removing from library…"
                        : "Updating…");
            document.body.appendChild(badge);
            return;
          }
          badge = document.createElement("div");
          badge.id = badgeId;
          if (currentStatus === "saved") {
            badge.className = "saved";
            badge.textContent = "Saved in library";
          } else {
            badge.className = "ignored";
            badge.textContent = "Ignored in library";
          }
          document.body.appendChild(badge);
        };
        pageState.apply = apply;
        apply();
        if (!window.__troveLibraryObserver) {
          window.__troveLibraryObserver = new MutationObserver(() => {
            try {
              window[stateKey]?.apply?.();
            } catch {
              // Ignore pages that mutate while site scripts are still settling.
            }
          });
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
        const stateKey = "__troveLibraryPageState";
        const normalizeUrl = ${normalizeUrl.toString()};
        const getMatchKeys = ${getMatchKeys.toString()};
        if (!urls.size) {
          return;
        }

        const pageState = window[stateKey] || (window[stateKey] = {});
        const scheduleApplyRetry = () => {
          if (typeof pageState.apply !== "function") {
            return;
          }
          [0, 80, 240].forEach((delay) => {
            window.setTimeout(() => {
              try {
                pageState.apply();
              } catch {
                // Keep trying while the page is still mutating.
              }
            }, delay);
          });
        };
        const savedUrls = new Set((pageState.savedUrls || []).map((value) => (${normalizeUrl.toString()})(value)).filter(Boolean));
        const ignoredUrls = new Set((pageState.ignoredUrls || []).map((value) => (${normalizeUrl.toString()})(value)).filter(Boolean));
        const savedMatchKeys = new Set((pageState.savedMatchKeys || []).filter(Boolean));
        const ignoredMatchKeys = new Set((pageState.ignoredMatchKeys || []).filter(Boolean));
        const clearedMatchKeys = new Set();
        urls.forEach((url) => {
          const matchKeys = getMatchKeys(url);
          savedUrls.delete(url);
          ignoredUrls.delete(url);
          matchKeys.forEach((key) => {
            clearedMatchKeys.add(key);
            savedMatchKeys.delete(key);
            ignoredMatchKeys.delete(key);
          });
          if (status === "saved") {
            savedUrls.add(url);
            matchKeys.forEach((key) => savedMatchKeys.add(key));
          } else if (status === "ignored") {
            ignoredUrls.add(url);
            matchKeys.forEach((key) => ignoredMatchKeys.add(key));
          }
        });
        const loadingByUrl = { ...(pageState.loadingByUrl || {}) };
        Object.keys(loadingByUrl).forEach((entryUrl) => {
          if (urls.has(entryUrl)) {
            delete loadingByUrl[entryUrl];
            return;
          }
          const entryMatchKeys = getMatchKeys(entryUrl);
          if (entryMatchKeys.some((key) => clearedMatchKeys.has(key))) {
            delete loadingByUrl[entryUrl];
          }
        });
        pageState.savedUrls = Array.from(savedUrls);
        pageState.ignoredUrls = Array.from(ignoredUrls);
        pageState.savedMatchKeys = Array.from(savedMatchKeys);
        pageState.ignoredMatchKeys = Array.from(ignoredMatchKeys);
        pageState.loadingByUrl = loadingByUrl;
        if (typeof pageState.apply === "function") {
          try {
            pageState.apply();
          } catch {
            // Fall through to the direct DOM patch path if the page mutates mid-apply.
          }
        }

        if (typeof pageState.apply === "function") {
          try {
            pageState.apply();
          } catch {
            // Let the scheduled retry handle transient DOM churn.
          }
        }

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
        scheduleApplyRetry();
      })();
    `;
  }

  function buildImmediateLoadingScript(payload) {
    return `
      (() => {
        const active = ${JSON.stringify(Boolean(payload.active))};
        const action = ${JSON.stringify(payload.action || "")};
        const label = ${JSON.stringify(payload.label || "")};
        const urls = new Set((${JSON.stringify(payload.urls || [])} || []).map((value) => (${normalizeUrl.toString()})(value)).filter(Boolean));
        const stateKey = "__troveLibraryPageState";
        const actionClass = "trove-library-inline-actions";
        const normalizeUrl = ${normalizeUrl.toString()};
        const getMatchKeys = ${getMatchKeys.toString()};
        if (!urls.size) {
          return;
        }
        const pageState = window[stateKey] || (window[stateKey] = {});
        const scheduleApplyRetry = () => {
          if (typeof pageState.apply !== "function") {
            return;
          }
          [0, 80, 240].forEach((delay) => {
            window.setTimeout(() => {
              try {
                pageState.apply();
              } catch {
                // Keep trying while the page is still mutating.
              }
            }, delay);
          });
        };
        const loadingByUrl = { ...(pageState.loadingByUrl || {}) };
        const clearedMatchKeys = new Set();
        urls.forEach((url) => {
          getMatchKeys(url).forEach((key) => clearedMatchKeys.add(key));
        });
        urls.forEach((url) => {
          if (active) {
            loadingByUrl[url] = { action, label };
          } else {
            delete loadingByUrl[url];
          }
        });
        if (!active) {
          Object.keys(loadingByUrl).forEach((entryUrl) => {
            const entryMatchKeys = getMatchKeys(entryUrl);
            if (entryMatchKeys.some((key) => clearedMatchKeys.has(key))) {
              delete loadingByUrl[entryUrl];
            }
          });
        }
        pageState.loadingByUrl = loadingByUrl;
        if (typeof pageState.apply === "function") {
          try {
            pageState.apply();
          } catch {
            // Fall through to the direct DOM patch path when the page mutates mid-apply.
          }
        }
        if (typeof pageState.apply === "function") {
          try {
            pageState.apply();
          } catch {
            // Let the scheduled retry handle transient DOM churn.
          }
        }
        scheduleApplyRetry();
      })();
    `;
  }

  function buildSearchExportScript() {
    return `
      (() => {
        const normalize = ${normalizeUrl.toString()};
        const supportedPatterns = [${supportedLinkPatterns()
          .map((pattern) => pattern.toString())
          .join(",")}];
        const isSupportedLink = (href) => supportedPatterns.some((pattern) => pattern.test(href));
        const cleanText = (value) => String(value || "").replace(/\\s+/g, " ").trim();
        const isEntryLink = (anchor, href) => {
          if (!anchor || !href || !isSupportedLink(href)) {
            return false;
          }
          let host = "";
          let hrefPathWithSearch = "";
          try {
            const parsedHref = new URL(href);
            host = parsedHref.hostname.toLowerCase();
            hrefPathWithSearch = (parsedHref.pathname + parsedHref.search).toLowerCase();
          } catch {
            host = location.hostname.toLowerCase();
            hrefPathWithSearch = "";
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
              host === "purl.slwa.wa.gov.au" ||
              (host === "catalogue.slwa.wa.gov.au" && hrefPathWithSearch.includes("/record=b"))
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

        const seen = new Set();
        const rows = [];
        document.querySelectorAll("a[href]").forEach((anchor) => {
          const href = normalize(anchor.href);
          if (!href || seen.has(href) || !isEntryLink(anchor, href)) {
            return;
          }
          seen.add(href);
          rows.push({
            position: rows.length + 1,
            title: cleanText(anchor.textContent),
            url: href
          });
        });

        return {
          pageTitle: cleanText(document.title || document.querySelector("h1")?.textContent || "Search"),
          pageUrl: normalize(location.href),
          rows
        };
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
    const itemMatchKeys = [...new Set(aliases.flatMap((alias) => getMatchKeys(alias)))];
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
    if (
      (project.saved || []).some((entry) =>
        uniqueValues([entry.url, ...(entry.aliases || [])])
          .flatMap((alias) => getMatchKeys(alias))
          .some((matchKey) => itemMatchKeys.includes(matchKey))
      )
    ) {
      return "saved";
    }
    if (
      (project.ignored || []).some((entry) =>
        uniqueValues([entry.url, ...(entry.aliases || [])])
          .flatMap((alias) => getMatchKeys(alias))
          .some((matchKey) => itemMatchKeys.includes(matchKey))
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
    buildImmediateLoadingScript,
    buildImmediateStatusScript,
    buildSearchExportScript,
    projectStatePayload,
    itemStatus,
    makeItemKey
  };
})();
