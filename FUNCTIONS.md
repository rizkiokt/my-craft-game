# FUNCTIONS.md

Reference for every function and system in the game. Check here before adding anything new to avoid duplication.

The code lives in `src/` as layered ES modules (see CLAUDE.md for the layering rules and the two dependency-inversion points). Each section below names the module that owns it.

| Section | Module |
|---|---|
| Constants & Enums | `src/constants.js` |
| Controls & settings | `src/bindings.js`, `src/settings.js` |
| Recipe tables | `src/recipes.js` |
| Math / Utility | `src/math.js` |
| World / Terrain | `src/world.js`, `src/worldgen.js` |
| Rendering | `src/scene.js`, `src/textures.js`, `src/icons.js`, `src/chunkMesh.js`, `src/mobs.js`, `src/particles.js`, `src/playerModel.js` |
| Player / Physics | `src/player.js` |
| Interaction | `src/interaction.js` |
| Tool / Item | `src/items.js` |
| Crafting / Inventory | `src/ui/inventory.js` |
| Dropped items | `src/drops.js` |
| Friends (NPCs) | `src/npcs.js` |
| Save / Load | `src/save.js` |
| UI / HUD | `src/ui/hud.js`, `src/ui/screens.js`, `src/ui/controlsScreen.js`, `src/ui/options.js`, `src/ui/menus.js` |
| Input / Camera | `src/input.js`, `src/actions.js`, `src/touch.js`, `src/pointerLock.js`, `src/fullscreen.js` |
| Audio | `src/sound.js` |
| Game loop | `src/loop.js`, `src/debugApi.js` |
| Boot / wiring | `main.js` |

---

## Constants & Enums

| Name | Value / Purpose |
|---|---|
| `CHUNK_SIZE` | 16 — columns per chunk |
| `DEFAULT_RENDER_DISTANCE` / `MIN_` / `MAX_RENDER_DISTANCE` | 2 / 1 / 5 — chunk streaming bounds (live values on the `World` instance) |
| `PLAYER_HEIGHT` / `PLAYER_RADIUS` | 1.8 / 0.34 — collision capsule |
| `GRAVITY` | 24 |
| `MOVE_SPEED` / `JUMP_SPEED` | 5.8 / 8.8 |
| `SPRINT_MULTIPLIER` / `SNEAK_MULTIPLIER` | 1.35 / 0.32 — walk-speed scalars |
| `SNEAK_CAMERA_DROP` | 0.22 — eye-height drop while sneaking |
| `FLY_SPEED` / `FLY_VERTICAL_SPEED` / `FLY_BOOST_MULTIPLIER` | 10.4 / 7.2 / 2.1 — creative flight |
| `BASE_LOOK_SENSITIVITY` | 0.0022 — scaled by the sensitivity option |
| `DOUBLE_TAP_WINDOW` | 0.32 s — sprint and flight double-tap window |
| `MAX_STEP_HEIGHT` | 0.6 — auto-step over 1-block ledges |
| `INTERACTION_RANGE` | 5.2 — raycaster reach (Minecraft-like) |
| `THIRD_PERSON_DISTANCE` | 4.2 — F5 camera pull-back |
| `FIXED_STEP` | 1/60 — physics timestep |
| `MAX_BUILD_HEIGHT` / `MIN_WORLD_Y` / `MAX_WORLD_Y` | 48 / -2 / 64 |
| `WATER_LEVEL` | 7 |
| `BREAK_RESET_TIME` | 1.15 s — decay break progress when not hitting |
| `RESPAWN_SEARCH_RADIUS` / `RESPAWN_HEADROOM` / `PIT_WALL_HEIGHT` | 16 / 20 / 2 — safe-respawn search |
| `DROP_PICKUP_DELAY` / `DROP_PICKUP_RANGE` / `DROP_LIFETIME` | 0.55 / 1.35 / 300 — dropped items |
| `PARTICLE_POOL_SIZE` | 192 |
| `CLOUD_COUNT` | 18 |
| `SAVE_KEY` / `SETTINGS_KEY` / `BINDINGS_KEY` | `"mycraft-save-v2"` / `"mycraft-settings-v1"` / `"mycraft-controls-v1"` |
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
| `CREATIVE_ITEMS` | — | Full creative palette, in build-menu order |
| `HOTBAR_SIZE` | 9 | Number of hotbar slots |
| `CREATIVE_STACK` | 999 | Count reported for every item in creative |

