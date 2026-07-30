// MyCraft entry point.
//
// Everything lives in ./src as focused modules; this file only wires them
// together and starts the loop. Module layering runs bottom-up:
//
//   constants / dom / math        no dependencies
//   settings / bindings / state   persistence and mutable state
//   worldgen / textures / world   terrain and block data
//   scene / icons / chunkMesh     Three.js resources
//   items / player / interaction  gameplay rules
//   ui/*                          screens, HUD, inventory
//   actions / input / loop        input routing and the frame loop

import { installDebugApi } from "./src/debugApi.js";
import { chunkMeshes } from "./src/chunkMesh.js";
import { DEFAULT_SPAWN } from "./src/constants.js";
import { installInputHandlers } from "./src/input.js";
import { installTouchHandlers, syncTouchControls } from "./src/touch.js";
import { animationLoop, render } from "./src/loop.js";
import { passiveMobs } from "./src/mobs.js";
import { onUnexpectedUnlock } from "./src/pointerLock.js";
import { ensureValidPlayerPosition } from "./src/player.js";
import { npcs } from "./src/npcs.js";
import { hasRestoredNpcs, loadGame, loadWorldSeed } from "./src/save.js";
import { resizeRenderer } from "./src/scene.js";
import { loadBindings } from "./src/bindings.js";
import { loadSettings } from "./src/settings.js";
import { state } from "./src/state.js";
import { updateTarget } from "./src/interaction.js";
import { buildHotbar, updateHotbar } from "./src/ui/hud.js";
import { updateInventoryPanel } from "./src/ui/inventory.js";
import { buildControlsScreen, buildHelpControls } from "./src/ui/controlsScreen.js";
import { installMenuHandlers } from "./src/ui/menus.js";
import { installPortalHandlers } from "./src/ui/portals.js";
import { installWorldsHandlers } from "./src/ui/worlds.js";
import {
  applySettings,
  installOptionsHandlers,
  onTouchSettingChanged,
  syncOptionsScreen,
} from "./src/ui/options.js";
import {
  applyTitleTexture,
  openPauseMenu,
  pickSplash,
  showScreen,
  syncModePicker,
} from "./src/ui/screens.js";
import { world } from "./src/world.js";

loadSettings();
loadBindings();
applySettings();
applyTitleTexture();
pickSplash();
resizeRenderer();
buildHotbar();

// The seed decides what every chunk generates, so it has to be applied before
// anything reads the world -- including the spawn height below.
loadWorldSeed();

const hadSave = loadGame();
if (!hadSave) {
  // Fresh world: drop the player just above the surface at spawn.
  state.player.y = world.getHeightAt(
    Math.floor(DEFAULT_SPAWN.x),
    Math.floor(DEFAULT_SPAWN.z),
  ) + 3.05;
}
ensureValidPlayerPosition();

// A fresh world starts with the roster around spawn; a saved one restores them.
if (!hasRestoredNpcs()) {
  npcs.spawnRoster(DEFAULT_SPAWN.x, DEFAULT_SPAWN.z);
}
world.updateLoadedChunks(state.player.x, state.player.z);
chunkMeshes.syncLoadedChunks({ budgetMs: Infinity });
passiveMobs.syncLoadedChunks();
updateTarget();
updateHotbar();
updateInventoryPanel();
buildControlsScreen();
buildHelpControls();
syncOptionsScreen();
syncModePicker();

// Pointer lock cannot import the screen stack without a cycle, so the pause
// menu is registered here instead. The Options screen sits below touch.js for
// the same reason, so the on-screen pad is re-synced from here too.
onUnexpectedUnlock(openPauseMenu);
onTouchSettingChanged(syncTouchControls);

installMenuHandlers();
installWorldsHandlers();
installPortalHandlers();
installOptionsHandlers();
installInputHandlers();
installTouchHandlers();
installDebugApi();
syncTouchControls();

showScreen("title");
render(0);
requestAnimationFrame(animationLoop(performance.now()));
