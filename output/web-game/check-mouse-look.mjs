import fs from "node:fs";
import { chromium } from "file:///Users/rizkiokt/.codex/node_modules/playwright/index.mjs";

const url = "http://127.0.0.1:4175";
const outPath = "/Users/rizkiokt/Documents/Other/Codex/MyCraft/output/web-game/mouse-break-pass/mouse-look-check.json";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});

const page = await browser.newPage();
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.click("#start-btn");
await page.waitForTimeout(250);

const canvas = page.locator("canvas").first();
const box = await canvas.boundingBox();
if (!box) {
  throw new Error("Canvas bounding box not available");
}

const readState = async () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

const before = await readState();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down({ button: "left" });
await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 48, { steps: 16 });
await page.mouse.up({ button: "left" });
await page.evaluate(async () => {
  await window.advanceTime(1000 / 60);
});
const after = await readState();

const result = {
  before: {
    yaw: before.player.yaw,
    pitch: before.player.pitch,
  },
  after: {
    yaw: after.player.yaw,
    pitch: after.player.pitch,
  },
  delta: {
    yaw: Number((after.player.yaw - before.player.yaw).toFixed(2)),
    pitch: Number((after.player.pitch - before.player.pitch).toFixed(2)),
  },
};

fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
await browser.close();
