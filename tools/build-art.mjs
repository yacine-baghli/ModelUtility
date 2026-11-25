#!/usr/bin/env node
/* Model Utility: draws the three hero figures and writes them into index.html (between the
   <!-- name:start --> / <!-- name:end --> markers), then writes the share card's page.
   Run from anywhere:  node tools/build-art.mjs
   The scene (a packing line) and the drawing kit are in tools/scene.mjs.
   The figures illustrate the idea; the numbers written on Fig. 1b are illustrative too.
   The logo is not drawn here: tools/make-logo.py makes its files from the source drawing. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INK, PAPER, RED, PRINT, W, H, P, f, FLOOR, LINE, HELD, BELT_PACKS, PACK, CRATE,
         line, grid, shadows, packCentre, crateMouth, hand, arm, hull, com, dot, lead, note, arrow, tick } from './scene.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = (label, body) => `<svg class="fig" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${body}</svg>`;
const held = { x: HELD.x, y: HELD.y, z: LINE.top + HELD.lift };
const C = packCentre(held.x, held.y, held.z);              // where the hands, or the grippers, meet

/* ───────────── Fig. 1a: the task as it is done today, on video ───────────── */
function figVideo() {
  const fr = { x: 20, y: 34, w: 380, h: 262, m: 7, rot: -2 }, cx = fr.x + fr.w / 2, cy = fr.y + fr.h / 2, k = 0.9;
  const scene = `<rect x="-300" y="-300" width="1100" height="1000" fill="${FLOOR}"/>` + shadows() + line('tone', { held })
    + hand([C[0] - 150, C[1] + 215], [C[0] - 14, C[1] + 7], 1) + hand([C[0] + 22, C[1] + 240], [C[0] + 16, C[1] + 11], -1);
  const print = (dx, dy, rot) => `<g transform="rotate(${rot} ${cx} ${cy}) translate(${dx} ${dy})">`
    + `<rect x="${fr.x + 1.5}" y="${fr.y + 2.5}" width="${fr.w}" height="${fr.h}" fill="${INK}" opacity=".13"/>`
    + `<rect x="${fr.x}" y="${fr.y}" width="${fr.w}" height="${fr.h}" fill="${PRINT}" stroke="${INK}" stroke-opacity=".3" stroke-width=".6"/>`;
  const body = print(9, -9, 1.5) + '</g>' + print(4, -4, -0.4) + '</g>' + print(0, 0, fr.rot)
    + `<g clip-path="url(#fa-clip)"><g transform="translate(${cx} ${cy}) scale(${k}) translate(-205 -160)">${scene}</g></g>`
    + `<rect x="${fr.x + fr.m + 8}" y="${fr.y + fr.m + 8}" width="98" height="19" rx="2" fill="${PRINT}"/>`
    + `<circle cx="${fr.x + fr.m + 19}" cy="${fr.y + fr.m + 17.5}" r="3.4" fill="${RED}"/>` + note(fr.x + fr.m + 28, fr.y + fr.m + 21.5, 'REC 00:42')
    + '</g>';
  return svg('A frame of video filmed from a worker’s own eyes: two hands lift a snack pack off a conveyor that carries many more, with a crate of packed ones beside it.',
    `<defs><clipPath id="fa-clip"><rect x="${fr.x + fr.m}" y="${fr.y + fr.m}" width="${fr.w - 2 * fr.m}" height="${fr.h - 2 * fr.m}"/></clipPath></defs>${body}`);
}