### Controls & settings

| Constant | Purpose |
|---|---|
| `DEFAULT_BINDINGS` | action → token map, matching Minecraft Java Edition defaults |
| `BINDING_LABELS` | Human-readable name per action (Controls screen) |
| `BINDING_GROUPS` | Controls-screen grouping: Movement / Gameplay / Hotbar / Display |
| `FIXED_BINDINGS` | Actions that cannot be rebound (`pause`) |
| `TOKEN_ALIASES` | Right Shift/Ctrl/Alt → left twin when the twin is unbound |
| `KEY_LABELS` / `MOUSE_LABELS` | Token → display string tables |
| `bindings` | Live binding map (mutable, persisted) |
| `DEFAULT_SETTINGS` / `settings` | sensitivity, fov, volume, renderDistance, invertMouse, viewBobbing, autosave |

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
| `hasGroundUnder(x, y, z)` | `true` if any footprint corner has a block beneath — powers sneak ledge protection |
| `movePlayerToSpawn()` | Hard teleport to `DEFAULT_SPAWN` coordinates + ground height. Resets velocity |
| `getStandableSurfaceY(bx, bz)` | Topmost non-air/water block in a column, honouring player edits (unlike `getHeightAt`) |
| `evaluateRespawnColumn(bx, bz)` | Returns a spawn point only if the column has headroom, open sky, and is not a pit floor (6+ of 8 neighbours ≥ 2 blocks higher) |
| `ringOffsets(radius)` | Chebyshev ring offsets sorted nearest-first, for the outward respawn search |
| `findClosestSafeRespawn()` | Ring-searches out to `RESPAWN_SEARCH_RADIUS` for a valid column; falls back to world spawn |
| `updateSafeAnchor(dt)` | Throttled (0.5 s) recording of `lastSafePosX/Z`, only for columns that pass `evaluateRespawnColumn` |
| `handlePlayerDeath()` | Sets `isDead`, cancels flight, clears held keys, exits pointer lock, shows death screen |
| `respawnPlayer()` | Teleports to `findClosestSafeRespawn`, clears `isDead`/flight, nudges up out of any geometry, re-requests pointer lock |
| `ensureValidPlayerPosition()` | If spawning into a collision, teleport to spawn (called once at load) |
| `getFootstepBlockType()` | Block type underfoot for footstep audio selection |
| `getEyeHeight()` / `getEyePosition(v)` / `getLookDirection(v, yaw, pitch)` | Eye/ray basis shared by the camera, the interaction raycast, and item drops |
| `updatePlayerModel()` | Positions and animates `playerModel`; only visible outside first person |

---

## Interaction / Combat Functions

| Function | What it does |
|---|---|
| `updateTarget()` | Raycasts from the **eye** along the look direction (so third person keeps the same reach), capped at `INTERACTION_RANGE`. Updates `state.target` + highlight mesh position and drives break-overlay color |
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
| `isCreative()` | `state.gameMode === "creative"` |
| `getItemCount(itemId)` | Stack size — always `CREATIVE_STACK` in creative. **Use this, not `state.inventory` directly** |
| `addItem(itemId, amount)` | Grants items (no-op in creative) |
| `consumeItem(itemId, amount)` | Spends items and clears the hotbar slot at zero (no-op in creative) |
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
| `updateInventoryPanel()` | Full rebuild of the item grid + recipe sections. In creative it shows `CREATIVE_ITEMS` full-width and hides recipes |
| `toggleInventory(forceOpen)` | Open/close inventory panel, exit/request pointer lock, play sound |
| `buildHotbar()` | One-time DOM creation of 9 hotbar slot elements |
| `updateHotbar()` | Per-frame sync of slot icons, counts, active state (writes only on change) |

---

## Dropped Items

