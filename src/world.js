// Voxel storage, terrain generation and block access.

import { BIOME_REGIONS, BLOCKS, CHUNK_SIZE, CITY_PLAN, DEFAULT_RENDER_DISTANCE, DEFAULT_SPAWN, LIGHT_HEIGHT, LIGHT_MAX_Y, LIGHT_MIN_Y, MAX_BUILD_HEIGHT, MAX_LIGHT, MAX_RENDER_DISTANCE, MAX_WORLD_Y, MIN_RENDER_DISTANCE, MIN_WORLD_Y, SNOW_REALM, SUBURB_PLAN, TORCH_LIGHT, WATER_LEVEL } from "./constants.js";

/** Six-way neighbours used by the light flood fill. */
const NEIGHBOUR_OFFSETS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
import { chunkIntersectsRect, clamp, hash3, lerp, perlin2 } from "./math.js";
import {
  getBiomeAt,
  getOasisDepth,
  getBiomeBlock,
  getBiomeTargetHeight,
  getCityParcel,
  getCityTargetHeight,
  getSettlementBlend,
  getSnowBlend,
  getSnowParcel,
  getSnowTargetHeight,
  getStructureBlock,
} from "./worldgen.js";
/* ------------------------------------------------------------------ *
 * Lighting helpers
 * ------------------------------------------------------------------ */

/** Blocks you can see through do not stop light. */
export function blocksLight(blockType) {
  return blockType !== BLOCKS.air
    && blockType !== BLOCKS.torch
    && blockType !== BLOCKS.glass
    && blockType !== BLOCKS.water
    && blockType !== BLOCKS.leaves
    && blockType !== BLOCKS.pine_leaves
    && blockType !== BLOCKS.portal;
}

/**
 * What a block gives off. Glowstone and lava are what make the Ember Deep
 * readable at all, since its stone roof shuts the sky out entirely.
 */
export function getLightEmission(blockType) {
  if (blockType === BLOCKS.torch) {
    return TORCH_LIGHT;
  }
  if (blockType === BLOCKS.glowstone) {
    return MAX_LIGHT;
  }
  if (blockType === BLOCKS.lava) {
    return 12;
  }
  if (blockType === BLOCKS.portal) {
    return 11;
  }
  return 0;
}

