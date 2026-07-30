// Portals: build a frame, light it, pick where it goes, step through.
//
// Every biome sits at a fixed address, so a portal is a named destination
// rather than a link to another portal. Arriving somewhere builds a way back,
// so you can never strand yourself.

import { chunkMeshes } from "./chunkMesh.js";
import {
  BIOME_TYPES,
  BLOCKS,
  FIXED_DESTINATIONS,
  MIN_WORLD_Y,
  PORTAL_COOLDOWN,
  PORTAL_DELAY,
  PORTAL_MAX_HEIGHT,
  PORTAL_MAX_WIDTH,
  PORTAL_MIN_HEIGHT,
  PORTAL_MIN_WIDTH,
} from "./constants.js";
import { teleportTo } from "./player.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { world } from "./world.js";
import { findNearestBiome } from "./worldgen.js";

/** hud.js sits above this module, so the toast fields are written directly. */
function toast(message) {
  state.uiMessage = message;
  state.uiMessageTimer = 2.6;
}

export function portalKey(x, y, z) {
  return `${x},${y},${z}`;
}

/**
 * Everywhere you could go from a point: the fixed landmarks, plus the nearest
 * patch of each biome. Biomes are endless now, so "the desert" means whichever
 * one is closest to you rather than one particular spot on the map.
 */
export function listDestinations(fromX = state.player.x, fromZ = state.player.z) {
  const places = FIXED_DESTINATIONS.map((place) => ({ ...place }));
  for (const type of BIOME_TYPES) {
    const spot = findNearestBiome(type.id, fromX, fromZ);
    if (spot) {
      places.push({
        id: type.id,
        name: type.name,
        blurb: type.blurb,
        x: spot.x,
        z: spot.z,
        underground: type.underground ?? false,
      });
    }
  }
  return places;
}

export function getDestination(id, fromX = state.player.x, fromZ = state.player.z) {
  const places = listDestinations(fromX, fromZ);
  return places.find((place) => place.id === id) ?? places[0];
}

/** The nearest place to a point, for pointing a return portal back the way you came. */
export function nearestDestination(x, z) {
  let best = null;
  let bestDistance = Infinity;
  for (const place of listDestinations(x, z)) {
    const distance = Math.hypot(place.x - x, place.z - z);
    if (distance < bestDistance) {
      best = place;
      bestDistance = distance;
    }
  }
  return best ?? { id: "home", name: "Home Meadow", x: 0, z: 0 };
}

/* ------------------------------------------------------------------ *
 * Finding a frame
 *
 * Rather than matching a fixed shape, this floods the air pocket the
 * frame encloses and checks that everything around it is frame. Any
 * rectangle within the size limits works, in either vertical plane.
 * ------------------------------------------------------------------ */

/** In-plane neighbours the flood walks through. A portal lies in one vertical plane. */
const PLANE_OFFSETS = {
  x: [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  z: [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]],
};

/**
 * Where to start looking for the opening, from the block you touched. The
 * diagonals matter: from a corner of the frame the opening is only ever a
 * diagonal step away, and most people build the full rectangle, so leaving
 * them out means touching a corner never lights anything.
 */
const PLANE_STARTS = {
  x: [...PLANE_OFFSETS.x, [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1]],
  z: [...PLANE_OFFSETS.z, [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0]],
};

function floodOpening(axis, start) {
  const limit = PORTAL_MAX_WIDTH * PORTAL_MAX_HEIGHT;
  const seen = new Map();
  const queue = [start];

  while (queue.length > 0) {
    const cell = queue.pop();
    const key = portalKey(cell[0], cell[1], cell[2]);
    if (seen.has(key)) {
      continue;
    }
    seen.set(key, cell);
    if (seen.size > limit) {
      return { error: "open" };
    }
    for (const [dx, dy, dz] of PLANE_OFFSETS[axis]) {
      const next = [cell[0] + dx, cell[1] + dy, cell[2] + dz];
      const block = world.getBlock(next[0], next[1], next[2]);
      if (block === BLOCKS.air) {
        queue.push(next);
        continue;
      }
      // Anything else beside the gap means this is not a sealed frame.
      if (block !== BLOCKS.portal_frame) {
        return { error: "open" };
      }
    }
  }

  const cells = [...seen.values()];
  const across = cells.map((cell) => (axis === "x" ? cell[2] : cell[0]));
  const ups = cells.map((cell) => cell[1]);
  const width = Math.max(...across) - Math.min(...across) + 1;
  const height = Math.max(...ups) - Math.min(...ups) + 1;
  if (width < PORTAL_MIN_WIDTH || width > PORTAL_MAX_WIDTH
    || height < PORTAL_MIN_HEIGHT || height > PORTAL_MAX_HEIGHT) {
    return { error: "size", width, height };
  }
  // A ragged opening floods to cells a rectangle would not.
  if (cells.length !== width * height) {
    return { error: "ragged" };
  }
  return { cells };
}

