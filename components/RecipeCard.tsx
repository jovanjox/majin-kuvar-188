import { categorySymbols, type Recipe } from "@/lib/recipes";

export function RecipeCard({
  recipe,
  favorite,
  onOpen,
  onFavorite,
  featured = false,
  featuredText,
  merchandisingBadge,
}: {
  recipe: Recipe;
  favorite: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  featured?: boolean;
  featuredText?: string;
  merchandisingBadge?: string;
}) {
  return (
    <article className={`recipe-card ${featured ? "featured-card" : ""}`}>
      <a className="card-main" href={`#recept-${recipe.id}`} onClick={(event) => { event.preventDefault(); onOpen(); }} aria-label={`Otvori recept ${recipe.name}`}>
        <div className={`card-art category-${recipe.broadCategory.replaceAll(" ", "-").toLowerCase()}`}>
          {recipe.image ? (
            <img src={recipe.image} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="card-monogram" aria-hidden="true">
              <span>{categorySymbols[recipe.broadCategory] || "✦"}</span>
              <small>{recipe.id}</small>
            </div>
          )}
          <span className="recipe-number">№ {recipe.id}</span>
          {merchandisingBadge && <span className="merch-badge">{merchandisingBadge}</span>}
        </div>
        <div className="card-copy">
          <p className="eyebrow">{recipe.broadCategory}</p>
          <h3>{recipe.name}</h3>
          <p className="card-note">{recipe.subtitle || recipe.category.replaceAll("/", " · ")}</p>
          {featuredText && <p className="featured-story">{featuredText}</p>}
          <span className="read-link">Pogledaj recept <b aria-hidden="true">→</b></span>
        </div>
      </a>
      <button
        className={`favorite-button ${favorite ? "is-favorite" : ""}`}
        onClick={onFavorite}
        aria-label={favorite ? `Ukloni ${recipe.name} iz omiljenih` : `Sačuvaj ${recipe.name} u omiljene`}
        aria-pressed={favorite}
      >
        {favorite ? "♥" : "♡"}
      </button>
    </article>
  );
}
