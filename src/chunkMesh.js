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
      if (!this.meshes.has(key) || this.dirty.has(key)) {
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
  }

  disposeMesh(mesh) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  }

  rebuildChunk(cx, cz) {
    const key = this.world.getChunkKey(cx, cz);
    const previous = this.meshes.get(key);
    if (previous) {
      this.disposeMesh(previous);
    }

    const geometry = this.buildGeometry(cx, cz);
    if (!geometry) {
      this.meshes.delete(key);
      return;
    }

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.userData.chunkKey = key;
    this.scene.add(mesh);
    this.meshes.set(key, mesh);
  }

  buildGeometry(cx, cz) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    let vertexOffset = 0;
    const maxY = this.world.getChunkMaxY(cx, cz);
    // Light must be current before any face samples it.
    this.world.ensureLight(cx, cz);

    /** Pushes one quad with a flat brightness taken from the light volume. */
    const pushQuad = (corners, normal, tileIndex, brightness, origin, scale) => {
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
          origin[1] + corner[1] * scale[1],
          origin[2] + (corner[2] - 0.5) * scale[2] + 0.5,
        );
        normals.push(normal[0], normal[1], normal[2]);
        uvs.push(quadUvs[i][0], quadUvs[i][1]);
        colors.push(brightness, brightness, brightness);
      }
      indices.push(
        vertexOffset,
        vertexOffset + 1,
        vertexOffset + 2,
        vertexOffset,
        vertexOffset + 2,
        vertexOffset + 3,
      );
      vertexOffset += 4;
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
            );
          }
        }
      }
    }

    if (positions.length === 0) {
      return null;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  getMeshes() {
    return [...this.meshes.values()];
  }
}

export const worldMaterial = new THREE.MeshLambertMaterial({
  map: atlasInfo.texture,
  // Per-vertex brightness carries the block light baked by the mesher.
  vertexColors: true,
});
export const chunkMeshes = new ChunkMeshManager(world, scene, worldMaterial, atlasInfo);