| Function | What it does |
|---|---|
| `spawnDrop(itemId, x, y, z, vx, vy, vz)` | Adds a billboard sprite drop to `state.drops` |
| `updateDrops(dt)` | Gravity, block collision, bob, and pickup within `DROP_PICKUP_RANGE` after `DROP_PICKUP_DELAY` |
| `removeDrop(index)` / `clearDrops()` | Remove from scene and dispose the sprite material |
| `getIconTexture(itemId)` | Lazily builds a `CanvasTexture` from the cached icon canvas |

---

## Friends (NPCs) — `class NpcManager`

| Function | What it does |
|---|---|
| `randomPalette(random)` | Rolls skin/hair/shirt/trousers/shoes from the curated tables. Called once per character per world, then saved |
| `spawnRoster(x, z)` / `spawn(entry)` | Place the five characters in a ring on solid ground |
| `raycast(ray, maxDistance)` | Nearest friend under the crosshair, for right-clicking one |
| `greet(npc)` / `stopFollowing(npc, line)` | Toggle following. Asking overrides a spontaneous tag-along |
| `update(dt)` / `updateNpc(npc, dt)` | Per-frame: help first, then follow, then job, then wander |
| `startActivity(npc)` | Rolls the next thing to do: tag along, build a hut, mine, or wander |
| `findHutSite(npc)` / `planHut(site)` / `planMine(npc)` | Pick a plot and turn it into a list of block changes |
| `siteIsFree(x, z, radius, baseY, height)` | Refuses a site overlapping existing edits or within 8 blocks of spawn |
| `runPlan(npc, job, dt, beat)` | Walk to `job.site`, then apply one block per beat. Shared by jobs and favours |
| `canChange(x, y, z, block)` / `applyStep(step)` | Apply a block change, never replacing a non-air block the player placed |
| `considerHelping()` / `findNeed()` / `nearestHelper(need)` | Spot what you need a hand with and send the closest friend off cooldown |
| `findPitRescue(px, feetY, pz)` | Plans a 3-high staircase out of a hole; null when nothing would actually change |
| `findTorchSpot(px, feetY, pz)` | An empty cell beside you that a torch can stand in |
| `beginHelp` / `workOnHelp` / `completeHelp` / `endHelp` | Run one favour: walk over, do it, rest afterwards |
| `step(npc, dirX, dirZ, dt, speed)` | One move, retrying sideways when the way is blocked |
| `serialize()` / `restore(saved)` | Persist name, palette, position, and asked-for following |
| `getNearby(limit)` / `describeActivity(npc)` | Diagnostics for the debug overlay and scripted tests |

---

## Save / Load Functions

| Function | What it does |
|---|---|
| `serializeWorldEdits()` | Serialize `chunk.edits` maps to a plain object keyed by chunk key |
| `hydrateWorldEdits(savedChunks)` | Reapply saved edits back into chunk objects |
| `saveGame(force)` | Write gameMode, inventory, hotbar, player, dayTime, worldEdits under `SAVE_KEY`. Skipped when the Autosave option is off unless `force` |
| `loadGame()` | Read and apply the save; handles missing/corrupt data gracefully |
| `loadSettings()` / `saveSettings()` | Options persistence under `SETTINGS_KEY` |
| `loadBindings()` / `saveBindings()` | Key-binding persistence under `BINDINGS_KEY` |

---

## UI / HUD Functions

| Function | What it does |
|---|---|
| `updateHud()` | Toggles HUD visibility, drives the toast + held-item labels, and fills the F3 debug columns when `state.debugVisible` |
| `showToast(message, duration)` | Transient centre-screen message — **use this instead of setting `uiMessage` directly** |
| `announceHeldItem()` | Shows the held item's name above the hotbar for 2 s |
| `updateModeBanner()` | Corner Survival/Creative/Flying badge (hidden while F3 is up) |
| `getFacingLabel(yaw)` / `getBiomeLabel()` | Debug-overlay helpers |
| `showScreen(name)` | Master screen switch: `playing` / `title` / `pause` / `controls` / `options` / `help` |
| `openSubScreen(name)` / `closeSubScreen()` | Push/pop Controls, Options, Help while remembering the origin screen |
| `setMode(mode)` | Back-compat shim over `showScreen` |
| `startGame()` / `resumeGame()` / `openPauseMenu()` | World entry, resume from pause, and pausing |
| `setGameMode(mode, opts)` | Switch survival/creative, cancel flight, refresh dependent UI |
| `buildControlsScreen()` / `handleBindingCapture(token)` | Render the rebinding list and capture the next key/button |
| `buildHelpControls()` | Fills the How-to-Play key list from the live bindings |
| `syncOptionsScreen()` / `updateSetting(key, value)` / `applySettings()` | Options screen sync, mutation, and application (render distance, fog, camera far, volume) |
| `pickSplash()` / `applyTitleTexture()` | Title-screen splash line and grass-textured wordmark |
| `updatePanorama(dt)` / `isWorldView()` | Title-screen orbit camera and the "is a world on screen" test |

