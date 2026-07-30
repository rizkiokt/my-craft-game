// Item identity, stack maths and mining rules.

import { BLOCKS, BLOCK_TIER, CREATIVE_STACK, ITEMS, PLACEABLE_BLOCKS, TOOL_STATS } from "./constants.js";
import { getHeldEnchantLevel } from "./enchanting.js";
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
  return getToolProfile().power >= (BLOCK_TIER[blockType] ?? 0);
}

/** The pickaxe a block needs, for the "need a better tool" message. */
export function getRequiredToolName(blockType) {
  const tier = BLOCK_TIER[blockType] ?? 0;
  const names = ["hands", "Wood Pickaxe", "Stone Pickaxe", "Iron Pickaxe", "Diamond Pickaxe", "Netherite Pickaxe"];
  return names[tier] ?? names[0];
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
  if (blockType === BLOCKS.diamond_ore) {
    return 8.4;
  }
  if (blockType === BLOCKS.ancient_debris) {
    return 12;
  }
  if (blockType === BLOCKS.enchanting_table) {
    return 9;
  }
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore) {
    return 5.4;
  }
  if (blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace) {
    return 7.2;
  }
  if (blockType === BLOCKS.wood || blockType === BLOCKS.pine_wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
    return 3.8;
  }
  if (blockType === BLOCKS.bricks || blockType === BLOCKS.red_rock) {
    return 5.8;
  }
  if (blockType === BLOCKS.netherrack) {
    return 3.2;
  }
  if (blockType === BLOCKS.glowstone) {
    return 2.6;
  }
  if (blockType === BLOCKS.portal_frame) {
    return 6.4;
  }
  if (blockType === BLOCKS.cactus || blockType === BLOCKS.mud) {
    return 1.6;
  }
  if (blockType === BLOCKS.tnt || blockType === BLOCKS.super_tnt
    || blockType === BLOCKS.fire_tnt) {
    return 1.2;
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
  // Efficiency adds a flat speed bonus on top of the tool's own rate.
  const efficiency = 1 + getHeldEnchantLevel("efficiency") * 0.3;
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore || blockType === BLOCKS.iron_ore
    || blockType === BLOCKS.furnace || blockType === BLOCKS.diamond_ore || blockType === BLOCKS.ancient_debris
    || blockType === BLOCKS.red_rock || blockType === BLOCKS.netherrack || blockType === BLOCKS.portal_frame) {
    return (1 + tool.speed * 0.68) * efficiency;
  }
  if (blockType === BLOCKS.wood || blockType === BLOCKS.pine_wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
    return (0.95 + tool.speed * 0.4) * efficiency;
  }
  return (1 + tool.speed * 0.3) * efficiency;
}

export function getDropForBlock(blockType) {
  if (blockType === BLOCKS.portal) {
    return null;
  }
  if (blockType === BLOCKS.leaves || blockType === BLOCKS.pine_leaves) {
    return Math.random() > 0.72 ? ITEMS.stick : null;
  }
  if (blockType === BLOCKS.coal_ore) {
    return ITEMS.coal;
  }
  if (blockType === BLOCKS.diamond_ore) {
    return ITEMS.diamond;
  }
  return blockType;
}

/** Fortune rolls extra drops, but only from ores. */
export function getDropCount(blockType) {
  const fortune = getHeldEnchantLevel("fortune");
  const isOre = blockType === BLOCKS.coal_ore
    || blockType === BLOCKS.iron_ore
    || blockType === BLOCKS.diamond_ore
    || blockType === BLOCKS.ancient_debris;
  if (!fortune || !isOre) {
    return 1;
  }
  // Same shape as Minecraft: a chance at up to `fortune` extra drops.
  return 1 + Math.floor(Math.random() * (fortune + 1));
}
