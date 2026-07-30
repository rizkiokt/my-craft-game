// Things you can build, park, and drive.
//
// Two of them: a car and a monster truck. They are one set of physics driven
// by a `VEHICLE_KINDS` entry, the same way the eight charges are one blast
// driven by a `BLAST_KINDS` entry — a third would be a table row rather than
// another file.
//
// The rules are deliberately forgiving. They climb rather than stop, they
// float instead of sinking, and they cannot hurt anybody. Driving off a cliff
// is free — the vehicle takes the landing, you do not — because something you
// drive that could kill you would be the one thing in here that fights back.

import * as THREE from "../node_modules/three/build/three.module.js";
import { isActionDown } from "./bindings.js";
import { markDone } from "./book.js";
import {
  BLOCKS,
  CAR_COLORS,
  CAR_FLOAT,
  GRAVITY,
  MAX_WORLD_Y,
  MIN_WORLD_Y,
  VEHICLE_BY_ID,
  VEHICLE_KINDS,
} from "./constants.js";
import { clamp } from "./math.js";
import { npcs } from "./npcs.js";
import { spawnParticles } from "./particles.js";
import { scene } from "./scene.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { world } from "./world.js";

const DEFAULT_KIND = VEHICLE_KINDS[Object.keys(VEHICLE_KINDS)[0]];

/** Shortest gap between two bounces. Long enough not to double-fire. */
const JUMP_COOLDOWN = 0.28;

/** How far a trailer may swing out before it stops folding. */
const MAX_JACKKNIFE = 1.2;

function specFor(car) {
  return VEHICLE_BY_ID[car.kind] ?? DEFAULT_KIND;
}

const box = (w, h, d, color) => new THREE.Mesh(
  new THREE.BoxGeometry(w, h, d),
  new THREE.MeshLambertMaterial({ color }),
);

/**
 * Boxes, like everything else with a body in this game, with every dimension
 * worked out from the kind's wheel size and ride height — so the truck is the
 * same drawing sitting much higher on much bigger tyres.
 *
 * A vehicle points down -z at yaw 0, which is where the camera looks at yaw 0,
 * so "forwards" means the same thing for both.
 */
