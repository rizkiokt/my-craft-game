// Procedural Web Audio: effects and an ambient bed.
//
// Everything is synthesised rather than loaded, so the game stays a handful of
// small files with no licences to honour and nothing to download. Three things
// do most of the work in making that not sound like a beep box:
//
//   * a long noise buffer played from a random offset, so no two hits share a
//     texture, plus a little random pitch on every event
//   * layered voices -- a noise burst for the surface, a pitched body for the
//     mass, a click for the transient
//   * a short convolution reverb built from decaying noise, which is what
//     stops it all sounding like it happens inside your head

import { BLOCKS } from "./constants.js";
import { clamp } from "./math.js";
import { settings } from "./settings.js";

/**
 * Every voice is written at a comfortable working level and scaled here, so
 * the whole engine gets louder or quieter in one place. The old engine peaked
 * around -40 dBFS, which is most of why it sounded thin.
 */
const VOICE = 6;

/** Randomises pitch a little so repeated hits never sound mechanical. */
function vary(amount = 0.06) {
  return 1 + (Math.random() * 2 - 1) * amount;
}

/**
 * How every material sounds when you walk on it, break it or put it down.
 * `body` is the pitched thump, `tone` its waveform, and the filter pair is the
 * window the noise burst is heard through.
 */
const MATERIALS = {
  grass: { body: 150, tone: "sine", high: 700, low: 5200, noise: 0.5, decay: 0.13 },
  dirt: { body: 130, tone: "sine", high: 420, low: 3200, noise: 0.55, decay: 0.15 },
  stone: { body: 210, tone: "square", high: 900, low: 7000, noise: 0.42, decay: 0.1 },
  sand: { body: 110, tone: "sine", high: 1500, low: 9000, noise: 0.85, decay: 0.24 },
  snow: { body: 120, tone: "sine", high: 1900, low: 11000, noise: 0.8, decay: 0.18 },
  wood: { body: 175, tone: "triangle", high: 380, low: 2600, noise: 0.35, decay: 0.16 },
  glass: { body: 900, tone: "sine", high: 2600, low: 12000, noise: 0.4, decay: 0.12 },
  metal: { body: 520, tone: "triangle", high: 1400, low: 9000, noise: 0.3, decay: 0.22 },
  water: { body: 90, tone: "sine", high: 500, low: 4200, noise: 0.95, decay: 0.3 },
  mud: { body: 95, tone: "sine", high: 240, low: 1500, noise: 0.7, decay: 0.22 },
  ember: { body: 140, tone: "sawtooth", high: 300, low: 2400, noise: 0.6, decay: 0.2 },
  cloth: { body: 240, tone: "sine", high: 900, low: 4000, noise: 0.6, decay: 0.1 },
};

/** Which material a block sounds like. Callers pass block types, not names. */
const BLOCK_MATERIAL = {
  [BLOCKS.grass]: "grass",
  [BLOCKS.leaves]: "grass",
  [BLOCKS.pine_leaves]: "grass",
  [BLOCKS.cactus]: "grass",
  [BLOCKS.dirt]: "dirt",
  [BLOCKS.stone]: "stone",
  [BLOCKS.bricks]: "stone",
  [BLOCKS.coal_ore]: "stone",
  [BLOCKS.iron_ore]: "stone",
  [BLOCKS.diamond_ore]: "stone",
  [BLOCKS.red_rock]: "stone",
  [BLOCKS.portal_frame]: "stone",
  [BLOCKS.enchanting_table]: "stone",
  [BLOCKS.sand]: "sand",
  [BLOCKS.red_sand]: "sand",
  [BLOCKS.snow]: "snow",
  [BLOCKS.ice]: "glass",
  [BLOCKS.glass]: "glass",
  [BLOCKS.wood]: "wood",
  [BLOCKS.pine_wood]: "wood",
  [BLOCKS.planks]: "wood",
  [BLOCKS.crafting_table]: "wood",
  [BLOCKS.chest]: "wood",
  [BLOCKS.furnace]: "metal",
  [BLOCKS.ancient_debris]: "metal",
  [BLOCKS.water]: "water",
  [BLOCKS.mud]: "mud",
  [BLOCKS.netherrack]: "ember",
  [BLOCKS.glowstone]: "glass",
  [BLOCKS.lava]: "ember",
  [BLOCKS.torch]: "wood",
};

