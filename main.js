const CHUNK_SIZE = 16;
const LOAD_RADIUS = 3;
const UNLOAD_RADIUS = 5;
const MAX_RAY_DISTANCE = 36;
const INTERNAL_WIDTH = 240;
const INTERNAL_HEIGHT = 135;
const CAMERA_HEIGHT = 1.62;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.34;
const EYE_FORWARD_OFFSET = 0.0;
const GRAVITY = 24;
const MOVE_SPEED = 5.6;
const JUMP_SPEED = 8.6;
const LOOK_SENSITIVITY = 0.0022;
const MAX_STEP_HEIGHT = 0.6;
const INTERACTION_RANGE = 6;
const FIXED_STEP = 1 / 60;
const PI = Math.PI;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const renderSurface = document.createElement("canvas");
renderSurface.width = INTERNAL_WIDTH;
renderSurface.height = INTERNAL_HEIGHT;
const renderCtx = renderSurface.getContext("2d");
const menu = document.getElementById("menu");
const startButton = document.getElementById("start-btn");
const hudPrimary = document.getElementById("hud-primary");
const hudSecondary = document.getElementById("hud-secondary");

const imageData = ctx.createImageData(INTERNAL_WIDTH, INTERNAL_HEIGHT);
const frameBuffer = imageData.data;

const BLOCKS = {
  air: 0,
  grass: 1,
  dirt: 2,
  stone: 3,
};

const BLOCK_NAMES = {
  [BLOCKS.air]: "Air",
  [BLOCKS.grass]: "Grass",
  [BLOCKS.dirt]: "Dirt",
  [BLOCKS.stone]: "Stone",
};

const skyTop = [123, 193, 255];
const skyHorizon = [208, 231, 255];
const voidColor = [15, 18, 26];

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

function smoothstep(min, max, value) {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function fract(value) {
  return value - Math.floor(value);
}

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return fract(s);
}

function createTextureSet() {
  const textures = {};
  for (const blockType of [BLOCKS.grass, BLOCKS.dirt, BLOCKS.stone]) {
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
        110 + grain,
        86 + grain * 0.2,
        56 + grain * 0.12,
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
    }
  }
  return textures;
}

const textures = createTextureSet();

function getTextureFace(blockType, normal) {
  if (normal.y > 0) {
    return textures[blockType].top;
  }
  if (normal.y < 0) {
    return textures[blockType].bottom;
  }
  return textures[blockType].side;
}

function sampleTexture(blockType, normal, u, v) {
  const texture = getTextureFace(blockType, normal);
  const tx = clamp(Math.floor(fract(u) * 16), 0, 15);
  const ty = clamp(Math.floor(fract(v) * 16), 0, 15);
  const index = (ty * 16 + tx) * 3;
  return [texture[index], texture[index + 1], texture[index + 2]];
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
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        heights[z * CHUNK_SIZE + x] = this.getHeightAt(wx, wz);
      }
    }

    const chunk = {
      cx,
      cz,
      heights,
      edits: new Map(),
    };
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
        const chunk = this.ensureChunk(cx, cz);
        this.loadedKeys.add(this.getChunkKey(chunk.cx, chunk.cz));
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
    if (wy < -2) {
      return BLOCKS.stone;
    }
    const chunk = this.ensureChunk(Math.floor(wx / CHUNK_SIZE), Math.floor(wz / CHUNK_SIZE));
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const height = chunk.heights[lz * CHUNK_SIZE + lx];
    if (wy > height) {
      return BLOCKS.air;
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
    if (wy > 64) {
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
    if (generated === blockType) {
      chunk.edits.delete(editKey);
    } else {
      chunk.edits.set(editKey, blockType);
    }
  }

  isSolid(wx, wy, wz) {
    return this.getBlock(wx, wy, wz) !== BLOCKS.air;
  }
}

const world = new World();
const spawnHeight = world.getHeightAt(0, 0) + 1;

const state = {
  mode: "menu",
  running: false,
  pointerLocked: false,
  keys: new Set(),
  mouseDown: { left: false, right: false },
  selectedBlock: BLOCKS.grass,
  lastInteractionTime: 0,
  elapsed: 0,
  frameCount: 0,
  target: null,
  interactionPulse: 0,
  dragLook: false,
  dragAnchor: null,
  player: {
    x: 0.5,
    y: spawnHeight + 2,
    z: 0.5,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: -0.55,
    pitch: -0.2,
    onGround: false,
  },
};

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(window.innerWidth * dpr);
  const height = Math.round(window.innerHeight * dpr);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.imageSmoothingEnabled = false;
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

