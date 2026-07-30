// TNT: wrecks the scenery, and nothing else.
//
// It cannot take a single heart off the player, the friends, the cats or the
// sheep. The worst it does to a person is knock them off their feet, which is
// the fun part and costs nothing. That is deliberate, not an oversight: this
// game has no fighting in it.

import { noteCharge } from "./book.js";
import { chunkMeshes } from "./chunkMesh.js";
import {
  BLAST_CELLS_PER_FRAME,
  BLAST_KINDS,
  BLOCKS,
  ITEMS,
  MAX_AIR,
  TNT_MAX_DROPS,
} from "./constants.js";
import { spawnDrop } from "./drops.js";
import { getDropForBlock } from "./items.js";
import { clamp } from "./math.js";
import { npcs } from "./npcs.js";
import { spawnParticles } from "./particles.js";
import { extinguishAround } from "./portals.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { isSolidType, world } from "./world.js";

/** Left where they are: liquids flow back and a portal is not scenery. */
const BLAST_PROOF = new Set([BLOCKS.air, BLOCKS.water, BLOCKS.lava, BLOCKS.portal]);

/** Every kind of charge, so one lit block can find its own behaviour. */
const CHARGES = new Set(Object.keys(BLAST_KINDS).map(Number));

export function isCharge(blockType) {
  return CHARGES.has(blockType);
}

/**
 * What the Fire TNT does to a block. It clears the land rather than cratering
 * it: plants and timber burn away, sand fuses to glass, and anything you would
 * have built a house out of is left standing.
 */
const BURNS_TO = {
  [BLOCKS.leaves]: BLOCKS.air,
  [BLOCKS.pine_leaves]: BLOCKS.air,
  [BLOCKS.cactus]: BLOCKS.air,
  [BLOCKS.wood]: BLOCKS.air,
  [BLOCKS.pine_wood]: BLOCKS.air,
  [BLOCKS.planks]: BLOCKS.air,
  [BLOCKS.snow]: BLOCKS.air,
  [BLOCKS.ice]: BLOCKS.water,
  [BLOCKS.grass]: BLOCKS.dirt,
  [BLOCKS.mud]: BLOCKS.dirt,
  [BLOCKS.sand]: BLOCKS.glass,
  [BLOCKS.red_sand]: BLOCKS.glass,
};

/** Burnt timber leaves charcoal behind, which is worth having. */
const BURN_DROPS = {
  [BLOCKS.wood]: ITEMS.coal,
  [BLOCKS.pine_wood]: ITEMS.coal,
  [BLOCKS.planks]: ITEMS.coal,
};

/** What a tornado can pick up. Anything you would build with is too heavy. */
const LOOSE = new Set([
  BLOCKS.leaves, BLOCKS.pine_leaves, BLOCKS.cactus, BLOCKS.snow,
  BLOCKS.sand, BLOCKS.red_sand, BLOCKS.mud, BLOCKS.grass,
  BLOCKS.wood, BLOCKS.pine_wood, BLOCKS.torch,
]);

/** Never worth freezing over or drowning: you would lose the way home. */
const KEEP = new Set([BLOCKS.portal, BLOCKS.portal_frame]);

/**
 * What one blast does to one block. `undefined` means leave it exactly as it
 * is, which is how each charge ends up feeling like a different tool rather
 * than a different size.
 */
