# The Australian Library Browser

The Australian Library Browser is a focused Electron app for triaging online collection sites into self-describing `.trovelibrary` folders.

Local-first capture for Australian collections.

It is built for research capture, not general browsing:

- browse live source sites in a normal Chromium surface
- preview extracted markdown or images in a sidebar
- collect or ignore records quickly
- save text records as markdown
- save image records as image files plus same-name markdown sidecars
- keep a flat `items.csv` ledger and a canonical `project.yaml`

## Supported Sources

- `Trove`
- `SLWA` (State Library of Western Australia)
- `WA Museum` Maritime Archaeology Databases

## What A Library Contains

Each library is a plain folder with a `.trovelibrary` manifest file inside it.

- `project.yaml`: canonical project state, saved items, ignored items, aliases
- `items.csv`: flat spreadsheet-friendly inventory
- `README.md`: project-local notes for humans and coding agents
- `newspapers/`: markdown captures for text records
- `images/`: downloaded images and markdown sidecars
- `debug/`: optional reverse-engineering dumps

The intent is preservation: if the source site changes or disappears, the saved package should still make sense on disk.

## App Modes

- `Collect`: browse normally, preview the current record, collect or ignore it
- `Library`: switch libraries, reopen saved searches, and review the collection inventory
- `Settings`: inspect supported sources and generate a prompt / probe command for a new source integration

Most clicks stay inside the app. Native file opens are explicit secondary actions.

## Architecture

- `main.js`: Electron process, window/session wiring, IPC
- `preload.js`: safe renderer bridge
- `src/renderer.js`: UI state, tab management, sidebar preview flow
- `src/source-plugins.js`: in-page extraction and decoration logic
- `lib/source-adapters.js`: background HTML extraction
- `lib/project-store.js`: `.trovelibrary` persistence and markdown generation
- `mcp/server.js`: MCP server for library management

The split is deliberate:

- the browser stays browser-like
- extraction is adapter-driven
- persistence is plain files
- MCP operates on the saved library, not hidden browser internals

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm start
```

Useful commands:

```bash
npm run test:fixtures
npm run test:e2e
npm run test:mcp
npm run open:tabs -- "https://trove.nla.gov.au/newspaper/article/32575438" "https://trove.nla.gov.au/newspaper/article/85178391"
npm run probe:source -- "https://example-library/search?q=harvey"
```

You can also pipe pasted URLs into the tab opener:

```bash
pbpaste | npm run open:tabs
```

## Fixtures And Licensing Hygiene

This repository intentionally does **not** ship:

- downloaded research libraries
- captured third-party collection pages
- downloaded source images
- copied search result dumps

The fixture suite uses small synthetic HTML files in `test/fixtures/` that exercise selectors without redistributing source-site content.

Local research output is ignored via `.gitignore`:

- `*.trovelibrary/`
- `node_modules/`
- local temp/report folders

## MCP

The included MCP server manages libraries on disk.

Start it with:

```bash
npm run mcp:start
```

Current tools:

- `list_projects`
- `create_project`
- `get_project_inventory`
- `read_item_markdown`
- `search_markdown`
- `save_project_note`
- `open_urls_in_tabs`

This is intended for Codex / Claude style workspace assistance:

- inspect and summarize saved markdown
- search across project inventories
- add notes and project instructions
- open pasted live URLs into the app as tabs
- prepare follow-up work without scraping the live browser state

The intended research loop is recursive, not one-shot:

- review the current body of saved articles and images
- identify strengths, gaps, weak coverage, repeated phrases, and unusual themes
- suggest new search terms, names, places, industries, dates, and quoted wording based on that body
- save those search URLs back into the library so the path to the next tranche of material is preserved

In other words, Codex or Claude should not just summarize what is already there. They should propose the next search moves from the language and patterns already emerging in the library.

## Adding A New Source

Use the `Plugins` screen or run the probe manually with a few representative URLs:

- landing page
- search page
- detail page
- media page if the source has one

Then the usual loop is:

1. probe the URLs
2. add synthetic or fixture-backed coverage
3. implement the adapter
4. verify extraction, decoration, and live app behavior
5. tighten the UI until collect/ignore flow is clean

## Repository Status

This package is marked `UNLICENSED` in `package.json`. If you want to publish it under an open-source license, choose one explicitly and add the corresponding license file before distribution.

## Ownership And IP

- Copyright remains with the repository owner.
- No license is granted to copy, redistribute, or reuse this code unless you add one explicitly.
- See `COPYRIGHT.md` for the plain-language ownership notice.
