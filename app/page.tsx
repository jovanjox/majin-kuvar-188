"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import recipesData from "./recipes-data.json";

type Recipe = (typeof recipesData)[number];

const categories = [
  "Sve",
  "Poslastice",
  "Torte",
  "Hleb i peciva",
  "Glavna jela",
  "Testenine i prilozi",
  "Predjela i salate",
  "Zimnica",
] as const;

const categorySymbols: Record<string, string> = {
  Poslastice: "✦",
  Torte: "♜",
  "Hleb i peciva": "⌁",
  "Glavna jela": "◒",
  "Testenine i prilozi": "∿",
  "Predjela i salate": "❧",
  Zimnica: "◉",
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("sr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj");

const featuredStories: Record<string, string> = {
  "054": "Čokoladni slojevi, višnja i šlag — torta koja je obeležila porodična slavlja.",
  "181": "Slojevi domaćih kora, bogat bolonjeze i bešamel: recept za okupljanje za stolom.",
  "022": "Hrskave korpice, nežan krem i šećer u prahu — princez krofne za posebne porodične dane.",
};

const merchandisingIds = [
  "059", "181", "054", "151", "095", "178", "173", "018",
  "053", "043", "184", "080", "153", "067", "050", "123",
  "175", "162", "135", "079", "145", "094", "169", "187",
  "001", "057", "069", "026", "025", "047", "188",
];

const merchandisingRank = new Map(merchandisingIds.map((id, index) => [id, index]));
const merchandisingBadges: Record<string, string> = {
  "059": "Najtraženije",
  "181": "Porodični favorit",
  "054": "Klasik",
  "151": "Nedeljni favorit",
  "095": "Za deljenje",
  "018": "Omiljeni desert",
};

function RecipeCard({
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
      <button className="card-main" onClick={onOpen} aria-label={`Otvori recept ${recipe.name}`}>
        <div className={`card-art category-${recipe.broadCategory.replaceAll(" ", "-").toLowerCase()}`}>
          {recipe.image ? (
            <img src={recipe.image} alt="" loading="lazy" />
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
          <p className="card-note">
            {recipe.subtitle || recipe.category.replaceAll("/", " · ")}
          </p>
          {featuredText && <p className="featured-story">{featuredText}</p>}
          <span className="read-link">Pogledaj recept <b aria-hidden="true">→</b></span>
        </div>
      </button>
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

function RecipeView({
  recipe,
  favorite,
  onClose,
  onFavorite,
}: {
  recipe: Recipe;
  favorite: boolean;
  onClose: () => void;
  onFavorite: () => void;
}) {
  const [checked, setChecked] = useState<number[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setChecked([]);
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [recipe.id, onClose]);

  return (
    <div className="recipe-overlay" role="dialog" aria-modal="true" aria-labelledby="recipe-title">
      <button className="overlay-close-zone" onClick={onClose} aria-label="Zatvori recept" />
      <article className="recipe-sheet">
        <div className="sheet-topbar">
          <button className="round-button" onClick={onClose} aria-label="Zatvori recept">←</button>
          <div className="sheet-actions">
            <button className="text-button" onClick={() => window.print()}>Štampaj</button>
            <button className={`round-button ${favorite ? "is-favorite" : ""}`} onClick={onFavorite} aria-label="Omiljeni recept">
              {favorite ? "♥" : "♡"}
            </button>
          </div>
        </div>

        <header className="recipe-header">
          <div>
            <p className="eyebrow">Recept № {recipe.id} · {recipe.broadCategory}</p>
            <h1 id="recipe-title" ref={titleRef} tabIndex={-1}>{recipe.name}</h1>
            {recipe.subtitle && <p className="recipe-subtitle">{recipe.subtitle}</p>}
            <div className="recipe-meta">
              {recipe.temperature && <span><b>Temperatura</b>{recipe.temperature}</span>}
              {recipe.time && <span><b>Vreme</b>{recipe.time}</span>}
              <span><b>Sastojaka</b>{recipe.ingredients.length || "—"}</span>
            </div>
          </div>
          <div className={`sheet-art ${recipe.image ? "has-image" : ""}`}>
            {recipe.image ? (
              <img src={recipe.image} alt={`Akvarel ilustracija za ${recipe.name}`} />
            ) : (
              <div className="large-monogram" aria-hidden="true">
                <span>{categorySymbols[recipe.broadCategory] || "✦"}</span>
                <small>Majin kuvar</small>
              </div>
            )}
          </div>
        </header>

        {recipe.note && <aside className="recipe-note"><span>Majina beleška</span>{recipe.note}</aside>}

        <div className="recipe-columns">
          <section className="ingredients-panel">
            <div className="section-heading">
              <p className="eyebrow">Pripremi</p>
              <h2>Sastojci</h2>
            </div>
            {recipe.ingredients.length ? (
              <ul className="ingredient-list">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={`${ingredient}-${index}`} className={checked.includes(index) ? "checked" : ""}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked.includes(index)}
                        onChange={() => setChecked((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index])}
                      />
                      <span className="checkmark" aria-hidden="true">✓</span>
                      <span>{ingredient}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sastojci su navedeni u postupku ispod.</p>
            )}
          </section>
          <section className="method-panel">
            <div className="section-heading">
              <p className="eyebrow">Korak po korak</p>
              <h2>Priprema</h2>
            </div>
            <div className="recipe-prose" dangerouslySetInnerHTML={{ __html: recipe.bodyHtml }} />
          </section>
        </div>

        {recipe.hasQuestion && (
          <p className="transcription-note">Ovaj recept sadrži jednu belešku označenu za proveru prema originalnoj svesci.</p>
        )}
      </article>
    </div>
  );
}

export default function Home() {
  const recipes = recipesData as Recipe[];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Sve");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const stored = window.localStorage.getItem("majin-kuvar-favorites");
    if (stored) setFavorites(JSON.parse(stored));
    const openFromHash = () => {
      const id = window.location.hash.match(/^#recept-(\d{3})$/)?.[1];
      setSelected(id ? recipes.find((recipe) => recipe.id === id) || null : null);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [recipes]);

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    const matching = recipes.filter((recipe) => {
      const categoryMatch = category === "Sve" || recipe.broadCategory === category;
      const favoriteMatch = !onlyFavorites || favorites.includes(recipe.id);
      const searchMatch = !query || normalize(recipe.searchText).includes(query);
      return categoryMatch && favoriteMatch && searchMatch;
    });

    if (category === "Sve" && !query && !onlyFavorites) {
      return matching.sort((a, b) => {
        const rankA = merchandisingRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rankB = merchandisingRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return rankA - rankB || a.id.localeCompare(b.id);
      });
    }

    return matching;
  }, [recipes, search, category, onlyFavorites, favorites]);

  useEffect(() => setVisibleCount(24), [search, category, onlyFavorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem("majin-kuvar-favorites", JSON.stringify(next));
      return next;
    });
  };

  const openRecipe = (recipe: Recipe) => {
    setSelected(recipe);
    window.history.pushState(null, "", `#recept-${recipe.id}`);
  };

  const closeRecipe = () => {
    setSelected(null);
    window.history.pushState(null, "", window.location.pathname + window.location.search);
  };

  const chooseRandom = () => {
    const pool = filtered.length ? filtered : recipes;
    openRecipe(pool[Math.floor(Math.random() * pool.length)]);
  };

  const featuredIds = ["054", "181", "022"];
  const featured = featuredIds
    .map((id) => recipes.find((recipe) => recipe.id === id))
    .filter((recipe): recipe is Recipe => Boolean(recipe));
  const isMerchandising = category === "Sve" && !search.trim() && !onlyFavorites;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#vrh" aria-label="Majin kuvar, početna">
          <span className="brand-mark">M</span>
          <span><b>Majin kuvar</b><small>porodična zbirka</small></span>
        </a>
        <nav aria-label="Glavna navigacija">
          <a href="#recepti">Recepti</a>
          <a href="#prica">Priča</a>
          <button className="favorites-nav" onClick={() => { setOnlyFavorites(!onlyFavorites); document.querySelector("#recepti")?.scrollIntoView({ behavior: "smooth" }); }}>
            {onlyFavorites ? "♥" : "♡"} Omiljeni <span>{favorites.length}</span>
          </button>
        </nav>
      </header>

      <section className="hero" id="vrh">
        <div className="hero-copy">
          <p className="hero-kicker"><span /> Porodični recepti od 1995.</p>
          <h1>Sačuvano od zaborava.<br /><em>Spremno za novu trpezu.</em></h1>
          <p className="hero-intro">
            Rukom pisana sveska postala je digitalni kuvar — 188 pažljivo prepisanih recepata za svaki dan i one posebne prilike.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#recepti">Istraži recepte <span>→</span></a>
            <button className="secondary-button" onClick={chooseRandom}>✦ Iznenadi me</button>
          </div>
          <div className="hero-stats" aria-label="O kuvaru u brojevima">
            <span><b>188</b> recepata</span>
            <span><b>8</b> kategorija</span>
            <span><b>31</b> godina tradicije</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Akvarel ilustracija čokoladnog musa">
          <div className="wash wash-one" />
          <div className="wash wash-two" />
          <p className="handwritten">Prvi recept<br />u svesci</p>
          <img src="/recipes/001.webp" alt="Akvarel čokoladnog musa u staklenoj činiji" />
          <div className="hero-caption"><span>№ 001</span><b>Mousse au chocolat</b><small>za trenutke koji se pamte</small></div>
        </div>
      </section>

      <section className="featured-section" id="prica">
        <div className="section-intro">
          <div>
            <p className="eyebrow">Iz sveske</p>
            <h2>Recepti koji nose priču</h2>
          </div>
          <p>Originalne beleške, porodična imena i mali tragovi vremena — sačuvani baš kako su zapisani.</p>
        </div>
        <div className="featured-grid">
          {featured.slice(0, 3).map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} featured featuredText={featuredStories[recipe.id]} favorite={favorites.includes(recipe.id)} onOpen={() => openRecipe(recipe)} onFavorite={() => toggleFavorite(recipe.id)} />
          ))}
        </div>
      </section>

      <section className="collection-section" id="recepti">
        <div className="collection-heading">
          <div>
            <p className="eyebrow">Cela zbirka</p>
            <h2>Šta danas spremamo?</h2>
          </div>
          <div className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Traži po nazivu ili sastojku…"
              aria-label="Pretraži recepte"
            />
            {search && <button onClick={() => setSearch("")} aria-label="Obriši pretragu">×</button>}
          </div>
        </div>

        <div className="filter-row" aria-label="Kategorije recepata">
          {categories.map((item) => (
            <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
          <button className={`mobile-favorite-filter ${onlyFavorites ? "active" : ""}`} onClick={() => setOnlyFavorites(!onlyFavorites)}>♡ Omiljeni</button>
        </div>

        <div className="results-bar">
          <p><b>{filtered.length}</b> {filtered.length === 1 ? "recept" : "recepata"}{onlyFavorites ? " u omiljenim" : ""}</p>
          <button onClick={chooseRandom}>✦ Nasumičan recept</button>
        </div>

        {filtered.length ? (
          <>
            <div className="recipe-grid">
              {filtered.slice(0, visibleCount).map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} merchandisingBadge={isMerchandising ? merchandisingBadges[recipe.id] : undefined} favorite={favorites.includes(recipe.id)} onOpen={() => openRecipe(recipe)} onFavorite={() => toggleFavorite(recipe.id)} />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <button className="load-more" onClick={() => setVisibleCount((count) => count + 24)}>
                Prikaži još recepata <span>{filtered.length - visibleCount}</span>
              </button>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span>⌕</span>
            <h3>Nema recepta za taj upit</h3>
            <p>Probaj drugi naziv, sastojak ili kategoriju.</p>
            <button onClick={() => { setSearch(""); setCategory("Sve"); setOnlyFavorites(false); }}>Prikaži sve recepte</button>
          </div>
        )}
      </section>

      <section className="story-section">
        <div className="story-number">188</div>
        <div className="story-copy">
          <p className="eyebrow">Jedna sveska, mnogo stolova</p>
          <h2>Ukusi koji povezuju generacije.</h2>
          <p>Od kremova i torti, preko pogača i testenina, do sarme i zimnice — svaki zapis je deo porodične istorije. Digitalizovan da ostane čitljiv, pretraživ i uvek nadohvat ruke.</p>
        </div>
        <div className="story-flourish" aria-hidden="true">M</div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#vrh"><span className="brand-mark">M</span><span><b>Majin kuvar</b><small>porodična zbirka</small></span></a>
        <p>188 recepata · prepisano s pažnjom · kuvano s ljubavlju</p>
        <a href="#vrh">Nazad na vrh ↑</a>
      </footer>

      {selected && (
        <RecipeView recipe={selected} favorite={favorites.includes(selected.id)} onClose={closeRecipe} onFavorite={() => toggleFavorite(selected.id)} />
      )}
    </main>
  );
}
