"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeView } from "@/components/RecipeView";
import { pluralForm } from "@/lib/plural";
import {
  FIRST_YEAR,
  categories,
  categoryCounts,
  featuredRecipes,
  featuredStories,
  heroCuration,
  heroRecipe,
  normalize,
  recipeById,
  recipes,
  recommendedBadges,
  recommendedRank,
  searchIndex,
  type Category,
  type Recipe,
} from "@/lib/recipes";
import { RECIPE_COUNT, siteTitle } from "@/lib/site";
import { favoritesStore, hashStore, recentStore } from "@/lib/stores";

const RECEPT = pluralForm(RECIPE_COUNT, ["recept", "recepta", "recepata"]);
const PREPISAN = pluralForm(RECIPE_COUNT, ["pažljivo prepisan recept", "pažljivo prepisana recepta", "pažljivo prepisanih recepata"]);
const YEARS = new Date().getFullYear() - FIRST_YEAR;

type SortMode = "preporuceno" | "broj" | "naziv";
const sortLabels: Record<SortMode, string> = { preporuceno: "Preporučeno", broj: "Po broju u svesci", naziv: "Po nazivu" };

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("Sve");
  const [sort, setSort] = useState<SortMode>("preporuceno");
  const hash = useSyncExternalStore(hashStore.subscribe, hashStore.get, hashStore.getServer);
  const favorites = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.get, favoritesStore.getServer);
  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.get, recentStore.getServer);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Broj prikazanih kartica se vezuje za trenutni filter — promena filtera ga vraća na 24 bez efekta.
  const filterKey = `${search}|${category}|${onlyFavorites}|${sort}`;
  const [visible, setVisible] = useState({ key: filterKey, count: 24 });
  const visibleCount = visible.key === filterKey ? visible.count : 24;
  const setVisibleCount = (count: number) => setVisible({ key: filterKey, count });

  const selectedId = hash.match(/^#recept-(\d{3})$/)?.[1];
  const selected = selectedId ? recipeById.get(selectedId) ?? null : null;
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    document.title = selected ? `${selected.name} — Majin kuvar` : siteTitle;
  }, [selected]);

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    const matching = recipes.filter((recipe) => {
      const categoryMatch = category === "Sve" || recipe.broadCategory === category;
      const favoriteMatch = !onlyFavorites || favorites.includes(recipe.id);
      const searchMatch = !query || (searchIndex.get(recipe.id) || "").includes(query);
      return categoryMatch && favoriteMatch && searchMatch;
    });
    if (sort === "naziv") return [...matching].sort((a, b) => a.name.localeCompare(b.name, "sr"));
    if (sort === "broj") return matching;
    return [...matching].sort((a, b) => {
      const rankA = recommendedRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const rankB = recommendedRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB || a.id.localeCompare(b.id);
    });
  }, [search, category, onlyFavorites, favorites, sort]);

  const toggleFavorite = (id: string) => {
    const current = favoritesStore.get();
    favoritesStore.set(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const openRecipe = useCallback((recipe: Recipe) => {
    const alreadyOpen = /^#recept-\d{3}$/.test(window.location.hash);
    hashStore.go(`#recept-${recipe.id}`, alreadyOpen);
    recentStore.set([recipe.id, ...recentStore.get().filter((id) => id !== recipe.id)].slice(0, 8));
  }, []);

  const closeRecipe = useCallback(() => {
    if (window.history.state?.recipe) window.history.back();
    else hashStore.go("", true);
  }, []);

  const chooseRandom = () => {
    const pool = filtered.length ? filtered : recipes;
    openRecipe(pool[Math.floor(Math.random() * pool.length)]);
  };

  const scrollToCollection = () => document.querySelector("#recepti")?.scrollIntoView({ behavior: "smooth" });

  const isMerchandising = category === "Sve" && !search.trim() && !onlyFavorites && sort === "preporuceno";
  const recentRecipes = recent
    .map((id) => recipeById.get(id))
    .filter((recipe): recipe is Recipe => Boolean(recipe));

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
          <button className="favorites-nav" onClick={() => { setOnlyFavorites(!onlyFavorites); scrollToCollection(); }} aria-pressed={onlyFavorites}>
            {onlyFavorites ? "♥" : "♡"} Omiljeni <span>{favorites.length}</span>
          </button>
        </nav>
      </header>

      <section className="hero" id="vrh">
        <div className="hero-copy">
          <p className="hero-kicker"><span /> Porodični recepti od {FIRST_YEAR}.</p>
          <h1>Sačuvano od zaborava.<br /> <em>Spremno za novu trpezu.</em></h1>
          <p className="hero-intro">
            Rukom pisana sveska postala je digitalni kuvar — {RECIPE_COUNT} {PREPISAN} za svaki dan i one posebne prilike.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#recepti">Istraži recepte <span>→</span></a>
            <button className="secondary-button" onClick={chooseRandom}>✦ Iznenadi me</button>
          </div>
          <div className="hero-stats" aria-label="O kuvaru u brojevima">
            <span><b>{RECIPE_COUNT}</b> {RECEPT}</span>
            <span><b>{categories.length - 1}</b> kategorija</span>
            <span><b>{YEARS}</b> godina tradicije</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="wash wash-one" />
          <div className="wash wash-two" />
          <p className="handwritten">Prvi recept<br />u svesci</p>
          <img src={heroRecipe.image} alt={heroCuration.alt} fetchPriority="high" />
          <a className="hero-caption" href={`#recept-${heroRecipe.id}`} onClick={(event) => { event.preventDefault(); openRecipe(heroRecipe); }}>
            <span>№ {heroRecipe.id}</span><b>{heroRecipe.name}</b><small>{heroCuration.tagline}</small>
          </a>
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
          {featuredRecipes.slice(0, 3).map((recipe) => (
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
              placeholder="Traži po nazivu, sastojku ili broju…"
              aria-label="Pretraži recepte"
            />
            {search && <button onClick={() => setSearch("")} aria-label="Obriši pretragu">×</button>}
          </div>
        </div>

        <div className="filter-row" aria-label="Kategorije recepata">
          {categories.map((item) => (
            <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} aria-pressed={category === item}>
              {item} <small>{item === "Sve" ? RECIPE_COUNT : categoryCounts[item] || 0}</small>
            </button>
          ))}
          <button className={`mobile-favorite-filter ${onlyFavorites ? "active" : ""}`} onClick={() => setOnlyFavorites(!onlyFavorites)} aria-pressed={onlyFavorites}>♡ Omiljeni</button>
        </div>

        {recentRecipes.length > 0 && !search && (
          <div className="recent-row" aria-label="Nedavno gledano">
            <span className="eyebrow">Nedavno gledano</span>
            {recentRecipes.map((recipe) => (
              <a key={recipe.id} href={`#recept-${recipe.id}`} onClick={(event) => { event.preventDefault(); openRecipe(recipe); }}>
                <small>№ {recipe.id}</small> {recipe.name}
              </a>
            ))}
          </div>
        )}

        <div className="results-bar">
          <p><b>{filtered.length}</b> {pluralForm(filtered.length, ["recept", "recepta", "recepata"])}{onlyFavorites ? " u omiljenim" : ""}</p>
          <div className="results-tools">
            <label className="sort-select">
              <span>Redosled</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Redosled recepata">
                {(Object.keys(sortLabels) as SortMode[]).map((mode) => <option key={mode} value={mode}>{sortLabels[mode]}</option>)}
              </select>
            </label>
            <button onClick={chooseRandom}>✦ Nasumičan recept</button>
          </div>
        </div>

        {filtered.length ? (
          <>
            <div className="recipe-grid">
              {filtered.slice(0, visibleCount).map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} merchandisingBadge={isMerchandising ? recommendedBadges[recipe.id] : undefined} favorite={favorites.includes(recipe.id)} onOpen={() => openRecipe(recipe)} onFavorite={() => toggleFavorite(recipe.id)} />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div className="load-more-row">
                <button className="load-more" onClick={() => setVisibleCount(visibleCount + 24)}>
                  Prikaži još recepata <span>{filtered.length - visibleCount}</span>
                </button>
                <button className="load-all" onClick={() => setVisibleCount(filtered.length)}>Prikaži sve</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span>⌕</span>
            <h3>{onlyFavorites && !favorites.length ? "Još nema omiljenih recepata" : "Nema recepta za taj upit"}</h3>
            <p>{onlyFavorites && !favorites.length ? "Dodirni ♡ na receptu da ga sačuvaš ovde." : "Probaj drugi naziv, sastojak ili kategoriju."}</p>
            <button onClick={() => { setSearch(""); setCategory("Sve"); setOnlyFavorites(false); }}>Prikaži sve recepte</button>
          </div>
        )}
      </section>

      <section className="story-section">
        <div className="story-number">{RECIPE_COUNT}</div>
        <div className="story-copy">
          <p className="eyebrow">Jedna sveska, mnogo stolova</p>
          <h2>Ukusi koji povezuju generacije.</h2>
          <p>Od kremova i torti, preko pogača i testenina, do sarme i zimnice — svaki zapis je deo porodične istorije. Digitalizovan da ostane čitljiv, pretraživ i uvek nadohvat ruke.</p>
        </div>
        <div className="story-flourish" aria-hidden="true">M</div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#vrh"><span className="brand-mark">M</span><span><b>Majin kuvar</b><small>porodična zbirka</small></span></a>
        <p>{RECIPE_COUNT} {RECEPT} · prepisano s pažnjom · kuvano s ljubavlju</p>
        <a href="#vrh">Nazad na vrh ↑</a>
      </footer>

      {selected && (
        <RecipeView
          key={selected.id}
          recipe={selected}
          favorite={favorites.includes(selected.id)}
          onClose={closeRecipe}
          onFavorite={() => toggleFavorite(selected.id)}
          onNavigate={openRecipe}
          onToast={showToast}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

