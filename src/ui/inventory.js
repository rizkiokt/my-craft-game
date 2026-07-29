// Inventory grid, recipe cards and crafting actions.

import { keyHint } from "../bindings.js";
import { BLOCKS, BLOCK_NAMES, CREATIVE_ITEMS, ITEMS, PLACEABLE_BLOCKS } from "../constants.js";
import { inventoryBody, inventoryEyebrow, inventoryGrid, inventoryGridHint, inventoryGridTitle, inventoryPanel, inventoryRecipeHint, recipeList } from "../dom.js";
import { itemIcons } from "../icons.js";
import { getItemCount, getSelectedItem, isCreative, isPlaceableItem } from "../items.js";
import { exitPointerLock, requestPointerLock } from "../pointerLock.js";
import { FURNACE_RECIPES, HAND_RECIPES, TABLE_RECIPES } from "../recipes.js";
import { soundEngine } from "../sound.js";
import { state } from "../state.js";
import { announceHeldItem, showToast, updateHotbar } from "./hud.js";
export function createInventorySlot(itemId, count, selected) {
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = "inventory-slot";
  slot.dataset.item = String(itemId);
  slot.title = `${BLOCK_NAMES[itemId]}${isCreative() ? "" : ` — ${count} in bag`}`;
  if (selected) {
    slot.classList.add("is-selected");
  }
  if (count <= 0) {
    slot.classList.add("is-empty");
    slot.disabled = true;
  }
  slot.innerHTML =
    `<div class="slot-icon"></div>` +
    `<span class="slot-count">${isCreative() ? "" : count}</span>`;
  slot.querySelector(".slot-icon").style.backgroundImage = `url("${itemIcons.get(itemId)}")`;
  return slot;
}

export function canCraft(recipe) {
  return Object.entries(recipe.ingredients).every(([blockType, needed]) => (state.inventory[Number(blockType)] ?? 0) >= needed);
}

export function canSmelt(recipe) {
  return (state.inventory[recipe.input] ?? 0) >= recipe.inputCount &&
    (state.inventory[recipe.fuel] ?? 0) >= recipe.fuelCount;
}

export function craftRecipe(recipeId, collection) {
  const recipe = collection.find((entry) => entry.id === recipeId);
  if (!recipe || !canCraft(recipe)) {
    return;
  }
  for (const [blockType, needed] of Object.entries(recipe.ingredients)) {
    state.inventory[Number(blockType)] -= needed;
  }
  state.inventory[recipe.output] = (state.inventory[recipe.output] ?? 0) + recipe.count;
  setActiveItem(recipe.output);
  state.uiMessage = `Crafted ${recipe.count} ${BLOCK_NAMES[recipe.output]}`;
  state.uiMessageTimer = 1.4;
  soundEngine.craft();
  state.saveDirty = true;
  updateInventoryPanel();
  updateHotbar();
}

export function smeltRecipe(recipeId) {
  const recipe = FURNACE_RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe || !canSmelt(recipe)) {
    return;
  }
  state.inventory[recipe.input] -= recipe.inputCount;
  state.inventory[recipe.fuel] -= recipe.fuelCount;
  state.inventory[recipe.output] = (state.inventory[recipe.output] ?? 0) + recipe.count;
  setActiveItem(recipe.output);
  state.uiMessage = `Smelted ${recipe.count} ${BLOCK_NAMES[recipe.output]}`;
  state.uiMessageTimer = 1.4;
  soundEngine.craft();
  state.saveDirty = true;
  updateInventoryPanel();
  updateHotbar();
}

export function getAccessibleStations() {
  const result = {
    table: false,
    furnace: false,
  };
  if (!state.target) {
    return result;
  }
  if (state.target.distance > 5.5) {
    return result;
  }
  if (state.target.block.type === BLOCKS.crafting_table) {
    result.table = true;
  }
  if (state.target.block.type === BLOCKS.furnace) {
    result.furnace = true;
  }
  return result;
}

export function createPatternGrid(pattern) {
  const grid = document.createElement("div");
  grid.className = "recipe-pattern";
  grid.style.gridTemplateColumns = `repeat(${pattern[0].length}, 42px)`;
  for (const row of pattern) {
    for (const cell of row) {
      const recipeCell = document.createElement("div");
      recipeCell.className = "recipe-cell";
      if (cell !== null) {
        recipeCell.innerHTML = `<div class="slot-icon"></div>`;
        recipeCell.querySelector(".slot-icon").style.backgroundImage = `url("${itemIcons.get(cell)}")`;
      }
      grid.appendChild(recipeCell);
    }
  }
  return grid;
}

