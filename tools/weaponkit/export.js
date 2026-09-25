'use strict';
// Exporters: Roblox XML model (.rbxmx), Studio command-bar/ModuleScript builder (.lua),
// Wavefront OBJ/MTL, and the raw JSON spec.

const { MATERIALS, mul, worldVerts, FACES, bounds } = require('./lib');

const fmt = (n) => {
  const r = Math.round(n * 1e6) / 1e6;
  return Object.is(r, -0) ? '0' : String(r);
};

const xmlEscape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Transpose == inverse for a rotation matrix.
const transpose = (R) => [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];

// CFrame multiplication for relative offsets: a:Inverse() * b.
function relative(a, b) {
  const Rt = transpose(a.rot);
  const d = [b.pos[0] - a.pos[0], b.pos[1] - a.pos[1], b.pos[2] - a.pos[2]];
  const pos = [
    Rt[0] * d[0] + Rt[1] * d[1] + Rt[2] * d[2],
    Rt[3] * d[0] + Rt[4] * d[1] + Rt[5] * d[2],
    Rt[6] * d[0] + Rt[7] * d[1] + Rt[8] * d[2],
  ];
  return { pos, rot: mul(Rt, b.rot) };
}

function handleOf(spec) {
  const h = spec.parts.find((p) => p.name === spec.meta.handle);
  if (!h) throw new Error(`no part named "${spec.meta.handle}" to use as the Tool handle`);
  if (h.shape !== 'Block') throw new Error('the Tool handle must be a Block part');
  return h;
}

