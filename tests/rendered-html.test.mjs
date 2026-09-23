import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const recipes = JSON.parse(await readFile(new URL("app/recipes-data.json", root), "utf8"));

async function render(pathname = "/") {
  const workerUrl = new URL("dist/server/index.js", root);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("podaci o receptima su konzistentni", async () => {
  assert.ok(recipes.length >= 188, `očekivano bar 188 recepata, ima ${recipes.length}`);
  const ids = new Set(recipes.map((recipe) => recipe.id));
  assert.equal(ids.size, recipes.length, "ID recepata moraju biti jedinstveni");
  for (const recipe of recipes) {
    assert.match(recipe.id, /^\d{3}$/);
    assert.ok(recipe.name, `${recipe.id}: nema naziv`);
    assert.ok(recipe.broadCategory, `${recipe.id}: nema kategoriju`);
    assert.ok(Array.isArray(recipe.ingredientGroups), `${recipe.id}: nema grupe sastojaka`);
    assert.doesNotMatch(recipe.bodyHtml, /<p>\|/, `${recipe.id}: tabela nije renderovana`);
    if (recipe.image) await access(new URL(`public${recipe.image}`, root));
  }
});

test("kuracija početne strane pokazuje na postojeće recepte", async () => {
  const curation = JSON.parse(await readFile(new URL("app/curation.json", root), "utf8"));
  const ids = new Set(recipes.map((recipe) => recipe.id));
  const referenced = [
    curation.hero.id,
    ...curation.featured.map((item) => item.id),
    ...curation.recommendedOrder,
    ...Object.keys(curation.badges),
  ];
  assert.deepEqual(referenced.filter((id) => !ids.has(id)), [], "nepostojeći ID-jevi u app/curation.json");
});

test("svaka ilustracija pripada nekom receptu", async () => {
  const ids = new Set(recipes.map((recipe) => recipe.id));
  const images = (await readdir(new URL("public/recipes/", root))).filter((file) => file.endsWith(".webp"));
  const orphans = images.filter((file) => !ids.has(file.slice(0, 3)));
  assert.deepEqual(orphans, [], "ilustracije bez recepta");
});

test("svaka ilustracija ima i 400 px varijantu za kartice", async () => {
  const expected = recipes.filter((recipe) => recipe.image).map((recipe) => recipe.image.replace("/recipes/", "")).sort();
  const small = (await readdir(new URL("public/recipes/400/", root))).filter((file) => file.endsWith(".webp")).sort();
  assert.deepEqual(expected.filter((file) => !small.includes(file)), [], "nedostaju 400 px varijante");
  assert.deepEqual(small.filter((file) => !expected.includes(file)), [], "višak u public/recipes/400/");
});

test("ilustracije imaju providnu pozadinu (bez belog kvadrata na obojenoj kartici)", async () => {
  const opaque = [];
  for (const dir of ["public/recipes/", "public/recipes/400/"]) {
    for (const file of (await readdir(new URL(dir, root))).filter((name) => name.endsWith(".webp"))) {
      const { data, info } = await sharp(new URL(dir + file, root).pathname).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const corners = [0, info.width - 1, (info.height - 1) * info.width, info.height * info.width - 1];
      if (corners.some((pixel) => data[pixel * 4 + 3] > 10)) opaque.push(dir + file);
    }
  }
  assert.deepEqual(opaque, [], "ilustracije sa neprovidnom pozadinom — pokreni pnpm images -- --force");
});

test("početna strana se renderuje sa svim receptima", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Majin kuvar — \d+ porodičn/);
  assert.match(html, /Sačuvano od zaborava\./);
  assert.match(html, /Šta danas spremamo\?/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /favicon\.svg/);
  assert.match(html, /property="og:image" content="https:\/\/[^"]+\/og\.jpg"/);
  assert.doesNotMatch(html, /188 recepata/, "broj recepata ne sme biti hardkodovan");
});

test("stranica recepta ima svoj naslov, opis i ilustraciju za deljenje", async () => {
  const recipe = recipes.find((item) => item.image);
  const response = await render(`/recept/${recipe.id}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(`<title>${recipe.name.replaceAll("&", "&amp;")} — Majin kuvar</title>`), "naslov recepta");
  assert.match(html, new RegExp(`property="og:image" content="https://[^"]+${recipe.image}"`));
  assert.match(html, new RegExp(`rel="canonical" href="https://[^"]+/recept/${recipe.id}"`));
  assert.match(html, /id="recipe-title"/, "recept je otvoren već u HTML-u sa servera");
});

test("nepostojeći recept vraća 404", async () => {
  assert.equal((await render("/recept/999")).status, 404);
});
