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
import { animationLoop, render } from "./src/loop.js";
import { passiveMobs } from "./src/mobs.js";
import { onUnexpectedUnlock } from "./src/pointerLock.js";
import { ensureValidPlayerPosition } from "./src/player.js";
import { loadGame } from "./src/save.js";
import { resizeRenderer } from "./src/scene.js";
import { loadBindings } from "./src/bindings.js";
import { loadSettings } from "./src/settings.js";
import { state } from "./src/state.js";
import { updateTarget } from "./src/interaction.js";
import { buildHotbar, updateHotbar } from "./src/ui/hud.js";
import { updateInventoryPanel } from "./src/ui/inventory.js";
import { buildControlsScreen, buildHelpControls } from "./src/ui/controlsScreen.js";
import { installMenuHandlers } from "./src/ui/menus.js";
import { applySettings, installOptionsHandlers, syncOptionsScreen } from "./src/ui/options.js";
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

// The world is needed to know where the ground is, so place the player here
// rather than in the state literal. A save, if present, overrides it.
state.player.y = world.getHeightAt(
  Math.floor(DEFAULT_SPAWN.x),
  Math.floor(DEFAULT_SPAWN.z),
) + 3.05;

loadGame();
ensureValidPlayerPosition();
world.updateLoadedChunks(state.player.x, state.player.z);
chunkMeshes.syncLoadedChunks();
passiveMobs.syncLoadedChunks();
updateTarget();
updateHotbar();
updateInventoryPanel();
buildControlsScreen();
buildHelpControls();
syncOptionsScreen();
syncModePicker();

// Pointer lock cannot import the screen stack without a cycle, so the pause
// menu is registered here instead.
onUnexpectedUnlock(openPauseMenu);

installMenuHandlers();
installOptionsHandlers();
installInputHandlers();
installDebugApi();

showScreen("title");
render(0);
requestAnimationFrame(animationLoop(performance.now()));
