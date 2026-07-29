// Hotbar, toasts, held-item label and the F3 overlay.

import { BLOCK_NAMES, CHUNK_SIZE, CITY_PLAN, HOTBAR_SIZE, MAX_AIR, MAX_HEALTH, SNOW_REALM, SUBURB_PLAN } from "../constants.js";
import { getArmorPoints, getDamageReduction } from "../combat.js";
import { airRow, armorRow, damageFlashEl, debugLeft, debugOverlay, debugRight, healthRow, hotbar, hudLayer, underwaterEl, itemNameLabel, modeBanner, toastLabel, vitals, xpBar, xpFill, xpLevel } from "../dom.js";
import { describeEnchantments, getLevel, getLevelProgress } from "../enchanting.js";
import { itemIcons } from "../icons.js";
import { getItemCount, getSelectedItem, isCreative } from "../items.js";
import { clamp, isInsideRect } from "../math.js";
import { passiveMobs } from "../mobs.js";
import { getGrowth, getMaxHealth } from "../growth.js";
import { state } from "../state.js";
import { world } from "../world.js";
export function buildHotbar() {
  hotbar.replaceChildren();
  for (let index = 0; index < HOTBAR_SIZE; index++) {
    const slot = document.createElement("div");
    slot.className = "hotbar-slot";
    slot.dataset.slot = String(index);
    slot.innerHTML =
      `<span class="slot-key">${index + 1}</span>` +
      `<div class="slot-icon"></div>` +
      `<span class="slot-count"></span>`;
    hotbar.appendChild(slot);
  }
}

