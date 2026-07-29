// Face-culled chunk geometry built from dirty chunks.

import * as THREE from "../node_modules/three/build/three.module.js";
import { BLOCKS, CHUNK_SIZE, FACE_DEFS, MAX_LIGHT, MIN_LIGHT_FACTOR, MIN_WORLD_Y } from "./constants.js";

/** A torch is a thin post standing in the middle of its cell. */
const TORCH_WIDTH = 0.16;
const TORCH_HEIGHT = 0.62;

/** Maps a 0-15 light level onto a vertex tint. */
function lightToBrightness(level) {
  return MIN_LIGHT_FACTOR + (1 - MIN_LIGHT_FACTOR) * (level / MAX_LIGHT);
}
import { scene } from "./scene.js";
import { atlasInfo, atlasUv, getTileIndex } from "./textures.js";
import { world } from "./world.js";
export class ChunkMeshManager {
  constructor(world, scene, material, atlasInfo) {
    this.world = world;
    this.scene = scene;
    this.material = material;
    this.atlasInfo = atlasInfo;
    this.meshes = new Map();
    this.waterMeshes = new Map();
    this.dirty = new Set();
  }

  markDirtyChunk(cx, cz) {
    this.dirty.add(this.world.getChunkKey(cx, cz));
  }

  markDirtyAtWorld(wx, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    this.markDirtyChunk(cx, cz);
    // A torch lights well past its own chunk, so neighbours are redrawn too.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      this.markDirtyChunk(cx + dx, cz + dz);
    }
    if (((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === 0) {
      this.markDirtyChunk(cx - 1, cz);
    }
    if (((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === CHUNK_SIZE - 1) {
      this.markDirtyChunk(cx + 1, cz);
    }
    if (((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === 0) {
      this.markDirtyChunk(cx, cz - 1);
    }
    if (((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE === CHUNK_SIZE - 1) {
      this.markDirtyChunk(cx, cz + 1);
    }
  }

  syncLoadedChunks() {
    for (const key of this.world.loadedKeys) {
      if ((!this.meshes.has(key) && !this.waterMeshes.has(key)) || this.dirty.has(key)) {
        const [cx, cz] = key.split(",").map(Number);
        this.rebuildChunk(cx, cz);
        this.dirty.delete(key);
      }
    }

    for (const [key, mesh] of this.meshes) {
      if (!this.world.loadedKeys.has(key)) {
        this.disposeMesh(mesh);
        this.meshes.delete(key);
      }
    }
    for (const key of [...this.waterMeshes.keys()]) {
      if (!this.world.loadedKeys.has(key)) {
        this.disposeWater(key);
      }
    }
  }

  disposeMesh(mesh) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  }

  disposeWater(key) {
    const water = this.waterMeshes.get(key);
    if (water) {
      this.scene.remove(water);
      water.geometry.dispose();
      this.waterMeshes.delete(key);
    }
  }

  rebuildChunk(cx, cz) {
    const key = this.world.getChunkKey(cx, cz);
    const previous = this.meshes.get(key);
    if (previous) {
      this.disposeMesh(previous);
    }

    const built = this.buildGeometry(cx, cz);
    this.disposeWater(key);

    // Solid and water are separate meshes. Keeping them apart matters: only
    // the solid one belongs in the crosshair raycast, and an empty mesh in
    // that list would be walked every frame for nothing.
    if (built.solid) {
      const mesh = new THREE.Mesh(built.solid, this.material);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.userData.chunkKey = key;
      this.scene.add(mesh);
      this.meshes.set(key, mesh);
    } else {
      this.meshes.delete(key);
    }

    if (built.water) {
      const water = new THREE.Mesh(built.water, waterMaterial);
      water.frustumCulled = true;
      water.matrixAutoUpdate = false;
      water.updateMatrix();
      // Drawn after the solid world, so what is behind it shows through.
      water.renderOrder = 1;
      this.scene.add(water);
      this.waterMeshes.set(key, water);
    }
  }

  buildGeometry(cx, cz) {
    // Water is collected separately so it can be drawn translucent, after the
    // solid world, with what is behind it showing through.
    const solid = { positions: [], normals: [], uvs: [], colors: [], indices: [], offset: 0 };
    const liquid = { positions: [], normals: [], uvs: [], colors: [], indices: [], offset: 0 };
    let bucket = solid;
    const maxY = this.world.getChunkMaxY(cx, cz);
    // Light must be current before any face samples it.
    this.world.ensureLight(cx, cz);

    /** Pushes one quad with a flat brightness taken from the light volume. */
    const pushQuad = (corners, normal, tileIndex, brightness, origin, scale, drop = 0) => {
      const { positions, normals, uvs, colors, indices } = bucket;
      const quadUvs = [
        atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 0, 0),
        atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 0, 1),
        atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 1, 1),
        atlasUv(this.atlasInfo.columns, this.atlasInfo.rows, tileIndex, 1, 0),
      ];
      for (let i = 0; i < 4; i++) {
        const corner = corners[i];
        positions.push(
          origin[0] + (corner[0] - 0.5) * scale[0] + 0.5,
          origin[1] + corner[1] * scale[1] - (corner[1] > 0 ? drop : 0),
          origin[2] + (corner[2] - 0.5) * scale[2] + 0.5,
        );
        normals.push(normal[0], normal[1], normal[2]);
        uvs.push(quadUvs[i][0], quadUvs[i][1]);
        colors.push(brightness, brightness, brightness);
      }
      indices.push(
        bucket.offset,
        bucket.offset + 1,
        bucket.offset + 2,
        bucket.offset,
        bucket.offset + 2,
        bucket.offset + 3,
      );
      bucket.offset += 4;
    };

    for (let y = MIN_WORLD_Y; y <= maxY; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const wx = cx * CHUNK_SIZE + x;
          const wz = cz * CHUNK_SIZE + z;
          const blockType = this.world.getBlock(wx, y, wz);
          if (blockType === BLOCKS.air) {
            continue;
          }
          const isWater = blockType === BLOCKS.water;
          bucket = isWater ? liquid : solid;
          // A surface below the block top is what makes a shoreline read as
          // water rather than as blue stone, and lets you see over the edge.
          const drop = isWater && this.world.getBlock(wx, y + 1, wz) !== BLOCKS.water
            ? WATER_DROP
            : 0;

          // A torch is a slim post rather than a full cube.
          if (blockType === BLOCKS.torch) {
            const lit = lightToBrightness(MAX_LIGHT);
            for (const face of FACE_DEFS) {
              if (face.key === "ny") {
                continue;
              }
              pushQuad(
                face.corners,
                face.normal,
                getTileIndex(blockType, face.key),
                lit,
                [wx, y, wz],
                [TORCH_WIDTH, TORCH_HEIGHT, TORCH_WIDTH],
              );
            }
            continue;
          }

          for (const face of FACE_DEFS) {
            const nx = face.normal[0];
            const ny = face.normal[1];
            const nz = face.normal[2];
            const neighbour = this.world.getBlock(wx + nx, y + ny, wz + nz);
            // Faces between two of the same liquid are never seen.
            if (neighbour === blockType && !this.world.isSolid(wx, y, wz)) {
              continue;
            }
            if (this.world.isSolid(wx + nx, y + ny, wz + nz)) {
              continue;
            }

            // A face is lit by whatever is in the open cell it looks into.
            const brightness = lightToBrightness(this.world.getLight(wx + nx, y + ny, wz + nz));
            pushQuad(
              face.corners,
              face.normal,
              getTileIndex(blockType, face.key),
              brightness,
              [wx, y, wz],
              [1, 1, 1],
              drop,
            );
          }
        }
      }
    }

    return { solid: toGeometry(solid), water: toGeometry(liquid) };
  }

  getMeshes() {
    return [...this.meshes.values()];
  }
}

/** How far below the block top the water surface sits. */
const WATER_DROP = 0.12;

/** One buffer set to a geometry, or null when the pass collected nothing. */
function toGeometry(bucket) {
  if (bucket.positions.length === 0) {
    return null;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(bucket.positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(bucket.normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(bucket.uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(bucket.colors, 3));
  geometry.setIndex(bucket.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export const worldMaterial = new THREE.MeshLambertMaterial({
  map: atlasInfo.texture,
  // Per-vertex brightness carries the block light baked by the mesher.
  vertexColors: true,
});
/**
 * Water: see-through, lit like everything else, and not writing depth so two
 * layers of it do not punch holes in each other.
 */
export const waterMaterial = new THREE.MeshLambertMaterial({
  map: atlasInfo.texture,
  vertexColors: true,
  transparent: true,
  opacity: 0.66,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export const chunkMeshes = new ChunkMeshManager(world, scene, worldMaterial, atlasInfo);
