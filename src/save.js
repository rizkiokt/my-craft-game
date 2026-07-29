// World, inventory and player persistence in localStorage.

import {
  HOTBAR_SIZE,
  MAX_WORLD_NAME,
  PENDING_SEED_KEY,
  SAVE_FORMAT,
  SAVE_FORMAT_VERSION,
  SAVE_KEY,
  WORLD_INFO_PREFIX,
  WORLD_KEY_PREFIX,
} from "./constants.js";
import { getSelectedItem, isPlaceableItem } from "./items.js";
import { passiveMobs } from "./mobs.js";
import { npcs } from "./npcs.js";
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

/** Everything worth keeping about the world you are playing right now. */
export function buildPayload() {
  return {
    seed: getWorldSeed(),
    name: state.worldName,
    gameMode: state.gameMode,
    xp: state.xp,
    health: state.health,
    chests: serializeChests(),
    portals: state.portals,
    pets: passiveMobs.serializePets(),
    npcs: npcs.serialize(),
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
}

/**
 * Set just before a deliberate reload. Replacing the active save and then
 * reloading would otherwise be undone by the `beforeunload` autosave writing
 * the old world straight back over it on the way out.
 */
let savingBlocked = false;

export function blockSaves() {
  savingBlocked = true;
}

export function saveGame(force = false) {
  if (savingBlocked) {
    return;
  }
  if (!settings.autosave && !force) {
    state.saveDirty = false;
    state.saveCooldown = 1.5;
    return;
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildPayload()));
    state.saveDirty = false;
    state.saveCooldown = 1.5;
  } catch {
    state.uiMessage = "Save failed";
    state.uiMessageTimer = 1.1;
  }
}

let loadedSave = false;
let restoredNpcs = false;

/** True when the save already contained the roster, so boot need not spawn it. */
export function hasRestoredNpcs() {
  return restoredNpcs;
}

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
    if (typeof payload.name === "string" && payload.name.trim()) {
      state.worldName = cleanWorldName(payload.name);
    }
    if (payload.gameMode === "creative" || payload.gameMode === "survival") {
      state.gameMode = payload.gameMode;
    }
    state.xp = Number.isFinite(payload.xp) ? payload.xp : state.xp;
    state.health = Number.isFinite(payload.health) ? payload.health : state.health;
    restoredNpcs = npcs.restore(payload.npcs);
    if (Array.isArray(payload.pets)) {
      passiveMobs.restorePets(payload.pets);
    }
    if (payload.chests && typeof payload.chests === "object") {
      state.chests = payload.chests;
    }
    if (payload.portals && typeof payload.portals === "object") {
      state.portals = payload.portals;
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

/* ------------------------------------------------------------------ *
 * Named worlds
 *
 * Everything here is browser storage and files on your own machine, so
 * it works on a static host with no server behind it. The world you are
 * playing lives at SAVE_KEY as it always has; these are copies of it
 * kept under a name, plus the export/import that makes them portable.
 * ------------------------------------------------------------------ */

export function cleanWorldName(name) {
  const trimmed = String(name ?? "").replace(/\s+/g, " ").trim();
  return trimmed.slice(0, MAX_WORLD_NAME) || "Untitled World";
}

function newWorldId() {
  return `w${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;
}

function countEdits(worldEdits) {
  return Object.values(worldEdits ?? {}).reduce((total, chunk) => total + Object.keys(chunk).length, 0);
}

/** The small record the Worlds screen lists, kept apart from the bulk. */
function buildInfo(name, payload) {
  return {
    name,
    savedAt: new Date().toISOString(),
    seed: payload.seed ?? 0,
    gameMode: payload.gameMode ?? "survival",
    edits: countEdits(payload.worldEdits),
  };
}

/** Wraps a payload for a slot or a file, so a stray .json can be spotted. */
function wrap(name, payload) {
  return {
    format: SAVE_FORMAT,
    version: SAVE_FORMAT_VERSION,
    name,
    savedAt: new Date().toISOString(),
    data: payload,
  };
}

export function listWorlds() {
  const worlds = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(WORLD_INFO_PREFIX)) {
        continue;
      }
      const id = key.slice(WORLD_INFO_PREFIX.length);
      const info = JSON.parse(localStorage.getItem(key));
      if (info && typeof info.name === "string") {
        worlds.push({ id, ...info });
      }
    }
  } catch {
    /* an unreadable entry just does not appear */
  }
  return worlds.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

/** Writes a payload into a slot, reusing `id` to overwrite an existing one. */
function writeWorld(name, payload, id = newWorldId()) {
  const clean = cleanWorldName(name);
  try {
    localStorage.setItem(WORLD_KEY_PREFIX + id, JSON.stringify(wrap(clean, payload)));
    localStorage.setItem(WORLD_INFO_PREFIX + id, JSON.stringify(buildInfo(clean, payload)));
    return { ok: true, id, name: clean };
  } catch {
    // Half-written slots would show in the list with no data behind them.
    try {
      localStorage.removeItem(WORLD_KEY_PREFIX + id);
      localStorage.removeItem(WORLD_INFO_PREFIX + id);
    } catch {
      /* nothing more to do */
    }
    return { ok: false, reason: "This browser is out of storage. Export a world to a file and delete one here." };
  }
}

/** Saves the world you are playing under a name, overwriting a match. */
export function saveWorldAs(name) {
  const clean = cleanWorldName(name);
  const existing = listWorlds().find((world) => world.name.toLowerCase() === clean.toLowerCase());
  const result = writeWorld(clean, buildPayload(), existing?.id);
  if (result.ok) {
    state.worldName = clean;
    saveGame(true);
  }
  return result;
}

export function deleteWorld(id) {
  try {
    localStorage.removeItem(WORLD_KEY_PREFIX + id);
    localStorage.removeItem(WORLD_INFO_PREFIX + id);
    return true;
  } catch {
    return false;
  }
}

function readWorld(id) {
  try {
    const raw = localStorage.getItem(WORLD_KEY_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Makes a saved world the one you are playing. The seed decides what every
 * chunk generates and is only applied at boot, so this hands over by
 * replacing the active save and reloading rather than swapping in place.
 */
export function loadWorld(id) {
  const file = readWorld(id);
  if (!file?.data) {
    return { ok: false, reason: "That world could not be read." };
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...file.data, name: file.name }));
  } catch {
    return { ok: false, reason: "This browser is out of storage." };
  }
  blockSaves();
  return { ok: true, name: file.name };
}

/* ------------------------------------------------------------------ *
 * Files
 * ------------------------------------------------------------------ */

/** JSON text for one saved world, or for the world you are playing. */
export function exportWorldText(id = null) {
  if (id == null) {
    return JSON.stringify(wrap(cleanWorldName(state.worldName), buildPayload()), null, 1);
  }
  const file = readWorld(id);
  return file ? JSON.stringify(file, null, 1) : null;
}

export function worldFileName(name) {
  const slug = cleanWorldName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `mycraft-${slug || "world"}.json`;
}

/** Reads an exported file back into a new slot. */
export function importWorldText(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, reason: "That file is not a MyCraft world." };
  }
  if (file?.format !== SAVE_FORMAT || !file.data || typeof file.data !== "object") {
    return { ok: false, reason: "That file is not a MyCraft world." };
  }
  if (Number(file.version) > SAVE_FORMAT_VERSION) {
    return { ok: false, reason: "That world was saved by a newer version of the game." };
  }
  return writeWorld(file.name ?? "Imported World", file.data);
}
