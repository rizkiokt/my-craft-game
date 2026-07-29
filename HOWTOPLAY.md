# How to Play MyCraft

## Getting Started

Open the game in a browser. On the title screen pick **Survival** or **Creative**, then click **Play World**. The mouse locks automatically — press **Escape** any time to unlock it and open the pause menu.

Every binding below is the Minecraft Java Edition default and every one of them can be
rebound from **Controls...** on the title screen or in the pause menu.

---

## Controls

### Movement

| Action | Key / Input |
|---|---|
| Walk | `W` `A` `S` `D` |
| Jump / fly up | `Space` |
| Sneak / fly down | `Left Shift` |
| Sprint | Hold `Left Ctrl`, or double-tap `W` |
| Fly (creative only) | Double-tap `Space` |
| Look | Mouse (locked) or click-and-drag on the canvas |
| Look with keyboard | Arrow keys |

### Gameplay

| Action | Key / Input |
|---|---|
| Attack / break block | Hold `Left Click` |
| Use item / place block | `Right Click` |
| Pick block | `Middle Click` |
| Drop held item | `Q` (`Ctrl` + `Q` drops the whole stack) |
| Inventory / crafting | `E` |
| Select hotbar slot | `1` – `9` or mouse wheel |

### Display

| Action | Key / Input |
|---|---|
| Toggle HUD | `F1` |
| Screenshot | `F2` |
| Debug info | `F3` |
| Switch game mode | `F4` |
| Toggle perspective | `F5` |
| Fullscreen | `F11` |
| Pause / back | `Escape` |

Sneaking slows you down, lowers the camera, and stops you walking off a ledge.
Sprinting widens the field of view and cancels when you release forward or start sneaking.

---

## Game Modes

### Survival

Mine what you need, craft your tools, and watch your stack counts. Blocks take time to
break and the right pickaxe is required for stone and ores.

### Creative

- Every block and item is unlocked with an unlimited supply.
- Blocks break in a single hit and nothing is consumed when you build.
- Double-tap `Space` to fly, then `Space` to rise and `Left Shift` to descend.
- Hold `Left Ctrl` while flying to move roughly twice as fast.
- Touching the ground ends flight, just like Minecraft.

Switch modes at any time with `F4` or from the pause menu.

---

## Options

Open **Options...** from the title screen or the pause menu:

- **Mouse Sensitivity** — 20% to 250%
- **Field of View** — 55 to 110
- **Master Volume**
- **Render Distance** — 1 to 5 chunks
- **Invert Mouse**, **View Bobbing**, **Autosave**, **Fullscreen**

Settings and key bindings persist in `localStorage` alongside your world save.

---

## The World

You spawn in a small city district. The world has three distinct zones:

- **Wilderness** — rolling hills, forests, beaches, caves, and water. Most resources are here.
- **City** — gridded roads, lamp posts, towers, shops, row houses, and suburban houses near spawn.
- **Snow Realm** — head east (~112 blocks) for a frozen biome with igloos, lodges, pine trees, and icy paths.

The day/night cycle runs continuously. Days are bright; nights are dark with a deep blue sky.

---

## Breaking & Placing Blocks

Point your crosshair at a block within about 5 blocks of reach and **hold Left Click** to
break it. Harder blocks take longer. When the block breaks it drops straight into your
inventory.

To place a block, select it in the hotbar, point at a surface, and **Right Click**.
**Middle Click** copies the block you are looking at into your hand.

**You need the right tool to mine some blocks (survival only):**

| Block | Minimum Tool |
|---|---|
| Stone, Coal Ore | Wood Pickaxe or better |
| Iron Ore, Furnace | Stone Pickaxe |
| Everything else | Bare hands |

---

## Inventory & Hotbar

Your **hotbar** holds 9 items. Press `1`–`9` or scroll to switch between them. The item's
name appears above the hotbar as you switch.

Press **E** to open the inventory:

- **Survival** — your backpack with counts, plus every recipe you can currently reach.
- **Creative** — the full palette of blocks and items, all unlimited.

Click any item to move it into your active hotbar slot. Press `Q` to throw the held item
on the ground; walk over a dropped item to pick it back up.

---

## Crafting

Crafting is done from the inventory panel (`E`). Recipes unlock depending on what you have access to:

### Always available (Hand Crafting)

| Recipe | Ingredients | Output |
|---|---|---|
| Planks | 1 Wood or Pine Wood | 4 Planks |
| Sticks | 2 Planks | 4 Sticks |

### Crafting Table recipes

Place a **Crafting Table** block and look at it, then open inventory (`E`) to unlock these:

| Recipe | Ingredients | Output |
|---|---|---|
| Crafting Table | 4 Planks | 1 Crafting Table |
| Furnace | 8 Stone | 1 Furnace |
| Wood Pickaxe | 3 Planks + 2 Sticks | 1 Wood Pickaxe |
| Stone Pickaxe | 3 Stone + 2 Sticks | 1 Stone Pickaxe |
| Bricks | 2 Stone + 2 Sand | 4 Bricks |

### Furnace recipes

Place a **Furnace** block and look at it, then open inventory (`E`) to smelt:

| Recipe | Ingredients | Output |
|---|---|---|
| Glass | 2 Sand + 1 Coal | 2 Glass |
| Iron Ingot | 1 Iron Ore + 1 Coal | 1 Iron Ingot |

---

## Resources & Where to Find Them

| Resource | Where to look |
|---|---|
| Wood | Trees in the wilderness |
| Pine Wood | Pine trees in the Snow Realm |
| Stone | Underground, cave walls, or dig into hillsides |
| Sand | Beaches and shallow water edges |
| Coal Ore | Underground (y < 18), dark specks in stone — needs Wood Pickaxe |
| Iron Ore | Deep underground (y < 12), reddish specks — needs Stone Pickaxe |
| Snow / Ice | Snow Realm biome surface |
| Sticks | Occasionally drop from breaking leaves |

---

## Dying, Respawning & Getting Unstuck

Falling out of the world shows the **You Died!** screen. **Respawn** puts you back on the
closest patch of open ground near where you last stood safely.

Respawn never drops you back into a hole: it only considers columns that have headroom,
are open to the sky, and are not the floor of a shaft, searching outward up to 16 blocks
before falling back to world spawn.

If you dig yourself into a pit you cannot climb out of, press `Escape` and use
**Stuck? Teleport to Safe Ground**.

---

## Tips

- Press `F3` for coordinates, facing, biome, chunk counts, and frame rate.
- Sneak along cliff edges — you physically cannot walk off while sneaking.
- Double-tapping `W` starts a sprint that holds until you release the key.
- Blocks snap to a grid — aim at the face you want to build on.
- Your progress saves automatically every few seconds and persists between browser sessions.
- **New World** on the title screen wipes the save (click twice to confirm).
- Water cannot be collected. Leaves have a chance to drop a stick.
