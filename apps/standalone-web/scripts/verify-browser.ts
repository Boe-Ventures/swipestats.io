import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = "http://localhost:3200";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("../../.migration/verification", { recursive: true });
for (const path of [
  "/",
  "/upload",
  "/blog",
  "/signin",
  "/experiments/love-stories",
]) {
  const response = await page.goto(base + path, {
    waitUntil: "domcontentloaded",
  });
  assert.equal(response?.status(), 200, path);
  assert.ok((await page.locator("body").innerText()).length > 100, path);
}
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll("button")).some(
    (button) =>
      button.textContent === "Standalone" &&
      Object.keys(button).some((key) => key.startsWith("__reactProps")),
  ),
);
await page.getByRole("button", { name: "Standalone", exact: true }).click();
await page.waitForURL("**/experiments/love-stories?mode=standalone", {
  waitUntil: "domcontentloaded",
});
await page.getByRole("button", { name: /Alex/ }).click();
await page
  .getByRole("heading", { name: "The story can start here." })
  .waitFor();
await page
  .getByLabel("What would you like to remember?")
  .fill("A fictional walk through the garden.");
await page.getByRole("button", { name: "Preview entry" }).click();
assert.equal(
  await page.getByRole("status").textContent(),
  "A fictional walk through the garden.",
);
await page.screenshot({
  path: "../../.migration/verification/love-stories-desktop.png",
  fullPage: true,
});
await page.reload({ waitUntil: "domcontentloaded" });
assert.equal(await page.getByRole("status").count(), 0);
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll("button")).some(
    (button) =>
      button.textContent === "Inside SwipeStats" &&
      Object.keys(button).some((key) => key.startsWith("__reactProps")),
  ),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Inside SwipeStats" }).click();
await page.waitForURL("**/experiments/love-stories", {
  waitUntil: "domcontentloaded",
});
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
await page.screenshot({
  path: "../../.migration/verification/love-stories-mobile.png",
  fullPage: true,
});
assert.deepEqual(errors, []);
console.log(
  JSON.stringify(
    {
      publicPages: 5,
      presentationSwitch: true,
      nameOnlyPerson: true,
      fictionalDraft: true,
      noPersistence: true,
      mobileNoOverflow: true,
      browserErrors: errors.length,
    },
    null,
    2,
  ),
);
await browser.close();
