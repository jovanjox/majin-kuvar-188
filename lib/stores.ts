// Stanje u pregledaču: omiljeni i nedavni (localStorage) i otvoren recept (hash u URL-u).
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
export const favoritesStore = createListStore(FAVORITES_KEY);
export const recentStore = createListStore(RECENT_KEY);

// Otvoren recept: hash (#recept-059) na početnoj, ili putanja /recept/059 kad se dođe preko deljenog linka.
const RECIPE_PATH = /^\/recept\/(\d{3})\/?$/;

export const hashStore = {
  subscribe(listener: () => void) {
    window.addEventListener("hashchange", listener);
    window.addEventListener("popstate", listener);
    return () => {
      window.removeEventListener("hashchange", listener);
      window.removeEventListener("popstate", listener);
    };
  },
  get() {
    if (window.location.hash) return window.location.hash;
    const fromPath = window.location.pathname.match(RECIPE_PATH)?.[1];
    return fromPath ? `#recept-${fromPath}` : "";
  },
  // Sa /recept/059 prelazi na /#recept-059 (isti prikaz), da bi dalje listanje i „nazad" ostali na početnoj.
  normalizePath() {
    const fromPath = window.location.pathname.match(RECIPE_PATH)?.[1];
    if (fromPath && !window.location.hash) window.history.replaceState(null, "", `/${window.location.search}#recept-${fromPath}`);
  },
  go(hash: string, replace: boolean) {
    const url = `/${window.location.search}${hash}`;
    // Zamena zadržava oznaku „recipe" samo ako je recept zaista otvoren push-om sa liste — inače bi
    // zatvaranje (history.back) posle listanja strelicama izašlo sa sajta kad se došlo direktnim linkom.
    if (replace) window.history.replaceState(hash && window.history.state?.recipe ? { recipe: true } : null, "", url);
    else window.history.pushState({ recipe: true }, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  },
};

// Pretraga, kategorija i redosled u adresi (?q=višnje&k=Torte&red=naziv), da se filter može podeliti i sačuvati.
const FILTER_EVENT = "majin-kuvar-filter";
export type FilterKey = "q" | "k" | "red";

export const filterStore = {
  subscribe(listener: () => void) {
    window.addEventListener(FILTER_EVENT, listener);
    window.addEventListener("popstate", listener);
    return () => {
      window.removeEventListener(FILTER_EVENT, listener);
      window.removeEventListener("popstate", listener);
    };
  },
  get: () => window.location.search,
  getServer: () => "",
  set(changes: Partial<Record<FilterKey, string>>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    window.dispatchEvent(new Event(FILTER_EVENT));
  },
};
