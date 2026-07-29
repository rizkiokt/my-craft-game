// Collision, movement, respawning and the view camera.

import * as THREE from "../node_modules/three/build/three.module.js";
import { chunkMeshes } from "./chunkMesh.js";
import { BASE_LOOK_SENSITIVITY, BLOCKS, CAMERA_HEIGHT, DEFAULT_SPAWN, MAX_BUILD_HEIGHT, MAX_STEP_HEIGHT, MAX_WORLD_Y, MIN_WORLD_Y, MOVE_SPEED, PI, PLAYER_HEIGHT, PLAYER_RADIUS, SNEAK_CAMERA_DROP, THIRD_PERSON_DISTANCE } from "./constants.js";
import { deathLocationText, deathScreen } from "./dom.js";
import { clamp, lerp } from "./math.js";
import { updatePlayerModel } from "./playerModel.js";
import { exitPointerLock, requestPointerLock } from "./pointerLock.js";
import { camera } from "./scene.js";
import { settings } from "./settings.js";
import { resetVitals } from "./combat.js";
import { state } from "./state.js";
import { showScreen } from "./ui/screens.js";
import { getSurfaceData, world } from "./world.js";
export function moveLook(deltaX, deltaY) {
  const sensitivity = BASE_LOOK_SENSITIVITY * clamp(settings.sensitivity / 100, 0.05, 4);
  const pitchSign = settings.invertMouse ? 1 : -1;
  state.player.yaw -= deltaX * sensitivity;
  state.player.pitch += pitchSign * deltaY * sensitivity;
  state.player.pitch = clamp(state.player.pitch, -1.55, 1.55);
}

export function hasCollision(x, y, z) {
  const minX = Math.floor(x - PLAYER_RADIUS);
  const maxX = Math.floor(x + PLAYER_RADIUS);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + PLAYER_HEIGHT - 0.001);
  const minZ = Math.floor(z - PLAYER_RADIUS);
  const maxZ = Math.floor(z + PLAYER_RADIUS);

  for (let by = minY; by <= maxY; by++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      for (let bx = minX; bx <= maxX; bx++) {
        if (world.isSolid(bx, by, bz)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function movePlayerToSpawn() {
  state.player.x = DEFAULT_SPAWN.x;
  state.player.y = world.getHeightAt(Math.floor(DEFAULT_SPAWN.x), Math.floor(DEFAULT_SPAWN.z)) + 1.05;
  state.player.z = DEFAULT_SPAWN.z;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.vz = 0;
  state.player.yaw = DEFAULT_SPAWN.yaw;
  state.player.pitch = DEFAULT_SPAWN.pitch;
  state.player.onGround = false;
  state.nextFootstepAt = state.elapsed + 0.24;
}

export const RESPAWN_SEARCH_RADIUS = 16;
export const RESPAWN_HEADROOM = 20;
export const PIT_WALL_HEIGHT = 2;

/**
 * Topmost non-air block in a column, honouring player edits (unlike
 * getHeightAt, which only knows about generated terrain).
 */
export function getStandableSurfaceY(bx, bz) {
  const start = Math.min(MAX_WORLD_Y, world.getHeightAt(bx, bz) + RESPAWN_HEADROOM);
  for (let y = start; y >= MIN_WORLD_Y; y--) {
    const blockType = world.getBlock(bx, y, bz);
    if (blockType !== BLOCKS.air && blockType !== BLOCKS.water) {
      return y;
    }
  }
  return null;
}

/**
 * A column is only a respawn candidate when the player fits, nothing roofs
 * it over, and it is not the floor of a dug-out shaft.
 */
export function evaluateRespawnColumn(bx, bz) {
  const surfaceY = getStandableSurfaceY(bx, bz);
  if (surfaceY === null || surfaceY + 1 > MAX_BUILD_HEIGHT) {
    return null;
  }
  const feetY = surfaceY + 1;

  // Open to the sky: a roof means a cave or a covered-over hole.
  for (let y = feetY; y <= Math.min(MAX_WORLD_Y, feetY + RESPAWN_HEADROOM); y++) {
    if (world.isSolid(bx, y, bz)) {
      return null;
    }
  }
  if (hasCollision(bx + 0.5, feetY + 0.05, bz + 0.5)) {
    return null;
  }

  // Walled in on nearly every side means we are at the bottom of a pit.
  let walls = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const neighbour = getStandableSurfaceY(bx + dx, bz + dz);
    if (neighbour !== null && neighbour - surfaceY >= PIT_WALL_HEIGHT) {
      walls++;
    }
  }
  if (walls >= 6) {
    return null;
  }

  return { x: bx + 0.5, y: feetY + 0.05, z: bz + 0.5 };
}

/** Squares at Chebyshev distance `radius` from the origin, nearest first. */
export function ringOffsets(radius) {
  if (radius === 0) {
    return [[0, 0]];
  }
  const offsets = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) === radius) {
        offsets.push([dx, dz]);
      }
    }
  }
  offsets.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  return offsets;
}

