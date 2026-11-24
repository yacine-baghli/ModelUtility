/* Model Utility: the drawing kit and the packing-line scene.
   Pure functions that return SVG text, so the same scene can be drawn for the site's figures
   (tools/build-art.mjs) and, frame by frame, for the film.
   The scene is our own stand-in: a conveyor carrying snack packs, and a stack of crates beside it.
   Every number written on the drawings (masses, friction, belt speed) is illustrative. */

export const INK = '#161816', PAPER = '#f3efe7', RED = '#e5480e', PRINT = '#fbf8f2';     // the pitch deck's ink, paper and orange
export const W = 420, H = 330;

/* ───────────── projection: isometric, x runs right-down, y left-down, z up ───────────── */
const C = Math.cos(Math.PI / 6);
const V = { S: 270, OX: 48.3, OY: 87.6 };                       // pixels per unit, and where (0,0,0) lands
export const setView = (S, OX, OY) => Object.assign(V, { S, OX, OY });
export const f = n => String(Math.round(n * 10) / 10);
export const P = (x, y, z = 0) => [V.OX + (x - y) * C * V.S, V.OY + (x + y) * 0.5 * V.S - z * V.S];
export const pp = p => f(p[0]) + ' ' + f(p[1]);
export const closed = pts => 'M' + pts.map(pp).join('L') + 'Z';
export const open = pts => 'M' + pts.map(pp).join('L');

/* ───────────── three ways to draw the same solid ───────────── */
const PEN = {
  line: { face: `fill="${PAPER}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"`,
          detail: `fill="none" stroke="${INK}" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round" opacity=".5"` },
  mesh: { face: `fill="${PAPER}" stroke="${INK}" stroke-width=".95" stroke-linejoin="round"`,
          detail: `fill="none" stroke="${INK}" stroke-width=".5" stroke-linejoin="round" opacity=".4"` },
};
export const TONE = {                // [top, left face, right face], as in a soft black-and-white print
  dark:  ['#7d766a', '#4c463d', '#36312b'],
  light: ['#f8f5ef', '#d2cbbd', '#a9a292'],
  steel: ['#dcd7cb', '#9a9386', '#7a7468'],
  crate: ['#a59e90', '#6f695e', '#565048'],
  inner: ['#857e71', '#5f594f', '#4a453d'],
};
export const FLOOR = '#b9b2a4', SHADE = '#a39c8e', BAND = '#8a8377';

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

export function box(mode, x0, y0, z0, x1, y1, z1, { mat = 'light', div = [1, 1, 1] } = {}) {
  const A = P(x0, y0, z1), B = P(x1, y0, z1), Cc = P(x1, y1, z1), D = P(x0, y1, z1);
  const E = P(x0, y1, z0), F = P(x1, y1, z0), G = P(x1, y0, z0);
  let s = face(mode, mat, 0, closed([A, B, Cc, D])) + face(mode, mat, 1, closed([D, Cc, F, E])) + face(mode, mat, 2, closed([Cc, B, G, F]));
  if (mode === 'mesh') s += detail(mode, meshQuad(A, B, Cc, D, div[0], div[1]) + meshQuad(D, Cc, F, E, div[0], div[2]) + meshQuad(Cc, B, G, F, div[1], div[2]));
  return s;
}

/* ───────────── the packing line ───────────── */
export const LINE = { x0: -0.7, x1: 2.3, y0: 0.06, y1: 0.40, top: 0.40, th: 0.05, leg: 0.045, edge: 0.025, slat: 0.08 };
export const PACK = { l: 0.10, w: 0.07, h: 0.028 };
export const CRATE = { x0: 1.16, y0: 0.46, x1: 1.50, y1: 0.70, h: 0.20 };
export const BELT_PACKS = [
  [-0.12, 0.10], [-0.10, 0.21], [0.02, 0.095], [0.03, 0.30], [0.16, 0.12], [0.17, 0.24],
  [0.36, 0.10], [0.38, 0.20], [0.49, 0.095], [0.48, 0.29],
  [0.92, 0.11], [0.95, 0.27], [1.07, 0.10], [1.08, 0.20],
  [1.30, 0.12], [1.33, 0.25], [1.45, 0.10], [1.60, 0.21], [1.62, 0.30],
];
export const HELD = { x: 0.72, y: 0.30, lift: 0.06 };        // the pack in the hands, or in the grippers

