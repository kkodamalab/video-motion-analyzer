import { test, expect, type Page } from "@playwright/test";
import { emptyProject } from "../src/core";
import { balletDefaults } from "../src/ballet";
function synthetic() {
  const p = emptyProject();
  p.analysisPreset = "BALLET ROTATION";
  p.name = "Ballet synthetic validation";
  p.ballet = { settings: { ...balletDefaults }, poses: [], events: [] };
  for (let i = 0; i <= 80; i++) {
    const t = i / 20,
      theta = t * Math.PI;
    const image = Array.from({ length: 33 }, () => ({
      x: 320,
      y: 100,
      z: 0,
      visibility: 1,
    }));
    for (const [idx, x, y] of [
      [11, 300, 200],
      [12, 340, 200],
      [23, 300, 400],
      [24, 340, 400],
      [29, 310, 600],
      [30, 340, 550],
    ])
      image[idx] = { x, y, z: 0, visibility: 1 };
    const world = image.map((x) => ({ ...x, x: 0, y: 0, z: 0 }));
    for (const [l, r] of [
      [11, 12],
      [23, 24],
    ]) {
      world[l] = {
        x: -0.2 * Math.cos(theta),
        y: l === 11 ? -0.5 : 0,
        z: -0.2 * Math.sin(theta),
        visibility: 1,
      };
      world[r] = {
        x: 0.2 * Math.cos(theta),
        y: l === 11 ? -0.5 : 0,
        z: 0.2 * Math.sin(theta),
        visibility: 1,
      };
    }
    p.ballet.poses.push({
      person: "r1",
      time: t,
      image,
      world,
      source: "synthetic",
    });
  }
  return p;
}
async function load(page: Page) {
  await page.goto("./");
  await page.locator('input[accept="application/json,.json"]').setInputFiles({
    name: "ballet.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(synthetic())),
  });
  await expect(page.getByLabel("Analysis preset")).toHaveValue(
    "BALLET ROTATION",
  );
}
test("preset switches preserve GENERAL/RELAY measurements", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "DEMO DATA", exact: true }).click();
  const points = await page.locator(".timeline-footer").textContent();
  for (const preset of ["BALLET ROTATION", "RELAY", "GENERAL"]) {
    await page.getByLabel("Analysis preset").selectOption(preset);
    await expect(page.locator(".timeline-footer")).toHaveText(points!);
  }
  await expect(page.locator(".world .pane-heading")).toContainText(
    "WORLD COORDINATES",
  );
});
test("synthetic raw landmarks draw axis and synchronized continuous tracks", async ({
  page,
}) => {
  await load(page);
  await expect(page.getByTestId("body-axis")).toHaveCount(1);
  const line = page.getByTestId("body-axis").locator("line");
  await expect(line).toHaveAttribute("x1", "320");
  await expect(line).toHaveAttribute("y1", "200");
  await expect(line).toHaveAttribute("y2", "400");
  await expect(
    page.locator('[data-series="AXIS ANGLE 2D"] path'),
  ).not.toHaveAttribute("d", "");
  await page.getByLabel("Ballet analysis view").selectOption("ANGLE PLOT");
  await page
    .locator(".ballet-angle svg")
    .click({ position: { x: 100, y: 50 } });
  await expect(page.locator(".timecode")).not.toContainText("0.000 /");
});
test("manual events can be added, edited, sought and deleted", async ({
  page,
}) => {
  await load(page);
  await page
    .getByLabel("ROTATION EVENT", { exact: true })
    .selectOption("ROTATION START");
  await page.getByRole("button", { name: "＋ MANUAL EVENT @ CURSOR" }).click();
  await page
    .getByLabel("ROTATION EVENT", { exact: true })
    .selectOption("TURN COMPLETED");
  await page.getByRole("button", { name: "＋ MANUAL EVENT @ CURSOR" }).click();
  await page.getByText(/EDIT BALLET EVENTS/).click();
  const manual = page
    .locator(".ballet-event-editor")
    .filter({ hasText: "TURN COMPLETED · manual" });
  await manual.locator("input").fill("2.5");
  await manual.getByRole("button", { name: "SEEK", exact: true }).click();
  await expect(page.locator(".timecode")).toContainText("2.500");
  await manual.getByRole("button", { name: "DELETE", exact: true }).click();
  await expect(manual).toHaveCount(0);
});
test("views, interval, visibility and settings recalculate without destroying raw data", async ({
  page,
}) => {
  await load(page);
  await page
    .getByLabel("Ballet analysis view")
    .selectOption("ROTATION METRICS");
  await expect(
    page.getByText("Mean period (s)", { exact: true }).locator(".."),
  ).toContainText("2.00");
  await page.getByRole("button", { name: "SETUP", exact: true }).click();
  await page.getByLabel("SHOW BODY AXIS", { exact: true }).uncheck();
  await expect(page.getByTestId("body-axis")).toHaveCount(0);
  await page.getByLabel("SHOW BODY AXIS", { exact: true }).check();
  await page.getByLabel("Image vertical angle", { exact: true }).fill("30");
  await expect(
    page.getByText("Mean |tilt| (deg)", { exact: true }).locator(".."),
  ).toContainText("30.00");
  await page
    .getByRole("button", {
      name: "RECALCULATE FROM RAW LANDMARKS",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Ballet analysis view")
    .selectOption("WORLD COORDINATES");
  await expect(page.locator(".world .pane-heading")).toContainText(
    "WORLD COORDINATES",
  );
  await page
    .getByRole("button", { name: "← BALLET ANALYSIS VIEW", exact: true })
    .click();
  await expect(page.getByLabel("Axis trajectory")).toBeVisible();
  await page
    .locator(".ruler .track-lane")
    .click({ position: { x: 100, y: 10 } });
  await page.getByRole("button", { name: "RANGE END @ CURSOR" }).click();
  expect(
    Number(await page.getByLabel("END (s)", { exact: true }).inputValue()),
  ).toBeLessThan(10);
});
test("CSV and JSON downloads preserve units, provenance, raw and derived series", async ({
  page,
}) => {
  await load(page);
  await page.getByRole("button", { name: "SETUP", exact: true }).click();
  for (const [name, expected] of [
    ["BALLET FRAME DATA CSV", "measurement_source"],
    ["BALLET TURN SUMMARY CSV", "rotation_period"],
    ["BALLET EVENT CSV", "manual_or_auto"],
  ]) {
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const download = await promise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream!) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString()).toContain(expected);
  }
  await page
    .getByLabel("Ballet analysis view")
    .selectOption("ROTATION METRICS");
  await page.getByTestId("ballet-timeline").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/ballet-metrics.png" });
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "EXPORT", exact: true }).click();
  const stream = await (await promise).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const json = JSON.parse(Buffer.concat(chunks).toString());
  expect(json.ballet.poses).toHaveLength(81);
  expect(json.ballet.derived[0].frames).toHaveLength(81);
  expect(
    json.ballet.derived[0].events.some(
      (e: { type: string }) => e.type === "TURN COMPLETED",
    ),
  ).toBe(true);
});

