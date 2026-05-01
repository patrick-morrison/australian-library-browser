# Harness Notes

This app should be easy for an agent to inspect, drive, and verify without relying on hidden state or manual visual judgement.

## Local State Hooks

- `window.trovePerf.snapshot()` returns the current app mode, active tab, capture state, queue state, cache sizes, and recent perf events.
- `window.trovePerf.events()` returns recent queue, collect, and progress events.
- `window.trovePerf.queue()` returns the active and waiting action queue.
- `window.trovePerf.health()` returns `{ ok, issues, snapshot }` for mechanical checks during UI tests.
- `window.trovePerf.layout()` returns viewport overflow and clipped text issues for layout checks.

The Debug drawer also has **Perf Snapshot**, which prints the same state into the debug output panel.

## UX Invariants

- Collect and ignore actions must show feedback within one animation turn: a busy label, disabled conflicting action, visible queue tray, or final state if the action finishes immediately.
- Collect/ignore state is optimistic: the page and sidebar should reflect the latest user intent immediately while queued work catches up.
- Reversal flows such as collect -> uncollect -> collect must not leave inline controls or sidebar buttons stuck on transitional labels such as `Removing`.
- Long work must stay visible through `aria-busy`, button copy, queue tray metadata, or save-progress text.
- Preview content must not be replaced by an unrelated inline collect or ignore action.
- Unsupported pages must settle into a quiet empty preview state with no stale queue tray or loading spinner.
- Tests should validate state through DOM and `window.trovePerf.health()`, not only screenshots.
- Import Existing Research Notes should extract supported URLs locally from pasted notes or dropped files, show a selectable triage list, and open only the selected links.

## Source Integration Harness Pattern

Every new source should be proven in layers so the adapter can be one-shot safely, then debugged without guessing when a live site behaves differently from its fixture.

1. Add search/list and detail fixtures first. The fixture test should cover metadata extraction, canonical URLs, inline action decoration, and duplicate-action prevention.
2. Add a live search-path harness for the real user path, not only a direct result URL. Start from the source landing or browse URL, use the visible site search/filter UI, wait for the source's real result URL, and capture before/search/action screenshots into `tmp/e2e-live`.
3. Prove injected controls with real app input. The harness must click Preview and Collect from the rendered source page and assert that preview markdown lands on the selected record and collection feedback appears.
4. Keep renderer probes bounded. `webview.executeJavaScript` is useful for diagnostics and setup, but any probe must have a timeout and must not be the only proof that a broken page is usable.
5. Assert the app shell stays recoverable. A source page error or stuck webview load must not leave `#page-status` stuck on `Loading`, and Back, Forward, Reload, Preview, and Collect controls must remain clickable.
6. Save diagnostics that explain the failure. Log the final app URL/status, selected record URL, action count, screenshots, and any timed-out probe so the next run starts at the real fault.

AGWA is the reference case for this pattern: the direct `/objects?query=...` URL can render cleanly while the `/explore` search flow leaves the guest page partially responsive. The harness therefore has to exercise `/explore`, submit the visible search form, then press Preview and Collect on the result controls.

## Relevant Commands

```bash
npm run test:e2e:smoke
npm run test:e2e:omni-intake
npm run test:e2e:workflow-harness
npm run test:e2e:supported-sites
npm run test:e2e:bulk-search
node scripts/run-with-retry.js scripts/test-live-inline-sidebar-actions.js 2
node scripts/test-live-agwa-explore-search.js
```

The inline/sidebar action test asserts immediate busy/final feedback for sidebar collect and ignore.
The workflow harness drives a longer real path through search, saved searches, preview, collect, ignore, screenshots, and perf/layout snapshots.
The supported-sites harness checks Trove, SLWA, and WA Museum search/detail pages plus collection and reversal behavior.
The bulk-search harness uses the Wellington Dam advanced Trove search, collects 20 results across pages, then uncollects the same 20 and checks for lost records or stuck transitional labels.
