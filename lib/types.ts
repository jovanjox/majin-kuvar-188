// Oblik podataka iz app/recipes-data.json (pravi ga scripts/generate-recipes.mjs).
export type Ingredient = { text: string; qty: number | null; qtyTo?: number | null; unit: string | null; item: string | null; note: string | null };
export type IngredientGroup = { title: string; items: Ingredient[] };
export type Variant = { title: string; note: string | null; items: Ingredient[] };
export type Recipe = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  broadCategory: string;
  temperature: string;
  time: string;
  yield: string;
  source: string;
  note: string;
  status: string;
  ingredientGroups: IngredientGroup[];
  variants: Variant[];
  bodyHtml: string;
  image: string;
};
