// Item identity, stack maths and mining rules.

import { BLOCKS, CREATIVE_STACK, ITEMS, PLACEABLE_BLOCKS, TOOL_STATS } from "./constants.js";
import { state } from "./state.js";
export function isCollectibleBlock(blockType) {
  return blockType !== BLOCKS.water && blockType !== BLOCKS.air;
}

export function isPlaceableItem(itemId) {
  return PLACEABLE_BLOCKS.includes(itemId);
}

export function getSelectedItem() {
  return state.hotbarSlots[state.activeSlot] ?? null;
}

export function getToolProfile() {
  return TOOL_STATS[getSelectedItem()] ?? TOOL_STATS.hand;
}

export function isCreative() {
  return state.gameMode === "creative";
}

/** Creative hands out unlimited stacks, survival reads the real bag. */
export function getItemCount(itemId) {
  if (itemId == null) {
    return 0;
  }
  if (isCreative()) {
    return CREATIVE_STACK;
  }
  return state.inventory[itemId] ?? 0;
}

export function addItem(itemId, amount = 1) {
  if (itemId == null || isCreative()) {
    return;
  }
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + amount;
}

/** Spends an item, clearing the hotbar slot once the stack runs dry. */
export function consumeItem(itemId, amount = 1) {
  if (itemId == null || isCreative()) {
    return;
  }
  const remaining = Math.max(0, (state.inventory[itemId] ?? 0) - amount);
  state.inventory[itemId] = remaining;
  if (remaining <= 0) {
    for (let index = 0; index < state.hotbarSlots.length; index++) {
      if (state.hotbarSlots[index] === itemId) {
        state.hotbarSlots[index] = null;
      }
    }
  }
}

export function canMineBlock(blockType) {
  if (isCreative()) {
    return true;
  }
  const tool = getToolProfile();
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore) {
    return tool.power >= 1;
  }
  if (blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace) {
    return tool.power >= 2;
  }
  return true;
}

export function getInteractionCooldown(blockType, breaking) {
  if (!breaking) {
    return 0.18;
  }
  if (isCreative()) {
    return 0.1;
  }
  const tool = getToolProfile();
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore || blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace) {
    return 0.48 / tool.speed;
  }
  if (blockType === BLOCKS.wood || blockType === BLOCKS.pine_wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
    return 0.26;
  }
  return 0.14;
}

export function getBreakHardness(blockType) {
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore) {
    return 5.4;
  }
  if (blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace) {
    return 7.2;
  }
  if (blockType === BLOCKS.wood || blockType === BLOCKS.pine_wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
    return 3.8;
  }
  if (blockType === BLOCKS.bricks) {
    return 5.8;
  }
  if (blockType === BLOCKS.leaves || blockType === BLOCKS.pine_leaves || blockType === BLOCKS.glass || blockType === BLOCKS.ice) {
    return 1.8;
  }
  return 2.2;
}

export function getBreakDamage(blockType) {
  if (isCreative()) {
    return 999;
  }
  const tool = getToolProfile();
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore || blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace) {
    return 1 + tool.speed * 0.68;
  }
  if (blockType === BLOCKS.wood || blockType === BLOCKS.pine_wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
    return 0.95 + tool.speed * 0.4;
  }
  return 1 + tool.speed * 0.3;
}

export function getDropForBlock(blockType) {
  if (blockType === BLOCKS.leaves || blockType === BLOCKS.pine_leaves) {
    return Math.random() > 0.72 ? ITEMS.stick : null;
  }
  if (blockType === BLOCKS.coal_ore) {
    return ITEMS.coal;
  }
  if (blockType === BLOCKS.iron_ore) {
    return BLOCKS.iron_ore;
  }
  return blockType;
}
