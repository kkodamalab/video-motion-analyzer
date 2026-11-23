import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Genuine model inference: no mocked pose outputs, no external browser hosts. */
test("real bundled MediaPipe video inference feeds ballet axes, raw JSON and CSV", async ({
  page,
}) => {
  test.setTimeout(180000);
  const fixture = path.resolve("tests/fixtures/pose.webm");
  expect(
    fs.existsSync(fixture),
    "Run npm run test:inference:prepare; the real human-image fixture is required",
  ).toBe(true);
  const origin = new URL(test.info().project.use.baseURL as string).origin;
  const external: string[] = [];
  const assets: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === "http:" || url.protocol === "https:") {
      if (url.origin !== origin) {
        external.push(url.hostname);
        return route.abort();
      }
      if (url.pathname.includes("/mediapipe/")) assets.push(url.pathname);
    }
    return route.continue();
  });
  await page.goto("./");
  const manifest = await page.evaluate(async () => {
    const r = await fetch("./mediapipe/manifest.json");
    if (!r.ok) throw Error(`Missing MediaPipe asset manifest: ${r.status}`);
    return r.json();
  });
  expect(manifest.modelVersion).toBe("pose_landmarker_lite/float16/1");
  await page.getByLabel("Analysis preset").selectOption("BALLET ROTATION");
  await page
    .locator('input[type=file][accept="video/*"]')
    .setInputFiles(fixture);
  await expect(page.getByRole("status")).toContainText("動画を読み込みました");
  await page
    .getByRole("button", { name: "AUTO TRACK START / RETRY", exact: false })
    .click();
  await expect(page.getByRole("status")).toContainText("姿勢推定終了", {
    timeout: 150000,
  });
  await page.locator(".ruler .track-lane").click({ position: { x: 0, y: 10 } });
  await expect(page.getByTestId("body-axis")).toHaveCount(1);
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "EXPORT", exact: true }).click();
  const stream = await (await exported).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const p = JSON.parse(Buffer.concat(chunks).toString());
  const observed = p.ballet.poses.filter(
    (f: { image: unknown[] }) => f.image.length === 33,
  );
  expect(observed.length).toBeGreaterThan(0);
  expect(observed[0].world).toHaveLength(33);
  expect(
    observed.every((f: { source: string }) => f.source === "mediapipe"),
  ).toBe(true);
  expect(
    p.ballet.derived[0].frames.some(
      (f: { angle2D: unknown }) => typeof f.angle2D === "number",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "SETUP", exact: true }).click();
  const csv = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "BALLET FRAME DATA CSV", exact: true })
    .click();
  expect((await csv).suggestedFilename()).toBe("ballet-frames.csv");
  expect(external).toEqual([]);
  expect(assets.some((a) => a.endsWith(".task"))).toBe(true);
  expect(assets.some((a) => a.endsWith(".wasm"))).toBe(true);
  await test
    .info()
    .attach("genuine-inference", {
      body: JSON.stringify(
        {
          observed: observed.length,
          landmarks: 33,
          assets,
          external,
          accuracyValidation: false,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
});
