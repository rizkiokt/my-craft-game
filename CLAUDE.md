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

The entire game lives in three files: `main.js` (~4000 lines), `index.html`, and `styles.css`. There is no bundler, framework, or component system.

### Key singletons (module-level globals)

| Variable | Class / Type | Role |
|---|---|---|
| `world` | `World` | Voxel storage, terrain generation, block get/set |
| `chunkMeshes` | `ChunkMeshManager` | Builds and syncs Three.js meshes from dirty chunks |
| `passiveMobs` | `PassiveMobManager` | Spawns/updates sheep and villagers per chunk |
| `soundEngine` | `SoundEngine` | Procedural Web Audio for all game sounds |
| `state` | plain object | All mutable game state (player, mode, inventory, etc.) |

### Game loop

`update(dt)` runs at a fixed 60 Hz step (`FIXED_STEP = 1/60`). It gates everything behind `state.running` and `state.isDead`. Physics, input, and world updates happen inside the `!state.isDead` block; particles, mobs, and rendering always run while the game is active.

### World / terrain

`World.getHeightAt(wx, wz)` is the single source of truth for surface height — it uses layered Perlin noise and is called at both generation time and spawn/respawn time. `World.ensureChunk()` lazily generates chunks on first access. Block reads/writes go through `World.getBlock()` / `World.setBlock()`.

**Coordinate system:** origin near spawn; x = east-west, y = up, z = north-south. Chunks are 16 × 16 columns. Active chunks load within radius 2, unload beyond radius 4.

### Biomes and structures

Three distinct terrain zones are composed in `getHeightAt` and `getBlock`:
- **Natural terrain** — Perlin-noise hills, caves, beaches, trees, ore veins
- **City district** — deterministic grid near `x ≈ 18, z ≈ -14`; layout driven by `getCityParcel()` / `getSuburbParcel()` / `getStructureBlock()`
- **Snow realm** — east of city near `x ≈ 112, z ≈ 66`; igloos, lodges, pine trees; driven by `getSnowParcel()`

Structure block selection for both settlements funnels through `getStructureBlock(wx, wy, wz, height)`.

### Rendering

`ChunkMeshManager` rebuilds face-culled geometry for dirty chunks using a single shared `MeshLambertMaterial` and a procedurally generated texture atlas (`getTileCanvas` → canvas-drawn per-block tile → `DataTexture`). `getTileIndex(blockType, faceKey)` maps block faces to atlas tiles. Adding a new block type requires entries there and in `getBlockColor()` (used for particles).

### Adding a new block type

1. Add constant to `BLOCKS` and a name to `BLOCK_NAMES`.
2. Add tile mapping in `getTileIndex()`.
3. Add color in `getBlockColor()` (for particles).
4. Optionally add entries in `getBreakHardness()`, `getDropForBlock()`, `getBreakDamage()`.
5. Expose in inventory via `state.inventory` initializer and `PLACEABLE_BLOCKS`.

### Save / load

`saveGame()` / `loadGame()` use `localStorage` (key `mycraft_save`). The save includes chunk edits, inventory, hotbar, and player position. Auto-save fires on block edits (with cooldown) and periodically every 8 seconds of elapsed time.

### UI

All overlays (menu, hotbar, HUD, inventory panel, death screen) are HTML/CSS positioned absolutely over the canvas. JS drives them by toggling CSS classes (`is-hidden`, `is-active`, `is-selected`) and setting `textContent`. Pointer lock is requested on canvas click/pointerdown and released on death or inventory open.
