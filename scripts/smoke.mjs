// Real Chromium smoke under the _2 Pages subpath. Serves dist/ at /orbital_tomb_MERIDIAN-STATION-Before-the-First-Cut_2/
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  let p = req.url.split('?')[0].replace('/orbital_tomb_MERIDIAN-STATION-Before-the-First-Cut_2/', '');
  if (p === '' || p === '/') p = 'index.html';
  try { const data = await readFile(join('dist', p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(8931, r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:8931/orbital_tomb_MERIDIAN-STATION-Before-the-First-Cut_2/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const hasCanvas = await page.evaluate(() => !!document.querySelector('#gl'));
const hasPlay = await page.evaluate(() => !!document.querySelector('#playBig'));
await page.click('#playBig');
await page.waitForTimeout(1500);
const t1 = await page.evaluate(() => window.__meridian?.filmTime);
await page.keyboard.press('Space');
await page.waitForTimeout(600);
const t2 = await page.evaluate(() => window.__meridian?.filmTime);
await page.evaluate(() => { window.__meridian.filmTime = 38; });
await page.waitForTimeout(400);
const s38 = await page.evaluate(() => window.__meridian.stateAt(38).sealClosed);
await page.screenshot({ path: 'docs/smoke-desktop.png' });
const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page2.goto('http://localhost:8931/orbital_tomb_MERIDIAN-STATION-Before-the-First-Cut_2/', { waitUntil: 'networkidle' });
await page2.waitForTimeout(1500);
await page2.screenshot({ path: 'docs/smoke-phone.png' });
console.log(JSON.stringify({ hasCanvas, hasPlay, t1, t2, s38, errors }, null, 2));
await browser.close(); server.close();
if (!hasCanvas || !hasPlay || errors.length) process.exit(1);
