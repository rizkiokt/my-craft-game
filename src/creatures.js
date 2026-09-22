// The wandering creatures: seven models built from boxes.
//
// This module draws them and nothing else — `PassiveMobManager` in `mobs.js`
// owns where they go and what they do, exactly as `playerModel.js` draws a
// character and `npcs.js` walks it about.
//
// **Every model is built one unit tall and scaled by the kind's `height`.**
// That is what lets a 1.8-block Bonekin and a 6.2-block Mega Fizzler come out
// of the same factory with one number between them, and it is why the numbers
// below are all fractions rather than blocks.
//
// Glowing parts are `MeshBasicMaterial`, not Lambert: something that glows in
// the dark of the Ember Deep must not be lit by the world's sun, or it goes
// out exactly where it is supposed to be at its brightest.

import * as THREE from "../node_modules/three/build/three.module.js";
import { CREATURE_KINDS } from "./constants.js";

/** One material set per kind, built on first use and then shared. */
const paletteCache = new Map();

function palette(kindId) {
  const cached = paletteCache.get(kindId);
  if (cached) {
    return cached;
  }
  const spec = CREATURE_KINDS[kindId];
  const made = {
    skin: new THREE.MeshLambertMaterial({ color: spec.skin }),
    cloth: new THREE.MeshLambertMaterial({ color: spec.cloth }),
    dark: new THREE.MeshLambertMaterial({ color: spec.dark }),
    glow: spec.glow
      ? new THREE.MeshBasicMaterial({ color: spec.glow })
      : new THREE.MeshLambertMaterial({ color: spec.dark }),
  };
  paletteCache.set(kindId, made);
  return made;
}

/**
 * A limb that swings from its top end. The mesh hangs half its length below
 * the pivot, so rotating the pivot bends it at the shoulder or the hip rather
 * than about its own middle.
 */
function limb(width, length, depth, material, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, depth), material);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  return pivot;
}

function box(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/* ------------------------------------------------------------------ *
 * The uprights: Bonekin, Charbone, Shambler, Gloomstrider
 * ------------------------------------------------------------------ */

function createBipedModel(kindId) {
  const spec = CREATURE_KINDS[kindId];
  const mat = palette(kindId);
  const root = new THREE.Group();
  const glowBits = [];

  const body = box(0.36, 0.33, 0.19, mat.cloth, 0, 0.565, 0);
  root.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.73, 0);
  headPivot.add(box(0.26, 0.26, 0.26, mat.skin, 0, 0.13, 0));
  // Sunken eyes, set into the front of the face.
  for (const side of [-1, 1]) {
    const eye = box(0.06, 0.05, 0.03, spec.glow ? mat.glow : mat.dark, side * 0.065, 0.15, 0.13);
    headPivot.add(eye);
    if (spec.glow) {
      glowBits.push(eye);
    }
  }
  root.add(headPivot);

  // The Gloomstrider's ribcage, and the embers still burning in a Charbone.
  if (spec.ribs || spec.emberSeams) {
    const rows = spec.ribs ? 3 : 2;
    for (let i = 0; i < rows; i++) {
      const seam = box(0.3, 0.025, 0.2, mat.glow, 0, 0.48 + i * 0.075, 0.005);
      root.add(seam);
      glowBits.push(seam);
    }
  }

  const armLength = spec.armLength ?? 0.34;
  const armPivots = [-1, 1].map((side) =>
    limb(0.12, armLength, 0.12, mat.skin, side * 0.24, 0.7, 0));
  armPivots.forEach((arm) => {
    // Held straight out in front, which is the whole silhouette for these two.
    arm.rotation.x = spec.armsForward ? -1.45 : 0;
    root.add(arm);
  });

  const legPivots = [-1, 1].map((side) =>
    limb(0.13, 0.4, 0.13, mat.cloth, side * 0.1, 0.4, 0));
  legPivots.forEach((leg) => root.add(leg));

  root.userData.parts = {
    body,
    headPivot,
    armPivots,
    legPivots,
    glowBits,
    restArm: spec.armsForward ? -1.45 : 0,
  };
  return root;
}

/* ------------------------------------------------------------------ *
 * The Fizzlers
 * ------------------------------------------------------------------ */

