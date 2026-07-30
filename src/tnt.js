// TNT: wrecks the scenery, and nothing else.
//
// It cannot take a single heart off the player, the friends, the cats or the
// sheep. The worst it does to a person is knock them off their feet, which is
// the fun part and costs nothing. That is deliberate, not an oversight: this
// game has no fighting in it.

import { chunkMeshes } from "./chunkMesh.js";
import {
  BLOCKS,
  TNT_DROP_CHANCE,
  TNT_FUSE,
  TNT_MAX_DROPS,
  TNT_PUSH,
  TNT_RADIUS,
} from "./constants.js";
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

/** Lights a placed charge. Returns false if that block is not TNT. */
export function lightTnt(x, y, z) {
  if (world.getBlock(x, y, z) !== BLOCKS.tnt) {
    return false;
  }
  const key = `${x},${y},${z}`;
  if (state.litTnt.some((charge) => charge.key === key)) {
    return false;
  }
  state.litTnt.push({ key, x, y, z, fuse: TNT_FUSE, tick: 0 });
  soundEngine.fuse();
  return true;
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
      spawnParticles(charge.x + 0.5, charge.y + 1, charge.z + 0.5, BLOCKS.tnt, 2, 1.4);
      soundEngine.fuse();
    }

    if (charge.fuse <= 0) {
      state.litTnt.splice(i, 1);
      explode(charge.x, charge.y, charge.z);
    }
  }
}

/**
 * Clears a rough sphere of blocks. The radius is jittered per column so the
 * hole comes out ragged rather than looking stamped out with a cutter.
 */
export function explode(cx, cy, cz) {
  const radius = TNT_RADIUS;
  const reach = Math.ceil(radius);
  const broken = [];
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
        const blockType = world.getBlock(x, y, z);
        if (BLAST_PROOF.has(blockType)) {
          continue;
        }

        // Another charge in the blast goes up too, a moment later.
        if (blockType === BLOCKS.tnt) {
          world.setBlock(x, y, z, BLOCKS.air);
          state.litTnt.push({
            key: `${x},${y},${z}`,
            x, y, z,
            fuse: 0.15 + Math.random() * 0.35,
            tick: 0,
          });
          continue;
        }

        if (blockType === BLOCKS.portal_frame) {
          extinguishAround(x, y, z);
        }
        world.setBlock(x, y, z, BLOCKS.air);
        broken.push([x, y, z, blockType]);

        // Only some of it survives the blast, and only so much of that.
        if (drops < TNT_MAX_DROPS && Math.random() < TNT_DROP_CHANCE) {
          const dropId = getDropForBlock(blockType);
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

  for (const [x, , z, blockType] of broken) {
    chunkMeshes.markDirtyAtWorld(x, z);
    if (Math.random() < 0.08) {
      spawnParticles(x + 0.5, cy + 0.5, z + 0.5, blockType, 2, 3.2);
    }
  }
  spawnParticles(cx + 0.5, cy + 0.8, cz + 0.5, BLOCKS.tnt, 26, 5.5);
  soundEngine.explosion();
  shovePlayer(cx, cy, cz);
  npcs.startle(cx, cz);
  state.saveDirty = true;
  return broken.length;
}

/**
 * The blast throws you about but takes nothing off you. No call to
 * damagePlayer here, and there is not meant to be one.
 */
function shovePlayer(cx, cy, cz) {
  const player = state.player;
  const dx = player.x - (cx + 0.5);
  const dy = player.y - cy;
  const dz = player.z - (cz + 0.5);
  const distance = Math.hypot(dx, dy, dz);
  if (distance > TNT_RADIUS * 1.8) {
    return;
  }
  const force = TNT_PUSH * (1 - distance / (TNT_RADIUS * 1.8));
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