function createVehicleModel(spec, color) {
  if (spec.trailers) {
    return createRigModel(spec, color);
  }
  if (spec.heli) {
    return createHeliModel(spec, color);
  }
  if (spec.plane) {
    return createPlaneModel(spec, color);
  }
  const group = new THREE.Group();
  const dark = new THREE.Color(color).multiplyScalar(0.62).getHex();
  const width = spec.radius * 2.18;
  const length = spec.radius * 3.45;
  const axle = spec.wheel * 0.5;
  const floor = axle + spec.lift;

  const chassis = box(width, 0.5, length, color);
  chassis.position.y = floor + 0.25;
  group.add(chassis);

  const cabin = box(width * 0.84, 0.52, length * 0.46, dark);
  cabin.position.set(0, floor + 0.75, length * 0.04);
  group.add(cabin);

  const windscreen = box(width * 0.76, 0.34, 0.08, 0x9fd4ea);
  windscreen.position.set(0, floor + 0.78, -length * 0.19);
  group.add(windscreen);

  const bonnet = box(width * 0.94, 0.22, length * 0.33, color);
  bonnet.position.set(0, floor + 0.47, -length * 0.37);
  group.add(bonnet);

  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const wheel = box(spec.wheel * 0.48, spec.wheel, spec.wheel, 0x1d1f24);
      wheel.position.set(side * (width * 0.5 + 0.03), axle, end * length * 0.34);
      group.add(wheel);
      // A pale hub, or a big tyre reads as a black slab rather than a wheel.
      const hub = box(spec.wheel * 0.54, spec.wheel * 0.34, spec.wheel * 0.34, 0xb9c0cb);
      hub.position.copy(wheel.position);
      group.add(hub);
    }
    const lamp = box(0.26, 0.2, 0.1, 0xfff2c4);
    lamp.position.set(side * width * 0.3, floor + 0.42, -length * 0.53);
    group.add(lamp);
    const tail = box(0.24, 0.18, 0.1, 0xd8402c);
    tail.position.set(side * width * 0.33, floor + 0.45, length * 0.5);
    group.add(tail);
  }

  // The roll bar and spotlights are most of what makes a truck read as one.
  if (spec.rollBar) {
    for (const side of [-1, 1]) {
      const post = box(0.14, 0.8, 0.14, 0xd2d7de);
      post.position.set(side * width * 0.36, floor + 1.1, length * 0.22);
      group.add(post);
      const spot = box(0.2, 0.2, 0.14, 0xfff2c4);
      spot.position.set(side * width * 0.2, floor + 1.48, length * 0.14);
      group.add(spot);
    }
    const bar = box(width * 0.8, 0.14, 0.14, 0xd2d7de);
    bar.position.set(0, floor + 1.48, length * 0.22);
    group.add(bar);
  }

  // The flying car is the ordinary car with stub wings and four fans, so it
  // still reads as the thing you built it from.
  if (spec.wings) {
    for (const side of [-1, 1]) {
      const stub = box(1.1, 0.12, 0.8, 0xe6eaef);
      stub.position.set(side * (width * 0.5 + 0.5), floor + 0.4, length * 0.05);
      group.add(stub);
      for (const end of [-1, 1]) {
        const fan = box(0.62, 0.18, 0.62, 0x2b2f36);
        fan.position.set(side * (width * 0.5 + 0.62), floor + 0.34, end * length * 0.3);
        group.add(fan);
        const glow = box(0.44, 0.1, 0.44, 0x7fe3ff);
        glow.position.set(fan.position.x, floor + 0.24, fan.position.z);
        group.add(glow);
      }
    }
    const tailFin = box(0.12, 0.6, 0.5, 0xe6eaef);
    tailFin.position.set(0, floor + 1.1, length * 0.48);
    group.add(tailFin);
    group.rotation.order = "YXZ";
  }
  return group;
}

/** Four wheels on one axle line, at the given distance back from the middle. */
function addAxle(group, spec, width, z) {
  const axle = spec.wheel * 0.5;
  for (const side of [-1, 1]) {
    const wheel = box(spec.wheel * 0.48, spec.wheel, spec.wheel, 0x1d1f24);
    wheel.position.set(side * (width * 0.5 + 0.03), axle, z);
    group.add(wheel);
    const hub = box(spec.wheel * 0.54, spec.wheel * 0.34, spec.wheel * 0.34, 0xb9c0cb);
    hub.position.copy(wheel.position);
    group.add(hub);
  }
}

/** Where a cab's axles sit, front first. */
const CAB_AXLES = {
  2: [-2.9, -1.6],
  3: [-2.9, -1.85, -0.95],
};

/** One trailer's body and wheels, hung inside its own pivot. */
function buildTrailer(pivot, spec, segment, color, dark, width, floor) {
  const deck = box(width * 0.94, 0.3, segment.length, dark);
  deck.position.set(0, floor + 0.15, segment.length * 0.5);
  pivot.add(deck);

  const container = box(width * 1.02, segment.height, segment.length - 0.2, color);
  container.position.set(0, floor + 0.3 + segment.height * 0.5, segment.length * 0.5);
  pivot.add(container);

  // A pale band along the side, or a big box reads as a wall rather than a
  // trailer at any distance.
  const band = box(width * 1.04, 0.22, segment.length - 0.6, 0xe6eaef);
  band.position.set(0, floor + 0.3 + segment.height * 0.72, segment.length * 0.5);
  pivot.add(band);

  // Axles bunched at the back, the way a trailer's bogie actually sits.
  for (let i = 0; i < (segment.axles ?? 2); i++) {
    addAxle(pivot, spec, width, segment.length - 0.8 - i);
  }

  for (const side of [-1, 1]) {
    const tail = box(0.24, 0.2, 0.1, 0xd8402c);
    tail.position.set(side * width * 0.3, floor + 0.5, segment.length + 0.02);
    pivot.add(tail);
  }
}

