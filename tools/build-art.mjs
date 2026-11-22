#!/usr/bin/env node
/* Model Utility: draws the three hero figures and writes them into index.html (between the
   <!-- name:start --> / <!-- name:end --> markers), then writes the share card's page.
   Run from anywhere:  node tools/build-art.mjs
   The bench is the project's own stand-in scene (centrifuge, tube rack, bottle, beaker); the
   masses, the friction and the hinge range in Fig. 1b are the ones that scene carries.
   The logo is not drawn here: tools/make-logo.py makes its files from the source drawing. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INK = '#1d1a16', PAPER = '#f3efe7', RED = '#b8452c', PRINT = '#fdfcf9';

/* ───────────── projection: isometric, x runs right-down, y left-down, z up ───────────── */
const W = 420, H = 330, S = 185, C = Math.cos(Math.PI / 6), OX = 155.5, OY = 139;
const f = n => String(Math.round(n * 10) / 10);
const P = (x, y, z = 0) => [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S];
const pp = p => f(p[0]) + ' ' + f(p[1]);
const closed = pts => 'M' + pts.map(pp).join('L') + 'Z';
const open = pts => 'M' + pts.map(pp).join('L');
const RX = r => r * S * C * Math.SQRT2, RY = r => r * S * Math.SQRT1_2;   // a level circle becomes this ellipse

/* ───────────── three ways to draw the same solid ───────────── */
const PEN = {
  line: { face: `fill="${PAPER}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"`,
          detail: `fill="none" stroke="${INK}" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round" opacity=".5"` },
  mesh: { face: `fill="${PAPER}" stroke="${INK}" stroke-width=".95" stroke-linejoin="round"`,
          detail: `fill="none" stroke="${INK}" stroke-width=".5" stroke-linejoin="round" opacity=".4"` },
};
const TONE = {                       // [top, left face, right face], as in a soft black-and-white print
  dark:  ['#7d766a', '#4c463d', '#36312b'],
  light: ['#f8f5ef', '#d2cbbd', '#a9a292'],
  glass: ['#eceee9', '#cdd1ca', '#b2b7af'],
};

const face = (mode, mat, role, d) => mode === 'tone'
  ? `<path d="${d}" fill="${TONE[mat][role]}" stroke="${TONE[mat][role]}" stroke-width=".5" stroke-linejoin="round"/>`
  : `<path d="${d}" ${PEN[mode].face}/>`;
const detail = (mode, d, extra = '') => mode === 'tone'
  ? `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".7" opacity=".28" ${extra}/>`
  : `<path d="${d}" ${PEN[mode].detail} ${extra}/>`;

/* triangle lines across a four-sided face a-b-c-d, n cells along a-b and m along a-d */
function meshQuad(a, b, c, d, n, m) {
  const at = (u, v) => [
    (1 - u) * (1 - v) * a[0] + u * (1 - v) * b[0] + u * v * c[0] + (1 - u) * v * d[0],
    (1 - u) * (1 - v) * a[1] + u * (1 - v) * b[1] + u * v * c[1] + (1 - u) * v * d[1]];
  let s = '';
  for (let i = 1; i < n; i++) s += open([at(i / n, 0), at(i / n, 1)]);
  for (let j = 1; j < m; j++) s += open([at(0, j / m), at(1, j / m)]);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) s += open([at(i / n, j / m), at((i + 1) / n, (j + 1) / m)]);
  return s;
}

function box(mode, x0, y0, z0, x1, y1, z1, { mat = 'light', div = [1, 1, 1] } = {}) {
  const A = P(x0, y0, z1), B = P(x1, y0, z1), Cc = P(x1, y1, z1), D = P(x0, y1, z1);
  const E = P(x0, y1, z0), F = P(x1, y1, z0), G = P(x1, y0, z0);
  let s = face(mode, mat, 0, closed([A, B, Cc, D])) + face(mode, mat, 1, closed([D, Cc, F, E])) + face(mode, mat, 2, closed([Cc, B, G, F]));
  if (mode === 'mesh') s += detail(mode, meshQuad(A, B, Cc, D, div[0], div[1]) + meshQuad(D, Cc, F, E, div[0], div[2]) + meshQuad(Cc, B, G, F, div[1], div[2]));
  return s;
}