const MODES = {
  /** Takes everything. */
  break(found) {
    return BLAST_PROOF.has(found) ? undefined : BLOCKS.air;
  },

  /** Takes what will burn and spares the masonry. */
  burn(found) {
    return BLAST_PROOF.has(found) ? undefined : BURNS_TO[found];
  },

  /**
   * Flood: washes the top half out and fills the bottom half in, so what is
   * left is a pond rather than a crater. Lava caught by it sets solid.
   *
   * `fillTop` is the promise being kept: if you are standing in the blast the
   * water pools below your feet instead of closing over your head. Without it
   * the pond drowns you, which would be this charge hurting you by the back
   * door.
   */
  flood(found, x, y, z, wave) {
    if (KEEP.has(found)) {
      return undefined;
    }
    if (found === BLOCKS.lava) {
      return BLOCKS.stone;
    }
    if (y > wave.cy) {
      return found === BLOCKS.air ? undefined : BLOCKS.air;
    }
    if (y > wave.fillTop) {
      // The shelf you are standing on. Left exactly as it was.
      return undefined;
    }
    return BLOCKS.water;
  },

  /** Tornado: lifts the loose things and leaves the heavy ones standing. */
  wind(found) {
    return LOOSE.has(found) ? BLOCKS.air : undefined;
  },

  /**
   * Earthquake: does not dig so much as churn. Ground turns to broken rock,
   * with roughly a quarter of it opening up as cracks.
   */
  quake(found) {
    if (BLAST_PROOF.has(found) || KEEP.has(found)) {
      return undefined;
    }
    if (Math.random() < 0.26) {
      return BLOCKS.air;
    }
    return found === BLOCKS.stone ? undefined : BLOCKS.stone;
  },

  /**
   * Blizzard: freezes water solid and settles snow on any open surface. It
   * takes nothing away at all, which makes it the one safe charge to set off
   * next to something you built.
   */
  freeze(found, x, y, z) {
    if (found === BLOCKS.water) {
      return BLOCKS.ice;
    }
    if (found === BLOCKS.lava) {
      return BLOCKS.stone;
    }
    if (found !== BLOCKS.air) {
      return undefined;
    }
    const below = world.getBlock(x, y - 1, z);
    if (!isSolidType(below) || below === BLOCKS.snow || KEEP.has(below)) {
      return undefined;
    }
    return BLOCKS.snow;
  },
};

/**
 * Every cell within a radius, sorted nearest-first, worked out once per radius
 * and then shared. The order is what lets a big blast travel outwards a slice
 * at a time instead of arriving everywhere at once.
 */
const offsetCache = new Map();

function blastOffsets(radius, shape = "ball") {
  const key = `${shape}:${radius}`;
  const cached = offsetCache.get(key);
  if (cached) {
    return cached;
  }
  // A column is tall and narrow, a disc is wide and flat, and a ball is
  // neither. All three are the same ellipsoid with different proportions, so
  // the distance below comes out as 0..1 whatever the shape is.
  const wide = shape === "column" ? radius * 0.55 : shape === "disc" ? radius * 1.4 : radius;
  const tall = shape === "column" ? radius * 1.7 : shape === "disc" ? radius * 0.4 : radius;
  const reachFlat = Math.ceil(wide);
  const reachTall = Math.ceil(tall);
  const cells = [];
  for (let dy = -reachTall; dy <= reachTall; dy++) {
    for (let dz = -reachFlat; dz <= reachFlat; dz++) {
      for (let dx = -reachFlat; dx <= reachFlat; dx++) {
        const d = Math.hypot(Math.hypot(dx, dz) / wide, dy / tall);
        if (d <= 1) {
          cells.push({ dx, dy, dz, d });
        }
      }
    }
  }
  cells.sort((a, b) => a.d - b.d);
  const packed = {
    count: cells.length,
    offsets: new Int16Array(cells.length * 3),
    distance: new Float32Array(cells.length),
  };
  for (let i = 0; i < cells.length; i++) {
    packed.offsets[i * 3] = cells[i].dx;
    packed.offsets[i * 3 + 1] = cells[i].dy;
    packed.offsets[i * 3 + 2] = cells[i].dz;
    packed.distance[i] = cells[i].d;
  }
  offsetCache.set(key, packed);
  return packed;
}

/** Blasts still travelling. They live a fraction of a second, so not saved. */
const waves = [];

