// Uses Playwright to render each generated help HTML file and capture a snapshot.
// Requires: npm i -D playwright (or @playwright/test)
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function run() {
  let chromium;
  try {
    // prefer standalone playwright if available
    chromium = require('playwright').chromium;
  } catch (e) {
    try {
      // fallback to @playwright/test runtime
      ({ chromium } = require('@playwright/test'));
    } catch (e2) {
      console.error('Playwright not installed. Please install with: npm i -D playwright');
      process.exit(1);
    }
  }

  const manifestPath = path.join(__dirname, '..', 'docs', 'help', 'nodes', 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const screenshotDir = path.join(__dirname, '..', 'docs', 'help', 'assets', 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  for (const n of nodes) {
    const htmlPath = path.join(__dirname, '..', 'docs', 'help', 'nodes', `${n.slug}.html`);
    const url = pathToFileURL(htmlPath).href;
    await page.goto(url);
    await page.waitForLoadState('load');
    await page.screenshot({ path: path.join(screenshotDir, `${n.slug}-doc.png`), fullPage: true });
    console.log('Snapshot:', `${n.slug}-doc.png`);

    // Try to capture just the Configuration section as a proxy for the panel view
    try {
      const configSection = page.locator('section:has(h2:has-text("Configuration"))').first();
      if ((await configSection.count()) > 0) {
        await configSection.scrollIntoViewIfNeeded();
        await configSection.screenshot({ path: path.join(screenshotDir, `${n.slug}-panel.png`) });
        console.log('Snapshot:', `${n.slug}-panel.png`);
      } else {
        // fallback: viewport crop
        await page.screenshot({ path: path.join(screenshotDir, `${n.slug}-panel.png`) });
        console.log('Snapshot (fallback):', `${n.slug}-panel.png`);
      }
    } catch (e) {
      console.warn('Panel snapshot failed for', n.slug, e?.message);
    }
  }

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
