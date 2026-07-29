// The window hooks used for scripted testing.

import { getArmorPoints } from "./combat.js";
import { BLOCK_NAMES, CITY_PLAN, FIXED_STEP, MAX_HEALTH, SNOW_REALM, SUBURB_PLAN } from "./constants.js";
import { hotbar } from "./dom.js";
import { getSelectedItem } from "./items.js";
import { update } from "./loop.js";
import { isInsideRect } from "./math.js";
import { passiveMobs } from "./mobs.js";
import { FURNACE_RECIPES, HAND_RECIPES, TABLE_RECIPES } from "./recipes.js";
import { soundEngine } from "./sound.js";
import { state } from "./state.js";
import { findGridRecipe } from "./crafting.js";
import { getLevel } from "./enchanting.js";
import { canCraft, canSmelt } from "./ui/inventory.js";
import { world } from "./world.js";
import { getCityCenter, getSnowCenter } from "./worldgen.js";
export function renderGameToText() {
  const player = state.player;
  const cityCenter = getCityCenter();
  const snowCenter = getSnowCenter();
  return JSON.stringify({
    title: "MyCraft",
    mode: state.mode,
    screen: state.screen,
    gameMode: state.gameMode,
    flying: state.flying,
    sneaking: state.sneaking,
    sprinting: state.sprinting,
    perspective: ["first", "third-back", "third-front"][state.perspective],
    inventoryOpen: state.inventoryOpen,
    station: state.station,
    openChestKey: state.openChestKey,
    openChest: state.openChestKey && state.chests[state.openChestKey]
      ? state.chests[state.openChestKey]
          .map((slot) => slot ? `${BLOCK_NAMES[slot.itemId]} x${slot.count}` : null)
          .filter(Boolean)
      : [],
    chestCount: Object.keys(state.chests).length,
    pets: passiveMobs.getPetCount(),
    entityTarget: state.entityTarget
      ? `${state.entityTarget.kind}${state.entityTarget.tamed ? " (tamed" + (state.entityTarget.sitting ? ", sitting" : "") + ")" : ""}`
      : null,
    xp: state.xp,
    experienceLevel: getLevel(),
    health: state.health,
    maxHealth: MAX_HEALTH,
    air: Number(state.air.toFixed(1)),
    armorPoints: getArmorPoints(),
    armor: Object.fromEntries(
      Object.entries(state.armor).map(([slot, itemId]) => [slot, itemId == null ? null : BLOCK_NAMES[itemId]]),
    ),
    craftGrid: state.craftGrid.map((slot) => slot ? `${BLOCK_NAMES[slot.itemId]} x${slot.count}` : null),
    craftResult: (() => {
      const recipe = findGridRecipe();
      return recipe ? `${BLOCK_NAMES[recipe.output]} x${recipe.count}` : null;
    })(),
    cursorStack: state.cursorStack
      ? `${BLOCK_NAMES[state.cursorStack.itemId]} x${state.cursorStack.count}`
      : null,
    coords_note: "Origin near spawn. x east-west, y up, z north-south. Player position is feet center.",
    player: {
      x: Number(player.x.toFixed(2)),
      y: Number(player.y.toFixed(2)),
      z: Number(player.z.toFixed(2)),
      vx: Number(player.vx.toFixed(2)),
      vy: Number(player.vy.toFixed(2)),
      vz: Number(player.vz.toFixed(2)),
      yaw: Number(player.yaw.toFixed(2)),
      pitch: Number(player.pitch.toFixed(2)),
      onGround: player.onGround,
    },
    selectedBlock: BLOCK_NAMES[state.selectedBlock],
    selectedItem: getSelectedItem() == null ? "Empty" : BLOCK_NAMES[getSelectedItem()],
    hotbar: state.hotbarSlots.map((itemId) => itemId == null ? "Empty" : BLOCK_NAMES[itemId]),
    inventory: Object.fromEntries(
      Object.entries(state.inventory)
        .filter(([, count]) => count > 0)
        .map(([itemId, count]) => [BLOCK_NAMES[Number(itemId)], count]),
    ),
    craftable: HAND_RECIPES.filter(canCraft).map((recipe) => `${BLOCK_NAMES[recipe.output]} x${recipe.count}`),
    tableCraftable: TABLE_RECIPES.filter(canCraft).map((recipe) => `${BLOCK_NAMES[recipe.output]} x${recipe.count}`),
    furnaceCraftable: FURNACE_RECIPES.filter(canSmelt).map((recipe) => `${BLOCK_NAMES[recipe.output]} x${recipe.count}`),
    breakProgress: state.breakState.key && state.breakState.hardness > 0
      ? Number((state.breakState.progress / state.breakState.hardness).toFixed(2))
      : 0,
    audio: {
      supported: Boolean(soundEngine.AudioContextCtor),
      active: Boolean(soundEngine.context),
    },
    target: state.target
      ? {
          block: state.target.block,
          place: state.target.place,
          distance: Number(state.target.distance.toFixed(2)),
        }
      : null,
    nearbyMobs: passiveMobs.getNearbyEntities(),
    landmarks: {
      cityCenter: {
        x: Number(cityCenter.x.toFixed(1)),
        z: Number(cityCenter.z.toFixed(1)),
      },
      cityDistance: Number(Math.hypot(player.x - cityCenter.x, player.z - cityCenter.z).toFixed(1)),
      inCity: isInsideRect(player.x, player.z, CITY_PLAN),
      inSuburb: !isInsideRect(player.x, player.z, CITY_PLAN) && isInsideRect(player.x, player.z, SUBURB_PLAN),
      snowCenter: {
        x: Number(snowCenter.x.toFixed(1)),
        z: Number(snowCenter.z.toFixed(1)),
      },
      snowDistance: Number(Math.hypot(player.x - snowCenter.x, player.z - snowCenter.z).toFixed(1)),
      inSnowRealm: isInsideRect(player.x, player.z, SNOW_REALM),
    },
    dayTimeHours: Number((state.dayTime * 24).toFixed(2)),
    chunkStats: {
      active: world.loadedKeys.size,
      cached: world.chunks.size,
      generatedSinceLoad: world.totalGenerated,
    },
  });
}

/** Attaches this module's DOM listeners. Called once from main.js. */
export function installDebugApi() {
  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (FIXED_STEP * 1000)));
    state.suppressAnimationTick = true;
    for (let i = 0; i < steps; i++) {
      update(FIXED_STEP, i === steps - 1);
    }
    state.suppressAnimationTick = false;
  };
}

