/* One-shot tooling: pull line-art exercise images from the wger.de open
 * exercise database and wire them up as `media` on our LIBRARY entries and
 * CATALOG (seed.ts) exercises. Matching is a simple token-Dice heuristic —
 * this is a best-effort visual reference, not authoritative data, so partial
 * coverage / skips are fine. Run once: `node scripts/fetch-wger-images.mjs`.
 *
 * Writes results (matched, downloaded, skipped) to stdout as the final
 * mapping. Actual `media` fields in lib/library.ts and lib/data/seed.ts are
 * applied by hand from that mapping (see CLAUDE-facing task notes) — this
 * script only fetches/matches/downloads, it does not rewrite TS source.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "public/exercises");
const CAP = 45;

/* ------------------------------------------------------------------ *
 * 1. Curated library entries (mirrors lib/library.ts — kept inline here
 *    since this is a plain-node script with no TS loader).             *
 * ------------------------------------------------------------------ */
const LIBRARY = [
  // Chest
  { slug: "incline-db-press", name: "Incline DB Press", targetMuscle: "Chest", terms: ["incline dumbbell press", "incline bench press dumbbell"] },
  { slug: "cable-fly", name: "Cable Fly", targetMuscle: "Chest", terms: ["cable fly", "fly with cable"] },
  { slug: "push-up", name: "Push-Up", targetMuscle: "Chest", terms: ["push up"] },
  { slug: "pec-deck", name: "Pec Deck", targetMuscle: "Chest", terms: ["pec deck", "machine chest fly"] },
  { slug: "chest-dips", name: "Chest Dips", targetMuscle: "Chest", terms: ["chest dips", "dips"] },
  // Back
  { slug: "barbell-row", name: "Barbell Row", targetMuscle: "Back", terms: ["barbell row", "bent over barbell row", "bent over dumbbell rows"] },
  { slug: "t-bar-row", name: "T-Bar Row", targetMuscle: "Back", terms: ["t bar row", "rowing t bar"] },
  { slug: "face-pull", name: "Face Pull", targetMuscle: "Back", terms: ["face pull"] },
  { slug: "straight-arm-pulldown", name: "Straight-Arm Pulldown", targetMuscle: "Back", terms: ["straight arm pulldown"] },
  { slug: "barbell-shrug", name: "Barbell Shrug", targetMuscle: "Back", terms: ["barbell shrug", "shrugs barbell"] },
  { slug: "deadlift", name: "Deadlift", targetMuscle: "Back", terms: ["deadlift"] },
  { slug: "back-extension", name: "Back Extension", targetMuscle: "Back", terms: ["back extension"] },
  // Shoulders
  { slug: "db-shoulder-press", name: "DB Shoulder Press", targetMuscle: "Shoulders", terms: ["dumbbell shoulder press"] },
  { slug: "arnold-press", name: "Arnold Press", targetMuscle: "Shoulders", terms: ["arnold press", "arnold shoulder press"] },
  { slug: "front-raise", name: "Front Raise", targetMuscle: "Shoulders", terms: ["front raise"] },
  { slug: "rear-delt-fly", name: "Rear Delt Fly", targetMuscle: "Shoulders", terms: ["rear delt fly"] },
  { slug: "machine-shoulder-press", name: "Machine Shoulder Press", targetMuscle: "Shoulders", terms: ["machine shoulder press", "shoulder press machine"] },
  // Biceps
  { slug: "hammer-curl", name: "Hammer Curl", targetMuscle: "Biceps", terms: ["hammer curl"] },
  { slug: "barbell-curl", name: "Barbell Curl", targetMuscle: "Biceps", terms: ["barbell biceps curl", "biceps curl with barbell"] },
  { slug: "cable-curl", name: "Cable Curl", targetMuscle: "Biceps", terms: ["cable curl", "biceps curl with cable"] },
  { slug: "concentration-curl", name: "Concentration Curl", targetMuscle: "Biceps", terms: ["concentration curl"] },
  // Triceps
  { slug: "overhead-triceps-extension", name: "Overhead Triceps Extension", targetMuscle: "Triceps", terms: ["overhead triceps extension"] },
  { slug: "skull-crusher", name: "Skull Crusher", targetMuscle: "Triceps", terms: ["skull crusher", "skullcrusher"] },
  { slug: "close-grip-bench-press", name: "Close-Grip Bench Press", targetMuscle: "Triceps", terms: ["close grip bench press"] },
  { slug: "triceps-dips", name: "Triceps Dips", targetMuscle: "Triceps", terms: ["triceps dips", "dips"] },
  // Forearms
  { slug: "wrist-curl", name: "Wrist Curl", targetMuscle: "Forearms", terms: ["wrist curl"] },
  { slug: "reverse-curl", name: "Reverse Curl", targetMuscle: "Forearms", terms: ["reverse grip curl", "reverse grip barbell curl"] },
  { slug: "farmers-carry", name: "Farmer's Carry", targetMuscle: "Forearms", terms: ["farmers carry"] },
  // Core
  { slug: "plank", name: "Plank", targetMuscle: "Core", terms: ["plank"] },
  { slug: "hanging-leg-raise", name: "Hanging Leg Raise", targetMuscle: "Core", terms: ["hanging leg raise", "leg raises lying"] },
  { slug: "russian-twist", name: "Russian Twist", targetMuscle: "Core", terms: ["russian twist"] },
  { slug: "ab-wheel-rollout", name: "Ab Wheel Rollout", targetMuscle: "Core", terms: ["ab wheel rollout", "ab wheel"] },
  { slug: "sit-up", name: "Sit-Up", targetMuscle: "Core", terms: ["sit up"] },
  // Quads
  { slug: "front-squat", name: "Front Squat", targetMuscle: "Quads", terms: ["front squat"] },
  { slug: "hack-squat", name: "Hack Squat", targetMuscle: "Quads", terms: ["hack squat"] },
  { slug: "walking-lunge", name: "Walking Lunge", targetMuscle: "Quads", terms: ["walking lunge"] },
  { slug: "bulgarian-split-squat", name: "Bulgarian Split Squat", targetMuscle: "Quads", terms: ["bulgarian split squat"] },
  { slug: "goblet-squat", name: "Goblet Squat", targetMuscle: "Quads", terms: ["goblet squat"] },
  // Hamstrings
  { slug: "romanian-deadlift", name: "Romanian Deadlift", targetMuscle: "Hamstrings", terms: ["romanian deadlift"] },
  { slug: "good-morning", name: "Good Morning", targetMuscle: "Hamstrings", terms: ["good morning"] },
  { slug: "nordic-curl", name: "Nordic Curl", targetMuscle: "Hamstrings", terms: ["nordic curl"] },
  // Glutes
  { slug: "hip-thrust", name: "Hip Thrust", targetMuscle: "Glutes", terms: ["hip thrust"] },
  { slug: "glute-bridge", name: "Glute Bridge", targetMuscle: "Glutes", terms: ["glute bridge"] },
  { slug: "cable-kickback", name: "Cable Kickback", targetMuscle: "Glutes", terms: ["cable kickback", "glute kickback machine"] },
  // Adductors
  { slug: "adductor-machine", name: "Adductor Machine", targetMuscle: "Adductors", terms: ["adductor machine", "seated hip adduction"] },
  { slug: "copenhagen-plank", name: "Copenhagen Plank", targetMuscle: "Adductors", terms: ["copenhagen adduction", "copenhagen plank"], skip: true },
  // Calves
  { slug: "seated-calf-raise", name: "Seated Calf Raise", targetMuscle: "Calves", terms: ["seated calf raise", "seated dumbbell calf raise"] },
  { slug: "standing-calf-raise", name: "Standing Calf Raise", targetMuscle: "Calves", terms: ["standing calf raise"] },
];
/* `skip: true` — Copenhagen Plank's only candidate ("Plank") is a generic
 * front-plank photo that misrepresents this side hip-adduction exercise.
 * The ExerciseIcon "adductor" pictogram is a better fallback than a
 * misleading photo, so we deliberately don't match it. Flagged in report. */

