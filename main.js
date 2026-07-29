import * as THREE from "./node_modules/three/build/three.module.js";

const CHUNK_SIZE = 16;
const DEFAULT_RENDER_DISTANCE = 2;
const MIN_RENDER_DISTANCE = 1;
const MAX_RENDER_DISTANCE = 5;
const CAMERA_HEIGHT = 1.62;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.34;
const GRAVITY = 24;
const MOVE_SPEED = 5.8;
const SPRINT_MULTIPLIER = 1.35;
const SNEAK_MULTIPLIER = 0.32;
const SNEAK_CAMERA_DROP = 0.22;
const FLY_SPEED = 10.4;
const FLY_BOOST_MULTIPLIER = 2.1;
const FLY_VERTICAL_SPEED = 7.2;
const JUMP_SPEED = 8.8;
const BASE_LOOK_SENSITIVITY = 0.0022;
const DOUBLE_TAP_WINDOW = 0.32;
const MAX_STEP_HEIGHT = 0.6;
const INTERACTION_RANGE = 5.2;
const THIRD_PERSON_DISTANCE = 4.2;
const FIXED_STEP = 1 / 60;
const MAX_BUILD_HEIGHT = 48;
const MIN_WORLD_Y = -2;
const MAX_WORLD_Y = 64;
const CLOUD_COUNT = 18;
const PARTICLE_POOL_SIZE = 192;
const BREAK_RESET_TIME = 1.15;
const PI = Math.PI;

const canvas = document.getElementById("game");
const hudLayer = document.getElementById("hud-layer");
const hotbar = document.getElementById("hotbar");
const itemNameLabel = document.getElementById("item-name");
const toastLabel = document.getElementById("toast");
const modeBanner = document.getElementById("mode-banner");
const debugOverlay = document.getElementById("debug-overlay");
const debugLeft = document.getElementById("debug-left");
const debugRight = document.getElementById("debug-right");
const inventoryPanel = document.getElementById("inventory-panel");
const inventoryBody = document.getElementById("inventory-body");
const inventoryGrid = document.getElementById("inventory-grid");
const inventoryEyebrow = document.getElementById("inventory-eyebrow");
const inventoryGridTitle = document.getElementById("inventory-grid-title");
const inventoryGridHint = document.getElementById("inventory-grid-hint");
const inventoryRecipeHint = document.getElementById("inventory-recipe-hint");
const recipeList = document.getElementById("recipe-list");
const inventoryClose = document.getElementById("inventory-close");
const deathScreen = document.getElementById("death-screen");
const deathLocationText = document.getElementById("death-location");
const respawnBtn = document.getElementById("respawn-btn");
const deathTitleBtn = document.getElementById("death-title-btn");
const splashLabel = document.getElementById("splash");
const controlsList = document.getElementById("controls-list");
const helpControls = document.getElementById("help-controls");
const pauseModeBtn = document.getElementById("btn-pause-mode");

const screenElements = {
  title: document.getElementById("screen-title"),
  pause: document.getElementById("screen-pause"),
  controls: document.getElementById("screen-controls"),
  options: document.getElementById("screen-options"),
  help: document.getElementById("screen-help"),
};

