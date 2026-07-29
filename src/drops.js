// Dropped items that fall, bob and can be picked back up.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCK_NAMES, GRAVITY, MIN_WORLD_Y, PI } from "./constants.js";
import { getIconTexture } from "./icons.js";
import { addItem } from "./items.js";
import { scene } from "./scene.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { showToast } from "./ui/hud.js";
import { updateInventoryPanel } from "./ui/inventory.js";
import { world } from "./world.js";
/* ------------------------------------------------------------------ *
 * Dropped items — what the drop key throws out and what walking over
 * an item picks back up.
 * ------------------------------------------------------------------ */

export const DROP_PICKUP_DELAY = 0.55;
export const DROP_PICKUP_RANGE = 1.35;
export const DROP_LIFETIME = 300;

export function spawnDrop(itemId, x, y, z, vx, vy, vz) {
  const texture = getIconTexture(itemId);
  if (!texture) {
    return;
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }));
  sprite.scale.set(0.42, 0.42, 0.42);
  sprite.position.set(x, y, z);
  scene.add(sprite);
  state.drops.push({ itemId, sprite, vx, vy, vz, age: 0, bob: Math.random() * PI * 2 });
}

export function removeDrop(index) {
  const drop = state.drops[index];
  scene.remove(drop.sprite);
  drop.sprite.material.dispose();
  state.drops.splice(index, 1);
}

export function updateDrops(dt) {
  const player = state.player;
  for (let index = state.drops.length - 1; index >= 0; index--) {
    const drop = state.drops[index];
    drop.age += dt;
    drop.bob += dt * 2.4;

    drop.vy -= GRAVITY * 0.55 * dt;
    const nextY = drop.sprite.position.y + drop.vy * dt;
    if (world.isSolid(
      Math.floor(drop.sprite.position.x),
      Math.floor(nextY - 0.12),
      Math.floor(drop.sprite.position.z),
    )) {
      drop.vy = 0;
      drop.vx *= 0.5;
      drop.vz *= 0.5;
    } else {
      drop.sprite.position.y = nextY;
    }

    const nextX = drop.sprite.position.x + drop.vx * dt;
    const nextZ = drop.sprite.position.z + drop.vz * dt;
    if (!world.isSolid(Math.floor(nextX), Math.floor(drop.sprite.position.y), Math.floor(nextZ))) {
      drop.sprite.position.x = nextX;
      drop.sprite.position.z = nextZ;
    } else {
      drop.vx = 0;
      drop.vz = 0;
    }
    drop.vx *= 1 - dt * 2.2;
    drop.vz *= 1 - dt * 2.2;

    const hover = Math.sin(drop.bob) * 0.045;
    drop.sprite.scale.setScalar(0.42 + hover * 0.2);

    const distance = Math.hypot(
      drop.sprite.position.x - player.x,
      drop.sprite.position.y - (player.y + 0.9),
      drop.sprite.position.z - player.z,
    );
    if (drop.age > DROP_PICKUP_DELAY && distance < DROP_PICKUP_RANGE && !state.isDead) {
      addItem(drop.itemId, 1);
      showToast(`Picked up ${BLOCK_NAMES[drop.itemId]}`);
      soundEngine.select();
      state.saveDirty = true;
      removeDrop(index);
      updateInventoryPanel();
      continue;
    }
    if (drop.age > DROP_LIFETIME || drop.sprite.position.y < MIN_WORLD_Y - 8) {
      removeDrop(index);
    }
  }
}

export function clearDrops() {
  while (state.drops.length > 0) {
    removeDrop(state.drops.length - 1);
  }
}