/**
 * A cab up front and one or more containers behind it, on the truck's tyres.
 *
 * Each trailer hangs off a pivot at its hitch, and **the pivots nest** — the
 * second trailer's pivot is a child of the first's. That is what makes a chain
 * of them work with no maths at all in the renderer: each pivot only ever
 * needs the angle between itself and the thing directly in front of it, and
 * three.js composes the rest.
 */
function createRigModel(spec, color) {
  const group = new THREE.Group();
  const dark = new THREE.Color(color).multiplyScalar(0.6).getHex();
  const width = spec.radius * 2.1;
  const axle = spec.wheel * 0.5;
  const floor = axle + spec.lift;

  // Cab. Forward is -z, so the nose is the most negative end.
  const chassis = box(width, 0.4, 2, color);
  chassis.position.set(0, floor + 0.2, -2.2);
  group.add(chassis);

  const cab = box(width * 0.92, 1.25, 1.5, color);
  cab.position.set(0, floor + 1.02, -2.5);
  group.add(cab);

  const windscreen = box(width * 0.82, 0.55, 0.08, 0x9fd4ea);
  windscreen.position.set(0, floor + 1.22, -3.22);
  group.add(windscreen);

  for (const side of [-1, 1]) {
    const stack = box(0.16, 1.05, 0.16, 0xc8ced8);
    stack.position.set(side * width * 0.44, floor + 1.55, -1.75);
    group.add(stack);
    const lamp = box(0.26, 0.22, 0.1, 0xfff2c4);
    lamp.position.set(side * width * 0.28, floor + 0.45, -3.24);
    group.add(lamp);
  }

  for (const z of CAB_AXLES[spec.cabAxles] ?? CAB_AXLES[2]) {
    addAxle(group, spec, width, z);
  }

  let parent = group;
  const pivots = [];
  for (const segment of spec.trailers) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, segment.hitch);
    parent.add(pivot);
    pivots.push(pivot);
    buildTrailer(pivot, spec, segment, color, dark, width, floor);
    parent = pivot;
  }
  group.userData.trailerPivots = pivots;
  return group;
}

/**
 * The helicopter: a cabin, a boom, and two rotors that actually turn.
 *
 * Anything in `userData.spin` is rotated every frame about the axis named in
 * its own `userData.axis`, which is how one loop drives a main rotor turning
 * flat and a tail rotor turning on its side.
 */
function createHeliModel(spec, color) {
  const group = new THREE.Group();
  const dark = new THREE.Color(color).multiplyScalar(0.6).getHex();
  const floor = spec.lift + 0.35;

  const cabin = box(1.5, 1.3, 2.2, color);
  cabin.position.set(0, floor + 0.75, -0.3);
  group.add(cabin);

  const nose = box(1.2, 0.9, 0.7, 0x9fd4ea);
  nose.position.set(0, floor + 0.8, -1.6);
  group.add(nose);

  const boom = box(0.42, 0.42, 2.8, dark);
  boom.position.set(0, floor + 1.05, 2.05);
  group.add(boom);

  const fin = box(0.16, 0.95, 0.5, color);
  fin.position.set(0, floor + 1.6, 3.25);
  group.add(fin);

  // Skids, not wheels — the giveaway that it is not a car.
  for (const side of [-1, 1]) {
    const skid = box(0.16, 0.16, 2.6, 0xc8ced8);
    skid.position.set(side * 0.72, spec.lift * 0.2, -0.2);
    group.add(skid);
    for (const z of [-1.1, 0.7]) {
      const strut = box(0.13, floor, 0.13, 0xc8ced8);
      strut.position.set(side * 0.72, floor * 0.5, z);
      group.add(strut);
    }
  }

  const mast = box(0.22, 0.5, 0.22, 0xc8ced8);
  mast.position.set(0, floor + 1.55, -0.3);
  group.add(mast);

  const rotor = new THREE.Group();
  rotor.position.set(0, floor + 1.85, -0.3);
  for (let i = 0; i < 2; i++) {
    const blade = box(7.4, 0.09, 0.34, 0x2b2f36);
    blade.rotation.y = i * Math.PI / 2;
    rotor.add(blade);
  }
  rotor.userData.axis = "y";
  group.add(rotor);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.3, floor + 1.6, 3.3);
  for (let i = 0; i < 2; i++) {
    const blade = box(0.08, 1.5, 0.22, 0x2b2f36);
    blade.rotation.x = i * Math.PI / 2;
    tailRotor.add(blade);
  }
  tailRotor.userData.axis = "x";
  group.add(tailRotor);

  group.userData.spin = [rotor, tailRotor];
  group.rotation.order = "YXZ";
  return group;
}

