#!/usr/bin/env node

const {
  launchApp,
  createProject,
  cleanupProject
} = require("./live-e2e-helpers");

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADUlEQVR42mP8z8BQDwAFgwJ/lm2w3QAAAABJRU5ErkJggg==";

async function run() {
  const projectName = `Library Views ${Date.now()}`;
  const app = await launchApp();
  let project;

  try {
    const page = await app.firstWindow();
    await page.waitForSelector("#mode-manage");
    project = await createProject(page, projectName);

    await page.evaluate(
      async ({ projectDir, imageUrl }) => {
        await window.troveApi.saveItem(projectDir, {
          source: "trove",
          sourceLabel: "Trove",
          type: "newspaper",
          id: "987654321",
          title: "Sample Calendar Article",
          url: "https://trove.nla.gov.au/newspaper/article/987654321",
          aliases: ["https://trove.nla.gov.au/newspaper/article/987654321"],
          citation: "The Test Times (Perth, WA), Friday 9 August 1935, page 4",
          sourceTitle: "The Test Times",
          fullText: "A distinctive full text phrase for the library filter."
        });
        await window.troveApi.saveItem(projectDir, {
          source: "slwa",
          sourceLabel: "SLWA",
          type: "image",
          id: "image-1",
          title: "Sample Gallery Image",
          url: "https://purl.slwa.wa.gov.au/slwa_test_image",
          aliases: ["https://purl.slwa.wa.gov.au/slwa_test_image"],
          citation: "Synthetic image citation",
          description: "Gallery detail description",
          imageUrl,
          imageUrls: [imageUrl],
          metadataFields: [{ label: "Date", value: "1930" }]
        });
        await refreshProjects(projectDir, { skipCapture: true });
        getActiveProject().saved.push({
          source: "slwa",
          sourceLabel: "SLWA",
          type: "image",
          id: "image-without-preview",
          title: "Image Record Without Preview",
          url: "https://purl.slwa.wa.gov.au/slwa_no_preview",
          aliases: ["https://purl.slwa.wa.gov.au/slwa_no_preview"],
          citation: "Synthetic image citation without image payload",
          description: "This legacy image-type record should not appear in Gallery without an image source.",
          savedAt: new Date().toISOString()
        });
      },
      { projectDir: project.projectDir, imageUrl: tinyPng }
    );

    await page.evaluate(async ({ imageUrl }) => {
      setMode("collect");
      await showCaptureItem({
        source: "test",
        sourceLabel: "Test",
        supported: true,
        type: "image",
        id: "preview-image-set",
        key: "test:image:preview-image-set",
        title: "Preview Image Set",
        url: "https://example.test/preview-image-set",
        imageUrl,
        attachments: [
          {
            id: "preview-1",
            title: "First preview image",
            viewerUrl: "https://example.test/preview-image-set/1",
            imageUrl,
            thumbnailUrl: imageUrl
          },
          {
            id: "preview-2",
            title: "Second preview image",
            viewerUrl: "https://example.test/preview-image-set/2",
            imageUrl,
            thumbnailUrl: imageUrl
          },
          {
            id: "preview-3",
            title: "Third preview image",
            viewerUrl: "https://example.test/preview-image-set/3",
            imageUrl,
            thumbnailUrl: imageUrl
          }
        ]
      }, "page");
    }, { imageUrl: tinyPng });
    await page.waitForSelector(".capture-thumbnail.is-selected");
    let selectedThumbnail = await page.evaluate(() =>
      Number(document.querySelector(".capture-thumbnail.is-selected")?.getAttribute("data-preview-image-index"))
    );
    if (selectedThumbnail !== 0) {
      throw new Error(`Expected first preview image to be selected, got ${selectedThumbnail}.`);
    }
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector(".capture-thumbnail.is-selected")?.getAttribute("data-preview-image-index") === "1");
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => document.querySelector(".capture-thumbnail.is-selected")?.getAttribute("data-preview-image-index") === "0");
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => document.querySelector(".capture-thumbnail.is-selected")?.getAttribute("data-preview-image-index") === "2");
    selectedThumbnail = await page.evaluate(() =>
      Number(document.querySelector(".capture-thumbnail.is-selected")?.getAttribute("data-preview-image-index"))
    );
    if (selectedThumbnail !== 2) {
      throw new Error(`Expected ArrowLeft to wrap to the last preview image, got ${selectedThumbnail}.`);
    }

    await page.click("#mode-manage");
    await page.click("#layout-gallery");
    await page.waitForSelector(".manage-gallery-tile");
    const gallery = await page.evaluate(() => ({
      tiles: document.querySelectorAll(".manage-gallery-tile").length,
      hasArticle: (document.querySelector("#manage-list")?.textContent || "").includes("Sample Calendar Article"),
      hasImage: (document.querySelector("#manage-list")?.textContent || "").includes("Sample Gallery Image"),
      hasNoPreviewImage: (document.querySelector("#manage-list")?.textContent || "").includes("Image Record Without Preview")
    }));
    if (gallery.tiles !== 1 || gallery.hasArticle || !gallery.hasImage || gallery.hasNoPreviewImage) {
      throw new Error(`Gallery view did not show only the image item: ${JSON.stringify(gallery)}`);
    }
    await page.click(".manage-gallery-tile");
    await page.waitForSelector(".manage-detail-page");
    const galleryModalState = await page.evaluate(() => ({
      modalOpen: Boolean(document.querySelector(".manage-detail-modal")),
      galleryStillMounted: document.querySelectorAll(".manage-gallery-tile").length
    }));
    if (!galleryModalState.modalOpen || galleryModalState.galleryStillMounted !== 1) {
      throw new Error(`Gallery detail did not open as a modal over the gallery: ${JSON.stringify(galleryModalState)}`);
    }
    await page.mouse.click(8, 8);
    await page.waitForSelector(".manage-detail-modal", { state: "detached" });
    const galleryAfterBackdropClose = await page.evaluate(() => ({
      tiles: document.querySelectorAll(".manage-gallery-tile").length,
      modalOpen: Boolean(document.querySelector(".manage-detail-modal"))
    }));
    if (galleryAfterBackdropClose.tiles !== 1 || galleryAfterBackdropClose.modalOpen) {
      throw new Error(`Backdrop click leaked through or reopened a gallery item: ${JSON.stringify(galleryAfterBackdropClose)}`);
    }
    await page.click(".manage-gallery-tile");
    await page.waitForSelector(".manage-detail-page");
    const imageDetailText = await page.textContent(".manage-detail-page");
    if (!imageDetailText.includes("Gallery detail description") || !imageDetailText.includes("Sample Gallery Image")) {
      throw new Error("Gallery detail page did not include image metadata/content.");
    }
    await page.click(".manage-detail-image-button");
    await page.waitForSelector("#image-lightbox:not([hidden])");
    const lightboxStack = await page.evaluate(() => {
      const lightbox = document.querySelector("#image-lightbox");
      const detailModal = document.querySelector(".manage-detail-modal");
      return {
        lightboxZ: Number(getComputedStyle(lightbox).zIndex),
        detailZ: Number(getComputedStyle(detailModal).zIndex),
        topClass: document.elementFromPoint(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2))?.closest("#image-lightbox, .manage-detail-modal")?.id || ""
      };
    });
    if (lightboxStack.lightboxZ <= lightboxStack.detailZ || lightboxStack.topClass !== "image-lightbox") {
      throw new Error(`Image lightbox was not stacked above the detail modal: ${JSON.stringify(lightboxStack)}`);
    }
    await page.keyboard.press("Escape");
    await page.waitForSelector("#image-lightbox", { state: "hidden" });
    if (!(await page.locator(".manage-detail-modal").count())) {
      throw new Error("Closing the image lightbox also closed the underlying detail modal.");
    }

    await page.mouse.click(8, 8);
    await page.waitForSelector(".manage-detail-modal", { state: "detached" });
    await page.click("#layout-newspaper-calendar");
    await page.waitForSelector(".manage-calendar-entry");
    const facetOptions = await page.evaluate(() => ({
      newspapers: Array.from(document.querySelectorAll("#manage-newspaper-filter option")).map((option) => option.textContent || ""),
      decades: Array.from(document.querySelectorAll("#manage-decade-filter option")).map((option) => option.textContent || "")
    }));
    if (!facetOptions.newspapers.includes("The Test Times") || !facetOptions.decades.includes("1930s")) {
      throw new Error(`Expected newspaper and decade facet options, got ${JSON.stringify(facetOptions)}`);
    }
    await page.selectOption("#manage-newspaper-filter", "The Test Times");
    await page.selectOption("#manage-decade-filter", "1930s");
    await page.waitForSelector(".manage-calendar-entry");
    const calendar = await page.evaluate(() => ({
      entries: document.querySelectorAll(".manage-calendar-entry").length,
      hasArticle: (document.querySelector("#manage-list")?.textContent || "").includes("Sample Calendar Article"),
      hasImage: (document.querySelector("#manage-list")?.textContent || "").includes("Sample Gallery Image"),
      month: document.querySelector(".manage-calendar-month")?.textContent || "",
      overview: document.querySelector(".manage-calendar-overview")?.textContent || "",
      source: document.querySelector(".manage-calendar-newspaper")?.textContent || "",
      date: document.querySelector(".manage-calendar-date")?.textContent || "",
      columnCount: document.querySelector(".manage-calendar-entry") ? getComputedStyle(document.querySelector(".manage-calendar-entry")).gridTemplateColumns.split(" ").length : 0,
      rowHeight: Math.round(document.querySelector(".manage-calendar-entry")?.getBoundingClientRect().height || 0)
    }));
    if (calendar.entries !== 1 || !calendar.hasArticle || calendar.hasImage || !calendar.month.includes("August 1935")) {
      throw new Error(`Calendar view did not show only the dated Trove article: ${JSON.stringify(calendar)}`);
    }
    if (!calendar.overview.includes("1935-1935") || !calendar.source.includes("The Test Times") || !calendar.date.includes("9 Aug 1935") || calendar.columnCount !== 3 || calendar.rowHeight > 44) {
      throw new Error(`Calendar quick-browse metadata was incomplete: ${JSON.stringify(calendar)}`);
    }
    await page.click(".manage-calendar-entry", { button: "right" });
    await page.waitForSelector("#library-item-context-menu:not([hidden])");
    const contextMenu = await page.evaluate(() => ({
      text: document.querySelector("#library-item-context-menu")?.textContent || "",
      nativeDisabled: document.querySelector("#library-item-context-native")?.disabled || false
    }));
    if (!contextMenu.text.includes("Uncollect") || !contextMenu.text.includes("Open Detail") || contextMenu.nativeDisabled) {
      throw new Error(`Library item context menu missing expected actions: ${JSON.stringify(contextMenu)}`);
    }
    await page.click("#library-item-context-detail");
    await page.waitForSelector(".manage-detail-page");
    const calendarModalState = await page.evaluate(() => ({
      modalOpen: Boolean(document.querySelector(".manage-detail-modal")),
      calendarStillMounted: document.querySelectorAll(".manage-calendar-entry").length
    }));
    if (!calendarModalState.modalOpen || calendarModalState.calendarStillMounted !== 1) {
      throw new Error(`Calendar detail did not open as a modal over the calendar: ${JSON.stringify(calendarModalState)}`);
    }
    const articleDetailText = await page.textContent(".manage-detail-page");
    if (!articleDetailText.includes("Sample Calendar Article") || !articleDetailText.includes("distinctive full text phrase")) {
      throw new Error("Calendar detail page did not include article metadata/content.");
    }
    await page.keyboard.press("Escape");
    await page.waitForSelector(".manage-detail-modal", { state: "detached" });
    await page.fill("#manage-search", "distinctive full text phrase");
    await page.waitForSelector(".manage-calendar-entry");
    const searchText = await page.textContent("#manage-list");
    if (!searchText.includes("Sample Calendar Article")) {
      throw new Error("Full text filter did not find the saved markdown content.");
    }
    await page.fill("#manage-search", "");
    await page.click(".manage-calendar-entry");
    await page.waitForSelector(".manage-detail-page");
    const primaryAction = await page.textContent(".manage-primary-action");
    if (!/Uncollect/i.test(primaryAction || "")) {
      throw new Error(`Expected detail page to expose Uncollect, got ${primaryAction}.`);
    }
    const primaryActionStyle = await page.evaluate(() => {
      const button = document.querySelector(".manage-primary-action");
      if (!(button instanceof HTMLElement)) {
        return null;
      }
      const styles = getComputedStyle(button);
      return {
        classes: Array.from(button.classList),
        height: Math.round(button.getBoundingClientRect().height),
        background: styles.backgroundColor,
        color: styles.color
      };
    });
    if (!primaryActionStyle?.classes.includes("is-warning-action") || primaryActionStyle.height > 44) {
      throw new Error(`Uncollect action was not compact warning-styled: ${JSON.stringify(primaryActionStyle)}`);
    }
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click(".manage-primary-action");
    await page.waitForFunction(() => (document.querySelector("#manage-list")?.textContent || "").includes("No Trove newspaper articles"));
    await page.click("#filter-uncollected");
    await page.waitForFunction(() => (document.querySelector("#manage-summary")?.textContent || "").includes("1 Trove article"));
    const uncollectedCalendarText = await page.textContent("#manage-list");
    if (!uncollectedCalendarText.includes("Sample Calendar Article")) {
      throw new Error("Uncollected article did not remain browsable in the calendar filter.");
    }

    console.log("Library gallery, newspaper calendar, detail, and full-text filter checks passed.");
  } finally {
    await app.close().catch(() => {});
    if (project) {
      await cleanupProject(project.projectDir);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