export function buildRecipeSection(title, subtitle, recipes, type) {
  const wrapper = document.createElement("section");
  wrapper.className = "inventory-section inventory-section-wide";
  wrapper.innerHTML = `<div class="section-title"><h3>${title}</h3><span>${subtitle}</span></div>`;
  const list = document.createElement("div");
  list.className = "recipe-list";

  for (const recipe of recipes) {
    const enabled = type === "smelt" ? canSmelt(recipe) : canCraft(recipe);
    const card = document.createElement("div");
    card.className = `recipe-card${enabled ? "" : " is-disabled"}`;

    const info = document.createElement("div");
    info.className = "recipe-info";
    const ingredients = type === "smelt"
      ? `${recipe.inputCount} ${BLOCK_NAMES[recipe.input]} + ${recipe.fuelCount} ${BLOCK_NAMES[recipe.fuel]}`
      : Object.entries(recipe.ingredients)
          .map(([itemId, needed]) => `${needed} ${BLOCK_NAMES[Number(itemId)]}`)
          .join(" + ");
    info.innerHTML = `<strong>${BLOCK_NAMES[recipe.output]} x${recipe.count}</strong><span>${recipe.description} ${ingredients}</span>`;

    const pattern = type === "smelt"
      ? createPatternGrid([
          [recipe.input, recipe.fuel],
          [null, null],
        ])
      : createPatternGrid(recipe.pattern);

    const craftWrap = document.createElement("div");
    craftWrap.className = "recipe-craft";
    craftWrap.innerHTML =
      `<div class="recipe-output"><div class="slot-icon"></div><span>x${recipe.count}</span></div>` +
      `<button class="mc-btn mc-btn-sm recipe-button" type="button"${enabled ? "" : " disabled"}>${type === "smelt" ? "Smelt" : "Craft"}</button>`;
    craftWrap.querySelector(".slot-icon").style.backgroundImage = `url("${itemIcons.get(recipe.output)}")`;
    craftWrap.querySelector(".recipe-button").addEventListener("click", () => {
      if (type === "smelt") {
        smeltRecipe(recipe.id);
      } else {
        craftRecipe(recipe.id, recipes);
      }
    });

    card.append(info, pattern, craftWrap);
    list.appendChild(card);
  }
  wrapper.appendChild(list);
  return wrapper;
}

export function updateInventoryPanel() {
  const creative = isCreative();
  inventoryBody.classList.toggle("is-creative", creative);
  inventoryEyebrow.textContent = creative ? "Creative Inventory" : "Survival Inventory";
  inventoryGridTitle.textContent = creative ? "All Blocks & Items" : "Backpack";
  inventoryGridHint.textContent = creative
    ? "Unlimited supply — click to hold"
    : "Click an item to hold it";
  inventoryRecipeHint.textContent = `Press ${keyHint("inventory")} to close`;

  inventoryGrid.replaceChildren();
  const allItems = creative
    ? CREATIVE_ITEMS
    : [...new Set([
        ...PLACEABLE_BLOCKS,
        ITEMS.stick,
        ITEMS.coal,
        ITEMS.iron_ingot,
        ITEMS.wood_pickaxe,
        ITEMS.stone_pickaxe,
      ])];

  allItems.forEach((itemId) => {
    const count = getItemCount(itemId);
    const slot = createInventorySlot(itemId, count, itemId === getSelectedItem());
    slot.addEventListener("click", () => {
      if (count <= 0) {
        return;
      }
      state.hotbarSlots[state.activeSlot] = itemId;
      setActiveItem(itemId);
      updateInventoryPanel();
      updateHotbar();
    });
    inventoryGrid.appendChild(slot);
  });

  recipeList.replaceChildren();
  if (creative) {
    const note = document.createElement("p");
    note.className = "screen-subtitle";
    note.textContent = "Crafting is not needed in creative — every item is already unlocked.";
    recipeList.appendChild(note);
    return;
  }
  recipeList.appendChild(buildRecipeSection("Hand Crafting", "Always available", HAND_RECIPES, "craft"));
  const stations = getAccessibleStations();
  if (stations.table) {
    recipeList.appendChild(buildRecipeSection("Crafting Table", "Look at a placed table to unlock", TABLE_RECIPES, "craft"));
  }
  if (stations.furnace) {
    recipeList.appendChild(buildRecipeSection("Furnace", "Look at a placed furnace to smelt", FURNACE_RECIPES, "smelt"));
  }
}

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
  } else if (state.running) {
    requestPointerLock();
  }
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
