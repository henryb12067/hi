'use strict';
// Static checks for a weapon spec. Catches the defects that are easy to miss in a render
// but obvious in Studio: z-fighting, floating pieces, bad handle/grip, silly sizes.

const { worldVerts, FACES, sub, cross, dot, norm, len } = require('./lib');

const EPS_PLANE = 2e-3; // studs: faces this close and parallel are treated as coplanar
const TOUCH = 0.01; // studs: parts within this distance count as connected

function facesOf(part) {
  const wv = worldVerts(part);
  return FACES[part.shape].map((f) => {
    const pts = f.map((i) => wv[i]);
    const n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    return { pts, n, d: dot(n, pts[0]) };
  });
}

// Area of the overlap of two coplanar convex polygons (Sutherland–Hodgman in the plane).
function overlapArea(a, b, n) {
  const u = norm(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]));
  const w = cross(n, u);
  const to2 = (p) => [dot(p, u), dot(p, w)];
  let subj = a.map(to2);
  const clip = b.map(to2);
  const area = (poly) => {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      s += x1 * y2 - x2 * y1;
    }
    return s / 2;
  };
  const orient = Math.sign(area(clip)) || 1;
  for (let i = 0; i < clip.length && subj.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length];
    const inside = (p) => orient * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) >= -1e-9;
    const out = [];
    for (let j = 0; j < subj.length; j++) {
      const P = subj[j], Q = subj[(j + 1) % subj.length];
      const ip = inside(P), iq = inside(Q);
      if (ip && iq) out.push(Q);
      else if (ip && !iq) out.push(lineInter(P, Q, A, B));
      else if (!ip && iq) out.push(lineInter(P, Q, A, B), Q);
    }
    subj = out;
  }
  return subj.length >= 3 ? Math.abs(area(subj)) : 0;
}

function lineInter(P, Q, A, B) {
  const r = [Q[0] - P[0], Q[1] - P[1]], s = [B[0] - A[0], B[1] - A[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-12) return Q;
  const t = ((A[0] - P[0]) * s[1] - (A[1] - P[1]) * s[0]) / den;
  return [P[0] + r[0] * t, P[1] + r[1] * t];
}

// Separating-axis test between two convex parts; returns the largest separation found.
function separation(pa, pb) {
  const va = worldVerts(pa), vb = worldVerts(pb);
  const fa = facesOf(pa), fb = facesOf(pb);
  const edgesOf = (part, verts) => {
    const faces = FACES[part.shape];
    const out = [];
    for (const f of faces) for (let i = 0; i < f.length; i++) {
      const e = sub(verts[f[(i + 1) % f.length]], verts[f[i]]);
      if (len(e) > 1e-9) out.push(norm(e));
    }
    return out;
  };
  const axes = [...fa.map((f) => f.n), ...fb.map((f) => f.n)];
  const ea = edgesOf(pa, va), eb = edgesOf(pb, vb);
  for (const a of ea) for (const b of eb) {
    const c = cross(a, b);
    if (len(c) > 1e-6) axes.push(norm(c));
  }
  let best = -Infinity;
  for (const ax of axes) {
    let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
    for (const p of va) { const d = dot(p, ax); amin = Math.min(amin, d); amax = Math.max(amax, d); }
    for (const p of vb) { const d = dot(p, ax); bmin = Math.min(bmin, d); bmax = Math.max(bmax, d); }
    best = Math.max(best, bmin - amax, amin - bmax);
  }
  return best; // > 0 means separated by that distance
}

function validate(spec) {
  const errors = [], warnings = [];
  const parts = spec.parts;
  const names = new Set();
  for (const p of parts) {
    if (names.has(p.name)) warnings.push(`duplicate part name "${p.name}"`);
    names.add(p.name);
    const minDim = Math.min(...p.size);
    if (minDim < 0.02) warnings.push(`${p.name}: very thin (${minDim.toFixed(3)} studs); may shimmer at distance`);
  }

  // Handle / grip
  const handle = parts.find((p) => p.name === spec.meta.handle);
  if (!handle) errors.push(`no handle part named "${spec.meta.handle}"`);
  else {
    if (handle.shape !== 'Block') errors.push('handle must be a Block');
    const g = (spec.meta.grip && spec.meta.grip.pos) || [0, 0, 0];
    for (let i = 0; i < 3; i++)
      if (Math.abs(g[i]) > handle.size[i] / 2 + 1e-6)
        warnings.push(`grip position ${JSON.stringify(g)} is outside the handle on axis ${'XYZ'[i]}`);
    const R = handle.rot;
    if (Math.abs(R[0] - 1) > 1e-6 || Math.abs(R[4] - 1) > 1e-6 || Math.abs(R[8] - 1) > 1e-6)
      warnings.push('handle is rotated; Tool.Grip assumes an axis-aligned handle with the blade along +Y');
  }

  // Z-fighting: coplanar, same-facing, overlapping faces from different parts.
  const allFaces = parts.map((p) => facesOf(p));
  const zf = [];
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      if (separation(parts[i], parts[j]) > EPS_PLANE) continue;
      for (const f of allFaces[i])
        for (const g of allFaces[j]) {
          if (dot(f.n, g.n) < 1 - 1e-4 || Math.abs(f.d - g.d) > EPS_PLANE) continue;
          const a = overlapArea(f.pts, g.pts, f.n);
          if (a > 1e-4) {
            const sameLook = parts[i].color === parts[j].color && parts[i].material === parts[j].material;
            zf.push({ a: parts[i].name, b: parts[j].name, area: +a.toFixed(4), sameLook });
          }
        }
    }
  for (const z of zf) {
    const msg = `z-fighting: ${z.a} and ${z.b} share a coplanar face (overlap ${z.area} sq studs)`;
    if (z.sameLook) warnings.push(`${msg}, same colour/material so only faintly visible`);
    else errors.push(msg);
  }

  // Connectivity: every part should touch the handle's connected group.
  if (handle) {
    const adj = parts.map(() => []);
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++)
        if (separation(parts[i], parts[j]) <= TOUCH) { adj[i].push(j); adj[j].push(i); }
    const seen = new Set([parts.indexOf(handle)]);
    const stack = [parts.indexOf(handle)];
    while (stack.length) for (const k of adj[stack.pop()]) if (!seen.has(k)) { seen.add(k); stack.push(k); }
    const floating = parts.filter((_, i) => !seen.has(i)).map((p) => p.name);
    if (floating.length) errors.push(`floating parts not connected to the handle: ${floating.join(', ')}`);
  }

  if (parts.length > 200) warnings.push(`${parts.length} parts is heavy for a held tool; aim for under ~120`);
  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { validate, separation };
