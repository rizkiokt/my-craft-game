# FUNCTIONS.md

Reference for every function and system in `main.js`. Check here before adding anything new to avoid duplication.

---

## Constants & Enums

| Name | Value / Purpose |
|---|---|
| `CHUNK_SIZE` | 16 — columns per chunk |
| `LOAD_RADIUS` / `UNLOAD_RADIUS` | 2 / 4 — chunk streaming distance |
| `PLAYER_HEIGHT` / `PLAYER_RADIUS` | 1.8 / 0.34 — collision capsule |
| `GRAVITY` | 24 |
| `MOVE_SPEED` / `JUMP_SPEED` | 5.8 / 8.8 |
| `LOOK_SENSITIVITY` | 0.0022 |
| `MAX_STEP_HEIGHT` | 0.6 — auto-step over 1-block ledges |
| `INTERACTION_RANGE` | 8 — raycaster reach |
| `FIXED_STEP` | 1/60 — physics timestep |
| `MAX_BUILD_HEIGHT` / `MIN_WORLD_Y` / `MAX_WORLD_Y` | 48 / -2 / 64 |
| `WATER_LEVEL` | 7 |
| `BREAK_RESET_TIME` | 1.15 s — decay break progress when not hitting |
| `PARTICLE_POOL_SIZE` | 192 |
| `CLOUD_COUNT` | 18 |
| `SAVE_KEY` | `"mycraft-save-v2"` — localStorage key |
| `DEFAULT_SPAWN` | `{ x: 4.5, z: -1.5, yaw: -1.15, pitch: -0.28 }` |
| `CITY_PLAN` | Bounding rect + road grid params for the city district |
| `SUBURB_PLAN` | Wider bounding rect for detached suburban houses |
| `SNOW_REALM` | Bounding rect + path grid params for the snow biome |

### Block & item IDs

| Enum | Range | Contents |
|---|---|---|
| `BLOCKS` | 0–18 | air, grass, dirt, stone, sand, wood, leaves, planks, bricks, glass, water, coal_ore, iron_ore, crafting_table, furnace, snow, ice, pine_wood, pine_leaves |
| `ITEMS` | 101–105 | stick, coal, iron_ingot, wood_pickaxe, stone_pickaxe |
| `BLOCK_NAMES` | — | Display name for every block and item ID |
| `PLACEABLE_BLOCKS` | — | Array of block IDs the player can place from the hotbar |
| `HOTBAR_SIZE` | 8 | Number of hotbar slots |

### Recipe tables

| Constant | Type | Contents |
|---|---|---|
| `HAND_RECIPES` | array | Always-available crafting: planks (wood or pine_wood → 4 planks), sticks |
| `TABLE_RECIPES` | array | Crafting table only: crafting_table, furnace, wood_pickaxe, stone_pickaxe, bricks |
| `FURNACE_RECIPES` | array | Furnace only: sand+coal → glass, iron_ore+coal → iron_ingot |
| `TOOL_STATS` | object | `{ hand, wood_pickaxe, stone_pickaxe }` — `{ power, speed }` per tool |
| `FACE_DEFS` | array | Six face definitions (key, normal, corners) for mesh building |

---

## Math / Utility Functions

| Function | What it does |
|---|---|
| `perlin2(x, y)` | 2D Perlin noise — deterministic, seeded by the hardcoded `permutation` table |
| `lerp(a, b, t)` | Linear interpolate |
| `clamp(value, min, max)` | Clamp |
| `fade(t)` | Perlin smoothstep curve |
| `grad(hash, x, y)` | Perlin gradient |
| `fract(value)` | Fractional part |
| `hash3(x, y, z)` | Deterministic float [0, 1) from three coordinates — used for procedural structure/fauna decisions |
| `floorVector(vector)` | `{ x, y, z }` → floored copy |
| `wrapAngle(angle)` | Normalize angle to `[−π, π]` |
| `lerpAngle(from, to, t)` | Shortest-path angle lerp using `wrapAngle` |
| `isInsideRect(x, z, rect)` | Point-in-AABB test for biome/district rects |
| `chunkIntersectsRect(cx, cz, rect)` | Chunk-vs-AABB test — used to set `maxBuildY` correctly |

---

## World / Terrain Functions

