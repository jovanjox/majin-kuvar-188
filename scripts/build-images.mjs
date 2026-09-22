// Pravi public/recipes/NNN.webp (800px) iz akvarel ilustracija i PWA ikonice iz recepta 001.
// Pokretanje: pnpm images            (ILUSTRACIJE_DIR ili ../assets/izrazeni-akvarel ili ~/Documents/Kuvar/assets/izrazeni-akvarel)
//             pnpm images -- --force (ponovo generiše i postojeće)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

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
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(iconDir, { recursive: true });

// Samo ilustracije za recepte koji postoje u app/recipes-data.json (npr. 060 je izbačen iz zbirke).
const recipeIds = new Set(JSON.parse(fs.readFileSync(path.resolve("app/recipes-data.json"), "utf8")).map((recipe) => recipe.id));
const allFiles = fs.readdirSync(sourceDir).filter((file) => /^\d{3}-.+\.png$/.test(file)).sort();
const files = allFiles.filter((file) => recipeIds.has(file.slice(0, 3)));
const skipped = allFiles.filter((file) => !recipeIds.has(file.slice(0, 3)));
if (skipped.length) console.log(`Preskočeno (nema recepta): ${skipped.join(", ")}`);
let made = 0;
for (const file of files) {
  const id = file.slice(0, 3);
  const target = path.join(outDir, `${id}.webp`);
  const source = path.join(sourceDir, file);
  if (!force && fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs) continue;
  await sharp(source).resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
  made += 1;
}
console.log(`Ilustracije: ${files.length} u izvoru, ${made} novih/obnovljenih u public/recipes`);

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

// Obriši webp ilustracije za recepte kojih više nema.
for (const file of fs.readdirSync(outDir)) {
  const match = file.match(/^(\d{3})\.webp$/);
  if (match && !recipeIds.has(match[1])) {
    fs.rmSync(path.join(outDir, file));
    console.log(`Obrisano: public/recipes/${file} (nema recepta)`);
  }
}
