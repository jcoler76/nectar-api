const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');

async function resolveChromium() {
  try {
    return require('playwright').chromium;
  } catch (err) {
    try {
      return require('@playwright/test').chromium;
    } catch (err2) {
      throw new Error('Playwright is not installed. Run "npm install --save-dev playwright" first.');
    }
  }
}

function startStaticServer(rootDir, port = 4173) {
  const mappings = {
    '/app': path.join(rootDir, 'build'),
    '/docs': path.join(rootDir, 'docs', 'help'),
    '/marketing': path.join(rootDir, 'marketing-site', 'frontend', 'build'),
  };

  const spaPrefixes = new Set(['/app', '/marketing']);

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.map': 'application/json; charset=utf-8',
  };

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, 'http://127.0.0.1');
      let prefixMatch = null;
      for (const prefix of Object.keys(mappings)) {
        if (requestUrl.pathname === prefix || requestUrl.pathname.startsWith(`${prefix}/`)) {
          prefixMatch = prefix;
          break;
        }
      }

      if (!prefixMatch) {
        res.writeHead(302, { Location: '/marketing/' });
        res.end();
        return;
      }

      const baseDir = mappings[prefixMatch];
      const relativePath = decodeURIComponent(requestUrl.pathname.slice(prefixMatch.length)) || '/';
      let targetPath = path.join(baseDir, relativePath);

      let stat;
      try {
        stat = await fs.promises.stat(targetPath);
      } catch (err) {
        stat = null;
      }

      if (!stat || stat.isDirectory()) {
        if (spaPrefixes.has(prefixMatch)) {
          targetPath = path.join(baseDir, 'index.html');
          stat = await fs.promises.stat(targetPath);
        } else if (stat && stat.isDirectory()) {
          targetPath = path.join(targetPath, 'index.html');
          stat = await fs.promises.stat(targetPath);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
      }

      const ext = path.extname(targetPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const stream = fs.createReadStream(targetPath);
      stream.on('error', (err) => {
        console.error('Static server read error:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      });
      res.writeHead(200, { 'Content-Type': contentType });
      stream.pipe(res);
    } catch (err) {
      console.error('Static server error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      resolve({
        port,
        close: () => new Promise((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      });
    });
    server.on('error', reject);
  });
}

async function gentleScroll(page, deltas, pauseMs) {
  for (const delta of deltas) {
    await page.mouse.wheel(0, delta);
    if (pauseMs) {
      await page.waitForTimeout(pauseMs);
    }
  }
}

async function run() {
  const chromium = await resolveChromium();
  const rootDir = path.resolve(__dirname, '..');
  const outputDir = path.join(rootDir, 'media', 'demo');
  await fs.promises.mkdir(outputDir, { recursive: true });

  const server = await startStaticServer(rootDir);
  console.log(`Static preview server started on http://127.0.0.1:${server.port}`);

  const segments = [
    {
      name: 'Platform Overview',
      url: `http://127.0.0.1:${server.port}/app/`,
      initialPause: 1400,
      action: async (page) => {
        await gentleScroll(page, [280, 280], 1000);
        await page.waitForTimeout(900);
        await page.mouse.move(980, 460, { steps: 20 });
        await page.waitForTimeout(800);
        await gentleScroll(page, [240], 1000);
        await gentleScroll(page, [-260], 1000);
      },
      closingPause: 700,
    },
    {
      name: 'Documentation',
      url: `http://127.0.0.1:${server.port}/docs/nodes/action-apisequence.html`,
      initialPause: 1200,
      action: async (page) => {
        await gentleScroll(page, [240, 220], 900);
        await page.waitForTimeout(700);
        await page.mouse.move(1120, 300, { steps: 18 });
        await page.waitForTimeout(800);
        await gentleScroll(page, [-220], 900);
      },
      closingPause: 700,
    },
    {
      name: 'Marketing Site',
      url: `http://127.0.0.1:${server.port}/marketing/`,
      initialPause: 1400,
      action: async (page) => {
        await gentleScroll(page, [300, 280], 900);
        await page.waitForTimeout(800);
        await page.mouse.move(960, 520, { steps: 18 });
        await page.waitForTimeout(700);
        await gentleScroll(page, [240], 900);
        await gentleScroll(page, [-260, -220], 900);
      },
      closingPause: 700,
    },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 },
    },
    colorScheme: 'light',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  for (const segment of segments) {
    console.log(`Recording segment: ${segment.name}`);
    await page.goto(segment.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(segment.initialPause ?? 1000);
    await segment.action(page);
    await page.waitForTimeout(segment.closingPause ?? 600);
  }

  await page.waitForTimeout(600);
  const video = await page.video();
  await page.close();
  const finalPath = path.join(outputDir, 'nectar-demo.webm');
  await video.saveAs(finalPath);
  await video.delete();
  console.log(`Demo video saved to ${finalPath}`);

  await context.close();
  await browser.close();
  await server.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
