// npm run check: stamps sw.js with the current file list and version,
// syntax-checks every app script, then runs the unit tests.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const list = (dir, test) => readdirSync(join(root, dir), { recursive: true })
  .map((name) => join(dir, String(name)).replaceAll("\\", "/"))
  .filter(test)
  .sort();

// Everything the installed app needs offline.
const files = [
  "index.html",
  "manifest.json",
  ...list("styles", (file) => file.endsWith(".css")),
  ...list("js", (file) => file.endsWith(".js")),
  ...list("fonts", (file) => file.endsWith(".woff2")),
  ...list("icons", (file) => /\.(png|svg)$/.test(file)),
];

const hash = createHash("sha256");
for (const file of files) hash.update(file).update(readFileSync(join(root, file)));
const version = hash.digest("hex").slice(0, 10);

const swPath = join(root, "sw.js");
const sw = readFileSync(swPath, "utf8");
const stamped = sw
  .replace(/const VERSION = .*; \/\/ stamped/, `const VERSION = "${version}"; // stamped`)
  .replace(/const FILES = [\s\S]*?; \/\/ stamped/, `const FILES = ${JSON.stringify(files.map((file) => `./${file}`), null, 2)}; // stamped`);
if (stamped !== sw) {
  writeFileSync(swPath, stamped);
  console.log(`sw.js stamped: version ${version}, ${files.length} files`);
}

let failed = false;
for (const file of [...list("js", (name) => name.endsWith(".js")), "sw.js", ...list("tools", (name) => name.endsWith(".mjs")), ...list("tests", (name) => name.endsWith(".mjs"))]) {
  const result = spawnSync(process.execPath, ["--check", join(root, file)], { encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax error in ${relative(root, join(root, file))}:\n${result.stderr}`);
  }
}
if (failed) process.exit(1);

// Unit tests only (tests/*.test.mjs). Browser tests live in tests/e2e and run with `npm run e2e`.
const tests = readdirSync(join(root, "tests")).filter((file) => file.endsWith(".test.mjs")).sort().map((file) => join(root, "tests", file));
const run = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
process.exit(run.status ?? 1);