/** Lights a placed charge of any kind. False if that block is not one. */
export function lightTnt(x, y, z) {
  const blockType = world.getBlock(x, y, z);
  const kind = BLAST_KINDS[blockType];
  if (!kind) {
    return false;
  }
  const key = `${x},${y},${z}`;
  if (state.litTnt.some((charge) => charge.key === key)) {
    return false;
  }
  state.litTnt.push({ key, x, y, z, blockType, fuse: kind.fuse, tick: 0 });
  soundEngine.fuse();
  return kind.name;
}

/** Runs from the loop: counts fuses down and sets them off. */
export function updateTnt(dt) {
  advanceWaves();
  if (state.litTnt.length === 0) {
    return;
  }
  // Backwards, because exploding removes entries and can add more.
  for (let i = state.litTnt.length - 1; i >= 0; i--) {
    const charge = state.litTnt[i];
    charge.fuse -= dt;

    // Sparks off the fuse, faster as it runs out.
    charge.tick -= dt;
    if (charge.tick <= 0) {
      charge.tick = clamp(charge.fuse * 0.16, 0.08, 0.5);
      spawnParticles(charge.x + 0.5, charge.y + 1, charge.z + 0.5,
        BLAST_KINDS[charge.blockType].sparkColor, 2, 1.4);
      soundEngine.fuse();
    }

    if (charge.fuse <= 0) {
      state.litTnt.splice(i, 1);
      explode(charge.x, charge.y, charge.z, charge.blockType);
    }
  }
}

/**
 * Sets a charge off. The radius is jittered per cell so the hole comes out
 * ragged rather than looking stamped out with a cutter.
 *
 * The bang, the shove and the noise all happen now. The digging is handed to a
 * wave: small charges finish theirs on the spot, and the big one gets through
 * it over the next few frames, which is both cheaper and better to watch.
 */
export function explode(cx, cy, cz, blockType = BLOCKS.tnt) {
  const kind = BLAST_KINDS[blockType] ?? BLAST_KINDS[BLOCKS.tnt];
  const wave = {
    cx, cy, cz, kind,
    fillTop: floodCeiling(cx, cy, cz, kind),
    burning: kind.mode === "burn",
    transform: MODES[kind.mode] ?? MODES.break,
    cells: blastOffsets(kind.radius, kind.shape),
    index: 0,
    drops: 0,
    broken: 0,
  };

  spawnParticles(cx + 0.5, cy + 0.8, cz + 0.5, kind.sparkColor, 26, 5.5);
  soundEngine.explosion(wave.burning);
  if (kind.shake) {
    state.viewBob = Math.max(state.viewBob, kind.shake);
  }
  shovePlayer(cx, cy, cz, kind);
  npcs.startle(cx, cz);
  noteCharge(kind.name);
  state.saveDirty = true;

  if (kind.staged) {
    waves.push(wave);
    return 0;
  }
  carve(wave, Infinity);
  return wave.broken;
}

/**
 * How high a flood is allowed to fill. Normally the middle of the blast, but
 * never above the feet of anyone caught in it.
 */
function floodCeiling(cx, cy, cz, kind) {
  if (kind.mode !== "flood") {
    return cy;
  }
  const player = state.player;
  const distance = Math.hypot(player.x - (cx + 0.5), player.y - cy, player.z - (cz + 0.5));
  if (distance > kind.radius + 2) {
    return cy;
  }
  // A full lungful too, so surfacing is never a race.
  state.air = MAX_AIR;
  // Two below the feet, not one: the block directly underfoot has to survive
  // or the ground turns to water and drops you into your own pond.
  return Math.min(cy, Math.floor(player.y) - 2);
}

/** Moves every travelling blast on by one frame's worth of digging. */
function advanceWaves() {
  if (waves.length === 0) {
    return;
  }
  const share = Math.ceil(BLAST_CELLS_PER_FRAME / waves.length);
  for (let i = waves.length - 1; i >= 0; i--) {
    carve(waves[i], share);
    if (waves[i].index >= waves[i].cells.count) {
      waves.splice(i, 1);
    }
  }
}

