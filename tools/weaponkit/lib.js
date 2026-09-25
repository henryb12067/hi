'use strict';
// Weaponkit geometry library.
//
// A weapon is a list of Roblox-native primitives (Part blocks and WedgeParts),
// so what the renderer shows is exactly what Studio builds. No meshes, no uploads.
//
// Conventions (chosen so a Tool held by an R15/R6 character stands upright,
// edge forward, with an identity-rotation Tool.Grip):
//   +Y  blade direction (pommel at -Y, tip at +Y)
//   ±Z  edges            (the character's forward edge is -Z)
//   ±X  flats of the blade (thickness axis)
// Units are studs. The origin should sit at the centre of the grip.
//
// Rotations are 3x3 matrices stored row-major: [r00,r01,r02, r10,r11,r12, r20,r21,r22].
// Columns are the part's local X, Y, Z axes in world space (same layout as a Roblox CFrame).
//
// WedgePart geometry (local space, size sx, sy, sz):
//   bottom face  y = -sy/2 (full rectangle)
//   back face    z = +sz/2 (full rectangle)
//   slope        from the top-back edge (y=+sy/2, z=+sz/2) down to the bottom-front edge (y=-sy/2, z=-sz/2)
//   The right angle of the triangular profile is on the bottom-back edge.

const DEG = Math.PI / 180;

// Enum.Material values.
const MATERIALS = {
  Plastic: 256,
  SmoothPlastic: 272,
  Neon: 288,
  Wood: 512,
  WoodPlanks: 528,
  Marble: 784,
  Slate: 800,
  Concrete: 816,
  Granite: 832,
  CorrodedMetal: 1040,
  DiamondPlate: 1056,
  Foil: 1072,
  Metal: 1088,
  Fabric: 1312,
  Glass: 1568,
};

const MIN_SIZE = 0.001; // Roblox's minimum part dimension.

// ---------- vectors ----------
const v = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a);
  if (l < 1e-9) throw new Error('cannot normalise a zero-length vector');
  return scale(a, 1 / l);
};
const lerp = (a, b, t) => add(a, scale(sub(b, a), t));

// ---------- rotations ----------
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function mul(a, b) {
  const o = new Array(9);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}

function apply(R, p) {
  return [
    R[0] * p[0] + R[1] * p[1] + R[2] * p[2],
    R[3] * p[0] + R[4] * p[1] + R[5] * p[2],
    R[6] * p[0] + R[7] * p[1] + R[8] * p[2],
  ];
}

function rx(d) {
  const c = Math.cos(d * DEG), s = Math.sin(d * DEG);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}
function ry(d) {
  const c = Math.cos(d * DEG), s = Math.sin(d * DEG);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}
function rz(d) {
  const c = Math.cos(d * DEG), s = Math.sin(d * DEG);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
// Same as Roblox CFrame.Angles(rx, ry, rz), in degrees.
const angles = (x = 0, y = 0, z = 0) => mul(mul(rx(x), ry(y)), rz(z));

// Build a rotation whose local X, Y, Z axes are the given (orthonormal) world vectors.
function fromAxes(X, Y, Z) {
  return [X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]];
}
const axisOf = (R, i) => [R[i], R[3 + i], R[6 + i]];

function orthonormalise(R) {
  // Gram-Schmidt on the columns, keeps accumulated float error out of exported CFrames.
  const X = norm(axisOf(R, 0));
  let Y = axisOf(R, 1);
  Y = norm(sub(Y, scale(X, dot(X, Y))));
  const Z = cross(X, Y);
  return fromAxes(X, Y, Z);
}

// ---------- model ----------
class Model {
  /**
   * @param {object} meta  { name, collection, description, handle (part name, default 'Handle'),
   *                          grip: { pos: [x,y,z] } — where the hand holds, in Handle space }
   */
  constructor(meta = {}) {
    this.meta = Object.assign({ name: 'Weapon', collection: '', description: '', handle: 'Handle' }, meta);
    this.parts = [];
  }

