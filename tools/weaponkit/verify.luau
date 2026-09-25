--!strict
-- Cross-checks the two Roblox exports of a weapon using Lune's Roblox document library:
--   1. deserialises <Name>.rbxmx the way Studio would (rbx-dom),
--   2. runs the generated <Name>.lua builder against Lune's Instance API,
--   3. compares every part (class, size, colour, material, pose relative to the Handle)
--      and checks welds, Tool.Grip and the part list against <Name>.json.
--
--   lune run tools/weaponkit/verify.luau weapons/<slug>/out/<Name>

local fs = require("@lune/fs")
local luau = require("@lune/luau")
local process = require("@lune/process")
local roblox = require("@lune/roblox") :: any
local serde = require("@lune/serde")

local base = process.args[1]
assert(base, "usage: lune run tools/weaponkit/verify.luau weapons/<slug>/out/<Name>")

local Instance = roblox.Instance
local failures = {}
local function fail(msg: string)
	table.insert(failures, msg)
end

local spec = serde.decode("json", fs.readFile(base .. ".json"))

-- 1. The .rbxmx as Studio would load it.
local roots = roblox.deserializeModel(fs.readFile(base .. ".rbxmx"))
assert(#roots == 1, "expected exactly one root instance in the .rbxmx")
local fileTool = roots[1]
if fileTool.ClassName ~= "Tool" then
	fail("root is " .. fileTool.ClassName .. ", expected Tool")
end

-- 2. The Luau builder, run with Lune's Roblox globals.
local env = {
	Instance = Instance,
	Vector3 = roblox.Vector3,
	CFrame = roblox.CFrame,
	Color3 = roblox.Color3,
	Enum = roblox.Enum,
	script = true, -- pretend we are a ModuleScript so the command-bar branch does not run
}
setmetatable(env, { __index = _G })
local chunk = luau.load(fs.readFile(base .. ".lua"), { debugName = base .. ".lua", environment = env })
local builderTool = chunk().build()

local function partsOf(tool: any): { [string]: any }
	local out = {}
	for _, child in tool:GetChildren() do
		if child:IsA("BasePart") then
			if out[child.Name] then
				fail(tool.Name .. ": duplicate part name " .. child.Name)
			end
			out[child.Name] = child
		end
	end
	return out
end

local fileParts = partsOf(fileTool)
local builtParts = partsOf(builderTool)
local fileHandle = fileParts.Handle
local builtHandle = builtParts.Handle
assert(fileHandle, ".rbxmx has no Handle")
assert(builtHandle, "builder produced no Handle")

local EPS = 1e-4
local function near(a: number, b: number): boolean
	return math.abs(a - b) <= EPS
end
local function cfNear(a: any, b: any): boolean
	local ac = { a:GetComponents() }
	local bc = { b:GetComponents() }
	for i = 1, 12 do
		if not near(ac[i], bc[i]) then
			return false
		end
	end
	return true
end
local function v3Near(a: any, b: any): boolean
	return near(a.X, b.X) and near(a.Y, b.Y) and near(a.Z, b.Z)
end

-- Expected parts from the JSON spec (world CFrames, handle renamed to "Handle").
local expected = {}
local specHandle
for _, p in spec.parts do
	local name = if p.name == spec.meta.handle then "Handle" else p.name
	local r = p.rot
	local cf = roblox.CFrame.new(p.pos[1], p.pos[2], p.pos[3], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9])
	expected[name] = { p = p, cf = cf }
	if name == "Handle" then
		specHandle = cf
	end
end

