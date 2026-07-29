// The player avatar: a textured blocky character with armour and a held item.
//
// Faces are painted onto small canvases rather than one UV-mapped skin sheet,
// because BoxGeometry already exposes a material group per face. That gives a
// proper face and clothing without hand-authoring UVs.

import * as THREE from "../node_modules/three/build/three.module.js";
import { ARMOR_ITEMS, ARMOR_SLOTS, BLOCKS, MOVE_SPEED, PI } from "./constants.js";
import { getIconTexture } from "./icons.js";
import { clamp } from "./math.js";
import { camera, scene } from "./scene.js";
import { state } from "./state.js";
import { atlasInfo, atlasUv, getTileIndex } from "./textures.js";

/** The player's own look; NPCs pass their own palette. */
export const DEFAULT_PALETTE = {
  skin: "#d8a077",
  hair: "#3a2a1d",
  shirt: "#3f8f8a",
  shirtDark: "#347571",
  pants: "#3c4a78",
  shoe: "#4a3a2a",
};

/** 16x16 canvas texture, nearest-filtered so it stays crisp and blocky. */
function makeFaceTexture(draw) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 16;
  canvasEl.height = 16;
  const ctx = canvasEl.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function fill(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 16, 16);
}

/** Speckle so the flat colours do not read as plastic. */
function speckle(ctx, alpha = 0.05) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < 16; y += 2) {
    for (let x = (y / 2) % 2; x < 16; x += 2) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function plain(color) {
  return makeFaceTexture((ctx) => {
    fill(ctx, color);
    speckle(ctx);
  });
}

const lambert = (map) => new THREE.MeshLambertMaterial({ map });

/** BoxGeometry material order is +x, -x, +y, -y, +z, -z. */
function boxMaterials({ right, left, top, bottom, front, back }) {
  return [right, left, top, bottom, front, back].map(lambert);
}

const materialCache = new Map();

/** Builds (and caches) the six-sided material sets for one look. */
function getCharacterMaterials(palette) {
  const key = Object.values(palette).join("|");
  if (materialCache.has(key)) {
    return materialCache.get(key);
  }
  const { skin, hair, shirt, shirtDark, pants, shoe } = palette;

  const faceTexture = makeFaceTexture((ctx) => {
    fill(ctx, skin);
    speckle(ctx);
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillRect(0, 4, 2, 3);
    ctx.fillRect(14, 4, 2, 3);
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(3, 7, 4, 3);
    ctx.fillRect(9, 7, 4, 3);
    ctx.fillStyle = palette.eyes ?? "#3b6fb5";
    ctx.fillRect(5, 8, 2, 2);
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(3, 6, 10, 1);
    ctx.fillStyle = "#8a5a44";
    ctx.fillRect(6, 12, 4, 1);
  });

  const hairSideTexture = makeFaceTexture((ctx) => {
    fill(ctx, skin);
    speckle(ctx);
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 16, 5);
    ctx.fillRect(0, 5, 4, 3);
  });

  const hairTexture = makeFaceTexture((ctx) => {
    fill(ctx, hair);
    speckle(ctx, 0.08);
  });

  const shirtFrontTexture = makeFaceTexture((ctx) => {
    fill(ctx, shirt);
    speckle(ctx);
    ctx.fillStyle = shirtDark;
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(7, 2, 2, 14);
    ctx.fillStyle = skin;
    ctx.fillRect(5, 0, 6, 2);
  });

  const sleeveTexture = makeFaceTexture((ctx) => {
    fill(ctx, shirt);
    speckle(ctx);
    ctx.fillStyle = skin;
    ctx.fillRect(0, 11, 16, 5);
  });

  const shoeTexture = makeFaceTexture((ctx) => {
    fill(ctx, pants);
    speckle(ctx);
    ctx.fillStyle = shoe;
    ctx.fillRect(0, 10, 16, 6);
  });

  const shirtTexture = plain(shirt);
  const shirtSideTexture = plain(shirtDark);
  const skinTexture = plain(skin);
  const pantsTexture = plain(pants);

  const materials = {
    head: boxMaterials({
      right: hairSideTexture,
      left: hairSideTexture,
      top: hairTexture,
      bottom: skinTexture,
      front: faceTexture,
      back: hairTexture,
    }),
    body: boxMaterials({
      right: shirtSideTexture,
      left: shirtSideTexture,
      top: shirtTexture,
      bottom: pantsTexture,
      front: shirtFrontTexture,
      back: shirtTexture,
    }),
    arm: boxMaterials({
      right: sleeveTexture,
      left: sleeveTexture,
      top: shirtTexture,
      bottom: skinTexture,
      front: sleeveTexture,
      back: sleeveTexture,
    }),
    leg: boxMaterials({
      right: shoeTexture,
      left: shoeTexture,
      top: pantsTexture,
      bottom: plain(shoe),
      front: shoeTexture,
      back: shoeTexture,
    }),
  };
  materialCache.set(key, materials);
  return materials;
}