const BLOCKS = {
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

const ITEMS = {
  stick: 101,
  coal: 102,
  iron_ingot: 103,
  wood_pickaxe: 104,
  stone_pickaxe: 105,
};

const BLOCK_NAMES = {
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

const PLACEABLE_BLOCKS = [
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
const CREATIVE_ITEMS = [
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

const HOTBAR_SIZE = 9;
const CREATIVE_STACK = 999;
const WATER_LEVEL = 7;
const SAVE_KEY = "mycraft-save-v2";
const SETTINGS_KEY = "mycraft-settings-v1";
const BINDINGS_KEY = "mycraft-controls-v1";
const CITY_PLAN = {
  minX: -8,
  maxX: 44,
  minZ: -40,
  maxZ: 12,
  baseHeight: 11,
  roadSpacing: 12,
  roadWidth: 3,
};
const SUBURB_PLAN = {
  minX: -20,
  maxX: 56,
  minZ: -52,
  maxZ: 24,
};
const SNOW_REALM = {
  minX: 72,
  maxX: 152,
  minZ: 24,
  maxZ: 108,
  baseHeight: 14,
  pathSpacing: 16,
  pathWidth: 3,
};
const DEFAULT_SPAWN = {
  x: 4.5,
  z: -1.5,
  yaw: -1.15,
  pitch: -0.28,
};

/* ------------------------------------------------------------------ *
 * Controls
 *
 * A binding is a single token: either a KeyboardEvent.code ("KeyW") or a
 * MouseEvent.button prefixed with "Mouse" ("Mouse0" left, "Mouse1" middle,
 * "Mouse2" right). Defaults mirror Minecraft Java Edition and every one of
 * them is rebindable from the Controls screen.
 * ------------------------------------------------------------------ */

const DEFAULT_BINDINGS = {
  forward: "KeyW",
  left: "KeyA",
  back: "KeyS",
  right: "KeyD",
  jump: "Space",
  sneak: "ShiftLeft",
  sprint: "ControlLeft",
  attack: "Mouse0",
  use: "Mouse2",
  pick: "Mouse1",
  drop: "KeyQ",
  inventory: "KeyE",
  hotbar1: "Digit1",
  hotbar2: "Digit2",
  hotbar3: "Digit3",
  hotbar4: "Digit4",
  hotbar5: "Digit5",
  hotbar6: "Digit6",
  hotbar7: "Digit7",
  hotbar8: "Digit8",
  hotbar9: "Digit9",
  toggleHud: "F1",
  screenshot: "F2",
  debug: "F3",
  gameMode: "F4",
  perspective: "F5",
  fullscreen: "F11",
  pause: "Escape",
};

const BINDING_LABELS = {
  forward: "Walk Forwards",
  left: "Strafe Left",
  back: "Walk Backwards",
  right: "Strafe Right",
  jump: "Jump / Fly Up",
  sneak: "Sneak / Fly Down",
  sprint: "Sprint",
  attack: "Attack / Destroy",
  use: "Use Item / Place Block",
  pick: "Pick Block",
  drop: "Drop Item",
  inventory: "Inventory / Crafting",
  hotbar1: "Hotbar Slot 1",
  hotbar2: "Hotbar Slot 2",
  hotbar3: "Hotbar Slot 3",
  hotbar4: "Hotbar Slot 4",
  hotbar5: "Hotbar Slot 5",
  hotbar6: "Hotbar Slot 6",
  hotbar7: "Hotbar Slot 7",
  hotbar8: "Hotbar Slot 8",
  hotbar9: "Hotbar Slot 9",
  toggleHud: "Toggle HUD",
  screenshot: "Take Screenshot",
  debug: "Debug Info",
  gameMode: "Switch Game Mode",
  perspective: "Toggle Perspective",
  fullscreen: "Toggle Fullscreen",
  pause: "Pause / Back",
};

const BINDING_GROUPS = [
  {
    title: "Movement",
    actions: ["forward", "left", "back", "right", "jump", "sneak", "sprint"],
  },
  {
    title: "Gameplay",
    actions: ["attack", "use", "pick", "drop", "inventory"],
  },
  {
    title: "Hotbar",
    actions: [
      "hotbar1", "hotbar2", "hotbar3", "hotbar4", "hotbar5",
      "hotbar6", "hotbar7", "hotbar8", "hotbar9",
    ],
  },
  {
    title: "Display",
    actions: ["toggleHud", "screenshot", "debug", "gameMode", "perspective", "fullscreen", "pause"],
  },
];

/** Actions the player may not rebind (the browser owns them too). */
const FIXED_BINDINGS = new Set(["pause"]);

/** Right-hand modifiers fall through to their left twin unless bound. */
const TOKEN_ALIASES = {
  ShiftRight: "ShiftLeft",
  ControlRight: "ControlLeft",
  AltRight: "AltLeft",
  MetaRight: "MetaLeft",
};

const KEY_LABELS = {
  Space: "Space",
  Escape: "Esc",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  CapsLock: "Caps Lock",
  ShiftLeft: "Left Shift",
  ShiftRight: "Right Shift",
  ControlLeft: "Left Ctrl",
  ControlRight: "Right Ctrl",
  AltLeft: "Left Alt",
  AltRight: "Right Alt",
  MetaLeft: "Left Meta",
  MetaRight: "Right Meta",
  ArrowUp: "Up Arrow",
  ArrowDown: "Down Arrow",
  ArrowLeft: "Left Arrow",
  ArrowRight: "Right Arrow",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Backslash: "\\",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

const MOUSE_LABELS = ["Left Button", "Middle Button", "Right Button"];

const bindings = { ...DEFAULT_BINDINGS };

const DEFAULT_SETTINGS = {
  sensitivity: 100,
  fov: 75,
  volume: 100,
  renderDistance: DEFAULT_RENDER_DISTANCE,
  invertMouse: false,
  viewBobbing: true,
  autosave: true,
};

const settings = { ...DEFAULT_SETTINGS };

function loadBindings() {
  try {
    const raw = localStorage.getItem(BINDINGS_KEY);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    for (const action of Object.keys(DEFAULT_BINDINGS)) {
      if (FIXED_BINDINGS.has(action)) {
        continue;
      }
      if (typeof saved?.[action] === "string" || saved?.[action] === null) {
        bindings[action] = saved[action];
      }
    }
  } catch {
    /* corrupt binding data just falls back to defaults */
  }
}

function saveBindings() {
  try {
    localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    /* storage is optional */
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof saved?.[key] === typeof DEFAULT_SETTINGS[key]) {
        settings[key] = saved[key];
      }
    }
    settings.renderDistance = clamp(
      Math.round(settings.renderDistance),
      MIN_RENDER_DISTANCE,
      MAX_RENDER_DISTANCE,
    );
  } catch {
    /* corrupt settings just fall back to defaults */
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage is optional */
  }
}

function mouseToken(button) {
  return `Mouse${button}`;
}

/** Human readable name for a binding token, e.g. "Left Shift" or "W". */
function describeToken(token) {
  if (!token) {
    return "None";
  }
  if (token.startsWith("Mouse")) {
    const index = Number(token.slice(5));
    return MOUSE_LABELS[index] ?? `Button ${index + 1}`;
  }
  if (KEY_LABELS[token]) {
    return KEY_LABELS[token];
  }
  if (token.startsWith("Key")) {
    return token.slice(3);
  }
  if (token.startsWith("Digit")) {
    return token.slice(5);
  }
  if (token.startsWith("Numpad")) {
    return `Keypad ${token.slice(6)}`;
  }
  return token;
}

function isTokenBound(token) {
  return Object.values(bindings).includes(token);
}

/** Maps Right Shift onto Left Shift and friends when the twin is free. */
function canonicalToken(token) {
  const alias = TOKEN_ALIASES[token];
  if (alias && !isTokenBound(token)) {
    return alias;
  }
  return token;
}

function actionsForToken(token) {
  const matches = [];
  for (const [action, bound] of Object.entries(bindings)) {
    if (bound === token) {
      matches.push(action);
    }
  }
  return matches;
}

function findBindingConflicts() {
  const seen = new Map();
  const conflicts = new Set();
  for (const [action, token] of Object.entries(bindings)) {
    if (!token) {
      continue;
    }
    if (seen.has(token)) {
      conflicts.add(action);
      conflicts.add(seen.get(token));
    } else {
      seen.set(token, action);
    }
  }
  return conflicts;
}

/** True while the key/button bound to `action` is held down. */
function isActionDown(action) {
  const token = bindings[action];
  return Boolean(token) && state.keys.has(token);
}

function keyHint(action) {
  return describeToken(bindings[action]);
}

const HAND_RECIPES = [
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

const TABLE_RECIPES = [
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
];

const FURNACE_RECIPES = [
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
];

const TOOL_STATS = {
  hand: { power: 0, speed: 1 },
  [ITEMS.wood_pickaxe]: { power: 1, speed: 2.8 },
  [ITEMS.stone_pickaxe]: { power: 2, speed: 4 },
};

const FACE_DEFS = [
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

const permutation = (() => {
  const source = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247,
    120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57,
    177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229,
    122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102,
    143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89,
    18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173,
    186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255,
    82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223,
    183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155,
    167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
    178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144,
    12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192,
    214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127,
    4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128,
    195, 78, 66, 215, 61, 156, 180,
  ];
  return source.concat(source);
})();

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function grad(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlin2(x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = permutation[permutation[xi] + yi];
  const ab = permutation[permutation[xi] + yi + 1];
  const ba = permutation[permutation[xi + 1] + yi];
  const bb = permutation[permutation[xi + 1] + yi + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fract(value) {
  return value - Math.floor(value);
}

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return fract(s);
}

function floorVector(vector) {
  return {
    x: Math.floor(vector.x),
    y: Math.floor(vector.y),
    z: Math.floor(vector.z),
  };
}

function wrapAngle(angle) {
  const fullTurn = PI * 2;
  return ((((angle + PI) % fullTurn) + fullTurn) % fullTurn) - PI;
}

function lerpAngle(from, to, t) {
  return from + wrapAngle(to - from) * t;
}

function isInsideRect(x, z, rect) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

function chunkIntersectsRect(cx, cz, rect) {
  const minX = cx * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE - 1;
  const minZ = cz * CHUNK_SIZE;
  const maxZ = minZ + CHUNK_SIZE - 1;
  return !(maxX < rect.minX || minX > rect.maxX || maxZ < rect.minZ || minZ > rect.maxZ);
}

function getCityCenter() {
  return {
    x: (CITY_PLAN.minX + CITY_PLAN.maxX) * 0.5,
    z: (CITY_PLAN.minZ + CITY_PLAN.maxZ) * 0.5,
  };
}

function getCityTargetHeight(wx, wz) {
  return CITY_PLAN.baseHeight + Math.round(perlin2(wx / 28 + 17, wz / 28 + 23) * 0.7);
}

function getSnowCenter() {
  return {
    x: (SNOW_REALM.minX + SNOW_REALM.maxX) * 0.5,
    z: (SNOW_REALM.minZ + SNOW_REALM.maxZ) * 0.5,
  };
}

function getSnowTargetHeight(wx, wz) {
  const ridge = Math.abs(perlin2(wx / 32 + 9, wz / 32 + 27)) * 2.8;
  const detail = perlin2(wx / 18 + 3, wz / 18 + 8) * 1.6;
  return SNOW_REALM.baseHeight + Math.round(ridge + detail);
}

function getSnowBlend(wx, wz) {
  return isInsideRect(wx, wz, SNOW_REALM) ? 0.92 : 0;
}

function getSettlementBlend(wx, wz) {
  if (isInsideRect(wx, wz, CITY_PLAN)) {
    return 0.96;
  }
  if (isInsideRect(wx, wz, SUBURB_PLAN)) {
    return 0.58;
  }
  return 0;
}

function getSnowParcel(wx, wz) {
  if (!isInsideRect(wx, wz, SNOW_REALM)) {
    return null;
  }

  const relX = wx - SNOW_REALM.minX;
  const relZ = wz - SNOW_REALM.minZ;
  const spacing = SNOW_REALM.pathSpacing;
  const pathWidth = SNOW_REALM.pathWidth;
  const modX = ((relX % spacing) + spacing) % spacing;
  const modZ = ((relZ % spacing) + spacing) % spacing;
  const pathX = modX < pathWidth;
  const pathZ = modZ < pathWidth;
  const lotX = Math.floor(relX / spacing);
  const lotZ = Math.floor(relZ / spacing);

  if (pathX || pathZ) {
    return {
      kind: "path",
      lotX,
      lotZ,
      modX,
      modZ,
      isIntersection: pathX && pathZ,
    };
  }

  const innerX = modX - pathWidth;
  const innerZ = modZ - pathWidth;
  const seed = hash3(lotX, 211, lotZ);
  const style = seed > 0.74 ? "lodge" : seed > 0.42 ? "hall" : "igloo";
  const width = style === "igloo" ? 7 : style === "hall" ? 8 : 6;
  const depth = style === "igloo" ? 7 : style === "hall" ? 7 : 6;
  const offsetX = 2;
  const offsetZ = style === "hall" ? 3 : 2;
  const footprint =
    innerX >= offsetX &&
    innerX < offsetX + width &&
    innerZ >= offsetZ &&
    innerZ < offsetZ + depth;

  return {
    kind: "lot",
    lotX,
    lotZ,
    innerX,
    innerZ,
    style,
    width,
    depth,
    offsetX,
    offsetZ,
    footprint,
  };
}

function getCityParcel(wx, wz) {
  if (!isInsideRect(wx, wz, CITY_PLAN)) {
    return null;
  }

  const relX = wx - CITY_PLAN.minX;
  const relZ = wz - CITY_PLAN.minZ;
  const spacing = CITY_PLAN.roadSpacing;
  const roadWidth = CITY_PLAN.roadWidth;
  const modX = ((relX % spacing) + spacing) % spacing;
  const modZ = ((relZ % spacing) + spacing) % spacing;
  const roadX = modX < roadWidth;
  const roadZ = modZ < roadWidth;
  const blockX = Math.floor(relX / spacing);
  const blockZ = Math.floor(relZ / spacing);

  if (roadX || roadZ) {
    return {
      kind: "road",
      blockX,
      blockZ,
      relX,
      relZ,
      modX,
      modZ,
      isIntersection: roadX && roadZ,
    };
  }

  const innerX = modX - roadWidth;
  const innerZ = modZ - roadWidth;
  const lotSeed = hash3(blockX, 143, blockZ);
  const style = lotSeed > 0.84
    ? "tower"
    : lotSeed > 0.62
      ? "stepped_tower"
      : lotSeed > 0.42
        ? "townhouse"
        : lotSeed > 0.22
          ? "shop"
          : "house";
  const width = style === "tower" || style === "stepped_tower"
    ? 6 + Math.floor(hash3(blockX, 144, blockZ) * 2)
    : style === "shop"
      ? 7
      : 5 + Math.floor(hash3(blockX, 145, blockZ) * 2);
  const depth = style === "house"
    ? 5 + Math.floor(hash3(blockX, 146, blockZ) * 2)
    : style === "shop"
      ? 6
      : 6 + Math.floor(hash3(blockX, 147, blockZ) * 2);
  const offsetX = 1 + Math.floor(hash3(blockX, 148, blockZ) * Math.max(1, 9 - width - 1));
  const offsetZ = 1 + Math.floor(hash3(blockX, 149, blockZ) * Math.max(1, 9 - depth - 1));
  const stories = style === "tower" || style === "stepped_tower"
    ? 3 + Math.floor(hash3(blockX, 150, blockZ) * 4)
    : style === "townhouse" || style === "shop"
      ? 2 + Math.floor(hash3(blockX, 151, blockZ) * 2)
      : 1 + Math.floor(hash3(blockX, 152, blockZ) * 2);
  const doorSideIndex = Math.floor(hash3(blockX, 153, blockZ) * 4);
  const doorSide = ["north", "east", "south", "west"][doorSideIndex];
  const footprint =
    innerX >= offsetX &&
    innerX < offsetX + width &&
    innerZ >= offsetZ &&
    innerZ < offsetZ + depth;
  const roofStyle = hash3(blockX, 154, blockZ) > 0.5 ? "flat" : "crown";
  const trimColor = hash3(blockX, 155, blockZ);

  return {
    kind: "lot",
    blockX,
    blockZ,
    innerX,
    innerZ,
    footprint,
    style,
    width,
    depth,
    offsetX,
    offsetZ,
    stories,
    lotSeed,
    doorSide,
    roofStyle,
    trimColor,
  };
}

function getSuburbParcel(wx, wz) {
  if (isInsideRect(wx, wz, CITY_PLAN) || !isInsideRect(wx, wz, SUBURB_PLAN)) {
    return null;
  }
  const spacing = 14;
  const relX = wx - SUBURB_PLAN.minX;
  const relZ = wz - SUBURB_PLAN.minZ;
  const cellX = Math.floor(relX / spacing);
  const cellZ = Math.floor(relZ / spacing);
  const localX = ((relX % spacing) + spacing) % spacing;
  const localZ = ((relZ % spacing) + spacing) % spacing;
  const cellSeed = hash3(cellX, 181, cellZ);
  if (cellSeed < 0.56) {
    return null;
  }
  const width = 5 + Math.floor(hash3(cellX, 182, cellZ) * 2);
  const depth = 5 + Math.floor(hash3(cellX, 183, cellZ) * 2);
  const offsetX = 3 + Math.floor(hash3(cellX, 184, cellZ) * 2);
  const offsetZ = 3 + Math.floor(hash3(cellX, 185, cellZ) * 2);
  const footprint =
    localX >= offsetX &&
    localX < offsetX + width &&
    localZ >= offsetZ &&
    localZ < offsetZ + depth;
  return {
    kind: "suburb",
    localX,
    localZ,
    footprint,
    width,
    depth,
    offsetX,
    offsetZ,
    stories: 1 + Math.floor(hash3(cellX, 186, cellZ) * 2),
    doorSide: hash3(cellX, 187, cellZ) > 0.5 ? "south" : "west",
  };
}

function getStructureBlock(wx, wy, wz, height) {
  const cityParcel = getCityParcel(wx, wz);
  const cityFloor = getCityTargetHeight(wx, wz);
  if (cityParcel) {
    if (cityParcel.kind === "road") {
      if (wy === cityFloor || wy === cityFloor - 1) {
        return cityParcel.isIntersection || cityParcel.modX === CITY_PLAN.roadWidth - 1 || cityParcel.modZ === CITY_PLAN.roadWidth - 1
          ? BLOCKS.bricks
          : BLOCKS.stone;
      }
      const lampSpot =
        cityParcel.modX === 1 &&
        cityParcel.modZ === 1 &&
        ((cityParcel.blockX + cityParcel.blockZ) % 2 === 0);
      if (lampSpot) {
        if (wy > cityFloor && wy <= cityFloor + 3) {
          return BLOCKS.wood;
        }
        if (wy === cityFloor + 4 || wy === cityFloor + 5) {
          return BLOCKS.glass;
        }
      }
      return null;
    }

    const parcel = cityParcel;
    const relX = parcel.innerX - parcel.offsetX;
    const relZ = parcel.innerZ - parcel.offsetZ;
    const withinFootprint = parcel.footprint;
    const foundationY = cityFloor;
    const baseY = foundationY + 1;
    const wallHeight = parcel.style === "tower" || parcel.style === "stepped_tower" ? parcel.stories * 3 + 1 : parcel.stories * 3;
    const roofY = baseY + wallHeight;
    const isEdge =
      relX === 0 ||
      relZ === 0 ||
      relX === parcel.width - 1 ||
      relZ === parcel.depth - 1;
    const windowBand = parcel.style === "tower" || parcel.style === "stepped_tower"
      ? wy > baseY && wy < roofY && ((wy - baseY) % 2 === 1)
      : wy === baseY + 1 || (parcel.style !== "house" && wy === baseY + 4);
    const centerX = Math.floor(parcel.width / 2);
    const centerZ = Math.floor(parcel.depth / 2);
    const onDoor =
      (parcel.doorSide === "north" && relZ === 0 && relX === centerX) ||
      (parcel.doorSide === "south" && relZ === parcel.depth - 1 && relX === centerX) ||
      (parcel.doorSide === "west" && relX === 0 && relZ === centerZ) ||
      (parcel.doorSide === "east" && relX === parcel.width - 1 && relZ === centerZ);
    const onWindow = isEdge && windowBand && !onDoor && ((relX + relZ + wy) % 2 === 0);
    const wallBlock =
      parcel.style === "tower" || parcel.style === "stepped_tower"
        ? BLOCKS.bricks
        : parcel.style === "townhouse" || parcel.style === "shop"
          ? BLOCKS.planks
          : BLOCKS.wood;
    const trimBlock = parcel.trimColor > 0.55 ? BLOCKS.stone : BLOCKS.wood;
    const roofBlock = parcel.style === "house" || parcel.style === "shop" ? BLOCKS.planks : BLOCKS.bricks;
    const floorIndex = Math.floor((wy - baseY) / 3);
    const recessedTop =
      parcel.style === "stepped_tower" &&
      floorIndex >= Math.max(1, parcel.stories - 2) &&
      relX >= 1 &&
      relX <= parcel.width - 2 &&
      relZ >= 1 &&
      relZ <= parcel.depth - 2;
    const balconyRing =
      parcel.style === "tower" &&
      floorIndex > 0 &&
      floorIndex < parcel.stories - 1 &&
      (floorIndex % 2 === 0) &&
      (relX === 0 || relX === parcel.width - 1 || relZ === 0 || relZ === parcel.depth - 1);
    const shopAwning =
      parcel.style === "shop" &&
      wy === baseY + 2 &&
      ((parcel.doorSide === "south" && relZ === parcel.depth - 1 && relX > 0 && relX < parcel.width - 1) ||
        (parcel.doorSide === "north" && relZ === 0 && relX > 0 && relX < parcel.width - 1));
    const shopFrontGlass =
      parcel.style === "shop" &&
      wy >= baseY &&
      wy <= baseY + 1 &&
      ((parcel.doorSide === "south" && relZ === parcel.depth - 1 && relX > 0 && relX < parcel.width - 1) ||
        (parcel.doorSide === "north" && relZ === 0 && relX > 0 && relX < parcel.width - 1));

    if (!withinFootprint) {
      if (wy === foundationY && ((parcel.innerX + parcel.innerZ) % 7 === 0)) {
        return BLOCKS.planks;
      }
      return null;
    }
    if (wy === foundationY || wy === foundationY - 1) {
      return parcel.style === "tower" || parcel.style === "stepped_tower" ? BLOCKS.stone : BLOCKS.bricks;
    }
    if (wy >= baseY && wy < roofY) {
      if (recessedTop && !isEdge) {
        return BLOCKS.air;
      }
      if (isEdge) {
        if (onDoor && wy <= baseY + 1) {
          return BLOCKS.air;
        }
        if (shopFrontGlass) {
          return BLOCKS.glass;
        }
        if (onWindow) {
          return BLOCKS.glass;
        }
        if (shopAwning) {
          return BLOCKS.planks;
        }
        if (balconyRing && wy === baseY + floorIndex * 3 + 1) {
          return trimBlock;
        }
        if ((parcel.style === "townhouse" || parcel.style === "shop") && wy === baseY + 2 && ((relX + relZ) % 3 === 0)) {
          return trimBlock;
        }
        return wallBlock;
      }
      if (parcel.style === "shop" && wy === baseY + 2 && relZ === parcel.depth - 2 && relX > 1 && relX < parcel.width - 2) {
        return BLOCKS.air;
      }
      return BLOCKS.air;
    }
    if (wy === roofY) {
      if (parcel.style === "house") {
        const roofInset = Math.min(relX, relZ, parcel.width - 1 - relX, parcel.depth - 1 - relZ);
        return roofInset <= 1 ? BLOCKS.planks : BLOCKS.air;
      }
      if (parcel.style === "shop") {
        return trimBlock;
      }
      return roofBlock;
    }
    if ((parcel.style === "tower" || parcel.style === "stepped_tower") && wy === roofY + 1 && isEdge) {
      return trimBlock;
    }
    if ((parcel.style === "tower" || parcel.style === "stepped_tower") && parcel.roofStyle === "crown" && wy === roofY + 2) {
      const roofInset = Math.min(relX, relZ, parcel.width - 1 - relX, parcel.depth - 1 - relZ);
      return roofInset === 1 ? BLOCKS.glass : BLOCKS.air;
    }
    return null;
  }

  const suburbParcel = getSuburbParcel(wx, wz);
  if (!suburbParcel) {
    return null;
  }

  const suburbFloor = getCityTargetHeight(wx, wz);
  const relX = suburbParcel.localX - suburbParcel.offsetX;
  const relZ = suburbParcel.localZ - suburbParcel.offsetZ;
  const isEdge =
    relX === 0 ||
    relZ === 0 ||
    relX === suburbParcel.width - 1 ||
    relZ === suburbParcel.depth - 1;
  const centerX = Math.floor(suburbParcel.width / 2);
  const centerZ = Math.floor(suburbParcel.depth / 2);
  const onDoor =
    (suburbParcel.doorSide === "south" && relZ === suburbParcel.depth - 1 && relX === centerX) ||
    (suburbParcel.doorSide === "west" && relX === 0 && relZ === centerZ);

  if (!suburbParcel.footprint) {
    return null;
  }
  if (wy === suburbFloor || wy === suburbFloor - 1) {
    return BLOCKS.stone;
  }
  const baseY = suburbFloor + 1;
  const wallHeight = suburbParcel.stories * 3;
  if (wy >= baseY && wy < baseY + wallHeight) {
    if (isEdge) {
      if (onDoor && wy <= baseY + 1) {
        return BLOCKS.air;
      }
      if ((wy === baseY + 1 || wy === baseY + 4) && ((relX + relZ) % 2 === 0) && !onDoor) {
        return BLOCKS.glass;
      }
      return BLOCKS.planks;
    }
    return BLOCKS.air;
  }
  if (wy === baseY + wallHeight) {
    return BLOCKS.wood;
  }

  const snowParcel = getSnowParcel(wx, wz);
  if (!snowParcel) {
    return null;
  }

  const snowFloor = getSnowTargetHeight(wx, wz);
  if (snowParcel.kind === "path") {
    if (wy === snowFloor) {
      return snowParcel.isIntersection || snowParcel.modX === SNOW_REALM.pathWidth - 1 || snowParcel.modZ === SNOW_REALM.pathWidth - 1
        ? BLOCKS.pine_wood
        : BLOCKS.ice;
    }
    if (wy === snowFloor - 1) {
      return BLOCKS.snow;
    }
    const beaconSpot =
      snowParcel.modX === 1 &&
      snowParcel.modZ === 1 &&
      ((snowParcel.lotX + snowParcel.lotZ) % 2 === 0);
    if (beaconSpot) {
      if (wy > snowFloor && wy <= snowFloor + 3) {
        return BLOCKS.pine_wood;
      }
      if (wy === snowFloor + 4 || wy === snowFloor + 5) {
        return BLOCKS.ice;
      }
    }
    return null;
  }

  if (!snowParcel.footprint) {
    return null;
  }

  const relSnowX = snowParcel.innerX - snowParcel.offsetX;
  const relSnowZ = snowParcel.innerZ - snowParcel.offsetZ;
  const snowCenterX = (snowParcel.width - 1) * 0.5;
  const snowCenterZ = (snowParcel.depth - 1) * 0.5;
  const radius = Math.max(Math.abs(relSnowX - snowCenterX), Math.abs(relSnowZ - snowCenterZ));
  const snowBaseY = snowFloor + 1;

  if (snowParcel.style === "igloo") {
    const domeRadius = 3.3;
    const domeHeight = Math.max(0, Math.floor(domeRadius * domeRadius - ((relSnowX - snowCenterX) ** 2 + (relSnowZ - snowCenterZ) ** 2)));
    const shellTop = snowBaseY + domeHeight;
    const shellBottom = snowBaseY;
    const doorway =
      relSnowZ === snowParcel.depth - 1 &&
      (relSnowX === Math.floor(snowCenterX) || relSnowX === Math.ceil(snowCenterX)) &&
      wy <= snowBaseY + 1;
    const windowBand = wy === snowBaseY + 2 && (relSnowX === 1 || relSnowX === snowParcel.width - 2);
    if (wy === snowFloor || wy === snowFloor - 1) {
      return BLOCKS.snow;
    }
    if (wy >= shellBottom && wy <= shellTop) {
      const shellThreshold = wy === shellTop ? 0 : 0.85;
      if (radius >= domeRadius - shellThreshold) {
        if (doorway) {
          return BLOCKS.air;
        }
        if (windowBand) {
          return BLOCKS.ice;
        }
        return BLOCKS.snow;
      }
      return BLOCKS.air;
    }
    return null;
  }

  const edge =
    relSnowX === 0 ||
    relSnowZ === 0 ||
    relSnowX === snowParcel.width - 1 ||
    relSnowZ === snowParcel.depth - 1;
  const snowWallHeight = snowParcel.style === "hall" ? 5 : 4;
  const roofY = snowBaseY + snowWallHeight;
  const door =
    relSnowZ === snowParcel.depth - 1 &&
    (relSnowX === Math.floor(snowCenterX) || relSnowX === Math.ceil(snowCenterX));

  if (wy === snowFloor || wy === snowFloor - 1) {
    return BLOCKS.stone;
  }
  if (wy >= snowBaseY && wy < roofY) {
    if (edge) {
      if (door && wy <= snowBaseY + 1) {
        return BLOCKS.air;
      }
      if ((wy === snowBaseY + 1 || wy === snowBaseY + 3) && !door && (relSnowX + relSnowZ) % 2 === 0) {
        return BLOCKS.ice;
      }
      return relSnowZ === 0 || relSnowZ === snowParcel.depth - 1 ? BLOCKS.pine_wood : BLOCKS.planks;
    }
    return BLOCKS.air;
  }
  if (wy === roofY) {
    const roofInset = Math.min(relSnowX, relSnowZ, snowParcel.width - 1 - relSnowX, snowParcel.depth - 1 - relSnowZ);
    if (snowParcel.style === "hall") {
      return roofInset <= 1 ? BLOCKS.snow : BLOCKS.ice;
    }
    return roofInset <= 1 ? BLOCKS.snow : BLOCKS.air;
  }
  if (snowParcel.style === "hall" && wy === roofY + 1 && edge) {
    return BLOCKS.pine_wood;
  }
  return null;
}

function createTextureSet() {
  const textures = {};
  for (const blockType of [
    BLOCKS.grass,
    BLOCKS.dirt,
    BLOCKS.stone,
    BLOCKS.sand,
    BLOCKS.wood,
    BLOCKS.leaves,
    BLOCKS.planks,
    BLOCKS.bricks,
    BLOCKS.glass,
    BLOCKS.water,
    BLOCKS.coal_ore,
    BLOCKS.iron_ore,
    BLOCKS.crafting_table,
    BLOCKS.furnace,
    BLOCKS.snow,
    BLOCKS.ice,
    BLOCKS.pine_wood,
    BLOCKS.pine_leaves,
  ]) {
    textures[blockType] = {
      top: new Uint8Array(16 * 16 * 3),
      side: new Uint8Array(16 * 16 * 3),
      bottom: new Uint8Array(16 * 16 * 3),
    };
  }

  const paint = (target, x, y, rgb) => {
    const index = (y * 16 + x) * 3;
    target[index] = clamp(Math.round(rgb[0]), 0, 255);
    target[index + 1] = clamp(Math.round(rgb[1]), 0, 255);
    target[index + 2] = clamp(Math.round(rgb[2]), 0, 255);
  };

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const grain = hash3(x, y, 1) * 28 - 14;
      const moss = hash3(x, y, 2) * 24 - 12;
      const rock = hash3(x, y, 3) * 36 - 18;

      paint(textures[BLOCKS.grass].top, x, y, [
        84 + moss,
        140 + grain,
        62 + moss * 0.35,
      ]);

      paint(textures[BLOCKS.grass].bottom, x, y, [
        118 + grain,
        90 + grain * 0.2,
        56 + grain * 0.08,
      ]);

      const grassEdge = y < 4;
      paint(textures[BLOCKS.grass].side, x, y, grassEdge
        ? [80 + moss, 133 + moss * 0.7, 58 + grain * 0.2]
        : [108 + grain, 84 + grain * 0.18, 52 + grain * 0.1]);

      paint(textures[BLOCKS.dirt].top, x, y, [
        118 + grain,
        90 + grain * 0.2,
        56 + grain * 0.08,
      ]);
      paint(textures[BLOCKS.dirt].side, x, y, [
        120 + grain,
        88 + grain * 0.18,
        54 + grain * 0.08,
      ]);
      paint(textures[BLOCKS.dirt].bottom, x, y, [
        112 + grain,
        80 + grain * 0.18,
        50 + grain * 0.08,
      ]);

      paint(textures[BLOCKS.stone].top, x, y, [
        104 + rock,
        108 + rock,
        116 + rock,
      ]);
      paint(textures[BLOCKS.stone].side, x, y, [
        98 + rock,
        102 + rock,
        110 + rock,
      ]);
      paint(textures[BLOCKS.stone].bottom, x, y, [
        88 + rock,
        92 + rock,
        98 + rock,
      ]);

      const sandNoise = hash3(x, y, 4) * 18 - 9;
      paint(textures[BLOCKS.sand].top, x, y, [
        202 + sandNoise,
        189 + sandNoise * 0.7,
        128 + sandNoise * 0.45,
      ]);
      paint(textures[BLOCKS.sand].side, x, y, [
        198 + sandNoise,
        184 + sandNoise * 0.7,
        122 + sandNoise * 0.45,
      ]);
      paint(textures[BLOCKS.sand].bottom, x, y, [
        188 + sandNoise,
        172 + sandNoise * 0.7,
        114 + sandNoise * 0.45,
      ]);

      const barkNoise = hash3(x, y, 5) * 22 - 11;
      const ringNoise = hash3(x, y, 6) * 18 - 9;
      paint(textures[BLOCKS.wood].top, x, y, [
        146 + ringNoise,
        106 + ringNoise * 0.65,
        68 + ringNoise * 0.45,
      ]);
      paint(textures[BLOCKS.wood].side, x, y, [
        120 + barkNoise,
        84 + barkNoise * 0.6,
        54 + barkNoise * 0.4,
      ]);
      paint(textures[BLOCKS.wood].bottom, x, y, [
        144 + ringNoise,
        104 + ringNoise * 0.65,
        66 + ringNoise * 0.45,
      ]);

      const leafNoise = hash3(x, y, 7) * 26 - 13;
      paint(textures[BLOCKS.leaves].top, x, y, [
        68 + leafNoise * 0.4,
        126 + leafNoise,
        54 + leafNoise * 0.35,
      ]);
      paint(textures[BLOCKS.leaves].side, x, y, [
        64 + leafNoise * 0.4,
        118 + leafNoise,
        50 + leafNoise * 0.35,
      ]);
      paint(textures[BLOCKS.leaves].bottom, x, y, [
        58 + leafNoise * 0.35,
        104 + leafNoise * 0.85,
        46 + leafNoise * 0.3,
      ]);

      const plankNoise = hash3(x, y, 8) * 18 - 9;
      const seam = y % 4 === 0 ? -18 : 0;
      paint(textures[BLOCKS.planks].top, x, y, [
        171 + plankNoise + seam,
        125 + plankNoise * 0.72 + seam * 0.42,
        74 + plankNoise * 0.45,
      ]);
      paint(textures[BLOCKS.planks].side, x, y, [
        161 + plankNoise + seam,
        116 + plankNoise * 0.72 + seam * 0.42,
        69 + plankNoise * 0.45,
      ]);
      paint(textures[BLOCKS.planks].bottom, x, y, [
        156 + plankNoise + seam,
        111 + plankNoise * 0.72 + seam * 0.42,
        66 + plankNoise * 0.45,
      ]);

      const brickNoise = hash3(x, y, 9) * 14 - 7;
      const mortar = x % 8 === 0 || y % 4 === 0 ? 34 : 0;
      paint(textures[BLOCKS.bricks].top, x, y, [
        168 + brickNoise - mortar,
        78 + brickNoise * 0.45 - mortar,
        56 + brickNoise * 0.35 - mortar,
      ]);
      paint(textures[BLOCKS.bricks].side, x, y, [
        160 + brickNoise - mortar,
        72 + brickNoise * 0.45 - mortar,
        50 + brickNoise * 0.35 - mortar,
      ]);
      paint(textures[BLOCKS.bricks].bottom, x, y, [
        150 + brickNoise - mortar,
        66 + brickNoise * 0.45 - mortar,
        46 + brickNoise * 0.35 - mortar,
      ]);

      const glassNoise = hash3(x, y, 10) * 10 - 5;
      const frame = x % 5 === 0 || y % 5 === 0 ? 28 : 0;
      paint(textures[BLOCKS.glass].top, x, y, [
        186 + glassNoise - frame * 0.3,
        224 + glassNoise - frame * 0.15,
        236 + glassNoise - frame * 0.05,
      ]);
      paint(textures[BLOCKS.glass].side, x, y, [
        172 + glassNoise - frame * 0.3,
        214 + glassNoise - frame * 0.15,
        232 + glassNoise - frame * 0.05,
      ]);
      paint(textures[BLOCKS.glass].bottom, x, y, [
        162 + glassNoise - frame * 0.3,
        204 + glassNoise - frame * 0.15,
        224 + glassNoise - frame * 0.05,
      ]);

      const waterNoise = hash3(x, y, 11) * 18 - 9;
      const ripple = y % 4 === 0 ? 12 : 0;
      paint(textures[BLOCKS.water].top, x, y, [
        46 + waterNoise,
        110 + waterNoise * 0.6 + ripple,
        182 + waterNoise * 0.8 + ripple,
      ]);
      paint(textures[BLOCKS.water].side, x, y, [
        38 + waterNoise,
        94 + waterNoise * 0.6 + ripple,
        168 + waterNoise * 0.8 + ripple,
      ]);
      paint(textures[BLOCKS.water].bottom, x, y, [
        30 + waterNoise,
        76 + waterNoise * 0.6,
        136 + waterNoise * 0.8,
      ]);

      const coalSpark = x % 5 === 0 && y % 5 === 0 ? 28 : 0;
      paint(textures[BLOCKS.coal_ore].top, x, y, [
        102 + rock - coalSpark,
        106 + rock - coalSpark,
        112 + rock - coalSpark,
      ]);
      paint(textures[BLOCKS.coal_ore].side, x, y, [
        94 + rock - coalSpark,
        98 + rock - coalSpark,
        106 + rock - coalSpark,
      ]);
      paint(textures[BLOCKS.coal_ore].bottom, x, y, [
        84 + rock - coalSpark,
        88 + rock - coalSpark,
        94 + rock - coalSpark,
      ]);

      const ironSpark = (x + y) % 6 === 0 ? 32 : 0;
      paint(textures[BLOCKS.iron_ore].top, x, y, [
        132 + rock * 0.45 + ironSpark,
        108 + rock * 0.35 + ironSpark * 0.5,
        90 + rock * 0.25,
      ]);
      paint(textures[BLOCKS.iron_ore].side, x, y, [
        122 + rock * 0.45 + ironSpark,
        100 + rock * 0.35 + ironSpark * 0.5,
        82 + rock * 0.25,
      ]);
      paint(textures[BLOCKS.iron_ore].bottom, x, y, [
        112 + rock * 0.45 + ironSpark,
        92 + rock * 0.35 + ironSpark * 0.5,
        74 + rock * 0.25,
      ]);

      const tableNoise = hash3(x, y, 12) * 14 - 7;
      const gridLine = x % 4 === 0 || y % 4 === 0 ? 20 : 0;
      paint(textures[BLOCKS.crafting_table].top, x, y, [
        166 + tableNoise - gridLine,
        118 + tableNoise * 0.7 - gridLine * 0.45,
        72 + tableNoise * 0.4,
      ]);
      paint(textures[BLOCKS.crafting_table].side, x, y, [
        118 + barkNoise,
        82 + barkNoise * 0.6,
        52 + barkNoise * 0.4,
      ]);
      paint(textures[BLOCKS.crafting_table].bottom, x, y, [
        146 + ringNoise,
        102 + ringNoise * 0.65,
        64 + ringNoise * 0.45,
      ]);

      const furnaceGlow = x > 4 && x < 11 && y > 6 && y < 12 ? 24 : 0;
      paint(textures[BLOCKS.furnace].top, x, y, [
        110 + rock,
        114 + rock,
        122 + rock,
      ]);
      paint(textures[BLOCKS.furnace].side, x, y, [
        98 + rock + furnaceGlow,
        102 + rock + furnaceGlow * 0.65,
        110 + rock,
      ]);
      paint(textures[BLOCKS.furnace].bottom, x, y, [
        92 + rock,
        96 + rock,
        104 + rock,
      ]);

      const snowNoise = hash3(x, y, 13) * 12 - 6;
      const frost = y < 3 ? 8 : 0;
      paint(textures[BLOCKS.snow].top, x, y, [
        230 + snowNoise + frost,
        236 + snowNoise + frost,
        244 + snowNoise,
      ]);
      paint(textures[BLOCKS.snow].side, x, y, [
        y < 4 ? 226 + snowNoise : 192 + snowNoise,
        y < 4 ? 232 + snowNoise : 200 + snowNoise,
        y < 4 ? 240 + snowNoise : 214 + snowNoise,
      ]);
      paint(textures[BLOCKS.snow].bottom, x, y, [
        208 + snowNoise,
        214 + snowNoise,
        224 + snowNoise,
      ]);

      const iceNoise = hash3(x, y, 14) * 10 - 5;
      const crack = x === y || x + y === 15 ? 22 : 0;
      paint(textures[BLOCKS.ice].top, x, y, [
        150 + iceNoise + crack,
        210 + iceNoise + crack * 0.45,
        236 + iceNoise + crack * 0.25,
      ]);
      paint(textures[BLOCKS.ice].side, x, y, [
        140 + iceNoise + crack,
        198 + iceNoise + crack * 0.45,
        228 + iceNoise + crack * 0.25,
      ]);
      paint(textures[BLOCKS.ice].bottom, x, y, [
        132 + iceNoise,
        186 + iceNoise,
        220 + iceNoise,
      ]);

      const pineBark = hash3(x, y, 15) * 18 - 9;
      const pineRing = hash3(x, y, 16) * 14 - 7;
      paint(textures[BLOCKS.pine_wood].top, x, y, [
        112 + pineRing,
        86 + pineRing * 0.6,
        58 + pineRing * 0.4,
      ]);
      paint(textures[BLOCKS.pine_wood].side, x, y, [
        82 + pineBark,
        64 + pineBark * 0.58,
        46 + pineBark * 0.38,
      ]);
      paint(textures[BLOCKS.pine_wood].bottom, x, y, [
        110 + pineRing,
        84 + pineRing * 0.6,
        56 + pineRing * 0.4,
      ]);

      const pineLeaf = hash3(x, y, 17) * 18 - 9;
      paint(textures[BLOCKS.pine_leaves].top, x, y, [
        74 + pineLeaf * 0.3,
        102 + pineLeaf * 0.6,
        84 + pineLeaf * 0.5,
      ]);
      paint(textures[BLOCKS.pine_leaves].side, x, y, [
        66 + pineLeaf * 0.3,
        94 + pineLeaf * 0.6,
        76 + pineLeaf * 0.5,
      ]);
      paint(textures[BLOCKS.pine_leaves].bottom, x, y, [
        60 + pineLeaf * 0.3,
        86 + pineLeaf * 0.6,
        70 + pineLeaf * 0.5,
      ]);
    }
  }
  return textures;
}

function createAtlasTexture() {
  const textureSet = createTextureSet();
  const tileSize = 16;
  const columns = 5;
  const rows = 5;
  const atlas = document.createElement("canvas");
  atlas.width = columns * tileSize;
  atlas.height = rows * tileSize;
  const atlasCtx = atlas.getContext("2d");
  const image = atlasCtx.createImageData(tileSize, tileSize);
  const pixelData = image.data;

  const tileData = [
    textureSet[BLOCKS.grass].top,
    textureSet[BLOCKS.grass].side,
    textureSet[BLOCKS.dirt].side,
    textureSet[BLOCKS.stone].side,
    textureSet[BLOCKS.sand].side,
    textureSet[BLOCKS.wood].top,
    textureSet[BLOCKS.wood].side,
    textureSet[BLOCKS.leaves].side,
    textureSet[BLOCKS.planks].side,
    textureSet[BLOCKS.bricks].side,
    textureSet[BLOCKS.glass].side,
    textureSet[BLOCKS.glass].top,
    textureSet[BLOCKS.water].side,
    textureSet[BLOCKS.coal_ore].side,
    textureSet[BLOCKS.iron_ore].side,
    textureSet[BLOCKS.crafting_table].top,
    textureSet[BLOCKS.crafting_table].side,
    textureSet[BLOCKS.furnace].side,
    textureSet[BLOCKS.snow].top,
    textureSet[BLOCKS.snow].side,
    textureSet[BLOCKS.ice].side,
    textureSet[BLOCKS.ice].top,
    textureSet[BLOCKS.pine_wood].top,
    textureSet[BLOCKS.pine_wood].side,
    textureSet[BLOCKS.pine_leaves].side,
  ];

  tileData.forEach((tile, index) => {
    for (let i = 0; i < tile.length / 3; i++) {
      pixelData[i * 4] = tile[i * 3];
      pixelData[i * 4 + 1] = tile[i * 3 + 1];
      pixelData[i * 4 + 2] = tile[i * 3 + 2];
      pixelData[i * 4 + 3] = 255;
    }
    const col = index % columns;
    const row = Math.floor(index / columns);
    atlasCtx.putImageData(image, col * tileSize, row * tileSize);
  });

  const texture = new THREE.CanvasTexture(atlas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  return { texture, columns, rows };
}

function getTileIndex(blockType, faceKey) {
  if (blockType === BLOCKS.grass) {
    if (faceKey === "py") {
      return 0;
    }
    if (faceKey === "ny") {
      return 2;
    }
    return 1;
  }
  if (blockType === BLOCKS.dirt) {
    return 2;
  }
  if (blockType === BLOCKS.stone) {
    return 3;
  }
  if (blockType === BLOCKS.sand) {
    return 4;
  }
  if (blockType === BLOCKS.wood) {
    return faceKey === "py" || faceKey === "ny" ? 5 : 6;
  }
  if (blockType === BLOCKS.leaves) {
    return 7;
  }
  if (blockType === BLOCKS.planks) {
    return 8;
  }
  if (blockType === BLOCKS.bricks) {
    return 9;
  }
  if (blockType === BLOCKS.glass) {
    return faceKey === "py" || faceKey === "ny" ? 11 : 10;
  }
  if (blockType === BLOCKS.water) {
    return 12;
  }
  if (blockType === BLOCKS.coal_ore) {
    return 13;
  }
  if (blockType === BLOCKS.iron_ore) {
    return 14;
  }
  if (blockType === BLOCKS.crafting_table) {
    return faceKey === "py" ? 15 : 16;
  }
  if (blockType === BLOCKS.furnace) {
    return 17;
  }
  if (blockType === BLOCKS.snow) {
    return faceKey === "py" ? 18 : 19;
  }
  if (blockType === BLOCKS.ice) {
    return faceKey === "py" || faceKey === "ny" ? 21 : 20;
  }
  if (blockType === BLOCKS.pine_wood) {
    return faceKey === "py" || faceKey === "ny" ? 22 : 23;
  }
  return 24;
}

function atlasUv(columns, rows, tileIndex, u, v) {
  const inset = 0.0015;
  const col = tileIndex % columns;
  const row = Math.floor(tileIndex / columns);
  const minU = col / columns + inset;
  const maxU = (col + 1) / columns - inset;
  const minV = 1 - (row + 1) / rows + inset;
  const maxV = 1 - row / rows - inset;
  return [lerp(minU, maxU, u), lerp(minV, maxV, v)];
}

function setSelectedBlock(blockType) {
  state.selectedBlock = blockType;
  if (state.inventoryOpen) {
    updateInventoryPanel();
  }
}

function isCollectibleBlock(blockType) {
  return blockType !== BLOCKS.water && blockType !== BLOCKS.air;
}

function isWorldBlock(itemId) {
  return typeof itemId === "number" && itemId < 100 && itemId !== BLOCKS.air;
}

function isPlaceableItem(itemId) {
  return PLACEABLE_BLOCKS.includes(itemId);
}

function isToolItem(itemId) {
  return itemId === ITEMS.wood_pickaxe || itemId === ITEMS.stone_pickaxe;
}

function getSelectedItem() {
  return state.hotbarSlots[state.activeSlot] ?? null;
}

function getToolProfile() {
  return TOOL_STATS[getSelectedItem()] ?? TOOL_STATS.hand;
}

function isCreative() {
  return state.gameMode === "creative";
}

/** Creative hands out unlimited stacks, survival reads the real bag. */
function getItemCount(itemId) {
  if (itemId == null) {
    return 0;
  }
  if (isCreative()) {
    return CREATIVE_STACK;
  }
  return state.inventory[itemId] ?? 0;
}

function addItem(itemId, amount = 1) {
  if (itemId == null || isCreative()) {
    return;
  }
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + amount;
}

/** Spends an item, clearing the hotbar slot once the stack runs dry. */
function consumeItem(itemId, amount = 1) {
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

function canMineBlock(blockType) {
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

function getInteractionCooldown(blockType, breaking) {
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

function getBreakHardness(blockType) {
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

function getBreakDamage(blockType) {
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

function getDropForBlock(blockType) {
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

class World {
  constructor() {
    this.chunks = new Map();
    this.loadedKeys = new Set();
    this.totalGenerated = 0;
    this.loadRadius = DEFAULT_RENDER_DISTANCE;
    this.unloadRadius = DEFAULT_RENDER_DISTANCE + 2;
  }

  setRenderDistance(chunks) {
    this.loadRadius = clamp(Math.round(chunks), MIN_RENDER_DISTANCE, MAX_RENDER_DISTANCE);
    this.unloadRadius = this.loadRadius + 2;
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getHeightAt(wx, wz) {
    const broad = perlin2(wx / 34, wz / 34) * 5.5;
    const detail = perlin2(wx / 16, wz / 16) * 2.1;
    const ridge = Math.abs(perlin2(wx / 52, wz / 52)) * 2.2;
    const naturalHeight = Math.floor(9 + broad + detail + ridge);
    const settlementBlend = getSettlementBlend(wx, wz);
    if (settlementBlend > 0) {
      return Math.round(lerp(naturalHeight, getCityTargetHeight(wx, wz), settlementBlend));
    }
    const snowBlend = getSnowBlend(wx, wz);
    if (snowBlend > 0) {
      return Math.round(lerp(naturalHeight, getSnowTargetHeight(wx, wz), snowBlend));
    }
    return naturalHeight;
  }

  ensureChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    if (this.chunks.has(key)) {
      return this.chunks.get(key);
    }

    const heights = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
    let maxHeight = MIN_WORLD_Y;
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const height = this.getHeightAt(wx, wz);
        heights[z * CHUNK_SIZE + x] = height;
        maxHeight = Math.max(maxHeight, height);
      }
    }

    const chunk = {
      cx,
      cz,
      heights,
      edits: new Map(),
      maxHeight,
      maxBuildY: maxHeight,
      sandy: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE),
      trees: [],
      frostTrees: [],
      fauna: [],
    };

    if (chunkIntersectsRect(cx, cz, CITY_PLAN)) {
      chunk.maxBuildY = Math.max(chunk.maxBuildY, CITY_PLAN.baseHeight + 24);
    }
    if (chunkIntersectsRect(cx, cz, SUBURB_PLAN)) {
      chunk.maxBuildY = Math.max(chunk.maxBuildY, CITY_PLAN.baseHeight + 11);
    }
    if (chunkIntersectsRect(cx, cz, SNOW_REALM)) {
      chunk.maxBuildY = Math.max(chunk.maxBuildY, SNOW_REALM.baseHeight + 15);
    }

    for (let z = 1; z < CHUNK_SIZE - 1; z++) {
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        const index = z * CHUNK_SIZE + x;
        const height = heights[index];
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const beachNoise = perlin2(wx / 22 + 31, wz / 22 + 11);
        const settlementZone = getSettlementBlend(wx, wz) > 0;
        const snowZone = getSnowBlend(wx, wz) > 0;
        const isSandy = !settlementZone && (height <= 8 || (height <= 10 && beachNoise > 0.24));
        chunk.sandy[index] = isSandy ? 1 : 0;

        if (snowZone && height >= 12 && height <= 22) {
          const snowParcel = getSnowParcel(wx, wz);
          const flatEnough =
            Math.abs(height - heights[index - 1]) <= 1 &&
            Math.abs(height - heights[index + 1]) <= 1 &&
            Math.abs(height - heights[index - CHUNK_SIZE]) <= 1 &&
            Math.abs(height - heights[index + CHUNK_SIZE]) <= 1;
          const canGrowFrostTree = !snowParcel || snowParcel.kind === "path";
          if (canGrowFrostTree && flatEnough && hash3(wx, 119, wz) > 0.987) {
            const trunkHeight = 5 + Math.floor(hash3(wx, 129, wz) * 3);
            chunk.frostTrees.push({
              x: wx,
              z: wz,
              y: height + 1,
              trunkHeight,
            });
            chunk.maxBuildY = Math.max(chunk.maxBuildY, height + trunkHeight + 3);
          }
        }

        if (!isSandy && !settlementZone && !snowZone && height >= 10 && height <= 18) {
          const flatEnough =
            Math.abs(height - heights[index - 1]) <= 1 &&
            Math.abs(height - heights[index + 1]) <= 1 &&
            Math.abs(height - heights[index - CHUNK_SIZE]) <= 1 &&
            Math.abs(height - heights[index + CHUNK_SIZE]) <= 1;
          if (flatEnough && hash3(wx, 17, wz) > 0.992) {
            const trunkHeight = 4 + Math.floor(hash3(wx, 29, wz) * 2);
            chunk.trees.push({
              x: wx,
              z: wz,
              y: height + 1,
              trunkHeight,
            });
            chunk.maxBuildY = Math.max(chunk.maxBuildY, height + trunkHeight + 2);
          }
        }
      }
    }

    const canSpawnFaunaAt = (x, z, { allowSand = false, minHeight = 8, maxHeight: maxAllowedHeight = 18 } = {}) => {
      const index = z * CHUNK_SIZE + x;
      const height = heights[index];
      if (height < minHeight || height > maxAllowedHeight) {
        return false;
      }
      if (!allowSand && chunk.sandy[index] === 1) {
        return false;
      }
      if (getSnowBlend(cx * CHUNK_SIZE + x, cz * CHUNK_SIZE + z) > 0) {
        return false;
      }
      const flatEnough =
        Math.abs(height - heights[index - 1]) <= 1 &&
        Math.abs(height - heights[index + 1]) <= 1 &&
        Math.abs(height - heights[index - CHUNK_SIZE]) <= 1 &&
        Math.abs(height - heights[index + CHUNK_SIZE]) <= 1;
      if (!flatEnough) {
        return false;
      }
      return !chunk.trees.some((tree) => Math.abs(tree.x - (cx * CHUNK_SIZE + x)) <= 2 && Math.abs(tree.z - (cz * CHUNK_SIZE + z)) <= 2);
    };

    const tryAddFauna = (kind, seed, threshold, options) => {
      if (hash3(cx, seed, cz) < threshold) {
        return;
      }
      const x = 2 + Math.floor(hash3(cx, seed + 1, cz) * (CHUNK_SIZE - 4));
      const z = 2 + Math.floor(hash3(cx, seed + 2, cz) * (CHUNK_SIZE - 4));
      const spawnX = cx * CHUNK_SIZE + x + 0.5;
      const spawnZ = cz * CHUNK_SIZE + z + 0.5;
      if (Math.hypot(spawnX - DEFAULT_SPAWN.x, spawnZ - DEFAULT_SPAWN.z) < 3.5) {
        return;
      }
      if (!canSpawnFaunaAt(x, z, options)) {
        return;
      }
      const height = heights[z * CHUNK_SIZE + x];
      chunk.fauna.push({
        kind,
        x: spawnX,
        y: height + 1,
        z: spawnZ,
      });
    };

    tryAddFauna("sheep", 61, 0.44, { allowSand: false, minHeight: 9, maxHeight: 18 });
    tryAddFauna("sheep", 71, 0.68, { allowSand: false, minHeight: 9, maxHeight: 18 });
    tryAddFauna("villager", 81, 0.84, { allowSand: false, minHeight: 10, maxHeight: 16 });

    for (let z = 1; z < CHUNK_SIZE - 1; z++) {
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const parcel = getCityParcel(wx, wz);
        if (
          parcel?.kind === "road" &&
          parcel.modX === 1 &&
          parcel.modZ === 1 &&
          ((parcel.blockX + parcel.blockZ) % 2 === 0)
        ) {
          const height = heights[z * CHUNK_SIZE + x];
          const spawnX = wx + 0.5;
          const spawnZ = wz + 0.5;
          if (Math.hypot(spawnX - DEFAULT_SPAWN.x, spawnZ - DEFAULT_SPAWN.z) < 4) {
            continue;
          }
          chunk.fauna.push({
            kind: "villager",
            x: spawnX,
            y: height + 1,
            z: spawnZ,
          });
        }

        const snowParcel = getSnowParcel(wx, wz);
        if (
          snowParcel?.kind === "path" &&
          snowParcel.modX === 1 &&
          snowParcel.modZ === 1 &&
          ((snowParcel.lotX + snowParcel.lotZ) % 2 === 1)
        ) {
          chunk.fauna.push({
            kind: "villager",
            x: wx + 0.5,
            y: heights[z * CHUNK_SIZE + x] + 1,
            z: wz + 0.5,
          });
        }
      }
    }

    this.chunks.set(key, chunk);
    this.totalGenerated++;
    return chunk;
  }

  updateLoadedChunks(playerX, playerZ) {
    const centerCx = Math.floor(playerX / CHUNK_SIZE);
    const centerCz = Math.floor(playerZ / CHUNK_SIZE);
    this.loadedKeys.clear();

    for (let dz = -this.loadRadius; dz <= this.loadRadius; dz++) {
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        this.ensureChunk(cx, cz);
        this.loadedKeys.add(this.getChunkKey(cx, cz));
      }
    }

    for (const [key, chunk] of this.chunks) {
      const distance = Math.max(
        Math.abs(chunk.cx - centerCx),
        Math.abs(chunk.cz - centerCz),
      );
      if (distance > this.unloadRadius && chunk.edits.size === 0) {
        this.chunks.delete(key);
      }
    }
  }

  getGeneratedBlock(wx, wy, wz) {
    if (wy < MIN_WORLD_Y) {
      return BLOCKS.stone;
    }
    const chunk = this.ensureChunk(Math.floor(wx / CHUNK_SIZE), Math.floor(wz / CHUNK_SIZE));
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const height = chunk.heights[lz * CHUNK_SIZE + lx];
    const sandy = chunk.sandy[lz * CHUNK_SIZE + lx] === 1;
    const snowZone = getSnowBlend(wx, wz) > 0;
    const caveNoise =
      Math.abs(perlin2(wx / 21 + wy * 0.08, wz / 21)) +
      Math.abs(perlin2(wx / 25, wy / 9 + wz * 0.04));
    const caveCarve = wy < height - 1 && wy > 2 && caveNoise > 1.06;
    const structureBlock = getStructureBlock(wx, wy, wz, height);
    if (structureBlock != null) {
      return structureBlock;
    }
    if (wy > height) {
      for (const tree of chunk.trees) {
        const dx = wx - tree.x;
        const dz = wz - tree.z;
        const canopyBase = tree.y + tree.trunkHeight - 2;
        const canopyTop = tree.y + tree.trunkHeight + 1;
        if (wx === tree.x && wz === tree.z && wy >= tree.y && wy < tree.y + tree.trunkHeight) {
          return BLOCKS.wood;
        }
        if (
          wy >= canopyBase &&
          wy <= canopyTop &&
          Math.abs(dx) <= 2 &&
          Math.abs(dz) <= 2 &&
          Math.abs(dx) + Math.abs(dz) <= 3 &&
          !(Math.abs(dx) === 2 && Math.abs(dz) === 2 && wy < canopyTop)
        ) {
          return BLOCKS.leaves;
        }
      }
      for (const tree of chunk.frostTrees) {
        const dx = wx - tree.x;
        const dz = wz - tree.z;
        const layer = wy - (tree.y + tree.trunkHeight - 3);
        const radius = 2 - Math.floor(layer * 0.5);
        if (wx === tree.x && wz === tree.z && wy >= tree.y && wy < tree.y + tree.trunkHeight) {
          return BLOCKS.pine_wood;
        }
        if (
          wy >= tree.y + tree.trunkHeight - 3 &&
          wy <= tree.y + tree.trunkHeight + 1 &&
          Math.abs(dx) <= Math.max(1, radius) &&
          Math.abs(dz) <= Math.max(1, radius) &&
          Math.abs(dx) + Math.abs(dz) <= Math.max(2, radius + 1)
        ) {
          return BLOCKS.pine_leaves;
        }
      }
      if (wy <= WATER_LEVEL) {
        return snowZone && wy === WATER_LEVEL ? BLOCKS.ice : BLOCKS.water;
      }
      return BLOCKS.air;
    }
    if (caveCarve) {
      if (wy <= WATER_LEVEL - 1) {
        return BLOCKS.water;
      }
      return BLOCKS.air;
    }
    if (sandy) {
      return BLOCKS.sand;
    }
    if (snowZone) {
      if (wy === height) {
        return BLOCKS.snow;
      }
      if (wy >= height - 2) {
        return BLOCKS.dirt;
      }
    }
    if (wy === height) {
      return BLOCKS.grass;
    }
    if (wy >= height - 3) {
      return BLOCKS.dirt;
    }
    const oreRoll = hash3(wx * 0.21, wy * 0.37, wz * 0.19);
    if (wy < 18 && oreRoll > 0.83 && oreRoll < 0.9) {
      return BLOCKS.coal_ore;
    }
    if (wy < 12 && oreRoll > 0.93) {
      return BLOCKS.iron_ore;
    }
    return BLOCKS.stone;
  }

  getEditKey(lx, wy, lz) {
    return `${lx},${wy},${lz}`;
  }

  getBlock(wx, wy, wz) {
    if (wy > MAX_WORLD_Y) {
      return BLOCKS.air;
    }
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const editKey = this.getEditKey(lx, wy, lz);
    if (chunk.edits.has(editKey)) {
      return chunk.edits.get(editKey);
    }
    return this.getGeneratedBlock(wx, wy, wz);
  }

  setBlock(wx, wy, wz, blockType) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const editKey = this.getEditKey(lx, wy, lz);
    const generated = this.getGeneratedBlock(wx, wy, wz);
    const current = this.getBlock(wx, wy, wz);

    if (current === blockType) {
      return false;
    }

    if (generated === blockType) {
      chunk.edits.delete(editKey);
    } else {
      chunk.edits.set(editKey, blockType);
    }

    chunk.maxHeight = Math.max(chunk.maxHeight, wy);
    chunk.maxBuildY = Math.max(chunk.maxBuildY, wy);
    return true;
  }

  isSolid(wx, wy, wz) {
    const blockType = this.getBlock(wx, wy, wz);
    return blockType !== BLOCKS.air && blockType !== BLOCKS.water;
  }

  getChunkMaxY(cx, cz) {
    const chunk = this.ensureChunk(cx, cz);
    let maxY = chunk.maxBuildY;
    for (const [key, value] of chunk.edits) {
      if (value === BLOCKS.air) {
        continue;
      }
      const [, y] = key.split(",").map(Number);
      maxY = Math.max(maxY, y);
    }
    return Math.min(MAX_BUILD_HEIGHT, maxY + 1);
  }
}

class ChunkMeshManager {
  constructor(world, scene, material, atlasInfo) {
    this.world = world;
    this.scene = scene;
    this.material = material;
    this.atlasInfo = atlasInfo;
    this.meshes = new Map();
    this.dirty = new Set();
  }

  markDirtyChunk(cx, cz) {
    this.dirty.add(this.world.getChunkKey(cx, cz));
  }

  markDirtyAtWorld(wx, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    this.markDirtyChunk(cx, cz);
    if (((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === 0) {
      this.markDirtyChunk(cx - 1, cz);
    }
    if (((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === CHUNK_SIZE - 1) {
      this.markDirtyChunk(cx + 1, cz);
    }
    if (((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === 0) {
      this.markDirtyChunk(cx, cz - 1);
    }
    if (((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === CHUNK_SIZE - 1) {
      this.markDirtyChunk(cx, cz + 1);
    }
  }

  syncLoadedChunks() {
    for (const key of this.world.loadedKeys) {
      if (!this.meshes.has(key) || this.dirty.has(key)) {
        const [cx, cz] = key.split(",").map(Number);
        this.rebuildChunk(cx, cz);
        this.dirty.delete(key);
      }
    }

    for (const [key, mesh] of this.meshes) {
      if (!this.world.loadedKeys.has(key)) {
        this.disposeMesh(mesh);
        this.meshes.delete(key);
      }
    }
  }

  disposeMesh(mesh) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  }

  rebuildChunk(cx, cz) {
    const key = this.world.getChunkKey(cx, cz);
    const previous = this.meshes.get(key);
    if (previous) {
      this.disposeMesh(previous);
    }

    const geometry = this.buildGeometry(cx, cz);
    if (!geometry) {
      this.meshes.delete(key);
      return;
    }

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.userData.chunkKey = key;
    this.scene.add(mesh);
    this.meshes.set(key, mesh);
  }

  buildGeometry(cx, cz) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vertexOffset = 0;
    const maxY = this.world.getChunkMaxY(cx, cz);

    for (let y = MIN_WORLD_Y; y <= maxY; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const wx = cx * CHUNK_SIZE + x;
          const wz = cz * CHUNK_SIZE + z;
          const blockType = this.world.getBlock(wx, y, wz);
          if (blockType === BLOCKS.air) {
            continue;
          }

          for (const face of FACE_DEFS) {
            const nx = face.normal[0];
            const ny = face.normal[1];
            const nz = face.normal[2];
            if (this.world.isSolid(wx + nx, y + ny, wz + nz)) {
              continue;
            }

            const tileIndex = getTileIndex(blockType, face.key);
            const quadUvs = [
              atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 0, 0),
              atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 0, 1),
              atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 1, 1),
              atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 1, 0),
            ];

            for (let i = 0; i < 4; i++) {
              const corner = face.corners[i];
              positions.push(wx + corner[0], y + corner[1], wz + corner[2]);
              normals.push(nx, ny, nz);
              uvs.push(quadUvs[i][0], quadUvs[i][1]);
            }

            indices.push(
              vertexOffset,
              vertexOffset + 1,
              vertexOffset + 2,
              vertexOffset,
              vertexOffset + 2,
              vertexOffset + 3,
            );
            vertexOffset += 4;
          }
        }
      }
    }

    if (positions.length === 0) {
      return null;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  getMeshes() {
    return [...this.meshes.values()];
  }
}

const world = new World();
const spawnHeight = world.getHeightAt(Math.floor(DEFAULT_SPAWN.x), Math.floor(DEFAULT_SPAWN.z)) + 1.05;

function getSurfaceData(x, z) {
  const wx = Math.floor(x);
  const wz = Math.floor(z);
  const ceiling = Math.min(MAX_BUILD_HEIGHT, world.getHeightAt(wx, wz) + 12);
  for (let y = ceiling; y >= MIN_WORLD_Y; y--) {
    const blockType = world.getBlock(wx, y, wz);
    if (blockType !== BLOCKS.air && blockType !== BLOCKS.water && blockType !== BLOCKS.leaves) {
      return { x: wx, y: y + 1, z: wz, blockType };
    }
  }
  return { x: wx, y: world.getHeightAt(wx, wz) + 1, z: wz, blockType: BLOCKS.grass };
}

const state = {
  mode: "menu",
  screen: "title",
  screenReturn: "title",
  gameMode: "survival",
  running: false,
  isDead: false,
  lastSafePosX: DEFAULT_SPAWN.x,
  lastSafePosZ: DEFAULT_SPAWN.z,
  pointerLocked: false,
  intentionalUnlock: false,
  pointerLockUnavailable: false,
  suppressInteractUntil: 0,
  suppressAnimationTick: false,
  inventoryOpen: false,
  saveDirty: false,
  saveCooldown: 0,
  keys: new Set(),
  awaitingBind: null,
  selectedBlock: BLOCKS.grass,
  activeSlot: 0,
  hotbarSlots: [
    ITEMS.wood_pickaxe,
    BLOCKS.grass,
    BLOCKS.dirt,
    BLOCKS.stone,
    BLOCKS.wood,
    BLOCKS.sand,
    BLOCKS.planks,
    BLOCKS.crafting_table,
    BLOCKS.furnace,
  ],
  lastInteractionTime: 0,
  elapsed: 0,
  target: null,
  dragLook: false,
  dragAnchor: null,
  dayTime: 0.34,
  uiMessage: "",
  uiMessageTimer: 0,
  heldItemTimer: 0,
  heldItemName: "",
  viewBob: 0,
  stepPhase: 0,
  landingBounce: 0,
  nextFootstepAt: 0,
  sneaking: false,
  sprinting: false,
  sprintLatched: false,
  lastForwardTapTime: -99,
  lastJumpTapTime: -99,
  flying: false,
  flyVelocityY: 0,
  perspective: 0,
  hudVisible: true,
  debugVisible: false,
  frameTimes: [],
  fps: 0,
  panoramaAngle: 0,
  safeAnchorCooldown: 0,
  drops: [],
  breakState: {
    key: null,
    blockType: BLOCKS.air,
    progress: 0,
    hardness: 1,
    lastHitTime: -999,
    pulse: 0,
  },
  inventory: {
    [BLOCKS.grass]: 20,
    [BLOCKS.dirt]: 18,
    [BLOCKS.stone]: 24,
    [BLOCKS.wood]: 10,
    [BLOCKS.pine_wood]: 0,
    [BLOCKS.planks]: 0,
    [BLOCKS.sand]: 16,
    [BLOCKS.bricks]: 0,
    [BLOCKS.glass]: 0,
    [BLOCKS.snow]: 0,
    [BLOCKS.ice]: 0,
    [BLOCKS.crafting_table]: 0,
    [BLOCKS.furnace]: 0,
    [BLOCKS.coal_ore]: 0,
    [BLOCKS.iron_ore]: 0,
    [ITEMS.stick]: 0,
    [ITEMS.coal]: 0,
    [ITEMS.iron_ingot]: 0,
    [ITEMS.wood_pickaxe]: 1,
    [ITEMS.stone_pickaxe]: 0,
  },
  player: {
    x: DEFAULT_SPAWN.x,
    y: spawnHeight + 2,
    z: DEFAULT_SPAWN.z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: DEFAULT_SPAWN.yaw,
    pitch: DEFAULT_SPAWN.pitch,
    onGround: false,
  },
};

class SoundEngine {
  constructor() {
    this.AudioContextCtor = window.AudioContext || window.webkitAudioContext || null;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.enabled = false;
  }

  ensureContext() {
    if (!this.AudioContextCtor || this.context) {
      return this.context;
    }
    try {
      this.context = new this.AudioContextCtor();
      this.master = this.context.createGain();
      this.master.gain.value = this.getMasterLevel();
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
      this.enabled = true;
    } catch {
      this.context = null;
      this.master = null;
      this.enabled = false;
    }
    return this.context;
  }

  getMasterLevel() {
    return 0.14 * clamp(settings.volume / 100, 0, 1);
  }

  applyVolume() {
    if (this.master) {
      this.master.gain.value = this.getMasterLevel();
    }
  }

  createNoiseBuffer() {
    if (!this.context) {
      return null;
    }
    const length = Math.floor(this.context.sampleRate * 0.22);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return buffer;
  }

  resume() {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  pulse({ frequency = 220, type = "sine", gain = 0.05, attack = 0.005, decay = 0.12, detune = 0, time = 0 } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }
    const start = context.currentTime + time;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.detune.setValueAtTime(detune, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(start);
    osc.stop(start + decay + 0.02);
  }

  noise({ gain = 0.035, decay = 0.1, highpass = 340, lowpass = 1800, time = 0 } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master || !this.noiseBuffer) {
      return;
    }
    const start = context.currentTime + time;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const hp = context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(highpass, start);

    const lp = context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(lowpass, start);

    const amp = context.createGain();
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(amp);
    amp.connect(this.master);
    source.start(start);
    source.stop(start + decay + 0.03);
  }

  ui(opening) {
    this.resume();
    this.pulse({
      frequency: opening ? 620 : 460,
      type: "triangle",
      gain: 0.028,
      decay: 0.09,
    });
  }

  select() {
    this.resume();
    this.pulse({
      frequency: 390,
      type: "square",
      gain: 0.018,
      decay: 0.05,
    });
  }

  footstep(blockType, sprinting) {
    this.resume();
    const isHard = blockType === BLOCKS.stone || blockType === BLOCKS.bricks || blockType === BLOCKS.furnace;
    this.noise({
      gain: sprinting ? 0.03 : 0.022,
      decay: isHard ? 0.05 : 0.08,
      highpass: isHard ? 520 : 260,
      lowpass: isHard ? 1700 : 1100,
    });
    this.pulse({
      frequency: isHard ? 120 : 88,
      type: "triangle",
      gain: sprinting ? 0.02 : 0.014,
      decay: 0.08,
    });
  }

  jump() {
    this.resume();
    this.pulse({ frequency: 240, type: "square", gain: 0.02, decay: 0.08 });
    this.pulse({ frequency: 360, type: "triangle", gain: 0.016, decay: 0.12, time: 0.015 });
  }

  land(speed) {
    this.resume();
    const intensity = clamp((Math.abs(speed) - 4) / 10, 0.25, 1);
    this.noise({
      gain: 0.018 + intensity * 0.03,
      decay: 0.06 + intensity * 0.08,
      highpass: 140,
      lowpass: 900,
    });
    this.pulse({
      frequency: 70 - intensity * 14,
      type: "triangle",
      gain: 0.012 + intensity * 0.016,
      decay: 0.12 + intensity * 0.06,
    });
  }

  hit(blockType, finished = false) {
    this.resume();
    const glassy = blockType === BLOCKS.glass;
    const woody = blockType === BLOCKS.wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table;
    const stony = blockType === BLOCKS.stone || blockType === BLOCKS.bricks || blockType === BLOCKS.coal_ore || blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace;
    this.noise({
      gain: finished ? 0.04 : 0.024,
      decay: finished ? 0.12 : 0.06,
      highpass: glassy ? 900 : woody ? 260 : 420,
      lowpass: glassy ? 3200 : stony ? 1800 : 1300,
    });
    this.pulse({
      frequency: glassy ? 780 : woody ? 180 : 140,
      type: glassy ? "triangle" : "square",
      gain: finished ? 0.02 : 0.012,
      decay: finished ? 0.1 : 0.05,
    });
  }

  place(blockType) {
    this.resume();
    const bright = blockType === BLOCKS.glass;
    this.pulse({
      frequency: bright ? 520 : 160,
      type: bright ? "triangle" : "square",
      gain: 0.014,
      decay: 0.05,
    });
    this.noise({
      gain: bright ? 0.012 : 0.018,
      decay: 0.05,
      highpass: bright ? 760 : 220,
      lowpass: bright ? 2400 : 1200,
    });
  }

  craft() {
    this.resume();
    this.pulse({ frequency: 392, type: "triangle", gain: 0.018, decay: 0.08 });
    this.pulse({ frequency: 494, type: "triangle", gain: 0.016, decay: 0.1, time: 0.04 });
    this.pulse({ frequency: 587, type: "triangle", gain: 0.014, decay: 0.12, time: 0.08 });
  }
}

const soundEngine = new SoundEngine();

function serializeWorldEdits() {
  const chunks = {};
  for (const [key, chunk] of world.chunks) {
    if (chunk.edits.size === 0) {
      continue;
    }
    chunks[key] = Object.fromEntries(chunk.edits);
  }
  return chunks;
}

function hydrateWorldEdits(savedChunks) {
  for (const [key, edits] of Object.entries(savedChunks || {})) {
    const [cx, cz] = key.split(",").map(Number);
    const chunk = world.ensureChunk(cx, cz);
    for (const [editKey, blockType] of Object.entries(edits)) {
      chunk.edits.set(editKey, blockType);
      const [, y] = editKey.split(",").map(Number);
      chunk.maxBuildY = Math.max(chunk.maxBuildY, y);
    }
  }
}

function saveGame(force = false) {
  if (!settings.autosave && !force) {
    state.saveDirty = false;
    state.saveCooldown = 1.5;
    return;
  }
  try {
    const payload = {
      gameMode: state.gameMode,
      inventory: state.inventory,
      hotbarSlots: state.hotbarSlots,
      activeSlot: state.activeSlot,
      selectedBlock: state.selectedBlock,
      player: state.player,
      dayTime: state.dayTime,
      worldEdits: serializeWorldEdits(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    state.saveDirty = false;
    state.saveCooldown = 1.5;
  } catch {
    state.uiMessage = "Save failed";
    state.uiMessageTimer = 1.1;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return;
    }
    const payload = JSON.parse(raw);
    if (payload.gameMode === "creative" || payload.gameMode === "survival") {
      state.gameMode = payload.gameMode;
    }
    Object.assign(state.inventory, payload.inventory || {});
    if (Array.isArray(payload.hotbarSlots)) {
      state.hotbarSlots = payload.hotbarSlots.slice(0, HOTBAR_SIZE);
      while (state.hotbarSlots.length < HOTBAR_SIZE) {
        state.hotbarSlots.push(null);
      }
    }
    state.activeSlot = clamp(payload.activeSlot ?? state.activeSlot, 0, HOTBAR_SIZE - 1);
    state.selectedBlock = payload.selectedBlock ?? state.selectedBlock;
    if (payload.player) {
      Object.assign(state.player, payload.player);
    }
    state.dayTime = payload.dayTime ?? state.dayTime;
    hydrateWorldEdits(payload.worldEdits);
    const selectedItem = getSelectedItem();
    if (isPlaceableItem(selectedItem)) {
      state.selectedBlock = selectedItem;
    }
  } catch {
    state.uiMessage = "Save data was invalid";
    state.uiMessageTimer = 1.1;
  }
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd0ff);
scene.fog = new THREE.Fog(0x9fd0ff, 48, 118);

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 180);
camera.rotation.order = "YXZ";

const hemisphereLight = new THREE.HemisphereLight(0xc8e4ff, 0x43553c, 1.7);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xfff2cf, 1.25);
sunLight.position.set(32, 48, 18);
scene.add(sunLight);

const atlasInfo = createAtlasTexture();
const itemIcons = new Map();
const iconCanvases = new Map();
const iconTextures = new Map();

function getIconTexture(itemId) {
  if (!iconTextures.has(itemId)) {
    const source = iconCanvases.get(itemId);
    if (!source) {
      return null;
    }
    const texture = new THREE.CanvasTexture(source);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    iconTextures.set(itemId, texture);
  }
  return iconTextures.get(itemId);
}

function getTileCanvas(tileIndex) {
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = 16;
  tileCanvas.height = 16;
  const tileCtx = tileCanvas.getContext("2d");
  tileCtx.imageSmoothingEnabled = false;
  const sx = (tileIndex % atlasInfo.columns) * 16;
  const sy = Math.floor(tileIndex / atlasInfo.columns) * 16;
  tileCtx.drawImage(atlasInfo.texture.image, sx, sy, 16, 16, 0, 0, 16, 16);
  return tileCanvas;
}

function createItemIcon(blockType) {
  const canvasIcon = document.createElement("canvas");
  canvasIcon.width = 48;
  canvasIcon.height = 48;
  const ctxIcon = canvasIcon.getContext("2d");
  ctxIcon.imageSmoothingEnabled = false;
  const top = getTileCanvas(getTileIndex(blockType, "py"));
  const side = getTileCanvas(getTileIndex(blockType, "pz"));
  const right = getTileCanvas(getTileIndex(blockType, "px"));

  ctxIcon.fillStyle = "rgba(0,0,0,0.2)";
  ctxIcon.beginPath();
  ctxIcon.ellipse(24, 38, 14, 5, 0, 0, PI * 2);
  ctxIcon.fill();

  ctxIcon.drawImage(side, 11, 18, 18, 18);
  ctxIcon.globalAlpha = 0.9;
  ctxIcon.drawImage(right, 22, 18, 13, 18);
  ctxIcon.globalAlpha = 1;
  ctxIcon.drawImage(top, 13, 7, 20, 14);
  ctxIcon.strokeStyle = "rgba(255,255,255,0.08)";
  ctxIcon.strokeRect(9.5, 5.5, 26, 32);
  return canvasIcon;
}

function createFlatIcon(background, accent, glyph) {
  const icon = document.createElement("canvas");
  icon.width = 48;
  icon.height = 48;
  const iconCtx = icon.getContext("2d");
  iconCtx.fillStyle = background;
  iconCtx.fillRect(8, 8, 32, 32);
  iconCtx.strokeStyle = "rgba(255,255,255,0.12)";
  iconCtx.strokeRect(8.5, 8.5, 31, 31);
  iconCtx.fillStyle = accent;
  glyph(iconCtx);
  return icon;
}

function createStickGlyph(ctxGlyph) {
  ctxGlyph.fillRect(22, 13, 4, 20);
  ctxGlyph.fillRect(20, 29, 8, 6);
}

function createCoalGlyph(ctxGlyph) {
  ctxGlyph.beginPath();
  ctxGlyph.moveTo(18, 14);
  ctxGlyph.lineTo(31, 18);
  ctxGlyph.lineTo(28, 33);
  ctxGlyph.lineTo(16, 30);
  ctxGlyph.closePath();
  ctxGlyph.fill();
}

function createPickaxeGlyph(ctxGlyph, tint) {
  ctxGlyph.fillStyle = tint;
  ctxGlyph.fillRect(14, 13, 20, 5);
  ctxGlyph.fillRect(24, 13, 4, 22);
  ctxGlyph.fillRect(18, 18, 8, 5);
}

function registerIcon(itemId, iconCanvas) {
  iconCanvases.set(itemId, iconCanvas);
  itemIcons.set(itemId, iconCanvas.toDataURL("image/png"));
}

for (const blockType of Object.values(BLOCKS)) {
  if (blockType !== BLOCKS.air) {
    registerIcon(blockType, createItemIcon(blockType));
  }
}
registerIcon(ITEMS.stick, createFlatIcon("#2b3343", "#d1ab6a", createStickGlyph));
registerIcon(ITEMS.coal, createFlatIcon("#2b3343", "#101217", createCoalGlyph));
registerIcon(ITEMS.iron_ingot, createFlatIcon("#2b3343", "#d7dce4", (ctxGlyph) => {
  ctxGlyph.fillRect(14, 20, 20, 10);
  ctxGlyph.fillRect(16, 16, 16, 4);
}));
registerIcon(ITEMS.wood_pickaxe, createFlatIcon("#2b3343", "#9a7440", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#caa061")));
registerIcon(ITEMS.stone_pickaxe, createFlatIcon("#2b3343", "#8a949d", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#c0c7cf")));

const worldMaterial = new THREE.MeshLambertMaterial({
  map: atlasInfo.texture,
});
const chunkMeshes = new ChunkMeshManager(world, scene, worldMaterial, atlasInfo);

const mobMaterials = {
  sheepBody: new THREE.MeshLambertMaterial({ color: 0xf3efe6 }),
  sheepFace: new THREE.MeshLambertMaterial({ color: 0x3d2f2a }),
  sheepLeg: new THREE.MeshLambertMaterial({ color: 0x5b4f4a }),
  villagerRobe: new THREE.MeshLambertMaterial({ color: 0x866148 }),
  villagerSkin: new THREE.MeshLambertMaterial({ color: 0xdab18e }),
  villagerTrim: new THREE.MeshLambertMaterial({ color: 0x5e4537 }),
};

const mobGeometry = {
  sheepBody: new THREE.BoxGeometry(0.95, 0.7, 1.4),
  sheepHead: new THREE.BoxGeometry(0.5, 0.48, 0.48),
  sheepLeg: new THREE.BoxGeometry(0.16, 0.48, 0.16),
  villagerBody: new THREE.BoxGeometry(0.74, 1.14, 0.48),
  villagerHead: new THREE.BoxGeometry(0.46, 0.48, 0.46),
  villagerNose: new THREE.BoxGeometry(0.1, 0.14, 0.12),
  villagerArms: new THREE.BoxGeometry(0.56, 0.16, 0.16),
};

function createMobLeg(geometry, material, x, y, z) {
  const leg = new THREE.Mesh(geometry, material);
  leg.position.set(x, y, z);
  return leg;
}

function createSheepModel() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(mobGeometry.sheepBody, mobMaterials.sheepBody);
  body.position.set(0, 0.85, 0);
  root.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.95, 0.82);
  const head = new THREE.Mesh(mobGeometry.sheepHead, mobMaterials.sheepFace);
  head.position.set(0, 0, 0.2);
  headPivot.add(head);
  root.add(headPivot);

  const legs = [
    createMobLeg(mobGeometry.sheepLeg, mobMaterials.sheepLeg, -0.26, 0.3, -0.4),
    createMobLeg(mobGeometry.sheepLeg, mobMaterials.sheepLeg, 0.26, 0.3, -0.4),
    createMobLeg(mobGeometry.sheepLeg, mobMaterials.sheepLeg, -0.26, 0.3, 0.42),
    createMobLeg(mobGeometry.sheepLeg, mobMaterials.sheepLeg, 0.26, 0.3, 0.42),
  ];
  legs.forEach((leg) => root.add(leg));

  root.userData.parts = {
    body,
    headPivot,
    legs,
  };
  return root;
}

function createVillagerModel() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(mobGeometry.villagerBody, mobMaterials.villagerRobe);
  body.position.set(0, 0.94, 0);
  root.add(body);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.54), mobMaterials.villagerTrim);
  trim.position.set(0, 0.42, 0);
  root.add(trim);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.55, 0);
  const head = new THREE.Mesh(mobGeometry.villagerHead, mobMaterials.villagerSkin);
  headPivot.add(head);
  const nose = new THREE.Mesh(mobGeometry.villagerNose, mobMaterials.villagerTrim);
  nose.position.set(0, -0.02, 0.28);
  headPivot.add(nose);
  root.add(headPivot);

  const arms = new THREE.Mesh(mobGeometry.villagerArms, mobMaterials.villagerTrim);
  arms.position.set(0, 1.02, 0.26);
  root.add(arms);

  const legs = [
    createMobLeg(mobGeometry.sheepLeg, mobMaterials.villagerTrim, -0.14, 0.27, 0),
    createMobLeg(mobGeometry.sheepLeg, mobMaterials.villagerTrim, 0.14, 0.27, 0),
  ];
  legs.forEach((leg) => root.add(leg));

  root.userData.parts = {
    body,
    headPivot,
    arms,
    legs,
  };
  return root;
}

class PassiveMobManager {
  constructor(world, scene) {
    this.world = world;
    this.root = new THREE.Group();
    this.entities = new Map();
    this.totalEntities = 0;
    scene.add(this.root);
  }

  createEntity(definition) {
    const model = definition.kind === "villager" ? createVillagerModel() : createSheepModel();
    const phase = hash3(definition.x, definition.y, definition.z) * PI * 2;
    const entity = {
      kind: definition.kind,
      group: model,
      parts: model.userData.parts,
      x: definition.x,
      y: definition.y,
      z: definition.z,
      homeX: definition.x,
      homeZ: definition.z,
      targetX: definition.x,
      targetZ: definition.z,
      heading: phase,
      speed: definition.kind === "villager" ? 0.95 : 1.18,
      moveTimer: 0.3 + hash3(definition.x, 9, definition.z) * 1.4,
      phase,
      stride: 0,
      headTurn: hash3(definition.x, 5, definition.z) * PI * 2,
    };
    model.position.set(entity.x, entity.y, entity.z);
    this.root.add(model);
    return entity;
  }

  disposeEntity(entity) {
    this.root.remove(entity.group);
  }

  syncLoadedChunks() {
    for (const key of this.world.loadedKeys) {
      if (this.entities.has(key)) {
        continue;
      }
      const chunk = this.world.chunks.get(key);
      const spawned = (chunk?.fauna ?? []).map((definition) => this.createEntity(definition));
      this.entities.set(key, spawned);
      this.totalEntities += spawned.length;
    }

    for (const [key, entities] of this.entities) {
      if (this.world.loadedKeys.has(key)) {
        continue;
      }
      entities.forEach((entity) => this.disposeEntity(entity));
      this.totalEntities -= entities.length;
      this.entities.delete(key);
    }
  }

  pickTarget(entity) {
    const radius = entity.kind === "villager" ? 5.4 : 4.2;
    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = Math.random() * PI * 2;
      const distance = 0.8 + Math.random() * radius;
      const candidateX = entity.homeX + Math.cos(angle) * distance;
      const candidateZ = entity.homeZ + Math.sin(angle) * distance;
      const surface = getSurfaceData(candidateX, candidateZ);
      if (
        surface.blockType !== BLOCKS.water &&
        surface.blockType !== BLOCKS.leaves &&
        Math.abs(surface.y - entity.y) <= 1.6
      ) {
        entity.targetX = candidateX;
        entity.targetZ = candidateZ;
        entity.moveTimer = 1.8 + Math.random() * 3.2;
        return;
      }
    }
    entity.targetX = entity.homeX;
    entity.targetZ = entity.homeZ;
    entity.moveTimer = 1.2 + Math.random() * 1.4;
  }

  updateEntity(entity, dt) {
    entity.moveTimer -= dt;
    const startDx = entity.targetX - entity.x;
    const startDz = entity.targetZ - entity.z;
    if (Math.hypot(startDx, startDz) <= 0.16 || entity.moveTimer <= 0) {
      this.pickTarget(entity);
    }

    const dx = entity.targetX - entity.x;
    const dz = entity.targetZ - entity.z;
    const distance = Math.hypot(dx, dz);
    const walkAmount = Math.min(distance, entity.speed * dt);
    if (distance > 0.001) {
      const dirX = dx / distance;
      const dirZ = dz / distance;
      const nextX = entity.x + dirX * walkAmount;
      const nextZ = entity.z + dirZ * walkAmount;
      const surface = getSurfaceData(nextX, nextZ);
      if (
        surface.blockType === BLOCKS.water ||
        surface.blockType === BLOCKS.leaves ||
        Math.abs(surface.y - entity.y) > 1.6
      ) {
        entity.moveTimer = 0;
      } else {
        entity.x = nextX;
        entity.z = nextZ;
        entity.y = lerp(entity.y, surface.y, clamp(dt * 5.5, 0, 1));
        entity.heading = lerpAngle(entity.heading, Math.atan2(dirX, dirZ), clamp(dt * 4.5, 0, 1));
        entity.stride += dt * (entity.kind === "villager" ? 9 : 11);
      }
    }

    const bob = Math.sin(state.elapsed * 3.1 + entity.phase) * 0.035;
    entity.group.position.set(entity.x, entity.y + bob, entity.z);
    entity.group.rotation.y = wrapAngle(entity.heading);

    const strideSwing = Math.sin(entity.stride) * 0.48;
    const idleTurn = Math.sin(state.elapsed * 0.9 + entity.headTurn) * 0.18;

    if (entity.parts.headPivot) {
      entity.parts.headPivot.rotation.y = idleTurn;
      entity.parts.headPivot.rotation.x = entity.kind === "villager"
        ? 0.04
        : Math.abs(Math.sin(state.elapsed * 1.3 + entity.phase)) * 0.05;
    }
    if (entity.parts.arms) {
      entity.parts.arms.rotation.x = Math.sin(entity.stride * 0.5) * 0.08;
    }
    if (entity.parts.body) {
      entity.parts.body.position.y = entity.kind === "villager" ? 0.94 + bob * 0.35 : 0.85 + bob * 0.3;
    }
    if (entity.parts.legs) {
      entity.parts.legs.forEach((leg, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        leg.rotation.x = distance > 0.18 ? strideSwing * direction : 0;
      });
    }
  }

  update(dt) {
    for (const entities of this.entities.values()) {
      entities.forEach((entity) => this.updateEntity(entity, dt));
    }
  }

  getEntityCount() {
    return this.totalEntities;
  }

  getNearbyEntities(limit = 6) {
    const nearby = [];
    for (const entities of this.entities.values()) {
      entities.forEach((entity) => {
        const distance = Math.hypot(entity.x - state.player.x, entity.z - state.player.z);
        nearby.push({
          kind: entity.kind,
          x: Number(entity.x.toFixed(1)),
          y: Number(entity.y.toFixed(1)),
          z: Number(entity.z.toFixed(1)),
          distance,
        });
      });
    }
    nearby.sort((a, b) => a.distance - b.distance);
    return nearby.slice(0, limit).map(({ distance, ...entity }) => ({
      ...entity,
      distance: Number(distance.toFixed(1)),
    }));
  }
}

const passiveMobs = new PassiveMobManager(world, scene);

/* ------------------------------------------------------------------ *
 * Player avatar (only visible in the F5 third-person views)
 * ------------------------------------------------------------------ */

const playerMaterials = {
  skin: new THREE.MeshLambertMaterial({ color: 0xd8a077 }),
  shirt: new THREE.MeshLambertMaterial({ color: 0x3f8f8a }),
  pants: new THREE.MeshLambertMaterial({ color: 0x3c4a78 }),
  hair: new THREE.MeshLambertMaterial({ color: 0x3a2a1d }),
};

const playerGeometry = {
  head: new THREE.BoxGeometry(0.46, 0.46, 0.46),
  hair: new THREE.BoxGeometry(0.48, 0.14, 0.48),
  body: new THREE.BoxGeometry(0.5, 0.7, 0.26),
  arm: new THREE.BoxGeometry(0.2, 0.7, 0.2),
  leg: new THREE.BoxGeometry(0.22, 0.7, 0.22),
};

function createLimb(geometry, material, pivotX, pivotY) {
  const pivot = new THREE.Group();
  pivot.position.set(pivotX, pivotY, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.35;
  pivot.add(mesh);
  return pivot;
}

function createPlayerModel() {
  const root = new THREE.Group();

  const body = new THREE.Mesh(playerGeometry.body, playerMaterials.shirt);
  body.position.set(0, 1.05, 0);
  root.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.4, 0);
  const head = new THREE.Mesh(playerGeometry.head, playerMaterials.skin);
  head.position.y = 0.23;
  const hair = new THREE.Mesh(playerGeometry.hair, playerMaterials.hair);
  hair.position.y = 0.42;
  headPivot.add(head);
  headPivot.add(hair);
  root.add(headPivot);

  const leftArm = createLimb(playerGeometry.arm, playerMaterials.skin, -0.35, 1.4);
  const rightArm = createLimb(playerGeometry.arm, playerMaterials.skin, 0.35, 1.4);
  const leftLeg = createLimb(playerGeometry.leg, playerMaterials.pants, -0.13, 0.7);
  const rightLeg = createLimb(playerGeometry.leg, playerMaterials.pants, 0.13, 0.7);
  root.add(leftArm, rightArm, leftLeg, rightLeg);

  root.userData.parts = { headPivot, leftArm, rightArm, leftLeg, rightLeg };
  root.visible = false;
  return root;
}

const playerModel = createPlayerModel();
scene.add(playerModel);

/* ------------------------------------------------------------------ *
 * Dropped items — what the drop key throws out and what walking over
 * an item picks back up.
 * ------------------------------------------------------------------ */

const DROP_PICKUP_DELAY = 0.55;
const DROP_PICKUP_RANGE = 1.35;
const DROP_LIFETIME = 300;

function spawnDrop(itemId, x, y, z, vx, vy, vz) {
  const texture = getIconTexture(itemId);
  if (!texture) {
    return;
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }));
  sprite.scale.set(0.42, 0.42, 0.42);
  sprite.position.set(x, y, z);
  scene.add(sprite);
  state.drops.push({ itemId, sprite, vx, vy, vz, age: 0, bob: Math.random() * PI * 2 });
}

