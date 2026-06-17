/* Rasterize public/icons/mark.svg into the PNG sizes the PWA manifest needs.
   Run: pnpm gen:icons  (regenerate whenever mark.svg changes) */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icons/mark.svg"));
const out = join(root, "public/icons");

const jobs = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512 }, // mark already centered in a black square => maskable-safe
  { name: "apple-touch-icon.png", size: 180 },
];

await Promise.all(
  jobs.map(({ name, size }) =>
    sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(join(out, name))
      .then(() => console.log("wrote", name, size))
  )
);

// favicon (32px) into app/ so Next picks it up
await sharp(svg, { density: 384 })
  .resize(32, 32)
  .png()
  .toFile(join(root, "public/icons/favicon-32.png"))
  .then(() => console.log("wrote favicon-32.png"));
