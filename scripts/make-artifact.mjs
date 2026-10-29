// Turns the single-file demo build (demo/index.html) into a page fragment for publishing as a
// claude.ai artifact: the host adds its own <html>/<head>/<body>, so we keep only the title,
// meta, font links, styles, the root element and the bundled script.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "demo", "index.html");
const html = fs.readFileSync(src, "utf8");

const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const head = [
  ...pick(/<title>[\s\S]*?<\/title>/g),
  ...pick(/<meta name="claude:viewport-fit-sides"[^>]*>/g),
  ...pick(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts[^>]*>/g),
  ...pick(/<style[^>]*>[\s\S]*?<\/style>/g),
];
const scripts = pick(/<script type="module"[^>]*>[\s\S]*?<\/script>/g);
if (!scripts.length) throw new Error("No bundled script found in demo build.");

const out = [...head, '<div id="root"></div>', ...scripts].join("\n");
fs.writeFileSync(path.join(root, "demo", "silhouette-artifact.html"), out);
console.log(`Wrote demo/silhouette-artifact.html (${(out.length / 1024).toFixed(0)} KB)`);
