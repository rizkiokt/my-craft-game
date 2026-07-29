// Canvas item icons shared by the UI and dropped items.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCKS, ITEMS, PI } from "./constants.js";
import { atlasInfo, getTileIndex } from "./textures.js";
export const itemIcons = new Map();
export const iconCanvases = new Map();
export const iconTextures = new Map();

export function getIconTexture(itemId) {
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
  iconCtx.fillStyle = background;
  iconCtx.fillRect(8, 8, 32, 32);
  iconCtx.strokeStyle = "rgba(255,255,255,0.12)";
  iconCtx.strokeRect(8.5, 8.5, 31, 31);
  iconCtx.fillStyle = accent;
  glyph(iconCtx);
  return icon;
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
registerIcon(ITEMS.stick, createFlatIcon("#2b3343", "#d1ab6a", createStickGlyph));
registerIcon(ITEMS.coal, createFlatIcon("#2b3343", "#101217", createCoalGlyph));
registerIcon(ITEMS.iron_ingot, createFlatIcon("#2b3343", "#d7dce4", (ctxGlyph) => {
  ctxGlyph.fillRect(14, 20, 20, 10);
  ctxGlyph.fillRect(16, 16, 16, 4);
}));
registerIcon(ITEMS.wood_pickaxe, createFlatIcon("#2b3343", "#9a7440", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#caa061")));
registerIcon(ITEMS.stone_pickaxe, createFlatIcon("#2b3343", "#8a949d", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#c0c7cf")));
registerIcon(ITEMS.iron_pickaxe, createFlatIcon("#2b3343", "#d7dce4", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#e3e8ef")));
registerIcon(ITEMS.diamond_pickaxe, createFlatIcon("#2b3343", "#5fe3d8", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#63e6db")));
registerIcon(ITEMS.netherite_pickaxe, createFlatIcon("#2b3343", "#6b5b58", (ctxGlyph) => createPickaxeGlyph(ctxGlyph, "#7d6a66")));

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

registerIcon(ITEMS.diamond, createFlatIcon("#2b3343", "#4fd8ec", createGemGlyph));
registerIcon(ITEMS.netherite_scrap, createFlatIcon("#2b3343", "#8a6a52", (ctxGlyph) => {
  ctxGlyph.beginPath();
  ctxGlyph.moveTo(16, 18);
  ctxGlyph.lineTo(32, 14);
  ctxGlyph.lineTo(34, 30);
  ctxGlyph.lineTo(18, 34);
  ctxGlyph.closePath();
  ctxGlyph.fill();
  ctxGlyph.fillStyle = "rgba(0,0,0,0.35)";
  ctxGlyph.fillRect(21, 21, 6, 6);
}));
registerIcon(ITEMS.netherite_ingot, createFlatIcon("#2b3343", "#6b5b58", (ctxGlyph) => {
  ctxGlyph.fillRect(14, 20, 20, 10);
  ctxGlyph.fillRect(16, 16, 16, 4);
  ctxGlyph.fillStyle = "rgba(255,220,190,0.35)";
  ctxGlyph.fillRect(17, 17, 14, 2);
}));