| Function | What it does |
|---|---|
| `getCityCenter()` | Returns `{ x, z }` center of `CITY_PLAN` |
| `getCityTargetHeight(wx, wz)` | Flat-ish height for city district (base 11 + small perlin variation) |
| `getSnowCenter()` | Returns `{ x, z }` center of `SNOW_REALM` |
| `getSnowTargetHeight(wx, wz)` | Height for snow realm |
| `getSnowBlend(wx, wz)` | Returns 0.92 if inside `SNOW_REALM`, else 0 |
| `getSettlementBlend(wx, wz)` | Returns 0.96 inside city, 0.58 in suburb ring, else 0 |
| `getSnowParcel(wx, wz)` | Parcel data for snow realm lot: `{ kind: "path" \| "lot", lotX, lotZ, style, footprint, … }` or `null` outside bounds |
| `getCityParcel(wx, wz)` | Parcel data for city: `{ kind: "road" \| "lot", blockX, blockZ, style, stories, footprint, … }` or `null` outside bounds. Styles: tower, stepped_tower, townhouse, shop, house |
| `getSuburbParcel(wx, wz)` | Parcel data for suburb detached houses: `{ kind: "suburb", footprint, stories, … }` or `null` |
| `getStructureBlock(wx, wy, wz, height)` | Returns a block type ID for city/snow structure geometry at that coordinate, or `null` if terrain should be used. Entry point for all settlement block logic |
| `getSurfaceData(x, z)` | Scans downward for the topmost non-air, non-water, non-leaves block. Returns `{ x, y, z, blockType }`. Used by mob pathfinding |

### `class World`

| Member | What it does |
|---|---|
| `getChunkKey(cx, cz)` | `"cx,cz"` string key |
| `getHeightAt(wx, wz)` | **Surface height** — layered Perlin + settlement/snow blending. This is the canonical height source used at generation time and spawn time |
| `ensureChunk(cx, cz)` | Lazily generates and caches a chunk. Populates heights, sandy flags, trees, frostTrees, fauna arrays |
| `updateLoadedChunks(playerX, playerZ)` | Refreshes `loadedKeys` within `LOAD_RADIUS`. Deletes unchanged chunks beyond `UNLOAD_RADIUS` |
| `getGeneratedBlock(wx, wy, wz)` | Pure procedural block — caves, biome layers, ores, trees, structures (no edits) |
| `getBlock(wx, wy, wz)` | Block at coordinate, applying player edits over generated data |
| `setBlock(wx, wy, wz, blockType)` | Write edit. Returns `true` if changed. Deletes edit if it matches generated block (keep edits minimal) |
| `isSolid(wx, wy, wz)` | `true` if block ≠ air and ≠ water |
| `getChunkMaxY(cx, cz)` | Highest Y in chunk including edits, capped at `MAX_BUILD_HEIGHT` |

---

## Rendering Functions

### `class ChunkMeshManager`

| Member | What it does |
|---|---|
| `markDirtyChunk(cx, cz)` | Flag a chunk for mesh rebuild |
| `markDirtyAtWorld(wx, wz)` | Mark dirty + adjacent chunks if on a border |
| `syncLoadedChunks()` | Rebuild dirty meshes, remove meshes for unloaded chunks |
| `rebuildChunk(cx, cz)` | Dispose old mesh, build new geometry, add to scene |
| `buildGeometry(cx, cz)` | Face-culled mesh builder — iterates blocks, skips faces adjacent to solid blocks, UV-maps from atlas |
| `disposeMesh(mesh)` | Remove from scene, dispose geometry |
| `getMeshes()` | Returns array of all active chunk meshes (used by raycaster) |

### Texture / icon functions

| Function | What it does |
|---|---|
| `getTileIndex(blockType, faceKey)` | Maps block + face → tile index in the atlas. **Must be updated when adding new blocks** |
| `atlasUv(columns, rows, tileIndex, u, v)` | Converts tile index + corner to atlas UV with small inset to prevent bleeding |
| `createAtlasTexture()` | Generates the entire texture atlas as a `DataTexture` from canvas-drawn tiles |
| `getTileCanvas(tileIndex)` | Extracts a single 16×16 tile from the atlas image |
| `createItemIcon(blockType)` | Isometric-style 3-face block icon as a data URL (used in hotbar/inventory) |
| `createFlatIcon(background, accent, glyph)` | Flat 48×48 icon for non-block items (stick, coal, ingots, pickaxes) |
| `createStickGlyph(ctx)` | Draws stick shape |
| `createCoalGlyph(ctx)` | Draws coal lump shape |
| `createPickaxeGlyph(ctx, tint)` | Draws pickaxe head + handle |

