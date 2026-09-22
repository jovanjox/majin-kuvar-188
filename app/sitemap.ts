import type { MetadataRoute } from "next";
import { recipes } from "@/lib/recipes";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    ...recipes.map((recipe) => ({ url: `${SITE_URL}/recept/${recipe.id}`, priority: 0.7 })),
  ];
}
