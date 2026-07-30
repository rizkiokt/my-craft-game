// The Things to Do screen.
//
// It is a list and nothing more, but the ordering does the work: done ones
// stay where they are rather than sorting to the top, so the shape of the
// page is the same every time you open it and you can find your place.

import { BOOK, countDone } from "../book.js";
import { soundEngine } from "../sound.js";
import { state } from "../state.js";
import { closeSubScreen, openSubScreen } from "./screens.js";

const listEl = document.getElementById("book-list");
const countEl = document.getElementById("book-count");
const backButton = document.getElementById("btn-book-back");
const pauseButton = document.getElementById("btn-pause-book");

export function renderBook() {
  const done = countDone();
  countEl.textContent = `${done} of ${BOOK.length} done`;
  listEl.replaceChildren();

  for (const entry of BOOK) {
    const item = document.createElement("li");
    const ticked = Boolean(state.book[entry.id]);
    item.className = `book-item${ticked ? " is-done" : ""}`;

    const tick = document.createElement("span");
    tick.className = "book-tick";
    tick.textContent = ticked ? "✔" : "";
    item.append(tick);

    const text = document.createElement("span");
    text.className = "book-text";
    const title = document.createElement("b");
    title.textContent = entry.title;
    text.append(title);
    // The hint disappears once it is done: it has served its purpose, and a
    // finished list reads better without instructions all over it.
    if (entry.hint && !ticked) {
      const hint = document.createElement("small");
      hint.textContent = entry.hint;
      text.append(hint);
    }
    item.append(text);
    listEl.append(item);
  }
}

export function openBook() {
  renderBook();
  openSubScreen("book");
  soundEngine.ui(true);
}

export function installBookHandlers() {
  backButton.addEventListener("click", () => {
    closeSubScreen();
    soundEngine.ui(false);
  });
  pauseButton.addEventListener("click", openBook);
}
