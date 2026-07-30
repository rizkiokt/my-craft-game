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
/* Swimming: buoyant enough to hold you up, slow enough to feel like water. */
export const SWIM_GRAVITY_SCALE = 0.26;
export const SWIM_SINK_SPEED = -2.4;
export const SWIM_RISE_SPEED = 3.4;
export const SWIM_MOVE_SCALE = 0.58;
export const SWIM_JUMP_OUT = 5.6;
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
  diamond_ore: 19,
  ancient_debris: 20,
  enchanting_table: 21,
  chest: 22,
  torch: 23,
  cactus: 24,
  red_sand: 25,
  red_rock: 26,
  mud: 27,
  netherrack: 28,
  glowstone: 29,
  lava: 30,
  portal_frame: 31,
  portal: 32,
  tnt: 33,
};

export const ITEMS = {
  stick: 101,
  coal: 102,
  iron_ingot: 103,
  wood_pickaxe: 104,
  stone_pickaxe: 105,
  iron_pickaxe: 106,
  diamond: 107,
  diamond_pickaxe: 108,
  netherite_scrap: 109,
  netherite_ingot: 110,
  netherite_pickaxe: 111,
  iron_helmet: 120,
  iron_chestplate: 121,
  iron_leggings: 122,
  iron_boots: 123,
  diamond_helmet: 124,
  diamond_chestplate: 125,
  diamond_leggings: 126,
  diamond_boots: 127,
  netherite_helmet: 128,
  netherite_chestplate: 129,
  netherite_leggings: 130,
  netherite_boots: 131,
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
  [BLOCKS.diamond_ore]: "Diamond Ore",
  [BLOCKS.ancient_debris]: "Ancient Debris",
  [BLOCKS.enchanting_table]: "Enchanting Table",
  [BLOCKS.chest]: "Chest",
  [BLOCKS.torch]: "Torch",
  [BLOCKS.cactus]: "Cactus",
  [BLOCKS.red_sand]: "Red Sand",
  [BLOCKS.red_rock]: "Red Rock",
  [BLOCKS.mud]: "Mud",
  [BLOCKS.netherrack]: "Netherrack",
  [BLOCKS.glowstone]: "Glowstone",
  [BLOCKS.lava]: "Lava",
  [BLOCKS.portal_frame]: "Portal Frame",
  [BLOCKS.portal]: "Portal",
  [BLOCKS.tnt]: "TNT",
  [ITEMS.stick]: "Stick",
  [ITEMS.coal]: "Coal",
  [ITEMS.iron_ingot]: "Iron Ingot",
  [ITEMS.wood_pickaxe]: "Wood Pickaxe",
  [ITEMS.stone_pickaxe]: "Stone Pickaxe",
  [ITEMS.iron_pickaxe]: "Iron Pickaxe",
  [ITEMS.diamond]: "Diamond",
  [ITEMS.diamond_pickaxe]: "Diamond Pickaxe",
  [ITEMS.netherite_scrap]: "Netherite Scrap",
  [ITEMS.netherite_ingot]: "Netherite Ingot",
  [ITEMS.netherite_pickaxe]: "Netherite Pickaxe",
  [ITEMS.iron_helmet]: "Iron Helmet",
  [ITEMS.iron_chestplate]: "Iron Chestplate",
  [ITEMS.iron_leggings]: "Iron Leggings",
  [ITEMS.iron_boots]: "Iron Boots",
  [ITEMS.diamond_helmet]: "Diamond Helmet",
  [ITEMS.diamond_chestplate]: "Diamond Chestplate",
  [ITEMS.diamond_leggings]: "Diamond Leggings",
  [ITEMS.diamond_boots]: "Diamond Boots",
  [ITEMS.netherite_helmet]: "Netherite Helmet",
  [ITEMS.netherite_chestplate]: "Netherite Chestplate",
  [ITEMS.netherite_leggings]: "Netherite Leggings",
  [ITEMS.netherite_boots]: "Netherite Boots",
};

/* ------------------------------------------------------------------ *
 * Armour
 *
 * Slot, defence points and tier colour for every wearable piece. Points
 * follow Minecraft, and damage reduction is 4% per point (capped at 80%).
 * ------------------------------------------------------------------ */

export const ARMOR_SLOTS = ["helmet", "chestplate", "leggings", "boots"];

