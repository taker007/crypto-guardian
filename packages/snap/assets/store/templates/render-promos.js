#!/usr/bin/env node
/**
 * Render 3 MetaMask Snap promo images at exactly 960×540 pixels
 * (the dimensions required by the Snaps Directory submission form).
 *
 * Output: ../promo-{1,2,3}-*.png (next to the existing screenshots)
 *
 * Run from anywhere — paths are absolute via __dirname.
 */
const path = require('path');
const fs = require('fs');

let chromium;
try { chromium = require('playwright').chromium; }
catch {
  const fallback = '/tmp/claude-1000/-home-tjones/040dbf8d-c258-46dd-860e-be9bef298475/scratchpad/extension-smoketest/node_modules/playwright';
  if (fs.existsSync(fallback)) chromium = require(fallback).chromium;
  else { console.error('Playwright not found.'); process.exit(1); }
}

const TEMPLATES_DIR = __dirname;
const OUTPUT_DIR = path.resolve(__dirname, '..');

const TILES = [
  { name: 'promo-1-intro',    file: 'promo-1-intro.html' },
  { name: 'promo-2-scan',     file: 'promo-2-scan.html' },
  { name: 'promo-3-advisory', file: 'promo-3-advisory.html' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const t of TILES) {
    const context = await browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(`file://${path.join(TEMPLATES_DIR, t.file)}`, {
      waitUntil: 'networkidle', timeout: 10000,
    });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    const tile = await page.$('.tile');
    if (!tile) throw new Error(`No .tile element in ${t.file}`);
    const out = path.join(OUTPUT_DIR, `${t.name}.png`);
    await tile.screenshot({ path: out, omitBackground: false });
    const kb = (fs.statSync(out).size / 1024).toFixed(1);
    console.log(`  ✓ ${t.name}.png  (960×540, ${kb} KB)`);
    await context.close();
  }
  await browser.close();
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
