# Cairnwrought: collection style guide

> Iron pried from the toppled grave-cairns of the barrow roads and reforged by the wardens who
> keep them. Every Cairnwrought piece steps in course by course like the cairn it came from,
> keeps one dolmen window where its load turns, shows plainly how it is held together, and is
> bound with a single lashing dyed in burial ochre.

This file is the reference for every weapon in the collection. The first piece is
**Gravestair**, a single-edged greatsword (construction breakdown at the end).

## Premise

The barrow roads are lined with cairns raised over the dead. When the cairns fall, the wardens
who keep the roads take the grave-iron, reforge it, and arm themselves with it. They are not
smiths of fine work. They build the way they build cairns and dolmens: in stacked courses, with
posts and lintels, pinned and lashed so every joint can be seen and checked. The ochre that was
once daubed on the dead now dyes the one binding on each weapon.

Tone: grim, weathered, heavy, practical. Nothing is decorative unless it is also a fastening,
a mark of the maker, or a sign of the burial the iron came from.

## Palette

| Hex | Material | Role |
| --- | --- | --- |
| `#878c8f` | Metal | **Ground edge.** The only bright steel: true-edge bevels and their land. |
| `#54585b` | Metal | **Draw-filed steel.** Blade flats, the ricasso frame (rails, sill, capstone), and the steel core wherever it shows through the fittings: tang, pins, peened button. Also the dull, exposed steel inside an edge nick. |
| `#383b3e` | CorrodedMetal | **Fuller floor**, left in forge scale. |
| `#2b2c2e` | CorrodedMetal | **Forge-black.** Spine rib, back shoulder, the clip (false-edge) facets and land, the cairn mark. |
| `#2a2928` | CorrodedMetal | **Blackened iron fittings.** Guard, seat, langets, throat, ferrule, pommel. |
| `#3f3229` | Fabric | **Grip leather.** Kept a full value step above the iron, so the hilt never reads as one dark mass. |
| `#251d18` | Fabric | **Raised wrap cord.** |
| `#6e4230` | Fabric | **Accent: burial ochre.** The only hue in the collection. Used once per weapon, as a lashing. |

Rules:

- **Value order, lightest to darkest:** ground edge, steel flats, fuller, leather, iron and
  forge-black. Keep it that way on every piece, so a greyscale thumbnail still reads edge, blade,
  grip, and fittings.
- **One accent, one place.** Burial ochre appears only as the lashing where the hands part (or,
  on one-handed pieces, where the hand meets the head or blade). It must be at least 0.12 studs
  tall so it survives gameplay distance. Never use it on metal, as a stone, or as paint.
- **No Neon, no transparency, no reflectance.** The collection's glow is the bright edge.
- A piece uses at most these eight swatches. A new material needs a written reason in its own
  IDENTITY notes.

## Shape language (rules for every piece)

1. **Cairn steps, never curves.** Major forms change width in hard right-angle courses, two or
   three per form. Each step is at least 1/40 of the piece's overall length, so it lands on a
   whole pixel of a 40 px thumbnail and reads cleanly at 64 px: 0.17 on the 6.74-stud
   Gravestair, about 0.035 on a 1.4-stud dagger. Thickness steps with width, so the distal taper
   follows the courses. Each thickness step is at least 0.03 per face; anything thinner reads as
   a render seam, not a ledge. Every inside corner gets a 45° smith's fillet of about half the
   step (0.085 here). Steps move mass *back* toward the hand. A form never widens toward its
   working end.
2. **One dolmen window, justified.** Each weapon has exactly one rectangular through-piercing,
   taller than it is wide, where its load turns: a ricasso, an axe cheek, a spear socket, a
   shield's grip bar. It must look sound. It is pierced through solid stock, so there is metal on
   all four sides and the tang or haft has an unbroken root below it. The uprights are at least
   0.18 wide, the lintel stands proud of them, and iron langets or straps pinned through the
   uprights clamp it to the next fitting. The window is **echoed small and blind** (recessed,
   never pierced) elsewhere on the same piece, at about the same proportions, never squarer. On
   Gravestair, the pommel's window shows the steel tang.
