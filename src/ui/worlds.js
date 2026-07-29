// The Worlds screen: named saves in this browser, plus files on your machine.
//
// There is no server behind any of this, which is what lets it work on a
// static host. Saving copies the world you are playing into a slot; exporting
// writes the same thing to a .json you keep yourself.

import { worldFileInput, worldList, worldNameInput } from "../dom.js";
import {
  cleanWorldName,
  deleteWorld,
  exportWorldText,
  importWorldText,
  listWorlds,
  loadWorld,
  saveWorldAs,
  worldFileName,
} from "../save.js";
import { state } from "../state.js";
import { showToast } from "./hud.js";
import { closeSubScreen, openSubScreen } from "./screens.js";

/** Buttons that throw work away ask twice, and forget after a moment. */
const ARM_TIMEOUT = 4000;
let armedButton = null;
let armTimer = 0;

function arm(button, label, run) {
  if (armedButton === button) {
    disarm();
    run();
    return;
  }
  disarm();
  armedButton = button;
  button.dataset.idle = button.textContent;
  button.textContent = label;
  button.classList.add("is-armed");
  armTimer = window.setTimeout(disarm, ARM_TIMEOUT);
}

function disarm() {
  window.clearTimeout(armTimer);
  if (armedButton) {
    armedButton.textContent = armedButton.dataset.idle ?? armedButton.textContent;
    armedButton.classList.remove("is-armed");
    armedButton = null;
  }
}

function describe(world) {
  const when = new Date(world.savedAt);
  const stamp = Number.isNaN(when.getTime())
    ? "saved"
    : when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const mode = world.gameMode === "creative" ? "Creative" : "Survival";
  const blocks = world.edits === 1 ? "1 block changed" : `${world.edits ?? 0} blocks changed`;
  return `${mode} · seed ${world.seed ?? 0} · ${blocks} · ${stamp}`;
}

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can beat the download on some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * A saved world can only take over at boot, because the seed decides what
 * every chunk generates. So hand over by replacing the active save and
 * reloading, the same way a new seed does.
 */
function handOverTo(id, name) {
  const result = loadWorld(id);
  if (!result.ok) {
    showToast(result.reason);
    return;
  }
  worldList.replaceChildren(Object.assign(document.createElement("p"), {
    className: "world-empty",
    textContent: `Loading "${name}"...`,
  }));
  window.location.reload();
}

export function refreshWorldList() {
  disarm();
  worldNameInput.value = cleanWorldName(state.worldName);

  const worlds = listWorlds();
  if (worlds.length === 0) {
    worldList.replaceChildren(Object.assign(document.createElement("p"), {
      className: "world-empty",
      textContent: "No saved worlds yet. Name the one you are playing and save it.",
    }));
    return;
  }

  const rows = worlds.map((world) => {
    const row = document.createElement("div");
    row.className = "world-row";

    const text = document.createElement("div");
    text.className = "world-text";
    const title = document.createElement("strong");
    title.textContent = world.name;
    const meta = document.createElement("span");
    meta.textContent = describe(world);
    text.append(title, meta);

    const buttons = document.createElement("div");
    buttons.className = "world-actions";

    const load = document.createElement("button");
    load.type = "button";
    load.className = "mc-btn mc-btn-sm";
    load.textContent = "Load";
    load.addEventListener("click", () => arm(
      load,
      "Replace current world?",
      () => handOverTo(world.id, world.name),
    ));

    const save = document.createElement("button");
    save.type = "button";
    save.className = "mc-btn mc-btn-sm";
    save.textContent = "Export";
    save.addEventListener("click", () => {
      const text2 = exportWorldText(world.id);
      if (!text2) {
        showToast("That world could not be read.");
        return;
      }
      download(text2, worldFileName(world.name));
      showToast(`Exported "${world.name}"`);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mc-btn mc-btn-sm mc-btn-danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => arm(remove, "Delete for good?", () => {
      deleteWorld(world.id);
      showToast(`Deleted "${world.name}"`);
      refreshWorldList();
    }));

    buttons.append(load, save, remove);
    row.append(text, buttons);
    return row;
  });

  worldList.replaceChildren(...rows);
}

export function openWorldsScreen() {
  refreshWorldList();
  openSubScreen("worlds");
}

/** Attaches this module's DOM listeners. Called once from main.js. */
export function installWorldsHandlers() {
  document.getElementById("btn-worlds").addEventListener("click", openWorldsScreen);
  document.getElementById("btn-pause-worlds").addEventListener("click", openWorldsScreen);
  document.getElementById("btn-worlds-back").addEventListener("click", () => {
    disarm();
    closeSubScreen();
  });

  // Typing a name must not steer the player around.
  worldNameInput.addEventListener("keydown", (event) => event.stopPropagation());

  document.getElementById("btn-world-save").addEventListener("click", () => {
    const result = saveWorldAs(worldNameInput.value || state.worldName);
    showToast(result.ok ? `Saved "${result.name}"` : result.reason);
    refreshWorldList();
  });

  document.getElementById("btn-world-export").addEventListener("click", () => {
    const name = cleanWorldName(worldNameInput.value || state.worldName);
    download(exportWorldText(), worldFileName(name));
    showToast("Exported to your downloads");
  });

  document.getElementById("btn-world-import").addEventListener("click", () => {
    worldFileInput.value = "";
    worldFileInput.click();
  });

  worldFileInput.addEventListener("change", async () => {
    const file = worldFileInput.files?.[0];
    if (!file) {
      return;
    }
    try {
      const result = importWorldText(await file.text());
      showToast(result.ok ? `Imported "${result.name}" — press Load to play it` : result.reason);
    } catch {
      showToast("That file could not be read.");
    }
    refreshWorldList();
  });
}
