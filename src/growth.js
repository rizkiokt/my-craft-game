// How big the player is and how much they can take, both of which grow with
// their level.
//
// Everything about the body is derived here rather than read from the constants
// directly, so nothing can be left behind at the old size. Two curves, not one:
// height doubles by level 100, while hearts climb faster and further, reaching
// fifty by level 80.

import {
  BASE_HEARTS,
  CAMERA_HEIGHT,
  GROWTH_MAX_LEVEL,
  HEARTS_PER_LEVEL,
  MAX_HEARTS,
  INTERACTION_RANGE,
  MAX_STEP_HEIGHT,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  XP_PER_LEVEL,
} from "./constants.js";
import { clamp } from "./math.js";
import { state } from "./state.js";

/**
 * The level is recomputed from XP rather than imported from enchanting.js, so
 * this module can sit below it and be usable from anywhere.
 */
export function getPlayerLevel() {
  return Math.floor(state.xp / XP_PER_LEVEL);
}

/** 1 at level 0, rising to 2 at `GROWTH_MAX_LEVEL` and stopping there. */
export function getGrowth() {
  return 1 + clamp(getPlayerLevel() / GROWTH_MAX_LEVEL, 0, 1);
}

/**
 * Hearts on their own, quicker curve: ten to start, twenty by level 20, and on
 * up to fifty. Deliberately not tied to `getGrowth()` — height tops out at
 * level 100 and hearts at level 80.
 */
export function getMaxHearts() {
  return clamp(BASE_HEARTS + getPlayerLevel() * HEARTS_PER_LEVEL, BASE_HEARTS, MAX_HEARTS);
}

export function getMaxHealth() {
  return Math.round(getMaxHearts() * 2);
}

export function getBodyHeight() {
  return PLAYER_HEIGHT * getGrowth();
}

export function getBodyRadius() {
  return PLAYER_RADIUS * getGrowth();
}

export function getCameraHeight() {
  return CAMERA_HEIGHT * getGrowth();
}

/** Longer legs step over bigger ledges. */
export function getStepHeight() {
  return MAX_STEP_HEIGHT * getGrowth();
}

/** Longer arms reach further, which also keeps your own feet in range. */
export function getReach() {
  return INTERACTION_RANGE * getGrowth();
}

/**
 * Bigger strides, but not proportionally: doubling the walk speed would make
 * the world feel small, and leaving it alone makes a giant feel like they are
 * wading.
 */
export function getMoveSpeed() {
  return MOVE_SPEED * Math.sqrt(getGrowth());
}
