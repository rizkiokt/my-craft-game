// Procedural Web Audio effects.

import { BLOCKS } from "./constants.js";
import { clamp } from "./math.js";
import { settings } from "./settings.js";
export class SoundEngine {
  constructor() {
    this.AudioContextCtor = window.AudioContext || window.webkitAudioContext || null;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.enabled = false;
  }

  ensureContext() {
    if (!this.AudioContextCtor || this.context) {
      return this.context;
    }
    try {
      this.context = new this.AudioContextCtor();
      this.master = this.context.createGain();
      this.master.gain.value = this.getMasterLevel();
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
      this.enabled = true;
    } catch {
      this.context = null;
      this.master = null;
      this.enabled = false;
    }
    return this.context;
  }

  getMasterLevel() {
    return 0.14 * clamp(settings.volume / 100, 0, 1);
  }

  applyVolume() {
    if (this.master) {
      this.master.gain.value = this.getMasterLevel();
    }
  }

  createNoiseBuffer() {
    if (!this.context) {
      return null;
    }
    const length = Math.floor(this.context.sampleRate * 0.22);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return buffer;
  }

  resume() {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  pulse({ frequency = 220, type = "sine", gain = 0.05, attack = 0.005, decay = 0.12, detune = 0, time = 0 } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }
    const start = context.currentTime + time;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.detune.setValueAtTime(detune, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(start);
    osc.stop(start + decay + 0.02);
  }

  noise({ gain = 0.035, decay = 0.1, highpass = 340, lowpass = 1800, time = 0 } = {}) {
    const context = this.ensureContext();
    if (!context || !this.master || !this.noiseBuffer) {
      return;
    }
    const start = context.currentTime + time;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const hp = context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(highpass, start);

    const lp = context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(lowpass, start);

    const amp = context.createGain();
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(amp);
    amp.connect(this.master);
    source.start(start);
    source.stop(start + decay + 0.03);
  }

  ui(opening) {
    this.resume();
    this.pulse({
      frequency: opening ? 620 : 460,
      type: "triangle",
      gain: 0.028,
      decay: 0.09,
    });
  }

  select() {
    this.resume();
    this.pulse({
      frequency: 390,
      type: "square",
      gain: 0.018,
      decay: 0.05,
    });
  }

  footstep(blockType, sprinting) {
    this.resume();
    const isHard = blockType === BLOCKS.stone || blockType === BLOCKS.bricks || blockType === BLOCKS.furnace;
    this.noise({
      gain: sprinting ? 0.03 : 0.022,
      decay: isHard ? 0.05 : 0.08,
      highpass: isHard ? 520 : 260,
      lowpass: isHard ? 1700 : 1100,
    });
    this.pulse({
      frequency: isHard ? 120 : 88,
      type: "triangle",
      gain: sprinting ? 0.02 : 0.014,
      decay: 0.08,
    });
  }

  jump() {
    this.resume();
    this.pulse({ frequency: 240, type: "square", gain: 0.02, decay: 0.08 });
    this.pulse({ frequency: 360, type: "triangle", gain: 0.016, decay: 0.12, time: 0.015 });
  }

  land(speed) {
    this.resume();
    const intensity = clamp((Math.abs(speed) - 4) / 10, 0.25, 1);
    this.noise({
      gain: 0.018 + intensity * 0.03,
      decay: 0.06 + intensity * 0.08,
      highpass: 140,
      lowpass: 900,
    });
    this.pulse({
      frequency: 70 - intensity * 14,
      type: "triangle",
      gain: 0.012 + intensity * 0.016,
      decay: 0.12 + intensity * 0.06,
    });
  }

  hit(blockType, finished = false) {
    this.resume();
    const glassy = blockType === BLOCKS.glass;
    const woody = blockType === BLOCKS.wood || blockType === BLOCKS.planks || blockType === BLOCKS.crafting_table;
    const stony = blockType === BLOCKS.stone || blockType === BLOCKS.bricks || blockType === BLOCKS.coal_ore || blockType === BLOCKS.iron_ore || blockType === BLOCKS.furnace;
    this.noise({
      gain: finished ? 0.04 : 0.024,
      decay: finished ? 0.12 : 0.06,
      highpass: glassy ? 900 : woody ? 260 : 420,
      lowpass: glassy ? 3200 : stony ? 1800 : 1300,
    });
    this.pulse({
      frequency: glassy ? 780 : woody ? 180 : 140,
      type: glassy ? "triangle" : "square",
      gain: finished ? 0.02 : 0.012,
      decay: finished ? 0.1 : 0.05,
    });
  }

  place(blockType) {
    this.resume();
    const bright = blockType === BLOCKS.glass;
    this.pulse({
      frequency: bright ? 520 : 160,
      type: bright ? "triangle" : "square",
      gain: 0.014,
      decay: 0.05,
    });
    this.noise({
      gain: bright ? 0.012 : 0.018,
      decay: 0.05,
      highpass: bright ? 760 : 220,
      lowpass: bright ? 2400 : 1200,
    });
  }

  craft() {
    this.resume();
    this.pulse({ frequency: 392, type: "triangle", gain: 0.018, decay: 0.08 });
    this.pulse({ frequency: 494, type: "triangle", gain: 0.016, decay: 0.1, time: 0.04 });
    this.pulse({ frequency: 587, type: "triangle", gain: 0.014, decay: 0.12, time: 0.08 });
  }
}

export const soundEngine = new SoundEngine();
