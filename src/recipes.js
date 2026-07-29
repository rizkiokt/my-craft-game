// Crafting and smelting tables.

import { BLOCKS, ITEMS } from "./constants.js";
export const HAND_RECIPES = [
  {
    id: "planks",
    output: BLOCKS.planks,
    count: 4,
    pattern: [
      [BLOCKS.wood, null],
      [null, null],
    ],
    ingredients: { [BLOCKS.wood]: 1 },
    description: "Saw a log into planks.",
  },
  {
    id: "pine_planks",
    output: BLOCKS.planks,
    count: 4,
    pattern: [
      [BLOCKS.pine_wood, null],
      [null, null],
    ],
    ingredients: { [BLOCKS.pine_wood]: 1 },
    description: "Saw a pine log into planks.",
  },
  {
    id: "sticks",
    output: ITEMS.stick,
    count: 4,
    pattern: [
      [BLOCKS.planks, null],
      [BLOCKS.planks, null],
    ],
    ingredients: { [BLOCKS.planks]: 2 },
    description: "Shape planks into sticks.",
  },
];

export const TABLE_RECIPES = [
  {
    id: "crafting_table",
    output: BLOCKS.crafting_table,
    count: 1,
    pattern: [
      [BLOCKS.planks, BLOCKS.planks, null],
      [BLOCKS.planks, BLOCKS.planks, null],
      [null, null, null],
    ],
    ingredients: { [BLOCKS.planks]: 4 },
    description: "Unlock bigger recipes.",
  },
  {
    id: "furnace",
    output: BLOCKS.furnace,
    count: 1,
    pattern: [
      [BLOCKS.stone, BLOCKS.stone, BLOCKS.stone],
      [BLOCKS.stone, null, BLOCKS.stone],
      [BLOCKS.stone, BLOCKS.stone, BLOCKS.stone],
    ],
    ingredients: { [BLOCKS.stone]: 8 },
    description: "Smelt sand and ore.",
  },
  {
    id: "wood_pickaxe",
    output: ITEMS.wood_pickaxe,
    count: 1,
    pattern: [
      [BLOCKS.planks, BLOCKS.planks, BLOCKS.planks],
      [null, ITEMS.stick, null],
      [null, ITEMS.stick, null],
    ],
    ingredients: { [BLOCKS.planks]: 3, [ITEMS.stick]: 2 },
    description: "Break stone and coal ore faster.",
  },
  {
    id: "stone_pickaxe",
    output: ITEMS.stone_pickaxe,
    count: 1,
    pattern: [
      [BLOCKS.stone, BLOCKS.stone, BLOCKS.stone],
      [null, ITEMS.stick, null],
      [null, ITEMS.stick, null],
    ],
    ingredients: { [BLOCKS.stone]: 3, [ITEMS.stick]: 2 },
    description: "Mine iron ore and tougher blocks.",
  },
  {
    id: "bricks",
    output: BLOCKS.bricks,
    count: 4,
    pattern: [
      [BLOCKS.stone, BLOCKS.stone, null],
      [BLOCKS.sand, BLOCKS.sand, null],
      [null, null, null],
    ],
    ingredients: { [BLOCKS.stone]: 2, [BLOCKS.sand]: 2 },
    description: "Decorative masonry block.",
  },
  {
    id: "iron_pickaxe",
    output: ITEMS.iron_pickaxe,
    count: 1,
    pattern: [
      [ITEMS.iron_ingot, ITEMS.iron_ingot, ITEMS.iron_ingot],
      [null, ITEMS.stick, null],
      [null, ITEMS.stick, null],
    ],
    ingredients: { [ITEMS.iron_ingot]: 3, [ITEMS.stick]: 2 },
    description: "Forge a sturdier pickaxe.",
  },
  {
    id: "diamond_pickaxe",
    output: ITEMS.diamond_pickaxe,
    count: 1,
    pattern: [
      [ITEMS.diamond, ITEMS.diamond, ITEMS.diamond],
      [null, ITEMS.stick, null],
      [null, ITEMS.stick, null],
    ],
    ingredients: { [ITEMS.diamond]: 3, [ITEMS.stick]: 2 },
    description: "Cut a pickaxe from diamonds.",
  },
  {
    id: "netherite_pickaxe",
    output: ITEMS.netherite_pickaxe,
    count: 1,
    pattern: [
      [ITEMS.netherite_ingot, ITEMS.diamond_pickaxe, null],
      [null, null, null],
      [null, null, null],
    ],
    ingredients: { [ITEMS.netherite_ingot]: 1, [ITEMS.diamond_pickaxe]: 1 },
    description: "Upgrade a diamond pickaxe with netherite.",
  },
  {
    id: "netherite_ingot",
    output: ITEMS.netherite_ingot,
    count: 1,
    pattern: [
      [ITEMS.netherite_scrap, ITEMS.netherite_scrap, null],
      [ITEMS.netherite_scrap, ITEMS.netherite_scrap, null],
      [null, null, null],
    ],
    ingredients: { [ITEMS.netherite_scrap]: 4 },
    description: "Fuse scrap into an ingot.",
  },
  {
    id: "enchanting_table",
    output: BLOCKS.enchanting_table,
    count: 1,
    pattern: [
      [null, ITEMS.diamond, null],
      [ITEMS.diamond, BLOCKS.bricks, ITEMS.diamond],
      [BLOCKS.bricks, BLOCKS.bricks, BLOCKS.bricks],
    ],
    ingredients: { [ITEMS.diamond]: 3, [BLOCKS.bricks]: 4 },
    description: "Build a table to enchant your gear.",
  },
];

export const FURNACE_RECIPES = [
  {
    id: "glass",
    output: BLOCKS.glass,
    count: 2,
    input: BLOCKS.sand,
    fuel: ITEMS.coal,
    fuelCount: 1,
    inputCount: 2,
    description: "Smelt sand into glass.",
  },
  {
    id: "iron_ingot",
    output: ITEMS.iron_ingot,
    count: 1,
    input: BLOCKS.iron_ore,
    fuel: ITEMS.coal,
    fuelCount: 1,
    inputCount: 1,
    description: "Refine iron ore into ingots.",
  },
  {
    id: "netherite_scrap",
    output: ITEMS.netherite_scrap,
    count: 1,
    input: BLOCKS.ancient_debris,
    fuel: ITEMS.coal,
    fuelCount: 1,
    inputCount: 1,
    description: "Cook debris down to scrap.",
  },
];
