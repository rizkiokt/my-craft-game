// Friendly characters who live in the world so it never feels empty.
//
// They look like players, wander around doing their own thing, tag along if you
// ask, and come over to lend a hand when you are in trouble. Nothing here
// fights: the worst that happens is somebody talks to you.

import * as THREE from "../node_modules/three/build/three.module.js";
import { chunkMeshes } from "./chunkMesh.js";
import {
  BLOCKS,
  DEFAULT_SPAWN,
  MAX_HEALTH,
  NPC_FOLLOW_DISTANCE,
  NPC_TELEPORT_DISTANCE,
  PI,
} from "./constants.js";
import { getMaxHealth } from "./growth.js";
import { addItem, getItemCount, isCreative } from "./items.js";
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

function shuffled(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * One look per character, dealt from shuffled decks so no two of them turn up
 * in the same shirt. Rolling each independently looks wrong surprisingly
 * often: five picks from eleven hues collide more than half the time.
 */
export function rollRosterPalettes(count, random = Math.random) {
  const shirts = shuffled(CLOTH_HUES, random);
  const trousers = shuffled(CLOTH_HUES, random);
  return Array.from({ length: count }, (_, index) => randomPalette(
    random,
    shirts[index % shirts.length],
    trousers[index % trousers.length],
  ));
}

export function randomPalette(
  random = Math.random,
  shirtCloth = pick(CLOTH_HUES, random),
  pantsCloth = pick(CLOTH_HUES, random),
) {
  const [shirtHue, shirtSat] = shirtCloth;
  const [pantsHue, pantsSat] = pantsCloth;
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

const COMPANY_LINES = [
  "Mind if I tag along?",
  "I will come with you for a bit.",
  "Wait for me!",
];

const PARTING_LINES = [
  "I should get back to my own work.",
  "That was fun. See you around!",
  "I will be over here if you need me.",
];

/* ------------------------------------------------------------------ *
 * Lending a hand
 *
 * Friends keep half an eye on you. Dig yourself into a hole, get hurt,
 * end up somewhere pitch dark or run out of the basics and the nearest
 * free one walks over and does something about it.
 * ------------------------------------------------------------------ */

/** One beat per block change, whether they are building or digging you out. */
const WORK_BEAT = 0.45;
/** How often the roster looks you over. Often enough to feel attentive. */
const HELP_SCAN_INTERVAL = 1.1;
/** How far away they notice, and how close they get before handing something over. */
const HELP_NOTICE_RADIUS = 22;
const HELP_REACH = 2.9;
/** They give up rather than jog at a wall forever. */
const HELP_TIMEOUT = 24;
/** Seconds of getting no closer before they admit they cannot reach you. */
const HELP_STALL = 6;
/** A rest afterwards, so nobody shadows you all day. */
const HELP_COOLDOWN = 20;
/** Sharing food and handing out supplies are the rarer favours. */
const FOOD_COOLDOWN = 75;
const GIFT_COOLDOWN = 150;
const LOW_HEALTH = 7;
const FOOD_HEAL = 6;
/** At or below this a spot is dark enough to want a torch. */
const DARK_LIGHT = 3;
/** Only a friend this close will offer one, since they have to reach you. */
const TORCH_REACH = 8;
/** Any deeper and the staircase would take all day to carve. */
const MAX_RESCUE_DEPTH = 14;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Handed over when your bag runs out of something basic. */
const GIFTS = [
  { itemId: BLOCKS.torch, amount: 4, label: "torches", line: "Take some torches, you will want them." },
  { itemId: BLOCKS.planks, amount: 8, label: "planks", line: "Here, some spare planks." },
];

/** hud.js sits above this module, so the toast fields are written directly. */
function toast(message) {
  state.uiMessage = message;
  state.uiMessageTimer = 2.4;
}

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
    this.helpTimer = HELP_SCAN_INTERVAL;
    this.giftCooldown = 0;
    scene.add(this.root);
  }

  /** Places the roster in a loose ring around a point, on solid ground. */
  spawnRoster(centerX, centerZ) {
    const looks = rollRosterPalettes(NPC_NAMES.length);
    NPC_NAMES.forEach((name, index) => {
      const angle = (index / NPC_NAMES.length) * PI * 2;
      const radius = 9 + hash3(index, 3, 7) * 7;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      this.spawn({ name, x, z, palette: looks[index] });
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
      slide: 1,
      slideTimer: 0,
      moveTimer: 1 + hash3(x, 2, z) * 3,
      swing: 0,
      swingTimer: 3 + hash3(x, 4, z) * 6,
      speakTimer: 6 + hash3(x, 6, z) * 14,
      bubbleTimer: 0,
      following,
      // Set when they decide to come along by themselves, which wears off.
      autoFollow: false,
      followTimer: 0,
      phase: hash3(x, 8, z) * PI * 2,
      job: null,
      help: null,
      helpCooldown: 0,
      foodCooldown: 0,
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

  /** Something went bang nearby, so they say so. Nobody is hurt by it. */
  startle(x, z) {
    const lines = ["Whoa!", "What was that?!", "Mind the noise!", "Ha! Again!"];
    for (const npc of this.npcs) {
      if (Math.hypot(npc.x - x, npc.z - z) < 18 && Math.random() < 0.7) {
        this.say(npc, lines[Math.floor(Math.random() * lines.length)]);
      }
    }
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
    if (npc.following) {
      this.stopFollowing(npc, "I'll wait around here.");
      return false;
    }
    // Asking makes it permanent, even if they had already tagged along.
    npc.following = true;
    npc.autoFollow = false;
    npc.followTimer = 0;
    const greeting = pick(GREETINGS, Math.random);
    this.say(npc, `${greeting} I'll come with you.`);
    return true;
  }

  /** Peels off and settles wherever they happen to be standing. */
  stopFollowing(npc, line) {
    npc.following = false;
    npc.autoFollow = false;
    npc.followTimer = 0;
    npc.homeX = npc.x;
    npc.homeZ = npc.z;
    npc.activityTimer = Math.min(npc.activityTimer, 6 + Math.random() * 8);
    if (line) {
      this.say(npc, line);
    }
  }

  update(dt) {
    this.giftCooldown = Math.max(0, this.giftCooldown - dt);
    this.helpTimer -= dt;
    if (this.helpTimer <= 0) {
      this.helpTimer = HELP_SCAN_INTERVAL;
      this.considerHelping();
    }
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
    // Sometimes they would rather come along than start a job of their own.
    const playerDistance = Math.hypot(state.player.x - npc.x, state.player.z - npc.z);
    if (state.running && !state.isDead && playerDistance < 16 && Math.random() < 0.3) {
      npc.following = true;
      npc.autoFollow = true;
      npc.followTimer = 25 + Math.random() * 35;
      this.say(npc, pick(COMPANY_LINES, Math.random));
      return;
    }

    const roll = Math.random();
    if (roll < 0.4) {
      const site = this.findHutSite(npc);
      if (site) {
        npc.job = { kind: "build", site, plan: this.planHut(site), step: 0 };
        this.say(npc, "I am going to build something here.");
        return;
      }
    } else if (roll < 0.75) {
      const mine = this.planMine(npc);
      if (mine) {
        npc.job = { kind: "mine", site: mine.site, plan: mine.plan, step: 0 };
        this.say(npc, "Let us see what is down here.");
        return;
      }
    }
    npc.job = null;
    npc.activityTimer = 8 + Math.random() * 12;
  }

  /**
   * Walks to `job.site`, then applies one block from `job.plan` per beat.
   * Shared by hut building, mining and digging you out of a hole.
   */
  runPlan(npc, job, dt, beat = WORK_BEAT) {
    const step = job.plan[job.step];
    if (!step) {
      return { done: true, moving: false };
    }

    // Stand next to the work, not on top of it.
    const dx = job.site.x - npc.x;
    const dz = job.site.z - npc.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 3.2) {
      return { done: false, moving: this.step(npc, dx / distance, dz / distance, dt, 3) };
    }
    npc.heading = lerpAngle(npc.heading, Math.atan2(step.x + 0.5 - npc.x, step.z + 0.5 - npc.z), clamp(dt * 6, 0, 1));

    npc.workTimer -= dt;
    if (npc.workTimer > 0) {
      return { done: false, moving: false };
    }
    npc.workTimer = beat;
    npc.swing = 1;
    this.applyStep(step);
    job.step += 1;
    return { done: false, moving: false };
  }

  /**
   * True when a block change is worth making. Empty space is fair game, but a
   * block you placed yourself is yours: they will never take it away.
   */
  canChange(x, y, z, block) {
    const current = world.getBlock(x, y, z);
    if (current === block) {
      return false;
    }
    return current === BLOCKS.air || !world.hasEditAt(x, y, z);
  }

  applyStep(step) {
    if (!this.canChange(step.x, step.y, step.z, step.block)) {
      return;
    }
    world.setBlock(step.x, step.y, step.z, step.block);
    chunkMeshes.markDirtyAtWorld(step.x, step.z);
  }

  /**
   * Runs the current job. Returns busy while the character is working, so the
   * wander logic stays out of the way.
   */
  workOnJob(npc, dt) {
    const work = this.runPlan(npc, npc.job, dt);
    if (!work.done) {
      return { busy: true, moving: work.moving };
    }
    const finished = npc.job.kind;
    npc.job = null;
    npc.activityTimer = 10 + Math.random() * 14;
    this.say(npc, finished === "build" ? "There, a place of my own." : "That will do for now.");
    return { busy: false, moving: false };
  }

  /* ---------------------------------------------------------------- *
   * Lending a hand
   *
   * One favour at a time, from whoever is closest and has not just
   * helped. Every favour is either "reach a spot and change some
   * blocks" or "reach the player and hand something over".
   * ---------------------------------------------------------------- */

  /** Looks you over and sends the nearest free friend if anything is wrong. */
  considerHelping() {
    if (!state.running || state.isDead) {
      return;
    }
    // One helper at a time: five of them crowding you would be chaos.
    if (this.npcs.some((npc) => npc.help)) {
      return;
    }
    const need = this.findNeed();
    if (!need) {
      return;
    }
    const helper = this.nearestHelper(need);
    if (helper) {
      this.beginHelp(helper, need);
    }
  }

  nearestHelper(need) {
    let best = null;
    let bestDistance = need.reach ?? HELP_NOTICE_RADIUS;
    for (const npc of this.npcs) {
      if (npc.helpCooldown > 0 || (need.kind === "food" && npc.foodCooldown > 0)) {
        continue;
      }
      const distance = Math.hypot(npc.x - state.player.x, npc.z - state.player.z);
      if (distance < bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** The first thing worth doing something about, most urgent first. */
  findNeed() {
    const px = Math.floor(state.player.x);
    const pz = Math.floor(state.player.z);
    const feetY = Math.floor(state.player.y + 0.1);

    const rescue = this.findPitRescue(px, feetY, pz);
    if (rescue) {
      return rescue;
    }
    if (!isCreative() && state.health <= LOW_HEALTH) {
      return { kind: "food", line: "You look hurt. Here, eat something." };
    }
    if (world.getLight(px, feetY, pz) <= DARK_LIGHT) {
      const spot = this.findTorchSpot(px, feetY, pz);
      if (spot) {
        return {
          kind: "light",
          line: "It is too dark in here. Hold on.",
          site: spot,
          plan: [{ x: spot.x, y: spot.y, z: spot.z, block: BLOCKS.torch }],
          // Only somebody already down here with you: a friend up on the
          // surface would just walk into the hillside and give up.
          reach: TORCH_REACH,
        };
      }
    }
    if (!isCreative() && this.giftCooldown <= 0) {
      for (const gift of GIFTS) {
        if (getItemCount(gift.itemId) === 0) {
          return { kind: "gift", line: gift.line, gift };
        }
      }
    }
    return null;
  }

  /**
   * A staircase carved out of the wall when you have dug yourself in: walled
   * in on most sides with the way out well over your head.
   */
  findPitRescue(px, feetY, pz) {
    if (isCreative() || state.flying) {
      return null;
    }
    let walls = 0;
    for (const [dx, dz] of SIDES) {
      if (world.isSolid(px + dx, feetY, pz + dz) && world.isSolid(px + dx, feetY + 1, pz + dz)) {
        walls += 1;
      }
    }
    if (walls < 3) {
      return null;
    }

    // Dig out towards whichever side has the lowest ground to reach.
    let direction = null;
    let rim = Infinity;
    for (const [dx, dz] of SIDES) {
      const surface = getSurfaceData(px + dx * 3, pz + dz * 3);
      if (surface.blockType === BLOCKS.water) {
        continue;
      }
      if (surface.y < rim) {
        rim = surface.y;
        direction = [dx, dz];
      }
    }
    const depth = rim - feetY;
    if (!direction || depth < 3 || depth > MAX_RESCUE_DEPTH) {
      return null;
    }

    // Cut from the rim downwards, so the tunnel opens where they stand and
    // arrives at your feet. Every step is a full block up, which needs a jump
    // (MAX_STEP_HEIGHT only covers 0.6), and a jump needs three blocks of
    // headroom or you crack your head on the ceiling and never get up it.
    const plan = [];
    for (let up = depth; up >= 1; up--) {
      const x = px + direction[0] * up;
      const z = pz + direction[1] * up;
      const floor = world.getBlock(x, feetY + up - 1, z);
      if (floor === BLOCKS.air || floor === BLOCKS.water) {
        plan.push({ x, y: feetY + up - 1, z, block: BLOCKS.dirt });
      }
      for (let head = 0; head < 3; head++) {
        plan.push({ x, y: feetY + up + head, z, block: BLOCKS.air });
      }
    }
    // Once the staircase is cut, nothing here needs digging, so the same hole
    // does not get rescued over and over while you stand in it.
    if (!plan.some((step) => this.canChange(step.x, step.y, step.z, step.block))) {
      return null;
    }
    return {
      kind: "rescue",
      line: "Hold on, I will dig you out!",
      site: { x: px + direction[0] * depth, y: rim, z: pz + direction[1] * depth },
      plan,
      beat: 0.3,
    };
  }

  /** An empty cell beside you that a torch can stand in. */
  findTorchSpot(px, feetY, pz) {
    for (const [dx, dz] of SIDES) {
      const x = px + dx;
      const z = pz + dz;
      if (world.isSolid(x, feetY - 1, z) && this.canChange(x, feetY, z, BLOCKS.torch)) {
        return { x, y: feetY, z };
      }
    }
    return null;
  }

  beginHelp(npc, need) {
    // Whatever they were up to waits until you are sorted out. Following is
    // deliberately left alone, so a companion who lights your way stays with
    // you afterwards.
    npc.help = { ...need, step: 0, timer: HELP_TIMEOUT, closest: Infinity, stall: 0 };
    npc.workTimer = 0;
    this.say(npc, need.line);
  }

  /** Walks over, does the favour, then goes back to what it was doing. */
  workOnHelp(npc, dt) {
    const help = npc.help;
    help.timer -= dt;

    // Water or a cliff in the way means they will never arrive. Noticing that
    // early matters, because nobody else may step in while one of them is on
    // the job.
    const objective = help.site ?? state.player;
    const distance = Math.hypot(objective.x - npc.x, objective.z - npc.z);
    if (distance > 3.2) {
      if (distance < help.closest - 0.1) {
        help.closest = distance;
        help.stall = 0;
      } else {
        help.stall += dt;
      }
    }
    if (help.timer <= 0 || help.stall > HELP_STALL) {
      this.say(npc, "I could not get to you, sorry.");
      this.endHelp(npc);
      return { busy: false, moving: false };
    }

    if (help.plan) {
      const work = this.runPlan(npc, help, dt, help.beat);
      if (!work.done) {
        return { busy: true, moving: work.moving };
      }
    } else {
      // Hand-over favours just need them standing next to you.
      const dx = state.player.x - npc.x;
      const dz = state.player.z - npc.z;
      const gap = Math.hypot(dx, dz);
      if (gap > HELP_REACH) {
        return { busy: true, moving: this.step(npc, dx / gap, dz / gap, dt, 4) };
      }
      npc.heading = lerpAngle(npc.heading, Math.atan2(dx, dz), clamp(dt * 6, 0, 1));
      npc.swing = 1;
    }

    this.completeHelp(npc);
    return { busy: false, moving: false };
  }

  /** The payoff, once they have arrived. */
  completeHelp(npc) {
    const help = npc.help;
    if (help.kind === "food") {
      // combat.js sits above this module, so the heal is applied directly.
      state.health = Math.min(getMaxHealth(), state.health + FOOD_HEAL);
      state.saveDirty = true;
      npc.foodCooldown = FOOD_COOLDOWN;
      toast(`${npc.name} shared some food with you`);
      this.say(npc, "Better?");
    } else if (help.kind === "gift") {
      addItem(help.gift.itemId, help.gift.amount);
      this.giftCooldown = GIFT_COOLDOWN;
      state.saveDirty = true;
      toast(`${npc.name} gave you ${help.gift.amount} ${help.gift.label}`);
    } else if (help.kind === "rescue") {
      toast(`${npc.name} dug you a way out`);
      this.say(npc, "There you go. Watch your step!");
    } else if (help.kind === "light") {
      this.say(npc, "That is better.");
    }
    this.endHelp(npc);
  }

  endHelp(npc) {
    npc.help = null;
    npc.helpCooldown = HELP_COOLDOWN;
    npc.activityTimer = Math.max(npc.activityTimer, 4);
  }

  updateNpc(npc, dt) {
    const player = state.player;
    const toPlayerX = player.x - npc.x;
    const toPlayerZ = player.z - npc.z;
    const playerDistance = Math.hypot(toPlayerX, toPlayerZ);

    npc.helpCooldown = Math.max(0, npc.helpCooldown - dt);
    npc.foodCooldown = Math.max(0, npc.foodCooldown - dt);

    let moving = false;

    // Helping you comes before anything else they might be doing.
    if (npc.help) {
      const work = this.workOnHelp(npc, dt);
      if (work.busy) {
        this.finishFrame(npc, dt, work.moving, playerDistance);
        return;
      }
    }

    // Tagging along off their own bat only lasts a while.
    if (npc.autoFollow) {
      npc.followTimer -= dt;
      if (npc.followTimer <= 0) {
        this.stopFollowing(npc, pick(PARTING_LINES, Math.random));
      }
    }

    // A character with a job gets on with it unless you have called them away.
    if (!npc.following && npc.job) {
      const work = this.workOnJob(npc, dt);
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

  /**
   * Moves one step. When the way is blocked they slip sideways along whatever
   * is in the way instead of grinding into it, which is enough to get around
   * a hillside or a tree without anything as heavy as real pathfinding.
   */
  step(npc, dirX, dirZ, dt, speed) {
    if (this.tryMove(npc, dirX, dirZ, dt, speed)) {
      npc.slideTimer = Math.max(0, npc.slideTimer - dt);
      return true;
    }
    // Commit to one side for a moment, or they jitter between the two.
    if (npc.slideTimer <= 0) {
      npc.slide = Math.random() < 0.5 ? 1 : -1;
    }
    npc.slideTimer = 1.2;
    if (this.tryMove(npc, dirZ * npc.slide, -dirX * npc.slide, dt, speed * 0.9)) {
      return true;
    }
    npc.slide = -npc.slide;
    return this.tryMove(npc, dirZ * npc.slide, -dirX * npc.slide, dt, speed * 0.9);
  }

  /** One move attempt, refusing water and anything too steep to climb. */
  tryMove(npc, dirX, dirZ, dt, speed) {
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
      // Only a friend you actually asked stays with you across a reload.
      following: npc.following && !npc.autoFollow,
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

  /** What they are up to, read off the live state so it cannot drift. */
  describeActivity(npc) {
    if (npc.help) {
      return "help";
    }
    if (npc.following) {
      return "follow";
    }
    return npc.job?.kind ?? "wander";
  }

  getNearby(limit = 5) {
    return this.npcs
      .map((npc) => ({
        name: npc.name,
        activity: this.describeActivity(npc),
        helping: npc.help?.kind,
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