3. **Clipped ends.** Points and butts finish in one long, straight, off-axis cut. A blade's
   point is a long clip from the spine (30-35°) meeting a short, shallow rise of the true edge
   (10-15°). The point sits between the edge line and the grip axis, never on the edge line
   (that reads as a cleaver) and never centred with equal facets (that reads as a spear). A
   pommel or butt cap ends in a flat seat for the peen, then one clip up toward the spine side.
4. **Down-swept cross members.** Guards, lugs and beards fall 25-30° toward the wielder's
   hands. They have a chamfered hexagonal section and square-cut ends. A two-hander's guard
   spans at most 1.7 studs, so arms and torso clear it in two-hand animations. Nothing on a
   guard may enter the wielder's hand: see *Hand clearance* below.
5. **Two-tone iron.** Spines, fittings and fuller floors are dark. Flats are mid-grey
   draw-filed steel. Bright steel appears only on true ground edges. The forge-black spine runs
   unbroken from the shoulder to the point: a proud rib along the courses, then a forge-black
   false-edge facet down the clip.
6. **Show the joinery.** Every fitting has a visible reason to stay on: pinned langets, a
   seat course bedding the blade, a tapered throat into the guard, a peened tang button under
   the pommel. The button is a diamond, the same square-turned-45° as the pin heads. Pin heads
   and the peen are bare steel, so they catch light against the iron.
7. **Bound and capped.** Grips are leather with slanted raised cords. The ochre lashing is
   knotted on the show side (+X) and has one frayed tail tucked flat under the next cord. Never
   add a hanging ribbon or cloth: static geometry breaks in swing animations. The pommel is a
   stepped capstone: chamfered crown, body, clipped foot.
8. **The cairn mark.** Each piece carries the wardens' mark on its lintel or the nearest
   load-bearing face: three blackened courses stepping in (widths about 3 : 2 : 1), struck through
   both faces.
9. **Worn, not ruined.** Grave-iron has been used. Each piece carries one or two wear cues cut
   into its geometry, such as a nick in the edge or a chip off a square end, placed where the
   work happens (the lower third of an edge, the toe of a bit). Keep them small (about 0.05 deep
   on a greatsword), in exposed-steel grey, and out of the main silhouette lines, so the piece
   still reads clean at thumbnail size.

Silhouette test: every piece must be recognisable as solid black on white at 40 px tall. At that
size its type, its down-swept member and its clipped end must read. At 64 px tall, the steps and
the window must also show, and the piece must not read as the generic form of its type.

## Construction rules (Roblox, weaponkit)

- Native Block and Wedge parts only, via `tools/weaponkit`. Aim for 40-110 parts per weapon.
- `validation.errors` empty, **zero warnings**, `verify.luau` OK.
- Nothing thinner than about 0.028 studs. No hairline facet shells.
- Straight bevel runs are solid right-angle wedges. At mitres and points, bevels are facet slabs
  whose outer face lies on the bevel plane, over an edge land 0.06 thick. The slabs are thinner
  than the land, so the two faces never cross. Where facets converge on a point, run the land
  0.03 past the point to wrap the slab corners.
- Colour changes happen on real steps (at least 0.005 proud or inset) or at a hard edge of the
  form. Two different swatches never overlap on a shared face plane.
- **No needless joints.** Roblox restarts a material's texture at every part boundary, and flush
  joints show as seams. Split a face only where it has a real edge, an opening or a step. No
  flush joint runs right across a face.
- **Hand clearance.** `grip.pos` is where Roblox's hand closes. With the default hold, the hand
  and forearm are a 1 × 1 box running back from that point along +Z (x ±0.5, y = grip ± 0.5,
  z 0 to 2). No part of the guard, throat or blade may enter that box. Only the wrap and its
  cords and lashing sit inside it.
- Dimensions are in studs, for an R15 character about 5.2 studs tall. Use the axes from the
  kit README.

## Naming convention

