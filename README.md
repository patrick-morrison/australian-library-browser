# The Australian Library Browser

Desktop app for collecting material from Trove, SLWA and the WA Museum into self-describing research libraries on disk.

Built on April 1-2, 2026 as an experiment in spinning up a custom research browser. It is vibe-coded, so do not expect my usual standard. The tyres have been kicked, but use it at your own risk. I am writing the history of Wellington Dam, and this was built to speed up and improve the workflow for handling primary research notes.

The point of it is simple: save full-resolution images and markdown into a local library, keep the primary record on disk, and make that material searchable, summarizable, and cross-referenceable with help from Codex or Claude Code.

## Screenshots

Search live on Trove or SLWA, save the search, and work through results with inline controls.

![Searching](docs/screenshots/searching.jpeg)

Preview a record before collecting it, with the extracted text or image shown in the side pane.

![Library finder](docs/screenshots/library-finder.jpeg)

Collect or ignore as you go. Decisions stay attached to records when they turn up again in later searches.

![Ignoring](docs/screenshots/ignoring.jpeg)

Work back through the local library on disk, reopen saved searches, and inspect what has already been collected.

![Library](docs/screenshots/library.jpeg)

Paste research notes full of Trove or SLWA links, extract the URLs, and open unresolved ones for triage.

![Links](docs/screenshots/links.jpeg)

If you need to map a new site, save debug dumps of the page structure and build an unofficial adapter from that material.

![Debug dumps](docs/screenshots/debug.jpeg)

The screenshots live in `docs/screenshots/`.

Supported sources:

- `Trove`
- `SLWA`
- `WA Museum` Maritime Archaeology Databases

Each library is a normal folder with a `.trovelibrary` manifest inside it.

Typical contents:

- `project.yaml` for project state
- `items.csv` for a flat inventory
- `README.md` for local notes
- `newspapers/` for markdown captures
- `images/` for downloaded images and sidecar markdown
- `debug/` for optional page dumps and reverse-engineering notes

## Workflow

Start with a search on Trove or SLWA, then save that search so there is a record of what you looked for. As you work through the results, collect or ignore records so there is a record of what you have already seen and decided on. Then change the search and keep going. Records you already made a decision on stay marked as collected or ignored when they turn up again in later searches.

You can preview items before collecting them. For Trove, that means traversing through to the full text and rendering it as markdown. For SLWA, it means pulling through to the image and associated record details. When you collect something, the app saves the result neatly into the local library with the metadata alongside it.

If you already have research notes full of Trove or SLWA links, there is a bulk import path. Paste the notes in, the app will extract the links, show which ones are already collected or ignored, and open the unresolved ones in tabs for triage.

The whole point is to move quickly through Trove and SLWA searches, keep local copies of what matters, keep a record of what has already been seen, and leave the metadata in a form that is easy to search and work across later.

## New Sites

There is a debug dump path for mapping the HTML of a new site you want to work on. The idea is to save page dumps into `debug/`, inspect the structure, and then quickly sketch an adapter from that material with help from Claude or Codex.

None of this is official. The source integrations are just pragmatic adapters around public pages.

## Development

```bash
npm install
npm start
```

Common commands:

```bash
npm run test:fixtures
npm run test:e2e:smoke
npm run test:mcp
npm run dist
```

Open tabs from the CLI:

```bash
npm run open:tabs -- "https://trove.nla.gov.au/newspaper/article/32575438"
pbpaste | npm run open:tabs
```

Start the MCP server with:

```bash
npm run mcp:start
```

MCP tools:

- `list_projects`
- `create_project`
- `get_project_inventory`
- `read_item_markdown`
- `search_markdown`
- `save_project_note`
- `open_urls_in_tabs`
- `open_search_queries_in_tabs`

With MCP, Codex can read saved markdown in a library, identify names, places, dates or phrases worth following up, and open the next Trove or SLWA search tabs directly from those queries.

Notes:

- This repo does not ship downloaded research libraries or copied third-party page dumps.
- The package is currently `UNLICENSED`.