  _style(style) {
    if (!style || !style.color) throw new Error('every part needs a style with at least a color');
    const s = Object.assign({ material: 'SmoothPlastic', reflectance: 0, transparency: 0 }, style);
    if (!(s.material in MATERIALS)) throw new Error(`unknown material "${s.material}"`);
    if (!/^#[0-9a-fA-F]{6}$/.test(s.color)) throw new Error(`color must be #rrggbb, got "${s.color}"`);
    return s;
  }

  add(part) {
    const p = {
      name: part.name,
      shape: part.shape,
      size: part.size.map(Number),
      pos: part.pos.map(Number),
      rot: orthonormalise(part.rot || I3),
      ...this._style(part.style),
    };
    if (!p.name) throw new Error('part needs a name');
    if (p.shape !== 'Block' && p.shape !== 'Wedge') throw new Error(`shape must be Block or Wedge, got ${p.shape}`);
    p.size.forEach((s) => {
      if (!(s >= MIN_SIZE)) throw new Error(`${p.name}: size component ${s} is below Roblox's ${MIN_SIZE} minimum`);
    });
    this.parts.push(p);
    return p;
  }

  block(name, size, pos, rot, style) {
    return this.add({ name, shape: 'Block', size, pos, rot, style });
  }

  wedge(name, size, pos, rot, style) {
    return this.add({ name, shape: 'Wedge', size, pos, rot, style });
  }

  /**
   * Block spanning between two points (its local Y runs from a to b), with the given
   * cross-section [sx, sz]. `up` hints which way local Z should face.
   */
  beam(name, a, b, sx, sz, style, zHint = [0, 0, 1]) {
    const Y = norm(sub(b, a));
    let Z = sub(zHint, scale(Y, dot(zHint, Y)));
    if (len(Z) < 1e-6) Z = Math.abs(Y[0]) < 0.9 ? cross([1, 0, 0], Y) : cross([0, 1, 0], Y);
    Z = norm(Z);
    const X = cross(Y, Z);
    return this.block(name, [sx, len(sub(b, a)), sz], lerp(a, b, 0.5), fromAxes(X, Y, Z), style);
  }

  /**
   * Right-triangular prism (one WedgePart). C is the right-angle vertex, A and B the ends of
   * the two legs (A-C must be perpendicular to B-C). The triangle is extruded by `depth`,
   * centred on the triangle's plane.
   */
  rightWedge(name, C, A, B, depth, style) {
    const CA = sub(A, C), CB = sub(B, C);
    const la = len(CA), lb = len(CB);
    if (la < MIN_SIZE || lb < MIN_SIZE) throw new Error(`${name}: degenerate right triangle`);
    const cosang = dot(CA, CB) / (la * lb);
    if (Math.abs(cosang) > 1e-4) throw new Error(`${name}: legs are not perpendicular (cos=${cosang.toFixed(5)})`);
    const Y = scale(CA, 1 / la);
    const Z = scale(CB, -1 / lb);
    const X = cross(Y, Z);
    return this.wedge(name, [depth, la, lb], lerp(A, B, 0.5), fromAxes(X, Y, Z), style);
  }

  /**
   * Any triangle a, b, c as a slab `depth` thick, built from one or two WedgeParts
   * (the standard Roblox triangle technique: split along the altitude of the longest side).
   * Returns the created parts.
   */
  triangle(name, a, b, c, depth, style) {
    // Order so that (p, q) is the longest side and r the opposite vertex.
    const sides = [
      [a, b, c],
      [b, c, a],
      [c, a, b],
    ].sort((s1, s2) => len(sub(s2[1], s2[0])) - len(sub(s1[1], s1[0])));
    const [p, q, r] = sides[0];
    const pq = sub(q, p);
    const t = dot(sub(r, p), pq) / dot(pq, pq);
    const d = lerp(p, q, t); // foot of the altitude from r
    if (len(sub(r, d)) < MIN_SIZE) throw new Error(`${name}: triangle is degenerate`);
    const out = [];
    if (len(sub(p, d)) >= MIN_SIZE) out.push(this.rightWedge(`${name}A`, d, r, p, depth, style));
    if (len(sub(q, d)) >= MIN_SIZE) out.push(this.rightWedge(`${name}B`, d, r, q, depth, style));
    return out;
  }

  /** Planar quad a-b-c-d (in order) as a slab: two triangles. */
  quad(name, a, b, c, d, depth, style) {
    return [...this.triangle(`${name}1`, a, b, c, depth, style), ...this.triangle(`${name}2`, a, c, d, depth, style)];
  }

  /**
   * Mirror a part across the plane through the origin whose normal is `axis` ('x' | 'y' | 'z').
   * Works for Blocks and Wedges (a wedge is symmetric along its local X, so flipping that
   * axis keeps the rotation proper while reproducing the mirror image exactly).
   */
  mirror(part, axis, name) {
    const i = { x: 0, y: 1, z: 2 }[axis];
    if (i === undefined) throw new Error(`mirror axis must be x, y or z`);
    const M = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    M[i * 4] = -1;
    const flipLocalX = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
    const pos = part.pos.slice();
    pos[i] = -pos[i];
    return this.add({
      name: name || `${part.name}_M${axis.toUpperCase()}`,
      shape: part.shape,
      size: part.size,
      pos,
      rot: mul(mul(M, part.rot), flipLocalX),
      style: { color: part.color, material: part.material, reflectance: part.reflectance, transparency: part.transparency },
    });
  }

  mirrorAll(parts, axis) {
    return parts.map((p) => this.mirror(p, axis));
  }

  find(name) {
    return this.parts.find((p) => p.name === name);
  }

  toJSON() {
    return { meta: this.meta, parts: this.parts };
  }
}

// ---------- geometry of a part (used by renderer, OBJ export, validation) ----------
function localVerts(shape, s) {
  const [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2];
  if (shape === 'Block') {
    return [
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
    ];
  }
  // Wedge: bottom 4 corners + top-back edge.
  return [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
    [-hx, hy, hz], [hx, hy, hz],
  ];
}

// Faces as vertex-index polygons, counter-clockwise seen from outside.
const FACES = {
  Block: [
    [0, 3, 2, 1], // -Z
    [4, 5, 6, 7], // +Z
    [0, 1, 5, 4], // -Y
    [3, 7, 6, 2], // +Y
    [0, 4, 7, 3], // -X
    [1, 2, 6, 5], // +X
  ],
  Wedge: [
    [0, 1, 2, 3], // bottom (-Y)
    [3, 2, 5, 4], // back (+Z)
    [0, 4, 5, 1], // slope
    [0, 3, 4], // -X side
    [1, 5, 2], // +X side
  ],
};

function worldVerts(part) {
  return localVerts(part.shape, part.size).map((p) => add(apply(part.rot, p), part.pos));
}

function bounds(parts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts)
    for (const w of worldVerts(p))
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], w[i]);
        max[i] = Math.max(max[i], w[i]);
      }
  return { min, max, size: sub(max, min) };
}

module.exports = {
  DEG, MATERIALS, MIN_SIZE, I3,
  v, add, sub, scale, dot, cross, len, norm, lerp,
  mul, apply, rx, ry, rz, angles, fromAxes, axisOf,
  Model, localVerts, worldVerts, FACES, bounds,
};