/** The aeroplane: fuselage, wings, tail and a propeller on the nose. */
function createPlaneModel(spec, color) {
  const group = new THREE.Group();
  const dark = new THREE.Color(color).multiplyScalar(0.6).getHex();
  const floor = spec.lift + 0.5;

  const fuselage = box(0.95, 0.95, 4.6, color);
  fuselage.position.set(0, floor + 0.5, 0.2);
  group.add(fuselage);

  const canopy = box(0.8, 0.5, 1.2, 0x9fd4ea);
  canopy.position.set(0, floor + 1.15, -0.5);
  group.add(canopy);

  const wing = box(6.8, 0.16, 1.3, color);
  wing.position.set(0, floor + 0.45, 0.1);
  group.add(wing);

  const stripe = box(6.9, 0.06, 0.34, 0xe6eaef);
  stripe.position.set(0, floor + 0.55, 0.1);
  group.add(stripe);

  const tailplane = box(2.6, 0.14, 0.8, color);
  tailplane.position.set(0, floor + 0.62, 2.2);
  group.add(tailplane);

  const fin = box(0.14, 1.15, 0.9, dark);
  fin.position.set(0, floor + 1.1, 2.3);
  group.add(fin);

  const propeller = new THREE.Group();
  propeller.position.set(0, floor + 0.5, -2.2);
  for (let i = 0; i < 2; i++) {
    const blade = box(0.16, 3, 0.08, 0x2b2f36);
    blade.rotation.z = i * Math.PI / 2;
    propeller.add(blade);
  }
  propeller.userData.axis = "z";
  group.add(propeller);
  const spinner = box(0.3, 0.3, 0.3, 0xe6eaef);
  spinner.position.set(0, floor + 0.5, -2.3);
  group.add(spinner);

  for (const [x, z] of [[-1.1, -0.4], [1.1, -0.4], [0, 2.2]]) {
    const wheel = box(0.18, spec.wheel, spec.wheel, 0x1d1f24);
    wheel.position.set(x, spec.wheel * 0.5, z);
    group.add(wheel);
    const strut = box(0.1, floor, 0.1, 0xc8ced8);
    strut.position.set(x, floor * 0.6, z);
    group.add(strut);
  }

  group.userData.spin = [propeller];
  group.rotation.order = "YXZ";
  return group;
}

export class CarManager {
  constructor() {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.models = new Map();
  }

  /** Puts a new vehicle on the ground and hands it back. */
  spawn(x, y, z, yaw = 0, kind = "car", color = null) {
    const car = {
      id: state.nextCarId++,
      kind: VEHICLE_BY_ID[kind] ? kind : "car",
      x, y, z, yaw,
      speed: 0,
      vy: 0,
      onGround: false,
      jumpTimer: 0,
      trailerYaws: (VEHICLE_BY_ID[kind]?.trailers ?? []).map(() => yaw),
      bank: 0,
      tilt: 0,
      rotorSpin: 0,
      color: color ?? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    };
    state.cars.push(car);
    this.attach(car);
    return car;
  }