function lightIndex(lx, wy, lz) {
  return ((wy - LIGHT_MIN_Y) * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
}

export class World {
  constructor() {
    this.chunks = new Map();
    this.loadedKeys = new Set();
    this.totalGenerated = 0;
    this.loadRadius = DEFAULT_RENDER_DISTANCE;
    this.unloadRadius = DEFAULT_RENDER_DISTANCE + 2;
  }

  setRenderDistance(chunks) {
    this.loadRadius = clamp(Math.round(chunks), MIN_RENDER_DISTANCE, MAX_RENDER_DISTANCE);
    this.unloadRadius = this.loadRadius + 2;
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getHeightAt(wx, wz) {
    const broad = perlin2(wx / 34, wz / 34) * 5.5;
    const detail = perlin2(wx / 16, wz / 16) * 2.1;
    const ridge = Math.abs(perlin2(wx / 52, wz / 52)) * 2.2;
    const naturalHeight = Math.floor(9 + broad + detail + ridge);
    const settlementBlend = getSettlementBlend(wx, wz);
    if (settlementBlend > 0) {
      return Math.round(lerp(naturalHeight, getCityTargetHeight(wx, wz), settlementBlend));
    }
    const snowBlend = getSnowBlend(wx, wz);
    if (snowBlend > 0) {
      return Math.round(lerp(naturalHeight, getSnowTargetHeight(wx, wz), snowBlend));
    }
    const biome = getBiomeAt(wx, wz);
    if (biome) {
      return Math.round(lerp(
        naturalHeight,
        getBiomeTargetHeight(biome.region, wx, wz),
        biome.blend,
      ));
    }
    return naturalHeight;
  }

  ensureChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    if (this.chunks.has(key)) {
      return this.chunks.get(key);
    }

    const heights = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
    let maxHeight = MIN_WORLD_Y;
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const height = this.getHeightAt(wx, wz);
        heights[z * CHUNK_SIZE + x] = height;
        maxHeight = Math.max(maxHeight, height);
      }
    }

    const chunk = {
      cx,
      cz,
      heights,
      edits: new Map(),
      maxHeight,
      maxBuildY: maxHeight,
      sandy: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE),
      trees: [],
      frostTrees: [],
      cacti: [],
      spires: [],
      emitters: [],
      fauna: [],
      light: null,
      lightDirty: true,
    };

    if (chunkIntersectsRect(cx, cz, CITY_PLAN)) {
      chunk.maxBuildY = Math.max(chunk.maxBuildY, CITY_PLAN.baseHeight + 24);
    }
    if (chunkIntersectsRect(cx, cz, SUBURB_PLAN)) {
      chunk.maxBuildY = Math.max(chunk.maxBuildY, CITY_PLAN.baseHeight + 11);
    }
    if (chunkIntersectsRect(cx, cz, SNOW_REALM)) {
      chunk.maxBuildY = Math.max(chunk.maxBuildY, SNOW_REALM.baseHeight + 15);
    }
    for (const region of BIOME_REGIONS) {
      if (chunkIntersectsRect(cx, cz, region)) {
        chunk.maxBuildY = Math.max(chunk.maxBuildY, (region.ceiling ?? region.baseHeight) + 12);
      }
    }

    for (let z = 1; z < CHUNK_SIZE - 1; z++) {
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        const index = z * CHUNK_SIZE + x;
        const height = heights[index];
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const beachNoise = perlin2(wx / 22 + 31, wz / 22 + 11);
        const settlementZone = getSettlementBlend(wx, wz) > 0;
        const snowZone = getSnowBlend(wx, wz) > 0;
        const isSandy = !settlementZone && (height <= 8 || (height <= 10 && beachNoise > 0.24));
        chunk.sandy[index] = isSandy ? 1 : 0;

        if (snowZone && height >= 12 && height <= 22) {
          const snowParcel = getSnowParcel(wx, wz);
          const flatEnough =
            Math.abs(height - heights[index - 1]) <= 1 &&
            Math.abs(height - heights[index + 1]) <= 1 &&
            Math.abs(height - heights[index - CHUNK_SIZE]) <= 1 &&
            Math.abs(height - heights[index + CHUNK_SIZE]) <= 1;
          const canGrowFrostTree = !snowParcel || snowParcel.kind === "path";
          if (canGrowFrostTree && flatEnough && hash3(wx, 119, wz) > 0.987) {
            const trunkHeight = 5 + Math.floor(hash3(wx, 129, wz) * 3);
            chunk.frostTrees.push({
              x: wx,
              z: wz,
              y: height + 1,
              trunkHeight,
            });
            chunk.maxBuildY = Math.max(chunk.maxBuildY, height + trunkHeight + 3);
          }
        }

        const biome = getBiomeAt(wx, wz);
        const flatEnough =
          Math.abs(height - heights[index - 1]) <= 1 &&
          Math.abs(height - heights[index + 1]) <= 1 &&
          Math.abs(height - heights[index - CHUNK_SIZE]) <= 1 &&
          Math.abs(height - heights[index + CHUNK_SIZE]) <= 1;

        if (biome && biome.blend > 0.4) {
          this.decorateBiome(chunk, biome.region, wx, wz, height, flatEnough);
        } else if (!isSandy && !settlementZone && !snowZone && height >= 10 && height <= 18) {
          if (flatEnough && hash3(wx, 17, wz) > 0.992) {
            const trunkHeight = 4 + Math.floor(hash3(wx, 29, wz) * 2);
            chunk.trees.push({
              x: wx,
              z: wz,
              y: height + 1,
              trunkHeight,
              kind: "oak",
            });
            chunk.maxBuildY = Math.max(chunk.maxBuildY, height + trunkHeight + 2);
          }
        }
      }
    }

    const canSpawnFaunaAt = (x, z, { allowSand = false, minHeight = 8, maxHeight: maxAllowedHeight = 18 } = {}) => {
      const index = z * CHUNK_SIZE + x;
      const height = heights[index];
      if (height < minHeight || height > maxAllowedHeight) {
        return false;
      }
      if (!allowSand && chunk.sandy[index] === 1) {
        return false;
      }
      if (getSnowBlend(cx * CHUNK_SIZE + x, cz * CHUNK_SIZE + z) > 0) {
        return false;
      }
      const flatEnough =
        Math.abs(height - heights[index - 1]) <= 1 &&
        Math.abs(height - heights[index + 1]) <= 1 &&
        Math.abs(height - heights[index - CHUNK_SIZE]) <= 1 &&
        Math.abs(height - heights[index + CHUNK_SIZE]) <= 1;
      if (!flatEnough) {
        return false;
      }
      return !chunk.trees.some((tree) => Math.abs(tree.x - (cx * CHUNK_SIZE + x)) <= 2 && Math.abs(tree.z - (cz * CHUNK_SIZE + z)) <= 2);
    };

    const tryAddFauna = (kind, seed, threshold, options) => {
      if (hash3(cx, seed, cz) < threshold) {
        return;
      }
      const x = 2 + Math.floor(hash3(cx, seed + 1, cz) * (CHUNK_SIZE - 4));
      const z = 2 + Math.floor(hash3(cx, seed + 2, cz) * (CHUNK_SIZE - 4));
      const spawnX = cx * CHUNK_SIZE + x + 0.5;
      const spawnZ = cz * CHUNK_SIZE + z + 0.5;
      if (Math.hypot(spawnX - DEFAULT_SPAWN.x, spawnZ - DEFAULT_SPAWN.z) < 3.5) {
        return;
      }
      if (!canSpawnFaunaAt(x, z, options)) {
        return;
      }
      const height = heights[z * CHUNK_SIZE + x];
      chunk.fauna.push({
        kind,
        x: spawnX,
        y: height + 1,
        z: spawnZ,
      });
    };

    // Terrain that lights itself has to be listed now: the light pass seeds
    // from this rather than sweeping the chunk volume.
    for (const region of BIOME_REGIONS) {
      if (region.emissive && chunkIntersectsRect(cx, cz, region)) {
        this.collectEmitters(chunk, region);
      }
    }

    tryAddFauna("sheep", 61, 0.44, { allowSand: false, minHeight: 9, maxHeight: 18 });
    tryAddFauna("sheep", 71, 0.68, { allowSand: false, minHeight: 9, maxHeight: 18 });
    tryAddFauna("villager", 81, 0.84, { allowSand: false, minHeight: 10, maxHeight: 16 });
    tryAddFauna("cat", 91, 0.58, { allowSand: false, minHeight: 9, maxHeight: 20 });

    for (let z = 1; z < CHUNK_SIZE - 1; z++) {
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const parcel = getCityParcel(wx, wz);
        if (
          parcel?.kind === "road" &&
          parcel.modX === 1 &&
          parcel.modZ === 1 &&
          ((parcel.blockX + parcel.blockZ) % 2 === 0)
        ) {
          const height = heights[z * CHUNK_SIZE + x];
          const spawnX = wx + 0.5;
          const spawnZ = wz + 0.5;
          if (Math.hypot(spawnX - DEFAULT_SPAWN.x, spawnZ - DEFAULT_SPAWN.z) < 4) {
            continue;
          }
          chunk.fauna.push({
            kind: "villager",
            x: spawnX,
            y: height + 1,
            z: spawnZ,
          });
        }

        const snowParcel = getSnowParcel(wx, wz);
        if (
          snowParcel?.kind === "path" &&
          snowParcel.modX === 1 &&
          snowParcel.modZ === 1 &&
          ((snowParcel.lotX + snowParcel.lotZ) % 2 === 1)
        ) {
          chunk.fauna.push({
            kind: "villager",
            x: wx + 0.5,
            y: heights[z * CHUNK_SIZE + x] + 1,
            z: wz + 0.5,
          });
        }
      }
    }

    this.chunks.set(key, chunk);
    this.totalGenerated++;
    return chunk;
  }

  updateLoadedChunks(playerX, playerZ) {
    const centerCx = Math.floor(playerX / CHUNK_SIZE);
    const centerCz = Math.floor(playerZ / CHUNK_SIZE);
    this.loadedKeys.clear();

    for (let dz = -this.loadRadius; dz <= this.loadRadius; dz++) {
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        this.ensureChunk(cx, cz);
        this.loadedKeys.add(this.getChunkKey(cx, cz));
      }
    }

    for (const [key, chunk] of this.chunks) {
      const distance = Math.max(
        Math.abs(chunk.cx - centerCx),
        Math.abs(chunk.cz - centerCz),
      );
      if (distance > this.unloadRadius && chunk.edits.size === 0) {
        this.chunks.delete(key);
      }
    }
  }

  /** Lists the glowing blocks a biome generates, for the light pass to seed from. */
  collectEmitters(chunk, region) {
    const from = Math.max(LIGHT_MIN_Y, region.baseHeight - 4);
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = chunk.cx * CHUNK_SIZE + lx;
        const wz = chunk.cz * CHUNK_SIZE + lz;
        if (!getBiomeAt(wx, wz)) {
          continue;
        }
        const height = chunk.heights[lz * CHUNK_SIZE + lx];
        const to = Math.min(LIGHT_MAX_Y, height);
        for (let wy = from; wy <= to; wy++) {
          const level = getLightEmission(getBiomeBlock(region, wx, wy, wz, height));
          if (level > 0) {
            chunk.emitters.push({ lx, y: wy, lz, level });
          }
        }
      }
    }
  }

  /**
   * What grows in each biome. Kept apart from ensureChunk so the per-column
   * loop there stays readable.
   */
  decorateBiome(chunk, region, wx, wz, height, flatEnough) {
    if (region.id === "forest") {
      // Much denser than open country, and taller with it.
      if (flatEnough && height >= 9 && hash3(wx, 17, wz) > 0.955) {
        const trunkHeight = 5 + Math.floor(hash3(wx, 29, wz) * 3);
        chunk.trees.push({ x: wx, z: wz, y: height + 1, trunkHeight, kind: "oak" });
        chunk.maxBuildY = Math.max(chunk.maxBuildY, height + trunkHeight + 2);
      }
      return;
    }

    if (region.id === "desert") {
      const oasis = getOasisDepth(region, wx, wz);
      if (oasis > 0.55) {
        // Palms round the water hole.
        if (flatEnough && height > WATER_LEVEL && hash3(wx, 37, wz) > 0.965) {
          const trunkHeight = 5 + Math.floor(hash3(wx, 41, wz) * 3);
          chunk.trees.push({ x: wx, z: wz, y: height + 1, trunkHeight, kind: "palm" });
          chunk.maxBuildY = Math.max(chunk.maxBuildY, height + trunkHeight + 3);
        }
        return;
      }
      if (flatEnough && height > WATER_LEVEL && hash3(wx, 53, wz) > 0.985) {
        const tall = 2 + Math.floor(hash3(wx, 59, wz) * 3);
        chunk.cacti.push({ x: wx, z: wz, y: height + 1, tall });
        chunk.maxBuildY = Math.max(chunk.maxBuildY, height + tall + 1);
      }
      return;
    }

    if (region.id === "swamp") {
      // Crooked and wide-crowned, and happy with wet feet.
      if (height > WATER_LEVEL && hash3(wx, 67, wz) > 0.975) {
        const trunkHeight = 3 + Math.floor(hash3(wx, 71, wz) * 3);
        chunk.trees.push({ x: wx, z: wz, y: height + 1, trunkHeight, kind: "swamp" });
        chunk.maxBuildY = Math.max(chunk.maxBuildY, height + trunkHeight + 3);
      }
      return;
    }

    if (region.id === "canyon") {
      // Standing spires left behind where the rock did not wear away.
      if (flatEnough && hash3(wx, 83, wz) > 0.993) {
        const tall = 5 + Math.floor(hash3(wx, 89, wz) * 7);
        chunk.spires.push({ x: wx, z: wz, y: height + 1, tall });
        chunk.maxBuildY = Math.max(chunk.maxBuildY, height + tall + 2);
      }
    }
  }

  getGeneratedBlock(wx, wy, wz) {
    if (wy < MIN_WORLD_Y) {
      return BLOCKS.stone;
    }
    const chunk = this.ensureChunk(Math.floor(wx / CHUNK_SIZE), Math.floor(wz / CHUNK_SIZE));
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const height = chunk.heights[lz * CHUNK_SIZE + lx];
    const sandy = chunk.sandy[lz * CHUNK_SIZE + lx] === 1;
    const snowZone = getSnowBlend(wx, wz) > 0;
    const biome = getBiomeAt(wx, wz);
    const caveNoise =
      Math.abs(perlin2(wx / 21 + wy * 0.08, wz / 21)) +
      Math.abs(perlin2(wx / 25, wy / 9 + wz * 0.04));
    const caveCarve = wy < height - 1 && wy > 2 && caveNoise > 1.06;
    const structureBlock = getStructureBlock(wx, wy, wz, height);
    if (structureBlock != null) {
      return structureBlock;
    }
    if (wy > height) {
      for (const cactus of chunk.cacti) {
        if (wx === cactus.x && wz === cactus.z && wy >= cactus.y && wy < cactus.y + cactus.tall) {
          return BLOCKS.cactus;
        }
      }
      for (const spire of chunk.spires) {
        // Narrower as it rises, so it tapers like weathered rock.
        const dx = Math.abs(wx - spire.x);
        const dz = Math.abs(wz - spire.z);
        const up = wy - spire.y;
        if (up >= 0 && up < spire.tall) {
          const radius = up < spire.tall * 0.65 ? 1 : 0;
          if (dx <= radius && dz <= radius) {
            return up > spire.tall - 2 ? BLOCKS.red_sand : BLOCKS.red_rock;
          }
        }
      }
      for (const tree of chunk.trees) {
        const dx = wx - tree.x;
        const dz = wz - tree.z;
        const top = tree.y + tree.trunkHeight;
        if (wx === tree.x && wz === tree.z && wy >= tree.y && wy < top) {
          return BLOCKS.wood;
        }
        if (tree.kind === "palm") {
          // A bare trunk with a flat spray of fronds on top.
          if (wy === top && Math.abs(dx) + Math.abs(dz) <= 2) {
            return BLOCKS.leaves;
          }
          continue;
        }
        if (tree.kind === "swamp") {
          // Wide and low, with the canopy drooping past the trunk.
          if (wy >= top - 1 && wy <= top + 1 && Math.abs(dx) <= 3 && Math.abs(dz) <= 3
            && Math.abs(dx) + Math.abs(dz) <= 4) {
            return BLOCKS.leaves;
          }
          continue;
        }
        const canopyBase = top - 2;
        const canopyTop = top + 1;
        if (
          wy >= canopyBase &&
          wy <= canopyTop &&
          Math.abs(dx) <= 2 &&
          Math.abs(dz) <= 2 &&
          Math.abs(dx) + Math.abs(dz) <= 3 &&
          !(Math.abs(dx) === 2 && Math.abs(dz) === 2 && wy < canopyTop)
        ) {
          return BLOCKS.leaves;
        }
      }
      for (const tree of chunk.frostTrees) {
        const dx = wx - tree.x;
        const dz = wz - tree.z;
        const layer = wy - (tree.y + tree.trunkHeight - 3);
        const radius = 2 - Math.floor(layer * 0.5);
        if (wx === tree.x && wz === tree.z && wy >= tree.y && wy < tree.y + tree.trunkHeight) {
          return BLOCKS.pine_wood;
        }
        if (
          wy >= tree.y + tree.trunkHeight - 3 &&
          wy <= tree.y + tree.trunkHeight + 1 &&
          Math.abs(dx) <= Math.max(1, radius) &&
          Math.abs(dz) <= Math.max(1, radius) &&
          Math.abs(dx) + Math.abs(dz) <= Math.max(2, radius + 1)
        ) {
          return BLOCKS.pine_leaves;
        }
      }
      if (wy <= WATER_LEVEL) {
        return snowZone && wy === WATER_LEVEL ? BLOCKS.ice : BLOCKS.water;
      }
      return BLOCKS.air;
    }
    if (caveCarve && !biome) {
      if (wy <= WATER_LEVEL - 1) {
        return BLOCKS.water;
      }
      return BLOCKS.air;
    }
    if (biome) {
      const biomeBlock = getBiomeBlock(biome.region, wx, wy, wz, height);
      if (biomeBlock != null) {
        return biomeBlock;
      }
    }
    if (sandy) {
      return BLOCKS.sand;
    }
    if (snowZone) {
      if (wy === height) {
        return BLOCKS.snow;
      }
      if (wy >= height - 2) {
        return BLOCKS.dirt;
      }
    }
    if (wy === height) {
      return BLOCKS.grass;
    }
    if (wy >= height - 3) {
      return BLOCKS.dirt;
    }
    const oreRoll = hash3(wx * 0.21, wy * 0.37, wz * 0.19);
    if (wy < 18 && oreRoll > 0.83 && oreRoll < 0.9) {
      return BLOCKS.coal_ore;
    }
    if (wy < 12 && oreRoll > 0.93 && oreRoll < 0.985) {
      return BLOCKS.iron_ore;
    }
    // The good stuff only shows up deep, and ancient debris deeper still.
    if (wy < 6 && oreRoll > 0.985) {
      return BLOCKS.diamond_ore;
    }
    if (wy < 2 && hash3(wx * 0.13, wy * 0.29, wz * 0.11) > 0.975) {
      return BLOCKS.ancient_debris;
    }
    return BLOCKS.stone;
  }

  /* ---------------------------------------------------------------- *
   * Light
   *
   * Sky light and torch light share one 0-15 value per cell. Day and night
   * are already handled by the scene's sun, so a single "how lit is this
   * spot" number is all the mesher needs.
   * ---------------------------------------------------------------- */

  getLight(wx, wy, wz) {
    if (wy < LIGHT_MIN_Y) {
      return 0;
    }
    if (wy > LIGHT_MAX_Y) {
      return MAX_LIGHT;
    }
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk?.light) {
      // Estimate for a chunk that has not been lit yet: daylight above the
      // surface, dark below. Returning a flat value here would either bleed
      // bright stripes into caves or paint dark seams across open ground.
      return wy > this.getHeightAt(wx, wz) ? MAX_LIGHT : 0;
    }
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.light[lightIndex(lx, wy, lz)];
  }

  /** Marks a column and its neighbours for relighting after an edit. */
  invalidateLight(wx, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.chunks.get(this.getChunkKey(cx + dx, cz + dz));
        if (chunk) {
          chunk.lightDirty = true;
        }
      }
    }
  }

  ensureLight(cx, cz) {
    const chunk = this.ensureChunk(cx, cz);
    if (chunk.light && !chunk.lightDirty) {
      return chunk;
    }
    this.computeChunkLight(cx, cz);
    return chunk;
  }

  /**
   * Floods light through one chunk: sky from above, torches from inside, and
   * whatever already reaches in from neighbours that have been lit.
   */
  computeChunkLight(cx, cz) {
    const chunk = this.ensureChunk(cx, cz);
    const light = chunk.light ?? (chunk.light = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * LIGHT_HEIGHT));
    light.fill(0);

    const top = Math.min(LIGHT_MAX_Y, Math.max(chunk.maxBuildY + 1, chunk.maxHeight + 1));
    const queue = [];

    // Sky pass: walk each column down from the top until something stops the
    // light. Everything below stays dark, so there is no need to look further.
    const skyFloor = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        let wy = top;
        for (; wy >= LIGHT_MIN_Y; wy--) {
          if (blocksLight(this.getBlock(wx, wy, wz))) {
            break;
          }
          light[lightIndex(lx, wy, lz)] = MAX_LIGHT;
        }
        skyFloor[lz * CHUNK_SIZE + lx] = wy + 1;
      }
    }

    // Only daylight cells sitting next to something darker need to spread.
    // Open sky above the terrain is uniformly lit and would just churn the
    // queue, which is what made this expensive.
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const floor = skyFloor[lz * CHUNK_SIZE + lx];
        const neighbourFloors = [
          lx > 0 ? skyFloor[lz * CHUNK_SIZE + lx - 1] : LIGHT_MIN_Y,
          lx < CHUNK_SIZE - 1 ? skyFloor[lz * CHUNK_SIZE + lx + 1] : LIGHT_MIN_Y,
          lz > 0 ? skyFloor[(lz - 1) * CHUNK_SIZE + lx] : LIGHT_MIN_Y,
          lz < CHUNK_SIZE - 1 ? skyFloor[(lz + 1) * CHUNK_SIZE + lx] : LIGHT_MIN_Y,
        ];
        const highestNeighbour = Math.max(...neighbourFloors);
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        // The lowest lit cell always spreads; above that, only up to where a
        // neighbouring column's floor is higher than ours.
        const ceiling = Math.min(top, Math.max(floor, highestNeighbour));
        for (let wy = floor; wy <= ceiling; wy++) {
          queue.push(lightIndex(lx, wy, lz), wx, wy, wz);
        }
      }
    }

    // Terrain that glows on its own. Only a handful of biomes make any, and
    // ensureChunk has already listed it, so this stays a short loop rather
    // than a sweep of the chunk volume.
    for (const emitter of chunk.emitters) {
      if (emitter.y < LIGHT_MIN_Y || emitter.y > LIGHT_MAX_Y) {
        continue;
      }
      const index = lightIndex(emitter.lx, emitter.y, emitter.lz);
      if (emitter.level > light[index]) {
        light[index] = emitter.level;
        queue.push(index, cx * CHUNK_SIZE + emitter.lx, emitter.y, cz * CHUNK_SIZE + emitter.lz);
      }
    }

    // Player-placed emitters. The edit map is the whole search space rather
    // than the chunk volume.
    for (const [editKey, blockType] of chunk.edits) {
      const emission = getLightEmission(blockType);
      if (emission <= 0) {
        continue;
      }
      const [lx, wy, lz] = editKey.split(",").map(Number);
      if (wy < LIGHT_MIN_Y || wy > LIGHT_MAX_Y) {
        continue;
      }
      const index = lightIndex(lx, wy, lz);
      if (emission > light[index]) {
        light[index] = emission;
        queue.push(index, cx * CHUNK_SIZE + lx, wy, cz * CHUNK_SIZE + lz);
      }
    }

    // Pull light in from neighbours that have already been computed.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbour = this.chunks.get(this.getChunkKey(cx + dx, cz + dz));
      if (!neighbour?.light) {
        continue;
      }
      for (let step = 0; step < CHUNK_SIZE; step++) {
        const lx = dx === 1 ? CHUNK_SIZE - 1 : dx === -1 ? 0 : step;
        const lz = dz === 1 ? CHUNK_SIZE - 1 : dz === -1 ? 0 : step;
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        for (let wy = LIGHT_MIN_Y; wy <= top; wy++) {
          const incoming = this.getLight(wx + dx, wy, wz + dz) - 1;
          const index = lightIndex(lx, wy, lz);
          if (incoming > light[index] && !blocksLight(this.getBlock(wx, wy, wz))) {
            light[index] = incoming;
            queue.push(index, wx, wy, wz);
          }
        }
      }
    }

    // Breadth-first spread, losing one level per block.
    const minX = cx * CHUNK_SIZE;
    const minZ = cz * CHUNK_SIZE;
    for (let head = 0; head < queue.length; head += 4) {
      const level = light[queue[head]];
      if (level <= 1) {
        continue;
      }
      const wx = queue[head + 1];
      const wy = queue[head + 2];
      const wz = queue[head + 3];

      for (const [dx, dy, dz] of NEIGHBOUR_OFFSETS) {
        const nx = wx + dx;
        const ny = wy + dy;
        const nz = wz + dz;
        if (ny < LIGHT_MIN_Y || ny > LIGHT_MAX_Y) {
          continue;
        }
        const lx = nx - minX;
        const lz = nz - minZ;
        if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) {
          continue;
        }
        const index = lightIndex(lx, ny, lz);
        if (light[index] >= level - 1 || blocksLight(this.getBlock(nx, ny, nz))) {
          continue;
        }
        light[index] = level - 1;
        queue.push(index, nx, ny, nz);
      }
    }

    chunk.lightDirty = false;
    return chunk;
  }

  getEditKey(lx, wy, lz) {
    return `${lx},${wy},${lz}`;
  }

  /** True if a player (or an NPC) has already changed this cell. */
  hasEditAt(wx, wy, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) {
      return false;
    }
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.edits.has(this.getEditKey(lx, wy, lz));
  }

  getBlock(wx, wy, wz) {
    if (wy > MAX_WORLD_Y) {
      return BLOCKS.air;
    }
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const editKey = this.getEditKey(lx, wy, lz);
    if (chunk.edits.has(editKey)) {
      return chunk.edits.get(editKey);
    }
    return this.getGeneratedBlock(wx, wy, wz);
  }

  setBlock(wx, wy, wz, blockType) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const editKey = this.getEditKey(lx, wy, lz);
    const generated = this.getGeneratedBlock(wx, wy, wz);
    const current = this.getBlock(wx, wy, wz);

    if (current === blockType) {
      return false;
    }

    if (generated === blockType) {
      chunk.edits.delete(editKey);
    } else {
      chunk.edits.set(editKey, blockType);
    }

    chunk.maxHeight = Math.max(chunk.maxHeight, wy);
    chunk.maxBuildY = Math.max(chunk.maxBuildY, wy);
    this.invalidateLight(wx, wz);
    return true;
  }

  isSolid(wx, wy, wz) {
    const blockType = this.getBlock(wx, wy, wz);
    return blockType !== BLOCKS.air
      && blockType !== BLOCKS.water
      && blockType !== BLOCKS.torch
      // You walk into lava rather than onto it, and straight through a portal.
      && blockType !== BLOCKS.lava
      && blockType !== BLOCKS.portal;
  }

  getChunkMaxY(cx, cz) {
    const chunk = this.ensureChunk(cx, cz);
    let maxY = chunk.maxBuildY;
    for (const [key, value] of chunk.edits) {
      if (value === BLOCKS.air) {
        continue;
      }
      const [, y] = key.split(",").map(Number);
      maxY = Math.max(maxY, y);
    }
    return Math.min(MAX_BUILD_HEIGHT, maxY + 1);
  }
}

export const world = new World();

export function getSurfaceData(x, z) {
  const wx = Math.floor(x);
  const wz = Math.floor(z);
  const ceiling = Math.min(MAX_BUILD_HEIGHT, world.getHeightAt(wx, wz) + 12);
  for (let y = ceiling; y >= MIN_WORLD_Y; y--) {
    const blockType = world.getBlock(wx, y, wz);
    if (blockType !== BLOCKS.air && blockType !== BLOCKS.water && blockType !== BLOCKS.leaves) {
      return { x: wx, y: y + 1, z: wz, blockType };
    }
  }
  return { x: wx, y: world.getHeightAt(wx, wz) + 1, z: wz, blockType: BLOCKS.grass };
}
