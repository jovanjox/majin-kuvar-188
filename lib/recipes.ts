// Podaci recepata, kategorije i indeks za pretragu (deli ih cela aplikacija).
import recipesData from "@/app/recipes-data.json";
import curation from "@/app/curation.json";
import type { Recipe } from "./types";

export type { Ingredient, IngredientGroup, Recipe, Variant } from "./types";

export const recipes = recipesData as Recipe[];
export const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

export const FIRST_YEAR = 1995;

export const categories = [
  "Sve",
  "Poslastice",
  "Torte",
  "Hleb i peciva",
  "Glavna jela",
  "Testenine i prilozi",
  "Predjela i salate",
  "Zimnica",
] as const;
export type Category = (typeof categories)[number];

export const categorySymbols: Record<string, string> = {
  Poslastice: "✦",
  Torte: "♜",
  "Hleb i peciva": "⌁",
  "Glavna jela": "◒",
  "Testenine i prilozi": "∿",
  "Predjela i salate": "❧",
  Zimnica: "◉",
};

export const categoryCounts = recipes.reduce<Record<string, number>>((acc, recipe) => {
  acc[recipe.broadCategory] = (acc[recipe.broadCategory] || 0) + 1;
  return acc;
}, {});

export const normalize = (value: string) =>
  value
    .toLocaleLowerCase("sr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj");

export const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Manja (400 px) varijanta ilustracije za kartice: /recipes/054.webp → /recipes/400/054.webp.
export const smallImage = (image: string) => image.replace(/^\/recipes\//, "/recipes/400/");

export const allIngredients = (recipe: Recipe) => recipe.ingredientGroups.flatMap((group) => group.items);

// Pretraga po nazivu, kategoriji, sastojcima i tekstu postupka (bez dijakritika).
export const searchIndex = new Map(
  recipes.map((recipe) => [
    recipe.id,
    normalize(
      [
        recipe.id,
        recipe.name,
        recipe.subtitle,
        recipe.category,
        allIngredients(recipe).map((item) => item.text).join(" "),
        stripHtml(recipe.bodyHtml),
      ].join(" "),
    ),
  ]),
);

const pick = (ids: string[]) => ids.map((id) => recipeById.get(id)).filter((recipe): recipe is Recipe => Boolean(recipe));

export const heroRecipe = recipeById.get(curation.hero.id) ?? recipes[0];
export const heroCuration = curation.hero;
export const featuredRecipes = pick(curation.featured.map((item) => item.id));
export const featuredStories: Record<string, string> = Object.fromEntries(curation.featured.map((item) => [item.id, item.story]));
export const recommendedRank = new Map(curation.recommendedOrder.map((id, index) => [id, index]));
export const recommendedBadges: Record<string, string> = curation.badges;
