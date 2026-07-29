// How big the player is, which grows with their level.
//
// Everything about the body is derived here rather than read from the
// constants directly, so one factor moves hearts, height, reach and the avatar
// together and nothing can be left behind at the old size.

import {
  CAMERA_HEIGHT,
  GROWTH_MAX_LEVEL,
  INTERACTION_RANGE,
  MAX_HEALTH,
  MAX_STEP_HEIGHT,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  XP_PER_LEVEL,
} from "./constants.js";
import { clamp } from "./math.js";
import { state } from "./state.js";

/**
 * 1 at level 0, rising to 2 at `GROWTH_MAX_LEVEL` and stopping there. The level
 * is recomputed from XP rather than imported, so this can sit below
 * enchanting.js and be usable from anywhere.
 */
export function getGrowth() {
  const level = Math.floor(state.xp / XP_PER_LEVEL);
  return 1 + clamp(level / GROWTH_MAX_LEVEL, 0, 1);
}

/** Hearts double over the same climb: 20 at level 0, 40 at level 100. */
export function getMaxHealth() {
  return Math.round(MAX_HEALTH * getGrowth());
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
