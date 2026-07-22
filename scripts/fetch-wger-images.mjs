/* One-shot tooling: pull line-art exercise images from the wger.de open
 * exercise database for the LIBRARY entries in lib/library.ts that don't yet
 * have a `media` image. Matching is a token-Dice heuristic — best-effort visual
 * reference, so partial coverage / skips are expected. Run:
 *   WGER_MAPPING_OUT=/tmp/wger.json node scripts/fetch-wger-images.mjs
 *
 * The library list is parsed straight from lib/library.ts (single source of
 * truth). This script only fetches/matches/downloads + prints a mapping; the
 * `media:` fields in lib/library.ts are applied by hand from that mapping,
 * keeping only visually-correct matches.
 */
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "public/exercises");
const CAP = 130;
const MIN_DICE = 0.55; // a touch stricter than before to cut wrong matches

/* ------------------------------------------------------------------ *
 * 1. Library entries — parsed from lib/library.ts. Search terms = the *
 *    English name + any ASCII aliases. Entries that already have a    *
 *    `media: img(...)` are skipped (already covered).                 *
 * ------------------------------------------------------------------ */
const libSrc = await readFile(join(root, "lib/library.ts"), "utf8");
const LIBRARY = [];
for (const line of libSrc.split("\n")) {
  const m = line.match(/\bslug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/);
  if (!m) continue;
  const [, slug, name] = m;
  const mus = line.match(/targetMuscle:\s*"([^"]+)"/);
  const hasMedia = /\bmedia:\s*img\(/.test(line);
  const al = line.match(/aliases:\s*\[([^\]]*)\]/);
  const aliases = al
    ? [...al[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((a) => /^[\x20-\x7E]+$/.test(a))
    : [];
  LIBRARY.push({ slug, name, targetMuscle: mus?.[1] ?? "", hasMedia, terms: [name.toLowerCase(), ...aliases] });
}

// Catalog (seed.ts) images are already curated — don't re-fetch/disturb them.
const CATALOG = [];

/* ------------------------------------------------------------------ *
 * 2. Matching — token-Dice coefficient with light stemming.           *
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

function bestMatch(candidates, terms, minDice = MIN_DICE) {
  let best = null;
  for (const term of terms) {
    const qt = tokenize(expandAbbrev(term));
    for (const c of candidates) {
      const d = dice(qt, c.tokens);
      if (d < minDice) continue;
      if (
        !best ||
        d > best.dice ||
        (d === best.dice && c.isMain && !best.isMain) ||
        (d === best.dice && c.isMain === best.isMain && c.name.length < best.name.length)
      ) {
        best = { dice: d, isMain: c.isMain, name: c.name, exerciseId: c.exerciseId, url: c.url };
      }
    }
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * 3. Fetch wger data.                                                 *
 * ------------------------------------------------------------------ */
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "project-hail-mary/1.0 (one-shot image fetch script)" },
  });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log("Fetching wger exercise images…");
  let imagesData;
  let translationsData;
  try {
    imagesData = await fetchJson("https://wger.de/api/v2/exerciseimage/?format=json&limit=600");
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

  const candidates = [];
  for (const [exid, img] of byExercise) {
    const names = idToNames.get(exid);
    if (!names) continue;
    for (const name of names) {
      candidates.push({ name, tokens: tokenize(name), exerciseId: exid, url: img.image, isMain: img.is_main });
    }
  }
  console.log(`Loaded ${imagesData.results.length} images, ${candidates.length} named+imaged candidates.\n`);

  const libraryMatches = [];
  for (const entry of CATALOG) void entry; // catalog intentionally empty
  for (const entry of LIBRARY) {
    if (entry.hasMedia) {
      libraryMatches.push({ ...entry, match: null, manualSkip: true });
      continue;
    }
    const m = bestMatch(candidates, entry.terms);
    libraryMatches.push({ ...entry, match: m });
  }

  const libraryHits = libraryMatches.filter((l) => l.match);
  const libraryMisses = libraryMatches.filter((l) => !l.match && !l.manualSkip);
  const alreadyImaged = libraryMatches.filter((l) => l.manualSkip);

  console.log(
    `Library: ${libraryHits.length} new matches, ${libraryMisses.length} no-match, ${alreadyImaged.length} already have media.\n`
  );

  // Round-robin by muscle so the cap spreads fairly across groups.
  const byMuscle = new Map();
  for (const l of libraryHits) {
    const arr = byMuscle.get(l.targetMuscle) ?? [];
    arr.push(l);
    byMuscle.set(l.targetMuscle, arr);
  }
  const muscleOrder = [...byMuscle.keys()];
  const queue = [];
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
    const destName = toKebab(item.entry.slug);
    const destPath = join(OUT_DIR, `${destName}.png`);
    const url = item.entry.match.url;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "project-hail-mary/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf)
        .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toFile(destPath);
      results.push({ ...item, destPath, ok: true, srcUrl: url });
      console.log(
        `✓ ${item.entry.slug} <- "${item.entry.match.name}" (dice=${item.entry.match.dice.toFixed(2)}) -> ${destName}.png`
      );
    } catch (err) {
      results.push({ ...item, ok: false, error: err.message });
      console.log(`✗ ${item.entry.slug} download failed: ${err.message} (skipping)`);
    }
  }

  for (const item of droppedForCap) {
    console.log(`- ${item.entry.slug} matched but dropped (cap of ${CAP} reached)`);
  }

  console.log("\n=== FINAL MAPPING (slug -> match; review dice + name before attaching) ===");
  const mapping = {
    library: {},
    unmatched: libraryMisses.map((l) => l.slug),
  };
  for (const r of results.filter((r) => r.ok)) {
    mapping.library[r.entry.slug] = {
      src: `/exercises/${toKebab(r.entry.slug)}.png`,
      matchedName: r.entry.match.name,
      dice: Number(r.entry.match.dice.toFixed(2)),
      wgerImage: r.srcUrl,
    };
  }
  console.log(JSON.stringify(mapping, null, 2));
  console.log(`\nDownloaded ${results.filter((r) => r.ok).length} images into public/exercises/.`);

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
