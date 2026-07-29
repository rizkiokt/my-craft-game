// Keyboard and mouse routing plus per-frame input polling.

import { dispatchPress, handleEscape, scrollHotbar } from "./actions.js";
import { canonicalToken, isActionDown, mouseToken } from "./bindings.js";
import { FLY_BOOST_MULTIPLIER, FLY_SPEED, FLY_VERTICAL_SPEED, JUMP_SPEED, MOVE_SPEED, SNEAK_MULTIPLIER, SPRINT_MULTIPLIER, SWIM_MOVE_SCALE } from "./constants.js";
import { canvas } from "./dom.js";
import { getMoveSpeed } from "./growth.js";
import { interact } from "./interaction.js";
import { clamp } from "./math.js";
import { moveLook } from "./player.js";
import { requestPointerLock, updatePointerState } from "./pointerLock.js";
import { saveGame } from "./save.js";
import { resizeRenderer } from "./scene.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { handleBindingCapture } from "./ui/controlsScreen.js";
import { showToast } from "./ui/hud.js";
import { moveCursorStack } from "./ui/inventory.js";
import { syncOptionsScreen } from "./ui/options.js";
/* ------------------------------------------------------------------ *
 * Per-frame input polling
 * ------------------------------------------------------------------ */

export function handleInput(dt) {
  const player = state.player;
  if (state.inventoryOpen || !state.running || state.isDead) {
    player.vx = 0;
    player.vz = 0;
    state.sneaking = false;
    state.sprinting = false;
    return;
  }

  const forwardIntent = (isActionDown("forward") ? 1 : 0) + (isActionDown("back") ? -1 : 0);
  const strafeIntent = (isActionDown("right") ? 1 : 0) + (isActionDown("left") ? -1 : 0);

  // Arrow keys stay available as a look fallback when there is no mouse.
  if (state.keys.has("ArrowLeft")) {
    player.yaw += dt * 1.9;
  }
  if (state.keys.has("ArrowRight")) {
    player.yaw -= dt * 1.9;
  }
  if (state.keys.has("ArrowUp")) {
    player.pitch = clamp(player.pitch + dt * 1.55, -1.55, 1.55);
  }
  if (state.keys.has("ArrowDown")) {
    player.pitch = clamp(player.pitch - dt * 1.55, -1.55, 1.55);
  }

  state.sneaking = isActionDown("sneak");
  if (state.sneaking || forwardIntent <= 0) {
    state.sprintLatched = false;
  }
  const sprintHeld = isActionDown("sprint");
  state.sprinting = forwardIntent > 0
    && !state.sneaking
    && (state.sprintLatched || sprintHeld);

  const moveX = -Math.sin(player.yaw);
  const moveZ = -Math.cos(player.yaw);
  const strafeX = Math.cos(player.yaw);
  const strafeZ = -Math.sin(player.yaw);
  let wishX = moveX * forwardIntent + strafeX * strafeIntent;
  let wishZ = moveZ * forwardIntent + strafeZ * strafeIntent;

  const length = Math.hypot(wishX, wishZ);
  if (length > 0.001) {
    wishX /= length;
    wishZ /= length;
    state.stepPhase += dt * (state.sprinting ? 16 : state.sneaking ? 7 : 11);
  }

  let speed = getMoveSpeed();
  if (state.swimming && !state.flying) {
    speed = getMoveSpeed() * SWIM_MOVE_SCALE;
  } else if (state.flying) {
    speed = FLY_SPEED * (sprintHeld || state.sprintLatched ? FLY_BOOST_MULTIPLIER : 1);
  } else if (state.sneaking) {
    speed = getMoveSpeed() * SNEAK_MULTIPLIER;
  } else if (state.sprinting) {
    speed = getMoveSpeed() * SPRINT_MULTIPLIER;
  }
  player.vx = wishX * speed;
  player.vz = wishZ * speed;

  if (state.flying) {
    const vertical = (isActionDown("jump") ? 1 : 0) + (isActionDown("sneak") ? -1 : 0);
    player.vy = vertical * FLY_VERTICAL_SPEED * (sprintHeld ? 1.6 : 1);
  } else if (isActionDown("jump") && player.onGround && !state.swimming) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
    soundEngine.jump();
  }

  if (state.elapsed < state.suppressInteractUntil) {
    return;
  }
  if (isActionDown("attack")) {
    interact(true);
  }
  if (isActionDown("use")) {
    interact(false, state.usePressed);
  } else {
    // The press edge lives until the button comes back up, so a click that
    // lands while the crosshair is drifting is not silently swallowed.
    state.usePressed = false;
  }
}