/* phase: how far the belt has run, in scene units; the slats and the packs ride on it */
export function conveyor(mode, phase = 0) {
  const { x0, x1, y0, y1, top, th, leg, edge, slat } = LINE, zs = top - th;
  let s = '';
  for (let lx = x0 + 0.1; lx < x1; lx += 0.6) for (const ly of [y0 + 0.03, y1 - 0.03 - leg])
    s += box(mode, lx, ly, 0, lx + leg, ly + leg, zs, { mat: 'dark', div: [1, 1, 3] });
  s += box(mode, x0, y0, zs, x1, y1, top, { mat: 'steel', div: [30, 3, 1] });
  if (mode !== 'mesh') {
    let d = open([P(x0, y0 + edge, top), P(x1, y0 + edge, top)]) + open([P(x0, y1 - edge, top), P(x1, y1 - edge, top)]);
    for (let x = x0 + (((phase % slat) + slat) % slat); x < x1; x += slat) d += open([P(x, y0 + edge, top), P(x, y1 - edge, top)]);
    s += detail(mode, d);
  }
  return s;
}

export function pack(mode, x, y, z = LINE.top) {
  const { l, w, h } = PACK;
  let s = box(mode, x, y, z, x + l, y + w, z + h, { div: [2, 1, 1] });
  const band = closed([P(x + l * 0.36, y, z + h), P(x + l * 0.64, y, z + h), P(x + l * 0.64, y + w, z + h), P(x + l * 0.36, y + w, z + h)]);
  if (mode === 'tone') s += `<path d="${band}" fill="${BAND}"/>`;
  if (mode === 'line') s += `<path d="${band}" ${PEN.line.detail}/>`;
  return s;
}
export const packCentre = (x, y, z = LINE.top) => P(x + PACK.l / 2, y + PACK.w / 2, z + PACK.h);

/* packs lying on the belt, far ones first */
export function beltPacks(mode, phase = 0, list = BELT_PACKS) {
  return [...list].sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).map(([x, y]) => pack(mode, x + phase, y)).join('');
}

/* a crate; open ones show their far walls, their floor and what lies inside */
export function crate(mode, x0, y0, z0, x1, y1, z1, { shut = false, inside = '' } = {}) {
  if (shut) {
    return box(mode, x0, y0, z0, x1, y1, z1, { mat: 'crate', div: [3, 2, 2] })
      + (mode === 'mesh' ? '' : detail(mode, open([P(x0, y1, z1 - 0.03), P(x1, y1, z1 - 0.03), P(x1, y0, z1 - 0.03)])));
  }
  const t = 0.014, zf = z0 + t;
  const iA = P(x0 + t, y0 + t, z1), iB = P(x1 - t, y0 + t, z1), iC = P(x1 - t, y1 - t, z1), iD = P(x0 + t, y1 - t, z1);
  const fA = P(x0 + t, y0 + t, zf), fB = P(x1 - t, y0 + t, zf), fC = P(x1 - t, y1 - t, zf), fD = P(x0 + t, y1 - t, zf);
  let s = face(mode, 'inner', 1, closed([iA, iD, fD, fA])) + face(mode, 'inner', 2, closed([iA, iB, fB, fA])) + face(mode, 'inner', 0, closed([fA, fB, fC, fD]));
  s += inside;
  const A = P(x0, y0, z1), B = P(x1, y0, z1), Cc = P(x1, y1, z1), D = P(x0, y1, z1), E = P(x0, y1, z0), F = P(x1, y1, z0), G = P(x1, y0, z0);
  s += face(mode, 'crate', 1, closed([D, Cc, F, E])) + face(mode, 'crate', 2, closed([Cc, B, G, F]));
  if (mode === 'mesh') s += detail(mode, meshQuad(D, Cc, F, E, 3, 2) + meshQuad(Cc, B, G, F, 2, 2));
  const rim = closed([A, B, Cc, D]) + closed([iA, iD, iC, iB]);
  s += mode === 'tone' ? `<path d="${rim}" fill-rule="evenodd" fill="${TONE.crate[0]}"/>` : `<path d="${rim}" fill-rule="evenodd" ${PEN[mode].face}/>`;
  return s;
}

