// Friendly characters who live in the world so it never feels empty.
//
// They look like players, wander around doing their own thing, and will tag
// along if you ask. Nothing here fights: the only interaction is saying hello.

import * as THREE from "../node_modules/three/build/three.module.js";
import { chunkMeshes } from "./chunkMesh.js";
import { BLOCKS, DEFAULT_SPAWN, NPC_FOLLOW_DISTANCE, NPC_TELEPORT_DISTANCE, PI } from "./constants.js";
import { clamp, hash3, lerp, lerpAngle, wrapAngle } from "./math.js";
import { animateCharacter, createCharacterModel } from "./playerModel.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
import { getSurfaceData, world } from "./world.js";

/** Names are short so they read well on a floating tag. */
export const NPC_NAMES = ["Alex", "Sam", "Robin", "Kai", "Mia"];

/* ------------------------------------------------------------------ *
 * Looks
 *
 * Colours are rolled per character when a world is first created and then
 * saved, so your friends look different in every world but stay themselves.
 * ------------------------------------------------------------------ */

const SKIN_TONES = ["#f7e2cc", "#f2ddc4", "#e0b48c", "#c68a5e", "#a06a42", "#8d5a3b", "#5e3a26"];
const HAIR_TONES = ["#241a14", "#3a2a1d", "#5a3b2a", "#7a3f2a", "#c86a2a", "#e8d67a", "#1f1b18", "#8b8b93"];
const SHOE_TONES = ["#4a3a2a", "#3a3a42", "#2f2a26"];

/** Shirt and trouser colours share a hue table so nothing clashes badly. */
const CLOTH_HUES = [
  [8, 78], [24, 82], [45, 80], [95, 55], [140, 52], [170, 55],
  [200, 62], [225, 58], [265, 50], [310, 55], [340, 62],
];

function hsl(hue, saturation, lightness) {
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function pick(list, random) {
  return list[Math.floor(random() * list.length) % list.length];
}

export function randomPalette(random = Math.random) {
  const [shirtHue, shirtSat] = pick(CLOTH_HUES, random);
  const [pantsHue, pantsSat] = pick(CLOTH_HUES, random);
  return {
    skin: pick(SKIN_TONES, random),
    hair: pick(HAIR_TONES, random),
    shirt: hsl(shirtHue, shirtSat, 46),
    shirtDark: hsl(shirtHue, shirtSat, 36),
    pants: hsl(pantsHue, Math.round(pantsSat * 0.6), 32),
    shoe: pick(SHOE_TONES, random),
  };
}

const IDLE_LINES = [
  "Nice day for it.",
  "I found coal over that way.",
  "This looks like a good spot.",
  "Careful digging straight down.",
  "There are cats around here somewhere.",
  "I keep my best blocks in a chest.",
  "Diamonds are deep down. Really deep.",
];

const GREETINGS = [
  "Hey there!",
  "Oh, hello!",
  "Hi friend!",
];

/* ------------------------------------------------------------------ *
 * Floating name and speech tags
 * ------------------------------------------------------------------ */

/** Draws a rounded label into a canvas sprite that always faces the camera. */
function createLabelSprite(text, { background = "rgba(12,16,22,0.72)", color = "#ffffff" } = {}) {
  const canvasEl = document.createElement("canvas");
  const ctx = canvasEl.getContext("2d");
  ctx.font = "600 28px 'Trebuchet MS', sans-serif";
  const width = Math.ceil(ctx.measureText(text).width) + 28;
  canvasEl.width = width;
  canvasEl.height = 44;

  const draw = canvasEl.getContext("2d");
  draw.font = "600 28px 'Trebuchet MS', sans-serif";
  draw.textBaseline = "middle";
  draw.fillStyle = background;
  draw.beginPath();
  draw.roundRect(0, 0, width, 44, 10);
  draw.fill();
  draw.fillStyle = color;
  draw.fillText(text, 14, 23);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    // Depth tested, so a tag behind a building stays behind it rather than
    // floating over the whole scene.
    depthWrite: false,
  }));
  sprite.scale.set(width / 44 * 0.42, 0.42, 1);
  sprite.renderOrder = 10;
  // Sprite.raycast needs a camera on the raycaster, and ours is built from the
  // player's eye. Labels are not click targets, so opt them out entirely.
  sprite.raycast = () => {};
  return sprite;
}

export class NpcManager {
  constructor() {
    this.root = new THREE.Group();
    this.npcs = [];
    scene.add(this.root);
  }

  /** Places the roster in a loose ring around a point, on solid ground. */
  spawnRoster(centerX, centerZ) {
    NPC_NAMES.forEach((name, index) => {
      const angle = (index / NPC_NAMES.length) * PI * 2;
      const radius = 9 + hash3(index, 3, 7) * 7;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      this.spawn({ name, x, z });
    });
  }