function removeDrop(index) {
  const drop = state.drops[index];
  scene.remove(drop.sprite);
  drop.sprite.material.dispose();
  state.drops.splice(index, 1);
}

function updateDrops(dt) {
  const player = state.player;
  for (let index = state.drops.length - 1; index >= 0; index--) {
    const drop = state.drops[index];
    drop.age += dt;
    drop.bob += dt * 2.4;

    drop.vy -= GRAVITY * 0.55 * dt;
    const nextY = drop.sprite.position.y + drop.vy * dt;
    if (world.isSolid(
      Math.floor(drop.sprite.position.x),
      Math.floor(nextY - 0.12),
      Math.floor(drop.sprite.position.z),
    )) {
      drop.vy = 0;
      drop.vx *= 0.5;
      drop.vz *= 0.5;
    } else {
      drop.sprite.position.y = nextY;
    }

    const nextX = drop.sprite.position.x + drop.vx * dt;
    const nextZ = drop.sprite.position.z + drop.vz * dt;
    if (!world.isSolid(Math.floor(nextX), Math.floor(drop.sprite.position.y), Math.floor(nextZ))) {
      drop.sprite.position.x = nextX;
      drop.sprite.position.z = nextZ;
    } else {
      drop.vx = 0;
      drop.vz = 0;
    }
    drop.vx *= 1 - dt * 2.2;
    drop.vz *= 1 - dt * 2.2;

    const hover = Math.sin(drop.bob) * 0.045;
    drop.sprite.scale.setScalar(0.42 + hover * 0.2);

    const distance = Math.hypot(
      drop.sprite.position.x - player.x,
      drop.sprite.position.y - (player.y + 0.9),
      drop.sprite.position.z - player.z,
    );
    if (drop.age > DROP_PICKUP_DELAY && distance < DROP_PICKUP_RANGE && !state.isDead) {
      addItem(drop.itemId, 1);
      showToast(`Picked up ${BLOCK_NAMES[drop.itemId]}`);
      soundEngine.select();
      state.saveDirty = true;
      removeDrop(index);
      updateInventoryPanel();
      continue;
    }
    if (drop.age > DROP_LIFETIME || drop.sprite.position.y < MIN_WORLD_Y - 8) {
      removeDrop(index);
    }
  }
}