function gripOf(spec) {
  const g = (spec.meta.grip && spec.meta.grip.pos) || [0, 0, 0];
  return { pos: g, rot: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
}

// ---------------- .rbxmx ----------------
function cframeXml(name, cf, indent) {
  const [x, y, z] = cf.pos;
  const R = cf.rot;
  return (
    `${indent}<CoordinateFrame name="${name}">` +
    `<X>${fmt(x)}</X><Y>${fmt(y)}</Y><Z>${fmt(z)}</Z>` +
    `<R00>${fmt(R[0])}</R00><R01>${fmt(R[1])}</R01><R02>${fmt(R[2])}</R02>` +
    `<R10>${fmt(R[3])}</R10><R11>${fmt(R[4])}</R11><R12>${fmt(R[5])}</R12>` +
    `<R20>${fmt(R[6])}</R20><R21>${fmt(R[7])}</R21><R22>${fmt(R[8])}</R22>` +
    `</CoordinateFrame>\n`
  );
}

function toRbxmx(spec) {
  const handle = handleOf(spec);
  let ref = 0;
  const nextRef = () => `RBX${(ref++).toString(16).toUpperCase().padStart(8, '0')}`;
  const toolRef = nextRef();
  const refs = new Map(spec.parts.map((p) => [p, nextRef()]));

  const I = '    ';
  const partXml = (p, name) => {
    const cls = p.shape === 'Wedge' ? 'WedgePart' : 'Part';
    const [r, g, b] = hexToRgb(p.color);
    const color = ((0xff << 24) >>> 0) + (r << 16) + (g << 8) + b;
    let s = `  <Item class="${cls}" referent="${refs.get(p)}">\n${I}<Properties>\n`;
    const P = I + '  ';
    s += `${P}<string name="Name">${xmlEscape(name)}</string>\n`;
    s += `${P}<bool name="Anchored">false</bool>\n`;
    s += `${P}<bool name="CanCollide">false</bool>\n`;
    s += `${P}<bool name="CanTouch">${p === handle}</bool>\n`;
    s += `${P}<bool name="CanQuery">${p === handle}</bool>\n`;
    s += `${P}<bool name="Massless">true</bool>\n`;
    s += `${P}<bool name="Locked">false</bool>\n`;
    s += cframeXml('CFrame', p, P);
    s += `${P}<Vector3 name="size"><X>${fmt(p.size[0])}</X><Y>${fmt(p.size[1])}</Y><Z>${fmt(p.size[2])}</Z></Vector3>\n`;
    s += `${P}<Color3uint8 name="Color3uint8">${color}</Color3uint8>\n`;
    s += `${P}<token name="Material">${MATERIALS[p.material]}</token>\n`;
    s += `${P}<float name="Reflectance">${fmt(p.reflectance)}</float>\n`;
    s += `${P}<float name="Transparency">${fmt(p.transparency)}</float>\n`;
    for (const face of ['Top', 'Bottom', 'Front', 'Back', 'Left', 'Right'])
      s += `${P}<token name="${face}Surface">0</token>\n`;
    if (cls === 'Part') s += `${P}<token name="shape">1</token>\n`;
    s += `${I}</Properties>\n`;
    if (p !== handle) {
      // Legacy Weld: well-defined XML (Part0/Part1/C0/C1), holds the part to the handle.
      const c0 = relative(handle, p);
      s += `${I}<Item class="Weld" referent="${nextRef()}">\n${I}  <Properties>\n`;
      s += `${I}    <string name="Name">WeaponWeld</string>\n`;
      s += `${I}    <Ref name="Part0">${refs.get(handle)}</Ref>\n`;
      s += `${I}    <Ref name="Part1">${refs.get(p)}</Ref>\n`;
      s += cframeXml('C0', c0, `${I}    `);
      s += cframeXml('C1', { pos: [0, 0, 0], rot: [1, 0, 0, 0, 1, 0, 0, 0, 1] }, `${I}    `);
      s += `${I}  </Properties>\n${I}</Item>\n`;
    }
    s += `  </Item>\n`;
    return s;
  };

  const grip = gripOf(spec);
  // Order: handle first so it is the Tool's Handle child.
  const ordered = [handle, ...spec.parts.filter((p) => p !== handle)];
  let out =
    `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n` +
    `<Item class="Tool" referent="${toolRef}">\n  <Properties>\n` +
    `    <string name="Name">${xmlEscape(spec.meta.name)}</string>\n` +
    `    <string name="ToolTip">${xmlEscape(spec.meta.tooltip || spec.meta.name)}</string>\n` +
    `    <bool name="RequiresHandle">true</bool>\n` +
    `    <bool name="CanBeDropped">true</bool>\n` +
    `    <bool name="ManualActivationOnly">false</bool>\n` +
    cframeXml('Grip', grip, '    ') +
    `  </Properties>\n`;
  // The handle part must be named "Handle" for Tools; other parts keep their design names.
  for (const p of ordered) out += partXml(p, p === handle ? 'Handle' : p.name);
  out += `</Item>\n</roblox>\n`;
  return out;
}

// ---------------- Luau builder ----------------
function toLuau(spec) {
  const handle = handleOf(spec);
  const grip = gripOf(spec);
  const palette = new Map();
  for (const p of spec.parts) {
    const key = `${p.color}|${p.material}|${p.reflectance}|${p.transparency}`;
    if (!palette.has(key)) palette.set(key, { id: palette.size + 1, ...p });
  }
  const lines = [];
  lines.push(`-- ${spec.meta.name}${spec.meta.collection ? ` (${spec.meta.collection})` : ''}`);
  lines.push(`-- Generated by tools/weaponkit from weapons/${spec.meta.slug || 'design'}/design.js. Do not edit by hand.`);
  lines.push(`--`);
  lines.push(`-- Two ways to use it:`);
  lines.push(`--   * Studio command bar: paste the whole file and press Enter. A Tool named`);
  lines.push(`--     "${spec.meta.name}" appears in StarterPack (and a display copy in Workspace).`);
  lines.push(`--   * ModuleScript: require it and call .build() to get a new Tool instance.`);
  lines.push('');
  lines.push('local STYLES = {');
  for (const s of palette.values()) {
    const [r, g, b] = hexToRgb(s.color);
    lines.push(
      `\t[${s.id}] = { Color = Color3.fromRGB(${r}, ${g}, ${b}), Material = Enum.Material.${s.material}, Reflectance = ${fmt(s.reflectance)}, Transparency = ${fmt(s.transparency)} },`,
    );
  }
  lines.push('}');
  lines.push('');
  lines.push('-- { name, class, size, CFrame relative to the handle, style }');
  lines.push('local PARTS = {');
  const cf = (c) =>
    `CFrame.new(${[...c.pos, ...c.rot].map(fmt).join(', ')})`;
  for (const p of [handle, ...spec.parts.filter((q) => q !== handle)]) {
    const key = `${p.color}|${p.material}|${p.reflectance}|${p.transparency}`;
    const rel = relative(handle, p);
    const name = p === handle ? 'Handle' : p.name;
    lines.push(
      `\t{ ${JSON.stringify(name)}, "${p.shape === 'Wedge' ? 'WedgePart' : 'Part'}", Vector3.new(${p.size.map(fmt).join(', ')}), ${cf(rel)}, ${palette.get(key).id} },`,
    );
  }
  lines.push('}');
  lines.push('');
  lines.push(`local GRIP = ${cf(grip)}`);
  lines.push('');
  lines.push('local function build(): Tool');
  lines.push('\tlocal tool = Instance.new("Tool")');
  lines.push(`\ttool.Name = ${JSON.stringify(spec.meta.name)}`);
  lines.push(`\ttool.ToolTip = ${JSON.stringify(spec.meta.tooltip || spec.meta.name)}`);
  lines.push('\ttool.RequiresHandle = true');
  lines.push('\ttool.Grip = GRIP');
  lines.push('');
  lines.push('\tlocal handle: BasePart');
  lines.push('\tfor _, def in PARTS do');
  lines.push('\t\tlocal name, class, size, offset, styleId = def[1], def[2], def[3], def[4], def[5]');
  lines.push('\t\tlocal style = STYLES[styleId]');
  lines.push('\t\tlocal part = Instance.new(class)');
  lines.push('\t\tpart.Name = name');
  lines.push('\t\tpart.Size = size');
  lines.push('\t\tpart.Color = style.Color');
  lines.push('\t\tpart.Material = style.Material');
  lines.push('\t\tpart.Reflectance = style.Reflectance');
  lines.push('\t\tpart.Transparency = style.Transparency');
  lines.push('\t\tpart.TopSurface = Enum.SurfaceType.Smooth');
  lines.push('\t\tpart.BottomSurface = Enum.SurfaceType.Smooth');
  lines.push('\t\tpart.Anchored = false');
  lines.push('\t\tpart.CanCollide = false');
  lines.push('\t\tpart.Massless = true');
  lines.push('\t\tif name == "Handle" then');
  lines.push('\t\t\thandle = part');
  lines.push('\t\t\tpart.CFrame = CFrame.identity');
  lines.push('\t\telse');
  lines.push('\t\t\tpart.CanTouch = false');
  lines.push('\t\t\tpart.CanQuery = false');
  lines.push('\t\t\tpart.CFrame = handle.CFrame * offset');
  lines.push('\t\t\tlocal weld = Instance.new("WeldConstraint")');
  lines.push('\t\t\tweld.Name = "WeaponWeld"');
  lines.push('\t\t\tweld.Part0 = handle');
  lines.push('\t\t\tweld.Part1 = part');
  lines.push('\t\t\tweld.Parent = part');
  lines.push('\t\tend');
  lines.push('\t\tpart.Parent = tool');
  lines.push('\tend');
  lines.push('\treturn tool');
  lines.push('end');
  lines.push('');
  lines.push('-- Run from the command bar: `script` is nil there.');
  lines.push('if not script then');
  lines.push('\tlocal tool = build()');
  lines.push('\ttool.Parent = game:GetService("StarterPack")');
  lines.push('\tlocal display = build()');
  lines.push('\tfor _, d in display:GetDescendants() do');
  lines.push('\t\tif d:IsA("BasePart") then d.Anchored = true end');
  lines.push('\tend');
  lines.push('\tdisplay.Handle.CFrame = CFrame.new(0, 4, 0) * display.Handle.CFrame');
  lines.push('\tdisplay.Parent = workspace');
  lines.push(`\tprint("Built ${spec.meta.name}: Tool in StarterPack, anchored display copy in Workspace at (0, 4, 0)")`);
  lines.push('end');
  lines.push('');
  lines.push('return { build = build }');
  lines.push('');
  return lines.join('\n');
}

// ---------------- OBJ / MTL ----------------
function toObj(spec, mtlName) {
  const mats = new Map();
  let obj = `# ${spec.meta.name} — generated by tools/weaponkit\n# Units: studs (1 stud = 0.28 m). Y up, blade along +Y.\nmtllib ${mtlName}\n`;
  let vi = 1;
  for (const p of spec.parts) {
    const key = `${p.material}_${p.color.slice(1)}`;
    if (!mats.has(key)) mats.set(key, p);
    obj += `o ${p.name}\nusemtl ${key}\n`;
    const wv = worldVerts(p);
    for (const w of wv) obj += `v ${w.map(fmt).join(' ')}\n`;
    for (const f of FACES[p.shape]) obj += `f ${f.map((i) => i + vi).join(' ')}\n`;
    vi += wv.length;
  }
  let mtl = '';
  for (const [key, p] of mats) {
    const [r, g, b] = hexToRgb(p.color).map((c) => fmt(c / 255));
    mtl += `newmtl ${key}\nKd ${r} ${g} ${b}\nKa 0 0 0\nKs 0.1 0.1 0.1\nd ${fmt(1 - p.transparency)}\nillum 2\n\n`;
  }
  return { obj, mtl };
}

function summary(spec) {
  const b = bounds(spec.parts);
  const counts = {};
  for (const p of spec.parts) counts[p.shape] = (counts[p.shape] || 0) + 1;
  return {
    name: spec.meta.name,
    parts: spec.parts.length,
    counts,
    boundsMin: b.min.map((n) => +n.toFixed(3)),
    boundsMax: b.max.map((n) => +n.toFixed(3)),
    size: b.size.map((n) => +n.toFixed(3)),
  };
}

module.exports = { toRbxmx, toLuau, toObj, summary, relative, hexToRgb };
