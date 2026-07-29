// Wires every menu, pause and death-screen button.

import { DEFAULT_BINDINGS, bindings, saveBindings } from "../bindings.js";
import { SAVE_KEY } from "../constants.js";
import { deathScreen, deathTitleBtn, inventoryClose, pauseModeBtn, respawnBtn } from "../dom.js";
import { isCreative } from "../items.js";
import { respawnPlayer } from "../player.js";
import { saveGame } from "../save.js";
import { state } from "../state.js";
import { buildControlsScreen, buildHelpControls } from "./controlsScreen.js";
import { showToast } from "./hud.js";
import { toggleInventory } from "./inventory.js";
import { closeSubScreen, openSubScreen, resumeGame, setGameMode, showScreen, startGame } from "./screens.js";


/** Attaches this module's DOM listeners. Called once from main.js. */
export function installMenuHandlers() {
  document.getElementById("btn-play").addEventListener("click", startGame);
  document.getElementById("btn-controls").addEventListener("click", () => openSubScreen("controls"));
  document.getElementById("btn-options").addEventListener("click", () => openSubScreen("options"));
  document.getElementById("btn-help").addEventListener("click", () => openSubScreen("help"));

  document.getElementById("btn-resume").addEventListener("click", resumeGame);
  document.getElementById("btn-pause-controls").addEventListener("click", () => openSubScreen("controls"));
  document.getElementById("btn-pause-options").addEventListener("click", () => openSubScreen("options"));
  document.getElementById("btn-pause-help").addEventListener("click", () => openSubScreen("help"));
  pauseModeBtn.addEventListener("click", () => setGameMode(isCreative() ? "survival" : "creative"));
  document.getElementById("btn-unstuck").addEventListener("click", () => {
    respawnPlayer();
    showToast("Teleported to safe ground");
  });
  document.getElementById("btn-quit").addEventListener("click", () => {
    saveGame(true);
    showScreen("title");
  });

  document.getElementById("btn-controls-reset").addEventListener("click", () => {
    Object.assign(bindings, DEFAULT_BINDINGS);
    saveBindings();
    buildControlsScreen();
    buildHelpControls();
  });
  document.getElementById("btn-controls-back").addEventListener("click", closeSubScreen);
  document.getElementById("btn-options-back").addEventListener("click", closeSubScreen);
  document.getElementById("btn-help-back").addEventListener("click", closeSubScreen);

  for (const button of document.querySelectorAll(".mode-option")) {
    button.addEventListener("click", () => {
      setGameMode(button.dataset.mode, { announce: false });
    });
  }

  const resetButton = document.getElementById("btn-reset");
  let resetArmed = false;
  let resetTimer = 0;
  resetButton.addEventListener("click", () => {
    if (!resetArmed) {
      resetArmed = true;
      resetButton.textContent = "Erase save? Click again";
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        resetArmed = false;
        resetButton.textContent = "New World";
      }, 4000);
      return;
    }
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* nothing to clear */
    }
    window.location.reload();
  });

  respawnBtn.addEventListener("click", respawnPlayer);
  deathTitleBtn.addEventListener("click", () => {
    state.isDead = false;
    deathScreen.classList.add("is-hidden");
    showScreen("title");
  });
  inventoryClose.addEventListener("click", () => toggleInventory(false));
}

