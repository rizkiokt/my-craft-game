# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no build step. The game is a static browser app that imports Three.js directly from `node_modules/`.

**Run locally:**
```bash
npx serve .
# or
python3 -m http.server
```

**Syntax check (no test suite):**
```bash
node --check main.js
```

**Deploy:** Pushing to `main` automatically deploys to GitHub Pages via `.github/workflows/static.yml`.

## Architecture

Native ES modules, no bundler and no framework. `index.html` loads `main.js`, which is only a composition root: it imports from `src/`, wires listeners, and starts the loop. Three.js is imported straight from `node_modules/`, so **every import path is relative and must keep its `.js` extension**.

### Module layout

Modules are layered; a module may only import from a layer below it. `src/ui/*` reaches up one level with `../`.

| Layer | Modules | Role |
|---|---|---|
| 0 | `constants.js`, `dom.js`, `math.js` | Tables, element handles, noise/util maths. No imports. |
| 1 | `settings.js`, `bindings.js`, `state.js`, `recipes.js` | Options, control scheme, mutable state, recipe tables |
| 2 | `worldgen.js`, `textures.js`, `world.js`, `items.js`, `enchanting.js` | Terrain, atlas, voxel storage, item rules, XP |
| 3 | `scene.js`, `icons.js`, `chunkMesh.js`, `sound.js`, `mobs.js`, `particles.js`, `playerModel.js` | Three.js resources and singletons |
| 4 | `player.js`, `interaction.js`, `crafting.js`, `combat.js`, `drops.js`, `portals.js`, `pointerLock.js`, `fullscreen.js`, `save.js` | Gameplay systems |
| 5 | `ui/hud.js`, `ui/inventory.js`, `ui/screens.js`, `ui/controlsScreen.js`, `ui/options.js`, `ui/menus.js`, `ui/worlds.js`, `ui/portals.js` | Screens and overlays |
| 6 | `actions.js`, `input.js`, `touch.js`, `loop.js`, `debugApi.js` | Input routing and the frame loop |

**The import graph is acyclic — keep it that way.** Three places would otherwise close a loop and all use dependency inversion instead:

- `pointerLock.js` cannot import `ui/screens.js`, so it exposes `onUnexpectedUnlock(handler)` and `main.js` registers `openPauseMenu`.
- `actions.js` cannot import `loop.js`, so `takeScreenshot()` sets `state.screenshotRequested` and `render()` performs the capture (the drawing buffer is not preserved, so it must happen in the same task as the draw).
- `ui/options.js` cannot import `touch.js`, so it exposes `onTouchSettingChanged(handler)` and `main.js` registers `syncTouchControls`.

DOM listeners are never attached at module scope. Each wiring module exports an `install*Handlers()` function that `main.js` calls once: `installMenuHandlers`, `installWorldsHandlers`, `installPortalHandlers`, `installOptionsHandlers`, `installInputHandlers`, `installTouchHandlers`, `installDebugApi`.

Because `state.player.y` needs the world to know where the ground is, `state.js` declares `y: 0` and `main.js` sets the real spawn height during boot.

### Key singletons (module-level globals)

| Variable | Class / Type | Role |
|---|---|---|
| `world` | `World` | Voxel storage, terrain generation, block get/set |
| `chunkMeshes` | `ChunkMeshManager` | Builds and syncs Three.js meshes from dirty chunks |
| `passiveMobs` | `PassiveMobManager` | Spawns/updates sheep and villagers per chunk |
| `soundEngine` | `SoundEngine` | Procedural Web Audio for all game sounds |
| `state` | plain object | All mutable game state (player, screen, mode, inventory, etc.) |
| `bindings` | plain object | action → input token map, persisted to `localStorage` |
| `settings` | plain object | Sensitivity, FOV, volume, render distance, toggles |
| `playerModel` | `THREE.Group` | Textured avatar with armour and held item, shown in the F5 third-person views |

### Game loop

`update(dt)` runs at a fixed 60 Hz step (`FIXED_STEP = 1/60`). It gates everything behind `state.running` and `state.isDead`. Physics, input, and world updates happen inside the `!state.isDead` block; particles, dropped items, mobs, and rendering always run while the game is active. When no world is running, `update` still calls `render(dt)` so the title screen's orbiting panorama keeps moving.

