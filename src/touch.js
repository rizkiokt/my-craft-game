// On-screen controls for phones and tablets.
//
// Every button here presses and releases the same token the keyboard would,
// so rebinding, sprint latching and double-tap flight keep working without a
// second input path to maintain. Nothing in this module knows what an action
// actually does.

import { dispatchPress, handleEscape, selectHotbarSlot } from "./actions.js";
import { bindings } from "./bindings.js";
import { canvas, hotbar, touchLayer, touchStick, touchThumb } from "./dom.js";
import { moveLook } from "./player.js";
import { settings } from "./settings.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";

/** Pixels from the middle of the pad out to full tilt. */
const STICK_RANGE = 58;
/** Wobble around the middle that should not move you. */
const DEAD_ZONE = 0.3;
/** Push it right to the edge and you break into a run. */
const SPRINT_EDGE = 0.9;
/** The left of the screen drives the stick, the rest looks around. */
const STICK_ZONE = 0.42;
/** A thumb covers far less ground than a mouse, so drags count for more. */
const LOOK_SCALE = 2.2;

const stick = { id: null, x: 0, y: 0 };
const look = { id: null, x: 0, y: 0 };
const held = new Set();

/* ------------------------------------------------------------------ *
 * Whether to show them at all
 * ------------------------------------------------------------------ */

export function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

export function touchControlsWanted() {
  if (settings.touchControls === "on") {
    return true;
  }
  if (settings.touchControls === "off") {
    return false;
  }
  return isTouchDevice();
}

/**
 * Flips the body class the stylesheet keys off. Screens and the HUD are all
 * CSS from here, so nothing above this module needs to know about touch.
 */
export function syncTouchControls() {
  const wanted = touchControlsWanted();
  if (!wanted) {
    releaseAll();
  }
  document.body.classList.toggle("is-touch", wanted);
}

/* ------------------------------------------------------------------ *
 * Pressing tokens on the player's behalf
 * ------------------------------------------------------------------ */

function press(action) {
  const token = bindings[action];
  if (!token) {
    return;
  }
  state.keys.add(token);
  held.add(action);
  dispatchPress(token);
}

function release(action) {
  const token = bindings[action];
  if (token) {
    state.keys.delete(token);
  }
  held.delete(action);
}

function releaseAll() {
  for (const action of [...held]) {
    release(action);
  }
  state.sprintLatched = false;
  stick.id = null;
  look.id = null;
  resetStick();
}

/** Touch input is for the world only; menus and the bag are plain HTML. */
function blocked() {
  return !state.running || state.inventoryOpen || state.isDead;
}

/* ------------------------------------------------------------------ *
 * The movement stick
 * ------------------------------------------------------------------ */

function resetStick() {
  touchStick.classList.remove("is-active");
  touchThumb.style.transform = "translate(-50%, -50%)";
  for (const action of ["forward", "back", "left", "right"]) {
    release(action);
  }
}

/** The pad appears wherever the thumb lands, rather than in a fixed corner. */
function startStick(touch) {
  stick.id = touch.identifier;
  stick.x = touch.clientX;
  stick.y = touch.clientY;
  touchStick.style.left = `${touch.clientX}px`;
  touchStick.style.top = `${touch.clientY}px`;
  touchStick.classList.add("is-active");
  moveStick(touch);
}

function moveStick(touch) {
  const nx = (touch.clientX - stick.x) / STICK_RANGE;
  const ny = (touch.clientY - stick.y) / STICK_RANGE;
  const length = Math.hypot(nx, ny);
  const scale = length > 1 ? 1 / length : 1;
  const tiltX = nx * scale;
  const tiltY = ny * scale;

  touchThumb.style.transform =
    `translate(calc(-50% + ${tiltX * STICK_RANGE}px), calc(-50% + ${tiltY * STICK_RANGE}px))`;

  setHeld("forward", tiltY < -DEAD_ZONE);
  setHeld("back", tiltY > DEAD_ZONE);
  setHeld("left", tiltX < -DEAD_ZONE);
  setHeld("right", tiltX > DEAD_ZONE);

  // Held at the edge means run. handleInput drops the latch again as soon as
  // you stop pushing forwards, exactly as a double-tap sprint would.
  if (tiltY < -DEAD_ZONE && Math.min(length, 1) >= SPRINT_EDGE) {
    state.sprintLatched = true;
  }
}

