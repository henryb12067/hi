# weaponkit

Builds Roblox weapons from native parts (Part blocks and WedgeParts) out of a single
JavaScript design file, then exports, validates and renders them. Nothing needs uploading:
the output drops straight into Studio.

```
npm install                                   # three + playwright (for renders)
node tools/weaponkit/build.js weapons/<slug>  # validate, export, render
lune run tools/weaponkit/verify.luau weapons/<slug>/out/<Name>   # optional: prove the Roblox files
```

`build.js` writes:

| File | Use |
| --- | --- |
| `out/<Name>.rbxmx` | Roblox model file: a `Tool` whose parts are welded to `Handle`. In Studio: right-click a service → **Insert from File…**, or sync with Rojo. |
| `out/<Name>.lua` | Paste into the Studio command bar to build the Tool into StarterPack (plus an anchored display copy in Workspace), or use as a ModuleScript and call `.build()`. |
| `out/<Name>.obj` + `.mtl` | Same geometry as a mesh, for Blender or Studio's 3D importer. |
| `out/<Name>.json` | Raw part list. |
| `renders/sheet.png` | 8-view contact sheet: front, back, edge, silhouette, 3/4, hilt, tip, scale vs a 5.2-stud character. |
| `renders/hero.png`, `renders/topdown.png` | Large 3/4 render; top-down view of the cross-sections. |

`verify.luau` loads the `.rbxmx` with rbx-dom (what Studio and Rojo use) and runs the `.lua`
builder through Lune's Roblox API, then checks that every part's class, size, colour, material and
pose relative to the handle match the design, that every part is welded, and that `Tool.Grip`
is correct.

## Conventions

- **Units** are studs. An R15 character is about 5.2 studs tall.
- **Axes:** blade along **+Y** (pommel down, tip up), edges along **±Z** (the forward edge
  is **−Z**), flats face **±X**. With these axes and an identity-rotation `Tool.Grip`, the
  character holds the weapon upright with the edge forward.
- **Origin** is the centre of the grip. The grip part must be a Block named by `meta.handle`
  (default `Handle`), axis-aligned. `meta.grip.pos` is where the hand closes, in handle space;
  for a two-hander that is the upper hand, just below the guard.

## Design file

`weapons/<slug>/design.js` must `module.exports` a `Model`:

```js
const { Model, v, angles } = require('../../tools/weaponkit/lib');

const m = new Model({
  name: 'Oathbreaker',               // Tool name, and the base of the exported file names
  collection: 'The Ashen Covenant',  // shown on renders
  description: 'One line of flavour',
  handle: 'Handle',
  grip: { pos: [0, 0.35, 0] },
  render: { hilt: [0, 0.3], tip: [0.72, 1] },   // height fractions framed by the detail views
});

const steel = { color: '#6f757c', material: 'Metal' };
m.block('Handle', [0.2, 1.2, 0.24], [0, 0, 0], undefined, { color: '#2a2320', material: 'Fabric' });
module.exports = m;
```

Styles are `{ color: '#rrggbb', material, reflectance?, transparency? }`. Materials:
`SmoothPlastic`, `Plastic`, `Metal`, `CorrodedMetal`, `DiamondPlate`, `Foil`, `Wood`,
`WoodPlanks`, `Fabric`, `Slate`, `Concrete`, `Granite`, `Marble`, `Glass`, `Neon`.

### Primitives

| Call | Makes |
| --- | --- |
| `m.block(name, [sx,sy,sz], pos, rot, style)` | A Part. `rot` is a 3×3 row-major matrix; `angles(x,y,z)` in degrees equals `CFrame.Angles`. |
| `m.wedge(name, size, pos, rot, style)` | A WedgePart. In local space: bottom face at −Y, tall back face at +Z, slope rising from the bottom-front edge to the top-back edge. |
| `m.beam(name, a, b, sx, sz, style, zHint)` | A block whose length runs from point `a` to point `b`. |
| `m.rightWedge(name, C, A, B, depth, style)` | A right-triangle prism: right angle at `C`, legs to `A` and `B`, extruded `depth` (centred on the triangle's plane). The legs must be perpendicular. |
| `m.triangle(name, a, b, c, depth, style)` | Any triangle as a slab `depth` thick (1–2 wedges). Use it for tips, bevels, flared guards and facets. |
| `m.quad(name, a, b, c, d, depth, style)` | A planar quad as two triangles. |
| `m.mirror(part, 'x'｜'y'｜'z')` / `m.mirrorAll(parts, axis)` | Exact mirror copy across the plane through the origin. |

Every call returns the created part(s). Vector helpers: `v, add, sub, scale, lerp, norm, cross, dot, len`.

### Techniques

- **Hexagonal (flat-diamond) blade section:** a core `block` of `[T, L, W]` (thickness T
  across X, width W across Z) plus four `rightWedge`s, one per bevel, each extruded along Y
  by the section length L. For the +X/+Z bevel: `C=[0, y, W/2]` (right angle, on the centre
  plane), `A=[T/2, y, W/2]` (top of the core's corner), `B=[0, y, W/2 + bevel]` (the
  edge). Mirror across `x` and `z` for the other three. For a blade that narrows, build it
  in segments, or use `triangle` slabs for each tapered bevel face.
- **Angular tip:** `triangle` slabs converging on the point. Layer a thinner, wider slab
  (the edge) under a thicker, narrower one (the ridge) for a faceted, stepped look.
- **Avoid z-fighting:** two parts must never share a coplanar, same-facing face unless they
  have the same colour and material. Inset details by at least 0.005 studs, or stand them
  proud by at least that much. The validator reports every case.
- **Everything must touch:** the validator fails on parts that don't touch the handle's
  connected group.

## Validation

`build.js` prints `validation.errors` (must be empty) and `warnings`. Errors cover z-fighting
between different-looking parts, floating parts, and a missing or rotated handle.
