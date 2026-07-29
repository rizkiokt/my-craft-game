// World, inventory and player persistence in localStorage.

import { HOTBAR_SIZE, SAVE_KEY } from "./constants.js";
import { getSelectedItem, isPlaceableItem } from "./items.js";
import { clamp } from "./math.js";
import { settings } from "./settings.js";
import { state } from "./state.js";
import { world } from "./world.js";
export function serializeWorldEdits() {
  const chunks = {};
  for (const [key, chunk] of world.chunks) {
    if (chunk.edits.size === 0) {
      continue;
    }
    chunks[key] = Object.fromEntries(chunk.edits);
  }
  return chunks;
}

export function hydrateWorldEdits(savedChunks) {
  for (const [key, edits] of Object.entries(savedChunks || {})) {
    const [cx, cz] = key.split(",").map(Number);
    const chunk = world.ensureChunk(cx, cz);
    for (const [editKey, blockType] of Object.entries(edits)) {
      chunk.edits.set(editKey, blockType);
      const [, y] = editKey.split(",").map(Number);
      chunk.maxBuildY = Math.max(chunk.maxBuildY, y);
    }
  }
}

export function saveGame(force = false) {
  if (!settings.autosave && !force) {
    state.saveDirty = false;
    state.saveCooldown = 1.5;
    return;
  }
  try {
    const payload = {
      gameMode: state.gameMode,
      xp: state.xp,
      health: state.health,
      armor: state.armor,
      enchantments: state.enchantments,
      inventory: state.inventory,
      hotbarSlots: state.hotbarSlots,
      activeSlot: state.activeSlot,
      selectedBlock: state.selectedBlock,
      player: state.player,
      dayTime: state.dayTime,
      worldEdits: serializeWorldEdits(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    state.saveDirty = false;
    state.saveCooldown = 1.5;
  } catch {
    state.uiMessage = "Save failed";
    state.uiMessageTimer = 1.1;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return;
    }
    const payload = JSON.parse(raw);
    if (payload.gameMode === "creative" || payload.gameMode === "survival") {
      state.gameMode = payload.gameMode;
    }
    state.xp = Number.isFinite(payload.xp) ? payload.xp : state.xp;
    state.health = Number.isFinite(payload.health) ? payload.health : state.health;
    if (payload.armor && typeof payload.armor === "object") {
      Object.assign(state.armor, payload.armor);
    }
    if (payload.enchantments && typeof payload.enchantments === "object") {
      state.enchantments = payload.enchantments;
    }
    Object.assign(state.inventory, payload.inventory || {});
    if (Array.isArray(payload.hotbarSlots)) {
      state.hotbarSlots = payload.hotbarSlots.slice(0, HOTBAR_SIZE);
      while (state.hotbarSlots.length < HOTBAR_SIZE) {
        state.hotbarSlots.push(null);
      }
    }
    state.activeSlot = clamp(payload.activeSlot ?? state.activeSlot, 0, HOTBAR_SIZE - 1);
    state.selectedBlock = payload.selectedBlock ?? state.selectedBlock;
    if (payload.player) {
      Object.assign(state.player, payload.player);
    }
    state.dayTime = payload.dayTime ?? state.dayTime;
    hydrateWorldEdits(payload.worldEdits);
    const selectedItem = getSelectedItem();
    if (isPlaceableItem(selectedItem)) {
      state.selectedBlock = selectedItem;
    }
  } catch {
    state.uiMessage = "Save data was invalid";
    state.uiMessageTimer = 1.1;
  }
}