- **The collection** is *Cairnwrought*. Its makers are *the wardens* of the barrow roads.
- **A weapon** takes one closed English compound: a burial word (*grave, barrow, howe, kist,
  cist, cairn, sarsen*) joined to a mason's word for a part of a built structure (*stair,
  lintel, sill, post, course, door, capstone*). The compound names the piece's signature form.
  *Gravestair* is the grave-iron blade whose spine is a stair.
- Names reserved for the next pieces: *Howelintel* (bearded axe: the beard is a lintel over
  the cheek window), *Barrowpost* (spear with a stepped socket), *Kistdoor* (tower shield),
  *Cairnsill* (arming dagger).
- **Parts** in `design.js` are named for their job (`Capstone`, `RicassoSill`, `Lashing`,
  `Tier2Rib`), never for their shape alone. A side tag goes last: `Fwd` (forward-edge side,
  −Z), `Spine` (+Z), `PX` (+X, the show side where the lashing is knotted) and `NX` (−X). So a
  scripter looking for the rear quillon finds `GuardArmSpineCore`, and the −X langet on the
  forward rail is `LangetFwdNX`. Pieces of one split face are numbered or named for where they
  sit (`Tier3Crown1`, `FacetRisePoint`, `Tier3RibPlunge`), never given build letters. Mirrored
  parts get explicit names through `m.mirror(part, axis, name)`, never the kit's automatic
  `_MX` suffixes.

### Carrying the rules to other types

| Type | Cairn steps | Dolmen window | Clipped end | Down-swept member | Ochre lashing |
| --- | --- | --- | --- | --- | --- |
| Axe | Head steps back toward the haft in two courses | Through the cheek, clamped by pinned eye straps | Toe of the bit | The beard | Below the head, where the top hand sits |
| Spear | Socket in three courses | In the socket, between its langets | Clip-and-rise point | Lugs under the head | At the socket |
| Shield | Boss in stepped courses | Through the grip bar behind the boss | One lower corner | Rim straps | Around the grip |
| Dagger | Two blade courses | Ricasso, uprights at least 0.12 at this scale | Clip-and-rise point | Short guard | Where the grip meets the guard |

## Gravestair: construction breakdown

Axes follow the weaponkit convention: blade +Y, forward edge -Z, flats ±X, origin at the grip
centre. There are **107 native parts (58 Blocks, 49 Wedges)**. Overall length is **6.74 studs**,
from y -1.19 to y 5.55. The guard spans 1.65. Validation: 0 errors, 0 warnings. The thinnest
part is 0.028. Verify prints OK. Estimated balance (volume × density, overlaps included) is about
0.9 stud above the guard seat (0.87), with about 9% of the mass in the pommel.

- **Grip.** The `Handle` block is 1.36 long and 0.22 × 0.26 in section, in leather. The wrap
  runs 1.22 between the throat and the ferrule, room for two hands. Six raised cords are tilted
  15° to read as a spiral. At the hand split (y 0), a 0.13-tall burial-ochre lashing carries a
  diamond knot on the +X face and one frayed tail, 0.17 long, lying flat along the grip.
- **Tool grip.** `grip.pos` is the centre of the wrap (y 0). Roblox's hand is a 1-stud box, so
  it spans y -0.5 to 0.5: 0.10 under the throat, 0.012 under the lowest corner of the spine-side
  quillon, and 0.12 above the ferrule. Nothing but the wrap enters the hand. The fist covers the
  spine half of the lashing, and the forward half and the knot's front show ahead of it.
- **Throat and ferrule.** A tapered iron throat flares from the grip (0.30) to 0.48 where it
  meets the guard. A plain iron ferrule caps the bottom of the wrap.
- **Pommel.** A stepped capstone. The crown's chamfers flare it from 0.36 to 0.54. The body is
  0.54 × 0.20 × 0.38, with a blind window (0.08 wide × 0.13 tall, a small echo of the ricasso
  window) on each face in which the steel tang shows, recessed 0.06. Below it, the foot is flat
  under the edge side and clipped up toward the spine. The only joints on the faces are the
  window's jambs, run on to the crown and the foot, and the foot line on the spine half where
  the clip starts. A diamond steel peen button, 0.10 square turned 45°, finishes the tang on the
  flat seat.
