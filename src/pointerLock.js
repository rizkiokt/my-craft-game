// Pointer lock lifecycle and the unexpected-unlock hook.

import { canvas } from "./dom.js";
import { state } from "./state.js";

/**
 * Losing the lock unexpectedly (Escape while locked, alt-tab) should pause the
 * game, but this module must not depend on the screen stack to say so, so the
 * composition root registers the handler instead.
 */
let unexpectedUnlockHandler = () => {};

export function onUnexpectedUnlock(handler) {
  unexpectedUnlockHandler = handler;
}

export function requestPointerLock() {
  if (state.inventoryOpen || !state.running || state.pointerLocked || state.isDead) {
    return;
  }
  if (!canvas.requestPointerLock) {
    state.pointerLockUnavailable = true;
    return;
  }
  try {
    const lockRequest = canvas.requestPointerLock();
    lockRequest?.catch?.(() => {
      state.pointerLockUnavailable = true;
    });
  } catch {
    state.pointerLockUnavailable = true;
  }
}

export function exitPointerLock() {
  if (document.pointerLockElement) {
    state.intentionalUnlock = true;
    document.exitPointerLock();
  }
}

export function updatePointerState() {
  const locked = document.pointerLockElement === canvas;
  state.pointerLocked = locked;
  document.body.classList.toggle("is-locked", locked);
  if (locked) {
    state.dragLook = false;
    state.dragAnchor = null;
    state.pointerLockUnavailable = false;
    return;
  }
  if (state.intentionalUnlock) {
    state.intentionalUnlock = false;
    return;
  }
  // Esc while locked never reaches keydown, so the unlock itself pauses.
  if (state.screen === "playing" && !state.inventoryOpen && !state.isDead) {
    unexpectedUnlockHandler();
  }
}