/* upright cylinder, or a cone section when r1 differs from r0 */
function cyl(mode, cx, cy, z0, z1, r0, { mat = 'light', r1 = r0, facets = 5, level = null, cap = true } = {}) {
  const [bx, by] = P(cx, cy, z0), [tx, ty] = P(cx, cy, z1);
  const rx0 = RX(r0), ry0 = RY(r0), rx1 = RX(r1), ry1 = RY(r1);
  const side = `M${f(tx - rx1)} ${f(ty)}L${f(bx - rx0)} ${f(by)}A${f(rx0)} ${f(ry0)} 0 0 0 ${f(bx + rx0)} ${f(by)}L${f(tx + rx1)} ${f(ty)}A${f(rx1)} ${f(ry1)} 0 0 1 ${f(tx - rx1)} ${f(ty)}Z`;
  const top = `cx="${f(tx)}" cy="${f(ty)}" rx="${f(rx1)}" ry="${f(ry1)}"`;
  let s;
  if (mode === 'tone') {
    s = `<path d="${side}" fill="url(#tone-${mat})"/>` + (cap ? `<ellipse ${top} fill="${TONE[mat][0]}"/>` : '');
  } else {
    s = `<path d="${side}" ${PEN[mode].face}/><ellipse ${top} ${PEN[mode].face}/>`;
    if (mode === 'mesh' && facets > 1) {
      const at = (k, x, y, rx, ry) => { const a = Math.PI * k / facets; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; };
      let d = '';
      for (let k = 1; k < facets; k++) d += open([at(k, tx, ty, rx1, ry1), at(k, bx, by, rx0, ry0)]);
      for (let k = 0; k < facets; k++) d += open([at(k, tx, ty, rx1, ry1), at(k + 1, bx, by, rx0, ry0)]);
      s += detail(mode, d);
    }
  }
  if (level !== null) {                                  // what is inside, seen through the glass
    const [lx, ly] = P(cx, cy, level);
    s += detail(mode, `M${f(lx - rx0)} ${f(ly)}A${f(rx0)} ${f(ry0)} 0 0 0 ${f(lx + rx0)} ${f(ly)}`);
  }
  return s;
}
const ring = (mode, cx, cy, z, r, pen) => { const [x, y] = P(cx, cy, z); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(RX(r))}" ry="${f(RY(r))}" ${pen}/>`; };

/* ───────────── the bench ───────────── */
const T = { X: 1.28, Y: 0.60, top: 0.40, th: 0.035, leg: 0.045, inset: 0.03 };
const CF = { x0: 0.08, y0: 0.13, x1: 0.38, y1: 0.43, body: 0.14, lid: 0.03 };
const RACK = { x0: 0.63, y0: 0.38, x1: 0.91, y1: 0.50, h: 0.055, xs: [0.68, 0.74, 0.80, 0.86], y: 0.44, r: 0.017, up: 0.085 };
const BOTTLE = { x: 1.12, y: 0.50 }, BEAKER = { x: 1.14, y: 0.345 };
const zb = T.top + CF.body, zl = zb + CF.lid, xm = (CF.x0 + CF.x1) / 2, ym = (CF.y0 + CF.y1) / 2;

function table(mode) {
  const { X, Y, top, th, leg, inset: i } = T, zs = top - th;
  let s = '';
  for (const [lx, ly] of [[i, i], [i, Y - i - leg], [X - i - leg, i], [X - i - leg, Y - i - leg]])
    s += box(mode, lx, ly, 0, lx + leg, ly + leg, zs, { mat: 'dark', div: [1, 1, 3] });
  return s + box(mode, 0, 0, zs, X, Y, top, { mat: 'dark', div: [9, 4, 1] });
}

