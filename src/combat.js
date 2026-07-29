// Health, damage, armour and the things that hurt you.

import {
  ARMOR_ITEMS,
  ARMOR_REDUCTION_PER_POINT,
  ARMOR_SLOTS,
  BLOCKS,
  DROWN_INTERVAL,
  LAVA_DAMAGE,
  LAVA_INTERVAL,
  MAX_AIR,
  MAX_ARMOR_REDUCTION,
  MAX_HEALTH,
  REGEN_DELAY,
  REGEN_INTERVAL,
  SAFE_FALL_DISTANCE,
} from "./constants.js";
import { getEnchantLevel } from "./enchanting.js";
import { addItem, consumeItem, getItemCount, isCreative } from "./items.js";
import { clamp } from "./math.js";
import { state } from "./state.js";
import { world } from "./world.js";

/* ------------------------------------------------------------------ *
 * Armour
 * ------------------------------------------------------------------ */

export function getArmorInfo(itemId) {
  return ARMOR_ITEMS[itemId] ?? null;
}

export function isArmor(itemId) {
  return itemId != null && itemId in ARMOR_ITEMS;
}

/** Total defence points across the four worn pieces. */
export function getArmorPoints() {
  let points = 0;
  for (const slot of ARMOR_SLOTS) {
    const info = getArmorInfo(state.armor[slot]);
    if (info) {
      points += info.points;
    }
  }
  return points;
}

/** Protection levels summed over worn pieces, as Minecraft does. */
function getArmorEnchantLevel(enchant) {
  let total = 0;
  for (const slot of ARMOR_SLOTS) {
    const itemId = state.armor[slot];
    if (itemId != null) {
      total += getEnchantLevel(itemId, enchant);
    }
  }
  return total;
}

export function getDamageReduction() {
  const fromPoints = getArmorPoints() * ARMOR_REDUCTION_PER_POINT;
  const fromProtection = getArmorEnchantLevel("protection") * 0.02;
  return clamp(fromPoints + fromProtection, 0, MAX_ARMOR_REDUCTION);
}

/** Moves a piece from the bag onto the body, swapping out what was worn. */
export function equipArmor(itemId) {
  const info = getArmorInfo(itemId);
  if (!info || getItemCount(itemId) <= 0) {
    return false;
  }
  const previous = state.armor[info.slot];
  consumeItem(itemId, 1);
  if (previous != null) {
    addItem(previous, 1);
  }
  state.armor[info.slot] = itemId;
  state.saveDirty = true;
  return true;
}

export function unequipArmor(slot) {
  const itemId = state.armor[slot];
  if (itemId == null) {
    return false;
  }
  addItem(itemId, 1);
  state.armor[slot] = null;
  state.saveDirty = true;
  return true;
}

/* ------------------------------------------------------------------ *
 * Damage and healing
 * ------------------------------------------------------------------ */

/**
 * Applies damage after armour. `ignoreArmor` is for sources armour cannot
 * stop, such as drowning and the void.
 */
export function damagePlayer(amount, { ignoreArmor = false, cause = "" } = {}) {
  if (amount <= 0 || state.isDead || isCreative()) {
    return 0;
  }
  const taken = ignoreArmor ? amount : amount * (1 - getDamageReduction());
  const rounded = Math.max(0.5, Math.round(taken * 2) / 2);
  state.health = clamp(state.health - rounded, 0, MAX_HEALTH);
  state.lastDamageTime = state.elapsed;
  state.damageFlash = 1;
  state.lastDamageCause = cause;
  state.saveDirty = true;
  return rounded;
}

export function healPlayer(amount) {
  state.health = clamp(state.health + amount, 0, MAX_HEALTH);
}

export function resetVitals() {
  state.health = MAX_HEALTH;
  state.air = MAX_AIR;
  state.fallStartY = null;
  state.damageFlash = 0;
  state.lastDamageTime = -99;
}

/** True when the block at the player's eyes is water. */
function isHeadUnderwater() {
  return world.getBlock(
    Math.floor(state.player.x),
    Math.floor(state.player.y + 1.5),
    Math.floor(state.player.z),
  ) === BLOCKS.water;
}

/** True when you are standing in lava. Pools are one block deep, so you can walk out. */
function isStandingInLava() {
  return world.getBlock(
    Math.floor(state.player.x),
    Math.floor(state.player.y + 0.1),
    Math.floor(state.player.z),
  ) === BLOCKS.lava;
}

/**
 * Fall damage, Minecraft's formula: one heart per block past three, softened
 * by Feather Falling. Called with the height the fall started from.
 */
export function applyFallDamage(fallDistance) {
  const feather = getArmorEnchantLevel("feather_falling");
  const softened = fallDistance - SAFE_FALL_DISTANCE - feather * 0.6;
  if (softened <= 0) {
    return 0;
  }
  return damagePlayer(softened, { cause: "fall" });
}

/**
 * Per-frame vitals: tracks the fall, drowns you underwater, and regenerates
 * once you have been left alone for a while.
 */
export function updateVitals(dt) {
  const player = state.player;

  if (isCreative()) {
    state.air = MAX_AIR;
    state.fallStartY = null;
    return;
  }

  // Track the peak of the current fall so landing can price it.
  if (player.onGround || state.flying) {
    if (state.fallStartY != null) {
      const distance = state.fallStartY - player.y;
      const damage = applyFallDamage(distance);
      if (damage > 0) {
        state.uiMessage = `Ouch — fell ${Math.round(distance)} blocks`;
        state.uiMessageTimer = 1.4;
      }
      state.fallStartY = null;
    }
  } else if (player.vy < 0) {
    state.fallStartY = state.fallStartY == null
      ? player.y
      : Math.max(state.fallStartY, player.y);
  } else {
    // Rising resets the fall; only the descent counts.
    state.fallStartY = null;
  }

  // Air supply.
  if (isHeadUnderwater()) {
    state.air -= dt;
    if (state.air <= 0) {
      state.drownTimer += dt;
      if (state.drownTimer >= DROWN_INTERVAL) {
        state.drownTimer = 0;
        damagePlayer(2, { ignoreArmor: true, cause: "drowning" });
      }
    }
  } else {
    state.air = Math.min(MAX_AIR, state.air + dt * 4);
    state.drownTimer = 0;
  }

  // Lava burns steadily rather than all at once, so there is time to climb
  // back out of a pool you walked into.
  if (isStandingInLava()) {
    state.burnTimer += dt;
    if (state.burnTimer >= LAVA_INTERVAL) {
      state.burnTimer = 0;
      damagePlayer(LAVA_DAMAGE, { cause: "the lava" });
      state.uiMessage = "That is hot! Get out of the lava";
      state.uiMessageTimer = 1.2;
    }
  } else {
    state.burnTimer = 0;
  }

  // Regeneration once nothing has hurt you recently.
  if (state.health > 0 && state.health < MAX_HEALTH
    && state.elapsed - state.lastDamageTime > REGEN_DELAY) {
    state.regenTimer += dt;
    if (state.regenTimer >= REGEN_INTERVAL) {
      state.regenTimer = 0;
      healPlayer(1);
    }
  } else {
    state.regenTimer = 0;
  }

  state.damageFlash = Math.max(0, state.damageFlash - dt * 2);
}

export function isOutOfHealth() {
  return !isCreative() && state.health <= 0;
}