### Scene / lighting

| Function | What it does |
|---|---|
| `updateLighting()` | Moves sun, updates sky/fog colors, drives cloud drift. Called every frame |
| `resizeRenderer()` | Resize renderer + camera aspect on window resize |
| `applyPlayerToCamera()` | Syncs camera position/rotation to player, applies view bob, sprint FOV, side tilt |
| `render()` | `applyPlayerToCamera` → `updateLighting` → `renderer.render` → `updateHotbar` → `updateHud` |

### Mob models

| Function | What it does |
|---|---|
| `createMobLeg(geometry, material, x, y, z)` | Returns a positioned leg mesh |
| `createSheepModel()` | Three.js Group with body, headPivot, 4 legs. Parts stored in `userData.parts` |
| `createVillagerModel()` | Three.js Group with body, trim, headPivot, arms, 2 legs |

### `class PassiveMobManager`

| Member | What it does |
|---|---|
| `createEntity(definition)` | Builds mob from chunk fauna record, places model in scene |
| `disposeEntity(entity)` | Removes from scene |
| `syncLoadedChunks()` | Spawn entities for newly loaded chunks, remove for unloaded |
| `pickTarget(entity)` | Random wander target within home radius, avoids water/leaves, falls back to home |
| `updateEntity(entity, dt)` | Move toward target, snap Y to surface, animate limbs, idle head sway |
| `update(dt)` | Calls `updateEntity` for all active entities |
| `getEntityCount()` | Total live entity count |
| `getNearbyEntities(limit)` | Sorted list of nearest entities (used in `renderGameToText`) |

### Particles

| Function | What it does |
|---|---|
| `getBlockColor(blockType)` | Returns `[baseHex, accentHex]` for particle tinting per block |
| `spawnParticles(x, y, z, blockType, count, impulseY)` | Grab inactive slots from pool, set position/velocity/color |
| `updateParticles(dt)` | Tick all active particles — gravity, fade, matrix update on instanced mesh |

---

## Player / Physics Functions

| Function | What it does |
|---|---|
| `hasCollision(x, y, z)` | AABB sweep using `PLAYER_RADIUS` / `PLAYER_HEIGHT` — returns `true` if any solid block overlaps |
| `movePlayerAxis(axis, amount)` | Slide collision — tries step-up on x/z if blocked. Sets `onGround` on blocked downward Y |
| `tryStepUp(nextX, currentY, nextZ)` | Returns stepped-up Y if auto-step is possible, else `null` |
| `applyPlayerToCamera()` | (Also in rendering) Maps player state → camera transform, bob, tilt, FOV |
| `canPlaceBlock(x, y, z)` | Y bounds check + no collision at block center |
| `movePlayerToSpawn()` | Hard teleport to `DEFAULT_SPAWN` coordinates + ground height. Resets velocity |
| `findClosestSafeRespawn()` | Searches outward from `lastSafePosX/Z` in 13 offsets for a collision-free surface point. Falls back to `DEFAULT_SPAWN` |
| `handlePlayerDeath()` | Sets `isDead`, exits pointer lock, computes nearest respawn, shows death screen |
| `respawnPlayer()` | Calls `findClosestSafeRespawn`, teleports player, clears `isDead`, hides death screen, re-requests pointer lock |
| `ensureValidPlayerPosition()` | If spawning into a collision, teleport to spawn (called once at load) |
| `getFootstepBlockType()` | Block type underfoot for footstep audio selection |

---

## Interaction / Combat Functions

| Function | What it does |
|---|---|
| `updateTarget()` | Raycasts from camera center, updates `state.target` + highlight mesh position. Also drives break-overlay color |
| `interact(breaking)` | Unified break/place handler. Respects cooldown, tool tier, block hardness. Awards drops on break, consumes inventory on place |
| `resetBreakState()` | Clears break progress state and hides break overlay |
| `updateBreakVisuals()` | Colors highlight + scales overlay based on current break fraction and pulse |
| `getTargetKey(target)` | `"x,y,z"` string for the targeted block |
| `canMineBlock(blockType)` | Returns `true` if current tool `power` is sufficient |
| `getInteractionCooldown(blockType, breaking)` | Seconds between hits/places, scaled by tool speed |
| `getBreakHardness(blockType)` | Total damage needed to break a block |
| `getBreakDamage(blockType)` | Damage per hit scaled by tool speed |
| `getDropForBlock(blockType)` | Item/block dropped when broken (leaves → random stick, coal_ore → coal, etc.) |

