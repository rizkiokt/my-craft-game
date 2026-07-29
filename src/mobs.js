// Sheep and villager models plus their spawner.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCKS, CAT_CURIOUS_DISTANCE, PET_FOLLOW_DISTANCE, PET_TELEPORT_DISTANCE, PI } from "./constants.js";
import { clamp, hash3, lerp, lerpAngle, wrapAngle } from "./math.js";
import { scene } from "./scene.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { getSurfaceData, world } from "./world.js";
export const mobMaterials = {
  sheepBody: new THREE.MeshLambertMaterial({ color: 0xf3efe6 }),
  sheepFace: new THREE.MeshLambertMaterial({ color: 0x3d2f2a }),
  sheepLeg: new THREE.MeshLambertMaterial({ color: 0x5b4f4a }),
  villagerRobe: new THREE.MeshLambertMaterial({ color: 0x866148 }),
  villagerSkin: new THREE.MeshLambertMaterial({ color: 0xdab18e }),
  villagerTrim: new THREE.MeshLambertMaterial({ color: 0x5e4537 }),
  catInner: new THREE.MeshLambertMaterial({ color: 0xf0c8b4 }),
  catEye: new THREE.MeshLambertMaterial({ color: 0x6fe08a }),
  catCollar: new THREE.MeshLambertMaterial({ color: 0xd4483f }),
};

/** Cats come in a few coats so they are easy to tell apart. */
export const CAT_COATS = [
  { name: "Ginger", color: 0xe08a42 },
  { name: "Grey", color: 0x9aa2ab },
  { name: "Black", color: 0x3a3a42 },
  { name: "White", color: 0xf2efe8 },
  { name: "Tabby", color: 0xb07a4a },
];

const catCoatMaterials = CAT_COATS.map(
  (coat) => new THREE.MeshLambertMaterial({ color: coat.color }),
);

export const mobGeometry = {
  sheepBody: new THREE.BoxGeometry(0.95, 0.7, 1.4),
  sheepHead: new THREE.BoxGeometry(0.5, 0.48, 0.48),
  sheepLeg: new THREE.BoxGeometry(0.16, 0.48, 0.16),
  villagerBody: new THREE.BoxGeometry(0.74, 1.14, 0.48),
  villagerHead: new THREE.BoxGeometry(0.46, 0.48, 0.46),
  villagerNose: new THREE.BoxGeometry(0.1, 0.14, 0.12),
  villagerArms: new THREE.BoxGeometry(0.56, 0.16, 0.16),
  catBody: new THREE.BoxGeometry(0.28, 0.26, 0.6),
  catHead: new THREE.BoxGeometry(0.28, 0.26, 0.26),
  catEar: new THREE.BoxGeometry(0.09, 0.1, 0.05),
  catEye: new THREE.BoxGeometry(0.05, 0.06, 0.02),
  catMuzzle: new THREE.BoxGeometry(0.14, 0.09, 0.06),
  catLeg: new THREE.BoxGeometry(0.08, 0.24, 0.08),
  catTail: new THREE.BoxGeometry(0.07, 0.07, 0.34),
  catCollar: new THREE.BoxGeometry(0.3, 0.07, 0.28),
  // A cat is small and ends up at your feet, so give the crosshair a bigger
  // invisible target than the model itself.
  catHitPad: new THREE.BoxGeometry(0.62, 0.72, 0.9),
};

const HIT_PAD_MATERIAL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

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

