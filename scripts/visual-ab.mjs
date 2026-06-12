#!/usr/bin/env node
/**
 * Theme A/B visual runner.
 *
 * Captures full-page screenshots of key routes in BOTH themes and builds a
 * side-by-side compare.html:
 *   - "sunset" (after)  = current working tree
 *   - "indigo" (before) = git HEAD (theme changes stashed away)
 *
 * Usage:  node scripts/visual-ab.mjs
 *
 * Safe by design: the visual spec/config/this script are untracked, so a plain
 * `git stash` (which leaves untracked files in place) reverts only the app code.
 * The stash is always popped in a finally block.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const shotsDir = path.join(root, 'screenshots');

const run = (cmd, extraEnv = {}) =>
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
const capture = cmd => execSync(cmd, { encoding: 'utf8' }).trim();
const tryRun = cmd => {
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
};

function runVariant(variant) {
  console.log(`\n========== Capturing variant: ${variant} ==========`);
  const dir = path.join(shotsDir, variant);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  run('npx playwright test --config=playwright.visual.config.ts', { WAYFLO_VARIANT: variant });
}

function buildReport() {
  const sunsetDir = path.join(shotsDir, 'sunset');
  const indigoDir = path.join(shotsDir, 'indigo');
  const names = new Set();
  for (const d of [indigoDir, sunsetDir]) {
    if (existsSync(d)) readdirSync(d).filter(f => f.endsWith('.png')).forEach(f => names.add(f));
  }
  const cell = (dir, sub, f) =>
    existsSync(path.join(dir, f))
      ? `<img loading="lazy" src="${sub}/${f}" alt="${sub} ${f}">`
      : `<div class="missing">not captured</div>`;

  const rows = [...names]
    .sort()
    .map(
      f => `
    <section class="row">
      <h2>${f.replace('.png', '')}</h2>
      <div class="pair">
        <figure><figcaption><span class="dot indigo"></span>Before · Indigo (HEAD)</figcaption>${cell(indigoDir, 'indigo', f)}</figure>
        <figure><figcaption><span class="dot sunset"></span>After · Sunset (new)</figcaption>${cell(sunsetDir, 'sunset', f)}</figure>
      </div>
    </section>`
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wayflo — Theme A/B (Indigo vs Sunset)</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: #fbf2e6; color: #3a2540; }
  header { position: sticky; top: 0; z-index: 5; padding: 20px 28px; background: linear-gradient(135deg,#fbbf24,#ea580c 52%,#f43f5e); color: #fff; box-shadow: 0 8px 24px rgba(234,88,12,.25); }
  header h1 { margin: 0 0 4px; font-size: 20px; letter-spacing: -.02em; }
  header p { margin: 0; opacity: .9; font-size: 13px; }
  main { max-width: 1600px; margin: 0 auto; padding: 24px 28px 64px; }
  nav { position: sticky; top: 74px; z-index: 4; display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 0; background: #fbf2e6; }
  nav a { font-size: 12px; font-weight: 600; text-decoration: none; color: #ea580c; border: 1px solid #fed7aa; background: #fff7ed; border-radius: 999px; padding: 5px 12px; }
  .row { margin: 28px 0; }
  .row h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .14em; color: #8c7882; margin: 0 0 12px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  figure { margin: 0; background: #fff; border: 1px solid #eaddc7; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(58,37,64,.08); }
  figcaption { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 12px; font-weight: 700; border-bottom: 1px solid #f0e2d0; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .dot.indigo { background: #6c63ff; }
  .dot.sunset { background: linear-gradient(135deg,#fbbf24,#ea580c,#f43f5e); }
  img { display: block; width: 100%; height: auto; }
  .missing { padding: 40px; text-align: center; color: #9b8b92; font-size: 13px; }
  @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } nav { top: 0; } }
</style></head>
<body>
  <header>
    <h1>Wayflo — Theme A/B</h1>
    <p>Before (Indigo · git HEAD) vs After (Sunset · current) — ${[...names].length} routes · generated ${new Date().toLocaleString()}</p>
  </header>
  <main>
    <nav>${[...names].sort().map(f => `<a href="#${f.replace('.png', '')}">${f.replace('.png', '')}</a>`).join('')}</nav>
    ${rows.replace(/<section class="row">\s*<h2>([^<]+)<\/h2>/g, '<section class="row" id="$1"><h2>$1</h2>')}
  </main>
</body></html>`;

  const target = path.join(shotsDir, 'compare.html');
  writeFileSync(target, html);
  console.log(`\n✓ Report written: ${path.relative(root, target)}`);
}

// ---- main -----------------------------------------------------------------
console.log('Wayflo theme A/B — capturing Indigo (HEAD) vs Sunset (working tree)\n');

// 1) sunset = current working tree
runVariant('sunset');

// 2) indigo = git HEAD (stash theme changes; untracked test files survive)
let stashed = false;
const dirty = capture('git status --porcelain');
try {
  if (dirty) {
    run('git stash push -m wayflo-visual-ab');
    stashed = true;
  } else {
    console.log('\nNote: working tree matches HEAD — Indigo and Sunset will be identical.');
  }
  runVariant('indigo');
} finally {
  if (stashed) {
    // dev server may have rewritten tracked build artifacts (tsconfig.tsbuildinfo);
    // discard those so the stash pop applies cleanly.
    tryRun('git checkout -- .');
    run('git stash pop');
    console.log('\n✓ Restored working tree (sunset).');
  }
}

// 3) side-by-side report
buildReport();
console.log('\nDone. Open screenshots/compare.html in a browser.');