- **Guard.** The hub is 0.70 × 0.26. It has a 0.36 iron core with 0.08 cheeks, so it reads as a
  hexagon from the edge. On top sits a second, narrower course, the seat (0.61 wide, 0.07 tall,
  chamfered ends), which beds the ricasso. The arms are chamfered hexagonal bars, 0.20 tall and
  0.40 across the cheeks. They fall 28° from the hub to square-cut ends.
- **Ricasso and window.** A pierced steel frame. Two 0.19-wide rails, 0.28 thick, and a steel
  sill across their feet (0.05 showing above the seat) frame a 0.20 × 0.30 through-window, so
  the blade has a solid root for the tang. Above it sits a 0.22-tall capstone lintel, 0.32 thick:
  0.02 proud of the rails and 0.03 proud of the blade on each face. The cairn mark (0.20 / 0.13 /
  0.06 courses) is struck through it. Iron langets, 0.035 thick, run up each rail face from the
  seat and end in a 0.07 chisel clip that leans toward the forward edge. One steel pin with
  diamond heads passes through each langet, rail and langet. The front shoulder is the capstone
  itself flaring 0.09 out to the edge line, at the capstone's full thickness, so its top is the
  same plunge ledge that runs round the blade's foot. The back shoulder, in forge-black, flares
  0.175 and starts the rib.
- **Blade.** 3.93 from the shoulders to the point. The true edge is one straight line (z -0.38)
  from the shoulder to y 4.91. There it rises 12° to the point at z -0.25, a quarter-stud off the
  grip axis. The spine steps in twice by 0.17, giving courses 0.84, 0.67 and 0.50 wide, then
  turns into a 32° clip at y 4.93. The point angle is 44°.
- **Section.** The core thins with each course: 0.26, 0.20, 0.14 thick, a 0.03 ledge on each face
  at every step. A forge-black rib, 0.17 wide (exactly the step) and 0.05 thicker than its
  course, follows the stairs, so every step is black, with a 0.085 fillet in each inside corner.
  The ground bevel is 0.17 wide over a 0.06 land. A straight fuller, 0.12 wide and 0.035 deep per
  side, runs from y 1.76 to y 4.00 and closes 0.14 below the last step.
- **Wear.** One old nick low on the first course, at y 2.02 to 2.14: a wedge-shaped bite 0.05
  deep. Above it the bevel runs on in the same plane. Below its deepest point the break slopes
  back out to the sound edge with the bevel knocked off, and the broken faces show dull,
  draw-filed grey. Otherwise the land runs as one strip from the shoulder to the rise.
- **Point.** The last course and the point are built from four things. The flat core is a
  block, a wedge and a triangle. The rib ends in a plunge cut square to the clip. The land plate
  is bright under the rise and forge-black under the clip, with its apex 0.03 past where the
  facets converge. The facet slabs are 0.028 deep: bright on the true edge and the rise,
  forge-black on the clip, meeting on a ridge. The spine's black therefore runs unbroken to the
  tip, and only the working edge is bright.

### In-game integration (game side, not the model)

The weaponkit exporter sets these, and `design.js` cannot change them:

- The Tool is exported with `CanBeDropped = true`, but every part (the Handle too) has
  `CanCollide = false`. A dropped Gravestair falls through the floor. Set
  `tool.CanBeDropped = false` when the game hands it out.
- Only the `Handle` (the leather grip) has `CanTouch` and `CanQuery` on, so a classic
  `Handle.Touched` sword script would register hits only on the grip. Use a raycast or
  shapecast hitbox along the blade instead: y 1.62 to 5.55, z -0.38 to 0.465, x ±0.155, in
  Handle space.

## Revision notes (concept to ship)

The panel chose the *Gravestair* concept. The shipped piece keeps its silhouette and fixes what
the judges flagged, grafting the strongest compatible ideas from the other concepts:

- **Window made sound.** Rails widened from 0.14 to 0.19. Added pinned langets (from *Long
  Tally*) and a proud, taller lintel.
- **Point moved off the edge line.** The point was 0.38 off the grip axis; it is now 0.25, set
  by a 12° edge rise, so it no longer reads as a cleaver and thrusts line up with the hands. The
  clip is kept forge-black so the spine graphic is unbroken.
