// TNT: wrecks the scenery, and nothing else.
//
// It cannot take a single heart off the player, the friends, the cats or the
// sheep. The worst it does to a person is knock them off their feet, which is
// the fun part and costs nothing. That is deliberate, not an oversight: this
// game has no fighting in it.

import { chunkMeshes } from "./chunkMesh.js";
import { BLAST_KINDS, BLOCKS, ITEMS, TNT_MAX_DROPS } from "./constants.js";
import { spawnDrop } from "./drops.js";
import { getDropForBlock } from "./items.js";
import { clamp } from "./math.js";
import { npcs } from "./npcs.js";
import { spawnParticles } from "./particles.js";
import { extinguishAround } from "./portals.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { world } from "./world.js";

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
 * Clears a rough sphere of blocks. The radius is jittered per column so the
 * hole comes out ragged rather than looking stamped out with a cutter.
 */
export function explode(cx, cy, cz, blockType = BLOCKS.tnt) {
  const kind = BLAST_KINDS[blockType] ?? BLAST_KINDS[BLOCKS.tnt];
  const radius = kind.radius;
  const reach = Math.ceil(radius);
  const burning = kind.mode === "burn";
  const touched = [];
  let drops = 0;

  for (let dy = -reach; dy <= reach; dy++) {
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const distance = Math.hypot(dx, dy, dz);
        if (distance > radius * (0.78 + Math.random() * 0.22)) {
          continue;
        }
        const x = cx + dx;
        const y = cy + dy;
        const z = cz + dz;
        const found = world.getBlock(x, y, z);
        if (BLAST_PROOF.has(found)) {
          continue;
        }

        // Another charge in the blast goes up too, a moment later.
        if (isCharge(found)) {
          world.setBlock(x, y, z, BLOCKS.air);
          state.litTnt.push({
            key: `${x},${y},${z}`,
            x, y, z,
            blockType: found,
            fuse: 0.15 + Math.random() * 0.35,
            tick: 0,
          });
          continue;
        }

        // Fire only takes what will burn; stone and brick are left standing,
        // which is what makes it a way to clear land rather than flatten it.
        const becomes = burning ? BURNS_TO[found] : BLOCKS.air;
        if (becomes === undefined || becomes === found) {
          continue;
        }

        if (found === BLOCKS.portal_frame) {
          extinguishAround(x, y, z);
        }
        world.setBlock(x, y, z, becomes);
        touched.push([x, y, z, found]);

        // Only some of it survives, and only so much of that.
        if (drops < TNT_MAX_DROPS && Math.random() < kind.dropChance) {
          const dropId = burning ? BURN_DROPS[found] : getDropForBlock(found);
          if (dropId != null) {
            drops += 1;
            spawnDrop(
              dropId, x + 0.5, y + 0.5, z + 0.5,
              (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3,
            );
          }
        }
      }
    }
  }

  const spark = Math.max(0.02, 20 / Math.max(1, touched.length));
  for (const [x, , z, found] of touched) {
    chunkMeshes.markDirtyAtWorld(x, z);
    if (Math.random() < spark) {
      spawnParticles(x + 0.5, cy + 0.5, z + 0.5, burning ? kind.sparkColor : found, 2, 3.2);
    }
  }
  spawnParticles(cx + 0.5, cy + 0.8, cz + 0.5, kind.sparkColor, 26, 5.5);
  soundEngine.explosion(burning);
  shovePlayer(cx, cy, cz, kind);
  npcs.startle(cx, cz);
  state.saveDirty = true;
  return touched.length;
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
  player.vy = Math.max(player.vy, force * 0.55);
  player.onGround = false;
  state.viewBob = 0.3;
  // Neither the shove nor the landing afterwards costs anything.
  state.fallStartY = null;
  state.blastGrace = 5;
}
