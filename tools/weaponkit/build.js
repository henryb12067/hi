#!/usr/bin/env node
'use strict';
// Build a weapon design: validate, export, and render.
//
//   node tools/weaponkit/build.js weapons/<slug>            # exports + renders
//   node tools/weaponkit/build.js weapons/<slug> --no-render
//
// Reads weapons/<slug>/design.js (which must export a weaponkit Model) and writes:
//   weapons/<slug>/out/<Name>.rbxmx     Roblox model: a Tool with welded parts (Insert from File / Rojo)
//   weapons/<slug>/out/<Name>.lua       Studio command-bar script / ModuleScript builder
//   weapons/<slug>/out/<Name>.obj/.mtl  mesh for Blender or the Roblox 3D importer
//   weapons/<slug>/out/<Name>.json      raw part list
//   weapons/<slug>/renders/sheet.png    contact sheet of 8 views
//   weapons/<slug>/renders/hero.png     large 3/4 render

const fs = require('fs');
const path = require('path');
const { toRbxmx, toLuau, toObj, summary } = require('./export');
const { validate } = require('./validate');

async function render(spec, outDir, opts = {}) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')));
  }
  const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1800, height: 1600 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.route('http://kit.local/**', (route) => {
      const u = new URL(route.request().url());
      let file;
      if (u.pathname === '/index.html') file = path.join(__dirname, 'render.html');
      else if (u.pathname.startsWith('/three/')) file = path.join(threeRoot, u.pathname.slice('/three/'.length));
      if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
      const type = file.endsWith('.html') ? 'text/html' : 'text/javascript';
      route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
    });

    const shoot = async (options, file) => {
      await page.addInitScript(({ spec, options }) => {
        window.SPEC = spec;
        window.OPTS = options;
      }, { spec, options });
      await page.goto('http://kit.local/index.html');
      await page.waitForFunction(() => window.DONE === true, null, { timeout: 120000 }).catch((e) => {
        throw new Error(`render failed: ${errors.join(' | ') || e.message}`);
      });
      if (file) {
        const el = await page.$('#sheet');
        await el.screenshot({ path: file });
      }
      return page.evaluate(() => window.RESULTS);
    };

    const tile = { w: 380, h: 640 };
    const sheetViews = [
      { name: 'front', label: 'Front (flat, +X)' },
      { name: 'back', label: 'Back (flat, -X)' },
      { name: 'edge', label: 'Edge (forward edge, -Z)' },
      { name: 'silhouette', label: 'Silhouette' },
      { name: 'hero', label: '3/4 hero' },
      { name: 'hilt', label: 'Hilt detail' },
      { name: 'tip', label: 'Tip detail' },
      { name: 'scale', label: 'Scale vs 5.2-stud character' },
    ].map((v) => ({ ...v, ...tile }));
    const title = `${spec.meta.name}${spec.meta.collection ? ` — ${spec.meta.collection}` : ''}  ·  ${spec.parts.length} parts`;
    await shoot({ views: sheetViews, columns: 4, sheet: true, title, hilt: opts.hilt, tip: opts.tip }, path.join(outDir, 'sheet.png'));

    // Single large renders, written straight from the canvas data URLs.
    const big = await shoot({
      views: [
        { name: 'hero', w: 1100, h: 1400 },
        { name: 'topdown', w: 900, h: 500 },
      ],
      columns: 1, sheet: false, hilt: opts.hilt, tip: opts.tip,
    });
    for (const [name, url] of Object.entries(big))
      fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    if (errors.length) console.warn('render warnings:', errors.join('\n'));
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) {
    console.error('usage: node tools/weaponkit/build.js weapons/<slug> [--no-render]');
    process.exit(2);
  }
  const abs = path.resolve(dir);
  const designFile = path.join(abs, 'design.js');
  delete require.cache[require.resolve(designFile)];
  const model = require(designFile);
  if (!model || !Array.isArray(model.parts)) throw new Error(`${designFile} must export a weaponkit Model`);
  const spec = JSON.parse(JSON.stringify(model.toJSON ? model.toJSON() : model));
  spec.meta.slug = path.basename(abs);

  const report = validate(spec);
  const outDir = path.join(abs, 'out');
  const renderDir = path.join(abs, 'renders');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(renderDir, { recursive: true });

  const base = spec.meta.name.replace(/[^A-Za-z0-9]+/g, '');
  fs.writeFileSync(path.join(outDir, `${base}.rbxmx`), toRbxmx(spec));
  fs.writeFileSync(path.join(outDir, `${base}.lua`), toLuau(spec));
  const { obj, mtl } = toObj(spec, `${base}.mtl`);
  fs.writeFileSync(path.join(outDir, `${base}.obj`), obj);
  fs.writeFileSync(path.join(outDir, `${base}.mtl`), mtl);
  fs.writeFileSync(path.join(outDir, `${base}.json`), JSON.stringify(spec, null, 1));

  console.log(JSON.stringify({ summary: summary(spec), validation: report }, null, 2));
  if (!args.includes('--no-render')) {
    await render(spec, renderDir, spec.meta.render || {});
    console.log(`renders: ${path.relative(process.cwd(), renderDir)}/sheet.png, hero.png, topdown.png`);
  }
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
