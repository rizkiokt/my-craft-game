// Block targeting, breaking and placing.

import * as THREE from "../node_modules/three/build/three.module.js";
import { chunkMeshes } from "./chunkMesh.js";
import { BLOCKS, BLOCK_NAMES, INTERACTION_RANGE, MAX_BUILD_HEIGHT, MIN_WORLD_Y, PLAYER_HEIGHT, PLAYER_RADIUS, VEHICLE_ITEMS } from "./constants.js";
import { getLevel, getXpForBlock, grantXp } from "./enchanting.js";
import { getBodyHeight, getBodyRadius, getReach } from "./growth.js";
import { addItem, canMineBlock, consumeItem, getBreakDamage, getBreakHardness, getDropCount, getDropForBlock, getInteractionCooldown, getItemCount, getRequiredToolName, getSelectedItem, isCollectibleBlock, isCreative, isPlaceableItem } from "./items.js";
import { chestKeyAt, emptyChestInto } from "./crafting.js";
import { clamp, floorVector } from "./math.js";
import { CAT_COATS, passiveMobs } from "./mobs.js";
import { npcs } from "./npcs.js";
import { spawnHearts, spawnParticles } from "./particles.js";
import { clearPortalAt, describeFrameProblem, extinguishAround, lightPortal } from "./portals.js";
import { isCharge, lightTnt } from "./tnt.js";
import { markDone } from "./book.js";
import { cars, enterCar, honk, isDriving, vehicleName } from "./vehicle.js";
import { applyPlayerToCamera, eyePosition, hasCollision, lookDirection } from "./player.js";
import { scene } from "./scene.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { showToast, updateHotbar } from "./ui/hud.js";
import { openStation, updateInventoryPanel } from "./ui/inventory.js";
import { openPortalPicker } from "./ui/portals.js";
import { world } from "./world.js";

/** Blocks that open a crafting station when used. */
export const STATION_BLOCKS = {
  [BLOCKS.crafting_table]: "table",
  [BLOCKS.furnace]: "furnace",
  [BLOCKS.enchanting_table]: "enchant",
  [BLOCKS.chest]: "chest",
};
export const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
export const highlightMaterial = new THREE.LineBasicMaterial({
  color: 0xffe899,
  transparent: true,
  opacity: 0.95,
});
export const targetHighlight = new THREE.LineSegments(highlightGeometry, highlightMaterial);
targetHighlight.visible = false;
scene.add(targetHighlight);

export const breakOverlayMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd57e,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
export const breakOverlay = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), breakOverlayMaterial);
breakOverlay.visible = false;
breakOverlay.renderOrder = 3;
scene.add(breakOverlay);

export const highlightBaseColor = new THREE.Color(0xffe899);
export const highlightDamageColor = new THREE.Color(0xff7f52);
export const workingHighlightColor = new THREE.Color();

export const raycaster = new THREE.Raycaster();
raycaster.far = INTERACTION_RANGE;

export function getTargetKey(target) {
  return target ? `${target.block.x},${target.block.y},${target.block.z}` : null;
}

export function resetBreakState() {
  state.breakState.key = null;
  state.breakState.blockType = BLOCKS.air;
  state.breakState.progress = 0;
  state.breakState.hardness = 1;
  state.breakState.lastHitTime = -999;
  state.breakState.pulse = 0;
  updateBreakVisuals();
}

export function updateBreakVisuals() {
  const activeKey = getTargetKey(state.target);
  const showDamage =
    state.target &&
    state.breakState.key === activeKey &&
    state.breakState.progress > 0;

  if (!showDamage) {
    highlightMaterial.color.copy(highlightBaseColor);
    highlightMaterial.opacity = 0.95;
    breakOverlay.visible = false;
    return;
  }

  const fraction = clamp(state.breakState.progress / state.breakState.hardness, 0, 1);
  workingHighlightColor.copy(highlightBaseColor).lerp(highlightDamageColor, fraction);
  highlightMaterial.color.copy(workingHighlightColor);
  highlightMaterial.opacity = 0.78 + fraction * 0.2;
  breakOverlay.visible = true;
  breakOverlay.position.copy(targetHighlight.position);
  breakOverlay.scale.setScalar(0.96 + fraction * 0.08 + state.breakState.pulse * 0.035);
  breakOverlayMaterial.color.copy(workingHighlightColor);
  breakOverlayMaterial.opacity = 0.04 + fraction * 0.16 + state.breakState.pulse * 0.06;
}

