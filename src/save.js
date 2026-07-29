// World, inventory and player persistence in localStorage.

import { HOTBAR_SIZE, PENDING_SEED_KEY, SAVE_KEY } from "./constants.js";
import { getSelectedItem, isPlaceableItem } from "./items.js";
import { clamp, getWorldSeed, seedFromText, setWorldSeed } from "./math.js";
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
      seed: getWorldSeed(),
      gameMode: state.gameMode,
      xp: state.xp,
      health: state.health,
      chests: serializeChests(),
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

let loadedSave = false;

/** Drops empty chests so the save does not grow with every one placed. */
function serializeChests() {
  const chests = {};
  for (const [key, slots] of Object.entries(state.chests)) {
    if (slots?.some(Boolean)) {
      chests[key] = slots;
    }
  }
  return chests;
}

/**
 * Reads just the seed and applies it. Must run before anything touches the
 * world, because chunks generate on first access.
 */
export function loadWorldSeed() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const seed = raw ? JSON.parse(raw)?.seed : undefined;
    setWorldSeed(Number.isFinite(seed) ? seed : readPendingSeed());
  } catch {
    setWorldSeed(0);
  }
}

/** A seed chosen on the title screen survives the reload that applies it. */
function readPendingSeed() {
  try {
    const pending = localStorage.getItem(PENDING_SEED_KEY);
    if (pending == null) {
      return 0;
    }
    localStorage.removeItem(PENDING_SEED_KEY);
    return seedFromText(pending);
  } catch {
    return 0;
  }
}

export function stagePendingSeed(text) {
  try {
    localStorage.setItem(PENDING_SEED_KEY, String(text ?? ""));
  } catch {
    /* storage is optional */
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return false;
    }
    const payload = JSON.parse(raw);
    loadedSave = true;
    if (payload.gameMode === "creative" || payload.gameMode === "survival") {
      state.gameMode = payload.gameMode;
    }
    state.xp = Number.isFinite(payload.xp) ? payload.xp : state.xp;
    state.health = Number.isFinite(payload.health) ? payload.health : state.health;
    if (payload.chests && typeof payload.chests === "object") {
      state.chests = payload.chests;
    }
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
    return loadedSave;
  } catch {
    state.uiMessage = "Save data was invalid";
    state.uiMessageTimer = 1.1;
    return false;
  }
}