/**
 * The opening a frame block belongs to, whichever way the frame faces, or why
 * it did not work. The reason is worth carrying back: "build a frame" is no
 * help at all when you believe you have built one.
 */
export function findPortalOpening(fx, fy, fz) {
  let problem = { error: "open" };
  for (const axis of ["x", "z"]) {
    for (const [dx, dy, dz] of PLANE_STARTS[axis]) {
      const start = [fx + dx, fy + dy, fz + dz];
      if (world.getBlock(start[0], start[1], start[2]) !== BLOCKS.air) {
        continue;
      }
      const result = floodOpening(axis, start);
      if (result.cells) {
        return { axis, cells: result.cells };
      }
      // A sealed gap of the wrong size says far more than a leaky one.
      if (result.error === "size" || result.error === "ragged") {
        problem = result;
      }
    }
  }
  return problem;
}

/** What to tell someone whose frame did not light. */
export function describeFrameProblem(problem) {
  if (problem?.error === "size") {
    return `The gap is ${problem.width} wide and ${problem.height} tall — it needs to be `
      + `${PORTAL_MIN_WIDTH}-${PORTAL_MAX_WIDTH} wide and ${PORTAL_MIN_HEIGHT}-${PORTAL_MAX_HEIGHT} tall`;
  }
  if (problem?.error === "ragged") {
    return "The gap needs to be a plain rectangle";
  }
  return "The frame is not closed — every side of the gap needs a frame block";
}

/* ------------------------------------------------------------------ *
 * Lighting and travelling
 * ------------------------------------------------------------------ */

/** Somewhere worth going that is not right where you are standing. */
function defaultDestination(x, z) {
  const here = nearestDestination(x, z);
  const places = listDestinations(x, z);
  const away = places.find((place) => place.id !== here.id);
  return (here.id === "home" ? away : places.find((place) => place.id === "home")) ?? away;
}

/**
 * Fills a finished frame with portal, and remembers where it goes. Every cell
 * is recorded, so stepping into any part of it is a lookup rather than a
 * search.
 */
export function lightPortal(fx, fy, fz) {
  const opening = findPortalOpening(fx, fy, fz);
  if (!opening.cells) {
    return opening;
  }
  const destinationId = defaultDestination(fx, fz).id;
  for (const [x, y, z] of opening.cells) {
    world.setBlock(x, y, z, BLOCKS.portal);
    chunkMeshes.markDirtyAtWorld(x, z);
    state.portals[portalKey(x, y, z)] = destinationId;
  }
  state.saveDirty = true;
  return { cells: opening.cells, destinationId };
}

/** Repoints every cell of one portal, after the picker chooses. */
export function setPortalDestination(cells, destinationId) {
  for (const [x, y, z] of cells) {
    state.portals[portalKey(x, y, z)] = destinationId;
  }
  state.saveDirty = true;
}

/** Forgets a portal cell, so breaking one out does not leave a ghost. */
export function clearPortalAt(x, y, z) {
  delete state.portals[portalKey(x, y, z)];
}

/**
 * Puts a portal out when its frame is broken: without this the loose cells
 * would still work and still glow.
 */
export function extinguishAround(x, y, z) {
  for (const axis of ["x", "z"]) {
    for (const [dx, dy, dz] of PLANE_OFFSETS[axis]) {
      const cell = [x + dx, y + dy, z + dz];
      if (world.getBlock(cell[0], cell[1], cell[2]) !== BLOCKS.portal) {
        continue;
      }
      const opening = floodPortalCells(axis, cell);
      for (const [px, py, pz] of opening) {
        world.setBlock(px, py, pz, BLOCKS.air);
        chunkMeshes.markDirtyAtWorld(px, pz);
        clearPortalAt(px, py, pz);
      }
    }
  }
}

/** Every lit cell connected to one, within the size a portal can be. */
function floodPortalCells(axis, start) {
  const limit = PORTAL_MAX_WIDTH * PORTAL_MAX_HEIGHT;
  const seen = new Map();
  const queue = [start];
  while (queue.length > 0 && seen.size <= limit) {
    const cell = queue.pop();
    const key = portalKey(cell[0], cell[1], cell[2]);
    if (seen.has(key) || world.getBlock(cell[0], cell[1], cell[2]) !== BLOCKS.portal) {
      continue;
    }
    seen.set(key, cell);
    for (const [dx, dy, dz] of PLANE_OFFSETS[axis]) {
      queue.push([cell[0] + dx, cell[1] + dy, cell[2] + dz]);
    }
  }
  return [...seen.values()];
}

/** The highest pocket you could stand in, for destinations under a roof. */
function findSheltered(x, z) {
  const top = world.getHeightAt(x, z);
  for (let y = top; y > MIN_WORLD_Y + 1; y--) {
    if (world.getBlock(x, y, z) === BLOCKS.air
      && world.getBlock(x, y + 1, z) === BLOCKS.air
      && world.isSolid(x, y - 1, z)) {
      return y;
    }
  }
  return null;
}