export function updateHotbar() {
  for (const slot of hotbar.children) {
    const slotIndex = Number(slot.dataset.slot);
    const itemId = state.hotbarSlots[slotIndex];
    const count = getItemCount(itemId);
    const icon = slot.querySelector(".slot-icon");
    const countLabel = slot.querySelector(".slot-count");
    slot.classList.toggle("is-active", slotIndex === state.activeSlot);
    slot.classList.toggle("is-empty", itemId == null || count <= 0);

    const iconValue = itemId == null ? "none" : `url("${itemIcons.get(itemId)}")`;
    if (icon && icon.dataset.value !== iconValue) {
      icon.dataset.value = iconValue;
      icon.style.backgroundImage = iconValue;
    }
    if (icon) {
      icon.classList.toggle("is-enchanted", itemId != null && Boolean(describeEnchantments(itemId)));
    }
    if (countLabel) {
      // Minecraft hides the stack size for single items and unlimited stacks.
      const text = itemId == null || count <= 1 || isCreative() ? "" : String(count);
      if (countLabel.textContent !== text) {
        countLabel.textContent = text;
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * One-shot actions (fired from a key press, not polled)
 * ------------------------------------------------------------------ */

export function showToast(message, duration = 1.6) {
  state.uiMessage = message;
  state.uiMessageTimer = duration;
}

export function announceHeldItem() {
  const itemId = getSelectedItem();
  state.heldItemName = itemId == null ? "" : BLOCK_NAMES[itemId];
  state.heldItemTimer = itemId == null ? 0 : 2;
}

export function updateModeBanner() {
  // The F3 overlay already reports the mode, so step aside for it.
  if (!state.running || state.debugVisible) {
    modeBanner.textContent = "";
    return;
  }
  const parts = [isCreative() ? "Creative" : "Survival"];
  if (state.flying) {
    parts.push("Flying");
  }
  modeBanner.textContent = parts.join(" · ");
  modeBanner.classList.toggle("is-flying", state.flying);
}

/* ------------------------------------------------------------------ *
 * HUD + F3 debug overlay
 * ------------------------------------------------------------------ */

export function getFacingLabel(yaw) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  if (Math.abs(fz) >= Math.abs(fx)) {
    return fz < 0 ? "north (-Z)" : "south (+Z)";
  }
  return fx > 0 ? "east (+X)" : "west (-X)";
}

export function getBiomeLabel() {
  const player = state.player;
  if (isInsideRect(player.x, player.z, SNOW_REALM)) {
    return "snow realm";
  }
  if (isInsideRect(player.x, player.z, CITY_PLAN)) {
    return "city district";
  }
  if (isInsideRect(player.x, player.z, SUBURB_PLAN)) {
    return "suburbs";
  }
  return "wilderness";
}

/** Rebuilds a pip row only when its shape actually changed. */
function renderPips(row, className, filled, total, { half = false } = {}) {
  const signature = `${className}:${filled}:${total}:${half}`;
  if (row.dataset.signature === signature) {
    return;
  }
  row.dataset.signature = signature;
  row.replaceChildren();
  for (let i = 0; i < total; i++) {
    const pip = document.createElement("div");
    const value = filled - i;
    pip.className = `pip ${className}${value >= 1 ? " is-full" : value >= 0.5 ? " is-half" : ""}`;
    row.appendChild(pip);
  }
}

function updateVitalsHud() {
  // Hearts and armour are survival-only; creative has nothing to lose.
  const survival = !isCreative();
  vitals.classList.toggle("is-hidden", !survival);
  if (!survival) {
    return;
  }
  renderPips(healthRow, "pip-heart", state.health / 2, getMaxHealth() / 2);
  damageFlashEl.style.opacity = String(Math.min(1, state.damageFlash));

  const armorPoints = getArmorPoints();
  renderPips(armorRow, "pip-armor", armorPoints / 2, armorPoints > 0 ? 10 : 0);

  // Bubbles only appear while your head is under water, as in Minecraft.
  const airPips = state.air >= MAX_AIR ? 0 : Math.ceil(state.air);
  renderPips(airRow, "pip-air", airPips, airPips);
}

export function updateHud() {
  hudLayer.classList.toggle("is-hidden", !state.hudVisible);
  underwaterEl.classList.toggle("is-visible", state.submerged);
  updateVitalsHud();

  // Experience bar sits above the hotbar, as in Minecraft.
  const level = getLevel();
  xpBar.classList.toggle("is-hidden", isCreative());
  xpFill.style.width = `${Math.round(getLevelProgress() * 100)}%`;
  if (xpLevel.textContent !== String(level)) {
    xpLevel.textContent = String(level);
  }

  const showToastLabel = state.uiMessageTimer > 0;
  toastLabel.classList.toggle("is-visible", showToastLabel);
  if (showToastLabel && toastLabel.textContent !== state.uiMessage) {
    toastLabel.textContent = state.uiMessage;
  }

  const showItemName = state.heldItemTimer > 0;
  itemNameLabel.classList.toggle("is-visible", showItemName);
  if (showItemName && itemNameLabel.textContent !== state.heldItemName) {
    itemNameLabel.textContent = state.heldItemName;
  }

  debugOverlay.classList.toggle("is-hidden", !state.debugVisible || !state.hudVisible);
  if (!state.debugVisible || !state.hudVisible) {
    return;
  }

  const player = state.player;
  const activeItem = getSelectedItem();
  const breakPercent = state.breakState.key && state.breakState.hardness > 0
    ? Math.round(clamp(state.breakState.progress / state.breakState.hardness, 0, 1) * 100)
    : 0;
  const movement = state.flying
    ? "flying"
    : state.sneaking
      ? "sneaking"
      : state.sprinting
        ? "sprinting"
        : player.onGround ? "walking" : "airborne";

  debugLeft.textContent =
    `MyCraft — ${state.fps} fps\n` +
    `XYZ: ${player.x.toFixed(3)} / ${player.y.toFixed(3)} / ${player.z.toFixed(3)}\n` +
    `Block: ${Math.floor(player.x)} ${Math.floor(player.y)} ${Math.floor(player.z)}\n` +
    `Chunk: ${Math.floor(player.x / CHUNK_SIZE)} ${Math.floor(player.z / CHUNK_SIZE)}\n` +
    `Facing: ${getFacingLabel(player.yaw)} (yaw ${player.yaw.toFixed(2)} pitch ${player.pitch.toFixed(2)})\n` +
    `Biome: ${getBiomeLabel()}\n` +
    `State: ${movement} · ${isCreative() ? "creative" : "survival"}\n` +
    `Day time: ${(state.dayTime * 24).toFixed(1)}h`;

  debugRight.textContent =
    `Size: ${getGrowth().toFixed(2)}x\n` +
    `Health: ${state.health.toFixed(1)}/${getMaxHealth()} · Armour: ${getArmorPoints()} (${Math.round(getDamageReduction() * 100)}% less damage)\n` +
    `Held: ${activeItem == null ? "Empty" : BLOCK_NAMES[activeItem]}${activeItem != null && describeEnchantments(activeItem) ? ` (${describeEnchantments(activeItem)})` : ""}\n` +
    `XP: ${state.xp} (level ${getLevel()})\n` +
    `Target: ${state.target
      ? `${BLOCK_NAMES[state.target.block.type]} @ ${state.target.block.x} ${state.target.block.y} ${state.target.block.z}`
      : "none"}\n` +
    `Break: ${breakPercent}%\n` +
    `Chunks: ${world.loadedKeys.size} loaded / ${world.chunks.size} cached\n` +
    `Render distance: ${world.loadRadius} chunks\n` +
    `Mobs: ${passiveMobs.getEntityCount()} · Drops: ${state.drops.length}\n` +
    `Mouse: ${state.pointerLocked ? "locked" : "free"} · View: ${["1st", "3rd back", "3rd front"][state.perspective]}`;
}