/** Works through up to `budget` cells of a blast, nearest ones first. */
function carve(wave, budget) {
  const { cx, cy, cz, kind, burning, cells, transform } = wave;
  const end = Math.min(cells.count, wave.index + budget);
  const start = wave.index;

  for (; wave.index < end; wave.index++) {
    const i = wave.index;
    // Ragged edge: the last fifth of the reach is hit or miss.
    if (cells.distance[i] > 0.78 + Math.random() * 0.22) {
      continue;
    }
    const x = cx + cells.offsets[i * 3];
    const y = cy + cells.offsets[i * 3 + 1];
    const z = cz + cells.offsets[i * 3 + 2];
    const found = world.getBlock(x, y, z);

    // Another charge in the blast goes up too, a moment later.
    if (isCharge(found)) {
      world.setBlock(x, y, z, BLOCKS.air);
      chunkMeshes.markDirtyAtWorld(x, z);
      state.litTnt.push({
        key: `${x},${y},${z}`,
        x, y, z,
        blockType: found,
        fuse: 0.15 + Math.random() * 0.35,
        tick: 0,
      });
      continue;
    }

    const becomes = transform(found, x, y, z, wave);
    if (becomes === undefined || becomes === found) {
      continue;
    }

    if (found === BLOCKS.portal_frame) {
      extinguishAround(x, y, z);
    }
    world.setBlock(x, y, z, becomes);
    chunkMeshes.markDirtyAtWorld(x, z);
    wave.broken += 1;

    // Only some of it survives, and only so much of that.
    if (wave.drops < TNT_MAX_DROPS && Math.random() < kind.dropChance) {
      const dropId = burning ? BURN_DROPS[found] : getDropForBlock(found);
      if (dropId != null) {
        wave.drops += 1;
        spawnDrop(
          dropId, x + 0.5, y + 0.5, z + 0.5,
          (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3,
        );
      }
    }

    // A handful of sparks along the way, thinned out so a huge blast does not
    // drain the particle pool in its first frame.
    if (Math.random() < 0.004) {
      spawnParticles(x + 0.5, y + 0.5, z + 0.5, burning ? kind.sparkColor : found, 2, 3.2);
    }
  }

  // A puff riding the front of a travelling blast, so you can see it coming.
  if (kind.staged && wave.index > start) {
    const lead = (start + wave.index) >> 1;
    spawnParticles(
      cx + cells.offsets[lead * 3] + 0.5,
      cy + cells.offsets[lead * 3 + 1] + 0.5,
      cz + cells.offsets[lead * 3 + 2] + 0.5,
      kind.sparkColor, 5, 4,
    );
  }
}

/**
 * The blast throws you about but takes nothing off you. No call to
 * damagePlayer here, and there is not meant to be one.
 */
function shovePlayer(cx, cy, cz, kind) {
  const player = state.player;
  const dx = player.x - (cx + 0.5);
  const dy = player.y - cy;
  const dz = player.z - (cz + 0.5);
  const distance = Math.hypot(dx, dy, dz);
  const range = kind.radius * 1.8;
  if (distance > range) {
    return;
  }
  const force = kind.push * (1 - distance / range);
  const spread = Math.max(distance, 0.6);
  state.knockX += (dx / spread) * force;
  state.knockZ += (dz / spread) * force;
  // A tornado throws you almost straight up; the rest mostly sideways.
  player.vy = Math.max(player.vy, force * (kind.lift ?? 0.55));
  player.onGround = false;
  state.viewBob = 0.3;
  // Neither the shove nor the landing afterwards costs anything. A tornado
  // throws you high enough that it needs a longer grace than the rest.
  state.fallStartY = null;
  state.blastGrace = Math.max(state.blastGrace, 5 + (kind.lift ?? 0) * 3);
}