export function createCatModel(coatIndex) {
  const root = new THREE.Group();
  const coat = catCoatMaterials[coatIndex % catCoatMaterials.length];

  const body = new THREE.Mesh(mobGeometry.catBody, coat);
  body.position.set(0, 0.34, 0);
  root.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.4, 0.3);
  const head = new THREE.Mesh(mobGeometry.catHead, coat);
  headPivot.add(head);

  const muzzle = new THREE.Mesh(mobGeometry.catMuzzle, mobMaterials.catInner);
  muzzle.position.set(0, -0.04, 0.15);
  headPivot.add(muzzle);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(mobGeometry.catEar, coat);
    ear.position.set(side * 0.08, 0.17, -0.02);
    headPivot.add(ear);

    const eye = new THREE.Mesh(mobGeometry.catEye, mobMaterials.catEye);
    eye.position.set(side * 0.07, 0.03, 0.14);
    headPivot.add(eye);
  }
  root.add(headPivot);

  // Worn only once the cat is tamed, so you can see which are yours.
  const collar = new THREE.Mesh(mobGeometry.catCollar, mobMaterials.catCollar);
  collar.position.set(0, 0.36, 0.19);
  collar.visible = false;
  root.add(collar);

  const tail = new THREE.Group();
  tail.position.set(0, 0.4, -0.3);
  const tailMesh = new THREE.Mesh(mobGeometry.catTail, coat);
  tailMesh.position.z = -0.15;
  tail.add(tailMesh);
  root.add(tail);

  const legs = [
    createMobLeg(mobGeometry.catLeg, coat, -0.09, 0.12, 0.2),
    createMobLeg(mobGeometry.catLeg, coat, 0.09, 0.12, 0.2),
    createMobLeg(mobGeometry.catLeg, coat, -0.09, 0.12, -0.2),
    createMobLeg(mobGeometry.catLeg, coat, 0.09, 0.12, -0.2),
  ];
  legs.forEach((leg) => root.add(leg));

  const hitPad = new THREE.Mesh(mobGeometry.catHitPad, HIT_PAD_MATERIAL);
  hitPad.position.set(0, 0.36, 0);
  hitPad.renderOrder = -1;
  root.add(hitPad);

  root.userData.parts = { body, headPivot, legs, tail, collar, hitPad };
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
    // Tamed cats are kept out of the per-chunk map so unloading a chunk never
    // disposes of a pet that is following you.
    this.pets = [];
    this.totalEntities = 0;
    scene.add(this.root);
  }

  createEntity(definition) {
    const coatIndex = definition.coat
      ?? Math.floor(hash3(definition.x, 3, definition.z) * CAT_COATS.length);
    const model = definition.kind === "villager"
      ? createVillagerModel()
      : definition.kind === "cat"
        ? createCatModel(coatIndex)
        : createSheepModel();
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
      coatIndex,
      tamed: Boolean(definition.tamed),
      sitting: Boolean(definition.sitting),
      meowTimer: 4 + hash3(definition.x, 7, definition.z) * 12,
      speed: definition.kind === "villager" ? 0.95 : definition.kind === "cat" ? 1.7 : 1.18,
      moveTimer: 0.3 + hash3(definition.x, 9, definition.z) * 1.4,
      phase,
      stride: 0,
      headTurn: hash3(definition.x, 5, definition.z) * PI * 2,
    };
    model.position.set(entity.x, entity.y, entity.z);
    // Lets a raycast hit map back to the entity it belongs to.
    model.userData.entity = entity;
    if (entity.parts.collar) {
      entity.parts.collar.visible = entity.tamed;
    }
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

  /** A tamed cat trails the player, sits on command, and never gets lost. */
  updatePet(entity, dt) {
    const player = state.player;
    const dx = player.x - entity.x;
    const dz = player.z - entity.z;
    const distance = Math.hypot(dx, dz);

    // Too far to walk back (a cliff, a cave, or you sprinted off): catch up.
    if (!entity.sitting && distance > PET_TELEPORT_DISTANCE) {
      const surface = getSurfaceData(player.x + 0.9, player.z + 0.9);
      entity.x = player.x + 0.9;
      entity.z = player.z + 0.9;
      entity.y = surface.y;
    } else if (!entity.sitting && distance > PET_FOLLOW_DISTANCE) {
      const dirX = dx / distance;
      const dirZ = dz / distance;
      const step = entity.speed * dt * clamp(distance / 4, 0.6, 1.8);
      const nextX = entity.x + dirX * step;
      const nextZ = entity.z + dirZ * step;
      const surface = getSurfaceData(nextX, nextZ);
      if (surface.blockType !== BLOCKS.water && Math.abs(surface.y - entity.y) <= 1.6) {
        entity.x = nextX;
        entity.z = nextZ;
        entity.y = lerp(entity.y, surface.y, clamp(dt * 6, 0, 1));
        entity.stride += dt * 13;
      }
      entity.heading = lerpAngle(entity.heading, Math.atan2(dirX, dirZ), clamp(dt * 6, 0, 1));
    } else {
      // Close enough: settle down and look at the player.
      entity.heading = lerpAngle(
        entity.heading,
        Math.atan2(dx, dz),
        clamp(dt * 3, 0, 1),
      );
    }

    const moving = !entity.sitting && distance > PET_FOLLOW_DISTANCE;
    const bob = moving ? Math.sin(state.elapsed * 6 + entity.phase) * 0.02 : 0;
    // Sitting drops the cat down onto its haunches.
    entity.group.position.set(entity.x, entity.y + bob - (entity.sitting ? 0.06 : 0), entity.z);
    entity.group.rotation.y = wrapAngle(entity.heading);

    const parts = entity.parts;
    if (parts.headPivot) {
      parts.headPivot.rotation.x = entity.sitting ? -0.12 : Math.sin(state.elapsed * 1.6) * 0.05;
      parts.headPivot.rotation.y = Math.sin(state.elapsed * 0.8 + entity.headTurn) * 0.25;
    }
    if (parts.tail) {
      // A flicking tail while sitting, a steadier one while trotting.
      parts.tail.rotation.x = entity.sitting ? -0.5 : -0.9;
      parts.tail.rotation.y = Math.sin(state.elapsed * (entity.sitting ? 2.2 : 4.5) + entity.phase) * 0.45;
    }
    if (parts.legs) {
      const swing = moving ? Math.sin(entity.stride) * 0.5 : 0;
      parts.legs.forEach((leg, index) => {
        leg.rotation.x = entity.sitting
          ? (index < 2 ? 0 : -1.2)
          : swing * (index % 2 === 0 ? 1 : -1);
      });
    }

    entity.meowTimer -= dt;
    if (entity.meowTimer <= 0) {
      entity.meowTimer = 9 + Math.random() * 14;
      if (distance < 8) {
        soundEngine.meow();
      }
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
    if (entity.tamed) {
      this.updatePet(entity, dt);
      return;
    }

    // A curious cat stops and watches when you come near, which is both
    // charming and what makes it possible to actually click on one.
    if (entity.kind === "cat") {
      const toPlayerX = state.player.x - entity.x;
      const toPlayerZ = state.player.z - entity.z;
      if (Math.hypot(toPlayerX, toPlayerZ) < CAT_CURIOUS_DISTANCE) {
        entity.heading = lerpAngle(
          entity.heading,
          Math.atan2(toPlayerX, toPlayerZ),
          clamp(dt * 3.5, 0, 1),
        );
        entity.group.position.set(entity.x, entity.y, entity.z);
        entity.group.rotation.y = wrapAngle(entity.heading);
        if (entity.parts.tail) {
          entity.parts.tail.rotation.x = -0.7;
          entity.parts.tail.rotation.y = Math.sin(state.elapsed * 3 + entity.phase) * 0.5;
        }
        if (entity.parts.legs) {
          entity.parts.legs.forEach((leg) => {
            leg.rotation.x = 0;
          });
        }
        // Nudge the wander timer so it does not bolt the moment you step back.
        entity.moveTimer = Math.max(entity.moveTimer, 0.6);
        return;
      }
    }

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
    this.pets.forEach((entity) => this.updateEntity(entity, dt));
  }

  getEntityCount() {
    return this.totalEntities + this.pets.length;
  }

  /* ---------------------------------------------------------------- *
   * Cats
   * ---------------------------------------------------------------- */

  /** Nearest entity under the ray, for right-clicking a cat. */
  raycast(ray, maxDistance) {
    const hits = ray.intersectObjects(this.root.children, true);
    for (const hit of hits) {
      if (hit.distance > maxDistance) {
        break;
      }
      let node = hit.object;
      while (node && !node.userData.entity) {
        node = node.parent;
      }
      if (node?.userData.entity) {
        return { entity: node.userData.entity, distance: hit.distance };
      }
    }
    return null;
  }

  /**
   * Befriends a cat. It moves out of its chunk bucket into `pets` so it can
   * follow you anywhere without being unloaded.
   */
  tame(entity) {
    if (entity.kind !== "cat" || entity.tamed) {
      return false;
    }
    for (const [key, entities] of this.entities) {
      const index = entities.indexOf(entity);
      if (index !== -1) {
        entities.splice(index, 1);
        this.totalEntities -= 1;
        if (entities.length === 0) {
          this.entities.set(key, entities);
        }
        break;
      }
    }
    entity.tamed = true;
    entity.sitting = false;
    if (entity.parts.collar) {
      entity.parts.collar.visible = true;
    }
    this.pets.push(entity);
    return true;
  }

  toggleSit(entity) {
    entity.sitting = !entity.sitting;
    return entity.sitting;
  }

  /** Restores tamed cats saved with the world. */
  restorePets(saved) {
    for (const pet of saved ?? []) {
      const entity = this.createEntity({
        kind: "cat",
        x: pet.x,
        y: pet.y,
        z: pet.z,
        coat: pet.coat,
        tamed: true,
        sitting: pet.sitting,
      });
      this.pets.push(entity);
    }
  }

  serializePets() {
    return this.pets.map((pet) => ({
      x: Number(pet.x.toFixed(2)),
      y: Number(pet.y.toFixed(2)),
      z: Number(pet.z.toFixed(2)),
      coat: pet.coatIndex,
      sitting: pet.sitting,
    }));
  }

  getPetCount() {
    return this.pets.length;
  }

  getNearbyEntities(limit = 6) {
    const nearby = [];
    const buckets = [...this.entities.values(), this.pets];
    for (const entities of buckets) {
      entities.forEach((entity) => {
        const distance = Math.hypot(entity.x - state.player.x, entity.z - state.player.z);
        nearby.push({
          kind: entity.kind,
          tamed: entity.tamed || undefined,
          sitting: entity.sitting || undefined,
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
