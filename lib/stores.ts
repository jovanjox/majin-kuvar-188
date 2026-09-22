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

// Hash u URL-u (#recept-059) je izvor istine za otvoren recept.
export const hashStore = {
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