function createFizzlerModel(kindId) {
  const spec = CREATURE_KINDS[kindId];
  const mat = palette(kindId);
  const root = new THREE.Group();
  const glowBits = [];

  // A Fizzler that can go off needs to flash white while its fuse burns, and
  // the palette is shared by every Fizzler in the world — tinting that would
  // light all of them at once. So the ones that blow up own their two body
  // colours. The face stays on the shared dark material, which is what keeps
  // it readable against the white.
  const owned = spec.blast ? [mat.skin.clone(), mat.cloth.clone()] : null;
  const skin = owned ? owned[0] : mat.skin;
  const cloth = owned ? owned[1] : mat.cloth;

  const body = box(0.3, 0.52, 0.22, skin, 0, 0.46, 0);
  root.add(body);
  // A band of the darker green, so it is not one flat colour end to end.
  root.add(box(0.31, 0.1, 0.23, cloth, 0, 0.3, 0));

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.72, 0);
  headPivot.add(box(0.34, 0.3, 0.3, skin, 0, 0.15, 0));
  // The face: two eyes and the long mouth under them.
  for (const side of [-1, 1]) {
    headPivot.add(box(0.08, 0.08, 0.02, mat.dark, side * 0.085, 0.2, 0.15));
  }
  headPivot.add(box(0.1, 0.12, 0.02, mat.dark, 0, 0.1, 0.15));
  headPivot.add(box(0.24, 0.05, 0.02, mat.dark, 0, 0.13, 0.15));
  if (spec.glow) {
    // The big one is lit from inside, so you can see it coming.
    const spark = box(0.2, 0.04, 0.02, mat.glow, 0, 0.06, 0.15);
    headPivot.add(spark);
    glowBits.push(spark);
  }
  root.add(headPivot);

  // Four stubby feet, front pair and back pair, so it waddles.
  const legPivots = [];
  for (const side of [-1, 1]) {
    for (const end of [1, -1]) {
      const leg = limb(0.16, 0.2, 0.16, cloth, side * 0.075, 0.2, end * 0.12);
      legPivots.push(leg);
      root.add(leg);
    }
  }

  root.userData.parts = {
    body,
    headPivot,
    legPivots,
    armPivots: [],
    glowBits,
    restArm: 0,
    /** Tinted white and back while the fuse burns; disposed with the model. */
    ownedMaterials: owned,
    flashBase: owned ? [spec.skin, spec.cloth] : null,
  };
  return root;
}

/* ------------------------------------------------------------------ *
 * The Void Wyrm
 * ------------------------------------------------------------------ */

function createWyrmModel(kindId) {
  const mat = palette(kindId);
  const root = new THREE.Group();
  const glowBits = [];

  const body = box(0.5, 0.42, 1.1, mat.skin, 0, 0.5, 0);
  root.add(body);
  // A lit strip down the flanks, so there is something to see of it against a
  // night sky — the first version was a black shape on a black background.
  for (const side of [-1, 1]) {
    const flank = box(0.03, 0.06, 0.8, mat.glow, side * 0.26, 0.5, 0);
    root.add(flank);
    glowBits.push(flank);
  }

  // Neck and head, on their own pivot so it can look down at you without the
  // whole animal having to bank round.
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.58, 0.5);
  headPivot.add(box(0.28, 0.26, 0.55, mat.skin, 0, 0, 0.26));
  headPivot.add(box(0.42, 0.38, 0.5, mat.cloth, 0, 0.03, 0.75));
  // The jaw, set under and forward, which is what makes it a head and not a box.
  headPivot.add(box(0.3, 0.14, 0.34, mat.dark, 0, -0.14, 0.88));
  for (const side of [-1, 1]) {
    const eye = box(0.1, 0.11, 0.05, mat.glow, side * 0.14, 0.11, 0.98);
    headPivot.add(eye);
    glowBits.push(eye);
    // Horns swept back off the skull.
    headPivot.add(box(0.06, 0.06, 0.3, mat.dark, side * 0.15, 0.24, 0.62));
  }
  root.add(headPivot);

  // The tail nests: each segment is a child of the one in front, so each only
  // ever holds the angle between itself and its parent — the same trick the
  // lorry trailers use, and the reason a whip needs no maths to animate.
  const tailPivots = [];
  let parent = root;
  let anchorZ = -0.5;
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(0, i === 0 ? 0.5 : 0, anchorZ);
    const width = 0.38 - i * 0.08;
    pivot.add(box(width, width, 0.36, mat.skin, 0, 0, -0.18));
    const plate = box(0.05, 0.14, 0.3, mat.glow, 0, width * 0.6, -0.18);
    pivot.add(plate);
    glowBits.push(plate);
    parent.add(pivot);
    tailPivots.push(pivot);
    parent = pivot;
    anchorZ = -0.34;
  }

  // Wings: a thin membrane hinged at the shoulder, with a leading-edge bone
  // and a lit trailing edge. They are built already raised, because a wyrm
  // standing with its wings flat out looks like something that has been run
  // over — the flap in updateFlier() swings about this rest angle.
  const wingPivots = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.22, 0.68, 0.05);
    pivot.add(box(1.15, 0.04, 0.85, mat.cloth, side * 0.6, 0, -0.1));
    pivot.add(box(1.2, 0.09, 0.12, mat.dark, side * 0.62, 0.03, 0.32));
    const tip = box(0.1, 0.06, 0.7, mat.glow, side * 1.14, 0.01, -0.08);
    pivot.add(tip);
    glowBits.push(tip);
    pivot.rotation.z = side * 0.3;
    root.add(pivot);
    return pivot;
  });

  root.userData.parts = {
    body,
    headPivot,
    tailPivots,
    wingPivots,
    legPivots: [],
    armPivots: [],
    glowBits,
    restArm: 0,
  };
  return root;
}

const BUILDERS = {
  biped: createBipedModel,
  fizzler: createFizzlerModel,
  wyrm: createWyrmModel,
};

/** Builds one creature, already scaled to the size its kind asks for. */
export function createCreatureModel(kindId) {
  const spec = CREATURE_KINDS[kindId];
  const root = BUILDERS[spec.build](kindId);
  root.scale.set(spec.height * spec.bulk, spec.height, spec.height * spec.bulk);
  return root;
}
