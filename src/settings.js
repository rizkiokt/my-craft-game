// Player options and their persistence.

import { DEFAULT_RENDER_DISTANCE, MAX_RENDER_DISTANCE, MIN_RENDER_DISTANCE, SETTINGS_KEY } from "./constants.js";
import { clamp } from "./math.js";
export const DEFAULT_SETTINGS = {
  sensitivity: 100,
  fov: 75,
  volume: 100,
  ambience: 70,
  renderDistance: DEFAULT_RENDER_DISTANCE,
  invertMouse: false,
  viewBobbing: true,
  autosave: true,
  // "auto" shows the on-screen pad on anything with a touch screen.
  touchControls: "auto",
};

export const settings = { ...DEFAULT_SETTINGS };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof saved?.[key] === typeof DEFAULT_SETTINGS[key]) {
        settings[key] = saved[key];
      }
    }
    settings.renderDistance = clamp(
      Math.round(settings.renderDistance),
      MIN_RENDER_DISTANCE,
      MAX_RENDER_DISTANCE,
    );
  } catch {
    /* corrupt settings just fall back to defaults */
  }
}

export function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage is optional */
  }
}
