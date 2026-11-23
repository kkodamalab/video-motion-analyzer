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
  expect(await page.getByTestId("pose-skeleton").locator("line").count()).toBeGreaterThan(8);
  await expect(page.locator('[data-series="AXIS ANGLE 2D"] path')).toHaveAttribute("d", /M/);
  await page.screenshot({ path: "test-results/genuine-ballet-inference.png", fullPage: true });
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
  expect(observed[0].world.every((l: { x: number; y: number; z: number }) =>
    [l.x, l.y, l.z].every(Number.isFinite))).toBe(true);
  expect(p.points.some((point: { method: string; x: number; y: number }) =>
    point.method === "auto" && Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
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
  const csvDownload = await csv;
  expect(csvDownload.suggestedFilename()).toBe("ballet-frames.csv");
  const csvStream = await csvDownload.createReadStream();
  const csvChunks = [];
  for await (const chunk of csvStream!) csvChunks.push(chunk);
  const csvText = Buffer.concat(csvChunks).toString();
  // All columns are quoted by the app's CSV writer. Preserve quoted commas.
  const csvRows = csvText.replace(/^\uFEFF/, "").trim().split(/\r?\n/)
    .map(line => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)]
      .map(match => match[1].replaceAll('""', '"')));
  const headers = csvRows[0];
  const angleColumn = headers.indexOf("axis_angle_2d");
  const sourceColumn = headers.indexOf("measurement_source");
  expect(angleColumn).toBeGreaterThan(-1);
  expect(csvRows.slice(1).some(row => row[sourceColumn] === "mediapipe" &&
    row[angleColumn] !== "" && Number.isFinite(Number(row[angleColumn])))).toBe(true);
  await test.info().attach("ballet-frame-csv", { body: csvText, contentType: "text/csv" });
  // Restore the actual inference result through the public import UI.
  await page.locator('input[accept="application/json,.json"]').setInputFiles({
    name: "real-inference-roundtrip.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await expect(page.getByTestId("body-axis")).toHaveCount(1);
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
          worldLandmarks: observed[0].world.length,
          validAngles: p.ballet.derived[0].frames.filter((f: { angle2D: unknown }) =>
            typeof f.angle2D === "number").length,
          csvDataRows: csvRows.length - 1,
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
