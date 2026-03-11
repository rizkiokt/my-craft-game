import * as THREE from "./node_modules/three/build/three.module.js";

const CHUNK_SIZE = 16;
const LOAD_RADIUS = 2;
const UNLOAD_RADIUS = 4;
const CAMERA_HEIGHT = 1.62;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.34;
const GRAVITY = 24;
const MOVE_SPEED = 5.8;
const JUMP_SPEED = 8.8;
const LOOK_SENSITIVITY = 0.0022;
const MAX_STEP_HEIGHT = 0.6;
const INTERACTION_RANGE = 8;
const FIXED_STEP = 1 / 60;
const MAX_BUILD_HEIGHT = 48;
const MIN_WORLD_Y = -2;
const MAX_WORLD_Y = 64;
const CLOUD_COUNT = 18;
const PARTICLE_POOL_SIZE = 192;
const BREAK_RESET_TIME = 1.15;
const PI = Math.PI;

const canvas = document.getElementById("game");
const menu = document.getElementById("menu");
const startButton = document.getElementById("start-btn");
const hotbar = document.getElementById("hotbar");
const inventoryPanel = document.getElementById("inventory-panel");
const inventoryGrid = document.getElementById("inventory-grid");
const recipeList = document.getElementById("recipe-list");
const inventoryClose = document.getElementById("inventory-close");
const hudPrimary = document.getElementById("hud-primary");
const hudSecondary = document.getElementById("hud-secondary");

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
  BLOCKS.planks,
  BLOCKS.sand,
  BLOCKS.bricks,
  BLOCKS.glass,
];

const HOTBAR_SIZE = 8;
const WATER_LEVEL = 7;
const SAVE_KEY = "mycraft-save-v2";

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
    }
  }
  return textures;
}

function createAtlasTexture() {
  const textureSet = createTextureSet();
  const tileSize = 16;
  const columns = 4;
  const rows = 4;
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
  return 17;
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

function canMineBlock(blockType) {
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
    return 0.16;
  }
  const tool = getToolProfile();
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore || blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace) {
    return 0.48 / tool.speed;
  }
  if (blockType === BLOCKS.wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
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
  if (blockType === BLOCKS.wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
    return 3.8;
  }
  if (blockType === BLOCKS.bricks) {
    return 5.8;
  }
  if (blockType === BLOCKS.leaves || blockType === BLOCKS.glass) {
    return 1.8;
  }
  return 2.2;
}

function getBreakDamage(blockType) {
  const tool = getToolProfile();
  if (blockType === BLOCKS.stone || blockType === BLOCKS.coal_ore || blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace) {
    return 1 + tool.speed * 0.68;
  }
  if (blockType === BLOCKS.wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table) {
    return 0.95 + tool.speed * 0.4;
  }
  return 1 + tool.speed * 0.3;
}

