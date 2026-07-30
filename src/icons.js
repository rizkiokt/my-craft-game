// Canvas item icons shared by the UI and dropped items.

import * as THREE from "../node_modules/three/build/three.module.js";
import { ARMOR_ITEMS, BLOCKS, ITEMS, PI } from "./constants.js";
import { atlasInfo, getTileIndex } from "./textures.js";
export const itemIcons = new Map();
export const iconCanvases = new Map();
/** Background-free variants, for meshes in the world rather than UI slots. */
export const iconGlyphCanvases = new Map();
export const iconTextures = new Map();

export function getIconTexture(itemId) {
  if (!iconTextures.has(itemId)) {
    const source = iconGlyphCanvases.get(itemId) ?? iconCanvases.get(itemId);
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

export function getTileCanvas(tileIndex) {
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

export function createItemIcon(blockType) {
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

export function createFlatIcon(background, accent, glyph) {
  const icon = document.createElement("canvas");
  icon.width = 48;
  icon.height = 48;
  const iconCtx = icon.getContext("2d");
  if (background) {
    iconCtx.fillStyle = background;
    iconCtx.fillRect(8, 8, 32, 32);
    iconCtx.strokeStyle = "rgba(255,255,255,0.12)";
    iconCtx.strokeRect(8.5, 8.5, 31, 31);
  }
  iconCtx.fillStyle = accent;
  glyph(iconCtx);
  return icon;
}

/** Registers a flat item icon plus its transparent twin for 3D use. */
export function registerFlatIcon(itemId, accent, glyph) {
  registerIcon(itemId, createFlatIcon("#2b3343", accent, glyph));
  iconGlyphCanvases.set(itemId, createFlatIcon(null, accent, glyph));
}

export function createStickGlyph(ctxGlyph) {
  ctxGlyph.fillRect(22, 13, 4, 20);
  ctxGlyph.fillRect(20, 29, 8, 6);
}

export function createCoalGlyph(ctxGlyph) {
  ctxGlyph.beginPath();
  ctxGlyph.moveTo(18, 14);
  ctxGlyph.lineTo(31, 18);
  ctxGlyph.lineTo(28, 33);
  ctxGlyph.lineTo(16, 30);
  ctxGlyph.closePath();
  ctxGlyph.fill();
}

export function createPickaxeGlyph(ctxGlyph, tint) {
  ctxGlyph.fillStyle = tint;
  ctxGlyph.fillRect(14, 13, 20, 5);
  ctxGlyph.fillRect(24, 13, 4, 22);
  ctxGlyph.fillRect(18, 18, 8, 5);
}

export function registerIcon(itemId, iconCanvas) {
  iconCanvases.set(itemId, iconCanvas);
  itemIcons.set(itemId, iconCanvas.toDataURL("image/png"));
}

for (const blockType of Object.values(BLOCKS)) {
  if (blockType !== BLOCKS.air) {
    registerIcon(blockType, createItemIcon(blockType));
  }
}
registerFlatIcon(ITEMS.stick, "#d1ab6a", createStickGlyph);
registerFlatIcon(ITEMS.coal, "#101217", createCoalGlyph);
registerFlatIcon(ITEMS.iron_ingot, "#d7dce4", (ctxGlyph) => {
  ctxGlyph.fillRect(14, 20, 20, 10);
  ctxGlyph.fillRect(16, 16, 16, 4);
});
registerFlatIcon(ITEMS.wood_pickaxe, "#9a7440", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#caa061"));
registerFlatIcon(ITEMS.stone_pickaxe, "#8a949d", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#c0c7cf"));
registerFlatIcon(ITEMS.iron_pickaxe, "#d7dce4", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#e3e8ef"));
registerFlatIcon(ITEMS.diamond_pickaxe, "#5fe3d8", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#63e6db"));
registerFlatIcon(ITEMS.netherite_pickaxe, "#6b5b58", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#7d6a66"));

/** Cut gem silhouette used for diamonds. */
function createGemGlyph(ctxGlyph) {
  ctxGlyph.beginPath();
  ctxGlyph.moveTo(24, 12);
  ctxGlyph.lineTo(34, 21);
  ctxGlyph.lineTo(24, 36);
  ctxGlyph.lineTo(14, 21);
  ctxGlyph.closePath();
  ctxGlyph.fill();
  ctxGlyph.fillStyle = "rgba(255,255,255,0.55)";
  ctxGlyph.beginPath();
  ctxGlyph.moveTo(24, 12);
  ctxGlyph.lineTo(29, 21);
  ctxGlyph.lineTo(24, 24);
  ctxGlyph.lineTo(19, 21);
  ctxGlyph.closePath();
  ctxGlyph.fill();
}

registerFlatIcon(ITEMS.diamond, "#4fd8ec", createGemGlyph);
registerFlatIcon(ITEMS.netherite_scrap, "#8a6a52", (ctxGlyph) => {
  ctxGlyph.beginPath();
  ctxGlyph.moveTo(16, 18);
  ctxGlyph.lineTo(32, 14);
  ctxGlyph.lineTo(34, 30);
  ctxGlyph.lineTo(18, 34);
  ctxGlyph.closePath();
  ctxGlyph.fill();
  ctxGlyph.fillStyle = "rgba(0,0,0,0.35)";
  ctxGlyph.fillRect(21, 21, 6, 6);
});
registerFlatIcon(ITEMS.netherite_ingot, "#6b5b58", (ctxGlyph) => {
  ctxGlyph.fillRect(14, 20, 20, 10);
  ctxGlyph.fillRect(16, 16, 16, 4);
  ctxGlyph.fillStyle = "rgba(255,220,190,0.35)";
  ctxGlyph.fillRect(17, 17, 14, 2);
});

/* ------------------------------------------------------------------ *
 * Armour icons — one silhouette per slot, tinted per tier.
 * ------------------------------------------------------------------ */

const ARMOR_GLYPHS = {
  helmet: (ctxGlyph) => {
    ctxGlyph.fillRect(13, 12, 22, 8);
    ctxGlyph.fillRect(13, 20, 6, 12);
    ctxGlyph.fillRect(29, 20, 6, 12);
    ctxGlyph.fillRect(19, 20, 10, 4);
  },
  chestplate: (ctxGlyph) => {
    ctxGlyph.fillRect(16, 12, 16, 22);
    ctxGlyph.fillRect(10, 14, 6, 14);
    ctxGlyph.fillRect(32, 14, 6, 14);
  },
  leggings: (ctxGlyph) => {
    ctxGlyph.fillRect(14, 12, 20, 7);
    ctxGlyph.fillRect(14, 19, 8, 17);
    ctxGlyph.fillRect(26, 19, 8, 17);
  },
  boots: (ctxGlyph) => {
    ctxGlyph.fillRect(13, 18, 9, 10);
    ctxGlyph.fillRect(26, 18, 9, 10);
    ctxGlyph.fillRect(13, 28, 13, 6);
    ctxGlyph.fillRect(26, 28, 13, 6);
  },
};

for (const [itemId, info] of Object.entries(ARMOR_ITEMS)) {
  const tint = `#${info.color.toString(16).padStart(6, "0")}`;
  registerFlatIcon(Number(itemId), tint, (ctxGlyph) => {
    ctxGlyph.fillStyle = tint;
    ARMOR_GLYPHS[info.slot](ctxGlyph);
  });
}

// The car: a little side-on silhouette, so it reads at hotbar size.
registerFlatIcon(ITEMS.car, "#2f7fd4", (ctxGlyph) => {
  ctxGlyph.fillStyle = "#e9eef5";
  ctxGlyph.fillRect(5, 15, 22, 7);
  ctxGlyph.fillRect(10, 10, 12, 6);
  ctxGlyph.fillStyle = "#8fc8e8";
  ctxGlyph.fillRect(12, 11, 4, 4);
  ctxGlyph.fillRect(17, 11, 4, 4);
  ctxGlyph.fillStyle = "#1d1f24";
  ctxGlyph.fillRect(8, 21, 5, 5);
  ctxGlyph.fillRect(19, 21, 5, 5);
});

// The monster truck: the same silhouette up on far bigger wheels.
registerFlatIcon(ITEMS.truck, "#3fa65c", (ctxGlyph) => {
  ctxGlyph.fillStyle = "#e9eef5";
  ctxGlyph.fillRect(6, 11, 20, 6);
  ctxGlyph.fillRect(10, 6, 12, 6);
  ctxGlyph.fillStyle = "#8fc8e8";
  ctxGlyph.fillRect(12, 7, 4, 4);
  ctxGlyph.fillRect(17, 7, 4, 4);
  ctxGlyph.fillStyle = "#1d1f24";
  ctxGlyph.fillRect(3, 17, 10, 10);
  ctxGlyph.fillRect(19, 17, 10, 10);
  ctxGlyph.fillStyle = "#b9c0cb";
  ctxGlyph.fillRect(6, 20, 4, 4);
  ctxGlyph.fillRect(22, 20, 4, 4);
});

// The trailer truck: a small cab and a long box, side on.
registerFlatIcon(ITEMS.rig, "#e8724c", (ctxGlyph) => {
  ctxGlyph.fillStyle = "#e9eef5";
  ctxGlyph.fillRect(2, 7, 10, 10);
  ctxGlyph.fillStyle = "#8fc8e8";
  ctxGlyph.fillRect(3, 9, 6, 4);
  ctxGlyph.fillStyle = "#d5dbe4";
  ctxGlyph.fillRect(13, 4, 17, 13);
  ctxGlyph.fillStyle = "#9aa3b0";
  ctxGlyph.fillRect(13, 11, 17, 2);
  ctxGlyph.fillStyle = "#1d1f24";
  ctxGlyph.fillRect(3, 18, 8, 8);
  ctxGlyph.fillRect(15, 18, 8, 8);
  ctxGlyph.fillRect(23, 18, 7, 8);
});

// The semi: a cab and two boxes, on a lot of wheels.
registerFlatIcon(ITEMS.semi, "#9b5de5", (ctxGlyph) => {
  ctxGlyph.fillStyle = "#e9eef5";
  ctxGlyph.fillRect(1, 8, 7, 9);
  ctxGlyph.fillStyle = "#8fc8e8";
  ctxGlyph.fillRect(2, 10, 4, 3);
  ctxGlyph.fillStyle = "#d5dbe4";
  ctxGlyph.fillRect(9, 5, 10, 12);
  ctxGlyph.fillRect(20, 6, 11, 11);
  ctxGlyph.fillStyle = "#9aa3b0";
  ctxGlyph.fillRect(9, 11, 22, 2);
  ctxGlyph.fillStyle = "#1d1f24";
  for (const x of [1, 8, 13, 20, 25]) ctxGlyph.fillRect(x, 18, 6, 7);
});

// Flying car: the car silhouette with a fan either side.
registerFlatIcon(ITEMS.flying_car, "#24b6c9", (ctxGlyph) => {
  ctxGlyph.fillStyle = "#e9eef5";
  ctxGlyph.fillRect(8, 13, 16, 7);
  ctxGlyph.fillRect(12, 8, 8, 6);
  ctxGlyph.fillStyle = "#8fc8e8";
  ctxGlyph.fillRect(13, 9, 6, 4);
  ctxGlyph.fillStyle = "#2b2f36";
  ctxGlyph.fillRect(1, 14, 7, 4);
  ctxGlyph.fillRect(24, 14, 7, 4);
  ctxGlyph.fillStyle = "#7fe3ff";
  ctxGlyph.fillRect(2, 19, 5, 3);
  ctxGlyph.fillRect(25, 19, 5, 3);
});

// Helicopter: a rotor line over a cabin with a boom.
registerFlatIcon(ITEMS.helicopter, "#e8724c", (ctxGlyph) => {
  ctxGlyph.fillStyle = "#2b2f36";
  ctxGlyph.fillRect(2, 6, 28, 2);
  ctxGlyph.fillRect(15, 8, 2, 4);
  ctxGlyph.fillStyle = "#e9eef5";
  ctxGlyph.fillRect(7, 12, 13, 10);
  ctxGlyph.fillRect(19, 15, 11, 3);
  ctxGlyph.fillStyle = "#8fc8e8";
  ctxGlyph.fillRect(8, 14, 5, 5);
  ctxGlyph.fillStyle = "#2b2f36";
  ctxGlyph.fillRect(27, 10, 2, 9);
  ctxGlyph.fillRect(8, 23, 12, 2);
});

// Airplane: seen from above, wings across.
registerFlatIcon(ITEMS.airplane, "#f0b429", (ctxGlyph) => {
  ctxGlyph.fillStyle = "#e9eef5";
  ctxGlyph.fillRect(14, 3, 4, 26);
  ctxGlyph.fillRect(1, 13, 30, 5);
  ctxGlyph.fillRect(8, 24, 16, 3);
  ctxGlyph.fillStyle = "#8fc8e8";
  ctxGlyph.fillRect(14, 7, 4, 4);
  ctxGlyph.fillStyle = "#2b2f36";
  ctxGlyph.fillRect(9, 1, 14, 2);
});
