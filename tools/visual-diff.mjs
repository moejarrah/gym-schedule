#!/usr/bin/env node
// Compare same-named PNGs in two directories without extra npm dependencies.
//
//   node tools/visual-diff.mjs <dirA> <dirB> <outDir> [--tolerance=10]
//
// Each pair is decoded in headless Chromium (Playwright, already installed) by drawing both
// images to canvases. A pixel counts as changed when any RGBA channel differs by more than
// `tolerance` (0–255, default 10). Pixels outside the overlap of differently sized images count
// as changed. For every pair with changes, <outDir>/<name> is written: a dimmed grayscale copy of
// image A with changed pixels painted magenta. Prints a table of file → % pixels changed and
// lists files present on only one side. Exit code: 0 when everything matches, 1 otherwise.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { launchBrowser } from "../tests/e2e/helpers.mjs";

const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith("--"));
const toleranceArg = args.find((arg) => arg.startsWith("--tolerance="));
const tolerance = toleranceArg ? Number(toleranceArg.split("=")[1]) : 10;
if (positional.length !== 3 || !Number.isFinite(tolerance)) {
  console.error("Usage: node tools/visual-diff.mjs <dirA> <dirB> <outDir> [--tolerance=10]");
  process.exit(2);
}
const [dirA, dirB, outDir] = positional.map((value) => path.resolve(value));

const listPngs = async (dir) => new Set((await readdir(dir)).filter((name) => name.toLowerCase().endsWith(".png")));
const namesA = await listPngs(dirA);
const namesB = await listPngs(dirB);
const common = [...namesA].filter((name) => namesB.has(name)).sort();
const onlyA = [...namesA].filter((name) => !namesB.has(name)).sort();
const onlyB = [...namesB].filter((name) => !namesA.has(name)).sort();
await mkdir(outDir, { recursive: true });

const browser = await launchBrowser();
const page = await browser.newPage();
await page.setContent("<!doctype html><title>diff</title>");

async function comparePair(aBase64, bBase64, threshold) {
  return page.evaluate(async ({ aBase64, bBase64, threshold }) => {
    const load = (base64) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("could not decode PNG"));
      image.src = `data:image/png;base64,${base64}`;
    });
    const pixels = (image, width, height) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, width, height).data;
    };
    const [a, b] = await Promise.all([load(aBase64), load(bBase64)]);
    const width = Math.max(a.naturalWidth, b.naturalWidth);
    const height = Math.max(a.naturalHeight, b.naturalHeight);
    const pa = pixels(a, width, height);
    const pb = pixels(b, width, height);
    const out = new ImageData(width, height);
    const o = out.data;
    let changed = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const outside = x >= a.naturalWidth || y >= a.naturalHeight || x >= b.naturalWidth || y >= b.naturalHeight;
        const differs = outside
          || Math.abs(pa[i] - pb[i]) > threshold
          || Math.abs(pa[i + 1] - pb[i + 1]) > threshold
          || Math.abs(pa[i + 2] - pb[i + 2]) > threshold
          || Math.abs(pa[i + 3] - pb[i + 3]) > threshold;
        if (differs) {
          changed += 1;
          o[i] = 255; o[i + 1] = 0; o[i + 2] = 200; o[i + 3] = 255;
        } else {
          const gray = 0.299 * pa[i] + 0.587 * pa[i + 1] + 0.114 * pa[i + 2];
          const dim = 255 - (255 - gray) * 0.35;
          o[i] = dim; o[i + 1] = dim; o[i + 2] = dim; o[i + 3] = 255;
        }
      }
    }
    let diffPng = "";
    if (changed) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").putImageData(out, 0, 0);
      diffPng = canvas.toDataURL("image/png").split(",")[1];
    }
    return {
      changed,
      total: width * height,
      sizeA: `${a.naturalWidth}×${a.naturalHeight}`,
      sizeB: `${b.naturalWidth}×${b.naturalHeight}`,
      diffPng,
    };
  }, { aBase64, bBase64, threshold });
}

const rows = [];
try {
  for (const name of common) {
    const [a, b] = await Promise.all([readFile(path.join(dirA, name)), readFile(path.join(dirB, name))]);
    if (a.equals(b)) {
      rows.push({ name, changed: 0, total: 1, note: "identical bytes" });
      continue;
    }
    try {
      const result = await comparePair(a.toString("base64"), b.toString("base64"), tolerance);
      if (result.diffPng) await writeFile(path.join(outDir, name), Buffer.from(result.diffPng, "base64"));
      rows.push({
        name,
        changed: result.changed,
        total: result.total,
        note: result.sizeA === result.sizeB ? "" : `size ${result.sizeA} vs ${result.sizeB}`,
      });
    } catch (error) {
      rows.push({ name, changed: 1, total: 1, note: `error: ${error.message}` });
    }
  }
} finally {
  await browser.close();
}

const nameWidth = Math.max(4, ...rows.map((row) => row.name.length));
const percent = (row) => (100 * row.changed / row.total);
console.log(`Comparing ${dirA}\n       vs ${dirB}\n(tolerance ${tolerance}/255 per channel; diff images in ${outDir})\n`);
console.log(`${"file".padEnd(nameWidth)}  ${"changed".padStart(9)}  ${"pixels".padStart(8)}  note`);
console.log(`${"-".repeat(nameWidth)}  ${"-".repeat(9)}  ${"-".repeat(8)}  ----`);
for (const row of rows) {
  console.log(`${row.name.padEnd(nameWidth)}  ${`${percent(row).toFixed(3)}%`.padStart(9)}  ${String(row.changed).padStart(8)}  ${row.note}`);
}
const changedRows = rows.filter((row) => row.changed > 0);
console.log(`\n${rows.length} compared, ${changedRows.length} with changes, ${rows.length - changedRows.length} unchanged.`);
if (onlyA.length) console.log(`\nMissing in B (${onlyA.length}):\n${onlyA.map((name) => `  ${name}`).join("\n")}`);
if (onlyB.length) console.log(`\nMissing in A (${onlyB.length}):\n${onlyB.map((name) => `  ${name}`).join("\n")}`);
if (!onlyA.length && !onlyB.length) console.log("No files missing on either side.");
process.exit(changedRows.length || onlyA.length || onlyB.length ? 1 : 0);