- **Solid tip.** The 0.02 facet shells on a hairline land are gone. The tip now uses facet
  slabs over a 0.06 land (the *Overburden* approach): no part under 0.028, zero warnings, and no
  nick at the point.
- **Accent that reads in play.** The pommel stone became an ochre lashing at the hand split
  (from *Overburden*), with a frayed tail tucked flat instead of *Compline*'s hanging ribbon.
- **Transitions that read.** The 0.02 collar step became a tapered throat under the guard
  and a chamfered seat course above it (from *Compline*).
- **Joinery shown.** Added a peened tang button (from *Long Tally*). The guard arms are now
  chamfered hexagonal bars.
- **Motif at several scales.** The window is echoed blind in the pommel, and the cairn mark
  sits on the capstone (after *Compline*'s repetition across scales).
- **Readability.** Guard span cut from 2.02 to 1.65 for animation clearance, with a steeper
  28° fall so the chevron still reads. Grip leather lifted a value step (`#2e2621` to `#3f3229`).
  The distal taper steps with the courses, which breaks up the flats.

## Revision notes (critique round 1)

- **Hand no longer swallows the guard.** `grip.pos` moved from y 0.34 to y 0 (the wrap's
  centre). At 0.34, a Roblox hand box (y -0.16 to 0.84) held 87% of the spine-side quillon's core,
  half the throat and a quarter of the hub, so in play the guard read one-armed. Now only the
  wrap is inside the hand. This is written into the construction rules as *Hand clearance*.
- **Front shoulder rebuilt as part of the capstone.** It was a 0.24 plate, 0.03 per face thinner
  than the capstone, and read as a glued-on fin. It now has the capstone's full 0.32 thickness,
  so it reads as the lintel flaring to the edge line, and its top is the same plunge ledge as the
  rest of the capstone. The art review preferred deleting it, but that would leave the bright
  bevel overhanging the ricasso in a square step while the back shoulder stays sloped. The
  thickened flare fixes the fin and keeps the two shoulders matched.
- **Pierced ricasso.** A steel sill closes the window's foot. It is flush with the rails and
  meets them edge to edge, so it adds no hairline. The frame is steel on all four sides and the
  tang has a root. The window is now 0.20 × 0.30.
- **Distal taper that reads.** 0.24 / 0.21 / 0.18 (0.015 per face, which read as render seams)
  became 0.26 / 0.20 / 0.14 (0.03 per face). The capstone thickened from 0.30 to 0.32 to stay
  proud of the thicker first course.
- **Deeper stairs.** The steps went from 0.14 to 0.17 (1/40 of the length), with the courses now
  0.84 / 0.67 / 0.50 and 0.085 fillets. Rule 1 and the silhouette test are restated to match what
  thumbnails actually show. At 40 px a 0.20-wide window on a 6.74-stud piece is about one grey
  pixel, so the full test is at 64 px, where the steps and the window both show.
- **Pommel window as a true echo.** 0.11 × 0.13 (read as a keyhole) became 0.08 × 0.13, near the
  new ricasso window's proportions. The tang sits 0.06 deep instead of 0.04, so it reads as a
  slot. The pommel's flush lintel, sill and foot joints, which ran right across both faces, are
  gone. The posts run full height and the only joints left are the window's.
- **Diamond peen.** The square plus a 45° square made an eight-pointed star, not the octagon
  this file claimed. It is now one diamond, matching the pin heads, and it is one part fewer.
- **One wear cue.** A wedge-cut nick low on the first course. The blade no longer looks freshly
  forged, and the silhouette stays clean.
- **Explorer names.** Every part has an explicit name with one side convention
  (`Fwd`/`Spine`/`PX`/`NX`). No `_MX_MZ`, `R`, `T0` or `A` suffixes remain.
- **Declined for `design.js`: exported Tool flags.** `CanBeDropped`, `CanCollide` and
  `CanTouch` are set by the weaponkit exporter, not by the design. They are documented under
  *In-game integration* for the game side and reported to the kit owner.
