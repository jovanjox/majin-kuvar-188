import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.doesNotMatch(html, /188 recepata/, "broj recepata ne sme biti hardkodovan");
});
