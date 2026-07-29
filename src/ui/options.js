// Options screen sliders, toggles and their application.

import { CHUNK_SIZE } from "../constants.js";
import { toggleFullscreen } from "../fullscreen.js";
import { camera, scene } from "../scene.js";
import { saveSettings, settings } from "../settings.js";
import { soundEngine } from "../sound.js";
import { world } from "../world.js";
/* ------------------------------------------------------------------ *
 * Options
 * ------------------------------------------------------------------ */

export const optSensitivity = document.getElementById("opt-sensitivity");
export const optFov = document.getElementById("opt-fov");
export const optVolume = document.getElementById("opt-volume");
export const optRender = document.getElementById("opt-render");
export const optInvert = document.getElementById("opt-invert");
export const optBobbing = document.getElementById("opt-bobbing");
export const optAutosave = document.getElementById("opt-autosave");
export const optFullscreen = document.getElementById("opt-fullscreen");
export const valSensitivity = document.getElementById("val-sensitivity");
export const valFov = document.getElementById("val-fov");
export const valVolume = document.getElementById("val-volume");
export const valRender = document.getElementById("val-render");

export function applySettings() {
  world.setRenderDistance(settings.renderDistance);
  const viewDistance = world.loadRadius * CHUNK_SIZE;
  scene.fog.near = viewDistance * 1.5;
  scene.fog.far = viewDistance * 3.7;
  camera.far = Math.max(180, viewDistance * 4);
  camera.updateProjectionMatrix();
  soundEngine.applyVolume();
}

export function syncOptionsScreen() {
  optSensitivity.value = String(settings.sensitivity);
  optFov.value = String(settings.fov);
  optVolume.value = String(settings.volume);
  optRender.value = String(settings.renderDistance);
  valSensitivity.textContent = `${settings.sensitivity}%`;
  valFov.textContent = String(settings.fov);
  valVolume.textContent = `${settings.volume}%`;
  valRender.textContent = `${settings.renderDistance} chunk${settings.renderDistance === 1 ? "" : "s"}`;
  optInvert.textContent = `Invert Mouse: ${settings.invertMouse ? "ON" : "OFF"}`;
  optBobbing.textContent = `View Bobbing: ${settings.viewBobbing ? "ON" : "OFF"}`;
  optAutosave.textContent = `Autosave: ${settings.autosave ? "ON" : "OFF"}`;
  optFullscreen.textContent = `Fullscreen: ${document.fullscreenElement ? "ON" : "OFF"}`;
}

export function updateSetting(key, value) {
  settings[key] = value;
  saveSettings();
  applySettings();
  syncOptionsScreen();
}

/** Attaches this module's DOM listeners. Called once from main.js. */
export function installOptionsHandlers() {
  optSensitivity.addEventListener("input", () => updateSetting("sensitivity", Number(optSensitivity.value)));
  optFov.addEventListener("input", () => updateSetting("fov", Number(optFov.value)));
  optVolume.addEventListener("input", () => updateSetting("volume", Number(optVolume.value)));
  optRender.addEventListener("input", () => updateSetting("renderDistance", Number(optRender.value)));
  optInvert.addEventListener("click", () => updateSetting("invertMouse", !settings.invertMouse));
  optBobbing.addEventListener("click", () => updateSetting("viewBobbing", !settings.viewBobbing));
  optAutosave.addEventListener("click", () => updateSetting("autosave", !settings.autosave));
  optFullscreen.addEventListener("click", () => {
    toggleFullscreen();
    window.setTimeout(syncOptionsScreen, 120);
  });
}

