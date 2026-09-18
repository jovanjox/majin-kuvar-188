"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import recipesData from "./recipes-data.json";

type Ingredient = { text: string; qty: number | null; qtyTo?: number | null; unit: string | null; item: string | null; note: string | null };
type IngredientGroup = { title: string; items: Ingredient[] };
type Variant = { title: string; note: string | null; items: Ingredient[] };
type Recipe = {
  id: string;
  slug: string;
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

const recipes = recipesData as Recipe[];
const RECIPE_COUNT = recipes.length;
// "1 recept", "2 recepta", "5 recepata" — srpska množina po zadnjoj cifri.
const pluralForm = (n: number, forms: [string, string, string]) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1];
  return forms[2];
};
const RECEPT = pluralForm(RECIPE_COUNT, ["recept", "recepta", "recepata"]);
const PREPISAN = pluralForm(RECIPE_COUNT, ["pažljivo prepisan recept", "pažljivo prepisana recepta", "pažljivo prepisanih recepata"]);
const FIRST_YEAR = 1995;
const YEARS = new Date().getFullYear() - FIRST_YEAR;

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
type Category = (typeof categories)[number];

const categorySymbols: Record<string, string> = {
  Poslastice: "✦",
  Torte: "♜",
  "Hleb i peciva": "⌁",
  "Glavna jela": "◒",
  "Testenine i prilozi": "∿",
  "Predjela i salate": "❧",
  Zimnica: "◉",
};

const categoryCounts = recipes.reduce<Record<string, number>>((acc, recipe) => {
  acc[recipe.broadCategory] = (acc[recipe.broadCategory] || 0) + 1;
  return acc;
}, {});

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("sr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj");

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const allIngredients = (recipe: Recipe) => recipe.ingredientGroups.flatMap((group) => group.items);

