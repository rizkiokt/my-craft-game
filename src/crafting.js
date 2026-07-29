// Shaped-grid crafting and furnace smelting.
//
// Recipes are matched against what is actually laid out in the grid, the way
// Minecraft does it: a pattern is trimmed of empty rows/columns and may sit
// anywhere in the grid, so a 2x2 recipe works in the top-left or bottom-right
// of a crafting table alike.

import { CREATIVE_STACK } from "./constants.js";
import { addItem, consumeItem, getItemCount, isCreative } from "./items.js";
import { FURNACE_RECIPES, HAND_RECIPES, TABLE_RECIPES } from "./recipes.js";
import { state } from "./state.js";

/** Grid size and recipe set for each place you can craft. */
export const STATIONS = {
  inventory: { size: 2, label: "Inventory Crafting", recipes: HAND_RECIPES },
  table: { size: 3, label: "Crafting Table", recipes: [...HAND_RECIPES, ...TABLE_RECIPES] },
  furnace: { size: 0, label: "Furnace", recipes: FURNACE_RECIPES },
};

export function getStation() {
  return STATIONS[state.station] ?? STATIONS.inventory;
}

export function isFurnace() {
  return state.station === "furnace";
}

export function getGridSize() {
  return getStation().size;
}

/** Slot count: a square grid, or the furnace's input + fuel pair. */
export function getSlotCount() {
  return isFurnace() ? 2 : getGridSize() ** 2;
}

export function setStation(name) {
  returnGridToBag();
  state.station = name in STATIONS ? name : "inventory";
  state.craftGrid = new Array(getSlotCount()).fill(null);
}

/** Puts everything sitting in the grid and on the cursor back in the bag. */
export function returnGridToBag() {
  for (let i = 0; i < state.craftGrid.length; i++) {
    const slot = state.craftGrid[i];
    if (slot) {
      addItem(slot.itemId, slot.count);
      state.craftGrid[i] = null;
    }
  }
  if (state.cursorStack) {
    addItem(state.cursorStack.itemId, state.cursorStack.count);
    state.cursorStack = null;
  }
}

/* ------------------------------------------------------------------ *
 * Pattern matching
 * ------------------------------------------------------------------ */

/** Crops a 2D pattern down to its non-empty bounding box. */
function trimPattern(rows) {
  let top = Infinity;
  let left = Infinity;
  let bottom = -1;
  let right = -1;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] != null) {
        top = Math.min(top, r);
        left = Math.min(left, c);
        bottom = Math.max(bottom, r);
        right = Math.max(right, c);
      }
    }
  }
  if (bottom === -1) {
    return null;
  }
  const cells = [];
  for (let r = top; r <= bottom; r++) {
    const row = [];
    for (let c = left; c <= right; c++) {
      row.push(rows[r][c] ?? null);
    }
    cells.push(row);
  }
  return cells;
}

function sameShape(a, b) {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    return false;
  }
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) {
        return false;
      }
    }
  }
  return true;
}

/** The grid's contents as a 2D array of item ids. */
export function gridToPattern() {
  const size = getGridSize();
  const rows = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(state.craftGrid[r * size + c]?.itemId ?? null);
    }
    rows.push(row);
  }
  return rows;
}

/** The crafting recipe the current layout produces, if any. */
export function findGridRecipe() {
  if (isFurnace()) {
    return findFurnaceRecipe();
  }
  const laid = trimPattern(gridToPattern());
  if (!laid) {
    return null;
  }
  for (const recipe of getStation().recipes) {
    const shape = trimPattern(recipe.pattern);
    if (shape && sameShape(laid, shape)) {
      return recipe;
    }
  }
  return null;
}

function findFurnaceRecipe() {
  const [input, fuel] = state.craftGrid;
  if (!input || !fuel) {
    return null;
  }
  return FURNACE_RECIPES.find(
    (recipe) => recipe.input === input.itemId
      && recipe.fuel === fuel.itemId
      && input.count >= recipe.inputCount
      && fuel.count >= recipe.fuelCount,
  ) ?? null;
}

/** How many times the current layout can be crafted without refilling. */
export function getCraftableCount(recipe) {
  if (!recipe) {
    return 0;
  }
  if (isFurnace()) {
    const [input, fuel] = state.craftGrid;
    return Math.min(
      Math.floor(input.count / recipe.inputCount),
      Math.floor(fuel.count / recipe.fuelCount),
    );
  }
  let most = Infinity;
  for (const slot of state.craftGrid) {
    if (slot) {
      most = Math.min(most, slot.count);
    }
  }
  return most === Infinity ? 0 : most;
}

