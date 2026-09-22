import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/Home";
import { recipeById, recipes } from "@/lib/recipes";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

// Posebna adresa za svaki recept (/recept/059) — deljeni link dobija naziv i ilustraciju recepta.
export function generateStaticParams() {
  return recipes.map((recipe) => ({ id: recipe.id }));
}

const snippet = (html: string) => {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, "")}…` : text;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = recipeById.get((await params).id);
  if (!recipe) return {};
  const title = `${recipe.name} — ${SITE_NAME}`;
  const description = snippet(recipe.note || recipe.bodyHtml) || `Recept № ${recipe.id} iz Majine sveske.`;
  const url = `/recept/${recipe.id}`;
  const images = recipe.image ? [{ url: recipe.image, width: 800, height: 800, alt: `Akvarel ilustracija za ${recipe.name}` }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "article", locale: "sr_RS", url, images },
    twitter: { card: recipe.image ? "summary_large_image" : "summary", title, description, images: images?.map((image) => image.url) },
  };
}

export default async function RecipePage({ params }: Props) {
  const { id } = await params;
  if (!recipeById.has(id)) notFound();
  return <Home initialRecipeId={id} />;
}
