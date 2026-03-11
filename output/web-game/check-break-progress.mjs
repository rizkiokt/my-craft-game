import fs from "node:fs";
import { chromium } from "file:///Users/rizkiokt/.codex/node_modules/playwright/index.mjs";

const url = "http://127.0.0.1:4175";
const outPath = "/Users/rizkiokt/Documents/Other/Codex/MyCraft/output/web-game/mouse-break-pass/break-check.json";

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
await page.mouse.down({ button: "middle" });
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 220, { steps: 18 });
await page.mouse.up({ button: "middle" });
await page.evaluate(async () => {
  await window.advanceTime(1000 / 60);
});
const aimed = await readState();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down({ button: "left" });
for (let i = 0; i < 18; i++) {
  await page.evaluate(async () => {
    await window.advanceTime(1000 / 60);
  });
}
const during = await readState();
for (let i = 0; i < 12; i++) {
  await page.evaluate(async () => {
    await window.advanceTime(1000 / 60);
  });
}
const later = await readState();
await page.mouse.up({ button: "left" });
await page.evaluate(async () => {
  await window.advanceTime(1000 / 60);
});
const after = await readState();

fs.writeFileSync(outPath, JSON.stringify({
  before: {
    target: before.target,
    breakProgress: before.breakProgress,
  },
  aimed: {
    target: aimed.target,
    breakProgress: aimed.breakProgress,
  },
  during: {
    target: during.target,
    breakProgress: during.breakProgress,
  },
  later: {
    target: later.target,
    breakProgress: later.breakProgress,
  },
  after: {
    target: after.target,
    breakProgress: after.breakProgress,
  },
}, null, 2));

await browser.close();