function materialFor(block) {
  if (typeof block === "string") {
    return MATERIALS[block] ? block : "dirt";
  }
  return BLOCK_MATERIAL[block] ?? "dirt";
}

export class SoundEngine {
  constructor() {
    this.AudioContextCtor = window.AudioContext || window.webkitAudioContext || null;
    this.context = null;
    this.master = null;
    this.dry = null;
    this.wet = null;
    this.ambientBus = null;
    this.musicBus = null;
    this.muffle = null;
    this.noiseBuffer = null;
    this.enabled = false;
    this.ambience = null;
    /** What the ambient bed should currently be doing. */
    this.scene = { night: false, enclosed: false, ember: false, water: false, menu: true };
    this.nextFlourish = 0;
    this.nextChord = 0;
    this.chordStep = 0;
  }

  ensureContext() {
    if (!this.AudioContextCtor || this.context) {
      return this.context;
    }
    try {
      this.context = new this.AudioContextCtor();

      // A limiter on the way out, so a handful of overlapping hits get louder
      // together without ever clipping.
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.16;
      limiter.connect(this.context.destination);

      // Everything passes through a lowpass that only closes underwater.
      this.muffle = this.context.createBiquadFilter();
      this.muffle.type = "lowpass";
      this.muffle.frequency.value = 20000;
      this.muffle.connect(limiter);

      this.master = this.context.createGain();
      this.master.gain.value = this.getMasterLevel();
      this.master.connect(this.muffle);

      // Dry and reverb paths, so effects sit in a space rather than on top of
      // the listener.
      this.dry = this.context.createGain();
      this.dry.gain.value = 1;
      this.dry.connect(this.master);

      const reverb = this.context.createConvolver();
      reverb.buffer = this.createImpulse(1.5, 2.6);
      this.wet = this.context.createGain();
      this.wet.gain.value = 0.32;
      this.wet.connect(reverb);
      reverb.connect(this.master);

      this.ambientBus = this.context.createGain();
      this.ambientBus.gain.value = this.getAmbienceLevel();
      this.ambientBus.connect(this.master);

      // Music has its own bus so the balance between it and the wind is fixed
      // here rather than in every note.
      this.musicBus = this.context.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      const musicVerb = this.context.createConvolver();
      musicVerb.buffer = this.createImpulse(3.4, 1.8);
      const musicWet = this.context.createGain();
      musicWet.gain.value = 0.7;
      this.musicBus.connect(musicWet);
      musicWet.connect(musicVerb);
      musicVerb.connect(this.master);

      this.noiseBuffer = this.createNoiseBuffer(2.5);
      this.enabled = true;
    } catch {
      this.context = null;
      this.master = null;
      this.enabled = false;
    }
    return this.context;
  }

  getMasterLevel() {
    return 0.9 * clamp(settings.volume / 100, 0, 1);
  }

  getAmbienceLevel() {
    return 0.9 * clamp((settings.ambience ?? 70) / 100, 0, 1);
  }

  applyVolume() {
    if (this.master) {
      this.master.gain.value = this.getMasterLevel();
    }
    if (this.ambientBus) {
      this.ambientBus.gain.value = this.getAmbienceLevel();
    }
  }

  /** Long enough that random offsets never repeat audibly. */
  createNoiseBuffer(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return buffer;
  }

