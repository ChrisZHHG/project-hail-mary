#!/usr/bin/env node
/**
 * Makes near-white pixels in public/exercises/*.png transparent, so the
 * invert-filter dark-theme rendering in ExerciseMedia.tsx doesn't show a
 * white/black background box around each line-art icon.
 *
 * Skips files that are already mostly dark (cleaning those would erase
 * white-on-black line art). Only processes images whose sampled near-white
 * pixel ratio exceeds WHITE_BG_MIN.
 *
 * Usage: node scripts/clean-exercise-media.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXERCISES_DIR = path.join(__dirname, "..", "public", "exercises");
const WHITE_THRESHOLD = 240;
const WHITE_BG_MIN = 0.35; // skip already-dark / transparent line-art

async function whiteRatio(filePath) {
  const input = await readFile(filePath);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels * 15) {
    n++;
    const a = data[i + 3];
    if (a < 10) continue;
    const L = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (L > WHITE_THRESHOLD) white++;
  }
  return n ? white / n : 0;
}

async function cleanFile(filePath) {
  const input = await readFile(filePath);
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let touchedPixels = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) {
      data[i + 3] = 0;
      touchedPixels++;
    }
  }

  if (touchedPixels === 0) return false;

  const output = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  await writeFile(filePath, output);
  return true;
}

async function main() {
  const entries = await readdir(EXERCISES_DIR);
  const pngFiles = entries.filter((f) => f.toLowerCase().endsWith(".png"));

  let touchedFiles = 0;
  let skipped = 0;
  for (const file of pngFiles) {
    const filePath = path.join(EXERCISES_DIR, file);
    try {
      const ratio = await whiteRatio(filePath);
      if (ratio < WHITE_BG_MIN) {
        skipped++;
        continue;
      }
      const changed = await cleanFile(filePath);
      if (changed) {
        touchedFiles++;
        console.log(`✓ ${file} (white~${(ratio * 100).toFixed(0)}%)`);
      }
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. Cleaned ${touchedFiles}/${pngFiles.length} PNG files (skipped ${skipped} already-dark).`
  );
}

main();
