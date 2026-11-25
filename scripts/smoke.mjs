// Real Chromium smoke + assertions + moving clip captures under the _2 Pages subpath.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, rename } from 'node:fs/promises';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.webm': 'video/webm',
};
const BASE = '/orbital_tomb_MERIDIAN-STATION-Before-the-First-Cut_2/';

await mkdir('artifacts', { recursive: true });
await mkdir('docs', { recursive: true });

const server = createServer(async (req, res) => {
  let p = req.url.split('?')[0];
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  if (p === '' || p === '/') p = 'index.html';
  try {
    const data = await readFile(join('dist', p));
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('nf');
  }
});

await new Promise(r => server.listen(8931, r));
const url = `http://localhost:8931${BASE}`;
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

// 1. Main interactive assertions (desktop 1280x720)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__meridian?.firstFrameRendered === true, { timeout: 15000 });
const playDisabled = await page.isDisabled('#playBig');
assert.equal(playDisabled, false, 'Play button must be enabled after first frame');

// Play advances clock
await page.click('#playBig');
await page.waitForTimeout(1200);
const t1 = await page.evaluate(() => window.__meridian.filmTime);
assert.ok(t1 > 0.3, `Play must advance filmTime (got ${t1})`);

// Space pauses and holds clock
await page.keyboard.press('Space');
const tPause = await page.evaluate(() => window.__meridian.filmTime);
await page.waitForTimeout(500);
const tAfterPause = await page.evaluate(() => window.__meridian.filmTime);
assert.ok(Math.abs(tAfterPause - tPause) < 0.05, `Pause must hold filmTime (${tPause} vs ${tAfterPause})`);

// Visible scrubber seeks to Month 1 (38s) -> sealClosed & bypassOpen
await page.evaluate(() => {
  const s = document.getElementById('scrub');
  s.value = '38';
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(300);
const tScrub = await page.evaluate(() => window.__meridian.filmTime);
assert.ok(Math.abs(tScrub - 38) < 0.2, `Scrub must set filmTime to 38 (got ${tScrub})`);
const s38 = await page.evaluate(() => window.__meridian.stateAt(38));
assert.ok(s38.sealClosed > 0.9, 'Seal must be closed at 38s');
assert.ok(s38.bypassOpen > 0.6, 'Bypass must be open at 38s');

// Inspect round-trip preserves playhead
await page.click('#btnInspect');
await page.waitForTimeout(400);
assert.equal(await page.isHidden('#inspect'), false, 'Inspect panel must open');
await page.click('#btnCloseInspect');
await page.waitForTimeout(200);
assert.equal(await page.isHidden('#inspect'), true, 'Inspect panel must close');
const tAfterInspect = await page.evaluate(() => window.__meridian.filmTime);
assert.ok(Math.abs(tAfterInspect - 38) < 0.2, 'Inspect must return without losing playhead');

// Replay resets to 0
await page.click('#btnReplay');
await page.waitForTimeout(200);
const tReplay = await page.evaluate(() => window.__meridian.filmTime);
assert.ok(tReplay < 1.0, `Replay must reset filmTime near 0 (got ${tReplay})`);
await page.keyboard.press('Space');

// Hand contact close frame at 1:21 (81s)
await page.evaluate(() => {
  const s = document.getElementById('scrub');
  s.value = '81';
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/hand-contact.png' });
await page.screenshot({ path: 'docs/smoke-desktop.png' });

const perf = await page.evaluate(() => ({
  intervals: window.__meridian.frameIntervals.slice(-30),
  costs: window.__meridian.renderCosts.slice(-30),
}));
await ctx.close();

// 2. No-WebGL fallback assertion
const noGlCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const noGlPage = await noGlCtx.newPage();
await noGlPage.addInitScript(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
    return orig.call(this, type, ...args);
  };
});
await noGlPage.goto(url, { waitUntil: 'networkidle' });
await noGlPage.waitForTimeout(600);
const errVisible = await noGlPage.isVisible('#err');
const playHidden = await noGlPage.isHidden('#playBig');
assert.equal(errVisible, true, 'No-WebGL state must show #err');
assert.equal(playHidden, true, 'No-WebGL state must hide dead Play button');
await noGlCtx.close();

// 3. Phone viewport check (390x844)
const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const phonePage = await phoneCtx.newPage();
await phonePage.goto(url, { waitUntil: 'networkidle' });
await phonePage.waitForFunction(() => window.__meridian?.firstFrameRendered === true, { timeout: 15000 });
await phonePage.screenshot({ path: 'docs/smoke-phone.png' });
await phoneCtx.close();

// 4. Clip A: Opening coupling (0:00-0:04) + First Cut & bypass (0:30-0:39)
const clipACtx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: 'artifacts/', size: { width: 1280, height: 720 } },
});
const clipAPage = await clipACtx.newPage();
await clipAPage.goto(url, { waitUntil: 'networkidle' });
await clipAPage.waitForFunction(() => window.__meridian?.firstFrameRendered === true, { timeout: 15000 });
await clipAPage.click('#playBig');
await clipAPage.waitForTimeout(4000);
await clipAPage.evaluate(() => { window.__meridian.filmTime = 30; });
await clipAPage.waitForTimeout(8500);
const vidA = await clipAPage.video().path();
await clipACtx.close();
await rename(vidA, 'artifacts/clip-a-first-cut.webm');

// 5. Clip B: Full 1:20-1:30 finale without UI
const clipBCtx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: 'artifacts/', size: { width: 1280, height: 720 } },
});
const clipBPage = await clipBCtx.newPage();
await clipBPage.goto(url, { waitUntil: 'networkidle' });
await clipBPage.waitForFunction(() => window.__meridian?.firstFrameRendered === true, { timeout: 15000 });
await clipBPage.evaluate(() => { window.__meridian.filmTime = 80; });
await clipBPage.click('#playBig');
await clipBPage.waitForTimeout(10200);
const vidB = await clipBPage.video().path();
await clipBCtx.close();
await rename(vidB, 'artifacts/clip-b-finale.webm');

await browser.close();
server.close();
assert.equal(errors.length, 0, `Unexpected page errors: ${errors.join('; ')}`);
console.log('SMOKE_OK', JSON.stringify({ t1, tPause, tScrub, tAfterInspect, tReplay, errVisible, playHidden, sampleIntervals: perf.intervals.length }));
