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

## Relevant Commands

```bash
npm run test:e2e:smoke
npm run test:e2e:omni-intake
npm run test:e2e:workflow-harness
npm run test:e2e:supported-sites
npm run test:e2e:bulk-search
node scripts/run-with-retry.js scripts/test-live-inline-sidebar-actions.js 2
```

The inline/sidebar action test asserts immediate busy/final feedback for sidebar collect and ignore.
The workflow harness drives a longer real path through search, saved searches, preview, collect, ignore, screenshots, and perf/layout snapshots.
The supported-sites harness checks Trove, SLWA, and WA Museum search/detail pages plus collection and reversal behavior.
The bulk-search harness uses the Wellington Dam advanced Trove search, collects 20 results across pages, then uncollects the same 20 and checks for lost records or stuck transitional labels.