### Input

Input is binding-driven, not key-literal. A **token** is either a `KeyboardEvent.code`
(`"KeyW"`) or a `MouseEvent.button` prefixed with `Mouse` (`"Mouse0"` left, `"Mouse1"`
middle, `"Mouse2"` right). `DEFAULT_BINDINGS` mirrors Minecraft Java Edition.

- **Held state** — `state.keys` is a `Set` of currently-down tokens (keyboard *and* mouse). Poll it with `isActionDown(action)` inside `handleInput(dt)`.
- **Press state** — `keydown`/`mousedown` resolve the token through `actionsForToken()` and dispatch to `handleActionPress(action, event)`. Never poll for one-shot actions.
- `canonicalToken()` maps Right Shift/Ctrl/Alt onto their left twin unless that twin is separately bound.
- Adding a new action: add it to `DEFAULT_BINDINGS`, `BINDING_LABELS`, and a `BINDING_GROUPS` entry, then handle it in `handleActionPress` (one-shot) or `handleInput` (held).

### Touch controls

`src/touch.js` adds an on-screen pad without a second input path: **every control presses
and releases the same token the keyboard would**, through `bindings[action]`, so rebinding,
sprint latching and double-tap flight all keep working. Nothing in that module knows what an
action does. A new button is one element with `data-hold` (held) or `data-press` (one-shot)
naming the action.

Buttons are inline SVG glyphs, not words — quicker to read mid-game and readable by players
who cannot read yet. Each carries an `aria-label`, and `.touch-btn svg` sets
`pointer-events: none` so a press can never land on the glyph instead of the button. Break and
build are the same cube (cracked and whole) and are **tinted apart** as well as drawn apart,
because two glyphs that similar are easy to confuse at a glance.

Visibility is a body class, not a JS branch: `syncTouchControls()` toggles `is-touch` and
`styles.css` does the rest, keyed off the `is-playing` class `showScreen()` already sets.
That is why `ui/options.js` (layer 5) can own the setting while `touch.js` (layer 6) owns
the behaviour. `pointerLock.js` reads the same class to skip locking the pointer on a phone,
where the request would only be rejected.

The stick appears wherever the thumb lands in the left `STICK_ZONE` of the screen rather
than sitting in a fixed corner. Canvas touch handlers all `preventDefault()`, which is what
stops the browser scrolling, zooming, and firing synthetic mouse events at `input.js`.

`settings.touchControls` is `"auto"` (on for any device reporting touch), `"on"` or `"off"`.

### Screens

`showScreen(name)` owns the whole UI stack: `"playing"`, `"title"`, `"pause"`, `"controls"`, `"options"`, `"help"`, `"worlds"`, `"portal"`. It drives `state.running`, toggles `#screen-*` elements, and clears held keys on leaving the world. The `SUB_SCREENS` set names the ones you back out of, so `openSubScreen()` remembers where you came in from even when hopping between them — add a new sub-screen there and to `handleEscape()`. Because Escape while pointer-locked never reaches `keydown`, `updatePointerState()` opens the pause menu whenever the lock is lost unexpectedly — `exitPointerLock()` sets `state.intentionalUnlock` for the deliberate cases.

The death screen is a separate overlay driven by `state.isDead`, not a screen.

### Game modes

`state.gameMode` is `"survival"` or `"creative"` and is saved with the world. Route all
stack maths through `getItemCount()` / `addItem()` / `consumeItem()` — in creative these
report `CREATIVE_STACK` and no-op, which is what makes the palette unlimited.
`canMineBlock`, `getBreakDamage`, and `getInteractionCooldown` short-circuit for creative.

Flight (`state.flying`) is creative-only, toggled by double-tapping the jump binding.
While flying, gravity is skipped in `update()` and `handleInput` drives `player.vy`
directly; touching the ground clears the flag.

### Respawning

`findClosestSafeRespawn()` searches outward in rings (up to `RESPAWN_SEARCH_RADIUS`) and accepts a column only if `evaluateRespawnColumn()` passes: real surface (honouring player edits, unlike `getHeightAt`), player-sized headroom, open sky, and not walled in on 6+ of 8 sides. `updateSafeAnchor()` applies the same test before recording `state.lastSafePos*`, so digging down never makes the shaft your respawn anchor.