function getDropForBlock(blockType) {
  if (blockType === BLOCKS.leaves) {
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
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getHeightAt(wx, wz) {
    const broad = perlin2(wx / 34, wz / 34) * 5.5;
    const detail = perlin2(wx / 16, wz / 16) * 2.1;
    const ridge = Math.abs(perlin2(wx / 52, wz / 52)) * 2.2;
    return Math.floor(9 + broad + detail + ridge);
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
      fauna: [],
    };

    for (let z = 1; z < CHUNK_SIZE - 1; z++) {
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        const index = z * CHUNK_SIZE + x;
        const height = heights[index];
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const beachNoise = perlin2(wx / 22 + 31, wz / 22 + 11);
        const isSandy = height <= 8 || (height <= 10 && beachNoise > 0.24);
        chunk.sandy[index] = isSandy ? 1 : 0;

        if (!isSandy && height >= 10 && height <= 18) {
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
      if (!canSpawnFaunaAt(x, z, options)) {
        return;
      }
      const height = heights[z * CHUNK_SIZE + x];
      chunk.fauna.push({
        kind,
        x: cx * CHUNK_SIZE + x + 0.5,
        y: height + 1,
        z: cz * CHUNK_SIZE + z + 0.5,
      });
    };

    tryAddFauna("sheep", 61, 0.44, { allowSand: false, minHeight: 9, maxHeight: 18 });
    tryAddFauna("sheep", 71, 0.68, { allowSand: false, minHeight: 9, maxHeight: 18 });
    tryAddFauna("villager", 81, 0.84, { allowSand: false, minHeight: 10, maxHeight: 16 });

    this.chunks.set(key, chunk);
    this.totalGenerated++;
    return chunk;
  }

  updateLoadedChunks(playerX, playerZ) {
    const centerCx = Math.floor(playerX / CHUNK_SIZE);
    const centerCz = Math.floor(playerZ / CHUNK_SIZE);
    this.loadedKeys.clear();

    for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
      for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
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
      if (distance > UNLOAD_RADIUS && chunk.edits.size === 0) {
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
    const caveNoise =
      Math.abs(perlin2(wx / 21 + wy * 0.08, wz / 21)) +
      Math.abs(perlin2(wx / 25, wy / 9 + wz * 0.04));
    const caveCarve = wy < height - 1 && wy > 2 && caveNoise > 1.06;
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
      if (wy <= WATER_LEVEL) {
        return BLOCKS.water;
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
const spawnHeight = world.getHeightAt(0, 0) + 1;

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
  running: false,
  pointerLocked: false,
  suppressAnimationTick: false,
  inventoryOpen: false,
  saveDirty: false,
  saveCooldown: 0,
  keys: new Set(),
  mouseDown: { left: false, right: false },
  selectedBlock: BLOCKS.grass,
  activeSlot: 0,
  hotbarSlots: [
    ITEMS.wood_pickaxe,
    BLOCKS.grass,
    BLOCKS.dirt,
    BLOCKS.stone,
    BLOCKS.wood,
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
  viewBob: 0,
  stepPhase: 0,
  landingBounce: 0,
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
    [BLOCKS.planks]: 0,
    [BLOCKS.sand]: 16,
    [BLOCKS.bricks]: 0,
    [BLOCKS.glass]: 0,
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
    x: 0.5,
    y: spawnHeight + 2,
    z: 0.5,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: -0.55,
    pitch: -0.38,
    onGround: false,
  },
};

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

function saveGame() {
  try {
    const payload = {
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
  return canvasIcon.toDataURL("image/png");
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
  return icon.toDataURL("image/png");
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

for (const blockType of Object.values(BLOCKS)) {
  if (blockType !== BLOCKS.air) {
    itemIcons.set(blockType, createItemIcon(blockType));
  }
}
itemIcons.set(ITEMS.stick, createFlatIcon("#2b3343", "#d1ab6a", createStickGlyph));
itemIcons.set(ITEMS.coal, createFlatIcon("#2b3343", "#101217", createCoalGlyph));
itemIcons.set(ITEMS.iron_ingot, createFlatIcon("#2b3343", "#d7dce4", (ctxGlyph) => {
  ctxGlyph.fillRect(14, 20, 20, 10);
  ctxGlyph.fillRect(16, 16, 16, 4);
}));
itemIcons.set(ITEMS.wood_pickaxe, createFlatIcon("#2b3343", "#9a7440", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#caa061")));
itemIcons.set(ITEMS.stone_pickaxe, createFlatIcon("#2b3343", "#8a949d", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#c0c7cf")));

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
    case BLOCKS.planks:
      return [0xc59a5a, 0x9a7440];
    case BLOCKS.bricks:
      return [0xa75339, 0x7c3524];
    case BLOCKS.glass:
      return [0xcdeefd, 0x91d8ef];
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
      `<div class="slot-icon"></div>` +
      `<strong>Empty</strong>` +
      `<span>${index + 1}</span>`;
    hotbar.appendChild(slot);
  }
}

function updateHotbar() {
  for (const slot of hotbar.children) {
    const slotIndex = Number(slot.dataset.slot);
    const itemId = state.hotbarSlots[slotIndex];
    const icon = slot.querySelector(".slot-icon");
    const count = itemId == null ? 0 : (state.inventory[itemId] ?? 0);
    slot.classList.toggle("is-active", slotIndex === state.activeSlot);
    slot.classList.toggle("is-empty", itemId == null || count <= 0);
    if (icon) {
      icon.style.backgroundImage = itemId == null ? "none" : `url("${itemIcons.get(itemId)}")`;
    }
    const nameLabel = slot.querySelector("strong");
    const countLabel = slot.querySelector("span");
    if (nameLabel) {
      nameLabel.textContent = itemId == null ? "Empty" : BLOCK_NAMES[itemId];
    }
    if (countLabel) {
      countLabel.textContent = `${slotIndex + 1} · ${count}`;
    }
  }
}

function createInventorySlot(itemId, count, selected) {
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = "inventory-slot";
  slot.dataset.item = String(itemId);
  if (selected) {
    slot.classList.add("is-selected");
  }
  if (count <= 0) {
    slot.classList.add("is-empty");
  }
  slot.innerHTML =
    `<div class="slot-icon"></div>` +
    `<strong>${BLOCK_NAMES[itemId]}</strong>` +
    `<span>${count} in bag</span>`;
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
      `<button class="recipe-button" type="button"${enabled ? "" : " disabled"}>${type === "smelt" ? "Smelt" : "Craft"}</button>`;
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
  inventoryGrid.replaceChildren();
  const allItems = [...new Set([
    ...PLACEABLE_BLOCKS,
    ITEMS.stick,
    ITEMS.coal,
    ITEMS.iron_ingot,
    ITEMS.wood_pickaxe,
    ITEMS.stone_pickaxe,
    BLOCKS.coal_ore,
    BLOCKS.iron_ore,
  ])];
  allItems.forEach((itemId) => {
    const slot = createInventorySlot(
      itemId,
      state.inventory[itemId] ?? 0,
      itemId === getSelectedItem(),
    );
    slot.addEventListener("click", () => {
      state.hotbarSlots[state.activeSlot] = itemId;
      setActiveItem(itemId);
      updateInventoryPanel();
      updateHotbar();
    });
    inventoryGrid.appendChild(slot);
  });

  recipeList.replaceChildren();
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
  const existingIndex = state.hotbarSlots.indexOf(itemId);
  if (existingIndex !== -1) {
    state.activeSlot = existingIndex;
  } else {
    state.hotbarSlots[state.activeSlot] = itemId;
  }
  state.selectedBlock = isPlaceableItem(itemId) ? itemId : state.selectedBlock;
  state.saveDirty = true;
}

function setMode(mode) {
  state.mode = mode;
  state.running = mode === "playing";
  menu.classList.toggle("is-hidden", state.running);
  if (!state.running) {
    toggleInventory(false);
  }
}

function startGame() {
  setMode("playing");
  toggleInventory(false);
  canvas.focus();
  requestPointerLock();
}

function requestPointerLock() {
  if (state.inventoryOpen || !state.running || state.pointerLocked) {
    return;
  }
  if (canvas.requestPointerLock) {
    const lockRequest = canvas.requestPointerLock();
    lockRequest?.catch(() => {
      state.uiMessage = "Mouse look fallback: hold and drag on the canvas";
      state.uiMessageTimer = 1.4;
    });
  }
}

function exitPointerLock() {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function updatePointerState() {
  state.pointerLocked = document.pointerLockElement === canvas;
  if (state.pointerLocked) {
    state.dragLook = false;
    state.dragAnchor = null;
  }
}

function moveLook(deltaX, deltaY) {
  state.player.yaw -= deltaX * LOOK_SENSITIVITY;
  state.player.pitch -= deltaY * LOOK_SENSITIVITY;
  state.player.pitch = clamp(state.player.pitch, -1.45, 1.45);
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

function tryStepUp(nextX, currentY, nextZ) {
  const steppedY = currentY + MAX_STEP_HEIGHT;
  if (!hasCollision(nextX, steppedY, nextZ) && hasCollision(nextX, steppedY - 0.1, nextZ)) {
    return steppedY;
  }
  return null;
}

function movePlayerAxis(axis, amount) {
  if (amount === 0) {
    return;
  }

  const player = state.player;
  const next = { x: player.x, y: player.y, z: player.z };
  next[axis] += amount;

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

function applyPlayerToCamera() {
  const horizontalSpeed = Math.hypot(state.player.vx, state.player.vz);
  const sprinting = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight");
  const bobStrength = state.player.onGround ? clamp(horizontalSpeed / (MOVE_SPEED * 1.65), 0, 1) : 0;
  const bobX = Math.sin(state.stepPhase) * 0.05 * bobStrength;
  const bobY = Math.abs(Math.cos(state.stepPhase * 0.5)) * 0.08 * bobStrength;
  const sideTilt = clamp(state.player.vx * 0.012, -0.04, 0.04);
  camera.position.set(
    state.player.x + bobX,
    state.player.y + CAMERA_HEIGHT + state.viewBob - bobY,
    state.player.z,
  );
  camera.rotation.y = state.player.yaw;
  camera.rotation.x = state.player.pitch;
  camera.rotation.z = sideTilt;
  camera.fov = lerp(camera.fov, 75 + (sprinting ? 4.2 : 0) + bobStrength * 1.8, 0.14);
  camera.updateProjectionMatrix();
}

function canPlaceBlock(x, y, z) {
  if (y < MIN_WORLD_Y || y > MAX_BUILD_HEIGHT) {
    return false;
  }
  return !hasCollision(x + 0.5, y, z + 0.5);
}

function updateTarget() {
  applyPlayerToCamera();
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
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
      state.uiMessage = `Need a better tool for ${BLOCK_NAMES[state.target.block.type]}`;
      state.uiMessageTimer = 1.1;
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
    if (state.breakState.progress < state.breakState.hardness) {
      updateBreakVisuals();
      return;
    }
    const brokenType = state.target.block.type;
    if (world.setBlock(state.target.block.x, state.target.block.y, state.target.block.z, BLOCKS.air)) {
      chunkMeshes.markDirtyAtWorld(state.target.block.x, state.target.block.z);
      const dropId = getDropForBlock(brokenType);
      if (dropId != null && isCollectibleBlock(brokenType)) {
        state.inventory[dropId] = (state.inventory[dropId] ?? 0) + 1;
        state.uiMessage = `Collected ${BLOCK_NAMES[dropId]}`;
        state.uiMessageTimer = 1.1;
      }
      spawnParticles(
        state.target.block.x + 0.5,
        state.target.block.y + 0.5,
        state.target.block.z + 0.5,
        brokenType,
        10,
        2.2,
      );
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
      if ((state.inventory[selectedItem] ?? 0) <= 0) {
        state.uiMessage = `Out of ${BLOCK_NAMES[selectedItem]}`;
        state.uiMessageTimer = 0.9;
      } else if (world.setBlock(state.target.place.x, state.target.place.y, state.target.place.z, selectedItem)) {
        state.inventory[selectedItem] -= 1;
        chunkMeshes.markDirtyAtWorld(state.target.place.x, state.target.place.z);
        spawnParticles(
          state.target.place.x + 0.5,
          state.target.place.y + 0.5,
          state.target.place.z + 0.5,
          selectedItem,
          6,
          1.6,
        );
        state.saveDirty = true;
      }
    }
  }

  chunkMeshes.syncLoadedChunks();
  updateTarget();
  updateInventoryPanel();
  updateHotbar();
}

function handleInput(dt) {
  if (state.inventoryOpen) {
    state.player.vx = 0;
    state.player.vz = 0;
    return;
  }
  const player = state.player;
  const forwardIntent = (state.keys.has("KeyW") || state.keys.has("ArrowUp") ? 1 : 0)
    + (state.keys.has("KeyS") || state.keys.has("ArrowDown") ? -1 : 0);
  const strafeIntent = (state.keys.has("KeyD") ? 1 : 0)
    + (state.keys.has("KeyA") ? -1 : 0);

  if (state.keys.has("ArrowLeft")) {
    player.yaw += dt * 1.9;
  }
  if (state.keys.has("ArrowRight")) {
    player.yaw -= dt * 1.9;
  }

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
    state.stepPhase += dt * (state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? 16 : 11);
  }

  const sprintMultiplier = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? 1.65 : 1;
  player.vx = wishX * MOVE_SPEED * sprintMultiplier;
  player.vz = wishZ * MOVE_SPEED * sprintMultiplier;

  if (state.keys.has("Space") && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
  }

  for (let i = 0; i < HOTBAR_SIZE; i++) {
    if (state.keys.has(`Digit${i + 1}`)) {
      state.activeSlot = i;
      const itemId = getSelectedItem();
      if (isPlaceableItem(itemId)) {
        state.selectedBlock = itemId;
      }
    }
  }

  if (state.keys.has("KeyF")) {
    state.keys.delete("KeyF");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  if (state.keys.has("KeyB")) {
    interact(false);
  }
  if (state.mouseDown.left) {
    interact(true);
  }
  if (state.mouseDown.right) {
    interact(false);
  }
}

function updateHud() {
  const player = state.player;
  const activeItem = getSelectedItem();
  const targetText = state.target
    ? `${BLOCK_NAMES[state.target.block.type]} @ ${state.target.block.x}, ${state.target.block.y}, ${state.target.block.z}`
    : "none";
  const breakProgress = state.breakState.key && state.breakState.hardness > 0
    ? `${Math.round(clamp(state.breakState.progress / state.breakState.hardness, 0, 1) * 100)}%`
    : "0%";

  hudPrimary.textContent =
    `Selected: ${activeItem == null ? "Empty" : BLOCK_NAMES[activeItem]}\n` +
    `Target: ${targetText}\n` +
    `Break: ${breakProgress}\n` +
    `Chunks: ${world.loadedKeys.size} active / ${world.chunks.size} cached\n` +
    `Bag: ${PLACEABLE_BLOCKS.map((blockType) => `${BLOCK_NAMES[blockType][0]}:${state.inventory[blockType] ?? 0}`).join(" ")}`;

  hudSecondary.textContent =
    `XYZ ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}\n` +
    `Yaw ${player.yaw.toFixed(2)} Pitch ${player.pitch.toFixed(2)}\n` +
    `${state.inventoryOpen ? "Inventory open" : state.pointerLocked ? "Pointer lock" : "Click or drag on canvas"} | ${state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? "Sprinting" : "Walk"} | Mobs ${passiveMobs.getEntityCount()} | Day ${(state.dayTime * 24).toFixed(1)}h${state.uiMessageTimer > 0 ? ` | ${state.uiMessage}` : ""}`;
}

function render() {
  applyPlayerToCamera();
  updateLighting();
  renderer.render(scene, camera);
  updateHotbar();
  updateHud();
}

function update(dt, shouldRender = true) {
  if (!state.running) {
    if (shouldRender) {
      render();
    }
    return;
  }

  state.elapsed += dt;
  state.dayTime = (state.dayTime + dt * 0.01) % 1;
  state.uiMessageTimer = Math.max(0, state.uiMessageTimer - dt);
  state.viewBob = Math.max(0, state.viewBob - dt * 1.8);
  state.saveCooldown = Math.max(0, state.saveCooldown - dt);
  state.breakState.pulse = Math.max(0, state.breakState.pulse - dt * 4.2);
  world.updateLoadedChunks(state.player.x, state.player.z);
  chunkMeshes.syncLoadedChunks();
  passiveMobs.syncLoadedChunks();
  handleInput(dt);

  const wasOnGround = state.player.onGround;
  const previousVy = state.player.vy;
  state.player.vy -= GRAVITY * dt;

  movePlayerAxis("x", state.player.vx * dt);
  movePlayerAxis("z", state.player.vz * dt);
  state.player.onGround = false;
  movePlayerAxis("y", state.player.vy * dt);

  if (!wasOnGround && state.player.onGround && previousVy < -6) {
    state.viewBob = 0.18;
    spawnParticles(state.player.x, state.player.y + 0.02, state.player.z, BLOCKS.dirt, 8, 1.1);
  }

  if (state.player.y < -20) {
    state.player.x = 0.5;
    state.player.y = world.getHeightAt(0, 0) + 3;
    state.player.z = 0.5;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.vz = 0;
  }

  updateParticles(dt);
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
    render();
  }
}

function renderGameToText() {
  const player = state.player;
  return JSON.stringify({
    title: "MyCraft",
    mode: state.mode,
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
    target: state.target
      ? {
          block: state.target.block,
          place: state.target.place,
          distance: Number(state.target.distance.toFixed(2)),
        }
      : null,
    nearbyMobs: passiveMobs.getNearbyEntities(),
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

startButton.addEventListener("click", startGame);
inventoryClose.addEventListener("click", () => toggleInventory(false));

canvas.addEventListener("click", () => {
  if (!state.running) {
    startGame();
  } else if (!state.inventoryOpen) {
    requestPointerLock();
  }
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

canvas.addEventListener("mousedown", (event) => {
  if (state.inventoryOpen) {
    return;
  }
  if (state.running && !state.pointerLocked) {
    requestPointerLock();
  }
  if (event.button === 0) {
    state.mouseDown.left = true;
  }
  if (event.button === 2) {
    state.mouseDown.right = true;
  }
  if (!state.pointerLocked) {
    state.dragLook = true;
    state.dragAnchor = { x: event.clientX, y: event.clientY };
  }
});

canvas.addEventListener("pointerdown", () => {
  if (state.running && !state.inventoryOpen && !state.pointerLocked) {
    requestPointerLock();
  }
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    state.mouseDown.left = false;
  }
  if (event.button === 2) {
    state.mouseDown.right = false;
  }
  state.dragLook = false;
  state.dragAnchor = null;
});

window.addEventListener("mousemove", (event) => {
  if (state.inventoryOpen) {
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

window.addEventListener("pointerlockchange", updatePointerState);
window.addEventListener("pointerlockerror", () => {
  state.uiMessage = "Mouse look fallback: hold and drag on the canvas";
  state.uiMessageTimer = 1.4;
});
window.addEventListener("resize", resizeRenderer);
window.addEventListener("wheel", (event) => {
  if (state.inventoryOpen) {
    return;
  }
  event.preventDefault();
  state.activeSlot = (state.activeSlot + (event.deltaY > 0 ? 1 : -1) + HOTBAR_SIZE) % HOTBAR_SIZE;
  const itemId = getSelectedItem();
  if (isPlaceableItem(itemId)) {
    state.selectedBlock = itemId;
  }
}, { passive: false });

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyE") {
    event.preventDefault();
    if (state.running) {
      toggleInventory();
    }
    return;
  }
  if (event.code === "Escape") {
    if (state.inventoryOpen) {
      toggleInventory(false);
    } else {
      exitPointerLock();
    }
  }
  if (
    event.code === "Space" ||
    event.code.startsWith("Arrow") ||
    event.code.startsWith("Digit")
  ) {
    event.preventDefault();
  }
  state.keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

window.addEventListener("beforeunload", () => {
  saveGame();
});

resizeRenderer();
buildHotbar();
updateInventoryPanel();
loadGame();
world.updateLoadedChunks(state.player.x, state.player.z);
chunkMeshes.syncLoadedChunks();
passiveMobs.syncLoadedChunks();
updateTarget();
updateHotbar();
updateInventoryPanel();
render();
requestAnimationFrame(animationLoop(performance.now()));