export function findClosestSafeRespawn() {
  const originX = Math.floor(state.lastSafePosX);
  const originZ = Math.floor(state.lastSafePosZ);

  for (let radius = 0; radius <= RESPAWN_SEARCH_RADIUS; radius++) {
    for (const [dx, dz] of ringOffsets(radius)) {
      const spot = evaluateRespawnColumn(originX + dx, originZ + dz);
      if (spot) {
        return spot;
      }
    }
  }

  // Nothing nearby worked out, so fall back to world spawn.
  const spawnX = Math.floor(DEFAULT_SPAWN.x);
  const spawnZ = Math.floor(DEFAULT_SPAWN.z);
  const spawnSpot = evaluateRespawnColumn(spawnX, spawnZ);
  if (spawnSpot) {
    return spawnSpot;
  }
  return {
    x: DEFAULT_SPAWN.x,
    y: world.getHeightAt(spawnX, spawnZ) + 1.05,
    z: DEFAULT_SPAWN.z,
  };
}

/**
 * Records where a respawn should drop the player. Only open ground counts,
 * so dying after digging down never sends you back into the same shaft.
 */
export function updateSafeAnchor(dt) {
  state.safeAnchorCooldown -= dt;
  if (state.safeAnchorCooldown > 0 || !state.player.onGround || state.flying) {
    return;
  }
  state.safeAnchorCooldown = 0.5;
  const bx = Math.floor(state.player.x);
  const bz = Math.floor(state.player.z);
  if (evaluateRespawnColumn(bx, bz)) {
    state.lastSafePosX = state.player.x;
    state.lastSafePosZ = state.player.z;
  }
}

export function handlePlayerDeath(cause = "") {
  if (state.isDead) {
    return;
  }
  state.lastDamageCause = cause;
  state.isDead = true;
  state.flying = false;
  state.flyVelocityY = 0;
  state.sprintLatched = false;
  state.keys.clear();
  exitPointerLock();
  const pos = findClosestSafeRespawn();
  deathLocationText.textContent =
    `${cause ? `Killed by ${cause}. ` : ""}Nearest safe ground at (${Math.round(pos.x)}, ${Math.round(pos.z)})`;
  deathScreen.classList.remove("is-hidden");
}

/**
 * Puts the player down on solid ground at a place, loading the chunks there
 * first. Used by portals, and by scripted runs that need to be somewhere.
 */
export function teleportTo(x, z, y = null) {
  world.updateLoadedChunks(x, z);
  state.player.x = x;
  state.player.z = z;
  state.player.y = y != null ? y + 0.05 : getSurfaceData(x, z).y + 0.05;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.vz = 0;
  state.player.onGround = false;
  state.fallStartY = null;

  // Never leave the player standing inside anything.
  let attempts = 0;
  while (hasCollision(state.player.x, state.player.y, state.player.z) && attempts < 48) {
    state.player.y += 1;
    attempts += 1;
  }
  state.saveDirty = true;
  return { x: state.player.x, y: state.player.y, z: state.player.z };
}

export function respawnPlayer() {
  const pos = findClosestSafeRespawn();
  state.player.x = pos.x;
  state.player.y = pos.y;
  state.player.z = pos.z;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.vz = 0;
  state.player.yaw = DEFAULT_SPAWN.yaw;
  state.player.pitch = DEFAULT_SPAWN.pitch;
  state.player.onGround = false;
  state.nextFootstepAt = state.elapsed + 0.24;
  state.isDead = false;
  state.flying = false;
  state.flyVelocityY = 0;
  state.safeAnchorCooldown = 0;
  resetVitals();

  // Last resort: never leave the player embedded in geometry.
  let attempts = 0;
  while (hasCollision(state.player.x, state.player.y, state.player.z) && attempts < 32) {
    state.player.y += 1;
    attempts += 1;
  }

  deathScreen.classList.add("is-hidden");
  if (state.screen !== "playing") {
    showScreen("playing");
  }
  requestPointerLock();
}

export function ensureValidPlayerPosition() {
  if (hasCollision(state.player.x, state.player.y, state.player.z)) {
    movePlayerToSpawn();
  }
}

export function getFootstepBlockType() {
  return world.getBlock(
    Math.floor(state.player.x),
    Math.floor(state.player.y - 0.08),
    Math.floor(state.player.z),
  );
}

export function tryStepUp(nextX, currentY, nextZ) {
  const steppedY = currentY + MAX_STEP_HEIGHT;
  if (!hasCollision(nextX, steppedY, nextZ) && hasCollision(nextX, steppedY - 0.1, nextZ)) {
    return steppedY;
  }
  return null;
}