### World / terrain

`World.getHeightAt(wx, wz)` is the single source of truth for surface height — it uses layered Perlin noise and is called at both generation time and spawn/respawn time. `World.ensureChunk()` lazily generates chunks on first access. Block reads/writes go through `World.getBlock()` / `World.setBlock()`.

**Coordinate system:** origin near spawn; x = east-west, y = up, z = north-south. Chunks are 16 × 16 columns. Load/unload radii live on the `World` instance (`world.loadRadius` / `world.unloadRadius`) and are driven by the Render Distance option via `world.setRenderDistance()`; default is 2.

### Lighting

`src/world.js` stores one 0-15 light value per cell in `chunk.light`, covering
`LIGHT_MIN_Y..LIGHT_MAX_Y`. Sky light and torch light share the value: day and night are
already handled by the scene's sun, so the mesher only needs "how lit is this spot".

`computeChunkLight()` runs in three parts, and the order matters for speed:

1. **Sky pass** — walk each column down from the chunk top until something opaque stops the
   light, recording where it stopped. Everything below stays 0, so there is no need to look
   further down.
2. **Emitter pass** — light sources are only ever player-placed torches, so it scans
   `chunk.edits` rather than the chunk volume.
3. **Flood fill** — a BFS losing one level per block. Only daylight cells that sit next to a
   *darker* column are queued; seeding every open-air cell above the terrain is what made an
   early version three times slower for no visual difference.

Faces are lit by sampling the open cell they look into, baked into a vertex `color`
attribute, so `worldMaterial` has `vertexColors: true`. `MIN_LIGHT_FACTOR` keeps unlit
blocks visible rather than pure black.

`setBlock()` calls `invalidateLight()`, which dirties the 3x3 chunk neighbourhood, and
`markDirtyAtWorld()` re-meshes the four orthogonal neighbours too, because a torch lights
well past its own chunk. `getLight()` on a chunk that has not been lit yet estimates from
the terrain height — a flat fallback would either bleed bright stripes into caves or paint
dark seams across open ground.

Torches are drawn by the chunk mesher as a slim post rather than a cube, and `isSolid()`
excludes them so you can walk through.

### World seeds

`src/math.js` owns the seed. `setWorldSeed(seed)` reshuffles the Perlin permutation with a
mulberry32 PRNG and offsets `hash3`, which is what moves ores and scattered features.
**Seed 0 deliberately restores the original hardcoded table and a zero hash offset**, so
worlds saved before seeds existed still generate identically.

The seed must be applied before anything reads the world, because chunks generate on first
access — hence `loadWorldSeed()` runs first in `main.js`, ahead of `loadGame()` and the
spawn-height lookup. A seed typed on the title screen is staged in localStorage and applied
on the reload that follows, since changing it mid-session would not match already-generated
chunks.

The city and snow realm are deterministic structures independent of the noise, so they do
not move between seeds.

### Biomes and structures

Terrain zones are composed in `getHeightAt` and `getBlock`:
- **Natural terrain** — Perlin-noise hills, caves, beaches, trees, ore veins
- **City district** — deterministic grid near `x ≈ 18, z ≈ -14`; layout driven by `getCityParcel()` / `getSuburbParcel()` / `getStructureBlock()`
- **Snow realm** — east of city near `x ≈ 112, z ≈ 66`; igloos, lodges, pine trees; driven by `getSnowParcel()`
- **Biome regions** — the five in `BIOME_REGIONS`, driven by `getBiomeAt()` / `getBiomeTargetHeight()` / `getBiomeBlock()`

Structure block selection for both settlements funnels through `getStructureBlock(wx, wy, wz, height)`.

**Biomes carry on forever.** The map is divided into patches by a **jittered grid of sites**
(`BIOME_CELL` apart) rather than by noise thresholds: nearest site wins, which gives irregular
organic borders instead of stripes. `MEADOW_WEIGHT` keeps a share of the sites plain, so
ordinary country still separates one biome from the next. The strength fades towards whichever
*different* biome site is next nearest, so two neighbouring patches of the same kind do not
leave a seam down the middle.