/* ------------------------------------------------------------------ *
 * 2. Existing CATALOG codes (lib/data/seed.ts) — hand-picked search terms.*
 * ------------------------------------------------------------------ */
const CATALOG = [
  { code: "pulldown", name: "Band Assisted Pull-ups OR Lat Pulldown", terms: ["lat pulldown", "close grip lat pulldown"] },
  { code: "row", name: "DB Chest-Supported Upper Back Row", terms: ["chest supported row", "upper back row", "incline chest supported dumbbell row"] },
  { code: "press", name: "Machine Chest Press OR BB/DB Bench Press", terms: ["bench press", "chest press machine"] },
  { code: "preacher", name: "DB Preacher Curl", terms: ["preacher curl"] },
  { code: "squat", name: "BB Squat OR Leg Press", terms: ["barbell squat", "squat"] },
  { code: "legCurl", name: "Leg Curl", terms: ["leg curl"] },
  { code: "legExt", name: "Leg Extension", terms: ["leg extension"] },
  { code: "toePress", name: "Toe Press", terms: ["calf press leg press machine", "toe press"] },
  { code: "calfRaise", name: "Straight-Legged Calf Raise", terms: ["straight leg calf raise", "calf raise"] },
  { code: "triExt", name: "Tricep Extension", terms: ["triceps extension", "barbell triceps extension"] },
  { code: "cableTri", name: "Cable Straight-Bar OR Rope Tricep Extension", terms: ["rope triceps extension", "cable triceps extension"] },
  { code: "latRaise", name: "Cable Lateral Raise", terms: ["cable lateral raise", "lateral raise"] },
  { code: "saLatRaise", name: "Single-Arm Cable Lateral Raise", terms: ["single arm cable lateral raise", "cable lateral raises single arm"] },
  { code: "cableCrunch", name: "Cable Crunch", terms: ["cable crunch"] },
  { code: "adductor", name: "Adductor Yoga-Ball Isometric", terms: ["adductor", "foam roller adductors"] },
  { code: "saRow", name: "Single-Arm Machine Row", terms: ["single arm row", "single arm machine row"] },
  { code: "seatedRow", name: "Seated Cable Row", terms: ["seated cable row"] },
  // cars, antTilt, bike, steps: mobility/cardio — no meaningful wger analog, skipped.
];