function centrifuge(mode, lidOpen = false) {
  const { x0, y0, x1, y1 } = CF;
  let s = box(mode, x0, y0, T.top, x1, y1, zb, { div: [3, 3, 2] });
  const panel = closed([P(x0 + 0.04, y1, T.top + 0.095), P(x0 + 0.15, y1, T.top + 0.095), P(x0 + 0.15, y1, T.top + 0.045), P(x0 + 0.04, y1, T.top + 0.045)]);
  if (mode !== 'mesh') s += detail(mode, panel) + detail(mode, open([P(x0 + 0.19, y1, T.top + 0.07), P(x0 + 0.24, y1, T.top + 0.07)]));
  if (!lidOpen) {
    s += box(mode, x0, y0, zb, x1, y1, zl, { div: [3, 3, 1] });
    if (mode === 'tone') s += ring(mode, xm, ym, zl, 0.085, `fill="${TONE.light[1]}"`);
    if (mode === 'line') s += ring(mode, xm, ym, zl, 0.085, PEN.line.detail);
    return s;
  }
  // open: the rotor shows, and the lid stands on its hinge along the back-left edge
  s += ring(mode, xm, ym, zb, 0.118, PEN.line.face) + ring(mode, xm, ym, zb, 0.092, PEN.line.detail);
  for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; s += ring(mode, xm + Math.cos(a) * 0.058, ym + Math.sin(a) * 0.058, zb, 0.015, PEN.line.detail); }
  s += ring(mode, xm, ym, zb, 0.02, PEN.line.face);
  return s + lid(mode, LID_OPEN);
}
const LID_OPEN = 62 * Math.PI / 180;
function lidQuads(th) {
  const { x0, y0, y1, x1, lid: t } = CF, L = x1 - x0, c = Math.cos(th), sn = Math.sin(th);
  const xf = x0 + L * c, zf = zb + L * sn, nx = -sn * t, nz = c * t;
  return {
    inner: [P(x0, y0, zb), P(x0, y1, zb), P(xf, y1, zf), P(xf, y0, zf)],
    edge: [P(x0, y1, zb), P(xf, y1, zf), P(xf + nx, y1, zf + nz), P(x0 + nx, y1, zb + nz)],
    tip: [P(xf, y0, zf), P(xf, y1, zf), P(xf + nx, y1, zf + nz), P(xf + nx, y0, zf + nz)],
  };
}
function lid(mode, th) {
  const q = lidQuads(th);
  return face(mode, 'light', 0, closed(q.tip)) + face(mode, 'light', 1, closed(q.edge)) + face(mode, 'light', 2, closed(q.inner));
}

function rack(mode, missing = -1) {
  const { x0, y0, x1, y1, h, xs, y, r, up } = RACK, z = T.top + h;
  let s = box(mode, x0, y0, T.top, x1, y1, z, { div: [4, 1, 1] });
  xs.forEach((x, i) => {
    s += i === missing ? ring(mode, x, y, z, r, mode === 'tone' ? `fill="${TONE.light[2]}"` : PEN[mode].detail)
                       : cyl(mode, x, y, z, z + up, r, { facets: 2 });
  });
  return s;
}
function bottle(mode) {
  const { x, y } = BOTTLE, z = T.top;
  return cyl(mode, x, y, z, z + 0.115, 0.048, { facets: 5, cap: mode !== 'tone' }) + cyl(mode, x, y, z + 0.115, z + 0.145, 0.048, { r1: 0.02, facets: 5 })
       + cyl(mode, x, y, z + 0.145, z + 0.165, 0.02, { facets: 1 }) + cyl(mode, x, y, z + 0.165, z + 0.19, 0.026, { facets: 1 });
}
const beaker = mode => cyl(mode, BEAKER.x, BEAKER.y, T.top, T.top + 0.095, 0.052, { mat: 'glass', facets: 5, level: T.top + 0.05 });