/* where the n-th pack placed in the crate comes to rest */
export function crateSlot(n) {
  const { x0, y0, h } = CRATE, col = n % 3, row = Math.floor(n / 3) % 3;
  return [x0 + 0.02 + col * 0.103, y0 + 0.02 + row * 0.072, 2 * h - 0.085];
}
export function crates(mode, filled = 5) {
  const { x0, y0, x1, y1, h } = CRATE;
  let inside = '';
  for (let n = 0; n < filled; n++) { const [x, y, z] = crateSlot(n); inside += pack(mode, x, y, z); }
  return crate(mode, x0, y0, 0, x1, y1, h, { shut: true }) + crate(mode, x0, y0, h, x1, y1, 2 * h, { inside });
}
export const crateMouth = () => P((CRATE.x0 + CRATE.x1) / 2, (CRATE.y0 + CRATE.y1) / 2, 2 * CRATE.h);

/* the whole line. held: null, or { x, y, z } for the pack that has left the belt */
export function line(mode, { phase = 0, held = { x: HELD.x, y: HELD.y, z: LINE.top + HELD.lift }, filled = 5, packs = BELT_PACKS } = {}) {
  return conveyor(mode, phase) + beltPacks(mode, phase, packs) + (held ? pack(mode, held.x, held.y, held.z) : '') + crates(mode, filled);
}

/* shadows on the floor, for the toned version */
export function shadows() {
  const { x0, x1, y0, y1 } = LINE, c = CRATE;
  return `<path d="${closed([P(x0, y0 + 0.05), P(x1, y0 + 0.05), P(x1, y1 + 0.09), P(x0, y1 + 0.09)])}${closed([P(c.x0 + 0.03, c.y0 + 0.03), P(c.x1 + 0.07, c.y0 + 0.03), P(c.x1 + 0.07, c.y1 + 0.07), P(c.x0 + 0.03, c.y1 + 0.07)])}" fill="${SHADE}"/>`;
}

