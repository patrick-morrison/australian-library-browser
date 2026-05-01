# AGWA Integration Handoff

Branch: `agwa`

Status: partial, with the app-side groundwork and fixture/live harnesses in place. The remaining work is to make the AGWA `/explore` search path reliably decorate dynamic result cards, then prove Preview and Collect from the live page.

## What Changed

- Added AGWA source support across the source adapter/plugin path.
- Added AGWA fixtures for search and record pages.
- Added live AGWA harnesses:
  - `scripts/test-live-agwa-search-load.js`
  - `scripts/test-live-agwa-explore-search.js`
- Added zero-friction browser recovery work:
  - search/list pages settle out of fake `Loading` state
  - webview load watchdogs bound stuck loads
  - Back, Forward, and Reload stay available when a page load or preview path misbehaves
  - bounded preview/fetch/markdown timeouts
- Added project folder terminal actions and right-click project actions.
- Added the source integration harness pattern to `docs/HARNESS.md` and tightened `docs/SOURCE_ADAPTER_PROMPT.md`.

## Current Evidence

Direct AGWA search URL works:

```bash
node scripts/test-live-agwa-search-load.js
```

Observed earlier:

- `https://collection.artgallery.wa.gov.au/objects?query=ships` renders.
- The app shell settles into the search/list preview state.
- Result cards are visible.

The real user flow is still unfinished:

```bash
node scripts/test-live-agwa-explore-search.js
```

The harness follows this path:

1. Open `https://collection.artgallery.wa.gov.au/explore`.
2. Use AGWA's visible search UI to submit `ships`.
3. Wait for `/objects?query=ships`.
4. Scroll results.
5. Click injected Preview.
6. Click injected Collect.

Current failure: it reaches `/objects?query=ships`, but Preview does not land before the assertion timeout. Screenshots are written under `tmp/e2e-live/`, especially:

- `agwa-explore-search-ready.png`
- `agwa-explore-actions-visible.png`
- `agwa-explore-preview-click-missed.png` if the latest diagnostic path runs

## Known Issues

1. AGWA `/explore` search is not equivalent to directly opening `/objects?query=ships`.

   The direct URL can behave cleanly while the `/explore` form flow leaves the guest page in a partially responsive state.

2. `webview.executeJavaScript` can time out after AGWA's `/explore` form navigation.

   Treat executeJS as diagnostic/setup only. Do not rely on unbounded executeJS for the success path.

3. Result cards arrive dynamically.

   Delayed decoration passes were added for known search/list pages, but the live harness has not yet proven the controls are consistently present and clickable on the `/explore`-submitted results page.

4. Preview/Collect click proof is not complete.

   The harness currently uses real input and screenshot evidence, but the click target still needs to be made robust. Prefer discovering visible button bounds when the guest page is responsive; fall back to screenshot-driven/coordinate input only with strong diagnostics.

5. GPU warnings are probably not the root issue.

   Software rendering switches were added to reduce Electron/Skia noise, but the important failure is page/app state around AGWA's webview lifecycle and late dynamic result rendering.

## Path To Complete

1. Re-run:

   ```bash
   node --check src/renderer.js
   node --check src/source-plugins.js
   node --check scripts/test-live-agwa-explore-search.js
   node scripts/test-live-agwa-explore-search.js
   ```

2. Inspect `tmp/e2e-live/agwa-explore-actions-visible.png`.

   Confirm whether the `P`, `+`, and ignore controls are visible on the first AGWA result card.

3. If controls are missing:

   - instrument `applyProjectDecorations()` around AGWA pages
   - check whether AGWA result links match `isEntryLink`
   - check whether links are being added after the final delayed decoration pass
   - consider a source-page `MutationObserver` decoration nudge for known dynamic search/list pages

4. If controls are present but Preview misses:

   - replace fixed coordinate clicks in `scripts/test-live-agwa-explore-search.js` with a bounded button-bound lookup when executeJS is responsive
   - keep the fallback real-input coordinate click only as a diagnostic fallback
   - assert the selected record URL in `#capture-markdown`, not just any AGWA record

5. If Preview lands but Collect fails:

   - assert collection feedback in `#message`
   - verify the item file appears in the active project
   - capture a final screenshot after collect

6. Finish with the full regression set:

   ```bash
   node --check main.js
   node --check preload.js
   node --check src/renderer.js
   node --check src/source-plugins.js
   node --check scripts/test-live-agwa-explore-search.js
   npm run test:fixtures
   npm run test:store
   npm run test:e2e:smoke
   npm run test:e2e:layout
   node scripts/test-live-agwa-explore-search.js
   ```

## Harness Pattern To Keep

For future integrations, do not stop at fixtures or direct detail URLs. The smooth path is:

1. fixture extraction
2. fixture decoration
3. live landing/search flow
4. live Preview click
5. live Collect click
6. stuck-loading and shell-button recovery checks
7. screenshots and JSON diagnostics for any failure

This is documented more generally in `docs/HARNESS.md`.