`BIOME_ANCHORS` pins the original five hand-placed regions in place, so a world played before
the map went endless keeps the ground it had, and there is always one of each within a walk of
spawn. The city and the snow realm are excluded from biome selection entirely — they are
landmarks and keep their own terrain.

**`getBiomeAt()` is called per column, never per block.** `ensureChunk()` fills `chunk.biomes`
once and `getGeneratedBlock()` reads that; repeating a nine-site search for every block in a
chunk would be many times the cost of the terrain itself. Anything that sits in the middle of a
patch (the desert's oasis, the Ember Deep's dome) measures from `biome.centerX/centerZ`, which
is the patch's own site rather than a region rectangle.

Adding a biome is a `BIOME_TYPES` entry plus a case in `getBiomeTargetHeight`, `getBiomeBlock`
and `World#decorateBiome`.

Two details are load-bearing:Two details are load-bearing:

- **The Ember Deep's roof hangs a fixed distance below whatever the surface turned out to
  be**, rather than at a fixed height. That seals the cavern by itself wherever its hill runs
  out, instead of needing a special case at the border.
- **The light pass used to seed only from player edits**, on the grounds that torches were the
  only light source. Terrain that glows on its own broke that and the Ember Deep came out
  pitch black. `World#collectEmitters()` lists a chunk's generated glow at generation time, so
  `computeChunkLight()` still seeds from a short list rather than sweeping the chunk volume.
  Any future biome that generates light needs `emissive: true` on its region.

### Portals

`src/portals.js` owns the whole mechanic; `src/ui/portals.js` is only the destination picker.

Rather than matching a fixed shape, `findPortalOpening()` **floods the air pocket a frame
encloses and checks everything around it is frame** — so any rectangle between
`PORTAL_MIN_*` and `PORTAL_MAX_*` works, in either vertical plane, and a frame with a gap in
it floods away and fails. It searches the **diagonal** in-plane neighbours as well as the
orthogonal ones: from a corner of the frame the opening is only ever a diagonal step away, and
most people build the full rectangle, so leaving them out meant touching a corner never lit
anything. On failure it returns the reason and `describeFrameProblem()` turns it into something
actionable — "build a frame" is no help to someone who believes they have, and the common miss
is standing a frame on the ground with no bottom row. Lighting records **every cell** in `state.portals` keyed `"x,y,z"`,
so standing in one is a lookup rather than a search.

**Placing a frame block that completes a ring lights it**, so there is no separate step to
explain. Touching a frame only lights it when your hand is empty — otherwise it places, or
the frame would be the one building material you could not stack a second one on top of.

Portals aim at places, not at each other. `listDestinations()` returns the fixed landmarks
(`FIXED_DESTINATIONS`) plus **the nearest patch of each biome**, found by `findNearestBiome()`
searching outward over the coarse site grid — so "the desert" means whichever one is closest to
you, resolved fresh each time the picker opens or a trip is taken. Arriving always calls
`buildReturnPortal()` pointing back the way you came, so you cannot strand yourself. A
destination marked `underground` arrives in the highest sheltered pocket instead of on the
surface, which is what puts you inside the Ember Deep rather than on the hill over it.

### Rendering

`ChunkMeshManager` rebuilds face-culled geometry for dirty chunks using a single shared `MeshLambertMaterial` and a procedurally generated texture atlas (`getTileCanvas` → canvas-drawn per-block tile → `DataTexture`). `getTileIndex(blockType, faceKey)` maps block faces to atlas tiles. Adding a new block type requires entries there and in `getBlockColor()` (used for particles).

### Crafting

`src/crafting.js` owns grid state and recipe matching; `src/ui/inventory.js` only renders it. Recipes are **shaped**: `trimPattern()` crops both the laid-out grid and the recipe's `pattern` to their bounding boxes and compares, so a pattern matches anywhere in the grid.

`state.station` (`"inventory"` | `"table"` | `"furnace"`) selects the grid size and recipe set via the `STATIONS` table. `state.craftGrid` holds `{itemId, count}` slots taken *out* of the bag, and `state.cursorStack` is the stack held by the mouse. `returnGridToBag()` runs on close so nothing is ever lost.