function clearDrops() {
  while (state.drops.length > 0) {
    removeDrop(state.drops.length - 1);
  }
}

const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

function createClouds() {
  const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const puff = new THREE.Group();
    const seed = i * 17.37;
    const count = 3 + (i % 3);
    for (let j = 0; j < count; j++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(6 + (j % 2) * 2, 1.6 + ((j + i) % 2) * 0.4, 3.8),
        cloudMaterial,
      );
      box.position.set(j * 3.8 - count * 1.6, Math.sin(seed + j) * 0.35, Math.cos(seed + j) * 1.1);
      puff.add(box);
    }
    puff.position.set(
      (hash3(seed, 2, 9) - 0.5) * 220,
      28 + hash3(seed, 3, 8) * 18,
      (hash3(seed, 5, 1) - 0.5) * 220,
    );
    puff.userData.speed = 1.6 + hash3(seed, 7, 4) * 2.2;
    puff.userData.drift = hash3(seed, 8, 2) * PI * 2;
    cloudGroup.add(puff);
  }
}

createClouds();

const particleGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const particleMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
const particleMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, PARTICLE_POOL_SIZE);
particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
particleMesh.count = PARTICLE_POOL_SIZE;
scene.add(particleMesh);

const particleDummy = new THREE.Object3D();
const particleColor = new THREE.Color();
const particles = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
  active: false,
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  scale: 0,
  life: 0,
  maxLife: 0,
}));