---

## Input / Camera Functions

| Function | What it does |
|---|---|
| `handleInput(dt)` | Polls held bindings: movement, sneak, sprint, jump/fly, arrow-key look fallback, and held attack/use |
| `handleActionPress(action, event)` | One-shot actions: inventory, drop, pick, hotbar slots, HUD/debug/perspective/mode toggles, fullscreen, screenshot, and the double-tap sprint/flight detection |
| `dispatchPress(token, event)` | Resolves a token to actions and forwards each to `handleActionPress` |
| `handleEscape()` | Escape routing: close inventory → pause → resume → back out of a sub-screen |
| `isActionDown(action)` | `state.keys.has(bindings[action])` |
| `actionsForToken(token)` / `canonicalToken(token)` / `isTokenBound(token)` | Token ↔ action resolution, including right-modifier aliasing |
| `describeToken(token)` / `keyHint(action)` | Display strings for bindings |
| `findBindingConflicts()` | Set of actions sharing a token (highlighted red in Controls) |
| `selectHotbarSlot(index)` / `scrollHotbar(direction)` | Hotbar selection by key and by wheel |
| `pickBlock()` | Middle-click: put the targeted block in hand |
| `dropHeldItem(wholeStack)` | Throws the held item into the world as a pickup-able drop |
| `cyclePerspective()` / `toggleFlight()` / `toggleFullscreen()` / `takeScreenshot()` | F5 / double-jump / F11 / F2 |
| `moveLook(deltaX, deltaY)` | Apply yaw/pitch delta scaled by sensitivity, honouring Invert Mouse; clamps pitch to `[−1.55, 1.55]` |
| `requestPointerLock()` / `exitPointerLock()` | Acquire/release; the latter flags `intentionalUnlock`. Skipped entirely while the touch pad is up |
| `updatePointerState()` | Syncs `state.pointerLocked` and **opens the pause menu on an unexpected unlock** (Esc while locked never fires `keydown`) |
| `isTouchDevice()` / `touchControlsWanted()` | Device probe, then the `settings.touchControls` auto/on/off decision |
| `syncTouchControls()` | Toggles the `is-touch` body class the stylesheet keys off, and drops anything held |
| `installTouchHandlers()` | Wires `data-hold` / `data-press` buttons, the hotbar, and the canvas stick/look surfaces |

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
| `update(dt, shouldRender)` | Main tick: advances timers, streams chunks, runs `handleInput` + physics (skipped when `isDead`), records the safe anchor, detects fall death, updates particles/drops/mobs/target/break/save, then calls `render` |
| `render(dt)` | Camera or panorama + lighting + Three.js render + UI updates |
| `trackFrameRate(dt)` | Rolling 30-frame average feeding the F3 fps readout |

### Update flow when alive
```
update(dt)
  ├─ trackFrameRate(dt)
  ├─ if !running: tick UI timers → render(dt) [title panorama] → return
  ├─ advance timers (elapsed, dayTime, uiMessageTimer, heldItemTimer, viewBob, saveCooldown, breakState.pulse)
  ├─ world.updateLoadedChunks / chunkMeshes.syncLoadedChunks / passiveMobs.syncLoadedChunks
  ├─ if !isDead:
  │   ├─ handleInput(dt)
  │   ├─ gravity (skipped while flying) + movePlayerAxis x/z/y
  │   ├─ landing ends flight
  │   ├─ landing effects
  │   ├─ footsteps
  │   ├─ updateSafeAnchor(dt)
  │   └─ if y < -20 → handlePlayerDeath()
  ├─ updateParticles / updateDrops / passiveMobs.update / updateTarget
  ├─ break-progress decay
  ├─ auto-save
  └─ render(dt)
```

