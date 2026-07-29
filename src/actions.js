// One-shot actions fired by a key press or mouse button.

import * as THREE from "../node_modules/three/build/three.module.js";
import { actionsForToken } from "./bindings.js";
import { BLOCK_NAMES, DOUBLE_TAP_WINDOW, HOTBAR_SIZE } from "./constants.js";
import { canvas } from "./dom.js";
import { spawnDrop } from "./drops.js";
import { toggleFullscreen } from "./fullscreen.js";
import { resetBreakState } from "./interaction.js";
import { consumeItem, getItemCount, getSelectedItem, isCreative, isPlaceableItem } from "./items.js";
import { getEyeHeight, getLookDirection } from "./player.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { announceHeldItem, showToast, updateHotbar, updateModeBanner } from "./ui/hud.js";
import { toggleInventory, updateInventoryPanel } from "./ui/inventory.js";
import { closeSubScreen, openPauseMenu, resumeGame, setGameMode } from "./ui/screens.js";
export function selectHotbarSlot(index) {
  if (index < 0 || index >= HOTBAR_SIZE || index === state.activeSlot) {
    return;
  }
  state.activeSlot = index;
  const itemId = getSelectedItem();
  if (isPlaceableItem(itemId)) {
    state.selectedBlock = itemId;
  }
  resetBreakState();
  announceHeldItem();
  soundEngine.select();
  updateHotbar();
  state.saveDirty = true;
}

export function scrollHotbar(direction) {
  const next = (state.activeSlot + direction + HOTBAR_SIZE) % HOTBAR_SIZE;
  selectHotbarSlot(next);
}

/** Middle click: put the block you are looking at into your hand. */
export function pickBlock() {
  if (!state.target) {
    return;
  }
  const blockType = state.target.block.type;
  if (!isPlaceableItem(blockType)) {
    showToast(`Cannot pick ${BLOCK_NAMES[blockType]}`);
    return;
  }
  const existing = state.hotbarSlots.indexOf(blockType);
  if (existing !== -1) {
    selectHotbarSlot(existing);
    return;
  }
  if (getItemCount(blockType) <= 0) {
    showToast(`No ${BLOCK_NAMES[blockType]} in bag`);
    return;
  }
  state.hotbarSlots[state.activeSlot] = blockType;
  state.selectedBlock = blockType;
  announceHeldItem();
  soundEngine.select();
  updateHotbar();
  state.saveDirty = true;
}

/** Drop key: throws the held item into the world where it can be re-collected. */
export function dropHeldItem(wholeStack = false) {
  const itemId = getSelectedItem();
  if (itemId == null) {
    return;
  }
  const available = getItemCount(itemId);
  if (available <= 0) {
    return;
  }
  const amount = isCreative() ? 1 : Math.min(available, wholeStack ? available : 1);
  consumeItem(itemId, amount);

  const player = state.player;
  const dir = getLookDirection(new THREE.Vector3());
  for (let i = 0; i < Math.min(amount, 8); i++) {
    const spread = (Math.random() - 0.5) * 0.6;
    spawnDrop(
      itemId,
      player.x + dir.x * 0.5,
      player.y + getEyeHeight() - 0.35,
      player.z + dir.z * 0.5,
      dir.x * 3.4 + spread,
      dir.y * 3.4 + 1.8,
      dir.z * 3.4 + spread,
    );
  }
  showToast(`Dropped ${amount} ${BLOCK_NAMES[itemId]}`);
  soundEngine.ui(false);
  state.saveDirty = true;
  updateHotbar();
  updateInventoryPanel();
}

export function cyclePerspective() {
  state.perspective = (state.perspective + 1) % 3;
  const names = ["First Person", "Third Person Back", "Third Person Front"];
  showToast(names[state.perspective]);
}

/**
 * The drawing buffer is not preserved, so the capture has to happen inside the
 * render pass. The loop honours this flag on its next frame.
 */
export function takeScreenshot() {
  state.screenshotRequested = true;
}

export function captureScreenshot() {
  state.screenshotRequested = false;
  try {
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `mycraft-${Math.floor(state.elapsed * 1000)}.png`;
    link.click();
    showToast("Screenshot saved");
  } catch {
    showToast("Screenshot failed");
  }
}

export function toggleFlight() {
  if (!isCreative()) {
    return;
  }
  state.flying = !state.flying;
  state.flyVelocityY = 0;
  state.player.vy = 0;
  if (state.flying) {
    state.player.onGround = false;
  }
  showToast(state.flying ? "Flying enabled" : "Flying disabled");
  updateModeBanner();
}

/** Press actions that stay available outside the world. */
export const GLOBAL_ACTIONS = new Set(["fullscreen", "screenshot"]);

export function handleEscape() {
  if (state.inventoryOpen) {
    toggleInventory(false);
    return;
  }
  switch (state.screen) {
    case "playing":
      if (!state.isDead) {
        openPauseMenu();
      }
      break;
    case "pause":
      resumeGame();
      break;
    case "controls":
    case "options":
    case "help":
    case "worlds":
    case "portal":
      closeSubScreen();
      break;
    default:
      break;
  }
}

export function handleActionPress(action, event) {
  if (action === "fullscreen") {
    toggleFullscreen();
    return;
  }
  if (action === "screenshot") {
    takeScreenshot();
    return;
  }
  if (!state.running) {
    return;
  }

  const inWorld = !state.inventoryOpen && !state.isDead;

  switch (action) {
    case "inventory":
      if (!state.isDead) {
        toggleInventory();
      }
      return;
    case "toggleHud":
      state.hudVisible = !state.hudVisible;
      return;
    case "debug":
      state.debugVisible = !state.debugVisible;
      updateModeBanner();
      return;
    case "perspective":
      cyclePerspective();
      return;
    case "gameMode":
      setGameMode(isCreative() ? "survival" : "creative");
      return;
    case "drop":
      if (inWorld) {
        dropHeldItem(Boolean(event?.ctrlKey));
      }
      return;
    case "pick":
      if (inWorld) {
        pickBlock();
      }
      return;
    case "use":
      // Marks the press edge so held right-click cannot re-trigger one-shot
      // interactions such as telling a cat to sit.
      state.usePressed = true;
      return;
    case "jump":
      if (!inWorld) {
        return;
      }
      // Double-tap jump toggles creative flight.
      if (isCreative() && state.elapsed - state.lastJumpTapTime < DOUBLE_TAP_WINDOW) {
        toggleFlight();
        state.lastJumpTapTime = -99;
      } else {
        state.lastJumpTapTime = state.elapsed;
      }
      return;
    case "forward":
      if (!inWorld) {
        return;
      }
      // Double-tap forward starts a sprint that holds until you let go.
      if (state.elapsed - state.lastForwardTapTime < DOUBLE_TAP_WINDOW) {
        state.sprintLatched = true;
      }
      state.lastForwardTapTime = state.elapsed;
      return;
    default:
      if (action.startsWith("hotbar") && inWorld) {
        selectHotbarSlot(Number(action.slice(6)) - 1);
      }
  }
}

export function dispatchPress(token, event) {
  for (const action of actionsForToken(token)) {
    if (state.running || GLOBAL_ACTIONS.has(action)) {
      handleActionPress(action, event);
    }
  }
}