export const playerGeometry = {
  head: new THREE.BoxGeometry(0.46, 0.46, 0.46),
  body: new THREE.BoxGeometry(0.5, 0.7, 0.26),
  arm: new THREE.BoxGeometry(0.2, 0.7, 0.2),
  leg: new THREE.BoxGeometry(0.22, 0.7, 0.22),
};

/** Armour repeats the limb shape, grown slightly so it sits on top. */
const armorGeometry = {
  helmet: new THREE.BoxGeometry(0.54, 0.54, 0.54),
  chestplate: new THREE.BoxGeometry(0.58, 0.74, 0.34),
  sleeve: new THREE.BoxGeometry(0.26, 0.46, 0.26),
  legging: new THREE.BoxGeometry(0.28, 0.42, 0.28),
  boot: new THREE.BoxGeometry(0.28, 0.24, 0.3),
};

const armorMaterials = new Map();

function getArmorMaterial(itemId) {
  if (!armorMaterials.has(itemId)) {
    armorMaterials.set(itemId, new THREE.MeshLambertMaterial({
      color: ARMOR_ITEMS[itemId]?.color ?? 0xcccccc,
      transparent: true,
      opacity: 0.94,
    }));
  }
  return armorMaterials.get(itemId);
}

function createLimb(geometry, materials, pivotX, pivotY) {
  const pivot = new THREE.Group();
  pivot.position.set(pivotX, pivotY, 0);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.y = -0.35;
  pivot.add(mesh);
  return pivot;
}

export function createCharacterModel(palette = DEFAULT_PALETTE) {
  const materials = getCharacterMaterials(palette);
  const root = new THREE.Group();

  // Torso pivots at the hips so sneaking can hunch the whole upper body.
  const torso = new THREE.Group();
  torso.position.set(0, 0.7, 0);
  root.add(torso);

  const body = new THREE.Mesh(playerGeometry.body, materials.body);
  body.position.set(0, 0.35, 0);
  torso.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.7, 0);
  const head = new THREE.Mesh(playerGeometry.head, materials.head);
  head.position.y = 0.23;
  headPivot.add(head);
  torso.add(headPivot);

  const leftArm = createLimb(playerGeometry.arm, materials.arm, -0.35, 0.7);
  const rightArm = createLimb(playerGeometry.arm, materials.arm, 0.35, 0.7);
  torso.add(leftArm, rightArm);

  const leftLeg = createLimb(playerGeometry.leg, materials.leg, -0.13, 0.7);
  const rightLeg = createLimb(playerGeometry.leg, materials.leg, 0.13, 0.7);
  root.add(leftLeg, rightLeg);

  const armorMeshes = {
    helmet: new THREE.Mesh(armorGeometry.helmet, getArmorMaterial(null)),
    chestplate: new THREE.Mesh(armorGeometry.chestplate, getArmorMaterial(null)),
    leftSleeve: new THREE.Mesh(armorGeometry.sleeve, getArmorMaterial(null)),
    rightSleeve: new THREE.Mesh(armorGeometry.sleeve, getArmorMaterial(null)),
    leftLegging: new THREE.Mesh(armorGeometry.legging, getArmorMaterial(null)),
    rightLegging: new THREE.Mesh(armorGeometry.legging, getArmorMaterial(null)),
    leftBoot: new THREE.Mesh(armorGeometry.boot, getArmorMaterial(null)),
    rightBoot: new THREE.Mesh(armorGeometry.boot, getArmorMaterial(null)),
  };
  armorMeshes.helmet.position.y = 0.23;
  headPivot.add(armorMeshes.helmet);
  armorMeshes.chestplate.position.y = 0.35;
  torso.add(armorMeshes.chestplate);
  armorMeshes.leftSleeve.position.y = -0.22;
  leftArm.add(armorMeshes.leftSleeve);
  armorMeshes.rightSleeve.position.y = -0.22;
  rightArm.add(armorMeshes.rightSleeve);
  armorMeshes.leftLegging.position.y = -0.22;
  leftLeg.add(armorMeshes.leftLegging);
  armorMeshes.rightLegging.position.y = -0.22;
  rightLeg.add(armorMeshes.rightLegging);
  armorMeshes.leftBoot.position.y = -0.6;
  leftLeg.add(armorMeshes.leftBoot);
  armorMeshes.rightBoot.position.y = -0.6;
  rightLeg.add(armorMeshes.rightBoot);

  const heldAnchor = new THREE.Group();
  heldAnchor.position.set(0, -0.66, -0.08);
  rightArm.add(heldAnchor);

  root.userData.parts = {
    torso, headPivot, leftArm, rightArm, leftLeg, rightLeg, armorMeshes, heldAnchor,
  };
  root.visible = false;
  return root;
}