test("missing poses remain gaps, 3D requires an explicit reference, and event lanes seek", async ({
  page,
}) => {
  await load(page);
  await page.getByRole("button", { name: "SETUP", exact: true }).click();
  await page
    .getByLabel("ANALYSIS DIMENSION", { exact: true })
    .selectOption("3D");
  await page
    .getByLabel("Ballet analysis view")
    .selectOption("ROTATION METRICS");
  await expect(
    page.getByText("Mean |tilt| (deg)", { exact: true }).locator(".."),
  ).toContainText("—");
  await page.getByLabel("DEFINE ESTIMATED 3D UP", { exact: true }).check();
  await expect(
    page.getByText("Mean |tilt| (deg)", { exact: true }).locator(".."),
  ).toContainText("0.00");
  await page
    .getByTestId("ballet-timeline")
    .locator('button[title="TURN COMPLETED 2.000s auto"]')
    .click();
  await expect(page.locator(".timecode")).toContainText("2.000");
  const p = synthetic();
  p.ballet!.poses[40].image = [];
  p.ballet!.poses[40].world = [];
  await page.locator('input[accept="application/json,.json"]').setInputFiles({
    name: "missing.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await page
    .getByLabel("Ballet analysis view")
    .selectOption("ROTATION METRICS");
  await expect(
    page.getByText("Auto turn candidates", { exact: true }).locator(".."),
  ).toContainText("—");
});
