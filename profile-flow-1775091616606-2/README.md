# Profile Flow 1775091616606

This is a self-describing research package.

## Structure

- `profile-flow-1775091616606-2.trovelibrary`: project metadata, saved items, ignored items, uncollected items, and source aliases.
- `items.csv`: flat inventory of collected, ignored, and uncollected items for spreadsheets, scripting, and audits.
- `newspapers/`: saved markdown captures for text-based records.
- `images/`: saved images plus same-name markdown metadata sidecars.
- `debug/`: reverse-engineering dumps such as page HTML, extracted JSON, and preview markdown.
- `searches/`: saved search URL bookmarks so you can reopen live search pages later.

## Preservation

- The goal is that this folder still makes sense even if the original websites disappear.
- `profile-flow-1775091616606-2.trovelibrary` is the inventory and source map for the package.
- `items.csv` is the quick ledger of what was collected or ignored.
- Markdown captures keep citations, links, metadata, and extracted text together.
- Image items include both the downloaded binary and a same-name markdown record.

## Agent Notes

- Coding agents can read `profile-flow-1775091616606-2.trovelibrary` plus the markdown files directly.
- Saved markdown is designed to be easy to search, summarize, and transform.
- Image items are represented by a binary asset and a markdown metadata file with the same basename.
- Agents should treat the library as recursive research material: read the saved body, notice strengths, gaps, repeated phrasing, names, places, and themes, then suggest the next search terms from that evidence.
- Save those follow-up search URLs into the library so the path from one tranche of material to the next stays visible.
- Add any project-specific conventions or prompts here if you want Codex or Claude Code to work with this library consistently.
