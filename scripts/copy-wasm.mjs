// Copies MediaPipe's WebAssembly files into the client so the app serves them itself (no third-party CDN).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "client", "package.json"));
const pkgDir = path.dirname(require.resolve("@mediapipe/tasks-vision"));
const from = path.join(pkgDir, "wasm");
const to = path.join(root, "client", "public", "mediapipe", "wasm");
fs.mkdirSync(to, { recursive: true });
for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
console.log(`Copied MediaPipe wasm files to ${path.relative(root, to)}`);