  /**
   * A room, as decaying noise. Cheap to build and the single biggest thing
   * separating "synthesised" from "toy".
   */
  createImpulse(seconds, falloff) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // A little early silence reads as distance to the walls.
        const early = t < 0.008 ? t / 0.008 : 1;
        data[i] = (Math.random() * 2 - 1) * (1 - t) ** falloff * early;
      }
    }
    return impulse;
  }

  resume() {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    this.startAmbience();
  }

  /* ---------------------------------------------------------------- *
   * Voices
   * ---------------------------------------------------------------- */

  /** Routes a voice to both the dry and reverb paths. */
  send(node, wetAmount = 1) {
    node.connect(this.dry);
    if (wetAmount > 0) {
      const tap = this.context.createGain();
      tap.gain.value = wetAmount;
      node.connect(tap);
      tap.connect(this.wet);
    }
  }

  pulse({
    frequency = 220, type = "sine", gain = 0.05, attack = 0.004, decay = 0.12,
    detune = 0, time = 0, bend = 1, wet = 0.5,
  } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }
    const start = context.currentTime + time;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (bend !== 1) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * bend), start + decay);
    }
    osc.detune.setValueAtTime(detune, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain * VOICE, start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);
    osc.connect(amp);
    this.send(amp, wet);
    osc.start(start);
    osc.stop(start + decay + 0.03);
  }

  noise({
    gain = 0.035, decay = 0.1, highpass = 340, lowpass = 1800, time = 0,
    sweep = 1, wet = 0.5, q = 0.9,
  } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master || !this.noiseBuffer) {
      return;
    }
    const start = context.currentTime + time;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    // A different slice of noise every time, so hits never share a texture.
    const offset = Math.random() * (this.noiseBuffer.duration - decay - 0.05);

    const hp = context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(highpass, start);
    hp.Q.value = q;

    const lp = context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(lowpass, start);
    if (sweep !== 1) {
      lp.frequency.exponentialRampToValueAtTime(
        clamp(lowpass * sweep, 60, 20000),
        start + decay,
      );
    }

    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain * VOICE, start + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(amp);
    this.send(amp, wet);
    source.start(start, Math.max(0, offset));
    source.stop(start + decay + 0.05);
  }

  /**
   * One layered impact: the transient, the surface texture and the mass of the
   * thing. Used for footsteps, mining and placing, scaled differently each time.
   */
  impact(material, { gain = 1, decay = 1, pitch = 1, wet = 0.5, time = 0 } = {}) {
    const mat = MATERIALS[material] ?? MATERIALS.dirt;
    const length = mat.decay * decay;
    this.noise({
      gain: 0.05 * gain * mat.noise,
      decay: length,
      highpass: mat.high * vary(0.12),
      lowpass: mat.low * vary(0.1),
      sweep: 0.45,
      time,
      wet,
    });
    this.pulse({
      frequency: mat.body * pitch * vary(0.08),
      type: mat.tone,
      gain: 0.05 * gain,
      decay: length * 0.9,
      bend: 0.7,
      time,
      wet,
    });
  }

  /* ---------------------------------------------------------------- *
   * Events
   * ---------------------------------------------------------------- */

  footstep(block = BLOCKS.grass, sprinting = false) {
    this.impact(materialFor(block), {
      gain: sprinting ? 0.6 : 0.42,
      decay: sprinting ? 0.85 : 1,
      pitch: vary(0.1),
      wet: 0.35,
    });
  }

  jump() {
    this.noise({ gain: 0.02, decay: 0.1, highpass: 700, lowpass: 4200, sweep: 1.6, wet: 0.3 });
    this.pulse({ frequency: 300 * vary(), type: "sine", gain: 0.03, decay: 0.14, bend: 1.5, wet: 0.3 });
  }

  land(speed = 6) {
    const force = clamp(Math.abs(speed) / 14, 0.3, 1.4);
    this.impact("dirt", { gain: 0.7 * force, decay: 1.3, pitch: 0.8, wet: 0.5 });
    if (force > 0.8) {
      this.pulse({ frequency: 70, type: "sine", gain: 0.05 * force, decay: 0.3, bend: 0.6, wet: 0.6 });
    }
  }

  /** A pick strike. `finished` is the block finally giving way. */
  hit(block = BLOCKS.stone, finished = false) {
    this.impact(materialFor(block), {
      gain: finished ? 1 : 0.4,
      decay: finished ? 1.6 : 0.55,
      pitch: finished ? 0.85 : vary(0.16),
      wet: finished ? 0.7 : 0.3,
    });
    if (finished) {
      // Debris skittering away.
      for (let i = 0; i < 3; i++) {
        this.noise({
          gain: 0.012,
          decay: 0.08,
          highpass: 1800 * vary(0.3),
          lowpass: 9000,
          time: 0.05 + i * 0.045 + Math.random() * 0.03,
          wet: 0.6,
        });
      }
    }
  }

  place(block = BLOCKS.stone) {
    this.impact(materialFor(block), { gain: 0.7, decay: 1.1, pitch: 1.05, wet: 0.45 });
  }

  splash() {
    this.noise({ gain: 0.06, decay: 0.4, highpass: 300, lowpass: 5000, sweep: 0.25, wet: 0.8 });
    this.pulse({ frequency: 420 * vary(0.2), type: "sine", gain: 0.02, decay: 0.25, bend: 0.35, wet: 0.7 });
  }

  burn() {
    this.noise({ gain: 0.05, decay: 0.5, highpass: 200, lowpass: 2200, sweep: 0.5, wet: 0.7 });
    this.pulse({ frequency: 90, type: "sawtooth", gain: 0.035, decay: 0.45, bend: 0.7, wet: 0.6 });
  }

  ui(opening = true) {
    this.resume();
    this.pulse({
      frequency: opening ? 520 : 400,
      type: "triangle",
      gain: 0.035,
      decay: 0.14,
      bend: opening ? 1.3 : 0.75,
      wet: 0.4,
    });
    this.pulse({
      frequency: (opening ? 780 : 600) * vary(0.02),
      type: "sine",
      gain: 0.02,
      decay: 0.1,
      time: 0.03,
      wet: 0.4,
    });
  }

  select() {
    this.pulse({ frequency: 880 * vary(0.03), type: "sine", gain: 0.022, decay: 0.06, wet: 0.25 });
    this.noise({ gain: 0.008, decay: 0.04, highpass: 3000, lowpass: 11000, wet: 0.2 });
  }

  craft() {
    // A small rising figure, so finishing something feels like an achievement.
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      this.pulse({
        frequency,
        type: "triangle",
        gain: 0.03,
        decay: 0.3,
        time: index * 0.075,
        wet: 0.7,
      });
    });
  }

  meow() {
    const base = 620 * vary(0.12);
    this.pulse({ frequency: base, type: "sawtooth", gain: 0.018, decay: 0.22, bend: 1.35, wet: 0.5 });
    this.pulse({ frequency: base * 1.5, type: "sine", gain: 0.01, decay: 0.28, bend: 0.7, time: 0.09, wet: 0.5 });
  }

  /** Lighting a portal, and going through one. */
  portal(travelling = false) {
    const base = travelling ? 180 : 300;
    for (let i = 0; i < 5; i++) {
      this.pulse({
        frequency: base * (1 + i * 0.4) * vary(0.05),
        type: "sine",
        gain: 0.02,
        decay: travelling ? 0.9 : 0.5,
        bend: travelling ? 2.2 : 1.6,
        time: i * 0.05,
        wet: 1,
      });
    }
    this.noise({
      gain: 0.03, decay: travelling ? 1.1 : 0.6,
      highpass: 500, lowpass: 6000, sweep: 2.5, wet: 1,
    });
  }

  /* ---------------------------------------------------------------- *
   * Ambience
   *
   * A handful of nodes that stay running for the whole session, with
   * their gains steered by whatever the loop reports about where the
   * player is. Building them once matters: this runs every frame.
   * ---------------------------------------------------------------- */

  /** A looping filtered noise bed, used for wind, rumble and lava. */
  createBed({ lowpass, highpass, gain, lfoRate, lfoDepth }) {
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const hp = context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = highpass;

    const lp = context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lowpass;

    // A slow wander, so it breathes instead of hissing flatly.
    const lfo = context.createOscillator();
    lfo.frequency.value = lfoRate;
    const lfoGain = context.createGain();
    lfoGain.gain.value = lowpass * lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    const amp = context.createGain();
    amp.gain.value = 0;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(amp);
    amp.connect(this.ambientBus);
    source.start();
    lfo.start();
    return { amp, target: gain };
  }

  startAmbience() {
    if (this.ambience || !this.context || !this.noiseBuffer) {
      return;
    }
    this.ambience = {
      wind: this.createBed({ lowpass: 620, highpass: 160, gain: 0.05, lfoRate: 0.07, lfoDepth: 0.55 }),
      rumble: this.createBed({ lowpass: 130, highpass: 20, gain: 0.07, lfoRate: 0.04, lfoDepth: 0.4 }),
      lava: this.createBed({ lowpass: 260, highpass: 40, gain: 0.09, lfoRate: 0.16, lfoDepth: 0.7 }),
    };
  }

  /** The loop tells the bed where the player is; nothing here inspects state. */
  setScene(scene) {
    Object.assign(this.scene, scene);
    if (this.muffle) {
      // Underwater the world goes dull, which sells being under far more than
      // any single splash does.
      const target = this.scene.submerged ? 620 : 20000;
      const now = this.context.currentTime;
      this.muffle.frequency.cancelScheduledValues(now);
      this.muffle.frequency.setTargetAtTime(target, now, 0.12);
    }
  }

  /**
   * Fades the beds towards the current scene and drops in the occasional
   * one-shot: birds by day, crickets at night, drips underground, and a rare
   * few notes over the top of it all.
   */
  updateAmbience(dt) {
    if (!this.context || !this.ambience) {
      return;
    }
    const { night, enclosed, ember } = this.scene;
    const glide = clamp(dt * 0.6, 0, 1);
    const wants = {
      wind: enclosed ? 0.06 : night ? 0.5 : 1,
      rumble: enclosed ? 1 : 0.05,
      lava: ember ? 1 : 0,
    };
    for (const [name, bed] of Object.entries(this.ambience)) {
      const goal = bed.target * wants[name];
      bed.amp.gain.value += (goal - bed.amp.gain.value) * glide;
    }

    this.nextFlourish -= dt;
    if (this.nextFlourish > 0) {
      return;
    }
    if (ember) {
      this.nextFlourish = 0.6 + Math.random() * 1.6;
      this.crackle();
    } else if (enclosed) {
      this.nextFlourish = 4 + Math.random() * 9;
      this.drip();
    } else if (night) {
      this.nextFlourish = 1.5 + Math.random() * 3;
      this.cricket();
    } else {
      this.nextFlourish = 2.5 + Math.random() * 6;
      Math.random() < 0.72 ? this.birdsong() : this.chime();
    }
  }

  birdsong() {
    const base = 1900 * vary(0.25);
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i++) {
      this.pulse({
        frequency: base * (1 + (Math.random() - 0.5) * 0.4),
        type: "sine",
        gain: 0.012,
        attack: 0.01,
        decay: 0.09 + Math.random() * 0.07,
        bend: 1 + (Math.random() - 0.3) * 0.5,
        time: i * (0.07 + Math.random() * 0.08),
        wet: 1,
      });
    }
  }

  cricket() {
    const base = 4200 * vary(0.08);
    for (let i = 0; i < 4; i++) {
      this.pulse({
        frequency: base, type: "square", gain: 0.004, attack: 0.002,
        decay: 0.02, time: i * 0.045, wet: 0.8,
      });
    }
  }

  drip() {
    this.pulse({
      frequency: 900 * vary(0.3), type: "sine", gain: 0.02,
      decay: 0.3, bend: 0.35, wet: 1,
    });
  }

  crackle() {
    for (let i = 0; i < 3; i++) {
      this.noise({
        gain: 0.014, decay: 0.06, highpass: 900 * vary(0.4), lowpass: 7000,
        time: i * (0.03 + Math.random() * 0.06), wet: 0.9,
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * Music
   *
   * A slow pad walking a short progression, with the occasional note
   * over the top. Loud and present on the title screen, barely there
   * while you are playing so it never gets in the way.
   * ---------------------------------------------------------------- */

  /**
   * Four chords in A minor pentatonic territory: nothing here can clash, so
   * the melody can pick freely over the top of any of them.
   */
  static PROGRESSION = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [196, 246.94, 293.66],
    [164.81, 196, 246.94],
  ];

  /** One chord: detuned pairs with a long swell, so it breathes. */
  playChord(frequencies, length) {
    const context = this.context;
    const start = context.currentTime + 0.05;
    for (const frequency of frequencies) {
      for (const detune of [-6, 6]) {
        const osc = context.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = frequency;
        osc.detune.value = detune;

        const lp = context.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 1200;

        const amp = context.createGain();
        amp.gain.setValueAtTime(0.0001, start);
        amp.gain.linearRampToValueAtTime(0.05, start + length * 0.4);
        amp.gain.linearRampToValueAtTime(0.0001, start + length);

        osc.connect(lp);
        lp.connect(amp);
        amp.connect(this.musicBus);
        osc.start(start);
        osc.stop(start + length + 0.1);
      }
    }
  }

  /** A single melody note on the music bus, over the pad. */
  melodyNote(frequency, length) {
    const context = this.context;
    const start = context.currentTime + 0.05;
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(0.09, start + 0.04);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(amp);
    amp.connect(this.musicBus);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  /**
   * Keeps the pad going. Called every frame; only actually schedules anything
   * when the previous chord is running out.
   */
  updateMusic(dt) {
    if (!this.context || !this.musicBus) {
      return;
    }
    // Front and centre in the menus, a distant hint of it while playing.
    const wanted = (this.scene.menu ? 0.85 : 0.22) * this.getAmbienceLevel();
    const glide = clamp(dt * 0.5, 0, 1);
    this.musicBus.gain.value += (wanted - this.musicBus.gain.value) * glide;

    this.nextChord -= dt;
    if (this.nextChord > 0) {
      return;
    }
    const length = this.scene.menu ? 7.5 : 11;
    this.nextChord = length * 0.82;
    const chord = SoundEngine.PROGRESSION[this.chordStep % SoundEngine.PROGRESSION.length];
    this.chordStep += 1;
    this.playChord(chord, length);

    // A note or two over the chord, more often in the menus.
    const notes = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    const count = this.scene.menu ? 1 + Math.floor(Math.random() * 3) : (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      window.setTimeout(
        () => this.melodyNote(notes[Math.floor(Math.random() * notes.length)], 2.2),
        (0.8 + i * 1.6 + Math.random() * 0.9) * 1000,
      );
    }
  }

  /** A few sparse pentatonic notes, so the quiet is not empty. */
  chime() {
    const scale = [392, 440, 523.25, 587.33, 659.25, 783.99];
    const root = scale[Math.floor(Math.random() * scale.length)];
    this.pulse({ frequency: root, type: "sine", gain: 0.014, attack: 0.02, decay: 1.6, wet: 1 });
    if (Math.random() < 0.6) {
      this.pulse({
        frequency: scale[Math.floor(Math.random() * scale.length)],
        type: "sine", gain: 0.01, attack: 0.02, decay: 1.9, time: 0.35, wet: 1,
      });
    }
  }
}

export const soundEngine = new SoundEngine();