/* ------------------------------------------------------------------ *
 * Input routing
 * ------------------------------------------------------------------ */

/** Keys the browser would otherwise steal while the world has focus. */
export const ALWAYS_PREVENT = new Set(["F1", "F3", "F5", "F11"]);
export const PLAYING_PREVENT = new Set([
  "Space", "Tab", "F2", "F4",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
  "Digit6", "Digit7", "Digit8", "Digit9",
]);

/** Attaches this module's DOM listeners. Called once from main.js. */
export function installInputHandlers() {
  window.addEventListener("keydown", (event) => {
    if (state.awaitingBind) {
      event.preventDefault();
      handleBindingCapture(event.code);
      return;
    }
    if (event.target instanceof HTMLInputElement) {
      return;
    }

    if (state.running) {
      soundEngine.resume();
    }

    if (ALWAYS_PREVENT.has(event.code) || (state.running && PLAYING_PREVENT.has(event.code))) {
      event.preventDefault();
    }

    const token = canonicalToken(event.code);

    if (!event.repeat) {
      if (event.code === "Escape") {
        handleEscape();
        return;
      }
      dispatchPress(token, event);
    }

    if (state.running && !state.inventoryOpen) {
      state.keys.add(token);
    }
  });

  window.addEventListener("keyup", (event) => {
    state.keys.delete(canonicalToken(event.code));
    state.keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    state.keys.clear();
    state.sprintLatched = false;
    state.dragLook = false;
    state.dragAnchor = null;
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  canvas.addEventListener("mousedown", (event) => {
    if (state.awaitingBind) {
      event.preventDefault();
      handleBindingCapture(mouseToken(event.button));
      return;
    }
    if (!state.running || state.inventoryOpen || state.isDead) {
      return;
    }
    if (event.button === 1) {
      event.preventDefault();
    }
    soundEngine.resume();

    if (!state.pointerLocked) {
      // The click that captures the mouse should not also swing the pickaxe.
      requestPointerLock();
      state.suppressInteractUntil = state.elapsed + 0.22;
      state.dragLook = true;
      state.dragAnchor = { x: event.clientX, y: event.clientY };
    }

    const token = mouseToken(event.button);
    state.keys.add(token);
    dispatchPress(token, event);
  });

  document.addEventListener("mousedown", (event) => {
    if (!state.awaitingBind) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (target === canvas) {
      return;
    }
    if (target?.closest("button")) {
      // Clicking any other control cancels instead of binding that click.
      state.awaitingBind = null;
      return;
    }
    event.preventDefault();
    handleBindingCapture(mouseToken(event.button));
  });

  window.addEventListener("mouseup", (event) => {
    state.keys.delete(mouseToken(event.button));
    state.dragLook = false;
    state.dragAnchor = null;
  });

  window.addEventListener("mousemove", (event) => {
    if (state.inventoryOpen) {
      moveCursorStack(event.clientX, event.clientY);
      return;
    }
    if (!state.running || state.isDead) {
      return;
    }
    if (state.pointerLocked) {
      moveLook(event.movementX, event.movementY);
      return;
    }
    if (state.dragLook && state.dragAnchor) {
      moveLook(event.clientX - state.dragAnchor.x, event.clientY - state.dragAnchor.y);
      state.dragAnchor = { x: event.clientX, y: event.clientY };
    }
  });

  window.addEventListener("wheel", (event) => {
    if (!state.running || state.inventoryOpen || state.isDead) {
      return;
    }
    event.preventDefault();
    scrollHotbar(event.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  document.addEventListener("pointerlockchange", updatePointerState);
  document.addEventListener("pointerlockerror", () => {
    state.pointerLockUnavailable = true;
    showToast("Mouse look fallback: hold and drag on the canvas");
  });
  document.addEventListener("fullscreenchange", syncOptionsScreen);
  window.addEventListener("resize", resizeRenderer);

  // Browsers will not start audio without a gesture, and the title screen has
  // music, so the very first click anywhere wakes it up.
  document.addEventListener("pointerdown", () => soundEngine.resume());

  window.addEventListener("beforeunload", () => {
    saveGame(true);
  });
}