function consumeGridOnce(recipe) {
  if (isFurnace()) {
    state.craftGrid[0].count -= recipe.inputCount;
    state.craftGrid[1].count -= recipe.fuelCount;
  } else {
    for (const slot of state.craftGrid) {
      if (slot) {
        slot.count -= 1;
      }
    }
  }
  for (let i = 0; i < state.craftGrid.length; i++) {
    if (state.craftGrid[i] && state.craftGrid[i].count <= 0) {
      state.craftGrid[i] = null;
    }
  }
}

/**
 * Takes the result out of the grid. `all` empties the grid in one go, the way
 * shift-clicking the result slot does in Minecraft.
 */
export function takeResult({ all = false } = {}) {
  const recipe = findGridRecipe();
  if (!recipe) {
    return null;
  }
  const times = all ? getCraftableCount(recipe) : 1;
  if (times <= 0) {
    return null;
  }
  for (let i = 0; i < times; i++) {
    consumeGridOnce(recipe);
    addItem(recipe.output, recipe.count);
  }
  return { recipe, times, total: times * recipe.count };
}

/* ------------------------------------------------------------------ *
 * Moving stacks between the bag, the grid and the cursor
 * ------------------------------------------------------------------ */

/** Creative hands out a full stack per click; survival moves what you own. */
export function takeFromBag(itemId, amount = Infinity) {
  const available = getItemCount(itemId);
  if (available <= 0) {
    return null;
  }
  const count = isCreative()
    ? Math.min(amount === Infinity ? 64 : amount, CREATIVE_STACK)
    : Math.min(amount, available);
  consumeItem(itemId, count);
  return { itemId, count };
}

export function putCursorInBag() {
  if (!state.cursorStack) {
    return;
  }
  addItem(state.cursorStack.itemId, state.cursorStack.count);
  state.cursorStack = null;
}

/** Left-click a grid slot: drop the cursor in, or scoop the slot up. */
export function clickGridSlot(index) {
  const slot = state.craftGrid[index];
  const cursor = state.cursorStack;

  if (cursor) {
    if (!slot) {
      state.craftGrid[index] = { ...cursor };
      state.cursorStack = null;
    } else if (slot.itemId === cursor.itemId) {
      slot.count += cursor.count;
      state.cursorStack = null;
    } else {
      state.craftGrid[index] = { ...cursor };
      state.cursorStack = { ...slot };
    }
    return;
  }
  if (slot) {
    state.cursorStack = { ...slot };
    state.craftGrid[index] = null;
  }
}

/** Right-click a grid slot: place one, or pick one back up. */
export function placeOneInGrid(index) {
  const slot = state.craftGrid[index];
  const cursor = state.cursorStack;

  if (cursor) {
    if (!slot) {
      state.craftGrid[index] = { itemId: cursor.itemId, count: 1 };
    } else if (slot.itemId === cursor.itemId) {
      slot.count += 1;
    } else {
      return;
    }
    cursor.count -= 1;
    if (cursor.count <= 0) {
      state.cursorStack = null;
    }
    return;
  }
  if (slot) {
    state.cursorStack = { itemId: slot.itemId, count: 1 };
    slot.count -= 1;
    if (slot.count <= 0) {
      state.craftGrid[index] = null;
    }
  }
}

/**
 * Recipe-book click: clears the grid and lays the recipe out from the bag.
 * Returns false when the bag cannot cover the pattern.
 */
export function autoFillRecipe(recipe) {
  returnGridToBag();

  if (isFurnace()) {
    if (getItemCount(recipe.input) < recipe.inputCount
      || getItemCount(recipe.fuel) < recipe.fuelCount) {
      return false;
    }
    state.craftGrid[0] = takeFromBag(recipe.input, recipe.inputCount);
    state.craftGrid[1] = takeFromBag(recipe.fuel, recipe.fuelCount);
    return true;
  }

  const shape = trimPattern(recipe.pattern);
  const size = getGridSize();
  if (!shape || shape.length > size || shape[0].length > size) {
    return false;
  }
  const needed = {};
  for (const row of shape) {
    for (const itemId of row) {
      if (itemId != null) {
        needed[itemId] = (needed[itemId] ?? 0) + 1;
      }
    }
  }
  for (const [itemId, count] of Object.entries(needed)) {
    if (getItemCount(Number(itemId)) < count) {
      return false;
    }
  }
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      const itemId = shape[r][c];
      if (itemId != null) {
        state.craftGrid[r * size + c] = takeFromBag(itemId, 1);
      }
    }
  }
  return true;
}

/** Recipes the bag can currently cover, for the recipe book. */
export function canAfford(recipe) {
  if (isFurnace()) {
    return getItemCount(recipe.input) >= recipe.inputCount
      && getItemCount(recipe.fuel) >= recipe.fuelCount;
  }
  return Object.entries(recipe.ingredients).every(
    ([itemId, count]) => getItemCount(Number(itemId)) >= count,
  );
}
