/* One-shot tooling: pull clean black line-art from the Everkinetic set
 * (github.com/chaosbastler/opentraining-exercises, CC-BY-SA 3.0) for a
 * hand-curated set of LIBRARY movements. These are single-figure line drawings
 * — the same style as our existing images and a clean fit for the invert
 * filter. The map (our slug -> Everkinetic drawing) is curated by hand because
 * fuzzy name-matching produced wrong movements; each entry is verified correct.
 * Rasterizes the "-1" (start) pose SVG to a white-bg PNG in public/exercises/.
 * Run: node scripts/fetch-everkinetic-images.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "public/exercises");
const RAW = "https://raw.githubusercontent.com/chaosbastler/opentraining-exercises/master/svg";

// our library slug -> Everkinetic SVG base name (uses the "-1" start pose)
const CURATED = {
  "bench-press": "Bench-press",
  "push-up": "Push-up",
  "db-fly": "Dumbbell-flys",
  "barbell-shrug": "Barbell-shrugs",
  "upright-row": "Barbell-upright-rows",
  "arnold-press": "Arnold-press",
  "lateral-raise": "Dumbbell-lateral-raises",
  "rear-delt-fly": "Lying-rear-lateral-raise",
  "db-curl": "Standing-biceps-curl",
  "concentration-curl": "Concentration-curls",
  "close-grip-bench-press": "Narrow-grip-bench-press",
  "triceps-dip": "Tricep-dips",
  "bench-dip": "Bench-dips",
  "db-kickback": "Triceps-kickback",
  "side-plank": "Side-plank",
  "crunch": "Crunches",
  "lying-leg-raise": "Leg-raises",
  "bicycle-crunch": "Cross-body-crunch",
  "back-extension": "Hyperextensions",
  "superman": "Supermans",
  "barbell-squat": "Squats",
  "walking-lunge": "Lunges",
  "glute-bridge": "Bridge",
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  for (const [slug, base] of Object.entries(CURATED)) {
    try {
      const res = await fetch(`${RAW}/${base}-1.svg`, { headers: { "User-Agent": "project-hail-mary/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svg = Buffer.from(await res.arrayBuffer());
      await sharp(svg, { density: 200 })
        .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .png({ compressionLevel: 9 })
        .toFile(join(OUT_DIR, `${slug}.png`));
      ok++;
      console.log(`✓ ${slug} <- ${base}-1.svg`);
    } catch (e) {
      console.log(`✗ ${slug} (${base}): ${e.message}`);
    }
  }
  console.log(`\nDone: ${ok}/${Object.keys(CURATED).length} images written to public/exercises/.`);
}

main();
