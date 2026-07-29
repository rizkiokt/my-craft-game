// Screen stack: title, pause, sub-screens and the panorama.

import { BLOCKS } from "../constants.js";
import { canvas, deathScreen, pauseModeBtn, screenElements, splashLabel } from "../dom.js";
import { getTileCanvas } from "../icons.js";
import { isCreative } from "../items.js";
import { playerModel } from "../playerModel.js";
import { exitPointerLock, requestPointerLock } from "../pointerLock.js";
import { camera } from "../scene.js";
import { soundEngine } from "../sound.js";
import { state } from "../state.js";
import { getTileIndex } from "../textures.js";
import { buildControlsScreen, buildHelpControls } from "./controlsScreen.js";
import { announceHeldItem, showToast, updateHotbar, updateModeBanner } from "./hud.js";
import { toggleInventory, updateInventoryPanel } from "./inventory.js";
import { syncOptionsScreen } from "./options.js";
import { world } from "../world.js";
/* ------------------------------------------------------------------ *
 * Screens — title, pause, controls, options and help all live in the
 * same stack. "playing" simply means no screen is up.
 * ------------------------------------------------------------------ */

export function showScreen(name) {
  state.screen = name;
  state.running = name === "playing";
  state.mode = name === "playing" ? "playing" : name === "title" ? "menu" : name;

  for (const [key, element] of Object.entries(screenElements)) {
    element.classList.toggle("is-hidden", key !== name);
  }
  document.body.classList.toggle("is-playing", state.running);

  if (!state.running) {
    toggleInventory(false);
    state.keys.clear();
    state.sprintLatched = false;
    exitPointerLock();
  }
  if (name === "title") {
    state.isDead = false;
    deathScreen.classList.add("is-hidden");
  }
  if (name === "controls") {
    buildControlsScreen();
  }
  if (name === "options") {
    syncOptionsScreen();
  }
  if (name === "help") {
    buildHelpControls();
  }
  if (name === "pause") {
    syncPauseScreen();
  }
  updateModeBanner();
}

export function openSubScreen(name) {
  state.screenReturn = state.screen === "controls" || state.screen === "options" || state.screen === "help"
    ? state.screenReturn
    : state.screen;
  showScreen(name);
}

export function closeSubScreen() {
  showScreen(state.screenReturn === "playing" ? "pause" : state.screenReturn || "title");
}

export function setMode(mode) {
  showScreen(mode === "playing" ? "playing" : "title");
}

export function startGame() {
  showScreen("playing");
  canvas.focus();
  soundEngine.resume();
  soundEngine.applyVolume();
  requestPointerLock();
  announceHeldItem();
}

export function resumeGame() {
  showScreen("playing");
  soundEngine.resume();
  requestPointerLock();
}

export function openPauseMenu() {
  if (state.screen !== "playing") {
    return;
  }
  showScreen("pause");
}

export function setGameMode(mode, { announce = true } = {}) {
  state.gameMode = mode === "creative" ? "creative" : "survival";
  if (!isCreative()) {
    state.flying = false;
    state.flyVelocityY = 0;
  }
  updateModeBanner();
  syncPauseScreen();
  syncModePicker();
  updateHotbar();
  if (state.inventoryOpen) {
    updateInventoryPanel();
  }
  if (announce) {
    showToast(`Game mode: ${isCreative() ? "Creative" : "Survival"}`);
  }
  state.saveDirty = true;
}

export function isWorldView() {
  if (state.screen === "playing" || state.screen === "pause") {
    return true;
  }
  if (state.screen === "title") {
    return false;
  }
  return state.screenReturn === "playing" || state.screenReturn === "pause";
}

/** Slow orbit around spawn that plays behind the title screen. */
export function updatePanorama(dt) {
  state.panoramaAngle += dt * 0.045;
  const cx = state.player.x;
  const cz = state.player.z;
  const cy = world.getHeightAt(Math.floor(cx), Math.floor(cz));
  const radius = 21;
  camera.position.set(
    cx + Math.cos(state.panoramaAngle) * radius,
    cy + 13,
    cz + Math.sin(state.panoramaAngle) * radius,
  );
  camera.lookAt(cx, cy + 1.5, cz);
  camera.fov = 72;
  camera.updateProjectionMatrix();
  playerModel.visible = false;
}

/* ------------------------------------------------------------------ *
 * Menu screens
 * ------------------------------------------------------------------ */

export const SPLASHES = [
  "100% procedural!",
  "Now with 9 hotbar slots!",
  "Double-tap W to sprint!",
  "Try creative mode!",
  "Blocks all the way down!",
  "Press F3 for the nerdy bits!",
  "Sneak on the edge!",
  "Also try mining!",
  "No mobs were harmed!",
  "Built with three.js!",
  "Rebind everything!",
  "Fly, you fools!",
];

export function pickSplash() {
  splashLabel.textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
}

/** Paints the title with the game's own grass texture. */
export function applyTitleTexture() {
  try {
    const tile = getTileCanvas(getTileIndex(BLOCKS.grass, "pz"));
    document.documentElement.style.setProperty(
      "--title-texture",
      `url("${tile.toDataURL("image/png")}")`,
    );
  } catch {
    /* falls back to the plain text colour */
  }
}

export function syncModePicker() {
  for (const button of document.querySelectorAll(".mode-option")) {
    button.classList.toggle("is-active", button.dataset.mode === state.gameMode);
  }
}

export function syncPauseScreen() {
  pauseModeBtn.textContent = `Mode: ${isCreative() ? "Creative" : "Survival"}`;
}