export const ARMOR_ITEMS = {
  [ITEMS.iron_helmet]: { slot: "helmet", points: 2, tier: "iron", color: 0xd8dce2 },
  [ITEMS.iron_chestplate]: { slot: "chestplate", points: 6, tier: "iron", color: 0xd8dce2 },
  [ITEMS.iron_leggings]: { slot: "leggings", points: 5, tier: "iron", color: 0xd8dce2 },
  [ITEMS.iron_boots]: { slot: "boots", points: 2, tier: "iron", color: 0xd8dce2 },
  [ITEMS.diamond_helmet]: { slot: "helmet", points: 3, tier: "diamond", color: 0x63e6db },
  [ITEMS.diamond_chestplate]: { slot: "chestplate", points: 8, tier: "diamond", color: 0x63e6db },
  [ITEMS.diamond_leggings]: { slot: "leggings", points: 6, tier: "diamond", color: 0x63e6db },
  [ITEMS.diamond_boots]: { slot: "boots", points: 3, tier: "diamond", color: 0x63e6db },
  [ITEMS.netherite_helmet]: { slot: "helmet", points: 3, tier: "netherite", color: 0x6b5b58 },
  [ITEMS.netherite_chestplate]: { slot: "chestplate", points: 8, tier: "netherite", color: 0x6b5b58 },
  [ITEMS.netherite_leggings]: { slot: "leggings", points: 6, tier: "netherite", color: 0x6b5b58 },
  [ITEMS.netherite_boots]: { slot: "boots", points: 3, tier: "netherite", color: 0x6b5b58 },
};

export const ARMOR_SLOT_LABELS = {
  helmet: "Helmet",
  chestplate: "Chestplate",
  leggings: "Leggings",
  boots: "Boots",
};

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */

/** How close a tamed cat trails you, and when it gives up and catches up. */
export const CAT_CURIOUS_DISTANCE = 4.5;
/** How closely a friend walks with you, and when they catch up. */
export const NPC_FOLLOW_DISTANCE = 2.8;
export const NPC_TELEPORT_DISTANCE = 24;
export const PET_FOLLOW_DISTANCE = 2.4;
export const PET_TELEPORT_DISTANCE = 18;

/* ------------------------------------------------------------------ *
 * Lighting
 * ------------------------------------------------------------------ */

export const MAX_LIGHT = 15;
export const TORCH_LIGHT = 14;
/** Vertical span the light volume covers, matching the build limits. */
export const LIGHT_MIN_Y = MIN_WORLD_Y;
export const LIGHT_MAX_Y = MAX_BUILD_HEIGHT + 1;
export const LIGHT_HEIGHT = LIGHT_MAX_Y - LIGHT_MIN_Y + 1;
/** How dark an unlit block gets; never fully black, so caves stay playable. */
export const MIN_LIGHT_FACTOR = 0.16;

/** Slots in a chest: three rows of nine, as in Minecraft. */
export const CHEST_SIZE = 27;

export const MAX_HEALTH = 20;
/** The level at which the player has finished growing to twice their height. */
export const GROWTH_MAX_LEVEL = 100;

/*
 * Hearts climb faster than height, and further: one extra heart every two
 * levels, so twenty by level 20, on up to a ceiling of fifty at level 80.
 */
export const BASE_HEARTS = MAX_HEALTH / 2;
export const HEARTS_PER_LEVEL = 0.5;
export const MAX_HEARTS = 50;
export const MAX_AIR = 10;
/** Falls shorter than this never hurt, as in Minecraft. */
export const SAFE_FALL_DISTANCE = 3;
export const REGEN_DELAY = 5;
export const REGEN_INTERVAL = 1.6;
export const DROWN_INTERVAL = 1.2;
/** Lava hurts steadily rather than instantly, so a pool is escapable. */
export const LAVA_INTERVAL = 1;
export const LAVA_DAMAGE = 2;
export const ARMOR_REDUCTION_PER_POINT = 0.04;
export const MAX_ARMOR_REDUCTION = 0.8;

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
  BLOCKS.diamond_ore,
  BLOCKS.ancient_debris,
  BLOCKS.enchanting_table,
  BLOCKS.chest,
  BLOCKS.torch,
  BLOCKS.cactus,
  BLOCKS.red_sand,
  BLOCKS.red_rock,
  BLOCKS.mud,
  BLOCKS.netherrack,
  BLOCKS.glowstone,
  BLOCKS.portal_frame,
  BLOCKS.tnt,
];