  spawn({ name, x, z, following = false, palette }) {
    const look = palette ?? randomPalette();
    const surface = getSurfaceData(x, z);
    const group = createCharacterModel(look);
    group.visible = true;

    const tag = createLabelSprite(name);
    tag.position.set(0, 2.1, 0);
    group.add(tag);

    const bubble = createLabelSprite("", { background: "rgba(250,250,252,0.94)", color: "#12171f" });
    bubble.position.set(0, 2.55, 0);
    bubble.visible = false;
    group.add(bubble);

    const npc = {
      name,
      palette: look,
      group,
      parts: group.userData.parts,
      tag,
      bubble,
      x,
      y: surface.y,
      z,
      homeX: x,
      homeZ: z,
      targetX: x,
      targetZ: z,
      heading: hash3(x, 1, z) * PI * 2,
      stride: 0,
      moveTimer: 1 + hash3(x, 2, z) * 3,
      swing: 0,
      swingTimer: 3 + hash3(x, 4, z) * 6,
      speakTimer: 6 + hash3(x, 6, z) * 14,
      bubbleTimer: 0,
      following,
      phase: hash3(x, 8, z) * PI * 2,
      activity: "wander",
      plan: null,
      planStep: 0,
      workTimer: 0,
      activityTimer: 3 + Math.random() * 6,
    };
    group.position.set(x, npc.y, z);
    group.userData.npc = npc;
    this.root.add(group);
    this.npcs.push(npc);
    return npc;
  }

  /** Nearest NPC under the ray, for right-clicking one. */
  raycast(ray, maxDistance) {
    const hits = ray.intersectObjects(this.root.children, true);
    for (const hit of hits) {
      if (hit.distance > maxDistance) {
        break;
      }
      let node = hit.object;
      while (node && !node.userData.npc) {
        node = node.parent;
      }
      if (node?.userData.npc) {
        return { npc: node.userData.npc, distance: hit.distance };
      }
    }
    return null;
  }

  /** Shows a speech bubble for a few seconds. */
  say(npc, text) {
    npc.group.remove(npc.bubble);
    npc.bubble = createLabelSprite(text, { background: "rgba(250,250,252,0.94)", color: "#12171f" });
    npc.bubble.position.set(0, 2.55, 0);
    npc.group.add(npc.bubble);
    npc.bubbleTimer = 4;
  }

  /** Right-clicking greets, and toggles whether they tag along. */
  greet(npc) {
    npc.following = !npc.following;
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    const text = npc.following
      ? `${greeting} I'll come with you.`
      : "I'll wait around here.";
    this.say(npc, text);
    if (!npc.following) {
      npc.homeX = npc.x;
      npc.homeZ = npc.z;
    }
    return npc.following;
  }

  update(dt) {
    for (const npc of this.npcs) {
      this.updateNpc(npc, dt);
    }
  }

  /* ---------------------------------------------------------------- *
   * Jobs
   *
   * A character picks something to do, walks to the site, then works
   * through a plan of block changes one at a time so you can watch it
   * happen. Sites are only claimed where nobody has already built, so
   * they never knock a hole in something you made.
   * ---------------------------------------------------------------- */

  /** Refuses a site that overlaps existing edits or sits on top of spawn. */
  siteIsFree(centerX, centerZ, radius, baseY, height) {
    if (Math.hypot(centerX - DEFAULT_SPAWN.x, centerZ - DEFAULT_SPAWN.z) < 8) {
      return false;
    }
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = 0; dy <= height; dy++) {
          if (world.hasEditAt(centerX + dx, baseY + dy, centerZ + dz)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /** A flat, unclaimed 5x5 patch makes a buildable plot. */
  findHutSite(npc) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * PI * 2;
      const radius = 7 + Math.random() * 8;
      const cx = Math.round(npc.homeX + Math.cos(angle) * radius);
      const cz = Math.round(npc.homeZ + Math.sin(angle) * radius);
      const base = getSurfaceData(cx, cz);
      if (base.blockType === BLOCKS.water || base.blockType === BLOCKS.sand) {
        continue;
      }
      let flat = true;
      for (let dz = -2; dz <= 2 && flat; dz++) {
        for (let dx = -2; dx <= 2 && flat; dx++) {
          const corner = getSurfaceData(cx + dx, cz + dz);
          if (corner.y !== base.y || corner.blockType === BLOCKS.water) {
            flat = false;
          }
        }
      }
      if (flat && this.siteIsFree(cx, cz, 2, base.y, 4)) {
        return { x: cx, y: base.y, z: cz };
      }
    }
    return null;
  }

