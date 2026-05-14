# Agent Notes

Start with the documented harness before reverse engineering source pages by hand.

- Read `docs/HARNESS.md` for app state hooks, UX invariants, and live harness expectations.
- For any source adapter work, follow `docs/SOURCE_ADAPTER_PROMPT.md`.
- Use `npm run probe:source -- "<url>"` as the first inspection step for a new source or unfamiliar page type.
- Add or update fixtures before changing adapter behavior, then run `npm run test:fixtures`.
- For user-visible collection flows, verify with the relevant live Electron harness, not only direct URL extraction.

Common verification commands:

```bash
npm run test:fixtures
npm run test:e2e:smoke
npm run test:e2e:supported-sites
```