// Pretraga po nazivu, kategoriji, sastojcima i tekstu postupka (bez dijakritika).
const searchIndex = new Map(
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

const featuredStories: Record<string, string> = {
  "054": "Čokoladni slojevi, višnja i šlag — torta koja je obeležila porodična slavlja.",
  "181": "Slojevi domaćih kora, bogat bolonjeze i bešamel: recept za okupljanje za stolom.",
  "022": "Hrskave korpice, nežan krem i šećer u prahu — princes krofne za posebne porodične dane.",
};

const merchandisingIds = [
  "059", "181", "054", "151", "095", "178", "173", "018",
  "053", "043", "184", "080", "153", "067", "050", "123",
  "175", "162", "135", "079", "145", "094", "169", "187",
  "001", "057", "069", "026", "025", "047", "188", "192",
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

type SortMode = "preporuceno" | "broj" | "naziv";
const sortLabels: Record<SortMode, string> = { preporuceno: "Preporučeno", broj: "Po broju u svesci", naziv: "Po nazivu" };

const SCALES = [0.5, 1, 1.5, 2, 3] as const;

const FAVORITES_KEY = "majin-kuvar-favorites";
const RECENT_KEY = "majin-kuvar-recent";

const readStorage = (key: string): string[] => {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};
const writeStorage = (key: string, value: string[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* privatni režim ili puna memorija — ignoriši */
  }
};

const EMPTY: string[] = [];

// Lista u localStorage kao spoljni store: server vidi praznu listu, klijent pravu, bez setState u efektu.
function createListStore(key: string) {
  let value: string[] | null = null;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    get() {
      if (value === null) value = readStorage(key);
      return value;
    },
    getServer: () => EMPTY,
    set(next: string[]) {
      value = next;
      writeStorage(key, next);
      listeners.forEach((listener) => listener());
    },
  };
}
const favoritesStore = createListStore(FAVORITES_KEY);
const recentStore = createListStore(RECENT_KEY);

// Hash u URL-u (#recept-059) je izvor istine za otvoren recept.
const hashStore = {
  subscribe(listener: () => void) {
    window.addEventListener("hashchange", listener);
    window.addEventListener("popstate", listener);
    return () => {
      window.removeEventListener("hashchange", listener);
      window.removeEventListener("popstate", listener);
    };
  },
  get: () => window.location.hash,
  getServer: () => "",
  go(hash: string, replace: boolean) {
    const url = hash || window.location.pathname + window.location.search;
    if (replace) window.history.replaceState(hash ? { recipe: true } : null, "", url);
    else window.history.pushState({ recipe: true }, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  },
};

// ---------- skaliranje količina ----------
const fractions: [number, string][] = [
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

function formatQty(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const frac = value - whole;
  if (frac < 0.02) return String(whole);
  const hit = fractions.find(([f]) => Math.abs(frac - f) < 0.02);
  if (hit) return `${whole || ""}${hit[1]}`;
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

const unitForms: Record<string, [string, string, string]> = {
  "velika kašika": ["velika kašika", "velike kašike", "velikih kašika"],
  "mala kašika": ["mala kašika", "male kašike", "malih kašika"],
  kašika: ["kašika", "kašike", "kašika"],
  šolja: ["šolja", "šolje", "šolja"],
  šoljica: ["šoljica", "šoljice", "šoljica"],
  čaša: ["čaša", "čaše", "čaša"],
  čašica: ["čašica", "čašice", "čašica"],
  kesica: ["kesica", "kesice", "kesica"],
  kockica: ["kockica", "kockice", "kockica"],
  čen: ["čen", "čena", "čenova"],
  veza: ["veza", "veze", "veza"],
  štangla: ["štangla", "štangle", "štangli"],
  kap: ["kap", "kapi", "kapi"],
};

function unitLabel(unit: string | null, value: number): string {
  if (!unit || unit === "kom") return "";
  const forms = unitForms[unit];
  if (!forms) return unit;
  if (!Number.isInteger(value)) return forms[1];
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1];
  return forms[2];
}

const parseLeading = (token: string): number | null => {
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const num = Number(token.replace(",", "."));
  return Number.isFinite(num) ? num : null;
};

function scaledText(ingredient: Ingredient, factor: number): string {
  if (factor === 1 || ingredient.qty === null) return ingredient.text;
  // Opseg ("3-4 čena"): skaliraj obe granice i zameni samo vodeći "3-4".
  if (ingredient.qtyTo) {
    const range = ingredient.text.match(/^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);
    if (range) return `${formatQty(ingredient.qty * factor)}-${formatQty(ingredient.qtyTo * factor)}${ingredient.text.slice(range[0].length)}`;
  }
  let qty = ingredient.qty * factor;
  let unit = ingredient.unit;
  let converted = false;
  if (unit === "kg" && qty < 1) { qty *= 1000; unit = "g"; converted = true; }
  else if (unit === "g" && qty >= 1000 && Number.isInteger(qty / 50)) { qty /= 1000; unit = "kg"; converted = true; }
  else if (unit === "l" && qty < 1) { qty *= 10; unit = "dl"; converted = true; }

  // Prvo pokušaj da zameniš samo broj u originalnoj liniji — čuva Majin način zapisa.
  const match = ingredient.text.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)(\s*)(\S+)?/);
  if (match && parseLeading(match[1]) !== null && Math.abs((parseLeading(match[1]) as number) - ingredient.qty) < 0.001) {
    if (!converted) return `${formatQty(qty)}${ingredient.text.slice(match[1].length)}`;
    if (match[3] === ingredient.unit) {
      return `${formatQty(qty)} ${unit}${ingredient.text.slice(match[1].length + match[2].length + match[3].length)}`;
    }
  }
  const parts = [formatQty(qty), unitLabel(unit, qty), ingredient.item || ""].filter(Boolean);
  return ingredient.note ? `${parts.join(" ")} (${ingredient.note})` : parts.join(" ");
}

// ---------- komponente ----------
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

function IngredientList({
  items,
  factor,
  prefix,
  checked,
  onToggle,
}: {
  items: Ingredient[];
  factor: number;
  prefix: string;
  checked: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="ingredient-list">
      {items.map((ingredient, index) => {
        const key = `${prefix}-${index}`;
        const isChecked = checked.has(key);
        return (
          <li key={key} className={isChecked ? "checked" : ""}>
            <label>
              <input type="checkbox" checked={isChecked} onChange={() => onToggle(key)} />
              <span className="checkmark" aria-hidden="true">✓</span>
              <span>{scaledText(ingredient, factor)}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function RecipeView({
  recipe,
  favorite,
  onClose,
  onFavorite,
  onNavigate,
  onToast,
}: {
  recipe: Recipe;
  favorite: boolean;
  onClose: () => void;
  onFavorite: () => void;
  onNavigate: (recipe: Recipe) => void;
  onToast: (message: string) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [factor, setFactor] = useState<number>(1);
  const canWake = useState(() => typeof navigator !== "undefined" && "wakeLock" in navigator)[0];
  const [awake, setAwake] = useState(false);
  const wakeLock = useRef<{ release: () => Promise<void>; addEventListener: (type: string, cb: () => void) => void } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  const index = recipes.findIndex((item) => item.id === recipe.id);
  const previous = index > 0 ? recipes[index - 1] : null;
  const next = index < recipes.length - 1 ? recipes[index + 1] : null;
  const scalable = allIngredients(recipe).some((item) => item.qty !== null);

  useEffect(() => {
    sheetRef.current?.scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, [recipe.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && previous) onNavigate(previous);
      if (event.key === "ArrowRight" && next) onNavigate(next);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [onClose, onNavigate, previous, next]);

  useEffect(() => () => { wakeLock.current?.release(); wakeLock.current = null; }, []);

  const toggleWake = async () => {
    if (wakeLock.current) {
      await wakeLock.current.release();
      wakeLock.current = null;
      setAwake(false);
      return;
    }
    try {
      const lock = await (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<typeof wakeLock.current> } }).wakeLock.request("screen");
      wakeLock.current = lock;
      lock?.addEventListener("release", () => { wakeLock.current = null; setAwake(false); });
      setAwake(true);
      onToast("Ekran ostaje upaljen dok kuvaš");
    } catch {
      onToast("Nije moguće zadržati ekran upaljen");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#recept-${recipe.id}`;
    const nav = navigator as Navigator & { share?: (data: { title: string; url: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: `${recipe.name} — Majin kuvar`, url });
        return;
      } catch {
        /* korisnik odustao — probaj kopiranje */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      onToast("Link recepta je kopiran");
    } catch {
      onToast(url);
    }
  };

  const toggleChecked = (key: string) =>
    setChecked((current) => {
      const nextSet = new Set(current);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);
      return nextSet;
    });

  const ingredientCount = allIngredients(recipe).length;

  return (
    <div className="recipe-overlay" role="dialog" aria-modal="true" aria-labelledby="recipe-title">
      <button className="overlay-close-zone" onClick={onClose} aria-label="Zatvori recept" tabIndex={-1} />
      <article className="recipe-sheet" ref={sheetRef}>
        <div className="sheet-topbar">
          <button className="round-button" onClick={onClose} aria-label="Zatvori recept">←</button>
          <div className="sheet-actions">
            {canWake && (
              <button className={`text-button ${awake ? "is-on" : ""}`} onClick={toggleWake} aria-pressed={awake} title="Zadrži ekran upaljen dok kuvaš">
                {awake ? "☀ Ekran upaljen" : "☼ Ekran"}
              </button>
            )}
            <button className="text-button" onClick={share}>Podeli</button>
            <button className="text-button" onClick={() => window.print()}>Štampaj</button>
            <button className={`round-button ${favorite ? "is-favorite" : ""}`} onClick={onFavorite} aria-label={favorite ? "Ukloni iz omiljenih" : "Sačuvaj u omiljene"} aria-pressed={favorite}>
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
              {recipe.yield && <span><b>Prinos</b>{recipe.yield}</span>}
              <span><b>Sastojaka</b>{ingredientCount || "—"}</span>
              {recipe.source && <span><b>Izvor</b>{recipe.source}</span>}
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
            {scalable && (
              <div className="scale-row" role="group" aria-label="Količina">
                <span>Mera</span>
                {SCALES.map((scale) => (
                  <button key={scale} className={factor === scale ? "active" : ""} onClick={() => setFactor(scale)} aria-pressed={factor === scale}>
                    {scale === 0.5 ? "½×" : scale === 1.5 ? "1½×" : `${scale}×`}
                  </button>
                ))}
              </div>
            )}
            {factor !== 1 && <p className="scale-hint">Količine su preračunate ({formatQty(factor)}×). Vreme pečenja i veličinu kalupa prilagodi sama.</p>}
            {recipe.ingredientGroups.length ? (
              recipe.ingredientGroups.map((group, groupIndex) => (
                <div className="ingredient-group" key={`${group.title}-${groupIndex}`}>
                  {group.title && <h3>{group.title}</h3>}
                  <IngredientList items={group.items} factor={factor} prefix={`g${groupIndex}`} checked={checked} onToggle={toggleChecked} />
                </div>
              ))
            ) : (
              <p className="muted">Sastojci su navedeni u postupku.</p>
            )}
            {recipe.variants.length > 0 && (
              <details className="variants">
                <summary>Varijante iz sveske ({recipe.variants.length})</summary>
                {recipe.variants.map((variant, variantIndex) => (
                  <div className="ingredient-group" key={`${variant.title}-${variantIndex}`}>
                    <h3>{variant.title}</h3>
                    {variant.note && <p className="muted small">{variant.note}</p>}
                    <IngredientList items={variant.items} factor={1} prefix={`v${variantIndex}`} checked={checked} onToggle={toggleChecked} />
                  </div>
                ))}
              </details>
            )}
          </section>
          <section className="method-panel">
            <div className="section-heading">
              <p className="eyebrow">Korak po korak</p>
              <h2>Priprema</h2>
            </div>
            {recipe.bodyHtml ? (
              <div className="recipe-prose" dangerouslySetInnerHTML={{ __html: recipe.bodyHtml }} />
            ) : (
              <p className="muted">Zapisani su samo sastojci.</p>
            )}
          </section>
        </div>

        <nav className="sheet-nav" aria-label="Listaj svesku">
          {previous ? (
            <button onClick={() => onNavigate(previous)}>
              <small>← Prethodni · № {previous.id}</small>
              <span>{previous.name}</span>
            </button>
          ) : <span />}
          {next ? (
            <button className="next" onClick={() => onNavigate(next)}>
              <small>Sledeći · № {next.id} →</small>
              <span>{next.name}</span>
            </button>
          ) : <span />}
        </nav>
      </article>
    </div>
  );
}

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
  const selected = selectedId ? recipes.find((recipe) => recipe.id === selectedId) || null : null;
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    document.title = selected ? `${selected.name} — Majin kuvar` : `Majin kuvar — ${RECIPE_COUNT} ${pluralForm(RECIPE_COUNT, ["porodični recept", "porodična recepta", "porodičnih recepata"])}`;
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
      const rankA = merchandisingRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const rankB = merchandisingRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
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

  const featuredIds = ["054", "181", "022"];
  const featured = featuredIds
    .map((id) => recipes.find((recipe) => recipe.id === id))
    .filter((recipe): recipe is Recipe => Boolean(recipe));
  const isMerchandising = category === "Sve" && !search.trim() && !onlyFavorites && sort === "preporuceno";
  const recentRecipes = recent
    .map((id) => recipes.find((recipe) => recipe.id === id))
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
        <div className="hero-visual" aria-label="Akvarel ilustracija čokoladnog musa">
          <div className="wash wash-one" />
          <div className="wash wash-two" />
          <p className="handwritten">Prvi recept<br />u svesci</p>
          <img src="/recipes/001.webp" alt="Akvarel čokoladnog musa u staklenoj činiji" fetchPriority="high" />
          <a className="hero-caption" href="#recept-001" onClick={(event) => { event.preventDefault(); openRecipe(recipes[0]); }}>
            <span>№ 001</span><b>Mousse au chocolat</b><small>za trenutke koji se pamte</small>
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
                <RecipeCard key={recipe.id} recipe={recipe} merchandisingBadge={isMerchandising ? merchandisingBadges[recipe.id] : undefined} favorite={favorites.includes(recipe.id)} onOpen={() => openRecipe(recipe)} onFavorite={() => toggleFavorite(recipe.id)} />
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
