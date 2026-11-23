/** Build-time assets only. Never downloads code/models from the application at runtime. */
import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const version = "0.10.22-rc.20250304";
const destination = resolve(root, "public/mediapipe");
const modelURL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const fixtureURL = "https://storage.googleapis.com/mediapipe-assets/pose.jpg";
const wasmNames = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exists = async (path) =>
  stat(path).then(
    () => true,
    () => false,
  );
async function wasm() {
  const pkg = resolve(root, "node_modules/@mediapipe/tasks-vision");
  if (
    JSON.parse(await readFile(resolve(pkg, "package.json"), "utf8")).version !==
    version
  )
    throw Error("MediaPipe package version differs from pinned runtime");
  await mkdir(resolve(destination, "wasm"), { recursive: true });
  for (const name of wasmNames)
    await copyFile(
      resolve(pkg, "wasm", name),
      resolve(destination, "wasm", name),
    );
}
async function verifyDownload(path, url) {
  const receipt = JSON.parse(await readFile(path + ".provenance.json", "utf8"));
  const bytes = await readFile(path);
  if (
    receipt.url !== url ||
    receipt.sha256 !== hash(bytes) ||
    receipt.bytes !== bytes.length
  )
    throw Error(`Asset provenance/integrity mismatch: ${path}`);
  return receipt;
}
async function download(path, url, kind) {
  if (await exists(path)) {
    await verifyDownload(path, url);
    console.log(`Verified retained ${kind}`);
    return;
  }
  await mkdir(resolve(path, ".."), { recursive: true });
  const temporary = path + ".download";
  try {
    // Synchronous Node/curl download exited without diagnostics on the Windows
    // host; standalone curl and native fetch succeeded. Native fetch keeps TLS
    // verification enabled and writes the same independently checked artifact.
    if (process.platform === "win32") {
      let current = url;
      let response;
      for (let redirects = 0; redirects <= 5; redirects++) {
        if (new URL(current).protocol !== "https:")
          throw Error("Asset acquisition requires HTTPS for every redirect");
        response = await fetch(current, {
          redirect: "manual",
          signal: AbortSignal.timeout(180000),
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location || redirects === 5)
            throw Error("Invalid or excessive asset redirects");
          current = new URL(location, current).href;
          continue;
        }
        if (!response.ok)
          throw Error(`Asset HTTPS request failed: HTTP ${response.status}`);
        await writeFile(temporary, Buffer.from(await response.arrayBuffer()));
        break;
      }
    } else execFileSync(
      "curl",
      [
        "--fail",
        "--location",
        "--proto",
        "=https",
        "--proto-redir",
        "=https",
        "--tlsv1.2",
        "--connect-timeout",
        "20",
        "--max-time",
        "180",
        "--silent",
        "--show-error",
        "--output",
        temporary,
        url,
      ],
      { stdio: "inherit" },
    );
    const bytes = await readFile(temporary);
    if (
      kind === "model" &&
      (bytes.length < 1000000 ||
        bytes.indexOf(Buffer.from([80, 75, 3, 4])) < 0 ||
        bytes.indexOf(Buffer.from([80, 75, 3, 4])) > 16 ||
        bytes.lastIndexOf(Buffer.from([80, 75, 5, 6])) < bytes.length - 65557)
    )
      throw Error("Downloaded model is not a MediaPipe task archive");
    if (
      kind === "fixture" &&
      (bytes.length < 1000 || bytes[0] !== 255 || bytes[1] !== 216)
    )
      throw Error("Downloaded fixture is not JPEG");
    const receipt = {
      url,
      sha256: hash(bytes),
      bytes: bytes.length,
      acquiredOver: "verified HTTPS",
      note: "SHA-256 records the initially acquired authoritative artifact; it is not an independently published upstream signature.",
    };
    await rename(temporary, path);
    await writeFile(
      path + ".provenance.json",
      JSON.stringify(receipt, null, 2) + "\n",
    );
    console.log(
      `Acquired ${kind}: ${bytes.length} bytes, SHA-256 ${receipt.sha256}`,
    );
  } finally {
    await rm(temporary, { force: true });
  }
}
async function verify() {
  const pkg = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
  const files = {};
  for (const name of wasmNames) {
    const bytes = await readFile(resolve(destination, "wasm", name));
    if (hash(bytes) !== hash(await readFile(resolve(pkg, name))))
      throw Error(`WASM differs from lockfile-installed package: ${name}`);
    files["wasm/" + name] = { sha256: hash(bytes), bytes: bytes.length };
  }
  let receipt;
  try {
    receipt = await verifyDownload(
      resolve(destination, "pose_landmarker_lite.task"),
      modelURL,
    );
  } catch (e) {
    throw Error(
      `Bundled model is missing or unverified. Run npm run assets:fetch with access to storage.googleapis.com. ${e.message}`,
    );
  }
  files["pose_landmarker_lite.task"] = {
    sha256: receipt.sha256,
    bytes: receipt.bytes,
  };
  await writeFile(
    resolve(destination, "manifest.json"),
    JSON.stringify(
      {
        runtimeVersion: version,
        modelVersion: "pose_landmarker_lite/float16/1",
        modelSource: modelURL,
        files,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Verified complete same-origin MediaPipe assets");
}
const mode = process.argv[2] || "wasm";
try {
  if (mode === "fixture") {
    await download(
      resolve(root, "tests/fixtures/pose.jpg"),
      fixtureURL,
      "fixture",
    );
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-loop",
        "1",
        "-i",
        resolve(root, "tests/fixtures/pose.jpg"),
        "-t",
        "1.2",
        "-r",
        "10",
        "-vf",
        "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuv420p",
        resolve(root, "tests/fixtures/pose.webm"),
      ],
      { stdio: "inherit" },
    );
  } else {
    await wasm();
    if (mode === "fetch")
      await download(
        resolve(destination, "pose_landmarker_lite.task"),
        modelURL,
        "model",
      );
    if (mode === "verify" || mode === "fetch") await verify();
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
