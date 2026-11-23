import { test, expect } from "@playwright/test";
// Explicit diagnostic suite; not required by the now same-origin application.
const resources = {
  "CDN JS":
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm/vision_wasm_internal.js",
  "CDN WASM":
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm/vision_wasm_internal.wasm",
  "upstream model":
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
};
for (const [name, url] of Object.entries(resources))
  test(`external HTTPS/CORS diagnostic: ${name}`, async ({ page }) => {
    await page.goto("./");
    const failures: string[] = [];
    page.on("requestfailed", (request) =>
      failures.push(
        `${new URL(request.url()).hostname}: ${request.failure()?.errorText}`,
      ),
    );
    const response = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url);
        return {
          status: r.status,
          bytes: (await r.arrayBuffer()).byteLength,
          error: null,
        };
      } catch (e) {
        return { status: 0, bytes: 0, error: String(e) };
      }
    }, url);
    await test
      .info()
      .attach("external-network-evidence", {
        body: JSON.stringify({ url, ...response, failures }, null, 2),
        contentType: "application/json",
      });
    expect(response.error, failures.join("\n")).toBeNull();
    expect(response.status).toBe(200);
    expect(response.bytes).toBeGreaterThan(1000);
  });
