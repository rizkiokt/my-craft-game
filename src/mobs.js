// Sheep and villager models plus their spawner.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCKS, PI } from "./constants.js";
import { clamp, hash3, lerp, lerpAngle, wrapAngle } from "./math.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
import { getSurfaceData, world } from "./world.js";
export const mobMaterials = {
  sheepBody: new THREE.MeshLambertMaterial({ color: 0xf3efe6 }),
  sheepFace: new THREE.MeshLambertMaterial({ color: 0x3d2f2a }),
  sheepLeg: new THREE.MeshLambertMaterial({ color: 0x5b4f4a }),
  villagerRobe: new THREE.MeshLambertMaterial({ color: 0x866148 }),
  villagerSkin: new THREE.MeshLambertMaterial({ color: 0xdab18e }),
  villagerTrim: new THREE.MeshLambertMaterial({ color: 0x5e4537 }),
};

export const mobGeometry = {
  sheepBody: new THREE.BoxGeometry(0.95, 0.7, 1.4),
  sheepHead: new THREE.BoxGeometry(0.5, 0.48, 0.48),
  sheepLeg: new THREE.BoxGeometry(0.16, 0.48, 0.16),
  villagerBody: new THREE.BoxGeometry(0.74, 1.14, 0.48),
  villagerHead: new THREE.BoxGeometry(0.46, 0.48, 0.46),
  villagerNose: new THREE.BoxGeometry(0.1, 0.14, 0.12),
  villagerArms: new THREE.BoxGeometry(0.56, 0.16, 0.16),
};

export function createMobLeg(geometry, material, x, y, z) {
  const leg = new THREE.Mesh(geometry, material);
  leg.position.set(x, y, z);
  return leg;
}

export function createSheepModel() {
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

export function createVillagerModel() {
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

export class PassiveMobManager {
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

export const passiveMobs = new PassiveMobManager(world, scene);