local count = 0
for name, e in expected do
	count += 1
	local fp, bp = fileParts[name], builtParts[name]
	local className = if e.p.shape == "Wedge" then "WedgePart" else "Part"
	if not fp then
		fail("rbxmx missing part " .. name)
		continue
	end
	if not bp then
		fail("builder missing part " .. name)
		continue
	end
	for label, inst in { rbxmx = fp, builder = bp } do
		if inst.ClassName ~= className then
			fail(`{label} {name}: class {inst.ClassName}, expected {className}`)
		end
		local size = roblox.Vector3.new(e.p.size[1], e.p.size[2], e.p.size[3])
		if not v3Near(inst.Size, size) then
			fail(`{label} {name}: size {inst.Size} expected {size}`)
		end
		local hex = string.format("#%02x%02x%02x", math.round(inst.Color.R * 255), math.round(inst.Color.G * 255), math.round(inst.Color.B * 255))
		if hex ~= string.lower(e.p.color) then
			fail(`{label} {name}: colour {hex} expected {e.p.color}`)
		end
		if inst.Material.Name ~= e.p.material then
			fail(`{label} {name}: material {inst.Material.Name} expected {e.p.material}`)
		end
		if inst.Anchored then
			fail(`{label} {name}: is anchored`)
		end
		if inst.CanCollide then
			fail(`{label} {name}: CanCollide is on`)
		end
	end
	-- Pose relative to the handle must match the design in both exports.
	local want = specHandle:ToObjectSpace(e.cf)
	if not cfNear(fileHandle.CFrame:ToObjectSpace(fp.CFrame), want) then
		fail("rbxmx " .. name .. ": pose relative to Handle differs from the design")
	end
	if not cfNear(builtHandle.CFrame:ToObjectSpace(bp.CFrame), want) then
		fail("builder " .. name .. ": pose relative to Handle differs from the design")
	end
	-- Welds: rbxmx uses Weld (Part0 = Handle, C0 = offset); builder uses WeldConstraint.
	if name ~= "Handle" then
		local w = fp:FindFirstChildWhichIsA("Weld")
		if not w then
			fail("rbxmx " .. name .. ": no Weld")
		else
			if w.Part0 ~= fileHandle or w.Part1 ~= fp then
				fail("rbxmx " .. name .. ": Weld does not join Handle -> part")
			end
			if not cfNear(fileHandle.CFrame * w.C0 * w.C1:Inverse(), fp.CFrame) then
				fail("rbxmx " .. name .. ": Weld C0/C1 would move the part")
			end
		end
		local wc = bp:FindFirstChildWhichIsA("WeldConstraint")
		if not wc or wc.Part0 ~= builtHandle or wc.Part1 ~= bp then
			fail("builder " .. name .. ": missing or wrong WeldConstraint")
		end
	end
end

local function countKeys(t: { [string]: any }): number
	local n = 0
	for _ in t do
		n += 1
	end
	return n
end
if countKeys(fileParts) ~= count then
	fail(`rbxmx has {countKeys(fileParts)} parts, design has {count}`)
end
if countKeys(builtParts) ~= count then
	fail(`builder made {countKeys(builtParts)} parts, design has {count}`)
end

local g = spec.meta.grip and spec.meta.grip.pos or { 0, 0, 0 }
local wantGrip = roblox.CFrame.new(g[1], g[2], g[3])
if not cfNear(fileTool.Grip, wantGrip) then
	fail("rbxmx Tool.Grip is " .. tostring(fileTool.Grip))
end
if not cfNear(builderTool.Grip, wantGrip) then
	fail("builder Tool.Grip is " .. tostring(builderTool.Grip))
end
if fileTool.Name ~= spec.meta.name or builderTool.Name ~= spec.meta.name then
	fail("tool name mismatch")
end

-- Round-trip the builder's Tool through Roblox's binary format as a final sanity check.
local ok, err = pcall(roblox.serializeModel, { builderTool })
if not ok then
	fail("builder Tool failed to serialise: " .. tostring(err))
end

if #failures > 0 then
	print(`FAIL ({#failures})`)
	for _, f in failures do
		print("  - " .. f)
	end
	process.exit(1)
end
print(`OK: {count} parts verified in {base}.rbxmx and {base}.lua (poses, sizes, colours, materials, welds, grip)`)
