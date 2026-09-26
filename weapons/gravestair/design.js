'use strict';
// Gravestair: first weapon of the Cairnwrought collection (style guide: IDENTITY.md).
// Axes (weaponkit): blade +Y, forward edge -Z, flats +-X, origin at grip centre.
// Profile work is done in (y, z) pairs; P(y, z, x) lifts them into 3D.
//
// Part names say what the part does, then which side it is on:
//   Fwd   = forward-edge side (-Z)      Spine = spine side (+Z)
//   PX    = +X flat (the show side, where the lashing is knotted)      NX = -X flat

const { Model, add, sub, scale, norm, cross, dot, len, lerp, angles, fromAxes } = require('../../tools/weaponkit/lib');

const m = new Model({
  name: 'Gravestair',
  collection: 'Cairnwrought',
  description: 'A single-edged greatsword whose forge-black spine steps in, course by course, to a clipped point.',
  handle: 'Handle',
  // Hand centred on the wrap: a Roblox hand/forearm is a 1-stud box running back along +Z from
  // here, so it spans y -0.5..0.5 and stays clear of the throat (0.60) and the spine-side
  // quillon (lowest corner 0.512).
  grip: { pos: [0, 0, 0] },
  render: { hilt: [0, 0.43], tip: [0.72, 1] },
});

// ---------- palette ----------
const S = {
  edge: { color: '#878c8f', material: 'Metal' }, // ground edge: the only bright steel
  flat: { color: '#54585b', material: 'Metal' }, // draw-filed flats, ricasso, tang, pins
  black: { color: '#2b2c2e', material: 'CorrodedMetal' }, // forge-black spine rib
  fuller: { color: '#383b3e', material: 'CorrodedMetal' }, // fuller floor, left in forge scale
  iron: { color: '#2a2928', material: 'CorrodedMetal' }, // blackened iron fittings
  leather: { color: '#3f3229', material: 'Fabric' }, // grip leather
  cord: { color: '#251d18', material: 'Fabric' }, // raised wrap cord
  ochre: { color: '#6e4230', material: 'Fabric' }, // the one accent: burial-ochre lashing
};

