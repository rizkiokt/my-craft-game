// Procedural block texture atlas and UV helpers.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCKS } from "./constants.js";
import { clamp, hash3, lerp } from "./math.js";
export function createTextureSet() {
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
    BLOCKS.lava,
    BLOCKS.portal_frame,
    BLOCKS.portal,
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

      // Diamond ore: cyan gems clustered in stone.
      const gemSeed = hash3(x * 0.7, y * 0.7, 21);
      const gem = gemSeed > 0.78 && (x + y) % 3 !== 0 ? 1 : 0;
      for (const face of ["top", "side", "bottom"]) {
        const shade = face === "top" ? 10 : face === "bottom" ? -10 : 0;
        paint(textures[BLOCKS.diamond_ore][face], x, y, [
          (gem ? 96 : 108 + shade) + rock * 0.4,
          (gem ? 224 : 112 + shade) + rock * 0.35,
          (gem ? 232 : 120 + shade) + rock * 0.3,
        ]);
      }

      // Ancient debris: dark rock streaked with warm metal.
      const debrisSeed = hash3(x * 0.5, y * 0.5, 33);
      const streak = debrisSeed > 0.72 ? 1 : 0;
      for (const face of ["top", "side", "bottom"]) {
        const shade = face === "top" ? 8 : face === "bottom" ? -8 : 0;
        paint(textures[BLOCKS.ancient_debris][face], x, y, [
          (streak ? 120 : 62 + shade) + rock * 0.25,
          (streak ? 86 : 50 + shade) + rock * 0.2,
          (streak ? 74 : 48 + shade) + rock * 0.2,
        ]);
      }

      // Enchanting table: obsidian base with a glowing top.
      const runeSeed = hash3(x * 0.9, y * 0.9, 44);
      const rune = runeSeed > 0.86 ? 1 : 0;
      paint(textures[BLOCKS.enchanting_table].top, x, y, [
        (rune ? 198 : 46) + rock * 0.2,
        (rune ? 132 : 34) + rock * 0.15,
        (rune ? 226 : 62) + rock * 0.2,
      ]);
      const clothRow = y > 11;
      paint(textures[BLOCKS.enchanting_table].side, x, y, [
        (clothRow ? 138 : 38) + rock * 0.2,
        (clothRow ? 30 : 28) + rock * 0.15,
        (clothRow ? 52 : 58) + rock * 0.2,
      ]);
      paint(textures[BLOCKS.enchanting_table].bottom, x, y, [
        34 + rock * 0.2,
        26 + rock * 0.15,
        52 + rock * 0.2,
      ]);

      // Chest: planks with a dark band and a latch on the front.
      const chestGrain = hash3(x * 0.6, y * 0.6, 55) * 16 - 8;
      const band = y === 7 || y === 8;
      const latch = x >= 6 && x <= 9 && y >= 6 && y <= 10;
      paint(textures[BLOCKS.chest].top, x, y, [
        (band ? 96 : 158) + chestGrain,
        (band ? 66 : 108) + chestGrain * 0.7,
        (band ? 38 : 60) + chestGrain * 0.4,
      ]);
      paint(textures[BLOCKS.chest].side, x, y, [
        (latch ? 176 : band ? 88 : 146) + chestGrain,
        (latch ? 148 : band ? 60 : 100) + chestGrain * 0.7,
        (latch ? 70 : band ? 34 : 56) + chestGrain * 0.4,
      ]);
      paint(textures[BLOCKS.chest].bottom, x, y, [
        126 + chestGrain,
        86 + chestGrain * 0.7,
        48 + chestGrain * 0.4,
      ]);

      // Torch: pale wood with a glowing head at the top.
      const flame = y < 5;
      const ember = y >= 5 && y < 7;
      paint(textures[BLOCKS.torch].side, x, y, [
        flame ? 255 : ember ? 240 : 150 + rock * 0.3,
        flame ? 226 : ember ? 160 : 110 + rock * 0.25,
        flame ? 120 : ember ? 60 : 68 + rock * 0.2,
      ]);
      paint(textures[BLOCKS.torch].top, x, y, [255, 232, 150]);
      paint(textures[BLOCKS.torch].bottom, x, y, [120, 88, 56]);

      /* ---------------------------------------------------------- *
       * Biome blocks
       * ---------------------------------------------------------- */

      // Cactus: ribbed green with paler spines down the ridges.
      const rib = x % 5 === 2;
      const cactusNoise = hash3(x * 0.5, y * 0.5, 71) * 12 - 6;
      paint(textures[BLOCKS.cactus].side, x, y, [
        (rib ? 96 : 62) + cactusNoise,
        (rib ? 150 : 122) + cactusNoise,
        (rib ? 78 : 58) + cactusNoise * 0.6,
      ]);
      paint(textures[BLOCKS.cactus].top, x, y, [
        70 + cactusNoise,
        128 + cactusNoise,
        64 + cactusNoise * 0.6,
      ]);
      paint(textures[BLOCKS.cactus].bottom, x, y, [
        58 + cactusNoise,
        104 + cactusNoise,
        54 + cactusNoise * 0.6,
      ]);

      // Red sand: the same grain as sand, turned to rust.
      const redGrain = hash3(x * 0.9, y * 0.9, 83) * 26 - 13;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.red_sand][face], x, y, [
          196 + redGrain,
          112 + redGrain * 0.7,
          72 + redGrain * 0.5,
        ]);
      }

      // Red rock: horizontal bands, which is what makes a canyon read as one.
      const bandIndex = Math.floor(y / 3);
      const bandShade = [0, -18, 14, -8, 22, 6][bandIndex % 6];
      const rockGrain = hash3(x * 0.7, y * 0.7, 91) * 12 - 6;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.red_rock][face], x, y, [
          168 + bandShade + rockGrain,
          92 + bandShade * 0.8 + rockGrain * 0.7,
          62 + bandShade * 0.4 + rockGrain * 0.5,
        ]);
      }

      // Mud: wet, dark and blotchy.
      const mudBlotch = hash3(x * 0.4, y * 0.4, 97) > 0.7 ? -16 : 0;
      const mudNoise = hash3(x * 0.8, y * 0.8, 101) * 16 - 8;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.mud][face], x, y, [
          74 + mudNoise + mudBlotch,
          62 + mudNoise * 0.8 + mudBlotch,
          48 + mudNoise * 0.6 + mudBlotch,
        ]);
      }

      // Netherrack: pitted crimson stone.
      const pit = hash3(x * 0.6, y * 0.6, 107) > 0.72 ? -30 : 0;
      const netherNoise = hash3(x * 1.1, y * 1.1, 113) * 22 - 11;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.netherrack][face], x, y, [
          128 + netherNoise + pit,
          46 + netherNoise * 0.5 + pit * 0.6,
          40 + netherNoise * 0.4 + pit * 0.5,
        ]);
      }

      // Glowstone: clustered bright specks in a warm crust.
      const speck = hash3(Math.floor(x / 2), Math.floor(y / 2), 127) > 0.45;
      const glowNoise = hash3(x * 0.9, y * 0.9, 131) * 18 - 9;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.glowstone][face], x, y, [
          (speck ? 255 : 206) + glowNoise,
          (speck ? 226 : 154) + glowNoise,
          (speck ? 138 : 74) + glowNoise * 0.6,
        ]);
      }

      // Lava: bright, with darker crust swirls across it.
      const crust = hash3(x * 0.35, y * 0.35, 137) > 0.62;
      const lavaNoise = hash3(x * 0.8, y * 0.8, 139) * 24 - 12;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.lava][face], x, y, [
          (crust ? 208 : 255) + lavaNoise,
          (crust ? 82 : 158) + lavaNoise,
          (crust ? 24 : 40) + lavaNoise * 0.4,
        ]);
      }

      // Portal frame: dark polished stone with a faint inlay.
      const inlay = (x + y) % 7 === 0;
      const frameNoise = hash3(x * 0.7, y * 0.7, 149) * 14 - 7;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.portal_frame][face], x, y, [
          (inlay ? 122 : 62) + frameNoise,
          (inlay ? 108 : 58) + frameNoise,
          (inlay ? 148 : 78) + frameNoise,
        ]);
      }

      // Portal: swirling violet. Tinted per destination by the mesher.
      const swirl = Math.sin((x + y * 1.7) * 0.9) * 0.5 + 0.5;
      const sparkle = hash3(x * 1.3, y * 1.3, 151) > 0.86 ? 60 : 0;
      for (const face of ["top", "side", "bottom"]) {
        paint(textures[BLOCKS.portal][face], x, y, [
          120 + swirl * 90 + sparkle,
          60 + swirl * 60 + sparkle,
          190 + swirl * 60 + sparkle,
        ]);
      }

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