function getForwardVector() {
  const cp = Math.cos(state.player.pitch);
  return {
    x: Math.sin(state.player.yaw) * cp,
    y: Math.sin(state.player.pitch),
    z: Math.cos(state.player.yaw) * cp,
  };
}

function getViewOrigin() {
  const forward = getForwardVector();
  return {
    x: state.player.x + forward.x * EYE_FORWARD_OFFSET,
    y: state.player.y + CAMERA_HEIGHT + forward.y * EYE_FORWARD_OFFSET,
    z: state.player.z + forward.z * EYE_FORWARD_OFFSET,
  };
}

function castRay(origin, direction, maxDistance) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = direction.x >= 0 ? 1 : -1;
  const stepY = direction.y >= 0 ? 1 : -1;
  const stepZ = direction.z >= 0 ? 1 : -1;

  const deltaX = direction.x === 0 ? Infinity : Math.abs(1 / direction.x);
  const deltaY = direction.y === 0 ? Infinity : Math.abs(1 / direction.y);
  const deltaZ = direction.z === 0 ? Infinity : Math.abs(1 / direction.z);

  let maxX = direction.x >= 0
    ? (Math.floor(origin.x) + 1 - origin.x) * deltaX
    : (origin.x - Math.floor(origin.x)) * deltaX;
  let maxY = direction.y >= 0
    ? (Math.floor(origin.y) + 1 - origin.y) * deltaY
    : (origin.y - Math.floor(origin.y)) * deltaY;
  let maxZ = direction.z >= 0
    ? (Math.floor(origin.z) + 1 - origin.z) * deltaZ
    : (origin.z - Math.floor(origin.z)) * deltaZ;

  let distance = 0;
  let normal = { x: 0, y: 0, z: 0 };

  for (let steps = 0; steps < 160; steps++) {
    if (world.isSolid(x, y, z)) {
      const hitX = origin.x + direction.x * distance;
      const hitY = origin.y + direction.y * distance;
      const hitZ = origin.z + direction.z * distance;
      let u = 0;
      let v = 0;
      if (normal.x !== 0) {
        u = hitZ;
        v = hitY;
      } else if (normal.y !== 0) {
        u = hitX;
        v = hitZ;
      } else {
        u = hitX;
        v = hitY;
      }

      return {
        block: { x, y, z, type: world.getBlock(x, y, z) },
        normal,
        distance,
        uv: { u, v },
        place: {
          x: x + normal.x,
          y: y + normal.y,
          z: z + normal.z,
        },
      };
    }

    if (maxX < maxY && maxX < maxZ) {
      x += stepX;
      distance = maxX;
      maxX += deltaX;
      normal = { x: -stepX, y: 0, z: 0 };
    } else if (maxY < maxZ) {
      y += stepY;
      distance = maxY;
      maxY += deltaY;
      normal = { x: 0, y: -stepY, z: 0 };
    } else {
      z += stepZ;
      distance = maxZ;
      maxZ += deltaZ;
      normal = { x: 0, y: 0, z: -stepZ };
    }

    if (distance > maxDistance) {
      break;
    }
  }

  return null;
}

function canPlaceBlock(x, y, z) {
  if (y > 48 || y < -8) {
    return false;
  }
  const centerX = x + 0.5;
  const centerY = y;
  const centerZ = z + 0.5;
  return !hasCollision(centerX, centerY, centerZ);
}

function interact(breaking) {
  const cooldown = 0.16;
  if (state.elapsed - state.lastInteractionTime < cooldown) {
    return;
  }
  state.lastInteractionTime = state.elapsed;
  const origin = getViewOrigin();
  const hit = castRay(origin, getForwardVector(), INTERACTION_RANGE);
  state.target = hit;
  if (!hit) {
    return;
  }

  if (breaking) {
    world.setBlock(hit.block.x, hit.block.y, hit.block.z, BLOCKS.air);
  } else if (canPlaceBlock(hit.place.x, hit.place.y, hit.place.z)) {
    world.setBlock(hit.place.x, hit.place.y, hit.place.z, state.selectedBlock);
  }
  state.interactionPulse = 0.1;
}