/* ───────────── Fig. 1b: the same line as geometry, with physics ───────────── */
function figPhysics() {
  const top = LINE.top, onBelt = [...BELT_PACKS, [HELD.x, HELD.y]];
  let s = `<defs><radialGradient id="fb-g" gradientUnits="userSpaceOnUse" cx="205" cy="236" r="300" gradientTransform="scale(1 .7)"><stop offset=".58" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
        + `<mask id="fb-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fb-g)"/></mask></defs>`;
  s += `<g mask="url(#fb-m)">` + grid() + line('mesh', { held: null, packs: onBelt }) + '</g>';
  // what the simulator collides with
  for (const [x, y] of [[0.92, 0.11], [0.95, 0.27], [1.07, 0.10]]) s += hull(x, y, top, x + PACK.l, y + PACK.w, top + PACK.h);
  // a pack's mass, the crate's, the belt's friction and its speed, gravity
  const m = packCentre(HELD.x, HELD.y);
  s += lead([m, [m[0] + 70, m[1] - 62], [m[0] + 80, m[1] - 62]]) + com(m) + note(m[0] + 85, m[1] - 58, '38 g');
  s += com(P((CRATE.x0 + CRATE.x1) / 2, CRATE.y1, CRATE.h * 1.5));
  const mu = P(1.27, 0.20, top);
  s += lead([mu, [mu[0] + 26, mu[1] - 52], [mu[0] + 34, mu[1] - 52]]) + dot(mu) + note(mu[0] + 39, mu[1] - 48, 'μ 0.6');
  const v0 = P(0.53, 0.56), v1 = P(0.83, 0.56);       // on the floor, along the belt
  s += arrow(v0, [(v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2], v1, { dash: '', width: 0.9 }) + note(v0[0] - 2, v0[1] - 10, '0.2 m/s');
  s += `<path d="M392 22V58M388 51.5L392 58.5 396 51.5" fill="none" stroke="${RED}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"/>` + note(383, 36, 'g', 'end');
  return svg('The same packing line as a wire mesh. A pack carries a mass, some packs are boxed by dashed collision shapes, the belt has a friction and a speed, and gravity points down.', s);
}

/* ───────────── Fig. 1c: a robot practises the task there, and is rewarded when it succeeds ───────────── */
function figRobot() {
  const mouth = crateMouth();
  let s = `<defs><clipPath id="fc-clip"><rect x="1" y="1" width="${W - 2}" height="${H - 2}"/></clipPath></defs><g clip-path="url(#fc-clip)">`;
  s += grid() + line('line', { held });
  // where the pack is going, and what it earns
  const from = [C[0] + 8, C[1] - 16], to = [mouth[0] - 4, mouth[1] - 12];
  s += arrow(from, [(from[0] + to[0]) / 2 + 52, Math.min(from[1], to[1]) - 30], to);
  s += arm([C[0] - 186, C[1] + 262], [C[0] - 106, C[1] + 122], [C[0] - 14, C[1] + 6]) + arm([C[0] - 70, C[1] + 290], [C[0] - 24, C[1] + 138], [C[0] + 17, C[1] + 11]);
  s += '</g>';
  s += `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${INK}" stroke-opacity=".3"/>`;
  // what the simulator shows: which attempt this is, and what it earned
  s += `<rect x="14" y="14" width="140" height="19" rx="2" fill="${PAPER}"/>` + note(21, 27.5, 'SIM · episode 412');
  s += `<rect x="${W - 122}" y="14" width="108" height="19" rx="2" fill="${PAPER}"/>` + tick(W - 116, 23.5, 0.95) + note(W - 100, 27.5, 'reward +1');
  return svg('The same packing line in simulation, seen from the robot. Two robot arms with grippers hold a pack above the conveyor; a dashed path leads to the crate, where a mark reads reward plus one.', s);
}

/* ───────────── write ───────────── */
const parts = { 'fig-a': figVideo(), 'fig-b': figPhysics(), 'fig-c': figRobot() };
const page = join(ROOT, 'index.html');
let html = readFileSync(page, 'utf8');
for (const [name, text] of Object.entries(parts)) {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(html)) throw new Error(`index.html has no ${name} markers`);
  html = html.replace(re, (_, a, b) => `${a}\n${text}\n${b}`);
}
writeFileSync(page, html);

/* the card shown when the link is shared, 1200 x 630. To refresh media/og.png after a change:
   chrome --headless --hide-scrollbars --window-size=1200,630 --screenshot=media/og.png tools/og-card.html */
writeFileSync(join(ROOT, 'tools', 'og-card.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Model Utility: share card</title>
<link href="https://fonts.googleapis.com/css2?family=Gilda+Display&family=Instrument+Sans:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
<style>
html, body { width: 1200px; height: 630px; overflow: hidden; }
.card { position: relative; width: 1200px; height: 630px; padding: 60px 0 0 72px; }
.card .mark { gap: 14px; }
.card .logo { height: 44px; }
.card .mark span { font-size: 40px; }
.card h1 { font-size: 60px; line-height: 1.05; max-width: none; white-space: nowrap; margin-top: 80px; }
.card p { position: absolute; left: 72px; bottom: 60px; font-size: 16px; color: var(--ink-3); }
.card .fig { position: absolute; right: 60px; top: 150px; width: 470px; overflow: hidden; }
.card .fig text { font-size: 11.5px; }
</style></head>
<body><div class="card">
<div class="mark"><img class="logo" src="../media/mu-logo.png" alt=""><span>Model Utility</span></div>
<h1>Turning real-world<br>videos into <em>robot<br>training<br>environments.</em></h1>
<p>Entrepreneurs First · San Francisco</p>
${parts['fig-c']}
</div></body></html>
`);
console.log('wrote', Object.keys(parts).join(', '), 'into index.html, and tools/og-card.html');