export const playerModel = createCharacterModel();
scene.add(playerModel);

/**
 * Poses a character's limbs. Shared by the player avatar and the NPCs so they
 * walk, sneak and swing identically.
 */
export function animateCharacter(parts, { stride = 0, pitch = 0, lean = 0, swing = 0, flying = false }) {
  parts.torso.rotation.x = lean;
  parts.headPivot.rotation.x = -pitch - lean;

  if (flying) {
    parts.leftArm.rotation.set(-0.5, 0, 0.35);
    parts.rightArm.rotation.set(-0.5, 0, -0.35);
    parts.leftLeg.rotation.x = 0.3;
    parts.rightLeg.rotation.x = 0.15;
  } else {
    parts.leftArm.rotation.set(stride, 0, 0);
    parts.rightArm.rotation.set(-stride, 0, 0);
    parts.leftLeg.rotation.x = -stride;
    parts.rightLeg.rotation.x = stride;
  }
  if (swing > 0) {
    parts.rightArm.rotation.x -= Math.sin(clamp(swing, 0, 1) * PI) * 1.5;
  }
}

/* ------------------------------------------------------------------ *
 * Held item
 * ------------------------------------------------------------------ */

const heldMeshCache = new Map();
const blockItemGeometryCache = new Map();
const blockItemMaterial = new THREE.MeshLambertMaterial({ map: atlasInfo.texture });
const flatItemGeometry = new THREE.PlaneGeometry(0.34, 0.34);

/** A small cube carrying the block's own atlas tiles. */
function createBlockItemGeometry(blockType) {
  if (!blockItemGeometryCache.has(blockType)) {
    const geometry = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const uv = geometry.attributes.uv;
    const faceKeys = ["px", "nx", "py", "ny", "pz", "nz"];
    const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];
    for (let face = 0; face < 6; face++) {
      const tile = getTileIndex(blockType, faceKeys[face]);
      for (let i = 0; i < 4; i++) {
        const [u, v] = atlasUv(atlasInfo.columns, atlasInfo.rows, tile, corners[i][0], corners[i][1]);
        uv.setXY(face * 4 + i, u, v);
      }
    }
    uv.needsUpdate = true;
    blockItemGeometryCache.set(blockType, geometry);
  }
  return blockItemGeometryCache.get(blockType);
}

