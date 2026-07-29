// Tuning values, block/item tables and world layout plans.

export const CHUNK_SIZE = 16;
export const DEFAULT_RENDER_DISTANCE = 2;
export const MIN_RENDER_DISTANCE = 1;
export const MAX_RENDER_DISTANCE = 5;
export const CAMERA_HEIGHT = 1.62;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.34;
export const GRAVITY = 24;
export const MOVE_SPEED = 5.8;
export const SPRINT_MULTIPLIER = 1.35;
export const SNEAK_MULTIPLIER = 0.32;
export const SNEAK_CAMERA_DROP = 0.22;
export const FLY_SPEED = 10.4;
export const FLY_BOOST_MULTIPLIER = 2.1;
export const FLY_VERTICAL_SPEED = 7.2;
export const JUMP_SPEED = 8.8;
export const BASE_LOOK_SENSITIVITY = 0.0022;
export const DOUBLE_TAP_WINDOW = 0.32;
export const MAX_STEP_HEIGHT = 0.6;
export const INTERACTION_RANGE = 5.2;
export const THIRD_PERSON_DISTANCE = 4.2;
export const FIXED_STEP = 1 / 60;
export const MAX_BUILD_HEIGHT = 48;
export const MIN_WORLD_Y = -2;
export const MAX_WORLD_Y = 64;
export const CLOUD_COUNT = 18;
export const PARTICLE_POOL_SIZE = 192;
export const BREAK_RESET_TIME = 1.15;
export const PI = Math.PI;

export const BLOCKS = {
  air: 0,
  grass: 1,
  dirt: 2,
  stone: 3,
  sand: 4,
  wood: 5,
  leaves: 6,
  planks: 7,
  bricks: 8,
  glass: 9,
  water: 10,
  coal_ore: 11,
  iron_ore: 12,
  crafting_table: 13,
  furnace: 14,
  snow: 15,
  ice: 16,
  pine_wood: 17,
  pine_leaves: 18,
};

export const ITEMS = {
  stick: 101,
  coal: 102,
  iron_ingot: 103,
  wood_pickaxe: 104,
  stone_pickaxe: 105,
};

export const BLOCK_NAMES = {
  [BLOCKS.air]: "Air",
  [BLOCKS.grass]: "Grass",
  [BLOCKS.dirt]: "Dirt",
  [BLOCKS.stone]: "Stone",
  [BLOCKS.sand]: "Sand",
  [BLOCKS.wood]: "Wood",
  [BLOCKS.leaves]: "Leaves",
  [BLOCKS.planks]: "Planks",
  [BLOCKS.bricks]: "Bricks",
  [BLOCKS.glass]: "Glass",
  [BLOCKS.water]: "Water",
  [BLOCKS.coal_ore]: "Coal Ore",
  [BLOCKS.iron_ore]: "Iron Ore",
  [BLOCKS.crafting_table]: "Crafting Table",
  [BLOCKS.furnace]: "Furnace",
  [BLOCKS.snow]: "Snow",
  [BLOCKS.ice]: "Ice",
  [BLOCKS.pine_wood]: "Pine Wood",
  [BLOCKS.pine_leaves]: "Pine Leaves",
  [ITEMS.stick]: "Stick",
  [ITEMS.coal]: "Coal",
  [ITEMS.iron_ingot]: "Iron Ingot",
  [ITEMS.wood_pickaxe]: "Wood Pickaxe",
  [ITEMS.stone_pickaxe]: "Stone Pickaxe",
};

export const PLACEABLE_BLOCKS = [
  BLOCKS.crafting_table,
  BLOCKS.furnace,
  BLOCKS.grass,
  BLOCKS.dirt,
  BLOCKS.stone,
  BLOCKS.wood,
  BLOCKS.pine_wood,
  BLOCKS.planks,
  BLOCKS.sand,
  BLOCKS.bricks,
  BLOCKS.glass,
  BLOCKS.snow,
  BLOCKS.ice,
  BLOCKS.leaves,
  BLOCKS.pine_leaves,
  BLOCKS.coal_ore,
  BLOCKS.iron_ore,
];

/** Everything the creative palette hands out, in build-menu order. */
export const CREATIVE_ITEMS = [
  BLOCKS.grass,
  BLOCKS.dirt,
  BLOCKS.stone,
  BLOCKS.sand,
  BLOCKS.snow,
  BLOCKS.ice,
  BLOCKS.wood,
  BLOCKS.pine_wood,
  BLOCKS.planks,
  BLOCKS.leaves,
  BLOCKS.pine_leaves,
  BLOCKS.bricks,
  BLOCKS.glass,
  BLOCKS.coal_ore,
  BLOCKS.iron_ore,
  BLOCKS.crafting_table,
  BLOCKS.furnace,
  ITEMS.stick,
  ITEMS.coal,
  ITEMS.iron_ingot,
  ITEMS.wood_pickaxe,
  ITEMS.stone_pickaxe,
];

export const HOTBAR_SIZE = 9;
export const CREATIVE_STACK = 999;
export const WATER_LEVEL = 7;
export const SAVE_KEY = "mycraft-save-v2";
export const SETTINGS_KEY = "mycraft-settings-v1";
export const BINDINGS_KEY = "mycraft-controls-v1";
export const CITY_PLAN = {
  minX: -8,
  maxX: 44,
  minZ: -40,
  maxZ: 12,
  baseHeight: 11,
  roadSpacing: 12,
  roadWidth: 3,
};
export const SUBURB_PLAN = {
  minX: -20,
  maxX: 56,
  minZ: -52,
  maxZ: 24,
};
export const SNOW_REALM = {
  minX: 72,
  maxX: 152,
  minZ: 24,
  maxZ: 108,
  baseHeight: 14,
  pathSpacing: 16,
  pathWidth: 3,
};
export const DEFAULT_SPAWN = {
  x: 4.5,
  z: -1.5,
  yaw: -1.15,
  pitch: -0.28,
};

export const TOOL_STATS = {
  hand: { power: 0, speed: 1 },
  [ITEMS.wood_pickaxe]: { power: 1, speed: 2.8 },
  [ITEMS.stone_pickaxe]: { power: 2, speed: 4 },
};

export const FACE_DEFS = [
  {
    key: "px",
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    key: "nx",
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    key: "py",
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    key: "ny",
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    key: "pz",
    normal: [0, 0, 1],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
  },
  {
    key: "nz",
    normal: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
];