---

## Tool / Item Functions

| Function | What it does |
|---|---|
| `getSelectedItem()` | `state.hotbarSlots[state.activeSlot]` |
| `getToolProfile()` | `TOOL_STATS[selectedItem]` or `TOOL_STATS.hand` |
| `setSelectedBlock(blockType)` | Updates `state.selectedBlock`, refreshes inventory panel if open |
| `setActiveItem(itemId)` | Equips item to hotbar (reuses existing slot or overwrites active), updates `selectedBlock` |
| `isCollectibleBlock(blockType)` | `true` if not air/water |
| `isWorldBlock(itemId)` | `true` if ID < 100 and not air |
| `isPlaceableItem(itemId)` | `true` if in `PLACEABLE_BLOCKS` |
| `isToolItem(itemId)` | `true` if wood or stone pickaxe |

---

## Crafting / Inventory Functions

| Function | What it does |
|---|---|
| `canCraft(recipe)` | Returns `true` if inventory has all ingredients |
| `canSmelt(recipe)` | Returns `true` if inventory has input + fuel |
| `craftRecipe(recipeId, collection)` | Deducts ingredients, adds output, fires sound + UI message |
| `smeltRecipe(recipeId)` | Same as craftRecipe but for furnace recipes |
| `getAccessibleStations()` | Returns `{ table, furnace }` booleans based on `state.target` (must be looking at the block, within 5.5 units) |
| `createInventorySlot(itemId, count, selected)` | Builds a button DOM element for the inventory grid |
| `createPatternGrid(pattern)` | Builds the 2D ingredient grid shown in recipe cards |
| `buildRecipeSection(title, subtitle, recipes, type)` | Builds an entire recipe list section DOM node with craft/smelt buttons wired up |
| `updateInventoryPanel()` | Full rebuild of inventory grid + recipe sections, including showing station-locked sections only when the block is targeted |
| `toggleInventory(forceOpen)` | Open/close inventory panel, exit/request pointer lock, play sound |
| `buildHotbar()` | One-time DOM creation of 8 hotbar slot elements |
| `updateHotbar()` | Per-frame sync of slot icons, counts, active state |

---

## Save / Load Functions

| Function | What it does |
|---|---|
| `serializeWorldEdits()` | Serialize `chunk.edits` maps to a plain object keyed by chunk key |
| `hydrateWorldEdits(savedChunks)` | Reapply saved edits back into chunk objects |
| `saveGame()` | Write inventory, hotbar, player, dayTime, worldEdits to `localStorage` under `SAVE_KEY` |
| `loadGame()` | Read and apply the save; handles missing/corrupt data gracefully |

---

## UI / HUD Functions

| Function | What it does |
|---|---|
| `updateHud()` | Updates `hudPrimary` (selected item, target, break %, chunk stats, bag summary) and `hudSecondary` (XYZ, yaw/pitch, pointer lock status, sprint, city/snow distance, mob count, day time, UI message) |
| `setMode(mode)` | Switches `"menu"` ↔ `"playing"`. Hides/shows menu. Also clears `isDead` + hides death screen |
| `startGame()` | `setMode("playing")` → close inventory → focus canvas → resume audio → request pointer lock |

---

## Input / Camera Functions

| Function | What it does |
|---|---|
| `handleInput(dt)` | WASD movement, arrow-key look, sprint (Shift), jump (Space), digit-key hotbar selection, F (fullscreen), B (place block) |
| `moveLook(deltaX, deltaY)` | Apply yaw/pitch delta, clamp pitch to `[−1.45, 1.45]` |
| `requestPointerLock()` | Request pointer lock on canvas if conditions met (running, not inventory, not already locked) |
| `exitPointerLock()` | Release pointer lock |
| `updatePointerState()` | Sync `state.pointerLocked`, clear drag state on lock |

---

## Audio (`class SoundEngine`)