  attach(car) {
    const model = createVehicleModel(specFor(car), car.color);
    // Lets a raycast hit find its way back to the vehicle it belongs to.
    model.userData.car = car;
    model.position.set(car.x, car.y, car.z);
    model.rotation.y = car.yaw;
    this.root.add(model);
    this.models.set(car.id, model);
  }

  remove(car) {
    const model = this.models.get(car.id);
    if (model) {
      this.root.remove(model);
      this.models.delete(car.id);
    }
    const index = state.cars.indexOf(car);
    if (index !== -1) {
      state.cars.splice(index, 1);
    }
    if (state.drivingCar === car) {
      state.drivingCar = null;
    }
  }

  /** Which vehicle the crosshair is on, if any. */
  raycast(raycaster, maxDistance) {
    const hits = raycaster.intersectObjects(this.root.children, true);
    for (const hit of hits) {
      if (hit.distance > maxDistance) {
        break;
      }
      let node = hit.object;
      while (node && !node.userData.car) {
        node = node.parent;
      }
      if (node?.userData.car) {
        return { car: node.userData.car, distance: hit.distance };
      }
    }
    return null;
  }

  serialize() {
    return state.cars.map((car) => ({
      x: car.x, y: car.y, z: car.z, yaw: car.yaw, kind: car.kind, color: car.color,
    }));
  }

  restore(list) {
    for (const car of [...state.cars]) {
      this.remove(car);
    }
    for (const entry of list ?? []) {
      // Saves from before there was more than one kind carry no `kind` field.
      this.spawn(entry.x, entry.y, entry.z, entry.yaw ?? 0, entry.kind ?? "car", entry.color);
    }
  }

  update(dt) {
    for (const car of state.cars) {
      if (state.drivingCar === car) {
        drive(car, dt);
      } else {
        car.speed *= Math.exp(-dt * 2.4);
      }
      stepCar(car, dt);
      const model = this.models.get(car.id);
      if (model) {
        model.position.set(car.x, car.y, car.z);
        model.rotation.y = car.yaw;
        if (model.userData.spin) {
          // Rotors and propellers: fast while somebody is flying it, idling
          // down to a stop once it is parked.
          const wanted = state.drivingCar === car || !car.onGround ? 28 : 0;
          car.rotorSpin += (wanted - car.rotorSpin) * Math.min(1, dt * 2);
          for (const part of model.userData.spin) {
            part.rotation[part.userData.axis] += car.rotorSpin * dt;
          }
        }
        if (specFor(car).fly) {
          model.rotation.z = car.bank;
          model.rotation.x = car.tilt;
        }
        const pivots = model.userData.trailerPivots;
        if (pivots) {
          // Each pivot only needs the angle to the thing in front of it,
          // because they nest.
          for (let i = 0; i < pivots.length; i++) {
            pivots[i].rotation.y = car.trailerYaws[i] - (i === 0 ? car.yaw : car.trailerYaws[i - 1]);
          }
        }
      }
    }
    if (state.drivingCar) {
      sitInSeat(state.drivingCar);
    }
    const driven = state.drivingCar;
    soundEngine.engine(
      Boolean(driven),
      driven ? Math.abs(driven.speed) / specFor(driven).maxSpeed : 0,
    );
  }
}

export const cars = new CarManager();

/**
 * The cells a vehicle covers, in world offsets, for a given heading.
 *
 * A square footprint was fine while everything was roughly as long as it was
 * wide. The rig is six blocks long, so it has to be sampled along its own
 * forward axis and turned with it — otherwise it would drive through a wall
 * side-on and jam on nothing at all when straight.
 *
 * The trailer's swing is not modelled here. It is close enough while the rig
 * is going forwards, which is when a collision matters.
 */
function footprint(spec, yaw) {
  const r = spec.radius;
  const half = spec.long ?? r;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const steps = Math.max(1, Math.round(half / 0.8));
  const points = [];
  for (let i = -steps; i <= steps; i++) {
    const along = (i / steps) * half;
    for (const across of [-r, 0, r]) {
      points.push([across * cos + along * sin, -across * sin + along * cos]);
    }
  }
  return points;
}