/** Where a destination puts you down, searching outwards for a clear spot. */
export function findArrivalSpot(destination) {
  for (let radius = 0; radius <= 12; radius += 3) {
    for (const [dx, dz] of [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]]) {
      const x = Math.floor(destination.x) + dx;
      const z = Math.floor(destination.z) + dz;
      if (destination.underground) {
        const y = findSheltered(x, z);
        if (y != null) {
          return { x: x + 0.5, y, z: z + 0.5 };
        }
        continue;
      }
      const surface = world.getHeightAt(x, z);
      if (surface > 0) {
        return { x: x + 0.5, y: surface + 1, z: z + 0.5 };
      }
    }
  }
  return { x: destination.x, y: world.getHeightAt(Math.floor(destination.x), Math.floor(destination.z)) + 1, z: destination.z };
}

/** True when a portal already stands near a point. */
function portalNear(x, y, z, radius = 6) {
  for (const key of Object.keys(state.portals)) {
    const [px, py, pz] = key.split(",").map(Number);
    if (Math.abs(px - x) <= radius && Math.abs(py - y) <= radius && Math.abs(pz - z) <= radius) {
      return true;
    }
  }
  return false;
}

/**
 * Builds a plain 2x3 portal beside an arrival point, pointing back the way
 * you came. Nobody should ever arrive somewhere with no way home.
 */
export function buildReturnPortal(spot, destinationId) {
  const baseX = Math.floor(spot.x) + 2;
  const baseY = Math.floor(spot.y);
  const baseZ = Math.floor(spot.z);
  if (portalNear(baseX, baseY, baseZ)) {
    return null;
  }

  // Clear the pocket first: half a portal buried in a hillside is no use.
  for (let dz = -1; dz <= 2; dz++) {
    for (let dy = -1; dy <= 4; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        world.setBlock(baseX + dx, baseY + dy, baseZ + dz, BLOCKS.air);
      }
    }
  }

  const cells = [];
  for (let dz = 0; dz <= 3; dz++) {
    for (let dy = -1; dy <= 4; dy++) {
      const edgeZ = dz === 0 || dz === 3;
      const edgeY = dy === -1 || dy === 4;
      if (edgeZ && edgeY) {
        continue;
      }
      if (edgeZ || edgeY) {
        world.setBlock(baseX, baseY + dy, baseZ + dz, BLOCKS.portal_frame);
      } else {
        world.setBlock(baseX, baseY + dy, baseZ + dz, BLOCKS.portal);
        cells.push([baseX, baseY + dy, baseZ + dz]);
      }
    }
  }
  // Something to stand on, so it is not floating over a drop.
  for (let dz = -1; dz <= 4; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!world.isSolid(baseX + dx, baseY - 2, baseZ + dz)) {
        world.setBlock(baseX + dx, baseY - 2, baseZ + dz, BLOCKS.stone);
      }
    }
  }

  setPortalDestination(cells, destinationId);
  chunkMeshes.markDirtyAtWorld(baseX, baseZ);
  return cells;
}

/** The destination of whichever portal the player is standing in, if any. */
function portalUnderPlayer() {
  const x = Math.floor(state.player.x);
  const z = Math.floor(state.player.z);
  for (const dy of [0, 1]) {
    const id = state.portals[portalKey(x, Math.floor(state.player.y) + dy, z)];
    if (id) {
      return id;
    }
  }
  return null;
}

export function travelTo(destinationId) {
  // Resolved from where you are standing, so "the desert" is the near one.
  const destination = getDestination(destinationId);
  const from = nearestDestination(state.player.x, state.player.z);
  const spot = findArrivalSpot(destination);

  teleportTo(spot.x, spot.z, spot.y);
  buildReturnPortal(spot, from.id === destination.id ? "home" : from.id);
  // Arriving somewhere new should not show a hole where the world will be.
  chunkMeshes.syncLoadedChunks({ budgetMs: Infinity });

  state.portalCooldown = PORTAL_COOLDOWN;
  state.portalTimer = 0;
  soundEngine.portal(true);
  toast(`Arrived at ${destination.name}`);
  state.saveDirty = true;
}

/** Runs from the loop: stand in a portal for a moment and it takes you. */
export function updatePortalTravel(dt) {
  if (state.portalCooldown > 0) {
    state.portalCooldown = Math.max(0, state.portalCooldown - dt);
  }
  const destinationId = portalUnderPlayer();
  if (!destinationId) {
    state.portalTimer = 0;
    return;
  }
  if (state.portalCooldown > 0) {
    return;
  }
  state.portalTimer += dt;
  if (state.portalTimer >= PORTAL_DELAY) {
    travelTo(destinationId);
  }
}
