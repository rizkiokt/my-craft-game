Original prompt: Create a minimal Minecraft-style voxel game, call it MyCraft. Build a playable Minecraft-inspired block world with procedural 3D terrain using Perlin noise, Minecraft-like grass/dirt/stone cubes, WASD movement, mouse look, jump/gravity, break/place blocks, chunk loading, and simple textures and lighting.

2026-03-11
- Initialized an empty workspace as a static browser game instead of adding a build system.
- Planned a software-rendered voxel prototype so the project stays dependency-free and playable from a simple static server.
- Added the first game pass: static HTML shell, atmospheric menu/HUD, software voxel renderer, chunked terrain generation, movement, jumping, gravity, and block interaction.
- Tightened the initial pass by moving rendering to an offscreen surface and removing a control conflict on `A`.
- Optimized `advanceTime` so automated tests step multiple frames and render once, which keeps the deterministic test loop from stalling on longer movement scenarios.
- Replaced the CPU raymarch renderer with a `three`-based WebGL renderer that builds chunk meshes from visible block faces and renders at native canvas resolution.
- Reduced the active chunk radius from 49 chunks to 25 chunks, added a texture atlas, scene lighting, and a crosshair overlay, and nudged the default camera/reach to feel more usable immediately.
- Fixed the front/back movement mismatch caused by the WebGL camera convention and started extending the sandbox with more Minecraft-like features instead of only the base loop.
- Added more Minecraft-like systems: a centered hotbar, five placeable block types, scroll-wheel selection, sprinting, a day/night lighting cycle, beach/sand terrain, and simple tree generation with wood and leaf blocks.
- Added a fun/feedback pass: survival-style hotbar counts, break/place resource collection, cloud animation, movement bob/FOV/landing bounce, and voxel particle bursts for interaction and landing.
- Added a proper inventory/crafting layer with icon-based slots, a crafting overlay toggled by `E`, and new craftable blocks (planks, bricks, glass).
- Verification notes:
- `node --check main.js` passes.
- Playwright smoke run on the local server produced visible voxel terrain screenshots and valid `render_game_to_text` payloads.
- Movement and jump scenario ended with the player displaced from spawn and `generatedSinceLoad: 56`, which confirms chunk expansion beyond the initial active set.
- Break/place scenarios changed the reported target block/placement coordinates after interaction, which is consistent with a block being removed and replaced near the crosshair.
- WebGL verification screenshot shows crisp full-resolution terrain rendering without the previous low-res software pass.
- Feature-pass screenshot shows the corrected forward movement, new sand biomes, generated trees, and the hotbar UI together in the active build.
- Fun-pass screenshot shows inventory counts in the hotbar and HUD with the animated-world build; movement/landing/cloud effects are implemented but only partially represented by a single captured frame.
- Crafting-pass screenshot confirms the icon hotbar and expanded placeable set; `render_game_to_text` also reports craftable recipes and inventory counts for the new crafting system.
- TODO: if a future pass adds inventory or more block types, add targeted interaction tests with more dramatic before/after visuals.
