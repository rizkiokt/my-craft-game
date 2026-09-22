// Sheep, villagers, cats and the wandering creatures, plus their spawner.

import * as THREE from "../node_modules/three/build/three.module.js";
import {
  BLOCKS,
  CAT_CURIOUS_DISTANCE,
  CREATURE_FOLLOW_GAP,
  CREATURE_FOLLOW_GIVEUP,
  CREATURE_KINDS,
  CREATURE_MET_DISTANCE,
  CREATURE_NOTICE_DISTANCE,
  PET_FOLLOW_DISTANCE,
  PET_TELEPORT_DISTANCE,
  PI,
} from "./constants.js";
import { createCreatureModel } from "./creatures.js";
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
    const spec = CREATURE_KINDS[definition.kind] ?? null;
    const coatIndex = definition.coat
      ?? Math.floor(hash3(definition.x, 3, definition.z) * CAT_COATS.length);
    const model = spec
      ? createCreatureModel(definition.kind)
      : definition.kind === "villager"
        ? createVillagerModel()
        : definition.kind === "cat"
          ? createCatModel(coatIndex)
          : createSheepModel();
    const phase = hash3(definition.x, definition.y, definition.z) * PI * 2;
    const entity = {
      kind: definition.kind,
      /** Null for sheep, villagers and cats; the table row for the rest. */
      spec,
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
      speed: spec
        ? spec.speed
        : definition.kind === "villager" ? 0.95 : definition.kind === "cat" ? 1.7 : 1.18,
      /** How far it will wander from where it started. */
      roam: spec ? spec.roam : definition.kind === "villager" ? 5.4 : 4.2,
      /** A tall creature can climb more of a bank than a cat can. */
      stepUp: spec ? 1.4 + spec.height * 0.25 : 1.6,
      strideRate: spec ? 11 / Math.sqrt(spec.height) : definition.kind === "villager" ? 9 : 11,
      moveTimer: 0.3 + hash3(definition.x, 9, definition.z) * 1.4,
      phase,
      stride: 0,
      headTurn: hash3(definition.x, 5, definition.z) * PI * 2,
      /** Set while one has decided to tag along. See considerFollowing(). */
      following: false,
      followTimer: 0,
      /** Counts down to the next look up to see whether you are worth joining. */
      noticeTimer: 1 + hash3(definition.x, 13, definition.z) * 5,
      /** Seconds of getting nowhere while following; it gives up eventually. */
      stallTimer: 0,
      voiceTimer: 3 + hash3(definition.x, 17, definition.z) * 10,
      /** Where the Void Wyrm is round its circle, and what it circles. */
      orbit: phase,
      centerX: definition.x,
      centerZ: definition.z,
      bank: 0,
    };
    if (spec) {
      // Roll and heading have to compose in that order or a banked turn
      // screws the whole animal round its own long axis.
      model.rotation.order = "YXZ";
    }
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
    // Sheep, villagers and cats share one set of geometries, but a creature is
    // built to its own proportions and so owns its boxes. Chunks unload all
    // day, so those have to go back or the card fills up with dead dragons.
    if (entity.spec) {
      entity.group.traverse((node) => node.geometry?.dispose());
    }
  }

  /**
   * One step across the ground, shared by everything that walks. Returns false
   * without moving when the way is water, foliage or too steep a bank, which
   * is the caller's cue to pick somewhere else to go.
   */
  walkOnGround(entity, dirX, dirZ, amount, dt) {
    const nextX = entity.x + dirX * amount;
    const nextZ = entity.z + dirZ * amount;
    const surface = getSurfaceData(nextX, nextZ);
    if (
      surface.blockType === BLOCKS.water ||
      surface.blockType === BLOCKS.leaves ||
      Math.abs(surface.y - entity.y) > entity.stepUp
    ) {
      return false;
    }
    entity.x = nextX;
    entity.z = nextZ;
    entity.y = lerp(entity.y, surface.y, clamp(dt * 5.5, 0, 1));
    entity.heading = lerpAngle(entity.heading, Math.atan2(dirX, dirZ), clamp(dt * 4.5, 0, 1));
    entity.stride += dt * entity.strideRate;
    return true;
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
    const radius = entity.roam;
    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = Math.random() * PI * 2;
      const distance = 0.8 + Math.random() * radius;
      const candidateX = entity.homeX + Math.cos(angle) * distance;
      const candidateZ = entity.homeZ + Math.sin(angle) * distance;
      const surface = getSurfaceData(candidateX, candidateZ);
      if (
        surface.blockType !== BLOCKS.water &&
        surface.blockType !== BLOCKS.leaves &&
        Math.abs(surface.y - entity.y) <= entity.stepUp
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

    if (entity.spec) {
      this.updateCreature(entity, dt);
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
      // Blocked: give up on this target and pick another next frame.
      if (!this.walkOnGround(entity, dx / distance, dz / distance, walkAmount, dt)) {
        entity.moveTimer = 0;
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

  /* ---------------------------------------------------------------- *
   * The wandering creatures
   * ---------------------------------------------------------------- */

  /**
   * Whether this one comes along with you for a bit.
   *
   * Every few seconds it looks up, and if you are close enough it rolls
   * against its kind's `curiosity`. Rolling on a timer rather than every frame
   * is what keeps it from being a foregone conclusion: standing next to a
   * Shambler for ten seconds is usually enough, walking past it is not.
   */
  considerFollowing(entity, dt, distance) {
    if (entity.following) {
      entity.followTimer -= dt;
      if (entity.followTimer <= 0 || distance > CREATURE_FOLLOW_GIVEUP) {
        entity.following = false;
        entity.stallTimer = 0;
        // It wanders on from wherever it ended up, not from where it started,
        // or it would walk all the way home the moment it lost interest.
        entity.homeX = entity.x;
        entity.homeZ = entity.z;
        entity.moveTimer = 0;
        entity.noticeTimer = 10 + Math.random() * 16;
      }
      return;
    }
    entity.noticeTimer -= dt;
    if (entity.noticeTimer > 0) {
      return;
    }
    entity.noticeTimer = 3 + Math.random() * 4;
    if (distance > CREATURE_NOTICE_DISTANCE || Math.random() > entity.spec.curiosity) {
      return;
    }
    this.startFollowing(entity);
  }

  /** Asked ones stay much longer than ones that came along by themselves. */
  startFollowing(entity, asked = false) {
    entity.following = true;
    entity.stallTimer = 0;
    entity.followTimer = asked ? 120 : 15 + Math.random() * 25;
    // A predicate in the book reads this; nothing here can call into it.
    state.stats.followed = true;
    soundEngine.creatureVoice(entity.spec.voice);
    return entity.followTimer;
  }

  stopFollowing(entity) {
    entity.following = false;
    entity.followTimer = 0;
    entity.homeX = entity.x;
    entity.homeZ = entity.z;
    entity.noticeTimer = 12 + Math.random() * 12;
  }

  updateCreature(entity, dt) {
    const distance = Math.hypot(state.player.x - entity.x, state.player.z - entity.z);
    // Close enough to have got a proper look at it. The book reads this.
    if (distance < CREATURE_MET_DISTANCE) {
      state.stats.met[entity.kind] = true;
    }
    this.considerFollowing(entity, dt, distance);

    entity.voiceTimer -= dt;
    if (entity.voiceTimer <= 0) {
      entity.voiceTimer = 8 + Math.random() * 16;
      if (distance < 18) {
        soundEngine.creatureVoice(entity.spec.voice);
      }
    }

    if (entity.spec.fly) {
      this.updateFlier(entity, dt, distance);
      return;
    }

    const player = state.player;
    let moving = false;
    // Its own size decides how close is close enough; the big ones would be
    // standing on top of you at the distance that suits a Bonekin.
    const gap = CREATURE_FOLLOW_GAP + entity.spec.height * 0.4;

    if (entity.following) {
      if (distance > gap) {
        const dirX = (player.x - entity.x) / distance;
        const dirZ = (player.z - entity.z) / distance;
        const step = entity.speed * dt * clamp(distance / 6, 0.75, 1.8);
        moving = this.walkOnGround(entity, dirX, dirZ, step, dt);
        // Wedged against something it cannot climb: let it off rather than
        // leaving it treading against a wall for the rest of the follow.
        entity.stallTimer = moving ? 0 : entity.stallTimer + dt;
        if (entity.stallTimer > 6) {
          this.stopFollowing(entity);
        }
      } else {
        entity.stallTimer = 0;
        entity.heading = lerpAngle(
          entity.heading,
          Math.atan2(player.x - entity.x, player.z - entity.z),
          clamp(dt * 4, 0, 1),
        );
      }
    } else {
      entity.moveTimer -= dt;
      const toTarget = Math.hypot(entity.targetX - entity.x, entity.targetZ - entity.z);
      if (toTarget <= 0.2 || entity.moveTimer <= 0) {
        this.pickTarget(entity);
      }
      const dx = entity.targetX - entity.x;
      const dz = entity.targetZ - entity.z;
      const remaining = Math.hypot(dx, dz);
      if (remaining > 0.001) {
        const amount = Math.min(remaining, entity.speed * dt);
        moving = this.walkOnGround(entity, dx / remaining, dz / remaining, amount, dt);
        if (!moving) {
          entity.moveTimer = 0;
        }
      }
    }

    this.animateCreature(entity, dt, moving, distance);
  }

  /**
   * The Void Wyrm. It does not walk anywhere: it holds a circle in the air,
   * around home normally and around you once it has taken an interest, which
   * is both far easier than pathfinding and what a dragon ought to look like.
   */
  updateFlier(entity, dt, distance) {
    const spec = entity.spec;
    const player = state.player;
    const wantCenterX = entity.following ? player.x : entity.homeX;
    const wantCenterZ = entity.following ? player.z : entity.homeZ;
    // Easing the centre rather than setting it is what stops the whole circle
    // jumping sideways the moment it decides to come and look at you.
    const drift = clamp(dt * 0.9, 0, 1);
    entity.centerX = lerp(entity.centerX, wantCenterX, drift);
    entity.centerZ = lerp(entity.centerZ, wantCenterZ, drift);

    const radius = entity.following ? 7 : spec.roam;
    entity.orbit += (spec.speed / radius) * dt;
    entity.x = entity.centerX + Math.cos(entity.orbit) * radius;
    entity.z = entity.centerZ + Math.sin(entity.orbit) * radius;

    // Height is measured from whatever is under it, so it clears a hill rather
    // than flying into one, and drops to have a look when it is following.
    const ground = getSurfaceData(entity.x, entity.z).y;
    const ride = entity.following ? spec.fly.dive : spec.fly.cruise;
    const wantY = ground + ride + Math.sin(state.elapsed * 0.5 + entity.phase) * 1.3;
    entity.y = lerp(entity.y, wantY, clamp(dt * 1.1, 0, 1));

    // The tangent to the circle, which is where it is actually going.
    entity.heading = Math.atan2(-Math.sin(entity.orbit), Math.cos(entity.orbit));
    entity.bank = lerp(entity.bank, 0.42, clamp(dt * 1.5, 0, 1));

    if (distance < CREATURE_MET_DISTANCE * 3) {
      state.stats.met[entity.kind] = true;
    }

    entity.group.position.set(entity.x, entity.y, entity.z);
    entity.group.rotation.set(0, wrapAngle(entity.heading), entity.bank);

    const parts = entity.parts;
    const flap = Math.sin(state.elapsed * 2.6 + entity.phase);
    parts.wingPivots?.forEach((wing, index) => {
      wing.rotation.z = (index === 0 ? -1 : 1) * (0.25 + flap * 0.55);
    });
    parts.tailPivots?.forEach((segment, index) => {
      segment.rotation.y = Math.sin(state.elapsed * 1.6 + index * 0.8 + entity.phase) * 0.18;
      segment.rotation.x = Math.sin(state.elapsed * 1.1 + index * 0.6) * 0.06;
    });
    if (parts.headPivot) {
      // Looking down at whatever it is circling.
      parts.headPivot.rotation.x = entity.following ? -0.28 : -0.1;
      parts.headPivot.rotation.y = Math.sin(state.elapsed * 0.7 + entity.headTurn) * 0.2;
    }
    this.pulseGlow(entity, 3.2);
  }

  /** Legs, arms, head and whatever glows, for everything that walks. */
  animateCreature(entity, dt, moving, distance) {
    const parts = entity.parts;
    const spec = entity.spec;
    const bob = Math.sin(state.elapsed * 3.1 + entity.phase) * 0.03 * spec.height;
    entity.group.position.set(entity.x, entity.y + bob, entity.z);
    entity.group.rotation.set(0, wrapAngle(entity.heading), 0);

    const swing = moving ? Math.sin(entity.stride) * 0.55 : 0;
    const quad = parts.legPivots.length === 4;
    parts.legPivots.forEach((leg, index) => {
      // Diagonal pairs on four legs, plain alternation on two.
      const direction = quad
        ? (index === 0 || index === 3 ? 1 : -1)
        : (index % 2 === 0 ? 1 : -1);
      leg.rotation.x = swing * direction;
    });
    parts.armPivots.forEach((arm, index) => {
      // Arms lead with the opposite leg, and sway a little when standing.
      const direction = index % 2 === 0 ? -1 : 1;
      arm.rotation.x = parts.restArm
        + swing * 0.45 * direction
        + Math.sin(state.elapsed * 1.1 + entity.phase) * 0.05;
    });

    if (parts.headPivot) {
      const watching = entity.following || distance < CREATURE_NOTICE_DISTANCE * 0.5;
      const toPlayer = wrapAngle(
        Math.atan2(state.player.x - entity.x, state.player.z - entity.z) - entity.heading,
      );
      // It only turns its head your way while it can plausibly see you, and
      // never further than a neck goes, so it is a glance rather than a stare.
      const wantY = watching ? clamp(toPlayer, -1.1, 1.1) : Math.sin(state.elapsed * 0.8 + entity.headTurn) * 0.25;
      parts.headPivot.rotation.y = lerp(parts.headPivot.rotation.y, wantY, clamp(dt * 4, 0, 1));
      parts.headPivot.rotation.x = Math.sin(state.elapsed * 1.4 + entity.phase) * 0.04;
    }
    this.pulseGlow(entity, 2.1);
  }

  /**
   * Eyes and embers breathe rather than sit at one brightness. The materials
   * are shared across every creature of a kind, so this scales the meshes
   * instead of touching the colour, which would pulse all of them at once.
   */
  pulseGlow(entity, rate) {
    const bits = entity.parts.glowBits;
    if (!bits?.length) {
      return;
    }
    const pulse = 1 + Math.sin(state.elapsed * rate + entity.phase) * 0.18;
    bits.forEach((bit) => bit.scale.set(pulse, pulse, 1));
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
