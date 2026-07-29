// Blocky avatar shown in the third-person views.

import * as THREE from "../node_modules/three/build/three.module.js";
import { MOVE_SPEED } from "./constants.js";
import { clamp } from "./math.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
/* ------------------------------------------------------------------ *
 * Player avatar (only visible in the F5 third-person views)
 * ------------------------------------------------------------------ */

export const playerMaterials = {
  skin: new THREE.MeshLambertMaterial({ color: 0xd8a077 }),
  shirt: new THREE.MeshLambertMaterial({ color: 0x3f8f8a }),
  pants: new THREE.MeshLambertMaterial({ color: 0x3c4a78 }),
  hair: new THREE.MeshLambertMaterial({ color: 0x3a2a1d }),
};

export const playerGeometry = {
  head: new THREE.BoxGeometry(0.46, 0.46, 0.46),
  hair: new THREE.BoxGeometry(0.48, 0.14, 0.48),
  body: new THREE.BoxGeometry(0.5, 0.7, 0.26),
  arm: new THREE.BoxGeometry(0.2, 0.7, 0.2),
  leg: new THREE.BoxGeometry(0.22, 0.7, 0.22),
};

export function createLimb(geometry, material, pivotX, pivotY) {
  const pivot = new THREE.Group();
  pivot.position.set(pivotX, pivotY, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.35;
  pivot.add(mesh);
  return pivot;
}

export function createPlayerModel() {
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

export const playerModel = createPlayerModel();
scene.add(playerModel);

export function updatePlayerModel() {
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
