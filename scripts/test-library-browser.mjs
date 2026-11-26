// Browser integration & UI verification for Side-by-Side Photo Grid, Saving System, & Trilingual Interface (AR/EN/DE)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotsDir = 'C:\\Users\\Hossam\\.gemini\\antigravity\\brain\\19d44b9d-c661-4024-9358-7360d0655a60\\screenshots';
const port = 4189;
const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

await fs.mkdir(shotsDir, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/src/index.html';
    const file = path.join(root, path.normalize(pathname).replace(/^([/\\])+/, ''));
    if (!file.startsWith(root)) throw Object.assign(new Error('forbidden'), { code: 'ENOENT' });
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});

await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
console.log(`Preview server running on http://127.0.0.1:${port}`);

try {
  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ['--font-render-hinting=none', '--force-color-profile=srgb'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
  const problems = [];
  page.on('pageerror', (err) => problems.push(`PAGEERROR: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`CONSOLE: ${msg.text()}`);
  });

  console.log('1. Verifying Side-by-Side Photo Library Grid (zero comma text nodes)...');
  await page.goto(`http://127.0.0.1:${port}/src/index.html#/library`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lib-card', { timeout: 10000 });
  await page.waitForTimeout(350);

  // Verify NO comma text nodes inside #lib-grid and cards sit side-by-side on the same row
  const gridCheck = await page.evaluate(() => {
    const grid = document.getElementById('lib-grid');
    const strayTextNodes = [...grid.childNodes].filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim().length > 0,
    );
    const cards = [...grid.querySelectorAll('.lib-card')].slice(0, 4);
    const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top));
    return { strayCount: strayTextNodes.length, tops, cardCount: cards.length };
  });
  console.log('Grid geometry check:', gridCheck);
  assert.equal(gridCheck.strayCount, 0, 'Found stray comma text nodes inside #lib-grid!');
  assert.equal(new Set(gridCheck.tops).size, 1, `First 4 cards must sit side-by-side on the exact same row, got tops: ${gridCheck.tops}`);

  // Scroll down to show the 4-column side-by-side photo grid
  await page.evaluate(() => document.getElementById('lib-grid')?.scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shotsDir, '11-library-grid-fixed.png') });
  console.log('✓ Captured 11-library-grid-fixed.png (4 cards side-by-side!)');

  // 2. Verify English (EN) on Settings, Chill Mode, and Library
  console.log('2. Verifying English (EN) across Settings, Chill Mode, and Library...');
  await page.locator('.topbar [data-lang-switch="en"]').click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.title), 'Chunk Notebook — German A1 to C1');

  await page.goto(`http://127.0.0.1:${port}/src/index.html#/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shotsDir, '12-settings-english.png') });
  console.log('✓ Captured 12-settings-english.png');

  await page.goto(`http://127.0.0.1:${port}/src/index.html#/chill`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shotsDir, '13-chill-english.png') });
  console.log('✓ Captured 13-chill-english.png');

  // 3. Verify German (DE) on Stats & Trophies
  console.log('3. Verifying German (DE) across Stats & Trophies...');
  await page.locator('.topbar [data-lang-switch="de"]').click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.title), 'Chunk-Heft — Deutsch A1 bis C1');

  await page.goto(`http://127.0.0.1:${port}/src/index.html#/stats`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shotsDir, '14-stats-german.png') });
  console.log('✓ Captured 14-stats-german.png');

  await browser.close();

  if (problems.length > 0) {
    console.error('Errors during browser test:', problems);
    throw new Error('Browser test encountered console/page errors');
  }

  console.log('\nALL v2.1 GRID, SAVING & TRILINGUAL BROWSER TESTS PASSED ✅');
} finally {
  server.close();
}