for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
  particleDummy.position.set(0, -9999, 0);
  particleDummy.scale.setScalar(0.0001);
  particleDummy.updateMatrix();
  particleMesh.setMatrixAt(i, particleDummy.matrix);
  particleMesh.setColorAt(i, new THREE.Color(0xffffff));
}

function getBlockColor(blockType) {
  switch (blockType) {
    case BLOCKS.grass:
      return [0x5faa42, 0x3c7d2d];
    case BLOCKS.dirt:
      return [0x8a5b31, 0x6e4625];
    case BLOCKS.stone:
      return [0x8e949d, 0x757a82];
    case BLOCKS.sand:
      return [0xd7c47e, 0xcbb56f];
    case BLOCKS.wood:
      return [0x9b6b3d, 0x7a4f2c];
    case BLOCKS.pine_wood:
      return [0x6b543b, 0x4b3b2a];
    case BLOCKS.planks:
      return [0xc59a5a, 0x9a7440];
    case BLOCKS.bricks:
      return [0xa75339, 0x7c3524];
    case BLOCKS.glass:
      return [0xcdeefd, 0x91d8ef];
    case BLOCKS.snow:
      return [0xf0f4fb, 0xd5dfef];
    case BLOCKS.ice:
      return [0xa8ddf5, 0xd3f2fb];
    case BLOCKS.pine_leaves:
      return [0x5a7f68, 0x749984];
    default:
      return [0x6cab57, 0x84c56f];
  }
}

function spawnParticles(x, y, z, blockType, count, impulseY = 2.4) {
  const [baseColor, accentColor] = getBlockColor(blockType);
  for (let i = 0; i < particles.length && count > 0; i++) {
    const particle = particles[i];
    if (particle.active) {
      continue;
    }
    particle.active = true;
    particle.position.set(
      x + (Math.random() - 0.5) * 0.8,
      y + Math.random() * 0.9,
      z + (Math.random() - 0.5) * 0.8,
    );
    particle.velocity.set(
      (Math.random() - 0.5) * 3.6,
      impulseY + Math.random() * 2.2,
      (Math.random() - 0.5) * 3.6,
    );
    particle.scale = 0.08 + Math.random() * 0.1;
    particle.life = 0.3 + Math.random() * 0.35;
    particle.maxLife = particle.life;
    particleColor.setHex(Math.random() > 0.5 ? baseColor : accentColor);
    particleMesh.setColorAt(i, particleColor);
    count--;
  }
  particleMesh.instanceColor.needsUpdate = true;
}

