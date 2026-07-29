// Friendly characters who live in the world so it never feels empty.
//
// They look like players, wander around doing their own thing, and will tag
// along if you ask. Nothing here fights: the only interaction is saying hello.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCKS, NPC_FOLLOW_DISTANCE, NPC_TELEPORT_DISTANCE, PI } from "./constants.js";
import { clamp, hash3, lerp, lerpAngle, wrapAngle } from "./math.js";
import { animateCharacter, createCharacterModel } from "./playerModel.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
import { getSurfaceData } from "./world.js";

/** The regulars. Names are short and easy to read on a tag. */
export const NPC_ROSTER = [
  {
    name: "Alex",
    palette: { skin: "#e0b48c", hair: "#c86a2a", shirt: "#4fa35c", shirtDark: "#3d8449", pants: "#4a4f6b", shoe: "#4a3a2a" },
    lines: [
      "Hi! Want to build something together?",
      "I found coal over that way.",
      "This hill is a good spot for a house.",
    ],
  },
  {
    name: "Sam",
    palette: { skin: "#8d5a3b", hair: "#241a14", shirt: "#c85a4a", shirtDark: "#a4453a", pants: "#37405e", shoe: "#4a3a2a" },
    lines: [
      "Nice pickaxe!",
      "Careful digging straight down.",
      "I like your hat. Do you have a hat?",
    ],
  },
  {
    name: "Robin",
    palette: { skin: "#f0cfae", hair: "#e8d67a", shirt: "#7a5cc0", shirtDark: "#63499e", pants: "#3c4a78", shoe: "#3a3a42" },
    lines: [
      "There are cats around here somewhere.",
      "Race you to the top of that tower!",
      "I keep my best blocks in a chest.",
    ],
  },
  {
    name: "Kai",
    palette: { skin: "#c68a5e", hair: "#1f1b18", shirt: "#3f8fc0", shirtDark: "#336f96", pants: "#2f3a52", shoe: "#4a3a2a" },
    lines: [
      "Did you see the snowy place out east?",
      "Diamonds are deep down. Really deep.",
      "Watch this!",
    ],
  },
  {
    name: "Mia",
    palette: { skin: "#f2ddc4", hair: "#5a3b2a", shirt: "#e0a13c", shirtDark: "#bd8329", pants: "#4a4457", shoe: "#3a3a42" },
    lines: [
      "Hello! Lovely day for digging.",
      "I built a little house over there.",
      "Follow me, I want to show you something.",
    ],
  },
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
    NPC_ROSTER.forEach((template, index) => {
      const angle = (index / NPC_ROSTER.length) * PI * 2;
      const radius = 9 + hash3(index, 3, 7) * 7;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      this.spawn({ name: template.name, x, z });
    });
  }

  spawn({ name, x, z, following = false }) {
    const template = NPC_ROSTER.find((entry) => entry.name === name) ?? NPC_ROSTER[0];
    const surface = getSurfaceData(x, z);
    const group = createCharacterModel(template.palette);
    group.visible = true;

    const tag = createLabelSprite(template.name);
    tag.position.set(0, 2.1, 0);
    group.add(tag);

    const bubble = createLabelSprite("", { background: "rgba(250,250,252,0.94)", color: "#12171f" });
    bubble.position.set(0, 2.55, 0);
    bubble.visible = false;
    group.add(bubble);

    const npc = {
      name: template.name,
      template,
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

  updateNpc(npc, dt) {
    const player = state.player;
    const toPlayerX = player.x - npc.x;
    const toPlayerZ = player.z - npc.z;
    const playerDistance = Math.hypot(toPlayerX, toPlayerZ);

    let moving = false;

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

    // Occasional mining swing, as though they are busy with something.
    npc.swingTimer -= dt;
    if (npc.swingTimer <= 0) {
      npc.swingTimer = 4 + Math.random() * 8;
      npc.swing = 1;
    }
    npc.swing = Math.max(0, npc.swing - dt * 2.2);

    // Occasional idle chatter when you are close enough to read it.
    npc.speakTimer -= dt;
    if (npc.speakTimer <= 0) {
      npc.speakTimer = 14 + Math.random() * 22;
      if (playerDistance < 12) {
        const lines = npc.template.lines;
        this.say(npc, lines[Math.floor(Math.random() * lines.length)]);
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