/* the floor: a faint grid that fades out toward the edges */
function grid(id) {
  let d = '';
  for (let y = -0.45; y <= 1.06; y += 0.15) d += open([P(-0.45, y), P(1.8, y)]);
  for (let x = -0.45; x <= 1.81; x += 0.15) d += open([P(x, -0.45), P(x, 1.05)]);
  const [cx, cy] = P(0.64, 0.30);
  return `<defs><radialGradient id="${id}-g" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy + 14)}" r="205" gradientTransform="translate(0 ${f(cy * 0.42)}) scale(1 .58)"><stop offset=".25" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#${id}-g)"/></mask></defs>`
       + `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".5" opacity=".2" mask="url(#${id}-m)"/>`;
}

const star = (cx, cy, R, k = 0.37) => {
  const pts = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? R * k : R; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return closed(pts);
};
const svg = (label, body) => `<svg class="fig" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${body}</svg>`;
const note = (x, y, text, anchor = 'start') => `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${text}</text>`;
const lead = pts => `<path d="${open(pts)}" fill="none" stroke="${RED}" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/>`;

/* ───────────── Fig. 1a: photographs ───────────── */
function figPhotos() {
  const [fx, fy] = P(0, T.Y), [bx, by] = P(T.X, 0);
  const shadow = closed([P(0.02, 0.02), P(T.X + 0.1, 0.02), P(T.X + 0.1, T.Y + 0.1), P(0.02, T.Y + 0.1)]);
  const grads = Object.entries(TONE).map(([k, m]) => `<linearGradient id="tone-${k}" x1="0" x2="1"><stop offset=".1" stop-color="${m[1]}"/><stop offset=".9" stop-color="${m[2]}"/></linearGradient>`).join('');
  const bench = `<g id="bench-tone"><rect x="-400" y="-400" width="1300" height="1200" fill="#d9d2c4"/><path d="${shadow}" fill="#b9b1a1"/>`
    + table('tone') + centrifuge('tone') + rack('tone') + beaker('tone') + bottle('tone') + '</g>';
  const shots = [
    { x: 22, y: 34, w: 238, h: 170, rot: -6, at: P(0.64, 0.30, 0.42), k: 0.72 },
    { x: 238, y: 20, w: 162, h: 122, rot: 5, at: P(xm, ym, 0.50), k: 1.3 },
    { x: 30, y: 192, w: 172, h: 124, rot: 6, at: P(1.12, 0.42, 0.47), k: 1.7 },
    { x: 190, y: 152, w: 206, h: 154, rot: -3, at: P(0.78, 0.44, 0.49), k: 1.55 },
  ];
  let defs = grads + bench, body = '';
  shots.forEach((p, i) => {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, m = 6;
    defs += `<clipPath id="shot-${i}"><rect x="${p.x + m}" y="${p.y + m}" width="${p.w - 2 * m}" height="${p.h - 2 * m}"/></clipPath>`;
    body += `<g transform="rotate(${p.rot} ${f(cx)} ${f(cy)})">`
      + `<rect x="${p.x + 1.5}" y="${p.y + 2.5}" width="${p.w}" height="${p.h}" fill="${INK}" opacity=".13"/>`
      + `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${PRINT}" stroke="${INK}" stroke-opacity=".3" stroke-width=".6"/>`
      + `<g clip-path="url(#shot-${i})"><use href="#bench-tone" transform="translate(${f(cx)} ${f(cy)}) scale(${p.k}) translate(${f(-p.at[0])} ${f(-p.at[1])})"/></g>`
      + `</g>`;
  });
  return svg('Four overlapping photographs of a laboratory bench with a centrifuge, a rack of tubes, a bottle and a beaker.', `<defs>${defs}</defs>${body}`);
}