Stations open from `interact(false)` in `src/interaction.js` via the `STATION_BLOCKS` map — right-click opens, sneak+right-click places against the block instead.

Chests are a station too, but their slots live in `state.chests` keyed by `"x,y,z"` rather than in `state.craftGrid`, with `state.openChestKey` naming the open one. `clickSlot()` / `placeOneInSlot()` take the target array so the grid and a chest share the same cursor-stack behaviour. Breaking a chest calls `emptyChestInto()` so nothing is lost, and empty chests are dropped from the save.

### Enchanting and experience

`src/enchanting.js` owns XP and enchantments. Because the bag is a plain
count-per-item-id map there are no item instances, so **enchantments are stored per item
type** in `state.enchantments[itemId]`. `getHeldEnchantLevel()` is what `items.js` calls to
apply Efficiency (break speed) and Fortune (extra ore drops).

Offers are deterministic from `hash3(itemId, state.enchantSeed, slot)` so the panel does
not reshuffle on every repaint; `rerollOffers()` bumps the seed after a successful enchant.

### Friends (NPCs)

`src/npcs.js` owns the roster of five characters. Palettes are rolled when a world is first
created and then saved, so friends differ per world but stay themselves. `spawnRoster()` uses
`rollRosterPalettes()`, which **deals shirts and trousers from shuffled decks** rather than
rolling each independently — five picks from eleven hues collide more than half the time, and
two friends in the same shirt read as a bug.

Jobs are a small state machine: `startActivity()` picks follow/build/mine/wander and stores
`npc.job = {kind, site, plan, step}`. `runPlan()` walks to the site and applies one block per
beat so you can watch it happen; `workOnJob()` wraps it for jobs and `workOnHelp()` for
favours, so building a hut and digging you out share the same code. They reuse the player
avatar through `createCharacterModel(palette)` and `animateCharacter()` from
`playerModel.js`, so a change to the body shape or walk applies to everyone at once.

Two guards keep them from wrecking your work: **`siteIsFree()` refuses any job site
overlapping existing edits or sitting within 8 blocks of spawn**, and **`canChange()` refuses
to replace any non-air block you placed yourself**, so even a rescue tunnel cuts only through
natural ground.

`update()` runs `considerHelping()` on a timer. `findNeed()` returns the most urgent thing
worth doing — rescue, food, light, gift — and the nearest friend off cooldown takes it;
**only one helps at a time**, or you get a crowd. A favour is either "reach a spot and change
some blocks" (`need.plan`) or "reach the player and hand something over". Two details matter:

- The pit rescue carves a staircase **three blocks tall**. Each step is a full block up,
  which needs a jump (`MAX_STEP_HEIGHT` only covers 0.6), and a jump needs the headroom or
  you crack your head on the ceiling and never get up it.
- `findPitRescue()` returns null when nothing in the plan would actually change, so a hole
  you are still standing in does not get rescued over and over.

`step()` retries sideways when the way is blocked, which is enough to round a hillside
without real pathfinding; `workOnHelp()` still gives up after `HELP_STALL` seconds of getting
no closer, because nobody else may step in while one of them is on the job.

Following has two flavours sharing `npc.following`: asked (right-click) and `autoFollow`,
which `startActivity()` rolls on its own and drops after `followTimer` runs out. **Only asked
follows are serialised**, so a friend who tagged along for a minute is not still with you
after a reload.

Name tags and speech bubbles are canvas `THREE.Sprite`s parented to the character. **They
set `sprite.raycast = () => {}`**: three.js sprite raycasting needs `raycaster.camera`, and
ours is built from the player's eye with `raycaster.set()`, so an un-opted-out sprite throws.

Picking order in `updateTarget()` is: nearest of block, mob and NPC wins the crosshair, with
NPCs and mobs both clamped to the block distance so you cannot reach through a wall.

### Cats and pets

`PassiveMobManager` keeps wild mobs in a per-chunk map that is disposed when the chunk
unloads. **Tamed cats move out of that map into `this.pets`**, which is never chunk-disposed,
so a pet can follow you anywhere; they are saved via `serializePets()` / `restorePets()`.