---

## Player State (`state` object)

| Field | Purpose |
|---|---|
| `mode` | `"menu"`, `"playing"`, or the current screen name |
| `screen` | `"title"` / `"playing"` / `"pause"` / `"controls"` / `"options"` / `"help"` |
| `screenReturn` | Screen to come back to when closing a sub-screen |
| `gameMode` | `"survival"` or `"creative"` (saved with the world) |
| `running` | `true` when playing |
| `isDead` | `true` while death screen is shown — blocks physics + input |
| `lastSafePosX/Z` | Last verified open-ground position; used by respawn logic |
| `safeAnchorCooldown` | Throttle for `updateSafeAnchor` |
| `pointerLocked` | Mirrors `document.pointerLockElement === canvas` |
| `intentionalUnlock` | Suppresses the auto-pause for deliberate pointer-lock exits |
| `pointerLockUnavailable` | Set when the browser refuses pointer lock (drag-look fallback) |
| `suppressInteractUntil` | Blocks attack/use briefly after the click that captured the mouse |
| `inventoryOpen` | Inventory panel visible |
| `keys` | `Set<string>` of currently held tokens — keyboard **and** mouse |
| `awaitingBind` | Action currently being rebound on the Controls screen |
| `sneaking` / `sprinting` / `sprintLatched` | Movement modifiers; `sprintLatched` is the double-tap sprint |
| `flying` / `flyVelocityY` | Creative flight state |
| `lastForwardTapTime` / `lastJumpTapTime` | Double-tap timers |
| `perspective` | 0 first person, 1 third back, 2 third front |
| `hudVisible` / `debugVisible` | F1 and F3 toggles |
| `frameTimes` / `fps` | Rolling frame-rate sample |
| `panoramaAngle` | Title-screen orbit angle |
| `drops` | Active dropped-item entities |
| `heldItemName` / `heldItemTimer` | Item name shown above the hotbar |
| `selectedBlock` | Currently active placeable block ID |
| `activeSlot` | 0–8 hotbar slot index |
| `hotbarSlots` | Array of 9 item IDs (or `null`) |
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

## Controls (defaults — all rebindable except Escape)

| Key | Action |
|---|---|
| `W / A / S / D` | Move |
| `Left Shift` (hold) | Sneak (ledge-safe) / fly down |
| `Left Ctrl` (hold) or double-tap `W` | Sprint |
| `Space` | Jump / fly up; double-tap toggles creative flight |
| `Arrow keys` | Look (no-mouse fallback, not a binding) |
| `1–9` | Select hotbar slot |
| `Scroll wheel` | Cycle hotbar |
| `Left click` (hold) | Attack / break block |
| `Right click` | Use item / place block |
| `Middle click` | Pick block |
| `Q` / `Ctrl`+`Q` | Drop one / drop stack |
| `E` | Open/close inventory |
| `F1` / `F2` / `F3` | Toggle HUD / screenshot / debug info |
| `F4` / `F5` / `F11` | Switch game mode / perspective / fullscreen |
| `Escape` | Pause menu, or back out of a screen |

---

## UI Overlays (HTML/CSS)

| Element ID | Condition shown |
|---|---|
| `#screen-title` | `state.screen === "title"` |
| `#screen-pause` | `state.screen === "pause"` |
| `#screen-controls` / `#screen-options` / `#screen-help` | Matching `state.screen` |
| `#inventory-panel` | `state.inventoryOpen === true` |
| `#death-screen` | `state.isDead === true` |
| `#hud-layer` | During play, unless F1 hid it (`#hotbar`, `.crosshair`, `#item-name`, `#toast`, `#mode-banner`) |
| `#debug-overlay` | `state.debugVisible && state.hudVisible` (`#debug-left`, `#debug-right`) |

`showScreen(name)` toggles `is-hidden` on every `#screen-*` element and sets `is-playing` on `<body>`.
