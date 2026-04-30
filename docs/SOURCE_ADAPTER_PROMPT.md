# Source Adapter Prompt

Use this repository to reverse engineer and implement a new collection source adapter.

Seed URLs:

- Add search, detail, and media-viewer examples here.

Workflow:

1. Run `npm run probe:source -- "<url1>" "<url2>" ...` with a small, representative set of URLs.
2. Inspect the generated screenshots, DOM summaries, and metadata from the probe output.
3. Identify stable selectors for search results, detail records, titles, dates, creators, descriptions, images, and canonical URLs.
4. Add fixture coverage for search, detail, and media variants.
5. Implement the adapter in `src/source-plugins.js`.
6. Add inline-result heuristics only for actual record/result links.
7. Verify with `npm run test:fixtures` plus the relevant Electron harness.

Adapter requirements:

- Respect source rate limits. Keep probes low-volume and sequential.
- Do not try to bypass blocks, bot checks, authentication walls, or paywalls.
- Degrade cleanly when a page is unsupported.
- Save text records as markdown.
- Save image records as image files plus markdown sidecars.
- Preserve alias recognition so saved, ignored, and uncollected states match equivalent URLs.
- Keep browser UI feedback instant and non-blocking.
- Avoid injecting controls into navigation, filter, pagination, header, footer, or decorative links.

If the site blocks automated browsing, stop and record the smallest missing input needed to finish the adapter.
