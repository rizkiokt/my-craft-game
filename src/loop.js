// Fixed-step update, render and the animation loop.

import { captureScreenshot } from "./actions.js";
import { chunkMeshes } from "./chunkMesh.js";
import { isOutOfHealth, updateVitals } from "./combat.js";
import {
  BLOCKS,
  BREAK_RESET_TIME,
  GRAVITY,
  SWIM_GRAVITY_SCALE,
  SWIM_JUMP_OUT,
  SWIM_RISE_SPEED,
  SWIM_SINK_SPEED,
} from "./constants.js";
import { updateDrops } from "./drops.js";
import { isActionDown } from "./bindings.js";
import { handleInput } from "./input.js";
import { getTargetKey, resetBreakState, updateBreakVisuals, updateTarget } from "./interaction.js";
import { clamp } from "./math.js";
import { passiveMobs } from "./mobs.js";
import { npcs } from "./npcs.js";
import { updatePortalTravel } from "./portals.js";
import { updateTnt } from "./tnt.js";
import { spawnParticles, updateParticles } from "./particles.js";
import { applyPlayerToCamera, getFootstepBlockType, getSubmersion, handlePlayerDeath, hasCollision, movePlayerAxis, updateSafeAnchor } from "./player.js";
import { saveGame } from "./save.js";
import { camera, renderer, scene, updateLighting } from "./scene.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { updateHotbar, updateHud, updateModeBanner } from "./ui/hud.js";
import { isWorldView, updatePanorama } from "./ui/screens.js";
import { world } from "./world.js";
import { getBiomeAt } from "./worldgen.js";
export function trackFrameRate(dt) {
  if (dt <= 0) {
    return;
  }
  state.frameTimes.push(dt);
  if (state.frameTimes.length > 30) {
    state.frameTimes.shift();
  }
  const total = state.frameTimes.reduce((sum, value) => sum + value, 0);
  state.fps = Math.round(state.frameTimes.length / Math.max(total, 0.0001));
}

export function render(dt = 0) {
  if (isWorldView()) {
    applyPlayerToCamera();
  } else {
    updatePanorama(dt);
  }
  updateLighting();
  renderer.render(scene, camera);
  // Must read the canvas in the same task as the draw: the buffer is not preserved.
  if (state.screenshotRequested) {
    captureScreenshot();
  }
  updateHotbar();
  updateHud();
}

/** True when there is stone rather than sky overhead: a cave, or a cellar. */
function isRoofedOver(px, fromY, pz) {
  for (let y = fromY; y <= fromY + 18; y++) {
    if (world.isSolid(px, y, pz)) {
      return true;
    }
  }
  return false;
}

/** Reads the world once a beat and steers the ambient bed from it. */
let sceneCheck = 0;

function updateSoundScene(dt) {
  sceneCheck -= dt;
  if (sceneCheck <= 0) {
    sceneCheck = 0.5;
    const px = Math.floor(state.player.x);
    const pz = Math.floor(state.player.z);
    const hours = state.dayTime * 24;
    soundEngine.setScene({
      night: hours < 6 || hours > 19,
      // Asked directly rather than read off the light volume, which is only
      // recomputed lazily and can be a frame or two behind.
      enclosed: isRoofedOver(px, Math.floor(state.player.y + 2), pz),
      ember: getBiomeAt(px, pz)?.region.id === "ember",
      menu: !state.running,
      submerged: state.submerged,
    });
  }
  soundEngine.updateAmbience(dt);
  soundEngine.updateMusic(dt);
}

