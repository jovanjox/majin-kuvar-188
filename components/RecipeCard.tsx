import { categorySymbols, smallImage, type Recipe } from "@/lib/recipes";

// Stvarna širina ilustracije (kvadrat, object-fit: contain) po app/globals.css:
// telefon do 540px: kartica preko cele širine, slika ograničena visinom .card-art (≤ 268px);
// mreža iznad 540px: visina .card-art clamp(220px, 18vw, 270px) minus 28px okvira;
// istaknute kartice iznad 540px: leva kolona ~40% širine sekcije.
const PHONE_SIZE = "(max-width: 540px) min(100vw - 78px, 268px)";
const GRID_SIZES = `${PHONE_SIZE}, clamp(192px, 18vw - 28px, 242px)`;
const FEATURED_SIZES = `${PHONE_SIZE}, (max-width: 820px) 34vw, 32vw`;

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
            <img
              src={recipe.image}
              srcSet={`${smallImage(recipe.image)} 400w, ${recipe.image} 800w`}
              sizes={featured ? FEATURED_SIZES : GRID_SIZES}
              alt=""
              loading="lazy"
              decoding="async"
            />
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
