// Controls screen rebinding UI and the help key list.

import { BINDING_GROUPS, BINDING_LABELS, FIXED_BINDINGS, bindings, describeToken, findBindingConflicts, saveBindings } from "../bindings.js";
import { controlsList, helpControls } from "../dom.js";
import { soundEngine } from "../sound.js";
import { state } from "../state.js";
export function buildControlsScreen() {
  const conflicts = findBindingConflicts();
  controlsList.replaceChildren();

  for (const group of BINDING_GROUPS) {
    const section = document.createElement("section");
    section.className = "controls-group";
    const heading = document.createElement("h3");
    heading.textContent = group.title;
    const rows = document.createElement("div");
    rows.className = "controls-rows";

    for (const action of group.actions) {
      const row = document.createElement("div");
      row.className = "control-row";

      const label = document.createElement("span");
      label.textContent = BINDING_LABELS[action] ?? action;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "mc-btn bind-btn";
      const binding = state.awaitingBind === action;
      button.textContent = binding ? "> ? <" : describeToken(bindings[action]);
      if (binding) {
        button.classList.add("is-binding");
      }
      if (conflicts.has(action)) {
        button.classList.add("is-conflict");
        button.title = "This key is bound to more than one action";
      }
      if (FIXED_BINDINGS.has(action)) {
        button.classList.add("is-fixed");
        button.disabled = true;
        button.title = "This binding is fixed";
      } else {
        button.addEventListener("click", () => {
          state.awaitingBind = action;
          buildControlsScreen();
        });
      }

      row.append(label, button);
      rows.appendChild(row);
    }

    section.append(heading, rows);
    controlsList.appendChild(section);
  }
}

export function handleBindingCapture(token) {
  const action = state.awaitingBind;
  state.awaitingBind = null;
  if (!action || token === "Escape") {
    buildControlsScreen();
    return;
  }
  bindings[action] = token;
  saveBindings();
  buildControlsScreen();
  buildHelpControls();
  soundEngine.select();
}

export const HELP_ACTIONS = [
  "forward",
  "sneak",
  "sprint",
  "jump",
  "attack",
  "use",
  "pick",
  "drop",
  "inventory",
  "perspective",
  "debug",
  "pause",
];

export function buildHelpControls() {
  helpControls.replaceChildren();
  for (const action of HELP_ACTIONS) {
    const item = document.createElement("li");
    item.innerHTML = `<b>${BINDING_LABELS[action]}</b> — <kbd>${describeToken(bindings[action])}</kbd>`;
    helpControls.appendChild(item);
  }
  const scroll = document.createElement("li");
  scroll.innerHTML = `<b>Cycle Hotbar</b> — <kbd>Mouse Wheel</kbd> or <kbd>1</kbd>…<kbd>9</kbd>`;
  helpControls.appendChild(scroll);
  const fly = document.createElement("li");
  fly.innerHTML = `<b>Fly (creative)</b> — double-tap <kbd>${describeToken(bindings.jump)}</kbd>`;
  helpControls.appendChild(fly);
}
