// Renderer, camera, lights, sky and clouds.

import * as THREE from "../node_modules/three/build/three.module.js";
import { CLOUD_COUNT, PI } from "./constants.js";
import { canvas } from "./dom.js";
import { clamp, hash3 } from "./math.js";
import { state } from "./state.js";
export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd0ff);
scene.fog = new THREE.Fog(0x9fd0ff, 48, 118);

export const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 180);
camera.rotation.order = "YXZ";

export const hemisphereLight = new THREE.HemisphereLight(0xc8e4ff, 0x43553c, 1.7);
scene.add(hemisphereLight);

export const sunLight = new THREE.DirectionalLight(0xfff2cf, 1.25);
sunLight.position.set(32, 48, 18);
scene.add(sunLight);

export const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

export function createClouds() {
  const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const puff = new THREE.Group();
    const seed = i * 17.37;
    const count = 3 + (i % 3);
    for (let j = 0; j < count; j++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(6 + (j % 2) * 2, 1.6 + ((j + i) % 2) * 0.4, 3.8),
        cloudMaterial,
      );
      box.position.set(j * 3.8 - count * 1.6, Math.sin(seed + j) * 0.35, Math.cos(seed + j) * 1.1);
      puff.add(box);
    }
    puff.position.set(
      (hash3(seed, 2, 9) - 0.5) * 220,
      28 + hash3(seed, 3, 8) * 18,
      (hash3(seed, 5, 1) - 0.5) * 220,
    );
    puff.userData.speed = 1.6 + hash3(seed, 7, 4) * 2.2;
    puff.userData.drift = hash3(seed, 8, 2) * PI * 2;
    cloudGroup.add(puff);
  }
}

createClouds();

export function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export const daySky = new THREE.Color(0x9fd0ff);
export const duskSky = new THREE.Color(0xf2b26a);
export const nightSky = new THREE.Color(0x0c1324);
export const fogColor = new THREE.Color();
export const skyColor = new THREE.Color();

export function updateLighting() {
  const sunAngle = state.dayTime * PI * 2 - PI / 2;
  const daylight = clamp(Math.sin(sunAngle) * 0.5 + 0.5, 0, 1);
  const dusk = 1 - Math.abs(daylight - 0.5) * 2;
  skyColor.copy(nightSky).lerp(duskSky, dusk * 0.35).lerp(daySky, daylight);
  fogColor.copy(nightSky).lerp(daySky, daylight * 0.9);
  scene.background.copy(skyColor);
  scene.fog.color.copy(fogColor);
  hemisphereLight.intensity = 0.28 + daylight * 1.4;
  sunLight.intensity = 0.18 + daylight * 1.25;
  sunLight.position.set(
    Math.cos(sunAngle) * 38,
    14 + Math.sin(sunAngle) * 52,
    Math.sin(sunAngle * 0.7) * 24,
  );
  renderer.toneMappingExposure = 0.72 + daylight * 0.38;
  for (const cloud of cloudGroup.children) {
    cloud.position.x += cloud.userData.speed * 0.016;
    cloud.position.z += Math.sin(state.elapsed * 0.15 + cloud.userData.drift) * 0.01;
    if (cloud.position.x > 140) {
      cloud.position.x = -140;
    }
  }
}
