// Pravi public/recipes/NNN.webp (800px) i public/recipes/400/NNN.webp (400px, za kartice) iz akvarel ilustracija i PWA ikonice iz recepta 001.
// Ilustracije moraju imati providnu pozadinu (kartice i hero su obojeni): bela pozadina izvornog PNG-a se uklanja.
// Pokretanje: pnpm images            (ILUSTRACIJE_DIR ili ../assets/izrazeni-akvarel ili ~/Documents/Kuvar/assets/izrazeni-akvarel)
//             pnpm images -- --force (ponovo generiše i postojeće)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { ensureTransparent } from "./remove-background.mjs";

const force = process.argv.includes("--force");
const candidates = [
  process.env.ILUSTRACIJE_DIR,
  path.resolve("../assets/izrazeni-akvarel"),
  path.join(os.homedir(), "Documents/Kuvar/assets/izrazeni-akvarel"),
].filter(Boolean);
const sourceDir = candidates.find((dir) => fs.existsSync(dir));
if (!sourceDir) throw new Error(`Nema foldera sa ilustracijama. Probano: ${candidates.join(", ")}`);
const outDir = path.resolve("public/recipes");
const iconDir = path.resolve("public/icons");
// [folder, max širina/visina, webp kvalitet]
const sizes = [
  [outDir, 800, 82],
  [path.join(outDir, "400"), 400, 78],
];
for (const [dir] of sizes) fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(iconDir, { recursive: true });

// Samo ilustracije za recepte koji postoje u app/recipes-data.json (npr. 060 je izbačen iz zbirke).
const recipeIds = new Set(JSON.parse(fs.readFileSync(path.resolve("app/recipes-data.json"), "utf8")).map((recipe) => recipe.id));
const allFiles = fs.readdirSync(sourceDir).filter((file) => /^\d{3}-.+\.png$/.test(file)).sort();
const files = allFiles.filter((file) => recipeIds.has(file.slice(0, 3)));
const skipped = allFiles.filter((file) => !recipeIds.has(file.slice(0, 3)));
if (skipped.length) console.log(`Preskočeno (nema recepta): ${skipped.join(", ")}`);
let made = 0;
for (const file of files) {
  const source = path.join(sourceDir, file);
  const targets = sizes.map(([dir, size, quality]) => ({ target: path.join(dir, `${file.slice(0, 3)}.webp`), size, quality }));
  const stale = targets.filter(({ target }) => force || !fs.existsSync(target) || fs.statSync(target).mtimeMs < fs.statSync(source).mtimeMs);
  if (!stale.length) continue;
  const transparent = await (await ensureTransparent(source)).png().toBuffer();
  for (const { target, size, quality } of stale) {
    await sharp(transparent).resize(size, size, { fit: "inside", withoutEnlargement: true }).webp({ quality, alphaQuality: 90 }).toFile(target);
    made += 1;
  }
}
console.log(`Ilustracije: ${files.length} u izvoru, ${made} novih/obnovljenih webp fajlova u public/recipes i public/recipes/400`);

const hero = files.find((file) => file.startsWith("001-"));
if (hero) {
  const base = sharp(path.join(sourceDir, hero)).flatten({ background: "#f4efe3" });
  const icons = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ];
  for (const [name, size] of icons) {
    await base.clone().resize(size, size, { fit: "cover" }).png().toFile(path.join(iconDir, name));
  }
  console.log(`Ikonice: ${icons.map(([name]) => name).join(", ")}`);
}

// Obriši webp ilustracije (obe veličine) za recepte kojih više nema.
for (const [dir] of sizes) {
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(/^(\d{3})\.webp$/);
    if (match && !recipeIds.has(match[1])) {
      fs.rmSync(path.join(dir, file));
      console.log(`Obrisano: ${path.relative(process.cwd(), path.join(dir, file))} (nema recepta)`);
    }
  }
}
