import { test, expect } from "@playwright/test";
test("bundled SIMD and non-SIMD WASM compile without external browser requests", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === new URL(test.info().project.use.baseURL as string).origin
    )
      return route.continue();
    external.push(url.hostname);
    return route.abort();
  });
  await page.goto("./");
  const result = await page.evaluate(async () => {
    const results = [];
    for (const name of [
      "vision_wasm_internal",
      "vision_wasm_nosimd_internal",
    ]) {
      const js = await fetch(`./mediapipe/wasm/${name}.js`);
      if (!js.ok) throw Error(`Missing bundled loader: ${js.status}`);
      const response = await fetch(`./mediapipe/wasm/${name}.wasm`);
      if (!response.ok) throw Error(`Missing bundled WASM: ${response.status}`);
      const module = await WebAssembly.compile(await response.arrayBuffer());
      results.push({
        name,
        exports: WebAssembly.Module.exports(module).length,
        mime: response.headers.get("content-type"),
      });
    }
    return results;
  });
  expect(result).toHaveLength(2);
  expect(
    result.every((r) => r.exports > 0 && r.mime?.includes("application/wasm")),
  ).toBe(true);
  expect(external).toEqual([]);
});
