Help Documentation
===================

Location for in-app help HTML files and related assets.

Structure
---------
- `docs/help/nodes/` — one HTML file per workflow node.
- `docs/help/assets/screenshots/` — captured screenshots used by the docs.

Conventions
-----------
- File names: use the node's identifier in lowercase with hyphens, e.g., `extract-csv.html`.
- Keep screenshots lightweight (web-optimized) and reference with relative paths, e.g., `../assets/screenshots/extract-csv-overview.png`.
- Prefer self-contained HTML (include minimal inline CSS) unless a shared stylesheet is later added.

Next Steps
----------
- Add a Playwright script to open each node's UI and capture screenshots into `assets/screenshots/`.
- Author one HTML file per node under `nodes/` with overview, setup steps, examples, and screenshots.
