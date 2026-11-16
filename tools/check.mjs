// npm run check: stamps sw.js with the current file list and version,
// syntax-checks every script, then runs the unit tests. Takes a few seconds.

import { createHash } from "node:crypto";
import { execFile, spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

// Syntax: all scripts at once.
const scripts = [...list("js", (name) => name.endsWith(".js")), "sw.js", ...list("tools", (name) => name.endsWith(".mjs")), ...list("tests", (name) => name.endsWith(".mjs"))];
const errors = (await Promise.all(scripts.map((file) => new Promise((resolve) => {
  execFile(process.execPath, ["--check", join(root, file)], (error, _stdout, stderr) => resolve(error ? `Syntax error in ${file}:\n${stderr}` : ""));
})))).filter(Boolean);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// Unit tests only (tests/*.test.mjs). Browser tests live in tests/e2e and run with `npm run e2e`.
const tests = readdirSync(join(root, "tests")).filter((file) => file.endsWith(".test.mjs")).sort().map((file) => join(root, "tests", file));
const run = spawnSync(process.execPath, ["--test", "--test-reporter=dot", ...tests], { stdio: "inherit" });
process.exit(run.status ?? 1);