/** True when the player's own box overlaps a block cell. */
function playerOverlapsCell(x, y, z) {
  const player = state.player;
  const radius = getBodyRadius();
  return x + 1 > player.x - radius && x < player.x + radius
    && y + 1 > player.y && y < player.y + getBodyHeight()
    && z + 1 > player.z - radius && z < player.z + radius;
}

/**
 * A block goes anywhere empty that is not inside you.
 *
 * This used to ask whether a *player* could stand in the target cell, which
 * got it wrong twice over: it refused any spot with a block above it, so a
 * gap under an overhang could not be filled and the top of a portal frame
 * could not be closed, while never actually checking where you were standing.
 */
export function canPlaceBlock(x, y, z) {
  if (y < MIN_WORLD_Y || y > MAX_BUILD_HEIGHT) {
    return false;
  }
  if (world.isSolid(x, y, z)) {
    return false;
  }
  return !playerOverlapsCell(x, y, z);
}

export function updateTarget() {
  applyPlayerToCamera();
  // Always aim from the eye so first and third person share the same reach.
  raycaster.set(eyePosition, lookDirection);
  raycaster.far = getReach();
  const intersections = raycaster.intersectObjects(chunkMeshes.getMeshes(), false);
  const hit = intersections[0];

  // Anything standing in front of a block wins the crosshair.
  const reach = Math.min(hit?.distance ?? Infinity, getReach());
  const creature = passiveMobs.raycast(raycaster, reach);
  const friend = npcs.raycast(raycaster, reach);
  // Whichever of the two is nearer takes the crosshair.
  const carHit = cars.raycast(raycaster, reach);
  const friendFirst = friend && (!creature || friend.distance <= creature.distance);
  const nearestBody = friendFirst ? friend.distance : creature?.distance ?? Infinity;
  // A car is a body like the others: nearest one under the crosshair wins.
  const carFirst = carHit && carHit.distance <= nearestBody;
  state.carTarget = carFirst ? carHit.car : null;
  state.npcTarget = !carFirst && friendFirst ? friend.npc : null;
  state.entityTarget = !carFirst && !friendFirst && creature ? creature.entity : null;

  if (!hit || !hit.face) {
    state.target = null;
    targetHighlight.visible = false;
    breakOverlay.visible = false;
    updateBreakVisuals();
    return;
  }

  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round();
  const blockCoords = floorVector(hit.point.clone().addScaledVector(normal, -0.01));
  const placeCoords = floorVector(hit.point.clone().addScaledVector(normal, 0.01));
  const blockType = world.getBlock(blockCoords.x, blockCoords.y, blockCoords.z);

  if (blockType === BLOCKS.air) {
    state.target = null;
    targetHighlight.visible = false;
    breakOverlay.visible = false;
    updateBreakVisuals();
    return;
  }

  state.target = {
    block: { ...blockCoords, type: blockType },
    place: placeCoords,
    normal: { x: normal.x, y: normal.y, z: normal.z },
    distance: hit.distance,
  };

  targetHighlight.visible = true;
  targetHighlight.position.set(
    blockCoords.x + 0.5,
    blockCoords.y + 0.5,
    blockCoords.z + 0.5,
  );
  updateBreakVisuals();
}

/** Lights the frame a block belongs to, if it is finished, and asks where to. */
function tryLightPortal(x, y, z) {
  const lit = lightPortal(x, y, z);
  if (!lit.cells) {
    return lit;
  }
  soundEngine.portal(false);
  chunkMeshes.syncLoadedChunks();
  openPortalPicker(lit.cells, lit.destinationId);
  return null;
}