/** Blocks become a cube; tools and materials a flat quad. */
function getHeldMesh(itemId) {
  if (itemId == null) {
    return null;
  }
  if (!heldMeshCache.has(itemId)) {
    let mesh = null;
    if (itemId < 100 && itemId !== BLOCKS.air) {
      mesh = new THREE.Mesh(createBlockItemGeometry(itemId), blockItemMaterial);
    } else {
      const map = getIconTexture(itemId);
      if (map) {
        mesh = new THREE.Mesh(flatItemGeometry, new THREE.MeshLambertMaterial({
          map,
          transparent: true,
          alphaTest: 0.35,
          side: THREE.DoubleSide,
        }));
        mesh.rotation.set(0, PI / 2, -PI / 6);
      }
    }
    heldMeshCache.set(itemId, mesh);
  }
  return heldMeshCache.get(itemId);
}

function syncHeldItem(anchor, itemId) {
  if (anchor.userData.itemId === itemId) {
    return;
  }
  anchor.userData.itemId = itemId;
  anchor.clear();
  const mesh = getHeldMesh(itemId);
  if (mesh) {
    anchor.add(mesh);
  }
}

/* ------------------------------------------------------------------ *
 * First-person hand
 * ------------------------------------------------------------------ */

const firstPersonHand = new THREE.Group();
firstPersonHand.rotation.set(0, -0.35, 0);
// Held items read small this close to the near plane, so scale them up.
firstPersonHand.scale.setScalar(1.9);
camera.add(firstPersonHand);
// A camera's children only render if the camera itself is in the scene graph.
scene.add(camera);

/* ------------------------------------------------------------------ *
 * Per-frame update
 * ------------------------------------------------------------------ */

function syncArmor(parts) {
  const bySlot = {
    helmet: [parts.armorMeshes.helmet],
    chestplate: [parts.armorMeshes.chestplate, parts.armorMeshes.leftSleeve, parts.armorMeshes.rightSleeve],
    leggings: [parts.armorMeshes.leftLegging, parts.armorMeshes.rightLegging],
    boots: [parts.armorMeshes.leftBoot, parts.armorMeshes.rightBoot],
  };
  for (const slot of ARMOR_SLOTS) {
    const itemId = state.armor[slot];
    for (const mesh of bySlot[slot]) {
      mesh.visible = itemId != null;
      if (itemId != null) {
        mesh.material = getArmorMaterial(itemId);
      }
    }
  }
}

export function updatePlayerModel() {
  const parts = playerModel.userData.parts;
  const player = state.player;
  const heldItem = state.hotbarSlots[state.activeSlot] ?? null;

  // The first-person hand mirrors whatever the avatar is holding.
  const showHand = state.perspective === 0 && state.running && !state.isDead && state.hudVisible;
  firstPersonHand.visible = showHand;
  if (showHand) {
    syncHeldItem(firstPersonHand, heldItem);
    const swing = Math.sin(clamp(state.armSwing, 0, 1) * PI);
    firstPersonHand.position.set(0.5, -0.3 - swing * 0.16, -0.8 + swing * 0.12);
    firstPersonHand.rotation.z = -swing * 0.7;
  }

  const visible = state.perspective !== 0 && state.running && !state.isDead
    && state.cameraDistance > 1.3;
  playerModel.visible = visible;
  if (!visible) {
    return;
  }

  const speed = Math.hypot(player.vx, player.vz);
  const stride = speed > 0.2 ? Math.sin(state.stepPhase) * clamp(speed / MOVE_SPEED, 0, 1.2) * 0.7 : 0;
  const sneaking = state.sneaking && !state.flying;

  playerModel.position.set(player.x, player.y - (sneaking ? 0.12 : 0), player.z);
  // The face is on the model's +Z side, but the player's forward vector is
  // (-sin yaw, -cos yaw), i.e. -Z. Without the half turn he walks backwards.
  playerModel.rotation.y = player.yaw + PI;

  // Sneaking hunches the torso forward; flight tips it back a little.
  animateCharacter(parts, {
    stride,
    pitch: player.pitch,
    lean: sneaking ? 0.45 : state.flying ? -0.12 : 0,
    swing: state.armSwing,
    flying: state.flying,
  });

  syncArmor(parts);
  syncHeldItem(parts.heldAnchor, heldItem);
}
