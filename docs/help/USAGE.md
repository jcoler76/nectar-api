Help Docs: Usage
================

Generate HTML files for each workflow node and capture screenshots of the docs pages using Playwright.

Commands
--------
- `npm run docs:generate:nodes` — Parse `src/features/workflows/nodes/nodeTypes.js` and write one HTML doc per node to `docs/help/nodes/`.
- `npm run docs:screenshots` — Open each generated HTML file in a headless browser and save `*-doc.png` snapshots into `docs/help/assets/screenshots/`.
- `npm run docs:screenshots:panels` — Log into the running app and capture each node’s configuration panel from the Workflow Builder as `<slug>-panel.png`.

Setup
-----
1. Ensure Node.js is installed.
2. Install Playwright locally if you plan to generate screenshots:
   - `npm i -D playwright`
   - `npx playwright install chromium`
3. To capture UI panel screenshots, run the frontend locally at `http://localhost:3000`.

Panel Screenshots (UI)
----------------------
- Start the frontend: `npm run start` (or `npm run start:frontend` if used)
- Ensure you can visit `http://localhost:3000/login` in your browser.
- Run: `npm run docs:screenshots:panels`
- Environment overrides (optional):
  - `DOCS_LOGIN_EMAIL=... DOCS_LOGIN_PASSWORD=... npm run docs:screenshots:panels`

Notes
-----
- The generator also emits `docs/help/nodes/nodes.json` (manifest) used by the screenshot script.
- The HTML template is at `docs/help/templates/node-template.html`. Customize it as needed and re-run the generator.
- Placeholder 1x1 PNG files are created for each node to avoid broken image links until real screenshots are captured.

Next Steps
----------
- Optionally add a Playwright flow that runs the application, adds each node in the Workflow Builder, opens its properties panel, and captures `*-panel.png` for richer docs.
