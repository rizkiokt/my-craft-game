// Perlin noise and small numeric helpers.

import { CHUNK_SIZE, PI } from "./constants.js";
const BASE_PERMUTATION = (() => {
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
  return source;
})();

/* ------------------------------------------------------------------ *
 * World seed
 *
 * Seed 0 keeps the original table and zero hash offset, so worlds saved
 * before seeds existed still generate exactly the same terrain.
 * ------------------------------------------------------------------ */

let worldSeed = 0;
let permutation = BASE_PERMUTATION.concat(BASE_PERMUTATION);
let hashOffset = 0;

/** Small deterministic PRNG, enough to shuffle a 256-entry table. */
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns any text into a seed number; digits are used as typed. */
export function seedFromText(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return 0;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) >>> 0;
  }
  let hash = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getWorldSeed() {
  return worldSeed;
}

/** Must be called before any chunk is generated. */
export function setWorldSeed(seed) {
  worldSeed = (Number(seed) || 0) >>> 0;
  if (worldSeed === 0) {
    permutation = BASE_PERMUTATION.concat(BASE_PERMUTATION);
    hashOffset = 0;
    return;
  }
  const random = mulberry32(worldSeed);
  const shuffled = BASE_PERMUTATION.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = swap;
  }
  permutation = shuffled.concat(shuffled);
  // Shifts every hash3 sample so ores and structures move with the seed too.
  hashOffset = random() * 1000;
}

export function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function grad(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function perlin2(x, y) {
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

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function fract(value) {
  return value - Math.floor(value);
}

export function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + hashOffset) * 43758.5453123;
  return fract(s);
}

export function floorVector(vector) {
  return {
    x: Math.floor(vector.x),
    y: Math.floor(vector.y),
    z: Math.floor(vector.z),
  };
}

export function wrapAngle(angle) {
  const fullTurn = PI * 2;
  return ((((angle + PI) % fullTurn) + fullTurn) % fullTurn) - PI;
}

export function lerpAngle(from, to, t) {
  return from + wrapAngle(to - from) * t;
}

export function isInsideRect(x, z, rect) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

export function chunkIntersectsRect(cx, cz, rect) {
  const minX = cx * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE - 1;
  const minZ = cz * CHUNK_SIZE;
  const maxZ = minZ + CHUNK_SIZE - 1;
  return !(maxX < rect.minX || minX > rect.maxX || maxZ < rect.minZ || minZ > rect.maxZ);
}
