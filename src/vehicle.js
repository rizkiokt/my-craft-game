// A car you can build, park, and drive.
//
// It is the only thing in the game that moves you without your feet, so the
// rules are deliberately forgiving: it climbs a whole block rather than
// stopping at a kerb, it floats instead of sinking, and it cannot hurt
// anybody. Driving off a cliff is free — the car takes the landing, you do
// not — because a car that could kill you would be the one thing in here that
// fights back.

import * as THREE from "../node_modules/three/build/three.module.js";
import { isActionDown } from "./bindings.js";
import { markDone } from "./book.js";
import {
  BLOCKS,
  CAR_ACCEL,
  CAR_BRAKE,
  CAR_COLORS,
  CAR_FLOAT,
  CAR_HEIGHT,
  CAR_MAX_SPEED,
  CAR_RADIUS,
  CAR_REVERSE_SPEED,
  CAR_SEAT_HEIGHT,
  CAR_STEER,
  CAR_STEP,
  GRAVITY,
  MAX_WORLD_Y,
  MIN_WORLD_Y,
} from "./constants.js";
import { clamp } from "./math.js";
import { npcs } from "./npcs.js";
import { spawnParticles } from "./particles.js";
import { scene } from "./scene.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { world } from "./world.js";

const box = (w, h, d, color) => new THREE.Mesh(
  new THREE.BoxGeometry(w, h, d),
  new THREE.MeshLambertMaterial({ color }),
);

/**
 * Boxes, like everything else with a body in this game. The car points down
 * -z when its yaw is 0, which is the same direction the camera looks at yaw 0,
 * so "forwards" means the same thing for both.
 */
function createCarModel(color) {
  const group = new THREE.Group();
  const dark = new THREE.Color(color).multiplyScalar(0.62).getHex();

  const chassis = box(1.7, 0.5, 2.7, color);
  chassis.position.y = 0.52;
  group.add(chassis);

  const cabin = box(1.42, 0.52, 1.25, dark);
  cabin.position.set(0, 1.0, 0.1);
  group.add(cabin);

  const windscreen = box(1.3, 0.34, 0.08, 0x9fd4ea);
  windscreen.position.set(0, 1.03, -0.52);
  group.add(windscreen);

  const bonnet = box(1.6, 0.22, 0.9, color);
  bonnet.position.set(0, 0.72, -1.0);
  group.add(bonnet);

  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const wheel = box(0.3, 0.62, 0.62, 0x1d1f24);
      wheel.position.set(side * 0.87, 0.32, end * 0.92);
      group.add(wheel);
    }
    const lamp = box(0.26, 0.2, 0.1, 0xfff2c4);
    lamp.position.set(side * 0.52, 0.66, -1.44);
    group.add(lamp);
    const tail = box(0.24, 0.18, 0.1, 0xd8402c);
    tail.position.set(side * 0.56, 0.7, 1.36);
    group.add(tail);
  }
  return group;
}

export class CarManager {
  constructor() {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.models = new Map();
  }

  /** Puts a new car on the ground and hands it back. */
  spawn(x, y, z, yaw = 0, color = null) {
    const car = {
      id: state.nextCarId++,
      x, y, z, yaw,
      speed: 0,
      vy: 0,
      onGround: false,
      color: color ?? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    };
    state.cars.push(car);
    this.attach(car);
    return car;
  }

  attach(car) {
    const model = createCarModel(car.color);
    // Lets a raycast hit find its way back to the car it belongs to.
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

  /** Which car the crosshair is on, if any. */
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
      x: car.x, y: car.y, z: car.z, yaw: car.yaw, color: car.color,
    }));
  }

  restore(list) {
    for (const car of [...state.cars]) {
      this.remove(car);
    }
    for (const entry of list ?? []) {
      this.spawn(entry.x, entry.y, entry.z, entry.yaw ?? 0, entry.color);
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
      }
    }
    if (state.drivingCar) {
      sitInSeat(state.drivingCar);
    }
    soundEngine.engine(Boolean(state.drivingCar), Math.abs(state.drivingCar?.speed ?? 0) / CAR_MAX_SPEED);
  }
}

export const cars = new CarManager();

/** True if a car-sized box at this spot would be inside the world. */
function carBlocked(x, y, z) {
  if (y < MIN_WORLD_Y || y > MAX_WORLD_Y) {
    return true;
  }
  for (const [ox, oz] of [[-CAR_RADIUS, -CAR_RADIUS], [CAR_RADIUS, -CAR_RADIUS],
    [-CAR_RADIUS, CAR_RADIUS], [CAR_RADIUS, CAR_RADIUS], [0, 0]]) {
    for (let dy = 0.1; dy < CAR_HEIGHT; dy += 0.55) {
      if (world.isSolid(Math.floor(x + ox), Math.floor(y + dy), Math.floor(z + oz))) {
        return true;
      }
    }
  }
  return false;
}

