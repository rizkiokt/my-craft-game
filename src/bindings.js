// Rebindable control scheme: tokens, defaults and lookups.

import { BINDINGS_KEY } from "./constants.js";
import { state } from "./state.js";
/* ------------------------------------------------------------------ *
 * Controls
 *
 * A binding is a single token: either a KeyboardEvent.code ("KeyW") or a
 * MouseEvent.button prefixed with "Mouse" ("Mouse0" left, "Mouse1" middle,
 * "Mouse2" right). Defaults mirror Minecraft Java Edition and every one of
 * them is rebindable from the Controls screen.
 * ------------------------------------------------------------------ */

export const DEFAULT_BINDINGS = {
  forward: "KeyW",
  left: "KeyA",
  back: "KeyS",
  right: "KeyD",
  jump: "Space",
  sneak: "ShiftLeft",
  sprint: "ControlLeft",
  attack: "Mouse0",
  use: "Mouse2",
  pick: "Mouse1",
  drop: "KeyQ",
  inventory: "KeyE",
  book: "KeyB",
  hotbar1: "Digit1",
  hotbar2: "Digit2",
  hotbar3: "Digit3",
  hotbar4: "Digit4",
  hotbar5: "Digit5",
  hotbar6: "Digit6",
  hotbar7: "Digit7",
  hotbar8: "Digit8",
  hotbar9: "Digit9",
  toggleHud: "F1",
  screenshot: "F2",
  debug: "F3",
  gameMode: "F4",
  perspective: "F5",
  fullscreen: "F11",
  pause: "Escape",
};

export const BINDING_LABELS = {
  forward: "Walk Forwards",
  left: "Strafe Left",
  back: "Walk Backwards",
  right: "Strafe Right",
  jump: "Jump / Fly Up",
  sneak: "Sneak / Fly Down",
  sprint: "Sprint",
  attack: "Attack / Destroy",
  use: "Use Item / Place Block",
  pick: "Pick Block",
  drop: "Drop Item",
  inventory: "Inventory / Crafting",
  book: "Things to Do",
  hotbar1: "Hotbar Slot 1",
  hotbar2: "Hotbar Slot 2",
  hotbar3: "Hotbar Slot 3",
  hotbar4: "Hotbar Slot 4",
  hotbar5: "Hotbar Slot 5",
  hotbar6: "Hotbar Slot 6",
  hotbar7: "Hotbar Slot 7",
  hotbar8: "Hotbar Slot 8",
  hotbar9: "Hotbar Slot 9",
  toggleHud: "Toggle HUD",
  screenshot: "Take Screenshot",
  debug: "Debug Info",
  gameMode: "Switch Game Mode",
  perspective: "Toggle Perspective",
  fullscreen: "Toggle Fullscreen",
  pause: "Pause / Back",
};

export const BINDING_GROUPS = [
  {
    title: "Movement",
    actions: ["forward", "left", "back", "right", "jump", "sneak", "sprint"],
  },
  {
    title: "Gameplay",
    actions: ["attack", "use", "pick", "drop", "inventory", "book"],
  },
  {
    title: "Hotbar",
    actions: [
      "hotbar1", "hotbar2", "hotbar3", "hotbar4", "hotbar5",
      "hotbar6", "hotbar7", "hotbar8", "hotbar9",
    ],
  },
  {
    title: "Display",
    actions: ["toggleHud", "screenshot", "debug", "gameMode", "perspective", "fullscreen", "pause"],
  },
];

/** Actions the player may not rebind (the browser owns them too). */
export const FIXED_BINDINGS = new Set(["pause"]);

/** Right-hand modifiers fall through to their left twin unless bound. */
export const TOKEN_ALIASES = {
  ShiftRight: "ShiftLeft",
  ControlRight: "ControlLeft",
  AltRight: "AltLeft",
  MetaRight: "MetaLeft",
};

export const KEY_LABELS = {
  Space: "Space",
  Escape: "Esc",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  CapsLock: "Caps Lock",
  ShiftLeft: "Left Shift",
  ShiftRight: "Right Shift",
  ControlLeft: "Left Ctrl",
  ControlRight: "Right Ctrl",
  AltLeft: "Left Alt",
  AltRight: "Right Alt",
  MetaLeft: "Left Meta",
  MetaRight: "Right Meta",
  ArrowUp: "Up Arrow",
  ArrowDown: "Down Arrow",
  ArrowLeft: "Left Arrow",
  ArrowRight: "Right Arrow",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Backslash: "\\",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

export const MOUSE_LABELS = ["Left Button", "Middle Button", "Right Button"];

export const bindings = { ...DEFAULT_BINDINGS };

export function loadBindings() {
  try {
    const raw = localStorage.getItem(BINDINGS_KEY);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    for (const action of Object.keys(DEFAULT_BINDINGS)) {
      if (FIXED_BINDINGS.has(action)) {
        continue;
      }
      if (typeof saved?.[action] === "string" || saved?.[action] === null) {
        bindings[action] = saved[action];
      }
    }
  } catch {
    /* corrupt binding data just falls back to defaults */
  }
}

export function saveBindings() {
  try {
    localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    /* storage is optional */
  }
}

export function mouseToken(button) {
  return `Mouse${button}`;
}

/** Human readable name for a binding token, e.g. "Left Shift" or "W". */
export function describeToken(token) {
  if (!token) {
    return "None";
  }
  if (token.startsWith("Mouse")) {
    const index = Number(token.slice(5));
    return MOUSE_LABELS[index] ?? `Button ${index + 1}`;
  }
  if (KEY_LABELS[token]) {
    return KEY_LABELS[token];
  }
  if (token.startsWith("Key")) {
    return token.slice(3);
  }
  if (token.startsWith("Digit")) {
    return token.slice(5);
  }
  if (token.startsWith("Numpad")) {
    return `Keypad ${token.slice(6)}`;
  }
  return token;
}

export function isTokenBound(token) {
  return Object.values(bindings).includes(token);
}

/** Maps Right Shift onto Left Shift and friends when the twin is free. */
export function canonicalToken(token) {
  const alias = TOKEN_ALIASES[token];
  if (alias && !isTokenBound(token)) {
    return alias;
  }
  return token;
}

export function actionsForToken(token) {
  const matches = [];
  for (const [action, bound] of Object.entries(bindings)) {
    if (bound === token) {
      matches.push(action);
    }
  }
  return matches;
}

export function findBindingConflicts() {
  const seen = new Map();
  const conflicts = new Set();
  for (const [action, token] of Object.entries(bindings)) {
    if (!token) {
      continue;
    }
    if (seen.has(token)) {
      conflicts.add(action);
      conflicts.add(seen.get(token));
    } else {
      seen.set(token, action);
    }
  }
  return conflicts;
}

/** True while the key/button bound to `action` is held down. */
export function isActionDown(action) {
  const token = bindings[action];
  return Boolean(token) && state.keys.has(token);
}

export function keyHint(action) {
  return describeToken(bindings[action]);
}
