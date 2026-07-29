// Inventory panel: bag, crafting grid, result slot and the recipe book.

import { keyHint } from "../bindings.js";
import { BLOCKS, BLOCK_NAMES, CREATIVE_ITEMS, ITEMS, PLACEABLE_BLOCKS } from "../constants.js";
import {
  craftArea,
  craftGridEl,
  craftResultEl,
  craftTitle,
  cursorStackEl,
  inventoryBody,
  inventoryEyebrow,
  inventoryGrid,
  inventoryGridHint,
  inventoryGridTitle,
  inventoryPanel,
  inventoryRecipeHint,
  inventoryStation,
  recipeList,
} from "../dom.js";
import {
  autoFillRecipe,
  canAfford,
  clickGridSlot,
  findGridRecipe,
  getCraftableCount,
  getGridSize,
  getSlotCount,
  getStation,
  isFurnace,
  placeOneInGrid,
  putCursorInBag,
  returnGridToBag,
  setStation,
  takeFromBag,
  takeResult,
} from "../crafting.js";
import { itemIcons } from "../icons.js";
import { getItemCount, getSelectedItem, isCreative, isPlaceableItem } from "../items.js";
import { exitPointerLock, requestPointerLock } from "../pointerLock.js";
import { soundEngine } from "../sound.js";
import { state } from "../state.js";
import { announceHeldItem, showToast, updateHotbar } from "./hud.js";

/** Kept for the scripted-testing snapshot in debugApi.js. */
export function canCraft(recipe) {
  return Object.entries(recipe.ingredients).every(
    ([itemId, needed]) => getItemCount(Number(itemId)) >= needed,
  );
}

export function canSmelt(recipe) {
  return getItemCount(recipe.input) >= recipe.inputCount
    && getItemCount(recipe.fuel) >= recipe.fuelCount;
}

function setSlotIcon(element, itemId) {
  const icon = element.querySelector(".slot-icon");
  if (icon) {
    icon.style.backgroundImage = itemId == null ? "none" : `url("${itemIcons.get(itemId)}")`;
  }
}

function makeSlot(className, itemId, count, { showCount = true } = {}) {
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = className;
  if (itemId == null) {
    slot.classList.add("is-blank");
  }
  slot.innerHTML =
    `<div class="slot-icon"></div>` +
    `<span class="slot-count">${showCount && count > 1 ? count : ""}</span>`;
  setSlotIcon(slot, itemId);
  if (itemId != null) {
    slot.title = BLOCK_NAMES[itemId];
  }
  return slot;
}

export function createInventorySlot(itemId, count, selected) {
  const slot = makeSlot("inventory-slot", itemId, count, { showCount: !isCreative() });
  slot.dataset.item = String(itemId);
  slot.title = `${BLOCK_NAMES[itemId]}${isCreative() ? "" : ` — ${count} in bag`}`;
  if (selected) {
    slot.classList.add("is-selected");
  }
  if (count <= 0) {
    slot.classList.add("is-empty");
    slot.disabled = true;
  }
  return slot;
}

/* ------------------------------------------------------------------ *
 * Cursor stack — the items "held" by the mouse, as in Minecraft
 * ------------------------------------------------------------------ */

function renderCursor() {
  const stack = state.cursorStack;
  cursorStackEl.classList.toggle("is-hidden", !stack);
  if (!stack) {
    return;
  }
  setSlotIcon(cursorStackEl, stack.itemId);
  const label = cursorStackEl.querySelector(".slot-count");
  if (label) {
    label.textContent = stack.count > 1 ? String(stack.count) : "";
  }
}

export function moveCursorStack(x, y) {
  cursorStackEl.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
}

/* ------------------------------------------------------------------ *
 * Panel rendering
 * ------------------------------------------------------------------ */

function renderBag() {
  const creative = isCreative();
  inventoryGrid.replaceChildren();

  const items = creative
    ? CREATIVE_ITEMS
    : [...new Set([
        ...PLACEABLE_BLOCKS,
        ITEMS.stick,
        ITEMS.coal,
        ITEMS.iron_ingot,
        ITEMS.wood_pickaxe,
        ITEMS.stone_pickaxe,
      ])];

  for (const itemId of items) {
    const count = getItemCount(itemId);
    const slot = createInventorySlot(itemId, count, itemId === getSelectedItem());
    slot.addEventListener("click", (event) => {
      if (count <= 0) {
        return;
      }
      // Holding a stack means you are building a recipe, not equipping.
      if (state.cursorStack || event.shiftKey) {
        putCursorInBag();
        state.cursorStack = takeFromBag(itemId, event.shiftKey ? Infinity : Infinity);
        soundEngine.select();
        updateInventoryPanel();
        return;
      }
      state.hotbarSlots[state.activeSlot] = itemId;
      setActiveItem(itemId);
      updateInventoryPanel();
      updateHotbar();
    });
    slot.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (count <= 0) {
        return;
      }
      // Right-click pulls a single item out, for laying recipes precisely.
      if (state.cursorStack && state.cursorStack.itemId !== itemId) {
        putCursorInBag();
      }
      const one = takeFromBag(itemId, 1);
      if (!one) {
        return;
      }
      if (state.cursorStack) {
        state.cursorStack.count += one.count;
      } else {
        state.cursorStack = one;
      }
      soundEngine.select();
      updateInventoryPanel();
    });
    inventoryGrid.appendChild(slot);
  }
}