/* ───────────── Fig. 1b: geometry, with physics ───────────── */
function com([x, y], r = 4.3) {                        // centre-of-mass mark
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${PAPER}" stroke="${RED}" stroke-width=".8"/>`
       + `<path d="M${f(x)} ${f(y)}V${f(y - r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}ZM${f(x)} ${f(y)}V${f(y + r)}A${r} ${r} 0 0 1 ${f(x - r)} ${f(y)}Z" fill="${RED}"/>`;
}
function figPhysics() {
  const z = T.top;
  let s = grid('gb') + table('mesh') + centrifuge('mesh') + rack('mesh') + beaker('mesh') + bottle('mesh');
  // the lid swings on a hinge: ghost of the open lid, and the arc its edge travels
  const q = lidQuads(LID_OPEN), L = CF.x1 - CF.x0, arc = [];
  for (let a = 0; a <= LID_OPEN + 1e-6; a += LID_OPEN / 14) arc.push(P(CF.x0 + L * Math.cos(a), CF.y1, zl + L * Math.sin(a)));
  s += `<path d="${closed(q.inner)}${closed(q.edge)}${closed(q.tip)}" fill="none" stroke="${RED}" stroke-width=".8" stroke-dasharray="3 3" stroke-linejoin="round"/>`
     + `<path d="${open(arc)}" fill="none" stroke="${RED}" stroke-width=".8" stroke-linecap="round"/>`;
  const tipTop = q.tip[3];
  s += note(tipTop[0] - 12, tipTop[1] + 4, 'hinge 0–92°', 'end');
  // masses
  const cC = P(xm, ym, z + 0.085), cR = P(0.77, RACK.y, z + 0.028), cT = P(RACK.xs[3], RACK.y, z + RACK.h + RACK.up);
  s += lead([cC, [226, 46], [236, 46]]) + com(cC) + note(241, 50, '12.2 kg');
  s += lead([cR, [118, 262]]) + com(cR) + note(114, 277, '246 g', 'end');
  s += lead([[cT[0], cT[1] - 2], [292, 104], [304, 104]]) + `<circle cx="${f(cT[0])}" cy="${f(cT[1] - 2)}" r="1.6" fill="${RED}"/>` + note(309, 108, '13.6 g');
  s += com(P(BOTTLE.x, BOTTLE.y, z + 0.06)) + com(P(BEAKER.x, BEAKER.y, z + 0.045));
  // friction of the bench top, and gravity
  const fr = P(1.17, 0.12, z);
  s += lead([fr, [fr[0] + 30, fr[1] - 50], [fr[0] + 38, fr[1] - 50]]) + `<circle cx="${f(fr[0])}" cy="${f(fr[1])}" r="1.6" fill="${RED}"/>` + note(fr[0] + 43, fr[1] - 46, 'μ 0.5');
  s += `<path d="M392 26V62M388 55.5L392 62.5 396 55.5" fill="none" stroke="${RED}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"/>` + note(383, 40, 'g', 'end');
  return svg('The same bench as a wire mesh. Each object carries a mass, the lid of the centrifuge turns on a hinge, the bench top has friction, and gravity points down.', s);
}