/* the floor: a faint grid */
export function grid(lo = -1.2, hi = 3) {
  let d = '';
  for (let v = lo; v <= hi + 1e-6; v += 0.15) d += open([P(lo, v), P(hi, v)]) + open([P(v, lo), P(v, hi)]);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".5" opacity=".2"/>`;
}

/* ───────────── marks and notes ───────────── */
export const star = (cx, cy, R, k = 0.37) => {
  const pts = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? R * k : R; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return closed(pts);
};
export const note = (x, y, text, anchor = 'start') => `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${text}</text>`;
export const lead = pts => `<path d="${open(pts)}" fill="none" stroke="${RED}" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/>`;
export const dot = ([x, y], r = 1.6) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${RED}"/>`;
export function com([x, y], r = 4.3) {                    // centre-of-mass mark
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${PAPER}" stroke="${RED}" stroke-width=".8"/>`
       + `<path d="M${f(x)} ${f(y)}V${f(y - r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}ZM${f(x)} ${f(y)}V${f(y + r)}A${r} ${r} 0 0 1 ${f(x - r)} ${f(y)}Z" fill="${RED}"/>`;
}
/* the outline of a box, dashed: what the simulator collides with */
export function hull(x0, y0, z0, x1, y1, z1, g = 0.012) {
  const a = [x0 - g, y0 - g, z0, x1 + g, y1 + g, z1 + g];
  const A = P(a[0], a[1], a[5]), B = P(a[3], a[1], a[5]), Cc = P(a[3], a[4], a[5]), D = P(a[0], a[4], a[5]), E = P(a[0], a[4], a[2]), F = P(a[3], a[4], a[2]), G = P(a[3], a[1], a[2]);
  return `<path d="${closed([A, B, Cc, D])}${open([D, E, F, Cc])}${open([F, G, B])}" fill="none" stroke="${RED}" stroke-width=".8" stroke-dasharray="3 2.5" stroke-linejoin="round"/>`;
}
export function arrow(from, ctl, to, { dash = '3 4', width = 1.1 } = {}) {
  const dx = to[0] - ctl[0], dy = to[1] - ctl[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  return `<path d="M${pp(from)}Q${pp(ctl)} ${pp(to)}" fill="none" stroke="${RED}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linecap="round"/>`
       + `<path d="${closed([to, [to[0] - ux * 7 - uy * 3, to[1] - uy * 7 + ux * 3], [to[0] - ux * 7 + uy * 3, to[1] - uy * 7 - ux * 3]])}" fill="${RED}"/>`;
}
export const tick = (x, y, k = 1) => `<path d="M${f(x)} ${f(y)}l${f(3.2 * k)} ${f(3.4 * k)} ${f(6 * k)} ${f(-7.4 * k)}" fill="none" stroke="${RED}" stroke-width="${f(1.5 * k)}" stroke-linecap="round" stroke-linejoin="round"/>`;

/* ───────────── two hands, or two arms, reaching in from where the viewer stands ───────────── */
const quad = (a, b, wa, wb) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  return [[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]];
};
const deg = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;

/* a person's forearm and hand, toned; `to` is the point the fingers close on */
export function hand(from, to, side = 1) {
  const dx = to[0] - from[0], dy = to[1] - from[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  const wrist = [to[0] - ux * 27, to[1] - uy * 27], palm = [to[0] - ux * 11, to[1] - uy * 11], a = deg(from, to);
  const thumb = [palm[0] + ux * 7 + uy * 11 * side, palm[1] + uy * 7 - ux * 11 * side];
  return `<path d="${closed(quad(from, wrist, 46, 27))}" fill="#5f594f"/>`
       + `<path d="${closed(quad([wrist[0] - ux * 10, wrist[1] - uy * 10], wrist, 29, 27))}" fill="${TONE.dark[1]}"/>`
       + `<ellipse cx="${f(palm[0])}" cy="${f(palm[1])}" rx="18" ry="12.5" transform="rotate(${f(a)} ${f(palm[0])} ${f(palm[1])})" fill="#e9e2d6"/>`
       + `<ellipse cx="${f(thumb[0])}" cy="${f(thumb[1])}" rx="9" ry="4.6" transform="rotate(${f(a - 26 * side)} ${f(thumb[0])} ${f(thumb[1])})" fill="#d8d0c2"/>`;
}

function link(a, b, wa, wb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), t = (wa + 6) / l, u = 1 - (wb + 6) / l;
  return `<path d="${closed(quad(a, b, wa, wb))}" ${PEN.line.face}/>` + (u > t ? `<path d="${open([[a[0] + dx * t, a[1] + dy * t], [a[0] + dx * u, a[1] + dy * u]])}" ${PEN.line.detail}/>` : '');
}
const joint = ([x, y], r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" ${PEN.line.face}/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.55)}" ${PEN.line.detail}/><circle cx="${f(x)}" cy="${f(y)}" r="1.5" fill="${INK}"/>`;

/* a robot arm in line: shoulder (out of view), elbow, wrist, and a two-finger gripper closing on `to`.
   grip: 0 open, 1 closed */
export function arm(shoulder, elbow, to, { grip = 1 } = {}) {
  const dx = to[0] - elbow[0], dy = to[1] - elbow[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  const wrist = [to[0] - ux * 27, to[1] - uy * 27], a = deg(elbow, to), gap = 6.5 + (1 - grip) * 5;
  const g = `fill="${PAPER}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`;
  return link(shoulder, elbow, 30, 24) + link(elbow, wrist, 21, 15)
       + `<g transform="translate(${f(wrist[0])} ${f(wrist[1])}) rotate(${f(a)})">`
       + `<rect x="5" y="${f(-gap - 5)}" width="7" height="${f(2 * gap + 10)}" rx="1.2" ${g}/>`
       + `<rect x="12" y="${f(-gap - 4.4)}" width="19" height="4.4" rx="1" ${g}/><rect x="12" y="${f(gap)}" width="19" height="4.4" rx="1" ${g}/></g>`
       + joint(elbow, 12.5) + joint(wrist, 8.5);
}