/** Everything the creative palette hands out, in build-menu order. */
export const CREATIVE_ITEMS = [
  BLOCKS.grass,
  BLOCKS.dirt,
  BLOCKS.stone,
  BLOCKS.sand,
  BLOCKS.red_sand,
  BLOCKS.red_rock,
  BLOCKS.mud,
  BLOCKS.netherrack,
  BLOCKS.glowstone,
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
  BLOCKS.diamond_ore,
  BLOCKS.ancient_debris,
  BLOCKS.crafting_table,
  BLOCKS.furnace,
  BLOCKS.enchanting_table,
  BLOCKS.chest,
  BLOCKS.torch,
  BLOCKS.cactus,
  BLOCKS.portal_frame,
  BLOCKS.tnt,
  ITEMS.stick,
  ITEMS.coal,
  ITEMS.iron_ingot,
  ITEMS.diamond,
  ITEMS.netherite_scrap,
  ITEMS.netherite_ingot,
  ITEMS.wood_pickaxe,
  ITEMS.stone_pickaxe,
  ITEMS.iron_pickaxe,
  ITEMS.diamond_pickaxe,
  ITEMS.netherite_pickaxe,
  ITEMS.iron_helmet,
  ITEMS.iron_chestplate,
  ITEMS.iron_leggings,
  ITEMS.iron_boots,
  ITEMS.diamond_helmet,
  ITEMS.diamond_chestplate,
  ITEMS.diamond_leggings,
  ITEMS.diamond_boots,
  ITEMS.netherite_helmet,
  ITEMS.netherite_chestplate,
  ITEMS.netherite_leggings,
  ITEMS.netherite_boots,
];

export const HOTBAR_SIZE = 9;
export const CREATIVE_STACK = 999;
export const WATER_LEVEL = 7;
export const SAVE_KEY = "mycraft-save-v2";
export const SETTINGS_KEY = "mycraft-settings-v1";
export const BINDINGS_KEY = "mycraft-controls-v1";
export const PENDING_SEED_KEY = "mycraft-pending-seed";

/**
 * Named save slots. The bulky payload and the little bit needed to list it are
 * separate keys, so opening the Worlds screen does not parse every megabyte of
 * every world just to print its name.
 */
export const WORLD_KEY_PREFIX = "mycraft-world-";
export const WORLD_INFO_PREFIX = "mycraft-worldinfo-";
/** Stamped into exported files so an unrelated .json is rejected politely. */
export const SAVE_FORMAT = "mycraft-world";
export const SAVE_FORMAT_VERSION = 1;
export const MAX_WORLD_NAME = 28;
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

/* ------------------------------------------------------------------ *
 * Biomes
 *
 * The map is divided into biome patches that carry on forever, picked
 * by a jittered grid of sites rather than noise thresholds: nearest
 * site wins, which gives irregular organic borders instead of stripes.
 * A share of the sites are plain meadow, so ordinary country still
 * separates one biome from the next.
 *
 * The five original hand-placed regions are kept as guaranteed
 * instances, so worlds played before the map went endless still have
 * their desert and their canyon exactly where they were.
 * ------------------------------------------------------------------ */

/** Average width of a biome patch, in blocks. */
export const BIOME_CELL = 128;
/** Blocks over which one patch fades into its neighbour. */
export const BIOME_EDGE = 14;

export const BIOME_TYPES = [
  {
    id: "forest",
    name: "Deep Forest",
    blurb: "Close-packed trees and shady clearings",
    baseHeight: 12, strength: 0.8, weight: 3,
  },
  {
    id: "desert",
    name: "Dune Sea",
    blurb: "Sand, cacti and a green oasis",
    baseHeight: 11, strength: 0.92, weight: 3,
  },
  {
    id: "swamp",
    name: "Murk Fen",
    blurb: "Shallow pools, mud and crooked trees",
    baseHeight: 7, strength: 0.94, weight: 2,
  },
  {
    id: "canyon",
    name: "Red Canyon",
    blurb: "Banded cliffs and standing stone spires",
    baseHeight: 13, strength: 0.95, weight: 2,
  },
  {
    id: "ember",
    name: "Ember Deep",
    blurb: "Glowing caverns roofed in stone, where netherite hides",
    baseHeight: 10, strength: 0.97, weight: 1,
    /** Its terrain glows, so chunks here list their own light sources. */
    emissive: true,
    /** Arriving means arriving inside, not on the hill over the top of it. */
    underground: true,
  },
];

/** How much of the map stays ordinary meadow between the biomes. */
export const MEADOW_WEIGHT = 5;

/**
 * Where the original five sat. Kept so an existing world keeps the ground it
 * had, and so there is always one of each within a walk of spawn.
 */