/** True when any part of the player's footprint has a block under it. */
export function hasGroundUnder(x, y, z) {
  const footY = Math.floor(y - 0.06);
  const corners = [
    [-PLAYER_RADIUS, -PLAYER_RADIUS],
    [PLAYER_RADIUS, -PLAYER_RADIUS],
    [-PLAYER_RADIUS, PLAYER_RADIUS],
    [PLAYER_RADIUS, PLAYER_RADIUS],
  ];
  for (const [dx, dz] of corners) {
    if (world.isSolid(Math.floor(x + dx), footY, Math.floor(z + dz))) {
      return true;
    }
  }
  return false;
}

export function movePlayerAxis(axis, amount) {
  if (amount === 0) {
    return;
  }

  const player = state.player;
  const next = { x: player.x, y: player.y, z: player.z };
  next[axis] += amount;

  // Sneaking refuses to walk off a ledge, exactly like Minecraft.
  if (
    axis !== "y" &&
    state.sneaking &&
    !state.flying &&
    player.onGround &&
    hasGroundUnder(player.x, player.y, player.z) &&
    !hasGroundUnder(next.x, next.y, next.z)
  ) {
    return;
  }

  if (!hasCollision(next.x, next.y, next.z)) {
    player[axis] = next[axis];
    return;
  }

  if (axis !== "y" && player.onGround) {
    const steppedY = tryStepUp(
      axis === "x" ? next.x : player.x,
      player.y,
      axis === "z" ? next.z : player.z,
    );
    if (steppedY !== null) {
      player.y = steppedY;
      player[axis] = next[axis];
      player.onGround = false;
      return;
    }
  }

  if (axis === "y" && amount < 0) {
    player.onGround = true;
  }
  if (axis === "x") {
    player.vx = 0;
  } else if (axis === "y") {
    player.vy = 0;
  } else {
    player.vz = 0;
  }
}

export const eyePosition = new THREE.Vector3();
export const lookDirection = new THREE.Vector3();
export const cameraOffsetRay = new THREE.Raycaster();

/** Feet-to-eye height, shrunk while sneaking. */
export function getEyeHeight() {
  return CAMERA_HEIGHT - (state.sneaking && !state.flying ? SNEAK_CAMERA_DROP : 0);
}

export function getEyePosition(target) {
  return target.set(
    state.player.x,
    state.player.y + getEyeHeight() + state.viewBob,
    state.player.z,
  );
}

export function getLookDirection(target, yaw = state.player.yaw, pitch = state.player.pitch) {
  return target.set(
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ).normalize();
}

export function applyPlayerToCamera() {
  const player = state.player;
  const horizontalSpeed = Math.hypot(player.vx, player.vz);
  const bobbing = settings.viewBobbing && player.onGround && !state.flying;
  const bobStrength = bobbing ? clamp(horizontalSpeed / (MOVE_SPEED * 1.65), 0, 1) : 0;
  const bobX = Math.sin(state.stepPhase) * 0.05 * bobStrength;
  const bobY = Math.abs(Math.cos(state.stepPhase * 0.5)) * 0.08 * bobStrength;
  const sideTilt = settings.viewBobbing ? clamp(player.vx * 0.012, -0.04, 0.04) : 0;

  // The interaction ray always starts at the eye, whatever the camera does.
  getEyePosition(eyePosition);
  getLookDirection(lookDirection);

  const frontView = state.perspective === 2;
  const viewYaw = frontView ? player.yaw + PI : player.yaw;
  const viewPitch = frontView ? -player.pitch : player.pitch;

  camera.rotation.y = viewYaw;
  camera.rotation.x = viewPitch;
  camera.rotation.z = sideTilt;

  state.cameraDistance = 0;
  if (state.perspective === 0) {
    camera.position.set(
      eyePosition.x + bobX,
      eyePosition.y - bobY,
      eyePosition.z,
    );
  } else {
    // Pull the camera back along the view axis, stopping short of walls.
    const back = getLookDirection(new THREE.Vector3(), viewYaw, viewPitch).negate();
    let distance = THIRD_PERSON_DISTANCE;
    cameraOffsetRay.set(eyePosition, back);
    cameraOffsetRay.far = THIRD_PERSON_DISTANCE;
    const blocked = cameraOffsetRay.intersectObjects(chunkMeshes.getMeshes(), false)[0];
    if (blocked) {
      distance = Math.max(0.6, blocked.distance - 0.35);
    }
    camera.position.copy(eyePosition).addScaledVector(back, distance);
    // A wall can squeeze the camera into the avatar; the model hides instead.
    state.cameraDistance = distance;
  }

  const targetFov = settings.fov
    + (state.sprinting ? 5.5 : 0)
    + (state.flying && horizontalSpeed > MOVE_SPEED ? 4 : 0)
    + bobStrength * 1.8;
  camera.fov = lerp(camera.fov, targetFov, 0.14);
  camera.updateProjectionMatrix();
  updatePlayerModel();
}