/* ───────────── Fig. 1c: a robot at work, commanded by an agent ───────────── */
function link(a, b, wa, wb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
  const q = [[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]];
  const t = (wa + 6) / l, u = 1 - (wb + 6) / l;
  return `<path d="${closed(q)}" ${PEN.line.face}/>` + `<path d="${open([[a[0] + dx * t, a[1] + dy * t], [a[0] + dx * u, a[1] + dy * u]])}" ${PEN.line.detail}/>`;
}
const joint = ([x, y], r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" ${PEN.line.face}/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.55)}" ${PEN.line.detail}/><circle cx="${f(x)}" cy="${f(y)}" r="1.5" fill="${INK}"/>`;

function figRobot() {
  const z = T.top, bx = 1.10, by = 0.14;
  const ap = (t, h) => P(bx - t, by + t, h);            // the arm works in the plane that faces the viewer
  const J1 = ap(0, z + 0.135), J2 = ap(0.055, 0.905), J3 = ap(0.30, 0.80), G = ap(0.30, 0.69);
  const tubeTop = 0.676, tubeX = RACK.xs[2];
  let s = grid('gc') + table('line') + centrifuge('line', true) + rack('line', 2);
  // arm
  s += cyl('line', bx, by, z, z + 0.04, 0.068) + cyl('line', bx, by, z + 0.04, z + 0.10, 0.046);
  s += link(J1, J2, 17, 14) + link(J2, J3, 13, 10) + link(J3, G, 8, 8);
  s += joint(J1, 11.5) + joint(J2, 10) + joint(J3, 7.5);
  // the tube it holds, then the gripper over it
  s += cyl('line', tubeX, RACK.y, tubeTop - 0.10, tubeTop, RACK.r);
  const g = `fill="${PAPER}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"`;
  s += `<rect x="${f(G[0] - 10.5)}" y="${f(G[1] - 3.5)}" width="21" height="7" rx="1.2" ${g}/>`
     + `<rect x="${f(G[0] - 9)}" y="${f(G[1] + 3.5)}" width="3.2" height="11" ${g}/><rect x="${f(G[0] + 5.8)}" y="${f(G[1] + 3.5)}" width="3.2" height="11" ${g}/>`;
  s += beaker('line') + bottle('line');
  // where the tube is going
  const from = [G[0] - 15, G[1] + 14], to = P(xm + 0.058 * Math.cos(Math.PI / 6), ym + 0.058 * Math.sin(Math.PI / 6), zb);
  const end = [to[0] + 3, to[1] - 5], ctl = [(from[0] + end[0]) / 2 + 10, Math.min(from[1], end[1]) - 46];
  const dx = end[0] - ctl[0], dy = end[1] - ctl[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  s += `<path d="M${pp(from)}Q${pp(ctl)} ${pp(end)}" fill="none" stroke="${RED}" stroke-width="1.1" stroke-dasharray="3 4" stroke-linecap="round"/>`
     + `<path d="${closed([end, [end[0] - ux * 7 - uy * 3, end[1] - uy * 7 + ux * 3], [end[0] - ux * 7 + uy * 3, end[1] - uy * 7 - ux * 3]])}" fill="${RED}"/>`;
  // the agent, and the order it sends
  const A = [366, 44], tx = J2[0] - A[0], ty = J2[1] - A[1], tl = Math.hypot(tx, ty);
  s += lead([[A[0] + tx / tl * 15, A[1] + ty / tl * 15], [J2[0] - tx / tl * 15, J2[1] - ty / tl * 15]])
     + `<circle cx="${f(J2[0] - tx / tl * 15)}" cy="${f(J2[1] - ty / tl * 15)}" r="1.8" fill="${RED}"/>`
     + `<path d="${star(A[0], A[1], 10)}" fill="${RED}"/>` + note(A[0], A[1] - 18, 'agent', 'middle');
  return svg('The same bench, with a robot arm on it. The arm lifts a tube out of the rack and carries it toward the open centrifuge. A spark marked agent is linked to the arm.', s);
}

/* ───────────── write ───────────── */
const parts = { 'fig-a': figPhotos(), 'fig-b': figPhysics(), 'fig-c': figRobot() };
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
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400..600;1,400..600&family=Martian+Mono:wdth,wght@75..112.5,300..500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
<style>
html, body { width: 1200px; height: 630px; overflow: hidden; }
.card { position: relative; width: 1200px; height: 630px; padding: 62px 0 0 72px; }
.card .mark { gap: 14px; }
.card .logo { height: 44px; }
.card .mark span { font-size: 36px; }
.card h1 { font-size: 55px; line-height: 1.03; max-width: 9.4em; margin-top: 84px; }
.card .eyebrow { position: absolute; left: 72px; bottom: 58px; margin: 0; font-size: 12px; }
.card .fig { position: absolute; right: 30px; top: 92px; width: 610px; }
.card .fig text { font-size: 11.5px; }
</style></head>
<body><div class="card">
<div class="mark"><img class="logo" src="../media/mu-logo.png" alt=""><span>Model Utility</span></div>
<h1>The environment where agents run physical experiments and train robots, <em>on their own.</em></h1>
<p class="eyebrow">From photographs to a 3D environment with physics</p>
${parts['fig-c']}
</div></body></html>
`);
console.log('wrote', Object.keys(parts).join(', '), 'into index.html, and tools/og-card.html');