Entity picking is separate from block picking: `passiveMobs.raycast(ray, maxDistance)` walks
up from the hit mesh to the group carrying `userData.entity`. Cats include an invisible
`catHitPad` box because the model itself is too small to click reliably.

Two ordering rules in `interact()` matter:

- The creature branch runs **before** the `!state.target` bail, because a cat standing
  against open sky has no block behind it to fall back on.
- It only fires when `isPress` is true. Right-click is polled while held, so without the
  edge the sit toggle would flip on and off many times per click. `state.usePressed` is set
  on the press, cleared when the interaction lands, and reset when the button is released.

### The player avatar

`src/playerModel.js` builds the character from boxes with **one canvas texture per face** — BoxGeometry already exposes a material group per side, so the face, collar and shoes need no hand-authored UVs. Armour pieces are slightly larger boxes parented to the limb they cover, tinted from `ARMOR_ITEMS[itemId].color` and toggled per frame by `syncArmor()`.

**`createCharacterModel()` starts every armour mesh hidden**, because only the player runs
`syncArmor()`. Leaving them visible put every NPC in a blank grey suit of armour that covered
their own colours completely — the same trap waits for anything else reusing this model.

The held item is a cube with atlas UVs for blocks, or a flat quad using the item's icon. The same mesh factory feeds the first-person hand, which is a child of the camera — note `scene.add(camera)` is required for a camera's children to render at all.

`applyPlayerToCamera()` records `state.cameraDistance`; the model hides below 1.3 so a wall squeezing the third-person camera never puts it inside the avatar.

### Water and swimming

Water is meshed **separately from the solid world**. `buildGeometry()` fills two buffers and
`rebuildChunk()` makes two meshes: the solid one goes in `this.meshes`, the water one in
`this.waterMeshes` with `waterMaterial` (transparent, `depthWrite: false`, double-sided) and
`renderOrder: 1`. Keeping them apart matters — only the solid mesh belongs in the crosshair
raycast, and an empty carrier mesh would be walked every frame for nothing.

The top face of an exposed water block is dropped by `WATER_DROP`, which is what makes a
shoreline read as water rather than as blue stone.

`getSubmersion()` reports feet, chest and head separately: you **swim** when your feet or chest
are wet, but the view only goes blue when your head is under. Swimming replaces gravity with
buoyancy (`SWIM_*` in constants), clears `state.fallStartY` so a dive never hurts, and turns
the jump binding into "swim up" — breaking the surface with jump held pushes you out onto the
bank. Entering or leaving water splashes.

`state.submerged` drives two things: the `.underwater` tint overlay, and a lowpass on the whole
audio output. **The muffle is what actually sells being under**, more than any splash.

### Sound

`src/sound.js` synthesises everything; there are no audio files to license, host or download,
and the bed can react to where you are in a way fixed clips cannot. Four things carry the
weight:

- **One long noise buffer, played from a random offset** per hit, plus a little random pitch on
  every event, so repeated footsteps never share a texture.
- **Layered voices**: a filtered noise burst for the surface and a pitched body for the mass,
  described per material in `MATERIALS`. Callers pass block types; `BLOCK_MATERIAL` maps them.
- **A convolution reverb from procedurally generated decaying noise.** This is the single
  biggest difference between "synthesised" and "toy" — without it everything happens inside
  the listener's head.
- **`VOICE` and a limiter.** Every voice is written at a working level and scaled in one place;
  the old engine peaked around −40 dBFS, which is most of why it sounded thin.

The **ambient bed** is three looping filtered noise beds (wind, cave rumble, lava) built once
and crossfaded, plus scheduled one-shots — birds by day, crickets at night, drips underground,
crackles in the Ember Deep. **`music`** is a slow four-chord pad with sparse pentatonic notes
over it, loud in the menus and barely there in play.

Nothing in `sound.js` inspects game state: `loop.js` calls `setScene()` with `night`,
`enclosed`, `ember` and `menu`. `enclosed` asks the world for a roof directly rather than
reading the light volume, which is only recomputed lazily and can lag a frame.

**Browsers will not start audio without a gesture**, so `input.js` resumes the context on the
first `pointerdown` anywhere — that is what lets the title screen have music at all.