function setHeld(action, wanted) {
  if (wanted === held.has(action)) {
    return;
  }
  if (wanted) {
    press(action);
  } else {
    release(action);
  }
}

/* ------------------------------------------------------------------ *
 * Looking around
 * ------------------------------------------------------------------ */

function startLook(touch) {
  look.id = touch.identifier;
  look.x = touch.clientX;
  look.y = touch.clientY;
}

function moveLookTouch(touch) {
  moveLook(
    (touch.clientX - look.x) * LOOK_SCALE,
    (touch.clientY - look.y) * LOOK_SCALE,
  );
  look.x = touch.clientX;
  look.y = touch.clientY;
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

/** Attaches this module's DOM listeners. Called once from main.js. */
export function installTouchHandlers() {
  // Hold-style buttons: down presses the token, up releases it.
  for (const button of touchLayer.querySelectorAll("[data-hold]")) {
    const action = button.dataset.hold;
    button.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (blocked()) {
        return;
      }
      soundEngine.resume();
      button.classList.add("is-down");
      press(action);
    }, { passive: false });

    const lift = (event) => {
      event.preventDefault();
      button.classList.remove("is-down");
      release(action);
    };
    button.addEventListener("touchend", lift, { passive: false });
    button.addEventListener("touchcancel", lift, { passive: false });
  }

  // Tap-style buttons fire once and let go straight away.
  for (const button of touchLayer.querySelectorAll("[data-press]")) {
    const action = button.dataset.press;
    button.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (!state.running || state.isDead) {
        return;
      }
      soundEngine.resume();
      press(action);
      release(action);
    }, { passive: false });
  }

  for (const button of touchLayer.querySelectorAll("[data-menu]")) {
    button.addEventListener("touchstart", (event) => {
      event.preventDefault();
      releaseAll();
      handleEscape();
    }, { passive: false });
  }

  // The hotbar is only a display with a mouse, but on a phone it is the
  // fastest way to change what you are holding.
  hotbar.addEventListener("touchstart", (event) => {
    if (blocked()) {
      return;
    }
    const slot = event.target instanceof Element ? event.target.closest(".hotbar-slot") : null;
    if (!slot) {
      return;
    }
    event.preventDefault();
    selectHotbarSlot(Number(slot.dataset.slot));
  }, { passive: false });

  // Anything not on a control falls through to the canvas: the left side
  // drives the stick, the rest turns your head.
  canvas.addEventListener("touchstart", (event) => {
    if (!touchControlsWanted() || blocked()) {
      return;
    }
    event.preventDefault();
    soundEngine.resume();
    for (const touch of event.changedTouches) {
      if (stick.id === null && touch.clientX < window.innerWidth * STICK_ZONE) {
        startStick(touch);
      } else if (look.id === null) {
        startLook(touch);
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (event) => {
    if (!touchControlsWanted() || blocked()) {
      return;
    }
    event.preventDefault();
    for (const touch of event.changedTouches) {
      if (touch.identifier === stick.id) {
        moveStick(touch);
      } else if (touch.identifier === look.id) {
        moveLookTouch(touch);
      }
    }
  }, { passive: false });

  const endTouch = (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === stick.id) {
        stick.id = null;
        resetStick();
      } else if (touch.identifier === look.id) {
        look.id = null;
      }
    }
  };
  canvas.addEventListener("touchend", endTouch);
  canvas.addEventListener("touchcancel", endTouch);

  // Leaving the world with a finger down would otherwise walk you forever.
  window.addEventListener("blur", releaseAll);
  window.addEventListener("orientationchange", releaseAll);
}