function updateParticles(dt) {
  let changed = false;
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    if (!particle.active) {
      continue;
    }
    changed = true;
    particle.life -= dt;
    if (particle.life <= 0) {
      particle.active = false;
      particleDummy.position.set(0, -9999, 0);
      particleDummy.scale.setScalar(0.0001);
      particleDummy.updateMatrix();
      particleMesh.setMatrixAt(i, particleDummy.matrix);
      continue;
    }
    particle.velocity.y -= 13 * dt;
    particle.position.addScaledVector(particle.velocity, dt);
    const fade = particle.life / particle.maxLife;
    particleDummy.position.copy(particle.position);
    particleDummy.scale.setScalar(particle.scale * fade);
    particleDummy.updateMatrix();
    particleMesh.setMatrixAt(i, particleDummy.matrix);
  }
  if (changed) {
    particleMesh.instanceMatrix.needsUpdate = true;
  }
}

const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
const highlightMaterial = new THREE.LineBasicMaterial({
  color: 0xffe899,
  transparent: true,
  opacity: 0.95,
});
const targetHighlight = new THREE.LineSegments(highlightGeometry, highlightMaterial);
targetHighlight.visible = false;
scene.add(targetHighlight);

const breakOverlayMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd57e,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const breakOverlay = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), breakOverlayMaterial);
breakOverlay.visible = false;
breakOverlay.renderOrder = 3;
scene.add(breakOverlay);

const highlightBaseColor = new THREE.Color(0xffe899);
const highlightDamageColor = new THREE.Color(0xff7f52);
const workingHighlightColor = new THREE.Color();

const raycaster = new THREE.Raycaster();
raycaster.far = INTERACTION_RANGE;

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function getTargetKey(target) {
  return target ? `${target.block.x},${target.block.y},${target.block.z}` : null;
}

function resetBreakState() {
  state.breakState.key = null;
  state.breakState.blockType = BLOCKS.air;
  state.breakState.progress = 0;
  state.breakState.hardness = 1;
  state.breakState.lastHitTime = -999;
  state.breakState.pulse = 0;
  updateBreakVisuals();
}

function updateBreakVisuals() {
  const activeKey = getTargetKey(state.target);
  const showDamage =
    state.target &&
    state.breakState.key === activeKey &&
    state.breakState.progress > 0;

  if (!showDamage) {
    highlightMaterial.color.copy(highlightBaseColor);
    highlightMaterial.opacity = 0.95;
    breakOverlay.visible = false;
    return;
  }

  const fraction = clamp(state.breakState.progress / state.breakState.hardness, 0, 1);
  workingHighlightColor.copy(highlightBaseColor).lerp(highlightDamageColor, fraction);
  highlightMaterial.color.copy(workingHighlightColor);
  highlightMaterial.opacity = 0.78 + fraction * 0.2;
  breakOverlay.visible = true;
  breakOverlay.position.copy(targetHighlight.position);
  breakOverlay.scale.setScalar(0.96 + fraction * 0.08 + state.breakState.pulse * 0.035);
  breakOverlayMaterial.color.copy(workingHighlightColor);
  breakOverlayMaterial.opacity = 0.04 + fraction * 0.16 + state.breakState.pulse * 0.06;
}

function buildHotbar() {
  hotbar.replaceChildren();
  for (let index = 0; index < HOTBAR_SIZE; index++) {
    const slot = document.createElement("div");
    slot.className = "hotbar-slot";
    slot.dataset.slot = String(index);
    slot.innerHTML =
      `<span class="slot-key">${index + 1}</span>` +
      `<div class="slot-icon"></div>` +
      `<span class="slot-count"></span>`;
    hotbar.appendChild(slot);
  }
}

function updateHotbar() {
  for (const slot of hotbar.children) {
    const slotIndex = Number(slot.dataset.slot);
    const itemId = state.hotbarSlots[slotIndex];
    const count = getItemCount(itemId);
    const icon = slot.querySelector(".slot-icon");
    const countLabel = slot.querySelector(".slot-count");
    slot.classList.toggle("is-active", slotIndex === state.activeSlot);
    slot.classList.toggle("is-empty", itemId == null || count <= 0);

    const iconValue = itemId == null ? "none" : `url("${itemIcons.get(itemId)}")`;
    if (icon && icon.dataset.value !== iconValue) {
      icon.dataset.value = iconValue;
      icon.style.backgroundImage = iconValue;
    }
    if (countLabel) {
      // Minecraft hides the stack size for single items and unlimited stacks.
      const text = itemId == null || count <= 1 || isCreative() ? "" : String(count);
      if (countLabel.textContent !== text) {
        countLabel.textContent = text;
      }
    }
  }
}