function inWater(car) {
  return world.getBlock(Math.floor(car.x), Math.floor(car.y + 0.3), Math.floor(car.z)) === BLOCKS.water;
}

/** Reads the driver's controls. Steering only bites once you are moving. */
function drive(car, dt) {
  if (isActionDown("sneak")) {
    leaveCar();
    return;
  }
  const throttle = (isActionDown("forward") ? 1 : 0) - (isActionDown("back") ? 1 : 0);
  const steer = (isActionDown("left") ? 1 : 0) - (isActionDown("right") ? 1 : 0);
  const floating = inWater(car);

  if (throttle > 0) {
    car.speed += CAR_ACCEL * dt * (floating ? 0.45 : 1);
  } else if (throttle < 0) {
    car.speed -= (car.speed > 0 ? CAR_BRAKE : CAR_ACCEL) * dt;
  } else {
    car.speed *= Math.exp(-dt * 1.4);
  }
  car.speed = clamp(car.speed, -CAR_REVERSE_SPEED, floating ? CAR_MAX_SPEED * 0.5 : CAR_MAX_SPEED);

  const bite = clamp(Math.abs(car.speed) / 2.5, 0, 1) * Math.sign(car.speed || 1);
  const turn = steer * CAR_STEER * bite * dt;
  car.yaw += turn;
  // The view swings round with the car, so you keep facing where you are
  // going without having to steer with the mouse as well.
  state.player.yaw += turn;
}

/** One frame of car movement: forwards, then down. */
function stepCar(car, dt) {
  if (Math.abs(car.speed) > 0.01) {
    const dx = -Math.sin(car.yaw) * car.speed * dt;
    const dz = -Math.cos(car.yaw) * car.speed * dt;
    if (state.drivingCar === car) {
      state.stats.driven += Math.hypot(dx, dz);
    }
    if (!slide(car, dx, dz) && Math.abs(car.speed) > 3.5) {
      spawnParticles(car.x, car.y + 0.6, car.z, BLOCKS.stone, 6, 1.6);
      soundEngine.land(6);
    }
  }

  if (inWater(car)) {
    // Floats rather than sinking, so a pond is a thing to drive across.
    car.vy = clamp(car.vy + CAR_FLOAT * dt, -1.4, 2.6) * 0.86;
  } else {
    car.vy -= GRAVITY * dt;
  }

  const ny = car.y + car.vy * dt;
  if (car.vy <= 0 && carBlocked(car.x, ny, car.z)) {
    car.y = Math.floor(ny) + 1;
    car.vy = 0;
    car.onGround = true;
  } else if (car.vy > 0 && carBlocked(car.x, ny, car.z)) {
    car.vy = 0;
  } else {
    car.y = ny;
    car.onGround = false;
  }
}

/**
 * Moves the car, climbing a kerb if there is one and sliding along a wall it
 * cannot get past. Returns false only if it is properly stuck.
 */
function slide(car, dx, dz) {
  const tryMove = (nx, nz) => {
    if (!carBlocked(nx, car.y, nz)) {
      car.x = nx;
      car.z = nz;
      return true;
    }
    // A whole block, not a step: kerbs, garden walls and the odd staircase
    // should all be driveable, or a car is useless anywhere you have built.
    if (car.onGround && !carBlocked(nx, car.y + CAR_STEP, nz)) {
      car.x = nx;
      car.z = nz;
      car.y += CAR_STEP;
      return true;
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
  player.y = car.y + CAR_SEAT_HEIGHT;
  player.z = car.z;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.onGround = true;
  // However far it just fell, the landing is the car's problem.
  state.fallStartY = null;
}

export function isDriving() {
  return state.drivingCar !== null;
}

export function enterCar(car) {
  state.drivingCar = car;
  state.flying = false;
  soundEngine.horn();
  return car;
}

/** Steps out onto whichever side of the car is clear. */
export function leaveCar() {
  const car = state.drivingCar;
  if (!car) {
    return;
  }
  state.drivingCar = null;
  car.speed = 0;
  const player = state.player;
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
    const x = car.x + Math.sin(car.yaw + angle) * 1.6;
    const z = car.z + Math.cos(car.yaw + angle) * 1.6;
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