/** True if a vehicle-shaped box at this spot would be inside the world. */
function carBlocked(car, spec, x, y, z) {
  if (y < MIN_WORLD_Y || y > MAX_WORLD_Y) {
    return true;
  }
  for (const [ox, oz] of footprint(spec, car.yaw)) {
    for (let dy = 0.1; dy < spec.height; dy += 0.55) {
      if (world.isSolid(Math.floor(x + ox), Math.floor(y + dy), Math.floor(z + oz))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Whether there is ground directly under the wheels.
 *
 * This is a separate test from `carBlocked`, which samples the *body* from
 * just above the floor upwards and so can never see what is underneath. Using
 * it for the downward move let a vehicle sink half a block before it caught,
 * then snap back — which read as a wobble and, worse, meant `onGround` was
 * false on most frames.
 */
function groundBelow(car, spec, x, y, z) {
  for (const [ox, oz] of footprint(spec, car.yaw)) {
    if (world.isSolid(Math.floor(x + ox), Math.floor(y - 0.05), Math.floor(z + oz))) {
      return true;
    }
  }
  return false;
}

function inWater(car) {
  return world.getBlock(Math.floor(car.x), Math.floor(car.y + 0.3), Math.floor(car.z)) === BLOCKS.water;
}

/** Reads the driver's controls. Steering only bites once you are moving. */
function drive(car, dt) {
  const spec = specFor(car);
  if (isActionDown("sneak")) {
    // In the air, sneak brings you down; on the ground it lets you out. One
    // key for both, and the meaning is never ambiguous — you cannot step out
    // at two hundred feet, and there is nothing to descend to on the ground.
    if (spec.fly && !car.onGround) {
      car.vy = Math.max(car.vy - spec.fly.dive * 4 * dt, -spec.fly.dive);
    } else {
      leaveCar();
      return;
    }
  }
  const throttle = (isActionDown("forward") ? 1 : 0) - (isActionDown("back") ? 1 : 0);
  const steer = (isActionDown("left") ? 1 : 0) - (isActionDown("right") ? 1 : 0);
  const floating = inWater(car);

  if (throttle > 0) {
    car.speed += spec.accel * dt * (floating ? 0.45 : 1);
  } else if (throttle < 0) {
    car.speed -= (car.speed > 0 ? spec.brake : spec.accel) * dt;
  } else {
    car.speed *= Math.exp(-dt * 1.4);
  }
  car.speed = clamp(car.speed, -spec.reverse, floating ? spec.maxSpeed * 0.5 : spec.maxSpeed);

  const bite = clamp(Math.abs(car.speed) / 2.5, 0, 1) * Math.sign(car.speed || 1);
  const turn = steer * spec.steer * bite * dt;
  car.yaw += turn;
  // The view swings round with the vehicle, so you keep facing where you are
  // going without having to steer with the mouse as well.
  state.player.yaw += turn;

  if (spec.fly) {
    climb(car, spec, dt);
    // Lean into the turn and point the nose where you are going. Both are
    // eased rather than set, or the model snaps about.
    const target = -turn / Math.max(dt, 1e-4) * spec.fly.bank * 0.25;
    car.bank += (clamp(target, -spec.fly.bank, spec.fly.bank) - car.bank) * Math.min(1, dt * 4);
    car.tilt += (clamp(-car.vy * 0.035, -0.35, 0.35) - car.tilt) * Math.min(1, dt * 3);
    return;
  }

  // Hold the jump key and it bounces every time the wheels touch down, which
  // is the whole point of a monster truck. Gated on a short cooldown rather
  // than on the key edge: an edge meant that pressing jump a moment before
  // landing did nothing at all, and then you had to let go and press again.
  car.jumpTimer = Math.max(0, car.jumpTimer - dt);
  if (spec.jump && isActionDown("jump") && car.onGround && car.jumpTimer <= 0) {
    car.vy = spec.jump;
    car.onGround = false;
    car.jumpTimer = JUMP_COOLDOWN;
    soundEngine.jump();
    spawnParticles(car.x, car.y + 0.2, car.z, BLOCKS.dirt, 8, 1.4);
    markDone("truckjump");
  }
}

/**
 * Going up. The helicopter and the flying car just do it; the aeroplane has to
 * be moving first, which is the only thing that makes it a different machine
 * rather than a differently shaped helicopter.
 */
function climb(car, spec, dt) {
  if (!isActionDown("jump")) {
    return;
  }
  if (spec.fly.mode === "plane" && Math.abs(car.speed) < spec.fly.minSpeed) {
    return;
  }
  car.vy = Math.min(car.vy + spec.fly.climb * 4 * dt, spec.fly.climb);
  car.onGround = false;
  if (car.y - world.getHeightAt(Math.floor(car.x), Math.floor(car.z)) > 12) {
    markDone("fly");
  }
}

/**
 * Drags the trailers along behind the cab.
 *
 * How a towed axle actually behaves: it turns at v/L times the sine of the
 * angle it is being dragged at. Easing it towards the cab instead looked
 * wrong — it caught up within a few frames and the lorry may as well have been
 * one rigid brick. This way the bend grows with the steering, settles at an
 * angle rather than closing, and swings wider the slower you go, which is the
 * whole character of a lorry.
 *
 * Run down the chain, each segment towed by the one in front. **The speed is
 * scaled by the cosine of each joint on the way back**, which is what makes a
 * second trailer cut the corner harder than the first rather than simply
 * copying it — the further back you go, the less of the cab's motion is
 * pushing you forwards.
 */
function followTheCab(car, spec, dt) {
  let leadYaw = car.yaw;
  let speed = car.speed;
  for (let i = 0; i < spec.trailers.length; i++) {
    const segment = spec.trailers[i];
    const swing = angleDelta(leadYaw, car.trailerYaws[i]);
    car.trailerYaws[i] += (speed / segment.length) * Math.sin(swing) * dt;
    // And never let one fold back into the thing towing it.
    car.trailerYaws[i] = leadYaw
      - clamp(angleDelta(leadYaw, car.trailerYaws[i]), -MAX_JACKKNIFE, MAX_JACKKNIFE);
    speed *= Math.cos(angleDelta(leadYaw, car.trailerYaws[i]));
    leadYaw = car.trailerYaws[i];
  }
}

/** Shortest way round from one heading to another. */
function angleDelta(to, from) {
  return ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

/** One frame of movement: forwards, then down. */
function stepCar(car, dt) {
  const spec = specFor(car);
  if (spec.trailers) {
    followTheCab(car, spec, dt);
  }
  if (Math.abs(car.speed) > 0.01) {
    const dx = -Math.sin(car.yaw) * car.speed * dt;
    const dz = -Math.cos(car.yaw) * car.speed * dt;
    if (state.drivingCar === car) {
      state.stats.driven += Math.hypot(dx, dz);
    }
    if (!slide(car, spec, dx, dz) && Math.abs(car.speed) > 3.5) {
      spawnParticles(car.x, car.y + 0.6, car.z, BLOCKS.stone, 6, 1.6);
      soundEngine.land(6);
    }
  }

  if (inWater(car)) {
    // Floats rather than sinking, so a pond is a thing to drive across.
    car.vy = clamp(car.vy + CAR_FLOAT * dt, -1.4, 2.6) * 0.86;
  } else if (spec.fly && state.drivingCar === car && !car.onGround) {
    // Only while somebody is flying it. An empty helicopter is a heavy object
    // and falls like one, which is also what stops one parked in mid-air from
    // hanging there for ever.
    if (spec.fly.mode === "hover") {
      // It holds the height you left it at. Coming down is a thing you ask
      // for, which is far easier for a child than trimming a hover. The decay
      // is quick enough that letting go of climb stops you within a couple of
      // blocks rather than coasting halfway up again.
      car.vy *= Math.exp(-dt * 5.5);
    } else {
      // Wings: full weight at a standstill, none of it at flying speed.
      const lift = clamp(Math.abs(car.speed) / spec.fly.minSpeed, 0, 1);
      car.vy -= GRAVITY * (1 - lift) * dt;
      if (lift >= 1) {
        car.vy *= Math.exp(-dt * 1.1);
      }
    }
  } else {
    car.vy -= GRAVITY * dt;
  }

  const ny = car.y + car.vy * dt;
  if (car.vy <= 0 && groundBelow(car, spec, car.x, ny, car.z)) {
    const landing = car.vy;
    car.y = Math.floor(ny - 0.05) + 1;
    car.onGround = true;
    // Big tyres bounce. Only off a real drop, and each bounce is a fifth of
    // the one before, so it settles instead of pogoing forever.
    car.vy = spec.jump && landing < -11 ? -landing * 0.2 : 0;
    if (landing < -11) {
      spawnParticles(car.x, car.y + 0.1, car.z, BLOCKS.dirt, 8, 1.2);
      soundEngine.land(-landing);
    }
  } else if (car.vy > 0 && carBlocked(car, spec, car.x, ny, car.z)) {
    car.vy = 0;
  } else {
    car.y = ny;
    car.onGround = false;
  }
}

/**
 * Moves the vehicle, climbing a ledge if there is one and sliding along a wall
 * it cannot get past. Returns false only if it is properly stuck.
 */
function slide(car, spec, dx, dz) {
  const tryMove = (nx, nz) => {
    if (!carBlocked(car, spec, nx, car.y, nz)) {
      car.x = nx;
      car.z = nz;
      return true;
    }
    // Whole blocks, not steps: kerbs, garden walls and the odd staircase have
    // to be driveable or a vehicle is useless anywhere you have built. The
    // truck's bigger wheels take twice as much.
    for (let rise = 1; rise <= spec.step; rise++) {
      if (car.onGround && !carBlocked(car, spec, nx, car.y + rise, nz)) {
        car.x = nx;
        car.z = nz;
        car.y += rise;
        return true;
      }
    }
    return false;
  };

  if (tryMove(car.x + dx, car.z + dz)) {
    return true;
  }
  if (tryMove(car.x + dx, car.z) || tryMove(car.x, car.z + dz)) {
    return true;
  }
  car.speed *= -0.12;
  return false;
}

/** Keeps the driver in the driving seat, weightless and unhurt. */
function sitInSeat(car) {
  const player = state.player;
  player.x = car.x;
  player.y = car.y + specFor(car).seat;
  player.z = car.z;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.onGround = true;
  // However far it just fell, the landing is the vehicle's problem.
  state.fallStartY = null;
}

export function isDriving() {
  return state.drivingCar !== null;
}

export function vehicleName(car) {
  return specFor(car).name;
}

export function enterCar(car) {
  state.drivingCar = car;
  state.flying = false;
  // A beat before the first bounce, so getting in with jump already held does
  // not launch you the instant you sit down.
  car.jumpTimer = JUMP_COOLDOWN;
  soundEngine.horn();
  return car;
}

/** Steps out onto whichever side is clear. */
export function leaveCar() {
  const car = state.drivingCar;
  if (!car) {
    return;
  }
  state.drivingCar = null;
  car.speed = 0;
  const player = state.player;
  const reach = specFor(car).radius + 0.8;
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
    const x = car.x + Math.sin(car.yaw + angle) * reach;
    const z = car.z + Math.cos(car.yaw + angle) * reach;
    if (!world.isSolid(Math.floor(x), Math.floor(car.y + 0.5), Math.floor(z))) {
      player.x = x;
      player.z = z;
      player.y = car.y + 0.6;
      break;
    }
  }
  player.vy = 0;
  state.fallStartY = null;
}

/** A honk, and every friend within earshot looks up. */
export function honk() {
  const car = state.drivingCar;
  if (!car) {
    return;
  }
  soundEngine.horn();
  npcs.startle(car.x, car.z);
  markDone("honk");
}

export function updateVehicles(dt) {
  cars.update(dt);
}