function createInventorySlot(itemId, count, selected) {
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

function canCraft(recipe) {
  return Object.entries(recipe.ingredients).every(([blockType, needed]) => (state.inventory[Number(blockType)] ?? 0) >= needed);
}

function canSmelt(recipe) {
  return (state.inventory[recipe.input] ?? 0) >= recipe.inputCount &&
    (state.inventory[recipe.fuel] ?? 0) >= recipe.fuelCount;
}

function craftRecipe(recipeId, collection) {
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

function smeltRecipe(recipeId) {
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

function getAccessibleStations() {
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

function createPatternGrid(pattern) {
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

function buildRecipeSection(title, subtitle, recipes, type) {
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

function updateInventoryPanel() {
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

function toggleInventory(forceOpen) {
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

function setActiveItem(itemId) {
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

/* ------------------------------------------------------------------ *
 * Screens — title, pause, controls, options and help all live in the
 * same stack. "playing" simply means no screen is up.
 * ------------------------------------------------------------------ */

function showScreen(name) {
  state.screen = name;
  state.running = name === "playing";
  state.mode = name === "playing" ? "playing" : name === "title" ? "menu" : name;

  for (const [key, element] of Object.entries(screenElements)) {
    element.classList.toggle("is-hidden", key !== name);
  }
  document.body.classList.toggle("is-playing", state.running);

  if (!state.running) {
    toggleInventory(false);
    state.keys.clear();
    state.sprintLatched = false;
    exitPointerLock();
  }
  if (name === "title") {
    state.isDead = false;
    deathScreen.classList.add("is-hidden");
  }
  if (name === "controls") {
    buildControlsScreen();
  }
  if (name === "options") {
    syncOptionsScreen();
  }
  if (name === "help") {
    buildHelpControls();
  }
  if (name === "pause") {
    syncPauseScreen();
  }
  updateModeBanner();
}

function openSubScreen(name) {
  state.screenReturn = state.screen === "controls" || state.screen === "options" || state.screen === "help"
    ? state.screenReturn
    : state.screen;
  showScreen(name);
}

function closeSubScreen() {
  showScreen(state.screenReturn === "playing" ? "pause" : state.screenReturn || "title");
}

function setMode(mode) {
  showScreen(mode === "playing" ? "playing" : "title");
}

function startGame() {
  showScreen("playing");
  canvas.focus();
  soundEngine.resume();
  soundEngine.applyVolume();
  requestPointerLock();
  announceHeldItem();
}

function resumeGame() {
  showScreen("playing");
  soundEngine.resume();
  requestPointerLock();
}

function openPauseMenu() {
  if (state.screen !== "playing") {
    return;
  }
  showScreen("pause");
}

function setGameMode(mode, { announce = true } = {}) {
  state.gameMode = mode === "creative" ? "creative" : "survival";
  if (!isCreative()) {
    state.flying = false;
    state.flyVelocityY = 0;
  }
  updateModeBanner();
  syncPauseScreen();
  syncModePicker();
  updateHotbar();
  if (state.inventoryOpen) {
    updateInventoryPanel();
  }
  if (announce) {
    showToast(`Game mode: ${isCreative() ? "Creative" : "Survival"}`);
  }
  state.saveDirty = true;
}

function requestPointerLock() {
  if (state.inventoryOpen || !state.running || state.pointerLocked || state.isDead) {
    return;
  }
  if (!canvas.requestPointerLock) {
    state.pointerLockUnavailable = true;
    return;
  }
  try {
    const lockRequest = canvas.requestPointerLock();
    lockRequest?.catch?.(() => {
      state.pointerLockUnavailable = true;
    });
  } catch {
    state.pointerLockUnavailable = true;
  }
}

function exitPointerLock() {
  if (document.pointerLockElement) {
    state.intentionalUnlock = true;
    document.exitPointerLock();
  }
}

function updatePointerState() {
  const locked = document.pointerLockElement === canvas;
  state.pointerLocked = locked;
  document.body.classList.toggle("is-locked", locked);
  if (locked) {
    state.dragLook = false;
    state.dragAnchor = null;
    state.pointerLockUnavailable = false;
    return;
  }
  if (state.intentionalUnlock) {
    state.intentionalUnlock = false;
    return;
  }
  // Esc while locked never reaches keydown, so the unlock itself pauses.
  if (state.screen === "playing" && !state.inventoryOpen && !state.isDead) {
    openPauseMenu();
  }
}

function moveLook(deltaX, deltaY) {
  const sensitivity = BASE_LOOK_SENSITIVITY * clamp(settings.sensitivity / 100, 0.05, 4);
  const pitchSign = settings.invertMouse ? 1 : -1;
  state.player.yaw -= deltaX * sensitivity;
  state.player.pitch += pitchSign * deltaY * sensitivity;
  state.player.pitch = clamp(state.player.pitch, -1.55, 1.55);
}

const daySky = new THREE.Color(0x9fd0ff);
const duskSky = new THREE.Color(0xf2b26a);
const nightSky = new THREE.Color(0x0c1324);
const fogColor = new THREE.Color();
const skyColor = new THREE.Color();

function updateLighting() {
  const sunAngle = state.dayTime * PI * 2 - PI / 2;
  const daylight = clamp(Math.sin(sunAngle) * 0.5 + 0.5, 0, 1);
  const dusk = 1 - Math.abs(daylight - 0.5) * 2;
  skyColor.copy(nightSky).lerp(duskSky, dusk * 0.35).lerp(daySky, daylight);
  fogColor.copy(nightSky).lerp(daySky, daylight * 0.9);
  scene.background.copy(skyColor);
  scene.fog.color.copy(fogColor);
  hemisphereLight.intensity = 0.28 + daylight * 1.4;
  sunLight.intensity = 0.18 + daylight * 1.25;
  sunLight.position.set(
    Math.cos(sunAngle) * 38,
    14 + Math.sin(sunAngle) * 52,
    Math.sin(sunAngle * 0.7) * 24,
  );
  renderer.toneMappingExposure = 0.72 + daylight * 0.38;
  for (const cloud of cloudGroup.children) {
    cloud.position.x += cloud.userData.speed * 0.016;
    cloud.position.z += Math.sin(state.elapsed * 0.15 + cloud.userData.drift) * 0.01;
    if (cloud.position.x > 140) {
      cloud.position.x = -140;
    }
  }
}

function hasCollision(x, y, z) {
  const minX = Math.floor(x - PLAYER_RADIUS);
  const maxX = Math.floor(x + PLAYER_RADIUS);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + PLAYER_HEIGHT - 0.001);
  const minZ = Math.floor(z - PLAYER_RADIUS);
  const maxZ = Math.floor(z + PLAYER_RADIUS);

  for (let by = minY; by <= maxY; by++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      for (let bx = minX; bx <= maxX; bx++) {
        if (world.isSolid(bx, by, bz)) {
          return true;
        }
      }
    }
  }
  return false;
}

function movePlayerToSpawn() {
  state.player.x = DEFAULT_SPAWN.x;
  state.player.y = world.getHeightAt(Math.floor(DEFAULT_SPAWN.x), Math.floor(DEFAULT_SPAWN.z)) + 1.05;
  state.player.z = DEFAULT_SPAWN.z;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.vz = 0;
  state.player.yaw = DEFAULT_SPAWN.yaw;
  state.player.pitch = DEFAULT_SPAWN.pitch;
  state.player.onGround = false;
  state.nextFootstepAt = state.elapsed + 0.24;
}

const RESPAWN_SEARCH_RADIUS = 16;
const RESPAWN_HEADROOM = 20;
const PIT_WALL_HEIGHT = 2;

/**
 * Topmost non-air block in a column, honouring player edits (unlike
 * getHeightAt, which only knows about generated terrain).
 */
function getStandableSurfaceY(bx, bz) {
  const start = Math.min(MAX_WORLD_Y, world.getHeightAt(bx, bz) + RESPAWN_HEADROOM);
  for (let y = start; y >= MIN_WORLD_Y; y--) {
    const blockType = world.getBlock(bx, y, bz);
    if (blockType !== BLOCKS.air && blockType !== BLOCKS.water) {
      return y;
    }
  }
  return null;
}

/**
 * A column is only a respawn candidate when the player fits, nothing roofs
 * it over, and it is not the floor of a dug-out shaft.
 */
function evaluateRespawnColumn(bx, bz) {
  const surfaceY = getStandableSurfaceY(bx, bz);
  if (surfaceY === null || surfaceY + 1 > MAX_BUILD_HEIGHT) {
    return null;
  }
  const feetY = surfaceY + 1;

  // Open to the sky: a roof means a cave or a covered-over hole.
  for (let y = feetY; y <= Math.min(MAX_WORLD_Y, feetY + RESPAWN_HEADROOM); y++) {
    if (world.isSolid(bx, y, bz)) {
      return null;
    }
  }
  if (hasCollision(bx + 0.5, feetY + 0.05, bz + 0.5)) {
    return null;
  }

  // Walled in on nearly every side means we are at the bottom of a pit.
  let walls = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const neighbour = getStandableSurfaceY(bx + dx, bz + dz);
    if (neighbour !== null && neighbour - surfaceY >= PIT_WALL_HEIGHT) {
      walls++;
    }
  }
  if (walls >= 6) {
    return null;
  }

  return { x: bx + 0.5, y: feetY + 0.05, z: bz + 0.5 };
}

/** Squares at Chebyshev distance `radius` from the origin, nearest first. */
function ringOffsets(radius) {
  if (radius === 0) {
    return [[0, 0]];
  }
  const offsets = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) === radius) {
        offsets.push([dx, dz]);
      }
    }
  }
  offsets.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  return offsets;
}

function findClosestSafeRespawn() {
  const originX = Math.floor(state.lastSafePosX);
  const originZ = Math.floor(state.lastSafePosZ);

  for (let radius = 0; radius <= RESPAWN_SEARCH_RADIUS; radius++) {
    for (const [dx, dz] of ringOffsets(radius)) {
      const spot = evaluateRespawnColumn(originX + dx, originZ + dz);
      if (spot) {
        return spot;
      }
    }
  }

  // Nothing nearby worked out, so fall back to world spawn.
  const spawnX = Math.floor(DEFAULT_SPAWN.x);
  const spawnZ = Math.floor(DEFAULT_SPAWN.z);
  const spawnSpot = evaluateRespawnColumn(spawnX, spawnZ);
  if (spawnSpot) {
    return spawnSpot;
  }
  return {
    x: DEFAULT_SPAWN.x,
    y: world.getHeightAt(spawnX, spawnZ) + 1.05,
    z: DEFAULT_SPAWN.z,
  };
}

/**
 * Records where a respawn should drop the player. Only open ground counts,
 * so dying after digging down never sends you back into the same shaft.
 */
function updateSafeAnchor(dt) {
  state.safeAnchorCooldown -= dt;
  if (state.safeAnchorCooldown > 0 || !state.player.onGround || state.flying) {
    return;
  }
  state.safeAnchorCooldown = 0.5;
  const bx = Math.floor(state.player.x);
  const bz = Math.floor(state.player.z);
  if (evaluateRespawnColumn(bx, bz)) {
    state.lastSafePosX = state.player.x;
    state.lastSafePosZ = state.player.z;
  }
}

function handlePlayerDeath() {
  if (state.isDead) {
    return;
  }
  state.isDead = true;
  state.flying = false;
  state.flyVelocityY = 0;
  state.sprintLatched = false;
  state.keys.clear();
  exitPointerLock();
  const pos = findClosestSafeRespawn();
  deathLocationText.textContent = `Nearest safe ground at (${Math.round(pos.x)}, ${Math.round(pos.z)})`;
  deathScreen.classList.remove("is-hidden");
}

function respawnPlayer() {
  const pos = findClosestSafeRespawn();
  state.player.x = pos.x;
  state.player.y = pos.y;
  state.player.z = pos.z;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.vz = 0;
  state.player.yaw = DEFAULT_SPAWN.yaw;
  state.player.pitch = DEFAULT_SPAWN.pitch;
  state.player.onGround = false;
  state.nextFootstepAt = state.elapsed + 0.24;
  state.isDead = false;
  state.flying = false;
  state.flyVelocityY = 0;
  state.safeAnchorCooldown = 0;

  // Last resort: never leave the player embedded in geometry.
  let attempts = 0;
  while (hasCollision(state.player.x, state.player.y, state.player.z) && attempts < 32) {
    state.player.y += 1;
    attempts += 1;
  }

  deathScreen.classList.add("is-hidden");
  if (state.screen !== "playing") {
    showScreen("playing");
  }
  requestPointerLock();
}

function ensureValidPlayerPosition() {
  if (hasCollision(state.player.x, state.player.y, state.player.z)) {
    movePlayerToSpawn();
  }
}

function getFootstepBlockType() {
  return world.getBlock(
    Math.floor(state.player.x),
    Math.floor(state.player.y - 0.08),
    Math.floor(state.player.z),
  );
}

function tryStepUp(nextX, currentY, nextZ) {
  const steppedY = currentY + MAX_STEP_HEIGHT;
  if (!hasCollision(nextX, steppedY, nextZ) && hasCollision(nextX, steppedY - 0.1, nextZ)) {
    return steppedY;
  }
  return null;
}

/** True when any part of the player's footprint has a block under it. */
function hasGroundUnder(x, y, z) {
  const footY = Math.floor(y - 0.06);
  const corners = [
    [-PLAYER_RADIUS, -PLAYER_RADIUS],
    [PLAYER_RADIUS, -PLAYER_RADIUS],
    [-PLAYER_RADIUS, PLAYER_RADIUS],
    [PLAYER_RADIUS, PLAYER_RADIUS],
  ];
  for (const [dx, dz] of corners) {
    if (world.isSolid(Math.floor(x + dx), footY, Math.floor(z + dz))) {
      return true;
    }
  }
  return false;
}

function movePlayerAxis(axis, amount) {
  if (amount === 0) {
    return;
  }

  const player = state.player;
  const next = { x: player.x, y: player.y, z: player.z };
  next[axis] += amount;

  // Sneaking refuses to walk off a ledge, exactly like Minecraft.
  if (
    axis !== "y" &&
    state.sneaking &&
    !state.flying &&
    player.onGround &&
    hasGroundUnder(player.x, player.y, player.z) &&
    !hasGroundUnder(next.x, next.y, next.z)
  ) {
    return;
  }

  if (!hasCollision(next.x, next.y, next.z)) {
    player[axis] = next[axis];
    return;
  }

  if (axis !== "y" && player.onGround) {
    const steppedY = tryStepUp(
      axis === "x" ? next.x : player.x,
      player.y,
      axis === "z" ? next.z : player.z,
    );
    if (steppedY !== null) {
      player.y = steppedY;
      player[axis] = next[axis];
      player.onGround = false;
      return;
    }
  }

  if (axis === "y" && amount < 0) {
    player.onGround = true;
  }
  if (axis === "x") {
    player.vx = 0;
  } else if (axis === "y") {
    player.vy = 0;
  } else {
    player.vz = 0;
  }
}

const eyePosition = new THREE.Vector3();
const lookDirection = new THREE.Vector3();
const cameraOffsetRay = new THREE.Raycaster();

/** Feet-to-eye height, shrunk while sneaking. */
function getEyeHeight() {
  return CAMERA_HEIGHT - (state.sneaking && !state.flying ? SNEAK_CAMERA_DROP : 0);
}

function getEyePosition(target) {
  return target.set(
    state.player.x,
    state.player.y + getEyeHeight() + state.viewBob,
    state.player.z,
  );
}

function getLookDirection(target, yaw = state.player.yaw, pitch = state.player.pitch) {
  return target.set(
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ).normalize();
}

function applyPlayerToCamera() {
  const player = state.player;
  const horizontalSpeed = Math.hypot(player.vx, player.vz);
  const bobbing = settings.viewBobbing && player.onGround && !state.flying;
  const bobStrength = bobbing ? clamp(horizontalSpeed / (MOVE_SPEED * 1.65), 0, 1) : 0;
  const bobX = Math.sin(state.stepPhase) * 0.05 * bobStrength;
  const bobY = Math.abs(Math.cos(state.stepPhase * 0.5)) * 0.08 * bobStrength;
  const sideTilt = settings.viewBobbing ? clamp(player.vx * 0.012, -0.04, 0.04) : 0;

  // The interaction ray always starts at the eye, whatever the camera does.
  getEyePosition(eyePosition);
  getLookDirection(lookDirection);

  const frontView = state.perspective === 2;
  const viewYaw = frontView ? player.yaw + PI : player.yaw;
  const viewPitch = frontView ? -player.pitch : player.pitch;

  camera.rotation.y = viewYaw;
  camera.rotation.x = viewPitch;
  camera.rotation.z = sideTilt;

  if (state.perspective === 0) {
    camera.position.set(
      eyePosition.x + bobX,
      eyePosition.y - bobY,
      eyePosition.z,
    );
  } else {
    // Pull the camera back along the view axis, stopping short of walls.
    const back = getLookDirection(new THREE.Vector3(), viewYaw, viewPitch).negate();
    let distance = THIRD_PERSON_DISTANCE;
    cameraOffsetRay.set(eyePosition, back);
    cameraOffsetRay.far = THIRD_PERSON_DISTANCE;
    const blocked = cameraOffsetRay.intersectObjects(chunkMeshes.getMeshes(), false)[0];
    if (blocked) {
      distance = Math.max(0.6, blocked.distance - 0.35);
    }
    camera.position.copy(eyePosition).addScaledVector(back, distance);
  }

  const targetFov = settings.fov
    + (state.sprinting ? 5.5 : 0)
    + (state.flying && horizontalSpeed > MOVE_SPEED ? 4 : 0)
    + bobStrength * 1.8;
  camera.fov = lerp(camera.fov, targetFov, 0.14);
  camera.updateProjectionMatrix();
  updatePlayerModel();
}

function updatePlayerModel() {
  const visible = state.perspective !== 0 && state.running && !state.isDead;
  playerModel.visible = visible;
  if (!visible) {
    return;
  }
  const player = state.player;
  const parts = playerModel.userData.parts;
  const speed = Math.hypot(player.vx, player.vz);
  const swing = speed > 0.2 ? Math.sin(state.stepPhase) * clamp(speed / MOVE_SPEED, 0, 1.2) * 0.7 : 0;

  playerModel.position.set(player.x, player.y, player.z);
  playerModel.rotation.y = player.yaw;
  parts.headPivot.rotation.x = -player.pitch;
  parts.leftArm.rotation.x = state.flying ? -0.35 : swing;
  parts.rightArm.rotation.x = state.flying ? -0.35 : -swing;
  parts.leftLeg.rotation.x = state.flying ? 0.25 : -swing;
  parts.rightLeg.rotation.x = state.flying ? -0.25 : swing;
  playerModel.position.y -= state.sneaking && !state.flying ? 0.12 : 0;
}

function canPlaceBlock(x, y, z) {
  if (y < MIN_WORLD_Y || y > MAX_BUILD_HEIGHT) {
    return false;
  }
  return !hasCollision(x + 0.5, y, z + 0.5);
}

function updateTarget() {
  applyPlayerToCamera();
  // Always aim from the eye so first and third person share the same reach.
  raycaster.set(eyePosition, lookDirection);
  raycaster.far = INTERACTION_RANGE;
  const intersections = raycaster.intersectObjects(chunkMeshes.getMeshes(), false);
  const hit = intersections[0];

  if (!hit || !hit.face) {
    state.target = null;
    targetHighlight.visible = false;
    breakOverlay.visible = false;
    updateBreakVisuals();
    return;
  }

  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round();
  const blockCoords = floorVector(hit.point.clone().addScaledVector(normal, -0.01));
  const placeCoords = floorVector(hit.point.clone().addScaledVector(normal, 0.01));
  const blockType = world.getBlock(blockCoords.x, blockCoords.y, blockCoords.z);

  if (blockType === BLOCKS.air) {
    state.target = null;
    targetHighlight.visible = false;
    breakOverlay.visible = false;
    updateBreakVisuals();
    return;
  }

  state.target = {
    block: { ...blockCoords, type: blockType },
    place: placeCoords,
    normal: { x: normal.x, y: normal.y, z: normal.z },
    distance: hit.distance,
  };

  targetHighlight.visible = true;
  targetHighlight.position.set(
    blockCoords.x + 0.5,
    blockCoords.y + 0.5,
    blockCoords.z + 0.5,
  );
  updateBreakVisuals();
}

function interact(breaking) {
  updateTarget();
  if (!state.target) {
    if (breaking) {
      resetBreakState();
    }
    return;
  }
  const cooldown = getInteractionCooldown(state.target.block.type, breaking);
  if (state.elapsed - state.lastInteractionTime < cooldown) {
    return;
  }
  state.lastInteractionTime = state.elapsed;

  if (breaking) {
    if (!canMineBlock(state.target.block.type)) {
      showToast(`Need a better tool for ${BLOCK_NAMES[state.target.block.type]}`);
      resetBreakState();
      return;
    }
    const targetKey = getTargetKey(state.target);
    if (state.breakState.key !== targetKey || state.breakState.blockType !== state.target.block.type) {
      state.breakState.key = targetKey;
      state.breakState.blockType = state.target.block.type;
      state.breakState.progress = 0;
      state.breakState.hardness = getBreakHardness(state.target.block.type);
    }
    state.breakState.progress += getBreakDamage(state.target.block.type);
    state.breakState.lastHitTime = state.elapsed;
    state.breakState.pulse = 1;
    spawnParticles(
      state.target.block.x + 0.5,
      state.target.block.y + 0.5,
      state.target.block.z + 0.5,
      state.target.block.type,
      3,
      0.85,
    );
    soundEngine.hit(state.target.block.type, false);
    if (state.breakState.progress < state.breakState.hardness) {
      updateBreakVisuals();
      return;
    }
    const brokenType = state.target.block.type;
    if (world.setBlock(state.target.block.x, state.target.block.y, state.target.block.z, BLOCKS.air)) {
      chunkMeshes.markDirtyAtWorld(state.target.block.x, state.target.block.z);
      const dropId = getDropForBlock(brokenType);
      if (dropId != null && isCollectibleBlock(brokenType) && !isCreative()) {
        addItem(dropId, 1);
        showToast(`Collected ${BLOCK_NAMES[dropId]}`);
      }
      spawnParticles(
        state.target.block.x + 0.5,
        state.target.block.y + 0.5,
        state.target.block.z + 0.5,
        brokenType,
        10,
        2.2,
      );
      soundEngine.hit(brokenType, true);
      state.saveDirty = true;
    }
    resetBreakState();
  } else {
    resetBreakState();
    const selectedItem = getSelectedItem();
    if (!isPlaceableItem(selectedItem)) {
      return;
    }
    if (canPlaceBlock(state.target.place.x, state.target.place.y, state.target.place.z)) {
      if (getItemCount(selectedItem) <= 0) {
        showToast(`Out of ${BLOCK_NAMES[selectedItem]}`);
      } else if (world.setBlock(state.target.place.x, state.target.place.y, state.target.place.z, selectedItem)) {
        consumeItem(selectedItem, 1);
        chunkMeshes.markDirtyAtWorld(state.target.place.x, state.target.place.z);
        spawnParticles(
          state.target.place.x + 0.5,
          state.target.place.y + 0.5,
          state.target.place.z + 0.5,
          selectedItem,
          6,
          1.6,
        );
        soundEngine.place(selectedItem);
        state.saveDirty = true;
      }
    }
  }

  chunkMeshes.syncLoadedChunks();
  updateTarget();
  updateInventoryPanel();
  updateHotbar();
}

/* ------------------------------------------------------------------ *
 * One-shot actions (fired from a key press, not polled)
 * ------------------------------------------------------------------ */

function showToast(message, duration = 1.6) {
  state.uiMessage = message;
  state.uiMessageTimer = duration;
}

function announceHeldItem() {
  const itemId = getSelectedItem();
  state.heldItemName = itemId == null ? "" : BLOCK_NAMES[itemId];
  state.heldItemTimer = itemId == null ? 0 : 2;
}

function selectHotbarSlot(index) {
  if (index < 0 || index >= HOTBAR_SIZE || index === state.activeSlot) {
    return;
  }
  state.activeSlot = index;
  const itemId = getSelectedItem();
  if (isPlaceableItem(itemId)) {
    state.selectedBlock = itemId;
  }
  resetBreakState();
  announceHeldItem();
  soundEngine.select();
  updateHotbar();
  state.saveDirty = true;
}

function scrollHotbar(direction) {
  const next = (state.activeSlot + direction + HOTBAR_SIZE) % HOTBAR_SIZE;
  selectHotbarSlot(next);
}

/** Middle click: put the block you are looking at into your hand. */
function pickBlock() {
  if (!state.target) {
    return;
  }
  const blockType = state.target.block.type;
  if (!isPlaceableItem(blockType)) {
    showToast(`Cannot pick ${BLOCK_NAMES[blockType]}`);
    return;
  }
  const existing = state.hotbarSlots.indexOf(blockType);
  if (existing !== -1) {
    selectHotbarSlot(existing);
    return;
  }
  if (getItemCount(blockType) <= 0) {
    showToast(`No ${BLOCK_NAMES[blockType]} in bag`);
    return;
  }
  state.hotbarSlots[state.activeSlot] = blockType;
  state.selectedBlock = blockType;
  announceHeldItem();
  soundEngine.select();
  updateHotbar();
  state.saveDirty = true;
}

/** Drop key: throws the held item into the world where it can be re-collected. */
function dropHeldItem(wholeStack = false) {
  const itemId = getSelectedItem();
  if (itemId == null) {
    return;
  }
  const available = getItemCount(itemId);
  if (available <= 0) {
    return;
  }
  const amount = isCreative() ? 1 : Math.min(available, wholeStack ? available : 1);
  consumeItem(itemId, amount);

  const player = state.player;
  const dir = getLookDirection(new THREE.Vector3());
  for (let i = 0; i < Math.min(amount, 8); i++) {
    const spread = (Math.random() - 0.5) * 0.6;
    spawnDrop(
      itemId,
      player.x + dir.x * 0.5,
      player.y + getEyeHeight() - 0.35,
      player.z + dir.z * 0.5,
      dir.x * 3.4 + spread,
      dir.y * 3.4 + 1.8,
      dir.z * 3.4 + spread,
    );
  }
  showToast(`Dropped ${amount} ${BLOCK_NAMES[itemId]}`);
  soundEngine.ui(false);
  state.saveDirty = true;
  updateHotbar();
  updateInventoryPanel();
}

function cyclePerspective() {
  state.perspective = (state.perspective + 1) % 3;
  const names = ["First Person", "Third Person Back", "Third Person Front"];
  showToast(names[state.perspective]);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  } else {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

function takeScreenshot() {
  try {
    render(0);
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `mycraft-${Math.floor(state.elapsed * 1000)}.png`;
    link.click();
    showToast("Screenshot saved");
  } catch {
    showToast("Screenshot failed");
  }
}

function toggleFlight() {
  if (!isCreative()) {
    return;
  }
  state.flying = !state.flying;
  state.flyVelocityY = 0;
  state.player.vy = 0;
  if (state.flying) {
    state.player.onGround = false;
  }
  showToast(state.flying ? "Flying enabled" : "Flying disabled");
  updateModeBanner();
}

function updateModeBanner() {
  // The F3 overlay already reports the mode, so step aside for it.
  if (!state.running || state.debugVisible) {
    modeBanner.textContent = "";
    return;
  }
  const parts = [isCreative() ? "Creative" : "Survival"];
  if (state.flying) {
    parts.push("Flying");
  }
  modeBanner.textContent = parts.join(" · ");
  modeBanner.classList.toggle("is-flying", state.flying);
}

/* ------------------------------------------------------------------ *
 * Per-frame input polling
 * ------------------------------------------------------------------ */

function handleInput(dt) {
  const player = state.player;
  if (state.inventoryOpen || !state.running || state.isDead) {
    player.vx = 0;
    player.vz = 0;
    state.sneaking = false;
    state.sprinting = false;
    return;
  }

  const forwardIntent = (isActionDown("forward") ? 1 : 0) + (isActionDown("back") ? -1 : 0);
  const strafeIntent = (isActionDown("right") ? 1 : 0) + (isActionDown("left") ? -1 : 0);

  // Arrow keys stay available as a look fallback when there is no mouse.
  if (state.keys.has("ArrowLeft")) {
    player.yaw += dt * 1.9;
  }
  if (state.keys.has("ArrowRight")) {
    player.yaw -= dt * 1.9;
  }
  if (state.keys.has("ArrowUp")) {
    player.pitch = clamp(player.pitch + dt * 1.55, -1.55, 1.55);
  }
  if (state.keys.has("ArrowDown")) {
    player.pitch = clamp(player.pitch - dt * 1.55, -1.55, 1.55);
  }

  state.sneaking = isActionDown("sneak");
  if (state.sneaking || forwardIntent <= 0) {
    state.sprintLatched = false;
  }
  const sprintHeld = isActionDown("sprint");
  state.sprinting = forwardIntent > 0
    && !state.sneaking
    && (state.sprintLatched || sprintHeld);

  const moveX = -Math.sin(player.yaw);
  const moveZ = -Math.cos(player.yaw);
  const strafeX = Math.cos(player.yaw);
  const strafeZ = -Math.sin(player.yaw);
  let wishX = moveX * forwardIntent + strafeX * strafeIntent;
  let wishZ = moveZ * forwardIntent + strafeZ * strafeIntent;

  const length = Math.hypot(wishX, wishZ);
  if (length > 0.001) {
    wishX /= length;
    wishZ /= length;
    state.stepPhase += dt * (state.sprinting ? 16 : state.sneaking ? 7 : 11);
  }

  let speed = MOVE_SPEED;
  if (state.flying) {
    speed = FLY_SPEED * (sprintHeld || state.sprintLatched ? FLY_BOOST_MULTIPLIER : 1);
  } else if (state.sneaking) {
    speed = MOVE_SPEED * SNEAK_MULTIPLIER;
  } else if (state.sprinting) {
    speed = MOVE_SPEED * SPRINT_MULTIPLIER;
  }
  player.vx = wishX * speed;
  player.vz = wishZ * speed;

  if (state.flying) {
    const vertical = (isActionDown("jump") ? 1 : 0) + (isActionDown("sneak") ? -1 : 0);
    player.vy = vertical * FLY_VERTICAL_SPEED * (sprintHeld ? 1.6 : 1);
  } else if (isActionDown("jump") && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
    soundEngine.jump();
  }

  if (state.elapsed < state.suppressInteractUntil) {
    return;
  }
  if (isActionDown("attack")) {
    interact(true);
  }
  if (isActionDown("use")) {
    interact(false);
  }
}

/* ------------------------------------------------------------------ *
 * HUD + F3 debug overlay
 * ------------------------------------------------------------------ */

function getFacingLabel(yaw) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  if (Math.abs(fz) >= Math.abs(fx)) {
    return fz < 0 ? "north (-Z)" : "south (+Z)";
  }
  return fx > 0 ? "east (+X)" : "west (-X)";
}

function getBiomeLabel() {
  const player = state.player;
  if (isInsideRect(player.x, player.z, SNOW_REALM)) {
    return "snow realm";
  }
  if (isInsideRect(player.x, player.z, CITY_PLAN)) {
    return "city district";
  }
  if (isInsideRect(player.x, player.z, SUBURB_PLAN)) {
    return "suburbs";
  }
  return "wilderness";
}

function updateHud() {
  hudLayer.classList.toggle("is-hidden", !state.hudVisible);

  const showToastLabel = state.uiMessageTimer > 0;
  toastLabel.classList.toggle("is-visible", showToastLabel);
  if (showToastLabel && toastLabel.textContent !== state.uiMessage) {
    toastLabel.textContent = state.uiMessage;
  }

  const showItemName = state.heldItemTimer > 0;
  itemNameLabel.classList.toggle("is-visible", showItemName);
  if (showItemName && itemNameLabel.textContent !== state.heldItemName) {
    itemNameLabel.textContent = state.heldItemName;
  }

  debugOverlay.classList.toggle("is-hidden", !state.debugVisible || !state.hudVisible);
  if (!state.debugVisible || !state.hudVisible) {
    return;
  }

  const player = state.player;
  const activeItem = getSelectedItem();
  const breakPercent = state.breakState.key && state.breakState.hardness > 0
    ? Math.round(clamp(state.breakState.progress / state.breakState.hardness, 0, 1) * 100)
    : 0;
  const movement = state.flying
    ? "flying"
    : state.sneaking
      ? "sneaking"
      : state.sprinting
        ? "sprinting"
        : player.onGround ? "walking" : "airborne";

  debugLeft.textContent =
    `MyCraft — ${state.fps} fps\n` +
    `XYZ: ${player.x.toFixed(3)} / ${player.y.toFixed(3)} / ${player.z.toFixed(3)}\n` +
    `Block: ${Math.floor(player.x)} ${Math.floor(player.y)} ${Math.floor(player.z)}\n` +
    `Chunk: ${Math.floor(player.x / CHUNK_SIZE)} ${Math.floor(player.z / CHUNK_SIZE)}\n` +
    `Facing: ${getFacingLabel(player.yaw)} (yaw ${player.yaw.toFixed(2)} pitch ${player.pitch.toFixed(2)})\n` +
    `Biome: ${getBiomeLabel()}\n` +
    `State: ${movement} · ${isCreative() ? "creative" : "survival"}\n` +
    `Day time: ${(state.dayTime * 24).toFixed(1)}h`;

  debugRight.textContent =
    `Held: ${activeItem == null ? "Empty" : BLOCK_NAMES[activeItem]}\n` +
    `Target: ${state.target
      ? `${BLOCK_NAMES[state.target.block.type]} @ ${state.target.block.x} ${state.target.block.y} ${state.target.block.z}`
      : "none"}\n` +
    `Break: ${breakPercent}%\n` +
    `Chunks: ${world.loadedKeys.size} loaded / ${world.chunks.size} cached\n` +
    `Render distance: ${world.loadRadius} chunks\n` +
    `Mobs: ${passiveMobs.getEntityCount()} · Drops: ${state.drops.length}\n` +
    `Mouse: ${state.pointerLocked ? "locked" : "free"} · View: ${["1st", "3rd back", "3rd front"][state.perspective]}`;
}

function isWorldView() {
  if (state.screen === "playing" || state.screen === "pause") {
    return true;
  }
  if (state.screen === "title") {
    return false;
  }
  return state.screenReturn === "playing" || state.screenReturn === "pause";
}

/** Slow orbit around spawn that plays behind the title screen. */
function updatePanorama(dt) {
  state.panoramaAngle += dt * 0.045;
  const cx = state.player.x;
  const cz = state.player.z;
  const cy = world.getHeightAt(Math.floor(cx), Math.floor(cz));
  const radius = 21;
  camera.position.set(
    cx + Math.cos(state.panoramaAngle) * radius,
    cy + 13,
    cz + Math.sin(state.panoramaAngle) * radius,
  );
  camera.lookAt(cx, cy + 1.5, cz);
  camera.fov = 72;
  camera.updateProjectionMatrix();
  playerModel.visible = false;
}

function trackFrameRate(dt) {
  if (dt <= 0) {
    return;
  }
  state.frameTimes.push(dt);
  if (state.frameTimes.length > 30) {
    state.frameTimes.shift();
  }
  const total = state.frameTimes.reduce((sum, value) => sum + value, 0);
  state.fps = Math.round(state.frameTimes.length / Math.max(total, 0.0001));
}

function render(dt = 0) {
  if (isWorldView()) {
    applyPlayerToCamera();
  } else {
    updatePanorama(dt);
  }
  updateLighting();
  renderer.render(scene, camera);
  updateHotbar();
  updateHud();
}

function update(dt, shouldRender = true) {
  trackFrameRate(dt);
  if (!state.running) {
    state.uiMessageTimer = Math.max(0, state.uiMessageTimer - dt);
    state.heldItemTimer = Math.max(0, state.heldItemTimer - dt);
    if (shouldRender) {
      render(dt);
    }
    return;
  }

  state.elapsed += dt;
  state.dayTime = (state.dayTime + dt * 0.01) % 1;
  state.uiMessageTimer = Math.max(0, state.uiMessageTimer - dt);
  state.heldItemTimer = Math.max(0, state.heldItemTimer - dt);
  state.viewBob = Math.max(0, state.viewBob - dt * 1.8);
  state.saveCooldown = Math.max(0, state.saveCooldown - dt);
  state.breakState.pulse = Math.max(0, state.breakState.pulse - dt * 4.2);
  world.updateLoadedChunks(state.player.x, state.player.z);
  chunkMeshes.syncLoadedChunks();
  passiveMobs.syncLoadedChunks();
  if (!state.isDead) {
    handleInput(dt);

    const wasOnGround = state.player.onGround;
    const previousVy = state.player.vy;
    if (!state.flying) {
      state.player.vy -= GRAVITY * dt;
    }

    movePlayerAxis("x", state.player.vx * dt);
    movePlayerAxis("z", state.player.vz * dt);
    state.player.onGround = false;
    movePlayerAxis("y", state.player.vy * dt);

    // Touching down ends creative flight, the same as Minecraft.
    if (state.flying && state.player.onGround && state.player.vy <= 0) {
      state.flying = false;
      updateModeBanner();
    }

    if (!wasOnGround && state.player.onGround && previousVy < -6) {
      state.viewBob = 0.18;
      spawnParticles(state.player.x, state.player.y + 0.02, state.player.z, BLOCKS.dirt, 8, 1.1);
      soundEngine.land(previousVy);
    }

    const horizontalSpeed = Math.hypot(state.player.vx, state.player.vz);
    if (state.player.onGround && !state.flying && horizontalSpeed > 0.3 && state.elapsed >= state.nextFootstepAt) {
      soundEngine.footstep(getFootstepBlockType(), state.sprinting);
      state.nextFootstepAt = state.elapsed + (state.sprinting ? 0.23 : state.sneaking ? 0.5 : 0.34);
    }
    if (!state.player.onGround || horizontalSpeed <= 0.15) {
      state.nextFootstepAt = Math.min(state.nextFootstepAt, state.elapsed + 0.08);
    }

    updateSafeAnchor(dt);

    if (state.player.y < -20) {
      handlePlayerDeath();
    }
  }

  updateParticles(dt);
  updateDrops(dt);
  passiveMobs.update(dt);
  updateTarget();

  if (state.breakState.progress > 0) {
    const activeTargetKey = getTargetKey(state.target);
    const shouldDecay =
      state.breakState.key !== activeTargetKey ||
      state.elapsed - state.breakState.lastHitTime > BREAK_RESET_TIME;
    if (shouldDecay) {
      state.breakState.progress = Math.max(
        0,
        state.breakState.progress - dt * state.breakState.hardness * 1.2,
      );
      if (state.breakState.progress <= 0.01) {
        resetBreakState();
      } else {
        updateBreakVisuals();
      }
    }
  }

  if (state.saveCooldown <= 0 && (state.saveDirty || Math.floor(state.elapsed) % 8 === 0)) {
    saveGame();
  }

  if (shouldRender) {
    render(dt);
  }
}

function renderGameToText() {
  const player = state.player;
  const cityCenter = getCityCenter();
  const snowCenter = getSnowCenter();
  return JSON.stringify({
    title: "MyCraft",
    mode: state.mode,
    screen: state.screen,
    gameMode: state.gameMode,
    flying: state.flying,
    sneaking: state.sneaking,
    sprinting: state.sprinting,
    perspective: ["first", "third-back", "third-front"][state.perspective],
    inventoryOpen: state.inventoryOpen,
    coords_note: "Origin near spawn. x east-west, y up, z north-south. Player position is feet center.",
    player: {
      x: Number(player.x.toFixed(2)),
      y: Number(player.y.toFixed(2)),
      z: Number(player.z.toFixed(2)),
      vx: Number(player.vx.toFixed(2)),
      vy: Number(player.vy.toFixed(2)),
      vz: Number(player.vz.toFixed(2)),
      yaw: Number(player.yaw.toFixed(2)),
      pitch: Number(player.pitch.toFixed(2)),
      onGround: player.onGround,
    },
    selectedBlock: BLOCK_NAMES[state.selectedBlock],
    selectedItem: getSelectedItem() == null ? "Empty" : BLOCK_NAMES[getSelectedItem()],
    hotbar: state.hotbarSlots.map((itemId) => itemId == null ? "Empty" : BLOCK_NAMES[itemId]),
    inventory: Object.fromEntries(
      Object.entries(state.inventory)
        .filter(([, count]) => count > 0)
        .map(([itemId, count]) => [BLOCK_NAMES[Number(itemId)], count]),
    ),
    craftable: HAND_RECIPES.filter(canCraft).map((recipe) => `${BLOCK_NAMES[recipe.output]} x${recipe.count}`),
    tableCraftable: TABLE_RECIPES.filter(canCraft).map((recipe) => `${BLOCK_NAMES[recipe.output]} x${recipe.count}`),
    furnaceCraftable: FURNACE_RECIPES.filter(canSmelt).map((recipe) => `${BLOCK_NAMES[recipe.output]} x${recipe.count}`),
    breakProgress: state.breakState.key && state.breakState.hardness > 0
      ? Number((state.breakState.progress / state.breakState.hardness).toFixed(2))
      : 0,
    audio: {
      supported: Boolean(soundEngine.AudioContextCtor),
      active: Boolean(soundEngine.context),
    },
    target: state.target
      ? {
          block: state.target.block,
          place: state.target.place,
          distance: Number(state.target.distance.toFixed(2)),
        }
      : null,
    nearbyMobs: passiveMobs.getNearbyEntities(),
    landmarks: {
      cityCenter: {
        x: Number(cityCenter.x.toFixed(1)),
        z: Number(cityCenter.z.toFixed(1)),
      },
      cityDistance: Number(Math.hypot(player.x - cityCenter.x, player.z - cityCenter.z).toFixed(1)),
      inCity: isInsideRect(player.x, player.z, CITY_PLAN),
      inSuburb: !isInsideRect(player.x, player.z, CITY_PLAN) && isInsideRect(player.x, player.z, SUBURB_PLAN),
      snowCenter: {
        x: Number(snowCenter.x.toFixed(1)),
        z: Number(snowCenter.z.toFixed(1)),
      },
      snowDistance: Number(Math.hypot(player.x - snowCenter.x, player.z - snowCenter.z).toFixed(1)),
      inSnowRealm: isInsideRect(player.x, player.z, SNOW_REALM),
    },
    dayTimeHours: Number((state.dayTime * 24).toFixed(2)),
    chunkStats: {
      active: world.loadedKeys.size,
      cached: world.chunks.size,
      generatedSinceLoad: world.totalGenerated,
    },
  });
}

function animationLoop(previous) {
  return (timestamp) => {
    const dt = clamp((timestamp - previous) / 1000, 0, 0.033);
    previous = timestamp;
    if (!state.suppressAnimationTick) {
      update(dt, true);
    }
    requestAnimationFrame(animationLoop(previous));
  };
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (FIXED_STEP * 1000)));
  state.suppressAnimationTick = true;
  for (let i = 0; i < steps; i++) {
    update(FIXED_STEP, i === steps - 1);
  }
  state.suppressAnimationTick = false;
};