| Method | What it does |
|---|---|
| `ensureContext()` | Lazily creates `AudioContext` + master gain on first call |
| `resume()` | Resumes suspended context |
| `pulse(opts)` | Plays a short oscillator tone (frequency, type, gain, attack, decay, detune) |
| `noise(opts)` | Plays shaped noise (bandpass between highpass/lowpass, gain, decay) |
| `ui(opening)` | Open/close inventory sound |
| `select()` | Hotbar selection tick |
| `footstep(blockType, sprinting)` | Footstep sound — noise + tone, varies by surface hardness |
| `jump()` | Jump launch sound |
| `land(speed)` | Landing thud, scales with fall speed |
| `hit(blockType, finished)` | Block hit — varies by material (glassy/woody/stony); louder on break |
| `place(blockType)` | Block placement sound |
| `craft()` | Three-note ascending chime |

---

## Game Loop Functions

| Function | What it does |
|---|---|
| `update(dt, shouldRender)` | Main tick: advances timers, streams chunks, runs `handleInput` + physics (skipped when `isDead`), tracks `lastSafePos`, detects fall death, updates particles/mobs/target/break/save, then calls `render` |
| `render()` | Camera sync + lighting + Three.js render + UI updates |

### Update flow when alive
```
update(dt)
  ├─ advance timers (elapsed, dayTime, uiMessageTimer, viewBob, saveCooldown, breakState.pulse)
  ├─ world.updateLoadedChunks / chunkMeshes.syncLoadedChunks / passiveMobs.syncLoadedChunks
  ├─ if !isDead:
  │   ├─ handleInput(dt)
  │   ├─ gravity + movePlayerAxis x/z/y
  │   ├─ landing effects
  │   ├─ footsteps
  │   ├─ update lastSafePosX/Z (when onGround)
  │   └─ if y < -20 → handlePlayerDeath()
  ├─ updateParticles / passiveMobs.update / updateTarget
  ├─ break-progress decay
  ├─ auto-save
  └─ render()
```

---

## Player State (`state` object)

| Field | Purpose |
|---|---|
| `mode` | `"menu"` or `"playing"` |
| `running` | `true` when playing |
| `isDead` | `true` while death screen is shown — blocks physics + input |
| `lastSafePosX/Z` | Updated each frame when `onGround`; used by respawn logic |
| `pointerLocked` | Mirrors `document.pointerLockElement === canvas` |
| `inventoryOpen` | Inventory panel visible |
| `keys` | `Set<string>` of currently pressed `event.code` values |
| `mouseDown` | `{ left, right }` mouse button state |
| `selectedBlock` | Currently active placeable block ID |
| `activeSlot` | 0–7 hotbar slot index |
| `hotbarSlots` | Array of 8 item IDs (or `null`) |
| `elapsed` | Total seconds since game start |
| `dayTime` | 0–1 cycling day/night value (advances at `dt * 0.01`) |
| `target` | Current raycasted block: `{ block: {x,y,z,type}, place, normal, distance }` or `null` |
| `breakState` | `{ key, blockType, progress, hardness, lastHitTime, pulse }` |
| `inventory` | `{ [blockOrItemId]: count }` |
| `player` | `{ x, y, z, vx, vy, vz, yaw, pitch, onGround }` |
| `uiMessage` / `uiMessageTimer` | Temporary status text shown in HUD |
| `viewBob` | Vertical camera impulse (landing bounce) |
| `stepPhase` | Accumulated movement phase for walk bob |
| `saveDirty` / `saveCooldown` | Auto-save dirty flag and cooldown timer |

---

## Controls (complete list)

| Key | Action |
|---|---|
| `W / A / S / D` | Move |
| `Shift` (hold) | Sprint |
| `Space` | Jump |
| `Arrow keys` | Look |
| `1–8` | Select hotbar slot |
| `Scroll wheel` | Cycle hotbar |
| `Left click` | Break block |
| `Right click` or `B` | Place block |
| `E` | Open/close inventory |
| `R` | Manual respawn (nearest safe ground) |
| `F` | Toggle fullscreen |

---

## UI Overlays (HTML/CSS)

| Element ID | Condition shown |
|---|---|
| `#menu` | `state.mode === "menu"` (hidden via `is-hidden` on `setMode("playing")`) |
| `#inventory-panel` | `state.inventoryOpen === true` |
| `#death-screen` | `state.isDead === true` |
| `#hotbar` | Always visible during play |
| `.hud` | Always visible during play (`#hud-primary` left, `#hud-secondary` right) |
| `.crosshair` | Always visible |
