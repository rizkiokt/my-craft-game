// Instanced block-break particle pool.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCKS, PARTICLE_POOL_SIZE } from "./constants.js";
import { fade } from "./math.js";
import { scene } from "./scene.js";
export const particleGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
export const particleMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
export const particleMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, PARTICLE_POOL_SIZE);
particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
particleMesh.count = PARTICLE_POOL_SIZE;
scene.add(particleMesh);

export const particleDummy = new THREE.Object3D();
export const particleColor = new THREE.Color();
export const particles = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
  active: false,
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  scale: 0,
  life: 0,
  maxLife: 0,
}));

for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
  particleDummy.position.set(0, -9999, 0);
  particleDummy.scale.setScalar(0.0001);
  particleDummy.updateMatrix();
  particleMesh.setMatrixAt(i, particleDummy.matrix);
  particleMesh.setColorAt(i, new THREE.Color(0xffffff));
}

export function getBlockColor(blockType) {
  switch (blockType) {
    case BLOCKS.grass:
      return [0x5faa42, 0x3c7d2d];
    case BLOCKS.dirt:
      return [0x8a5b31, 0x6e4625];
    case BLOCKS.stone:
      return [0x8e949d, 0x757a82];
    case BLOCKS.sand:
      return [0xd7c47e, 0xcbb56f];
    case BLOCKS.wood:
      return [0x9b6b3d, 0x7a4f2c];
    case BLOCKS.pine_wood:
      return [0x6b543b, 0x4b3b2a];
    case BLOCKS.planks:
      return [0xc59a5a, 0x9a7440];
    case BLOCKS.bricks:
      return [0xa75339, 0x7c3524];
    case BLOCKS.glass:
      return [0xcdeefd, 0x91d8ef];
    case BLOCKS.snow:
      return [0xf0f4fb, 0xd5dfef];
    case BLOCKS.ice:
      return [0xa8ddf5, 0xd3f2fb];
    case BLOCKS.pine_leaves:
      return [0x5a7f68, 0x749984];
    case BLOCKS.cactus:
      return [0x4c8a45, 0x6aa85c];
    case BLOCKS.red_sand:
      return [0xc4704a, 0xa85a38];
    case BLOCKS.red_rock:
      return [0xa85c3e, 0x8b4630];
    case BLOCKS.mud:
      return [0x4a3f31, 0x635646];
    case BLOCKS.netherrack:
      return [0x80302a, 0x5e211d];
    case BLOCKS.glowstone:
      return [0xffe08a, 0xd8a648];
    case BLOCKS.lava:
      return [0xff9a3c, 0xd45a18];
    case BLOCKS.portal_frame:
      return [0x4a4a5e, 0x6f6a86];
    case BLOCKS.portal:
      return [0xb27ce8, 0x7a4fd0];
    case BLOCKS.tnt:
      return [0xd44a35, 0xe8ddd2];
    default:
      return [0x6cab57, 0x84c56f];
  }
}

export function spawnParticles(x, y, z, blockType, count, impulseY = 2.4, colors = null) {
  const [baseColor, accentColor] = colors ?? getBlockColor(blockType);
  for (let i = 0; i < particles.length && count > 0; i++) {
    const particle = particles[i];
    if (particle.active) {
      continue;
    }
    particle.active = true;
    particle.position.set(
      x + (Math.random() - 0.5) * 0.8,
      y + Math.random() * 0.9,
      z + (Math.random() - 0.5) * 0.8,
    );
    particle.velocity.set(
      (Math.random() - 0.5) * 3.6,
      impulseY + Math.random() * 2.2,
      (Math.random() - 0.5) * 3.6,
    );
    particle.scale = 0.08 + Math.random() * 0.1;
    particle.life = 0.3 + Math.random() * 0.35;
    particle.maxLife = particle.life;
    particleColor.setHex(Math.random() > 0.5 ? baseColor : accentColor);
    particleMesh.setColorAt(i, particleColor);
    count--;
  }
  particleMesh.instanceColor.needsUpdate = true;
}

/** Pink puff shown when a cat decides it likes you. */
export function spawnHearts(x, y, z, count = 8) {
  spawnParticles(x, y, z, 0, count, 1.6, [0xff77aa, 0xffc2d8]);
}

export function updateParticles(dt) {
  let changed = false;
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    if (!particle.active) {
      continue;
    }
    changed = true;
    particle.life -= dt;
    if (particle.life <= 0) {
      particle.active = false;
      particleDummy.position.set(0, -9999, 0);
      particleDummy.scale.setScalar(0.0001);
      particleDummy.updateMatrix();
      particleMesh.setMatrixAt(i, particleDummy.matrix);
      continue;
    }
    particle.velocity.y -= 13 * dt;
    particle.position.addScaledVector(particle.velocity, dt);
    const fade = particle.life / particle.maxLife;
    particleDummy.position.copy(particle.position);
    particleDummy.scale.setScalar(particle.scale * fade);
    particleDummy.updateMatrix();
    particleMesh.setMatrixAt(i, particleDummy.matrix);
  }
  if (changed) {
    particleMesh.instanceMatrix.needsUpdate = true;
  }
}