/* ------------------------------------------------------------------ *
 * Menu screens
 * ------------------------------------------------------------------ */

const SPLASHES = [
  "100% procedural!",
  "Now with 9 hotbar slots!",
  "Double-tap W to sprint!",
  "Try creative mode!",
  "Blocks all the way down!",
  "Press F3 for the nerdy bits!",
  "Sneak on the edge!",
  "Also try mining!",
  "No mobs were harmed!",
  "Built with three.js!",
  "Rebind everything!",
  "Fly, you fools!",
];

function pickSplash() {
  splashLabel.textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
}

/** Paints the title with the game's own grass texture. */
function applyTitleTexture() {
  try {
    const tile = getTileCanvas(getTileIndex(BLOCKS.grass, "pz"));
    document.documentElement.style.setProperty(
      "--title-texture",
      `url("${tile.toDataURL("image/png")}")`,
    );
  } catch {
    /* falls back to the plain text colour */
  }
}

function syncModePicker() {
  for (const button of document.querySelectorAll(".mode-option")) {
    button.classList.toggle("is-active", button.dataset.mode === state.gameMode);
  }
}

function syncPauseScreen() {
  pauseModeBtn.textContent = `Mode: ${isCreative() ? "Creative" : "Survival"}`;
}

function buildControlsScreen() {
  const conflicts = findBindingConflicts();
  controlsList.replaceChildren();

  for (const group of BINDING_GROUPS) {
    const section = document.createElement("section");
    section.className = "controls-group";
    const heading = document.createElement("h3");
    heading.textContent = group.title;
    const rows = document.createElement("div");
    rows.className = "controls-rows";

    for (const action of group.actions) {
      const row = document.createElement("div");
      row.className = "control-row";

      const label = document.createElement("span");
      label.textContent = BINDING_LABELS[action] ?? action;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "mc-btn bind-btn";
      const binding = state.awaitingBind === action;
      button.textContent = binding ? "> ? <" : describeToken(bindings[action]);
      if (binding) {
        button.classList.add("is-binding");
      }
      if (conflicts.has(action)) {
        button.classList.add("is-conflict");
        button.title = "This key is bound to more than one action";
      }
      if (FIXED_BINDINGS.has(action)) {
        button.classList.add("is-fixed");
        button.disabled = true;
        button.title = "This binding is fixed";
      } else {
        button.addEventListener("click", () => {
          state.awaitingBind = action;
          buildControlsScreen();
        });
      }

      row.append(label, button);
      rows.appendChild(row);
    }

    section.append(heading, rows);
    controlsList.appendChild(section);
  }
}

function handleBindingCapture(token) {
  const action = state.awaitingBind;
  state.awaitingBind = null;
  if (!action || token === "Escape") {
    buildControlsScreen();
    return;
  }
  bindings[action] = token;
  saveBindings();
  buildControlsScreen();
  buildHelpControls();
  soundEngine.select();
}

const HELP_ACTIONS = [
  "forward",
  "sneak",
  "sprint",
  "jump",
  "attack",
  "use",
  "pick",
  "drop",
  "inventory",
  "perspective",
  "debug",
  "pause",
];

function buildHelpControls() {
  helpControls.replaceChildren();
  for (const action of HELP_ACTIONS) {
    const item = document.createElement("li");
    item.innerHTML = `<b>${BINDING_LABELS[action]}</b> — <kbd>${describeToken(bindings[action])}</kbd>`;
    helpControls.appendChild(item);
  }
  const scroll = document.createElement("li");
  scroll.innerHTML = `<b>Cycle Hotbar</b> — <kbd>Mouse Wheel</kbd> or <kbd>1</kbd>…<kbd>9</kbd>`;
  helpControls.appendChild(scroll);
  const fly = document.createElement("li");
  fly.innerHTML = `<b>Fly (creative)</b> — double-tap <kbd>${describeToken(bindings.jump)}</kbd>`;
  helpControls.appendChild(fly);
}

/* ------------------------------------------------------------------ *
 * Options
 * ------------------------------------------------------------------ */

const optSensitivity = document.getElementById("opt-sensitivity");
const optFov = document.getElementById("opt-fov");
const optVolume = document.getElementById("opt-volume");
const optRender = document.getElementById("opt-render");
const optInvert = document.getElementById("opt-invert");
const optBobbing = document.getElementById("opt-bobbing");
const optAutosave = document.getElementById("opt-autosave");
const optFullscreen = document.getElementById("opt-fullscreen");
const valSensitivity = document.getElementById("val-sensitivity");
const valFov = document.getElementById("val-fov");
const valVolume = document.getElementById("val-volume");
const valRender = document.getElementById("val-render");

function applySettings() {
  world.setRenderDistance(settings.renderDistance);
  const viewDistance = world.loadRadius * CHUNK_SIZE;
  scene.fog.near = viewDistance * 1.5;
  scene.fog.far = viewDistance * 3.7;
  camera.far = Math.max(180, viewDistance * 4);
  camera.updateProjectionMatrix();
  soundEngine.applyVolume();
}

function syncOptionsScreen() {
  optSensitivity.value = String(settings.sensitivity);
  optFov.value = String(settings.fov);
  optVolume.value = String(settings.volume);
  optRender.value = String(settings.renderDistance);
  valSensitivity.textContent = `${settings.sensitivity}%`;
  valFov.textContent = String(settings.fov);
  valVolume.textContent = `${settings.volume}%`;
  valRender.textContent = `${settings.renderDistance} chunk${settings.renderDistance === 1 ? "" : "s"}`;
  optInvert.textContent = `Invert Mouse: ${settings.invertMouse ? "ON" : "OFF"}`;
  optBobbing.textContent = `View Bobbing: ${settings.viewBobbing ? "ON" : "OFF"}`;
  optAutosave.textContent = `Autosave: ${settings.autosave ? "ON" : "OFF"}`;
  optFullscreen.textContent = `Fullscreen: ${document.fullscreenElement ? "ON" : "OFF"}`;
}

function updateSetting(key, value) {
  settings[key] = value;
  saveSettings();
  applySettings();
  syncOptionsScreen();
}

optSensitivity.addEventListener("input", () => updateSetting("sensitivity", Number(optSensitivity.value)));
optFov.addEventListener("input", () => updateSetting("fov", Number(optFov.value)));
optVolume.addEventListener("input", () => updateSetting("volume", Number(optVolume.value)));
optRender.addEventListener("input", () => updateSetting("renderDistance", Number(optRender.value)));
optInvert.addEventListener("click", () => updateSetting("invertMouse", !settings.invertMouse));
optBobbing.addEventListener("click", () => updateSetting("viewBobbing", !settings.viewBobbing));
optAutosave.addEventListener("click", () => updateSetting("autosave", !settings.autosave));
optFullscreen.addEventListener("click", () => {
  toggleFullscreen();
  window.setTimeout(syncOptionsScreen, 120);
});

/* ------------------------------------------------------------------ *
 * Menu buttons
 * ------------------------------------------------------------------ */

document.getElementById("btn-play").addEventListener("click", startGame);
document.getElementById("btn-controls").addEventListener("click", () => openSubScreen("controls"));
document.getElementById("btn-options").addEventListener("click", () => openSubScreen("options"));
document.getElementById("btn-help").addEventListener("click", () => openSubScreen("help"));

document.getElementById("btn-resume").addEventListener("click", resumeGame);
document.getElementById("btn-pause-controls").addEventListener("click", () => openSubScreen("controls"));
document.getElementById("btn-pause-options").addEventListener("click", () => openSubScreen("options"));
document.getElementById("btn-pause-help").addEventListener("click", () => openSubScreen("help"));
pauseModeBtn.addEventListener("click", () => setGameMode(isCreative() ? "survival" : "creative"));
document.getElementById("btn-unstuck").addEventListener("click", () => {
  respawnPlayer();
  showToast("Teleported to safe ground");
});
document.getElementById("btn-quit").addEventListener("click", () => {
  saveGame(true);
  showScreen("title");
});

document.getElementById("btn-controls-reset").addEventListener("click", () => {
  Object.assign(bindings, DEFAULT_BINDINGS);
  saveBindings();
  buildControlsScreen();
  buildHelpControls();
});
document.getElementById("btn-controls-back").addEventListener("click", closeSubScreen);
document.getElementById("btn-options-back").addEventListener("click", closeSubScreen);
document.getElementById("btn-help-back").addEventListener("click", closeSubScreen);

for (const button of document.querySelectorAll(".mode-option")) {
  button.addEventListener("click", () => {
    setGameMode(button.dataset.mode, { announce: false });
  });
}

const resetButton = document.getElementById("btn-reset");
let resetArmed = false;
let resetTimer = 0;
resetButton.addEventListener("click", () => {
  if (!resetArmed) {
    resetArmed = true;
    resetButton.textContent = "Erase save? Click again";
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      resetArmed = false;
      resetButton.textContent = "New World";
    }, 4000);
    return;
  }
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing to clear */
  }
  window.location.reload();
});

respawnBtn.addEventListener("click", respawnPlayer);
deathTitleBtn.addEventListener("click", () => {
  state.isDead = false;
  deathScreen.classList.add("is-hidden");
  showScreen("title");
});
inventoryClose.addEventListener("click", () => toggleInventory(false));

/* ------------------------------------------------------------------ *
 * Input routing
 * ------------------------------------------------------------------ */

/** Keys the browser would otherwise steal while the world has focus. */
const ALWAYS_PREVENT = new Set(["F1", "F3", "F5", "F11"]);
const PLAYING_PREVENT = new Set([
  "Space", "Tab", "F2", "F4",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
  "Digit6", "Digit7", "Digit8", "Digit9",
]);
/** Press actions that stay available outside the world. */
const GLOBAL_ACTIONS = new Set(["fullscreen", "screenshot"]);

function handleEscape() {
  if (state.inventoryOpen) {
    toggleInventory(false);
    return;
  }
  switch (state.screen) {
    case "playing":
      if (!state.isDead) {
        openPauseMenu();
      }
      break;
    case "pause":
      resumeGame();
      break;
    case "controls":
    case "options":
    case "help":
      closeSubScreen();
      break;
    default:
      break;
  }
}

function handleActionPress(action, event) {
  if (action === "fullscreen") {
    toggleFullscreen();
    return;
  }
  if (action === "screenshot") {
    takeScreenshot();
    return;
  }
  if (!state.running) {
    return;
  }

  const inWorld = !state.inventoryOpen && !state.isDead;

  switch (action) {
    case "inventory":
      if (!state.isDead) {
        toggleInventory();
      }
      return;
    case "toggleHud":
      state.hudVisible = !state.hudVisible;
      return;
    case "debug":
      state.debugVisible = !state.debugVisible;
      updateModeBanner();
      return;
    case "perspective":
      cyclePerspective();
      return;
    case "gameMode":
      setGameMode(isCreative() ? "survival" : "creative");
      return;
    case "drop":
      if (inWorld) {
        dropHeldItem(Boolean(event?.ctrlKey));
      }
      return;
    case "pick":
      if (inWorld) {
        pickBlock();
      }
      return;
    case "jump":
      if (!inWorld) {
        return;
      }
      // Double-tap jump toggles creative flight.
      if (isCreative() && state.elapsed - state.lastJumpTapTime < DOUBLE_TAP_WINDOW) {
        toggleFlight();
        state.lastJumpTapTime = -99;
      } else {
        state.lastJumpTapTime = state.elapsed;
      }
      return;
    case "forward":
      if (!inWorld) {
        return;
      }
      // Double-tap forward starts a sprint that holds until you let go.
      if (state.elapsed - state.lastForwardTapTime < DOUBLE_TAP_WINDOW) {
        state.sprintLatched = true;
      }
      state.lastForwardTapTime = state.elapsed;
      return;
    default:
      if (action.startsWith("hotbar") && inWorld) {
        selectHotbarSlot(Number(action.slice(6)) - 1);
      }
  }
}

function dispatchPress(token, event) {
  for (const action of actionsForToken(token)) {
    if (state.running || GLOBAL_ACTIONS.has(action)) {
      handleActionPress(action, event);
    }
  }
}

window.addEventListener("keydown", (event) => {
  if (state.awaitingBind) {
    event.preventDefault();
    handleBindingCapture(event.code);
    return;
  }
  if (event.target instanceof HTMLInputElement) {
    return;
  }

  if (state.running) {
    soundEngine.resume();
  }

  if (ALWAYS_PREVENT.has(event.code) || (state.running && PLAYING_PREVENT.has(event.code))) {
    event.preventDefault();
  }

  const token = canonicalToken(event.code);

  if (!event.repeat) {
    if (event.code === "Escape") {
      handleEscape();
      return;
    }
    dispatchPress(token, event);
  }

  if (state.running && !state.inventoryOpen) {
    state.keys.add(token);
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(canonicalToken(event.code));
  state.keys.delete(event.code);
});

window.addEventListener("blur", () => {
  state.keys.clear();
  state.sprintLatched = false;
  state.dragLook = false;
  state.dragAnchor = null;
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

canvas.addEventListener("mousedown", (event) => {
  if (state.awaitingBind) {
    event.preventDefault();
    handleBindingCapture(mouseToken(event.button));
    return;
  }
  if (!state.running || state.inventoryOpen || state.isDead) {
    return;
  }
  if (event.button === 1) {
    event.preventDefault();
  }
  soundEngine.resume();

  if (!state.pointerLocked) {
    // The click that captures the mouse should not also swing the pickaxe.
    requestPointerLock();
    state.suppressInteractUntil = state.elapsed + 0.22;
    state.dragLook = true;
    state.dragAnchor = { x: event.clientX, y: event.clientY };
  }

  const token = mouseToken(event.button);
  state.keys.add(token);
  dispatchPress(token, event);
});

document.addEventListener("mousedown", (event) => {
  if (!state.awaitingBind) {
    return;
  }
  const target = event.target instanceof Element ? event.target : null;
  if (target === canvas) {
    return;
  }
  if (target?.closest("button")) {
    // Clicking any other control cancels instead of binding that click.
    state.awaitingBind = null;
    return;
  }
  event.preventDefault();
  handleBindingCapture(mouseToken(event.button));
});

window.addEventListener("mouseup", (event) => {
  state.keys.delete(mouseToken(event.button));
  state.dragLook = false;
  state.dragAnchor = null;
});

window.addEventListener("mousemove", (event) => {
  if (!state.running || state.inventoryOpen || state.isDead) {
    return;
  }
  if (state.pointerLocked) {
    moveLook(event.movementX, event.movementY);
    return;
  }
  if (state.dragLook && state.dragAnchor) {
    moveLook(event.clientX - state.dragAnchor.x, event.clientY - state.dragAnchor.y);
    state.dragAnchor = { x: event.clientX, y: event.clientY };
  }
});

window.addEventListener("wheel", (event) => {
  if (!state.running || state.inventoryOpen || state.isDead) {
    return;
  }
  event.preventDefault();
  scrollHotbar(event.deltaY > 0 ? 1 : -1);
}, { passive: false });

document.addEventListener("pointerlockchange", updatePointerState);
document.addEventListener("pointerlockerror", () => {
  state.pointerLockUnavailable = true;
  showToast("Mouse look fallback: hold and drag on the canvas");
});
document.addEventListener("fullscreenchange", syncOptionsScreen);
window.addEventListener("resize", resizeRenderer);

window.addEventListener("beforeunload", () => {
  saveGame(true);
});

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

loadSettings();
loadBindings();
applySettings();
applyTitleTexture();
pickSplash();
resizeRenderer();
buildHotbar();
loadGame();
ensureValidPlayerPosition();
world.updateLoadedChunks(state.player.x, state.player.z);
chunkMeshes.syncLoadedChunks();
passiveMobs.syncLoadedChunks();
updateTarget();
updateHotbar();
updateInventoryPanel();
buildControlsScreen();
buildHelpControls();
syncOptionsScreen();
syncModePicker();
showScreen("title");
render(0);
requestAnimationFrame(animationLoop(performance.now()));