function renderCraftArea() {
  const station = getStation();
  const furnace = isFurnace();
  craftTitle.textContent = station.label;
  craftGridEl.classList.toggle("is-furnace", furnace);
  craftGridEl.style.setProperty("--craft-cols", furnace ? 1 : getGridSize());
  craftGridEl.replaceChildren();

  for (let index = 0; index < getSlotCount(); index++) {
    const slot = state.craftGrid[index];
    const cell = makeSlot("craft-slot", slot?.itemId ?? null, slot?.count ?? 0);
    if (furnace) {
      cell.dataset.role = index === 0 ? "input" : "fuel";
      cell.title = index === 0 ? "Input" : "Fuel";
    }
    cell.addEventListener("click", () => {
      clickGridSlot(index);
      soundEngine.select();
      updateInventoryPanel();
    });
    cell.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      placeOneInGrid(index);
      soundEngine.select();
      updateInventoryPanel();
    });
    craftGridEl.appendChild(cell);
  }

  const recipe = findGridRecipe();
  craftResultEl.replaceChildren();
  const result = makeSlot(
    "craft-slot craft-result-slot",
    recipe ? recipe.output : null,
    recipe ? recipe.count : 0,
  );
  result.disabled = !recipe;
  if (recipe) {
    const times = getCraftableCount(recipe);
    result.title = `${BLOCK_NAMES[recipe.output]} x${recipe.count} — click to take, shift-click for all ${times}`;
    result.addEventListener("click", (event) => {
      const taken = takeResult({ all: event.shiftKey });
      if (!taken) {
        return;
      }
      soundEngine.craft();
      showToast(`${isFurnace() ? "Smelted" : "Crafted"} ${taken.total} ${BLOCK_NAMES[taken.recipe.output]}`);
      state.saveDirty = true;
      updateInventoryPanel();
      updateHotbar();
    });
  }
  craftResultEl.appendChild(result);
}

function renderRecipeBook() {
  const station = getStation();
  recipeList.replaceChildren();

  if (isCreative() && !isFurnace()) {
    const note = document.createElement("p");
    note.className = "screen-subtitle";
    note.textContent = "Every item is already unlocked in creative — the grid still works if you want it.";
    recipeList.appendChild(note);
  }

  for (const recipe of station.recipes) {
    const affordable = canAfford(recipe);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `recipe-card${affordable ? "" : " is-disabled"}`;
    card.disabled = !affordable;

    const info = document.createElement("div");
    info.className = "recipe-info";
    const ingredients = isFurnace()
      ? `${recipe.inputCount} ${BLOCK_NAMES[recipe.input]} + ${recipe.fuelCount} ${BLOCK_NAMES[recipe.fuel]}`
      : Object.entries(recipe.ingredients)
          .map(([itemId, needed]) => `${needed} ${BLOCK_NAMES[Number(itemId)]}`)
          .join(" + ");
    info.innerHTML =
      `<strong>${BLOCK_NAMES[recipe.output]} x${recipe.count}</strong><span>${ingredients}</span>`;

    const output = document.createElement("div");
    output.className = "recipe-output";
    output.innerHTML = `<div class="slot-icon"></div>`;
    setSlotIcon(output, recipe.output);

    card.append(output, info);
    card.addEventListener("click", () => {
      if (autoFillRecipe(recipe)) {
        soundEngine.select();
      } else {
        showToast(`Not enough materials for ${BLOCK_NAMES[recipe.output]}`);
      }
      updateInventoryPanel();
    });
    recipeList.appendChild(card);
  }
}

export function updateInventoryPanel() {
  const creative = isCreative();
  inventoryBody.classList.toggle("is-creative", creative);
  inventoryEyebrow.textContent = creative ? "Creative Inventory" : "Survival Inventory";
  inventoryStation.textContent = getStation().label;
  inventoryGridTitle.textContent = creative ? "All Blocks & Items" : "Backpack";
  inventoryGridHint.textContent = creative
    ? "Click to hold · right-click for one"
    : "Click to equip · right-click for one";
  inventoryRecipeHint.textContent = `Press ${keyHint("inventory")} to close`;

  renderBag();
  renderCraftArea();
  renderRecipeBook();
  renderCursor();
}

/* ------------------------------------------------------------------ *
 * Opening and closing
 * ------------------------------------------------------------------ */

export function toggleInventory(forceOpen) {
  const nextValue = typeof forceOpen === "boolean" ? forceOpen : !state.inventoryOpen;
  if (nextValue === state.inventoryOpen) {
    return;
  }
  soundEngine.ui(nextValue);
  state.inventoryOpen = nextValue;
  inventoryPanel.classList.toggle("is-hidden", !nextValue);
  if (nextValue) {
    exitPointerLock();
    updateInventoryPanel();
  } else {
    // Nothing is ever lost on close: the grid and cursor go back in the bag.
    returnGridToBag();
    setStation("inventory");
    updateHotbar();
    if (state.running) {
      requestPointerLock();
    }
  }
}

/** Right-clicking a crafting table or furnace opens it, as in Minecraft. */
export function openStation(name) {
  setStation(name);
  if (state.inventoryOpen) {
    updateInventoryPanel();
    return;
  }
  toggleInventory(true);
}

export function setActiveItem(itemId) {
  if (getItemCount(itemId) <= 0) {
    showToast(`No ${BLOCK_NAMES[itemId]} in bag`);
    return;
  }
  const existingIndex = state.hotbarSlots.indexOf(itemId);
  if (existingIndex !== -1) {
    state.activeSlot = existingIndex;
  } else {
    state.hotbarSlots[state.activeSlot] = itemId;
  }
  state.selectedBlock = isPlaceableItem(itemId) ? itemId : state.selectedBlock;
  state.saveDirty = true;
  announceHeldItem();
  soundEngine.select();
}
