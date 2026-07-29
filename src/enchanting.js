// Experience and the enchanting table.
//
// The inventory is a plain count-per-item-id bag, so there are no individual
// item instances to hang enchantments off. Enchantments are therefore stored
// per item *type*: enchanting your diamond pickaxe enchants "the" diamond
// pickaxe. That keeps the bag model intact and, in a game with no durability,
// plays the same way.

import { BLOCKS, ENCHANTMENTS, ITEMS, MAX_ENCHANT_LEVEL_COST, XP_PER_LEVEL } from "./constants.js";
import { hash3 } from "./math.js";
import { state } from "./state.js";

const PICKAXES = new Set([
  ITEMS.wood_pickaxe,
  ITEMS.stone_pickaxe,
  ITEMS.iron_pickaxe,
  ITEMS.diamond_pickaxe,
  ITEMS.netherite_pickaxe,
]);

export function isPickaxe(itemId) {
  return PICKAXES.has(itemId);
}

/** Which enchantment family an item accepts, or null if it takes none. */
export function getEnchantCategory(itemId) {
  if (isPickaxe(itemId)) {
    return "pickaxe";
  }
  if (isArmorItem(itemId)) {
    return "armor";
  }
  return null;
}

/** Armor is added in a later step; the hook lives here so offers work now. */
export function isArmorItem(itemId) {
  return Boolean(ARMOR_ITEMS[itemId]);
}

export const ARMOR_ITEMS = {};

export function canEnchant(itemId) {
  return getEnchantCategory(itemId) !== null;
}

export function getEnchantments(itemId) {
  return state.enchantments[itemId] ?? {};
}

export function getEnchantLevel(itemId, enchant) {
  return getEnchantments(itemId)[enchant] ?? 0;
}

/** Enchantments on the tool currently in hand. */
export function getHeldEnchantLevel(enchant) {
  const itemId = state.hotbarSlots[state.activeSlot];
  return itemId == null ? 0 : getEnchantLevel(itemId, enchant);
}

/** A short "Efficiency II, Fortune I" summary for tooltips. */
export function describeEnchantments(itemId) {
  const entries = Object.entries(getEnchantments(itemId)).filter(([, level]) => level > 0);
  if (!entries.length) {
    return "";
  }
  const roman = ["", "I", "II", "III", "IV", "V"];
  return entries
    .map(([key, level]) => `${ENCHANTMENTS[key].name} ${roman[level] ?? level}`)
    .join(", ");
}

/* ------------------------------------------------------------------ *
 * Experience
 * ------------------------------------------------------------------ */

export function getLevel() {
  return Math.floor(state.xp / XP_PER_LEVEL);
}

/** Progress through the current level, 0..1, for the HUD bar. */
export function getLevelProgress() {
  return (state.xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

export function grantXp(amount) {
  if (amount <= 0) {
    return 0;
  }
  const before = getLevel();
  state.xp += amount;
  state.saveDirty = true;
  return getLevel() - before;
}

export function spendLevels(levels) {
  const cost = levels * XP_PER_LEVEL;
  if (state.xp < cost) {
    return false;
  }
  state.xp -= cost;
  state.saveDirty = true;
  return true;
}

/** Ores are worth mining for more than the block itself. */
export function getXpForBlock(blockType) {
  switch (blockType) {
    case BLOCKS.coal_ore:
      return 2;
    case BLOCKS.iron_ore:
      return 3;
    case BLOCKS.diamond_ore:
      return 8;
    case BLOCKS.ancient_debris:
      return 12;
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ *
 * Offers
 * ------------------------------------------------------------------ */

/**
 * Three offers, like Minecraft's three slots. They are deterministic per item
 * and per reroll so the panel does not reshuffle on every repaint.
 */
export function getOffers(itemId) {
  const category = getEnchantCategory(itemId);
  if (!category) {
    return [];
  }
  const pool = Object.entries(ENCHANTMENTS).filter(([, def]) => def.applies === category);
  const offers = [];

  for (let slot = 0; slot < 3; slot++) {
    const roll = hash3(itemId * 0.37 + slot, state.enchantSeed * 0.11, slot * 1.7);
    const [key, def] = pool[Math.floor(roll * pool.length) % pool.length];
    const current = getEnchantLevel(itemId, key);
    const cost = slot + 1;
    const level = Math.min(def.max, current + cost);
    offers.push({
      slot,
      key,
      name: def.name,
      blurb: def.blurb,
      cost: Math.min(cost, MAX_ENCHANT_LEVEL_COST),
      level,
      maxed: current >= def.max,
    });
  }
  return offers;
}

export function rerollOffers() {
  state.enchantSeed = (state.enchantSeed + 1) % 1024;
}

/** Applies an offer, charging the level cost. */
export function applyOffer(itemId, offer) {
  if (offer.maxed || !spendLevels(offer.cost)) {
    return false;
  }
  const existing = state.enchantments[itemId] ?? {};
  existing[offer.key] = offer.level;
  state.enchantments[itemId] = existing;
  rerollOffers();
  state.saveDirty = true;
  return true;
}