  /** Walls two high with a doorway, a flat roof, and a torch inside. */
  planHut(site) {
    const plan = [];
    for (let dy = 0; dy < 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          const doorway = dx === 0 && dz === 2;
          if (edge && !doorway) {
            plan.push({ x: site.x + dx, y: site.y + dy, z: site.z + dz, block: BLOCKS.planks });
          }
        }
      }
    }
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        plan.push({ x: site.x + dx, y: site.y + 2, z: site.z + dz, block: BLOCKS.planks });
      }
    }
    plan.push({ x: site.x, y: site.y, z: site.z, block: BLOCKS.torch });
    return plan;
  }

  /** A shallow pocket dug into the ground, lit with a torch at the bottom. */
  planMine(npc) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * PI * 2;
      const radius = 4 + Math.random() * 7;
      const cx = Math.round(npc.homeX + Math.cos(angle) * radius);
      const cz = Math.round(npc.homeZ + Math.sin(angle) * radius);
      const base = getSurfaceData(cx, cz);
      if (base.blockType === BLOCKS.water || !this.siteIsFree(cx, cz, 0, base.y - 4, 5)) {
        continue;
      }
      const plan = [];
      for (let depth = 1; depth <= 3; depth++) {
        plan.push({ x: cx, y: base.y - depth, z: cz, block: BLOCKS.air });
      }
      plan.push({ x: cx, y: base.y - 3, z: cz, block: BLOCKS.torch });
      return { site: { x: cx, y: base.y, z: cz }, plan };
    }
    return null;
  }

  /** Chooses what to do next once a character is free. */
  startActivity(npc) {
    const roll = Math.random();
    if (roll < 0.4) {
      const site = this.findHutSite(npc);
      if (site) {
        npc.activity = "build";
        npc.site = site;
        npc.plan = this.planHut(site);
        npc.planStep = 0;
        this.say(npc, "I am going to build something here.");
        return;
      }
    } else if (roll < 0.75) {
      const mine = this.planMine(npc);
      if (mine) {
        npc.activity = "mine";
        npc.site = mine.site;
        npc.plan = mine.plan;
        npc.planStep = 0;
        this.say(npc, "Let us see what is down here.");
        return;
      }
    }
    npc.activity = "wander";
    npc.plan = null;
    npc.activityTimer = 8 + Math.random() * 12;
  }

  /**
   * Walks to the site and applies one block per beat. Returns true while the
   * character is busy, so the wander logic stays out of the way.
   */
  workOnPlan(npc, dt) {
    const step = npc.plan[npc.planStep];
    if (!step) {
      const finished = npc.activity;
      npc.activity = "wander";
      npc.plan = null;
      npc.activityTimer = 10 + Math.random() * 14;
      this.say(npc, finished === "build" ? "There, a place of my own." : "That will do for now.");
      return { busy: false, moving: false };
    }

    // Stand next to the work, not on top of it.
    const dx = npc.site.x - npc.x;
    const dz = npc.site.z - npc.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 3.2) {
      const walked = this.step(npc, dx / distance, dz / distance, dt, 3);
      return { busy: true, moving: walked };
    }
    npc.heading = lerpAngle(npc.heading, Math.atan2(step.x + 0.5 - npc.x, step.z + 0.5 - npc.z), clamp(dt * 6, 0, 1));

    npc.workTimer -= dt;
    if (npc.workTimer > 0) {
      return { busy: true, moving: false };
    }
    npc.workTimer = 0.45;
    npc.swing = 1;

    // Skip anything already the way we want it, or that someone else changed.
    const current = world.getBlock(step.x, step.y, step.z);
    if (current !== step.block) {
      world.setBlock(step.x, step.y, step.z, step.block);
      chunkMeshes.markDirtyAtWorld(step.x, step.z);
    }
    npc.planStep += 1;
    return { busy: true, moving: false };
  }

  updateNpc(npc, dt) {
    const player = state.player;
    const toPlayerX = player.x - npc.x;
    const toPlayerZ = player.z - npc.z;
    const playerDistance = Math.hypot(toPlayerX, toPlayerZ);

    let moving = false;

    // A character with a job gets on with it unless you have called them away.
    if (!npc.following && npc.plan) {
      const work = this.workOnPlan(npc, dt);
      if (work.busy) {
        this.finishFrame(npc, dt, work.moving, playerDistance);
        return;
      }
    } else if (!npc.following) {
      npc.activityTimer -= dt;
      if (npc.activityTimer <= 0) {
        this.startActivity(npc);
      }
    }

    if (npc.following) {
      // Same shape as the cat: trail you, and catch up if you get far ahead.
      if (playerDistance > NPC_TELEPORT_DISTANCE) {
        const surface = getSurfaceData(player.x + 1.2, player.z + 1.2);
        npc.x = player.x + 1.2;
        npc.z = player.z + 1.2;
        npc.y = surface.y;
      } else if (playerDistance > NPC_FOLLOW_DISTANCE) {
        // Jog harder the further behind they are, so sprinting never loses them.
        const urgency = clamp(playerDistance / 5, 1, 2.4);
        moving = this.step(npc, toPlayerX / playerDistance, toPlayerZ / playerDistance, dt, 3.6 * urgency);
      }
      if (!moving) {
        npc.heading = lerpAngle(npc.heading, Math.atan2(toPlayerX, toPlayerZ), clamp(dt * 3, 0, 1));
      }
    } else {
      npc.moveTimer -= dt;
      const dx = npc.targetX - npc.x;
      const dz = npc.targetZ - npc.z;
      if (Math.hypot(dx, dz) < 0.3 || npc.moveTimer <= 0) {
        this.pickWanderTarget(npc);
      } else {
        const length = Math.hypot(dx, dz);
        moving = this.step(npc, dx / length, dz / length, dt, 2.4);
      }
      // Turn to face you when you come close, so they feel aware of you.
      if (playerDistance < 5 && !moving) {
        npc.heading = lerpAngle(npc.heading, Math.atan2(toPlayerX, toPlayerZ), clamp(dt * 2.5, 0, 1));
      }
    }

    this.finishFrame(npc, dt, moving, playerDistance);
  }

  /** Shared per-frame tail: chatter, tags and posing. */
  finishFrame(npc, dt, moving, playerDistance) {
    npc.swing = Math.max(0, npc.swing - dt * 2.2);

    // Occasional idle chatter when you are close enough to read it.
    npc.speakTimer -= dt;
    if (npc.speakTimer <= 0) {
      npc.speakTimer = 14 + Math.random() * 22;
      if (playerDistance < 12) {
        this.say(npc, IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)]);
      }
    }
    if (npc.bubbleTimer > 0) {
      npc.bubbleTimer -= dt;
      npc.bubble.visible = npc.bubbleTimer > 0;
    }

    // Tags are only legible up close, and clutter the view from far away.
    npc.tag.visible = playerDistance < 18;

    npc.group.position.set(npc.x, npc.y, npc.z);
    npc.group.rotation.y = wrapAngle(npc.heading);
    if (moving) {
      npc.stride += dt * 9;
    }
    animateCharacter(npc.parts, {
      stride: moving ? Math.sin(npc.stride) * 0.6 : 0,
      pitch: Math.sin(state.elapsed * 0.6 + npc.phase) * 0.12,
      lean: 0,
      swing: npc.swing,
    });
  }

  /** Moves one step, refusing water and anything too steep to climb. */
  step(npc, dirX, dirZ, dt, speed) {
    const distance = speed * dt;
    const nextX = npc.x + dirX * distance;
    const nextZ = npc.z + dirZ * distance;
    const surface = getSurfaceData(nextX, nextZ);
    if (surface.blockType === BLOCKS.water || Math.abs(surface.y - npc.y) > 1.4) {
      npc.moveTimer = 0;
      return false;
    }
    npc.x = nextX;
    npc.z = nextZ;
    npc.y = lerp(npc.y, surface.y, clamp(dt * 6, 0, 1));
    npc.heading = lerpAngle(npc.heading, Math.atan2(dirX, dirZ), clamp(dt * 5, 0, 1));
    return true;
  }

  pickWanderTarget(npc) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = Math.random() * PI * 2;
      const radius = 2 + Math.random() * 9;
      const candidateX = npc.homeX + Math.cos(angle) * radius;
      const candidateZ = npc.homeZ + Math.sin(angle) * radius;
      const surface = getSurfaceData(candidateX, candidateZ);
      if (surface.blockType !== BLOCKS.water && Math.abs(surface.y - npc.y) <= 3) {
        npc.targetX = candidateX;
        npc.targetZ = candidateZ;
        npc.moveTimer = 3 + Math.random() * 5;
        return;
      }
    }
    npc.targetX = npc.homeX;
    npc.targetZ = npc.homeZ;
    npc.moveTimer = 2 + Math.random() * 2;
  }

  serialize() {
    return this.npcs.map((npc) => ({
      name: npc.name,
      palette: npc.palette,
      x: Number(npc.x.toFixed(2)),
      z: Number(npc.z.toFixed(2)),
      following: npc.following,
    }));
  }

  restore(saved) {
    if (!Array.isArray(saved) || saved.length === 0) {
      return false;
    }
    for (const entry of saved) {
      this.spawn(entry);
    }
    return true;
  }

  getCount() {
    return this.npcs.length;
  }

  getNearby(limit = 5) {
    return this.npcs
      .map((npc) => ({
        name: npc.name,
        activity: npc.activity,
        following: npc.following || undefined,
        x: Number(npc.x.toFixed(1)),
        y: Number(npc.y.toFixed(1)),
        z: Number(npc.z.toFixed(1)),
        distance: Number(Math.hypot(npc.x - state.player.x, npc.z - state.player.z).toFixed(1)),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }
}

export const npcs = new NpcManager();