function handleInput(dt) {
  const player = state.player;
  const forwardIntent = (state.keys.has("KeyW") || state.keys.has("ArrowUp") ? 1 : 0)
    + (state.keys.has("KeyS") || state.keys.has("ArrowDown") ? -1 : 0);
  const strafeIntent = (state.keys.has("KeyD") ? 1 : 0)
    + (state.keys.has("KeyA") && !state.keys.has("ShiftLeft") ? -1 : 0);

  if (state.keys.has("ArrowLeft")) {
    player.yaw += dt * 1.9;
  }
  if (state.keys.has("ArrowRight")) {
    player.yaw -= dt * 1.9;
  }

  const moveX = Math.sin(player.yaw);
  const moveZ = Math.cos(player.yaw);
  const strafeX = Math.sin(player.yaw + PI / 2);
  const strafeZ = Math.cos(player.yaw + PI / 2);
  let wishX = moveX * forwardIntent + strafeX * strafeIntent;
  let wishZ = moveZ * forwardIntent + strafeZ * strafeIntent;

  const magnitude = Math.hypot(wishX, wishZ) || 1;
  wishX /= magnitude;
  wishZ /= magnitude;

  const targetSpeed = MOVE_SPEED;
  player.vx = wishX * targetSpeed;
  player.vz = wishZ * targetSpeed;

  if (state.keys.has("Space") && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
  }

  if (state.keys.has("Digit1")) {
    state.selectedBlock = BLOCKS.grass;
  }
  if (state.keys.has("Digit2")) {
    state.selectedBlock = BLOCKS.dirt;
  }
  if (state.keys.has("Digit3")) {
    state.selectedBlock = BLOCKS.stone;
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

function update(dt, shouldRender = true) {
  if (!state.running) {
    if (shouldRender) {
      render();
    }
    return;
  }

  state.elapsed += dt;
  state.frameCount++;
  world.updateLoadedChunks(state.player.x, state.player.z);
  handleInput(dt);

  state.player.vy -= GRAVITY * dt;

  movePlayerAxis("x", state.player.vx * dt);
  movePlayerAxis("z", state.player.vz * dt);
  state.player.onGround = false;
  movePlayerAxis("y", state.player.vy * dt);

  const viewOrigin = getViewOrigin();
  state.target = castRay(viewOrigin, getForwardVector(), INTERACTION_RANGE);
  state.interactionPulse = Math.max(0, state.interactionPulse - dt);

  if (state.player.y < -20) {
    state.player.x = 0.5;
    state.player.y = world.getHeightAt(0, 0) + 3;
    state.player.z = 0.5;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.vz = 0;
  }

  if (shouldRender) {
    render();
  }
}

function skyColor(normalizedY) {
  const blend = smoothstep(0, 1, normalizedY);
  return [
    lerp(skyHorizon[0], skyTop[0], blend),
    lerp(skyHorizon[1], skyTop[1], blend),
    lerp(skyHorizon[2], skyTop[2], blend),
  ];
}

function shadeColor(color, brightness, fogFactor) {
  const fogColor = skyHorizon;
  return [
    lerp(color[0] * brightness, fogColor[0], fogFactor),
    lerp(color[1] * brightness, fogColor[1], fogFactor),
    lerp(color[2] * brightness, fogColor[2], fogFactor),
  ];
}

function render() {
  const aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT;
  const fov = 1.1;
  const origin = getViewOrigin();
  const forward = getForwardVector();
  const right = {
    x: Math.cos(state.player.yaw),
    y: 0,
    z: -Math.sin(state.player.yaw),
  };
  const up = {
    x: -right.z * Math.sin(state.player.pitch),
    y: Math.cos(state.player.pitch),
    z: right.x * Math.sin(state.player.pitch),
  };

  let ptr = 0;
  for (let py = 0; py < INTERNAL_HEIGHT; py++) {
    const ny = 1 - (py / (INTERNAL_HEIGHT - 1)) * 2;
    for (let px = 0; px < INTERNAL_WIDTH; px++) {
      const nx = (px / (INTERNAL_WIDTH - 1)) * 2 - 1;
      const dir = {
        x: forward.x + right.x * nx * aspect * fov + up.x * ny * fov,
        y: forward.y + right.y * nx * aspect * fov + up.y * ny * fov,
        z: forward.z + right.z * nx * aspect * fov + up.z * ny * fov,
      };
      const invLength = 1 / Math.hypot(dir.x, dir.y, dir.z);
      dir.x *= invLength;
      dir.y *= invLength;
      dir.z *= invLength;

      const hit = castRay(origin, dir, MAX_RAY_DISTANCE);
      let color;
      if (hit) {
        const texel = sampleTexture(hit.block.type, hit.normal, hit.uv.u, hit.uv.v);
        const faceLight = hit.normal.y > 0
          ? 1.0
          : hit.normal.y < 0
            ? 0.52
            : hit.normal.x !== 0
              ? 0.72
              : 0.84;
        const heightLight = clamp((hit.block.y + 12) / 28, 0.55, 1.02);
        const distanceFog = smoothstep(MAX_RAY_DISTANCE * 0.35, MAX_RAY_DISTANCE, hit.distance);
        color = shadeColor(texel, faceLight * heightLight, distanceFog);
      } else if (dir.y < -0.12) {
        const groundBlend = smoothstep(-1, -0.12, dir.y);
        color = [
          lerp(36, 62, groundBlend),
          lerp(44, 80, groundBlend),
          lerp(42, 58, groundBlend),
        ];
      } else if (dir.y > 0.96) {
        color = voidColor;
      } else {
        color = skyColor(clamp((dir.y + 0.25) * 1.15, 0, 1));
      }

      frameBuffer[ptr++] = color[0];
      frameBuffer[ptr++] = color[1];
      frameBuffer[ptr++] = color[2];
      frameBuffer[ptr++] = 255;
    }
  }

  renderCtx.putImageData(imageData, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(renderSurface, 0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawOverlay();
  updateHud();
}

function drawOverlay() {
  const width = canvas.width;
  const height = canvas.height;
  ctx.save();

  const pulse = state.interactionPulse > 0 ? 2 : 0;
  const crossX = width / 2;
  const crossY = height / 2;
  ctx.strokeStyle = state.target ? "rgba(255, 250, 220, 0.95)" : "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 2 + pulse;
  ctx.beginPath();
  ctx.moveTo(crossX - 10, crossY);
  ctx.lineTo(crossX - 3, crossY);
  ctx.moveTo(crossX + 3, crossY);
  ctx.lineTo(crossX + 10, crossY);
  ctx.moveTo(crossX, crossY - 10);
  ctx.lineTo(crossX, crossY - 3);
  ctx.moveTo(crossX, crossY + 3);
  ctx.lineTo(crossX, crossY + 10);
  ctx.stroke();

  if (state.target) {
    ctx.strokeStyle = "rgba(255, 225, 130, 0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(crossX - 16, crossY - 16, 32, 32);
  }

  ctx.restore();
}

function updateHud() {
  const player = state.player;
  const targetBlock = state.target?.block
    ? `${BLOCK_NAMES[state.target.block.type]} @ ${state.target.block.x}, ${state.target.block.y}, ${state.target.block.z}`
    : "none";
  hudPrimary.textContent =
    `Selected: ${BLOCK_NAMES[state.selectedBlock]}\n` +
    `Target: ${targetBlock}\n` +
    `Chunks: ${world.loadedKeys.size} active / ${world.chunks.size} cached`;
  hudSecondary.textContent =
    `XYZ ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}\n` +
    `Yaw ${player.yaw.toFixed(2)} Pitch ${player.pitch.toFixed(2)}\n` +
    `${state.pointerLocked ? "Pointer lock" : "Click canvas to lock mouse"}`;
}

function animationLoop(previous) {
  return (timestamp) => {
    const dt = clamp((timestamp - previous) / 1000, 0, 0.033);
    previous = timestamp;
    update(dt, true);
    requestAnimationFrame(animationLoop(previous));
  };
}

function renderGameToText() {
  const player = state.player;
  const origin = getViewOrigin();
  const target = state.target
    ? {
        block: state.target.block,
        place: state.target.place,
        distance: Number(state.target.distance.toFixed(2)),
      }
    : null;
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
    camera: {
      x: Number(origin.x.toFixed(2)),
      y: Number(origin.y.toFixed(2)),
      z: Number(origin.z.toFixed(2)),
    },
    selectedBlock: BLOCK_NAMES[state.selectedBlock],
    target,
    chunkStats: {
      active: world.loadedKeys.size,
      cached: world.chunks.size,
      generatedSinceLoad: world.totalGenerated,
    },
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (FIXED_STEP * 1000)));
  for (let i = 0; i < steps; i++) {
    update(FIXED_STEP, i === steps - 1);
  }
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
    const deltaX = event.clientX - state.dragAnchor.x;
    const deltaY = event.clientY - state.dragAnchor.y;
    moveLook(deltaX, deltaY);
    state.dragAnchor = { x: event.clientX, y: event.clientY };
  }
});

window.addEventListener("pointerlockchange", updatePointerState);
window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    exitPointerLock();
  }
  if (event.code === "Space" || event.code.startsWith("Arrow")) {
    event.preventDefault();
  }
  state.keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

resizeCanvas();
world.updateLoadedChunks(state.player.x, state.player.z);
render();
requestAnimationFrame(animationLoop(performance.now()));