export const BIOME_ANCHORS = [
  { id: "forest", minX: -112, maxX: -40, minZ: -36, maxZ: 36 },
  { id: "desert", minX: 56, maxX: 136, minZ: -136, maxZ: -56 },
  { id: "swamp", minX: -36, maxX: 44, minZ: 64, maxZ: 144 },
  { id: "canyon", minX: -148, maxX: -68, minZ: 68, maxZ: 148 },
  { id: "ember", minX: -152, maxX: -80, minZ: -160, maxZ: -88 },
];

/**
 * Where a portal can take you. Biomes carry on forever, so those are found by
 * searching for the nearest patch rather than by named coordinates; only the
 * fixed landmarks have an address.
 */
export const FIXED_DESTINATIONS = [
  {
    id: "home",
    name: "Home Meadow",
    blurb: "Where you started",
    x: DEFAULT_SPAWN.x,
    z: DEFAULT_SPAWN.z,
  },
  {
    id: "snow",
    name: "Snow Realm",
    blurb: "Igloos, lodges and frozen water",
    x: 112,
    z: 66,
  },
];

/* ------------------------------------------------------------------ *
 * TNT
 *
 * Wrecks the scenery and nothing else. It cannot hurt the player, the
 * friends, the cats or the sheep -- the worst it does to a person is
 * knock them off their feet.
 * ------------------------------------------------------------------ */

/** Seconds between lighting it and the bang. Long enough to run. */
export const TNT_FUSE = 3.4;
/** How far the blast reaches, before the ragged edge is rolled. */
export const TNT_RADIUS = 4.2;
/** Chance a destroyed block leaves something to pick up. */
export const TNT_DROP_CHANCE = 0.28;
/** Hard cap on drops, so levelling a hillside cannot bury the frame rate. */
export const TNT_MAX_DROPS = 24;
/** How hard the blast shoves you. It does no damage at all. */
export const TNT_PUSH = 13;

/* ------------------------------------------------------------------ *
 * Portals
 * ------------------------------------------------------------------ */

/** Inside measurements of a frame, as in Minecraft: 2 wide, 3 tall. */
export const PORTAL_MIN_WIDTH = 2;
export const PORTAL_MIN_HEIGHT = 3;
export const PORTAL_MAX_WIDTH = 4;
export const PORTAL_MAX_HEIGHT = 5;
/** Seconds standing in a portal before it takes you. */
export const PORTAL_DELAY = 1.1;
/** How long you are immune to being pulled straight back after arriving. */
export const PORTAL_COOLDOWN = 3;

export const TOOL_STATS = {
  hand: { power: 0, speed: 1 },
  [ITEMS.wood_pickaxe]: { power: 1, speed: 2.8 },
  [ITEMS.stone_pickaxe]: { power: 2, speed: 4 },
  [ITEMS.iron_pickaxe]: { power: 3, speed: 5.4 },
  [ITEMS.diamond_pickaxe]: { power: 4, speed: 7.2 },
  [ITEMS.netherite_pickaxe]: { power: 5, speed: 9 },
};

/** Mining tier each block demands, checked against a tool's `power`. */
export const BLOCK_TIER = {
  [BLOCKS.stone]: 1,
  [BLOCKS.coal_ore]: 1,
  [BLOCKS.bricks]: 1,
  [BLOCKS.iron_ore]: 2,
  [BLOCKS.furnace]: 2,
  [BLOCKS.diamond_ore]: 3,
  [BLOCKS.enchanting_table]: 3,
  [BLOCKS.ancient_debris]: 4,
  [BLOCKS.red_rock]: 1,
  [BLOCKS.netherrack]: 1,
  [BLOCKS.portal_frame]: 2,
};

/* ------------------------------------------------------------------ *
 * Enchanting
 *
 * Without per-item durability there is nothing for Unbreaking or Mending to
 * act on, so the table offers the enchantments that do have teeth here.
 * ------------------------------------------------------------------ */

export const ENCHANTMENTS = {
  efficiency: { name: "Efficiency", max: 5, applies: "pickaxe", blurb: "Mines faster" },
  fortune: { name: "Fortune", max: 3, applies: "pickaxe", blurb: "Extra ore drops" },
  protection: { name: "Protection", max: 4, applies: "armor", blurb: "Reduces damage taken" },
  feather_falling: { name: "Feather Falling", max: 4, applies: "armor", blurb: "Softens landings" },
};

export const XP_PER_LEVEL = 12;
export const MAX_ENCHANT_LEVEL_COST = 3;

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