export function interact(breaking, isPress = false) {
  updateTarget();

  // Behind the wheel the right button is the horn and nothing else: reaching
  // out to place a block from the driving seat only ever went wrong.
  if (isDriving() && !breaking) {
    if (isPress) {
      state.usePressed = false;
      honk();
    }
    return;
  }

  // A car is greeted before any block too, and for the same reason as the
  // animals: one parked against open sky has no block behind it to fall back
  // on, so this has to run before the no-target bail below.
  if (!breaking && state.carTarget) {
    if (isPress) {
      state.usePressed = false;
      const name = vehicleName(state.carTarget);
      enterCar(state.carTarget);
      showToast(`Driving the ${name} — sneak to get out`);
    }
    return;
  }

  // Someone under the crosshair is greeted before any block is considered.
  const friend = state.npcTarget;
  if (!breaking && friend) {
    if (isPress) {
      state.usePressed = false;
      const following = npcs.greet(friend);
      if (following) {
        markDone("friend");
      }
      showToast(following ? `${friend.name} is coming with you` : `${friend.name} waits here`);
      soundEngine.ui(following);
      state.saveDirty = true;
    }
    return;
  }

  // A creature under the crosshair is handled before any block, because one
  // standing against open sky has no block behind it to fall back on.
  const creature = state.entityTarget;
  if (!breaking && creature && creature.kind === "cat") {
    if (isPress) {
      // Spend the press so holding the button cannot toggle sitting again.
      state.usePressed = false;
      if (!creature.tamed) {
        passiveMobs.tame(creature);
        spawnHearts(creature.x, creature.y + 0.5, creature.z);
        soundEngine.meow();
        showToast(`${CAT_COATS[creature.coatIndex]?.name ?? "The"} cat is your friend now`);
        markDone("cat");
      } else {
        const sitting = passiveMobs.toggleSit(creature);
        soundEngine.meow();
        showToast(sitting ? "Cat sits down and waits" : "Cat follows you again");
      }
      state.saveDirty = true;
    }
    return;
  }

  if (!state.target) {
    if (breaking) {
      resetBreakState();
    }
    return;
  }
  const cooldown = getInteractionCooldown(state.target.block.type, breaking);
  if (state.elapsed - state.lastInteractionTime < cooldown) {
    return;
  }
  state.lastInteractionTime = state.elapsed;
  state.armSwing = 1;

  if (breaking) {
    if (!canMineBlock(state.target.block.type)) {
      showToast(`Need a ${getRequiredToolName(state.target.block.type)} for ${BLOCK_NAMES[state.target.block.type]}`);
      resetBreakState();
      return;
    }
    const targetKey = getTargetKey(state.target);
    if (state.breakState.key !== targetKey || state.breakState.blockType !== state.target.block.type) {
      state.breakState.key = targetKey;
      state.breakState.blockType = state.target.block.type;
      state.breakState.progress = 0;
      state.breakState.hardness = getBreakHardness(state.target.block.type);
    }
    state.breakState.progress += getBreakDamage(state.target.block.type);
    state.breakState.lastHitTime = state.elapsed;
    state.breakState.pulse = 1;
    spawnParticles(
      state.target.block.x + 0.5,
      state.target.block.y + 0.5,
      state.target.block.z + 0.5,
      state.target.block.type,
      3,
      0.85,
    );
    soundEngine.hit(state.target.block.type, false);
    if (state.breakState.progress < state.breakState.hardness) {
      updateBreakVisuals();
      return;
    }
    const brokenType = state.target.block.type;
    if (brokenType === BLOCKS.chest) {
      const moved = emptyChestInto(
        chestKeyAt(state.target.block.x, state.target.block.y, state.target.block.z),
      );
      if (moved > 0) {
        showToast(`Recovered ${moved} item${moved === 1 ? "" : "s"} from the chest`);
      }
    }
    if (world.setBlock(state.target.block.x, state.target.block.y, state.target.block.z, BLOCKS.air)) {
      chunkMeshes.markDirtyAtWorld(state.target.block.x, state.target.block.z);
      // Break the frame and the portal goes out with it, rather than being
      // left hanging there still working.
      if (brokenType === BLOCKS.portal_frame) {
        extinguishAround(state.target.block.x, state.target.block.y, state.target.block.z);
      } else if (brokenType === BLOCKS.portal) {
        clearPortalAt(state.target.block.x, state.target.block.y, state.target.block.z);
      }
      const dropId = getDropForBlock(brokenType);
      if (dropId != null && isCollectibleBlock(brokenType) && !isCreative()) {
        const amount = getDropCount(brokenType);
        addItem(dropId, amount);
        showToast(`Collected ${amount > 1 ? `${amount} ` : ""}${BLOCK_NAMES[dropId]}`);

        const xp = getXpForBlock(brokenType);
        if (xp > 0 && grantXp(xp) > 0) {
          showToast(`Level up — level ${getLevel()}`);
          soundEngine.craft();
        }
      }
      spawnParticles(
        state.target.block.x + 0.5,
        state.target.block.y + 0.5,
        state.target.block.z + 0.5,
        brokenType,
        10,
        2.2,
      );
      soundEngine.hit(brokenType, true);
      state.stats.broken += 1;
      state.saveDirty = true;
    }
    resetBreakState();
  } else {
    resetBreakState();

    // Right-clicking a station opens it; sneak to place a block against it.
    // Touching TNT with a free hand lights the fuse. Holding a block still
    // places, exactly as it does for a portal frame.
    if (isCharge(state.target.block.type)
      && !state.sneaking
      && !isPlaceableItem(getSelectedItem())) {
      if (isPress) {
        state.usePressed = false;
        const name = lightTnt(state.target.block.x, state.target.block.y, state.target.block.z);
        if (name) {
          showToast(`${name} lit — stand back`);
        }
      }
      return;
    }

    // Touching a frame with a free hand lights it. Holding a block still
    // places, or the frame would be the one building material you cannot
    // stack a second one on top of.
    if (state.target.block.type === BLOCKS.portal_frame
      && !state.sneaking
      && !isPlaceableItem(getSelectedItem())) {
      if (isPress) {
        state.usePressed = false;
        const problem = tryLightPortal(
          state.target.block.x, state.target.block.y, state.target.block.z,
        );
        if (problem) {
          showToast(describeFrameProblem(problem));
        }
      }
      return;
    }
    if (state.target.block.type === BLOCKS.portal && !state.sneaking) {
      if (isPress) {
        state.usePressed = false;
        openPortalPicker([[state.target.block.x, state.target.block.y, state.target.block.z]]);
      }
      return;
    }

    const station = STATION_BLOCKS[state.target.block.type];
    if (station && !state.sneaking) {
      const chestKey = station === "chest"
        ? chestKeyAt(state.target.block.x, state.target.block.y, state.target.block.z)
        : null;
      openStation(station, chestKey);
      return;
    }

    const selectedItem = getSelectedItem();
    const vehicleKind = VEHICLE_ITEMS[selectedItem];
    if (vehicleKind) {
      if (isPress && getItemCount(selectedItem) > 0) {
        const spot = state.target.place;
        cars.spawn(spot.x + 0.5, spot.y, spot.z + 0.5, state.player.yaw, vehicleKind);
        consumeItem(selectedItem, 1);
        soundEngine.place(BLOCKS.stone);
        showToast(`Parked a ${BLOCK_NAMES[selectedItem]} — touch it to drive`);
        state.saveDirty = true;
      }
      return;
    }
    if (!isPlaceableItem(selectedItem)) {
      return;
    }
    if (canPlaceBlock(state.target.place.x, state.target.place.y, state.target.place.z)) {
      if (getItemCount(selectedItem) <= 0) {
        showToast(`Out of ${BLOCK_NAMES[selectedItem]}`);
      } else if (world.setBlock(state.target.place.x, state.target.place.y, state.target.place.z, selectedItem)) {
        consumeItem(selectedItem, 1);
        chunkMeshes.markDirtyAtWorld(state.target.place.x, state.target.place.z);
        spawnParticles(
          state.target.place.x + 0.5,
          state.target.place.y + 0.5,
          state.target.place.z + 0.5,
          selectedItem,
          6,
          1.6,
        );
        soundEngine.place(selectedItem);
        state.stats.placed += 1;
        state.saveDirty = true;
        // The block that completes a frame lights it, so nobody has to be
        // told there is a separate step.
        if (selectedItem === BLOCKS.portal_frame) {
          tryLightPortal(state.target.place.x, state.target.place.y, state.target.place.z);
        }
      }
    }
  }

  chunkMeshes.syncLoadedChunks();
  updateTarget();
  updateInventoryPanel();
  updateHotbar();
}