export function createAtlasTexture() {
  const textureSet = createTextureSet();
  const tileSize = 16;
  // 8x8 leaves room to grow; everything reads columns/rows off atlasInfo.
  const columns = 8;
  const rows = 8;
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
    textureSet[BLOCKS.diamond_ore].side,
    textureSet[BLOCKS.ancient_debris].side,
    textureSet[BLOCKS.enchanting_table].top,
    textureSet[BLOCKS.enchanting_table].side,
    textureSet[BLOCKS.chest].top,
    textureSet[BLOCKS.chest].side,
    textureSet[BLOCKS.torch].side,
    textureSet[BLOCKS.torch].top,
    textureSet[BLOCKS.cactus].side,
    textureSet[BLOCKS.cactus].top,
    textureSet[BLOCKS.red_sand].side,
    textureSet[BLOCKS.red_rock].side,
    textureSet[BLOCKS.mud].side,
    textureSet[BLOCKS.netherrack].side,
    textureSet[BLOCKS.glowstone].side,
    textureSet[BLOCKS.lava].side,
    textureSet[BLOCKS.portal_frame].side,
    textureSet[BLOCKS.portal].side,
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

export function getTileIndex(blockType, faceKey) {
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
  if (blockType === BLOCKS.diamond_ore) {
    return 25;
  }
  if (blockType === BLOCKS.ancient_debris) {
    return 26;
  }
  if (blockType === BLOCKS.enchanting_table) {
    return faceKey === "py" ? 27 : 28;
  }
  if (blockType === BLOCKS.chest) {
    return faceKey === "py" || faceKey === "ny" ? 29 : 30;
  }
  if (blockType === BLOCKS.torch) {
    return faceKey === "py" ? 32 : 31;
  }
  if (blockType === BLOCKS.cactus) {
    return faceKey === "py" || faceKey === "ny" ? 34 : 33;
  }
  if (blockType === BLOCKS.red_sand) {
    return 35;
  }
  if (blockType === BLOCKS.red_rock) {
    return 36;
  }
  if (blockType === BLOCKS.mud) {
    return 37;
  }
  if (blockType === BLOCKS.netherrack) {
    return 38;
  }
  if (blockType === BLOCKS.glowstone) {
    return 39;
  }
  if (blockType === BLOCKS.lava) {
    return 40;
  }
  if (blockType === BLOCKS.portal_frame) {
    return 41;
  }
  if (blockType === BLOCKS.portal) {
    return 42;
  }
  return 24;
}

export function atlasUv(columns, rows, tileIndex, u, v) {
  const inset = 0.0015;
  const col = tileIndex % columns;
  const row = Math.floor(tileIndex / columns);
  const minU = col / columns + inset;
  const maxU = (col + 1) / columns - inset;
  const minV = 1 - (row + 1) / rows + inset;
  const maxV = 1 - row / rows - inset;
  return [lerp(minU, maxU, u), lerp(minV, maxV, v)];
}

export const atlasInfo = createAtlasTexture();