`settings.ambience` drives the bed and the music together, separately from `settings.volume`.

### Health, damage and armour

`src/combat.js` owns hearts, air, armour and every damage source. `updateVitals(dt)` runs
from the loop and handles fall tracking, drowning, lava and regeneration; `damagePlayer()` is
the only way health goes down and applies armour reduction unless `ignoreArmor` is set.

Lava burns on a timer rather than all at once, and its pools generate one block deep, so
walking into one in the Ember Deep is a fright rather than a death. `getSurfaceData()` skips
lava along with water, so nothing is ever placed standing on top of a pool.

Worn pieces live in `state.armor` keyed by slot, and `ARMOR_ITEMS` in `constants.js` maps
each item to its slot, defence points and tier colour. Reduction is 4% per point capped at
80%, plus 2% per Protection level summed across the set.

### Placing blocks

`canPlaceBlock()` allows any empty cell that the player's own box does not overlap. It used
to ask whether a *player could stand* in the target cell, which got it wrong twice over: it
refused any spot with a block above it — so a gap under an overhang could not be filled, and
the top row of a portal frame could not be closed — while never actually checking where the
player was standing.

### Adding a new block type

1. Add constant to `BLOCKS` and a name to `BLOCK_NAMES`.
2. Add tile mapping in `getTileIndex()`.
3. Add color in `getBlockColor()` (for particles).
4. Optionally add entries in `getBreakHardness()`, `getDropForBlock()`, `getBreakDamage()`.
5. Expose in inventory via `state.inventory` initializer, `PLACEABLE_BLOCKS`, and `CREATIVE_ITEMS`.

### Save / load

`localStorage` keys:

| Key | Constant | Contents |
|---|---|---|
| `mycraft-save-v2` | `SAVE_KEY` | The world you are playing: chunk edits, inventory, hotbar, player position, game mode, name, portals |
| `mycraft-world-<id>` | `WORLD_KEY_PREFIX` | A named save: the same payload, wrapped with its format and name |
| `mycraft-worldinfo-<id>` | `WORLD_INFO_PREFIX` | Just enough to list that save — name, time, seed, mode, block count |
| `mycraft-settings-v1` | `SETTINGS_KEY` | Options screen values |
| `mycraft-controls-v1` | `BINDINGS_KEY` | Key bindings |

Auto-save fires on block edits (with cooldown) and every 8 seconds of elapsed time; `saveGame(true)` forces a write even when the Autosave option is off (used by "Save and Quit" and `beforeunload`).

`buildPayload()` is the single description of a saved world, shared by the autosave, the named
slots and the exported file, so none of them can drift apart.

**Named worlds** (`src/save.js` + `src/ui/worlds.js`) are all browser storage and files on the
player's own machine, which is what lets them work on a static host with nothing behind it.
Three details are load-bearing:

- **Loading replaces `SAVE_KEY` and reloads the page.** The seed decides what every chunk
  generates and is only applied at boot, exactly as a newly typed seed is.
- **`blockSaves()` must be called before any such reload**, or the `beforeunload` autosave
  writes the old world straight back over the one just put in place. This is what made "New
  World" silently do nothing when a seed was typed.
- Info and payload are **separate keys** so listing worlds does not parse every megabyte of
  every save just to print its name.

Exported files are wrapped as `{format: "mycraft-world", version, name, savedAt, data}`;
`importWorldText()` checks the format so an unrelated `.json` is refused rather than
half-loaded, and refuses a `version` newer than it understands.

### UI

All overlays (screens, hotbar, HUD, inventory panel, death screen) are HTML/CSS positioned absolutely over the canvas. JS drives them by toggling CSS classes (`is-hidden`, `is-active`, `is-selected`, `is-creative`) and setting `textContent`.

- The F3 debug overlay is the only place raw diagnostics are printed; the always-on HUD is just crosshair, hotbar, held-item name, and toasts. Use `showToast(message)` for transient messages.
- Pointer lock is requested from `mousedown` on the canvas; the click that acquires the lock sets `state.suppressInteractUntil` so it does not also swing.
- The title screen renders the live world as an orbiting panorama (`updatePanorama`) and paints its wordmark with the game's own grass tile via the `--title-texture` CSS variable.
