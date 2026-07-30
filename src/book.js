// The book of things to do.
//
// The game has a great deal in it that nobody is ever told about — portals,
// enchanting, the Ember Deep, eight kinds of charge, friends who will dig you
// out of a hole. This is the only thing that points at any of it.
//
// Most entries are a predicate polled a few times a second rather than a call
// planted at the place it happens, because a predicate cannot be forgotten
// when the code around it moves. Only the handful that leave no trace in the
// state — honking, lighting a portal, travelling through one — are marked by
// hand.

import { BIOME_TYPES, BLOCKS, CITY_PLAN, ITEMS, SNOW_REALM } from "./constants.js";
import { isInsideRect } from "./math.js";
import { getMaxHearts, getPlayerLevel } from "./growth.js";
import { state } from "./state.js";
import { getBiomeAt } from "./worldgen.js";

const has = (itemId) => (state.inventory[itemId] ?? 0) > 0;

/** Roughly a tall block's roof above the city's ground level. */
const CITY_TOWER_TOP = CITY_PLAN.baseHeight + 13;

/** Five: forest, dunes, swamp, canyon and the Ember Deep. */
const BIOME_COUNT = BIOME_TYPES.length;

/**
 * Roughly in the order someone would meet them, because the screen is read
 * top to bottom and a list that opens with "reach level fifty" is a list that
 * gets closed again.
 */
export const BOOK = [
  { id: "break", title: "Break your first block", hint: "Hold the left button on anything.", check: () => state.stats.broken >= 1 },
  { id: "table", title: "Make a crafting table", hint: "Four planks in your own 2x2 grid.", check: () => has(BLOCKS.crafting_table) },
  { id: "pickaxe", title: "Make a stone pickaxe", hint: "Three stone over two sticks.", check: () => has(ITEMS.stone_pickaxe) },
  { id: "build", title: "Place a hundred blocks", hint: "Build something.", check: () => state.stats.placed >= 100 },
  { id: "iron", title: "Smelt an iron ingot", hint: "Iron ore and coal in a furnace.", check: () => has(ITEMS.iron_ingot) },
  { id: "deep", title: "Dig all the way down", hint: "Take torches. Below y = 6.", check: () => state.player.y <= 6 },
  { id: "diamond", title: "Find a diamond", hint: "They hide near the bottom.", check: () => has(ITEMS.diamond) },
  { id: "high", title: "Build a tower up to y = 70", hint: "Then look down.", check: () => state.player.y >= 70 },

  { id: "swim", title: "Go for a swim", check: () => state.swimming },
  { id: "under", title: "Duck right under the water", hint: "Everything goes quiet.", check: () => state.submerged },
  { id: "cat", title: "Make friends with a cat", hint: "Walk up to one and touch it." },
  { id: "friend", title: "Ask a friend to follow you", hint: "Touch one of the five." },

  { id: "level10", title: "Reach level 10", hint: "Mining ore is the quick way.", check: () => getPlayerLevel() >= 10 },
  { id: "hearts20", title: "Get to twenty hearts", hint: "Level 20. You grow as well.", check: () => getMaxHearts() >= 20 },
  { id: "enchant", title: "Enchant something", hint: "An enchanting table and some levels.", check: () => Object.keys(state.enchantments).length > 0 },
  { id: "level50", title: "Reach level 50", hint: "Half again as tall as you started.", check: () => getPlayerLevel() >= 50 },

  { id: "city", title: "Climb to the roof of a city tower", hint: "You woke up in the city. Look up.", check: () => state.stats.places.city },
  { id: "snow", title: "Find the snow realm", hint: "A long way east, past the city.", check: () => state.stats.places.snow },
  { id: "biomes", title: "Stand in all five biomes", hint: "Forest, dunes, swamp, canyon and the Ember Deep.", check: () => countBiomes() >= BIOME_COUNT },
  { id: "ember", title: "Go down into the Ember Deep", hint: "It glows. A portal is the easy way.", check: () => state.stats.places.ember },
  { id: "portal", title: "Light a portal", hint: "A ring of portal frame, then touch it." },
  { id: "travel", title: "Travel through a portal", hint: "Walk into the middle." },

  { id: "tnt", title: "Set off a charge", hint: "Place it, touch it, then run.", check: () => state.stats.charges.length >= 1 },
  { id: "charges", title: "Set off all eight kinds of charge", hint: "Fire, flood, tornado, earthquake, blizzard...", check: () => state.stats.charges.length >= 8 },
  { id: "car", title: "Build a car", hint: "Four iron ingots and two coal.", check: () => has(ITEMS.car) },
  { id: "drive", title: "Drive a hundred blocks", check: () => state.stats.driven >= 100 },
  { id: "truck", title: "Build a monster truck", hint: "Four coal round a car — big tyres.", check: () => has(ITEMS.truck) },
  { id: "truckjump", title: "Jump a monster truck", hint: "Press jump while you are driving it." },
  { id: "honk", title: "Honk the horn", hint: "Right-click while you are driving." },
];

function countBiomes() {
  return Object.keys(state.stats.biomes).length;
}

/** Ticks an entry off, once. Safe to call every frame. */
export function markDone(id) {
  if (state.book[id]) {
    return false;
  }
  state.book[id] = true;
  const entry = BOOK.find((item) => item.id === id);
  if (entry) {
    // The HUD drains this. This module sits below it and cannot call it.
    state.bookToast.push(entry.title);
  }
  state.saveDirty = true;
  return true;
}

export function countDone() {
  return BOOK.filter((entry) => state.book[entry.id]).length;
}

/** Records that a charge of this kind has been set off. */
export function noteCharge(name) {
  if (!state.stats.charges.includes(name)) {
    state.stats.charges.push(name);
    state.saveDirty = true;
  }
}

let sinceCheck = 0;

/**
 * Polls the predicates. Two or three times a second is plenty — nothing here
 * is urgent, and `getBiomeAt` is a nine-site search.
 */
export function updateBook(dt) {
  sinceCheck += dt;
  if (sinceCheck < 0.4) {
    return;
  }
  sinceCheck = 0;

  noteWhereYouAre();
  for (const entry of BOOK) {
    if (!state.book[entry.id] && entry.check?.()) {
      markDone(entry.id);
    }
  }
}

/** Remembers the biomes and the landmarks you have actually stood in. */
function noteWhereYouAre() {
  const player = state.player;
  const here = getBiomeAt(Math.floor(player.x), Math.floor(player.z))?.region?.id;
  if (here && !state.stats.biomes[here]) {
    state.stats.biomes[here] = true;
    state.saveDirty = true;
  }
  if (here === "ember") {
    state.stats.places.ember = true;
  }
  // The city and the snow realm are not biomes — they keep their own terrain,
  // so they are recognised by where they are rather than by what is underfoot.
  //
  // You *wake up* in the city, so simply being in it is no achievement at all;
  // being on top of one of its towers is.
  if (isInsideRect(player.x, player.z, CITY_PLAN) && player.y >= CITY_TOWER_TOP) {
    state.stats.places.city = true;
  }
  if (isInsideRect(player.x, player.z, SNOW_REALM)) {
    state.stats.places.snow = true;
  }
}