export function update(dt, shouldRender = true) {
  trackFrameRate(dt);
  // Ahead of the running gate: the menus have music too.
  updateSoundScene(dt);
  if (!state.running) {
    state.uiMessageTimer = Math.max(0, state.uiMessageTimer - dt);
    state.heldItemTimer = Math.max(0, state.heldItemTimer - dt);
    if (shouldRender) {
      render(dt);
    }
    return;
  }

  state.elapsed += dt;
  state.dayTime = (state.dayTime + dt * 0.01) % 1;
  state.uiMessageTimer = Math.max(0, state.uiMessageTimer - dt);
  state.heldItemTimer = Math.max(0, state.heldItemTimer - dt);
  state.viewBob = Math.max(0, state.viewBob - dt * 1.8);
  state.saveCooldown = Math.max(0, state.saveCooldown - dt);
  state.breakState.pulse = Math.max(0, state.breakState.pulse - dt * 4.2);
  state.armSwing = Math.max(0, state.armSwing - dt * 4);
  world.updateLoadedChunks(state.player.x, state.player.z);
  chunkMeshes.syncLoadedChunks();
  passiveMobs.syncLoadedChunks();
  if (!state.isDead) {
    handleInput(dt);

    const wasOnGround = state.player.onGround;
    const previousVy = state.player.vy;
    const water = getSubmersion();
    const wasSwimming = state.swimming;
    state.swimming = water.swimming && !state.flying;

    if (state.swimming) {
      // Buoyancy rather than free fall, with a slow sink and a slower rise, so
      // water holds you up instead of dropping you through it.
      state.player.vy -= GRAVITY * SWIM_GRAVITY_SCALE * dt;
      if (isActionDown("jump")) {
        state.player.vy = Math.min(SWIM_RISE_SPEED, state.player.vy + GRAVITY * 0.9 * dt);
      }
      state.player.vy = clamp(state.player.vy, SWIM_SINK_SPEED, SWIM_RISE_SPEED);
      // Breaking the surface with the jump held is a push out onto the bank.
      if (!water.chest && isActionDown("jump")) {
        state.player.vy = Math.max(state.player.vy, SWIM_JUMP_OUT);
      }
      state.fallStartY = null;
    } else if (!state.flying) {
      state.player.vy -= GRAVITY * dt;
    }

    state.submerged = water.head && !state.flying;

    if (state.swimming !== wasSwimming) {
      soundEngine.splash();
      spawnParticles(state.player.x, state.player.y + 0.4, state.player.z, BLOCKS.water, 10, 2.2);
    }

    // Growing a level while in a low tunnel would otherwise wedge you inside
    // the world with every direction blocked.
    let stuck = 0;
    while (hasCollision(state.player.x, state.player.y, state.player.z) && stuck < 4) {
      state.player.y += 0.5;
      state.player.vy = Math.max(0, state.player.vy);
      stuck += 1;
    }

    // A blast shove rides on top of whatever you are doing, because
    // handleInput assigns vx and vz outright every frame and would erase it.
    if (state.knockX !== 0 || state.knockZ !== 0) {
      state.player.vx += state.knockX;
      state.player.vz += state.knockZ;
      const decay = Math.exp(-dt * 3.2);
      state.knockX *= decay;
      state.knockZ *= decay;
      if (Math.hypot(state.knockX, state.knockZ) < 0.05) {
        state.knockX = 0;
        state.knockZ = 0;
      }
    }

    movePlayerAxis("x", state.player.vx * dt);
    movePlayerAxis("z", state.player.vz * dt);
    state.player.onGround = false;
    movePlayerAxis("y", state.player.vy * dt);

    // Touching down ends creative flight, the same as Minecraft.
    if (state.flying && state.player.onGround && state.player.vy <= 0) {
      state.flying = false;
      updateModeBanner();
    }

    if (!wasOnGround && state.player.onGround && previousVy < -6) {
      state.viewBob = 0.18;
      spawnParticles(state.player.x, state.player.y + 0.02, state.player.z, BLOCKS.dirt, 8, 1.1);
      soundEngine.land(previousVy);
    }

    const horizontalSpeed = Math.hypot(state.player.vx, state.player.vz);
    if (state.player.onGround && !state.flying && horizontalSpeed > 0.3 && state.elapsed >= state.nextFootstepAt) {
      soundEngine.footstep(getFootstepBlockType(), state.sprinting);
      state.nextFootstepAt = state.elapsed + (state.sprinting ? 0.23 : state.sneaking ? 0.5 : 0.34);
    }
    if (!state.player.onGround || horizontalSpeed <= 0.15) {
      state.nextFootstepAt = Math.min(state.nextFootstepAt, state.elapsed + 0.08);
    }

    updateSafeAnchor(dt);
    updateVitals(dt);
    updatePortalTravel(dt);
    updateTnt(dt);

    if (isOutOfHealth()) {
      handlePlayerDeath(state.lastDamageCause || "injury");
    }
    if (state.player.y < -20) {
      handlePlayerDeath("the void");
    }
  }

  updateParticles(dt);
  updateDrops(dt);
  passiveMobs.update(dt);
  npcs.update(dt);
  updateTarget();

  if (state.breakState.progress > 0) {
    const activeTargetKey = getTargetKey(state.target);
    const shouldDecay =
      state.breakState.key !== activeTargetKey ||
      state.elapsed - state.breakState.lastHitTime > BREAK_RESET_TIME;
    if (shouldDecay) {
      state.breakState.progress = Math.max(
        0,
        state.breakState.progress - dt * state.breakState.hardness * 1.2,
      );
      if (state.breakState.progress <= 0.01) {
        resetBreakState();
      } else {
        updateBreakVisuals();
      }
    }
  }

  if (state.saveCooldown <= 0 && (state.saveDirty || Math.floor(state.elapsed) % 8 === 0)) {
    saveGame();
  }

  if (shouldRender) {
    render(dt);
  }
}

export function animationLoop(previous) {
  return (timestamp) => {
    const dt = clamp((timestamp - previous) / 1000, 0, 0.033);
    previous = timestamp;
    if (!state.suppressAnimationTick) {
      update(dt, true);
    }
    requestAnimationFrame(animationLoop(previous));
  };
}