/* ------------------------------------------------------------------ *
 * 3. Matching — token-Dice coefficient with light stemming.           *
 * ------------------------------------------------------------------ */
const STOP = new Set(["with", "using", "on", "a", "the", "in", "of", "and"]);
function stem(tok) {
  if (tok.endsWith("ies") && tok.length > 4) return tok.slice(0, -3) + "y";
  if (tok.endsWith("s") && !tok.endsWith("ss") && tok.length > 3) return tok.slice(0, -1);
  return tok;
}
function tokenize(s) {
  const toks = (s.toLowerCase().match(/[a-z0-9]+/g) || []).map(stem);
  return new Set(toks.filter((t) => !STOP.has(t)));
}
function dice(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const t of a) if (b.has(t)) overlap++;
  return (2 * overlap) / (a.size + b.size);
}
function expandAbbrev(term) {
  return term.replace(/\bDB\b/g, "Dumbbell").replace(/\bBB\b/g, "Barbell");
}

function bestMatch(candidates, terms, minDice = 0.5) {
  let best = null;
  for (const term of terms) {
    const qt = tokenize(expandAbbrev(term));
    for (const c of candidates) {
      const d = dice(qt, c.tokens);
      if (d < minDice) continue;
      if (!best || d > best.dice || (d === best.dice && c.isMain && !best.isMain) || (d === best.dice && c.isMain === best.isMain && c.name.length < best.name.length)) {
        best = { dice: d, isMain: c.isMain, name: c.name, exerciseId: c.exerciseId, url: c.url };
      }
    }
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * 4. Fetch wger data.                                                  *
 * ------------------------------------------------------------------ */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "project-hail-mary/1.0 (one-shot image fetch script)" } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log("Fetching wger exercise images…");
  let imagesData;
  let translationsData;
  try {
    imagesData = await fetchJson("https://wger.de/api/v2/exerciseimage/?format=json&limit=400");
    translationsData = await fetchJson(
      "https://raw.githubusercontent.com/wger-project/wger/master/wger/exercises/fixtures/translations.json"
    );
  } catch (err) {
    console.error("Could not reach wger API / GitHub fixtures — aborting gracefully.", err.message);
    console.log("=== FINAL MAPPING ===\n(none — network fetch failed)");
    return;
  }

  const idToNames = new Map(); // exerciseBaseId -> [englishName, ...]
  for (const row of translationsData) {
    if (row.model !== "exercises.translation") continue;
    if (row.fields.language !== 2) continue; // 2 = English
    const exid = row.fields.exercise;
    const arr = idToNames.get(exid) ?? [];
    arr.push(row.fields.name);
    idToNames.set(exid, arr);
  }

  const byExercise = new Map(); // exerciseBaseId -> best image row
  for (const img of imagesData.results) {
    const existing = byExercise.get(img.exercise);
    if (!existing || (img.is_main && !existing.is_main)) byExercise.set(img.exercise, img);
  }

  // Flatten into (name, tokens, exerciseId, url, isMain) candidates — one per
  // English name per exercise-with-image.
  const candidates = [];
  for (const [exid, img] of byExercise) {
    const names = idToNames.get(exid);
    if (!names) continue;
    for (const name of names) {
      candidates.push({ name, tokens: tokenize(name), exerciseId: exid, url: img.image, isMain: img.is_main });
    }
  }
  console.log(`Loaded ${imagesData.results.length} images, ${candidates.length} named+imaged candidates.\n`);

  // --- Match catalog (priority: these exercises are live in every workout) ---
  const catalogMatches = [];
  for (const entry of CATALOG) {
    const m = bestMatch(candidates, entry.terms);
    catalogMatches.push({ ...entry, match: m });
  }

  // --- Match library, grouped by muscle in listed order (for round-robin) ---
  const libraryMatches = [];
  for (const entry of LIBRARY) {
    if (entry.skip) {
      libraryMatches.push({ ...entry, match: null, manualSkip: true });
      continue;
    }
    const m = bestMatch(candidates, entry.terms);
    libraryMatches.push({ ...entry, match: m });
  }

  const catalogHits = catalogMatches.filter((c) => c.match);
  const libraryHits = libraryMatches.filter((l) => l.match);
  const libraryMisses = libraryMatches.filter((l) => !l.match && !l.manualSkip);
  const librarySkipped = libraryMatches.filter((l) => l.manualSkip);

  console.log(`Catalog: ${catalogHits.length}/${CATALOG.length} matched.`);
  console.log(`Library: ${libraryHits.length}/${LIBRARY.length} matched (${libraryMisses.length} no-match, ${librarySkipped.length} manually skipped).\n`);

  // --- Build download queue: catalog fully first, then library round-robin
  //     by muscle group (spreads the 45-image cap fairly instead of exhausting
  //     it on the first few muscle groups in list order). Flagged deviation:
  //     the spec's cap (45) is lower than total matches (catalog+library), so
  //     a priority order had to be chosen. ---
  const queue = [...catalogHits.map((c) => ({ kind: "catalog", entry: c }))];

  const byMuscle = new Map();
  for (const l of libraryHits) {
    const arr = byMuscle.get(l.targetMuscle) ?? [];
    arr.push(l);
    byMuscle.set(l.targetMuscle, arr);
  }
  const muscleOrder = [...byMuscle.keys()];
  let round = 0;
  let remaining = libraryHits.length;
  while (remaining > 0) {
    for (const muscle of muscleOrder) {
      const arr = byMuscle.get(muscle);
      if (round < arr.length) {
        queue.push({ kind: "library", entry: arr[round] });
        remaining--;
      }
    }
    round++;
  }

  const toDownload = queue.slice(0, CAP);
  const droppedForCap = queue.slice(CAP);

  await mkdir(OUT_DIR, { recursive: true });

  const results = [];
  for (const item of toDownload) {
    const slugOrCode = item.kind === "catalog" ? item.entry.code : item.entry.slug;
    const destName = toKebab(slugOrCode);
    const destPath = join(OUT_DIR, `${destName}.png`);
    const url = item.entry.match.url;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "project-hail-mary/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // Source images range from tiny hand-drawn line art to full-res photos
      // (some >3000px wide). These render as small in-app thumbnails/media
      // (40px–96px), so cap dimensions to keep public/exercises/ lightweight.
      await sharp(buf)
        .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toFile(destPath);
      results.push({ ...item, destPath, ok: true, srcUrl: url });
      console.log(`✓ ${item.kind}:${slugOrCode} <- ${item.entry.match.name} (dice=${item.entry.match.dice.toFixed(2)}) -> ${destName}.png`);
    } catch (err) {
      results.push({ ...item, ok: false, error: err.message });
      console.log(`✗ ${item.kind}:${slugOrCode} download failed: ${err.message} (skipping)`);
    }
  }

  for (const item of droppedForCap) {
    const slugOrCode = item.kind === "catalog" ? item.entry.code : item.entry.slug;
    console.log(`- ${item.kind}:${slugOrCode} matched but dropped (cap of ${CAP} reached)`);
  }

  // Disk usage total
  const { stat } = await import("node:fs/promises");
  let totalBytes = 0;
  for (const r of results.filter((r) => r.ok)) {
    const s = await stat(r.destPath);
    totalBytes += s.size;
  }

  console.log("\n=== FINAL MAPPING ===");
  const mapping = {
    catalog: {},
    library: {},
    unmatched: {
      libraryNoMatch: libraryMisses.map((l) => l.slug),
      librarySkippedManually: librarySkipped.map((l) => l.slug),
      droppedForCap: droppedForCap.map((i) => (i.kind === "catalog" ? i.entry.code : i.entry.slug)),
    },
  };
  for (const r of results.filter((r) => r.ok)) {
    const slugOrCode = r.kind === "catalog" ? r.entry.code : r.entry.slug;
    const rec = {
      src: `/exercises/${toKebab(slugOrCode)}.png`,
      matchedName: r.entry.match.name,
      dice: Number(r.entry.match.dice.toFixed(2)),
      wgerImage: r.srcUrl,
    };
    if (r.kind === "catalog") mapping.catalog[slugOrCode] = rec;
    else mapping.library[slugOrCode] = rec;
  }
  console.log(JSON.stringify(mapping, null, 2));
  console.log(`\nDownloaded ${results.filter((r) => r.ok).length} images, ${(totalBytes / 1024).toFixed(1)} KB total in public/exercises/.`);

  // Also write mapping to a scratch file for the follow-up hand-edit of
  // lib/library.ts and lib/data/seed.ts (not a project deliverable itself).
  const scratchPath = process.env.WGER_MAPPING_OUT;
  if (scratchPath) {
    await writeFile(scratchPath, JSON.stringify(mapping, null, 2));
    console.log(`\n(mapping also written to ${scratchPath})`);
  }
}

function toKebab(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

main();
