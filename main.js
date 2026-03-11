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
const PI = Math.PI;

const canvas = document.getElementById("game");
const menu = document.getElementById("menu");
const startButton = document.getElementById("start-btn");
const hotbar = document.getElementById("hotbar");
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
};

const BLOCK_NAMES = {
  [BLOCKS.air]: "Air",
  [BLOCKS.grass]: "Grass",
  [BLOCKS.dirt]: "Dirt",
  [BLOCKS.stone]: "Stone",
  [BLOCKS.sand]: "Sand",
  [BLOCKS.wood]: "Wood",
  [BLOCKS.leaves]: "Leaves",
};

const PLACEABLE_BLOCKS = [
  BLOCKS.grass,
  BLOCKS.dirt,
  BLOCKS.stone,
  BLOCKS.wood,
  BLOCKS.sand,
];

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

function createTextureSet() {
  const textures = {};
  for (const blockType of [BLOCKS.grass, BLOCKS.dirt, BLOCKS.stone, BLOCKS.sand, BLOCKS.wood, BLOCKS.leaves]) {
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
    }
  }
  return textures;
}

function createAtlasTexture() {
  const textureSet = createTextureSet();
  const tileSize = 16;
  const columns = 4;
  const rows = 2;
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
  return 7;
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
}

function isCollectibleBlock(blockType) {
  return PLACEABLE_BLOCKS.includes(blockType);
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
    return this.getBlock(wx, wy, wz) !== BLOCKS.air;
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

const state = {
  mode: "menu",
  running: false,
  pointerLocked: false,
  suppressAnimationTick: false,
  keys: new Set(),
  mouseDown: { left: false, right: false },
  selectedBlock: BLOCKS.grass,
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
  inventory: {
    [BLOCKS.grass]: 20,
    [BLOCKS.dirt]: 18,
    [BLOCKS.stone]: 24,
    [BLOCKS.wood]: 10,
    [BLOCKS.sand]: 16,
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
const worldMaterial = new THREE.MeshLambertMaterial({
  map: atlasInfo.texture,
});
const chunkMeshes = new ChunkMeshManager(world, scene, worldMaterial, atlasInfo);

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

const raycaster = new THREE.Raycaster();
raycaster.far = INTERACTION_RANGE;

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function buildHotbar() {
  hotbar.replaceChildren();
  PLACEABLE_BLOCKS.forEach((blockType, index) => {
    const slot = document.createElement("div");
    slot.className = "hotbar-slot";
    slot.dataset.block = String(blockType);
    slot.innerHTML = `<strong>${BLOCK_NAMES[blockType]}</strong><span>${index + 1}</span>`;
    hotbar.appendChild(slot);
  });
}

function updateHotbar() {
  for (const slot of hotbar.children) {
    const blockType = Number(slot.dataset.block);
    slot.classList.toggle("is-active", blockType === state.selectedBlock);
    const countLabel = slot.querySelector("span");
    if (countLabel) {
      const index = PLACEABLE_BLOCKS.indexOf(blockType);
      const count = state.inventory[blockType] ?? 0;
      countLabel.textContent = `${index + 1} · ${count}`;
    }
  }
}

function setMode(mode) {
  state.mode = mode;
  state.running = mode === "playing";
  menu.classList.toggle("is-hidden", state.running);
}

function startGame() {
  setMode("playing");
  canvas.focus();
  requestPointerLock();
}

function requestPointerLock() {
  if (canvas.requestPointerLock) {
    canvas.requestPointerLock().catch(() => {});
  }
}

function exitPointerLock() {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function updatePointerState() {
  state.pointerLocked = document.pointerLockElement === canvas;
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
    return;
  }

  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round();
  const blockCoords = floorVector(hit.point.clone().addScaledVector(normal, -0.01));
  const placeCoords = floorVector(hit.point.clone().addScaledVector(normal, 0.01));
  const blockType = world.getBlock(blockCoords.x, blockCoords.y, blockCoords.z);

  if (blockType === BLOCKS.air) {
    state.target = null;
    targetHighlight.visible = false;
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
}

function interact(breaking) {
  if (state.elapsed - state.lastInteractionTime < 0.16) {
    return;
  }
  state.lastInteractionTime = state.elapsed;
  updateTarget();
  if (!state.target) {
    return;
  }

  if (breaking) {
    const brokenType = state.target.block.type;
    if (world.setBlock(state.target.block.x, state.target.block.y, state.target.block.z, BLOCKS.air)) {
      chunkMeshes.markDirtyAtWorld(state.target.block.x, state.target.block.z);
      if (isCollectibleBlock(brokenType)) {
        state.inventory[brokenType] = (state.inventory[brokenType] ?? 0) + 1;
        state.uiMessage = `Collected ${BLOCK_NAMES[brokenType]}`;
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
    }
  } else if (canPlaceBlock(state.target.place.x, state.target.place.y, state.target.place.z)) {
    if ((state.inventory[state.selectedBlock] ?? 0) <= 0) {
      state.uiMessage = `Out of ${BLOCK_NAMES[state.selectedBlock]}`;
      state.uiMessageTimer = 0.9;
    } else if (world.setBlock(state.target.place.x, state.target.place.y, state.target.place.z, state.selectedBlock)) {
      state.inventory[state.selectedBlock] -= 1;
      chunkMeshes.markDirtyAtWorld(state.target.place.x, state.target.place.z);
      spawnParticles(
        state.target.place.x + 0.5,
        state.target.place.y + 0.5,
        state.target.place.z + 0.5,
        state.selectedBlock,
        6,
        1.6,
      );
    }
  }

  chunkMeshes.syncLoadedChunks();
  updateTarget();
}

function handleInput(dt) {
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

  if (state.keys.has("Digit1")) {
    setSelectedBlock(PLACEABLE_BLOCKS[0]);
  }
  if (state.keys.has("Digit2")) {
    setSelectedBlock(PLACEABLE_BLOCKS[1]);
  }
  if (state.keys.has("Digit3")) {
    setSelectedBlock(PLACEABLE_BLOCKS[2]);
  }
  if (state.keys.has("Digit4")) {
    setSelectedBlock(PLACEABLE_BLOCKS[3]);
  }
  if (state.keys.has("Digit5")) {
    setSelectedBlock(PLACEABLE_BLOCKS[4]);
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
  const targetText = state.target
    ? `${BLOCK_NAMES[state.target.block.type]} @ ${state.target.block.x}, ${state.target.block.y}, ${state.target.block.z}`
    : "none";

  hudPrimary.textContent =
    `Selected: ${BLOCK_NAMES[state.selectedBlock]}\n` +
    `Target: ${targetText}\n` +
    `Chunks: ${world.loadedKeys.size} active / ${world.chunks.size} cached\n` +
    `Bag: ${PLACEABLE_BLOCKS.map((blockType) => `${BLOCK_NAMES[blockType][0]}:${state.inventory[blockType] ?? 0}`).join(" ")}`;

  hudSecondary.textContent =
    `XYZ ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}\n` +
    `Yaw ${player.yaw.toFixed(2)} Pitch ${player.pitch.toFixed(2)}\n` +
    `${state.pointerLocked ? "Pointer lock" : "Click canvas to lock mouse"} | ${state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? "Sprinting" : "Walk"} | Day ${(state.dayTime * 24).toFixed(1)}h${state.uiMessageTimer > 0 ? ` | ${state.uiMessage}` : ""}`;
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
  world.updateLoadedChunks(state.player.x, state.player.z);
  chunkMeshes.syncLoadedChunks();
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
  updateTarget();

  if (shouldRender) {
    render();
  }
}

function renderGameToText() {
  const player = state.player;
  return JSON.stringify({
    title: "MyCraft",
    mode: state.mode,
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
    hotbar: PLACEABLE_BLOCKS.map((blockType) => BLOCK_NAMES[blockType]),
    inventory: Object.fromEntries(PLACEABLE_BLOCKS.map((blockType) => [BLOCK_NAMES[blockType], state.inventory[blockType] ?? 0])),
    target: state.target
      ? {
          block: state.target.block,
          place: state.target.place,
          distance: Number(state.target.distance.toFixed(2)),
        }
      : null,
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

canvas.addEventListener("click", () => {
  if (!state.running) {
    startGame();
  } else {
    requestPointerLock();
  }
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

canvas.addEventListener("mousedown", (event) => {
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
window.addEventListener("resize", resizeRenderer);
window.addEventListener("wheel", (event) => {
  if (!PLACEABLE_BLOCKS.length) {
    return;
  }
  event.preventDefault();
  const currentIndex = PLACEABLE_BLOCKS.indexOf(state.selectedBlock);
  const nextIndex = (currentIndex + (event.deltaY > 0 ? 1 : -1) + PLACEABLE_BLOCKS.length) % PLACEABLE_BLOCKS.length;
  setSelectedBlock(PLACEABLE_BLOCKS[nextIndex]);
}, { passive: false });

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    exitPointerLock();
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

resizeRenderer();
buildHotbar();
world.updateLoadedChunks(state.player.x, state.player.z);
chunkMeshes.syncLoadedChunks();
updateTarget();
updateHotbar();
render();
requestAnimationFrame(animationLoop(performance.now()));
