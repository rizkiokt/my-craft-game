// The panel that asks a portal where it should go.

import { portalList } from "../dom.js";
import { getDestination, listDestinations, portalKey, setPortalDestination } from "../portals.js";
import { state } from "../state.js";
import { showToast } from "./hud.js";
import { closeSubScreen, openSubScreen } from "./screens.js";

function distanceFromPlayer(place) {
  return Math.round(Math.hypot(place.x - state.player.x, place.z - state.player.z));
}

function buildList(cells, current) {
  const rows = listDestinations().map((place) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "portal-option mc-btn";
    row.classList.toggle("is-active", place.id === current);

    const title = document.createElement("strong");
    title.textContent = place.name;
    const blurb = document.createElement("span");
    const away = distanceFromPlayer(place);
    blurb.textContent = `${place.blurb} · ${away < 12 ? "you are here" : `${away} blocks away`}`;
    row.append(title, blurb);

    row.addEventListener("click", () => {
      setPortalDestination(cells, place.id);
      showToast(`Portal set to ${place.name}`);
      state.portalPicker = { cells, destinationId: place.id };
      buildList(cells, place.id);
    });
    return row;
  });
  portalList.replaceChildren(...rows);
}

/**
 * Opens the picker for one portal. `cells` is every lit cell of it, so
 * whichever part you touched, the whole portal is repointed together.
 */
export function openPortalPicker(cells, destinationId = null) {
  const current = destinationId ?? state.portals[portalKey(cells[0][0], cells[0][1], cells[0][2])];
  state.portalPicker = { cells, destinationId: current };
  buildList(cells, current ?? getDestination("home").id);
  openSubScreen("portal");
}

/** Attaches this module's DOM listeners. Called once from main.js. */
export function installPortalHandlers() {
  document.getElementById("btn-portal-back").addEventListener("click", () => {
    state.portalPicker = null;
    closeSubScreen();
  });
}