// ---------- helpers ----------
const X = [1, 0, 0];
const P = (y, z, x = 0) => [x, y, z];
const s2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const a2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const k2 = (a, k) => [a[0] * k, a[1] * k];
const d2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const cr2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const n2 = (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
function meet(p, d, q, e) {
  const den = cr2(d, e);
  if (Math.abs(den) < 1e-9) throw new Error('parallel lines');
  return a2(p, k2(d, cr2(s2(q, p), e) / den));
}
// Unit normal of segment a->b (in y,z) that points toward `inside`.
function inward(a, b, inside) {
  const d = n2(s2(b, a));
  const n = [-d[1], d[0]];
  return d2(n, s2(inside, a)) > 0 ? n : k2(n, -1);
}
const zbox = (name, y0, y1, z0, z1, th, style) =>
  m.block(name, [th, y1 - y0, z1 - z0], [0, (y0 + y1) / 2, (z0 + z1) / 2], undefined, style);

// Mirror copies with explicit Explorer names: the copy's name swaps one side tag for the other.
const mir = (p, axis, from, to) => {
  if (!p.name.includes(from)) throw new Error(`${p.name}: no "${from}" to swap`);
  return m.mirror(p, axis, p.name.replace(from, to));
};
// Tag +X parts with PX and add their -X twins as NX.
const flats = (parts) => parts.map((p) => { p.name += 'PX'; return mir(p, 'x', 'PX', 'NX'); });
// Rename the pieces m.triangle() returns (A/B) as 1/2.
const tri = (name, a, b, c, depth, style) =>
  m.triangle(name, a, b, c, depth, style).map((p, i, all) => { p.name = all.length > 1 ? `${name}${i + 1}` : name; return p; });

/**
 * Trapezoid a-b-c-d (a->b parallel to d->c, same direction) as one block plus up to two
 * right-angle wedges. With `out` (a rough outward direction) the slab's OUTER face lies on the
 * quad, so it can skin a bevel plane; without it the slab is centred on the quad. The block is
 * named `name`; the end wedges `name + ends[0]` (the a/d end) and `name + ends[1]` (the b/c end).
 */
function trap(name, a, b, c, d, depth, style, out, ends = ['Start', 'End']) {
  let [p0, p1, q0, q1] = [a, b, d, c];
  if (len(sub(b, a)) > len(sub(c, d))) [p0, p1, q0, q1] = [d, c, a, b];
  const u = norm(sub(p1, p0));
  if (len(cross(u, norm(sub(q1, q0)))) > 1e-6) throw new Error(`${name}: sides are not parallel`);
  const foot = (pt) => add(q0, scale(u, dot(sub(pt, q0), u)));
  const f0 = foot(p0), f1 = foot(p1);
  const t0 = dot(sub(f0, q0), u), t1 = dot(sub(f1, q0), u), L = len(sub(q1, q0));
  if (t0 < -1e-4 || t1 > L + 1e-4) throw new Error(`${name}: trapezoid leans past its long side`);
  const wv = sub(f0, p0), w = len(wv);
  const Z = scale(wv, 1 / w);
  const Xa = cross(u, Z);
  let off = [0, 0, 0];
  if (out) off = scale(dot(Xa, out) > 0 ? Xa : scale(Xa, -1), -depth / 2);
  const o = (pt) => add(pt, off);
  const parts = [m.block(name, [depth, len(sub(p1, p0)), w], o(scale(add(p0, f1), 0.5)), fromAxes(Xa, u, Z), style)];
  if (t0 > 0.002) parts.push(m.rightWedge(`${name}${ends[0]}`, o(f0), o(p0), o(q0), depth, style));
  if (L - t1 > 0.002) parts.push(m.rightWedge(`${name}${ends[1]}`, o(f1), o(p1), o(q1), depth, style));
  return parts;
}

// ---------- stations along Y ----------
const Y = {
  peen: -1.19, foot: -1.14, bodyLo: -1.0, bodyHi: -0.8, crown: -0.72, ferrule: -0.62,
  gripLo: -0.68, gripHi: 0.68,
  throat: 0.6, hubLo: 0.72, hubHi: 0.98, seat: 1.05, sill: 1.1,
  winTop: 1.4, ricTop: 1.47, blade: 1.62,
  nick0: 2.02, nick1: 2.14,
  t2: 2.96, t3: 4.14,
  fullerLo: 1.76, fullerHi: 4.0,
  point: 5.52,
};

// ---------- blade section ----------
const ZE = -0.38; // forward edge line, shoulder to the rise
const BEV = 0.17; // ground bevel width
const ZB = ZE + BEV; // where the bevel meets the flat
const TE = 0.03; // half-thickness of the edge land
const FD = 0.028; // depth of the tip facet slabs (< land, so the two sides never cross)
const RIB = 0.17; // spine rib width = the stair step (1/40 of the overall length), so every step is black
const FIL = 0.085; // smith's fillet in each inside corner: half the step
const FUL = [-0.06, 0.06]; // fuller z span
const RW = 0.29; // ricasso half-width
const TR = 0.28; // ricasso rail thickness (thicker than the blade)
const CAP = TR + 0.04; // capstone lintel: 0.02 proud of the rails, 0.03 proud of tier 1 per face
const WIN = 0.1; // window half-width
// Distal taper steps 0.03 per face at each course, so every step shows a deliberate ledge.
const tiers = [
  { y0: Y.blade, y1: Y.t2, zs: 0.46, T: 0.26 },
  { y0: Y.t2, y1: Y.t3, zs: 0.29, T: 0.2 },
];
const T3 = 0.14, ZS3 = 0.12; // last tier: thickness and spine

// ---------- grip ----------
m.block('Handle', [0.22, Y.gripHi - Y.gripLo, 0.26], [0, 0, 0], undefined, S.leather);
[-0.52, -0.36, -0.2, 0.18, 0.34, 0.5].forEach((y, k) =>
  m.block(`Cord${k + 1}`, [0.25, 0.05, 0.29], [0, y, 0], angles(15, 0, 0), S.cord));
// burial-ochre lashing where the hands part, knotted on the show side
m.block('Lashing', [0.27, 0.13, 0.31], [0, 0, 0], undefined, S.ochre);
m.block('LashingKnot', [0.06, 0.09, 0.09], [0.15, 0, 0], angles(45, 0, 0), S.ochre);
// its frayed end, tucked flat under the next cord so it reads the same in any swing
m.block('LashingTail', [0.03, 0.13, 0.07], [0.125, -0.115, 0.012], angles(-6, 0, 0), S.ochre);
m.rightWedge('LashingTailEnd', P(-0.18, 0.047, 0.125), P(-0.18, -0.023, 0.125), P(-0.225, 0.047, 0.125), 0.03, S.ochre);

// throat: flares from the grip up into the guard
m.block('Throat', [0.3, Y.hubLo - Y.throat, 0.3], [0, (Y.throat + Y.hubLo) / 2, 0], undefined, S.iron);
mir(m.rightWedge('ThroatFlankSpine', P(Y.hubLo, 0.15), P(Y.throat, 0.15), P(Y.hubLo, 0.24), 0.3, S.iron), 'z', 'Spine', 'Fwd');
// ferrule under the grip
m.block('Ferrule', [0.3, Y.ferrule - Y.crown, 0.32], [0, (Y.ferrule + Y.crown) / 2, 0], undefined, S.iron);

// ---------- pommel: stepped capstone, blind window on the tang, clipped foot, peened button ----------
{
  const PT_ = 0.38, zN = 0.18, zW = 0.27;
  m.block('PommelCrown', [PT_, Y.crown - Y.bodyHi, 2 * zN], [0, (Y.crown + Y.bodyHi) / 2, 0], undefined, S.iron);
  mir(m.rightWedge('PommelChamferSpine', P(Y.bodyHi, zN), P(Y.crown, zN), P(Y.bodyHi, zW), PT_, S.iron), 'z', 'Spine', 'Fwd');
  // Body and foot as a frame around a small echo of the ricasso window (0.08 x 0.13); the tang
  // shows through it, 0.06 down. The only joints on the faces are the window's own jambs run on
  // to the crown and the seat, plus the foot line on the spine side where the clip starts.
  const wy0 = -0.965, wy1 = -0.835, wz = 0.04, zc = 0.08;
  zbox('PommelPostFwd', Y.foot, Y.bodyHi, -zW, -wz, PT_, S.iron); // runs down through the flat foot
  zbox('PommelPostSpine', Y.bodyLo, Y.bodyHi, wz, zW, PT_, S.iron);
  zbox('PommelLintel', wy1, Y.bodyHi, -wz, wz, PT_, S.iron);
  zbox('PommelSill', Y.foot, wy0, -wz, wz, PT_, S.iron); // sill and the middle of the foot, one piece
  zbox('PommelTang', wy0 - 0.01, wy1 + 0.01, -wz - 0.01, wz + 0.01, PT_ - 0.12, S.flat);
  // foot: flat underneath (the seat for the peen), then one clip up toward the spine side
  zbox('PommelHeel', Y.foot, Y.bodyLo, wz, zc, PT_, S.iron);
  m.rightWedge('PommelClip', P(Y.bodyLo, zc), P(Y.foot, zc), P(Y.bodyLo, zW), PT_, S.iron);
  // the tang end, hammered over into a diamond button like the pin heads
  m.block('Peen', [0.1, Y.foot - Y.peen, 0.1], [0, (Y.foot + Y.peen) / 2, 0], angles(0, 45, 0), S.flat);
}

// ---------- guard: hexagonal hub, down-swept hexagonal arms ----------
{
  const yc = (Y.hubLo + Y.hubHi) / 2, h = Y.hubHi - Y.hubLo, W = 0.7, C = 0.36;
  m.block('GuardHub', [C, h, W], [0, yc, 0], undefined, S.iron);
  flats([
    m.rightWedge('GuardHubCheekUpper', [C / 2, yc, 0], [C / 2, Y.hubHi, 0], [C / 2 + 0.08, yc, 0], W, S.iron),
    m.rightWedge('GuardHubCheekLower', [C / 2, yc, 0], [C / 2, Y.hubLo, 0], [C / 2 + 0.08, yc, 0], W, S.iron),
  ]);
  // seat: a second, narrower course with chamfered ends that beds the ricasso
  const sh = Y.seat - Y.hubHi, sw = 0.305;
  m.block('GuardSeat', [C, sh, 2 * sw], [0, (Y.hubHi + Y.seat) / 2, 0], undefined, S.iron);
  mir(m.rightWedge('GuardSeatFlankSpine', P(Y.hubHi, sw), P(Y.seat, sw), P(Y.hubHi, W / 2), C, S.iron), 'z', 'Spine', 'Fwd');
}
function hexBar(name, a, b, core, h, cheek, style) {
  const d = norm(sub(b, a)), L = len(sub(b, a));
  let w = [0, -d[2], d[1]];
  if (w[1] < 0) w = scale(w, -1);
  const mid = lerp(a, b, 0.5);
  const out = [m.block(`${name}Core`, [core, L, h], mid, fromAxes(cross(d, w), d, w), style)];
  const C = add(mid, scale(X, core / 2));
  const cheeks = [
    m.rightWedge(`${name}CheekUpper`, C, add(C, scale(w, h / 2)), add(mid, scale(X, core / 2 + cheek)), L, style),
    m.rightWedge(`${name}CheekLower`, C, add(C, scale(w, -h / 2)), add(mid, scale(X, core / 2 + cheek)), L, style),
  ];
  out.push(...cheeks, ...flats(cheeks));
  return out;
}
hexBar('GuardArmFwd', P(0.88, -0.26), P(0.6, -0.78), 0.26, 0.2, 0.07, S.iron).forEach((p) => mir(p, 'z', 'Fwd', 'Spine'));

// ---------- ricasso: a pierced steel frame (rails, sill, capstone) clamped by langets ----------
zbox('RailFwd', Y.seat - 0.04, Y.winTop, -RW, -WIN, TR, S.flat);
zbox('RailSpine', Y.seat - 0.04, Y.winTop, WIN, RW, TR, S.flat);
// steel sill across the foot of the window: the frame is closed and the tang has a root
zbox('RicassoSill', Y.seat - 0.04, Y.sill, -WIN, WIN, TR, S.flat);
zbox('Capstone', Y.winTop, Y.blade, -RW, RW, CAP, S.flat); // lintel stands proud of the rails
// the cairn mark, struck through the capstone and blackened: three courses, stepping in
[0.2, 0.13, 0.06].forEach((w, k) => {
  const y = Y.winTop + 0.045 + k * 0.058;
  m.block(`CairnMark${k + 1}`, [CAP + 0.012, 0.036, w], [0, y, 0], undefined, S.black);
});
{
  const lt = 0.035, lw = 0.13, top = 1.3, cut = 0.07, xc = TR / 2 + lt / 2;
  for (const [tag, zc] of [['Fwd', -(RW + WIN) / 2], ['Spine', (RW + WIN) / 2]]) {
    const lg = m.block(`Langet${tag}`, [lt, top - Y.seat, lw], [xc, (Y.seat + top) / 2, zc], undefined, S.iron);
    // chisel-clipped end: one oblique cut, long side toward the forward edge
    const tip = m.rightWedge(`Langet${tag}Tip`, [xc, top, zc - lw / 2], [xc, top + cut, zc - lw / 2], [xc, top, zc + lw / 2], lt, S.iron);
    flats([lg, tip]);
    // one pin through langet, rail and langet
    m.block(`Pin${tag}`, [TR + 2 * lt + 0.03, 0.06, 0.06], [0, 1.18, zc], angles(45, 0, 0), S.flat);
  }
}
// Shoulders flare from the ricasso out to the blade. The forward one is the capstone itself
// flaring out to the edge line (same thickness, so its top is the capstone's plunge ledge); the
// back one is forge-black and starts the spine rib.
m.rightWedge('ShoulderFwd', P(Y.blade, -RW), P(Y.ricTop, -RW), P(Y.blade, ZE), CAP, S.flat);
m.rightWedge('ShoulderSpine', P(Y.blade, RW), P(Y.ricTop, RW), P(Y.blade, tiers[0].zs + 0.005), tiers[0].T + 0.05, S.black);

// ---------- blade: two stepped tiers with a straight fuller; distal taper steps with them ----------
// The edge land runs as one strip from the shoulder to where the edge turns up to the point,
// broken once by an old nick low on the first course.
const tipGeo = {};
{
  const PT = [Y.point, -0.25];
  const K = [PT[0] - (PT[1] - ZE) / Math.tan(12 * Math.PI / 180), ZE]; // edge sweeps up here
  const SC = [PT[0] - (ZS3 - PT[1]) / Math.tan(32 * Math.PI / 180), ZS3]; // spine turns into the clip
  Object.assign(tipGeo, { PT, K, SC });
}
zbox('EdgeLandLow', Y.blade, Y.nick0, ZE, ZB, 2 * TE, S.edge);
zbox('EdgeLandHigh', Y.nick1, tipGeo.K[0], ZE, ZB, 2 * TE, S.edge);

tiers.forEach((t, i) => {
  const tag = `Tier${i + 1}`, TB = t.T + 0.05, zo = t.zs + 0.005, zi = t.zs - RIB;
  zbox(`${tag}FlatFwd`, t.y0, t.y1, ZB, FUL[0], t.T, S.flat);
  zbox(`${tag}FlatSpine`, t.y0, t.y1, FUL[1], zi, t.T, S.flat);
  const fy0 = i === 0 ? Y.fullerLo : t.y0, fy1 = i === tiers.length - 1 ? Y.fullerHi : t.y1;
  zbox(`${tag}Fuller`, fy0, fy1, FUL[0], FUL[1], t.T - 0.07, S.fuller);
  if (fy0 > t.y0) zbox(`${tag}FullerFoot`, t.y0, fy0, FUL[0], FUL[1], t.T, S.flat);
  if (fy1 < t.y1) zbox(`${tag}FullerHead`, fy1, t.y1, FUL[0], FUL[1], t.T, S.flat);
  zbox(`${tag}Rib`, t.y0, t.y1, zi, zo, TB, S.black);
  // ground bevel: a solid right-angle wedge per face, split around the nick on tier 1
  const bevel = (name, y0, y1) =>
    flats([m.rightWedge(name, P((y0 + y1) / 2, ZB, TE), P((y0 + y1) / 2, ZB, t.T / 2), P((y0 + y1) / 2, ZE, TE), y1 - y0, S.edge)]);
  if (i === 0) {
    bevel(`${tag}BevelLow`, t.y0, Y.nick0);
    bevel(`${tag}BevelHigh`, Y.nick1, t.y1);
    // The nick: a wedge-shaped bite 0.05 deep and 0.12 long. Above it the bevel runs on in the
    // same plane; below its deepest point the break slopes back out to the sound edge, with the
    // bevel knocked off it, so the broken faces show duller, exposed steel.
    const dn = 0.05, zn = ZE + dn, xn = TE + (dn / BEV) * (t.T / 2 - TE), yn = (Y.nick0 + Y.nick1) / 2;
    zbox('NickFloor', Y.nick0, Y.nick1, zn, ZB, 2 * xn, S.flat);
    flats([m.rightWedge('NickBevel', P(yn, ZB, xn), P(yn, ZB, t.T / 2), P(yn, zn, xn), Y.nick1 - Y.nick0, S.edge)]);
    m.rightWedge('NickBreak', P(Y.nick0, zn), P(Y.nick0, ZE), P(Y.nick1, zn), 2 * TE, S.flat);
  } else {
    bevel(`${tag}Bevel`, t.y0, t.y1);
    // smith's relief in the inside corner where this tier's spine rises from the step
    m.rightWedge(`${tag}Fillet`, P(t.y0, zo), P(t.y0 + FIL, zo), P(t.y0, zo + FIL), TB, S.black);
  }
});

// ---------- last tier and point ----------
// The ground edge sweeps up in one long facet (the rise) and the spine turns down in a steeper,
// longer one (the clip), so the point sits 0.25 off the grip axis instead of on the edge line.
// The clip is bevelled like a false edge but left forge-black, so the black spine still runs
// unbroken to the point. Bevels are solid facet slabs 0.028 deep over a 0.06 land; the two sides
// never cross, and nothing is a hairline shell.
{
  const { PT, K, SC } = tipGeo;
  const yT3 = Y.t3, TB3 = T3 + 0.05, H = T3 / 2;
  const inside = [yT3 + 0.6, -0.1];
  const nV = inward([yT3, ZE], K, inside), nR = inward(K, PT, inside), nC = inward(SC, PT, inside);
  const I1 = meet(a2([yT3, ZE], k2(nV, BEV)), [1, 0], a2(K, k2(nR, BEV)), s2(PT, K)); // mitre
  const RP = meet(a2(K, k2(nR, BEV)), s2(PT, K), a2(SC, k2(nC, BEV)), s2(PT, SC)); // ridge root
  const SCi = a2(SC, k2(nC, BEV)); // inner end of the plunge, square to the clip
  const Ki = a2(K, k2(nR, BEV)); // inner corner of the rise facet's square start
  if (d2(s2(RP, I1), s2(PT, K)) <= 0.01) throw new Error('rise too short for the bevel');
  if (d2(s2(RP, SCi), s2(PT, SC)) <= 0.01) throw new Error('clip too short for the bevel');

  // core (flat): the pentagon inside the bevels, as a block, a right wedge and a triangle
  const zc = SCi[1];
  zbox('Tier3Flat', yT3, SCi[0], ZB, zc, T3, S.flat);
  m.rightWedge('Tier3FlatTaper', P(SCi[0], ZB), P(...I1), P(...SCi), T3, S.flat);
  tri('Tier3Crown', P(...I1), P(...RP), P(...SCi), T3, S.flat);

  // spine rib up the last tier, ending square to the clip where the bevel is forged in
  const zo = ZS3 + 0.005;
  const u = n2(s2(PT, SC));
  const plungeAt = (z) => meet(SC, [-u[1], u[0]], [0, z], [1, 0]);
  trap('Tier3Rib', P(yT3, zc), P(...plungeAt(zc)), P(...plungeAt(zo)), P(yT3, zo), TB3, S.black, undefined, ['Foot', 'Plunge']);
  m.rightWedge('Tier3Fillet', P(yT3, zo), P(yT3 + FIL, zo), P(yT3, zo + FIL), TB3, S.black);

  // Land under the rise (ground bright) and the clip (forge-black). Its apex runs 0.03 past the
  // point where the facets converge, so the land is the very tip and wraps the facet slabs' corners
  // (a 0.028-deep slab on a shallow bevel leans a few thousandths past the far edge right at the point).
  // Xl sits a little inside the ridge root so no land face lines up with a facet face.
  const Xl = a2(RP, k2(n2(s2(RP, PT)), 0.03));
  const PTx = a2(PT, k2(n2(s2(PT, RP)), 0.03));
  tri('TipLandEdge', P(...K), P(...PTx), P(...Xl), 2 * TE, S.edge);
  tri('TipLandClip', P(...PTx), P(...SC), P(...Xl), 2 * TE, S.black);

  // Bevel facets (+X), mirrored to -X. Straight runs are square-ended rectangles that overlap at
  // the 12-degree mitre (the overshoot is under 0.002); rise and clip meet on the ridge PT-RP.
  const out = [1, 0, 0];
  const yE = K[0] + 0.004;
  flats([
    ...trap('FacetEdge', P(yT3 - 0.004, ZE, TE), P(yE, ZE, TE), P(yE, ZB, H), P(yT3 - 0.004, ZB, H), FD, S.edge, out, ['Foot', 'Mitre']),
    ...trap('FacetRise', P(...K, TE), P(...PT, TE), P(...RP, H), P(...Ki, H), FD, S.edge, out, ['Heel', 'Point']),
    ...trap('FacetClip', P(...SC, TE), P(...PT, TE), P(...RP, H), P(...SCi, H), FD, S.black, out, ['Heel', 'Point']),
  ]);
}

module.exports = m;
