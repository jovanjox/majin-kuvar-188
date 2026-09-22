# Majin kuvar

Sajt porodične zbirke recepata iz Majine rukom pisane sveske. Izvor recepata je
markdown repo `~/Documents/Kuvar` (`recepti/*.md` + `assets/izrazeni-akvarel/*.png`);
ovaj repo sadrži samo sajt i generisane podatke.

Živi sajt: https://majin-kuvar-188.jovanjox600373.chatgpt.site

## Struktura

- `app/page.tsx` — cela aplikacija (lista, pretraga, filteri, prikaz recepta)
- `app/layout.tsx` — meta podaci, ikonice, manifest
- `app/globals.css` — stil
- `app/recipes-data.json` — generisani podaci (ne uređivati ručno)
- `public/recipes/NNN.webp` — ilustracije (800 px, generisane)
- `public/recipes/400/NNN.webp` — manje varijante za kartice (400 px, generisane)
- `public/icons/` — PWA ikonice (generisane)
- `scripts/generate-recipes.mjs` — markdown → JSON
- `scripts/build-images.mjs` — PNG → webp + ikonice

## Komande

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm recipes        # regeneriši app/recipes-data.json iz ~/Documents/Kuvar/recepti
pnpm images         # regeneriši webp ilustracije i ikonice (dodaj -- --force za sve)
pnpm build
pnpm lint
pnpm typecheck      # provera TypeScript tipova (tsc --noEmit)
pnpm test:unit      # unit testovi skaliranja količina (lib/scale.ts)
pnpm test           # unit testovi + build + provera podataka i renderovanja
```

GitHub Actions (`.github/workflows/ci.yml`) na svaki push i pull request
pokreće `pnpm lint`, `pnpm typecheck` i `pnpm test`.

Folder sa receptima se traži redom: `RECEPTI_DIR`, `../recepti`,
`~/Documents/Kuvar/recepti`. Isto važi za ilustracije (`ILUSTRACIJE_DIR`,
`../assets/izrazeni-akvarel`, `~/Documents/Kuvar/assets/izrazeni-akvarel`).

## Kad se promeni recept u svesci

```bash
pnpm recipes && pnpm images && pnpm build
```

Generator čita YAML zaglavlje (grupe `sastojci_*`, `varijante`, `prinos`,
`izvor`, `napomena`, `napomena_ispravke`) i telo recepta (naslovi, pasusi,
liste, tabele). Blokovi sa sastojcima u telu se preskaču kada zaglavlje već
ima grupe sastojaka, da se ne dupliraju.

## Funkcije sajta

- pretraga bez dijakritika po nazivu, sastojku, broju i tekstu postupka
- kategorije sa brojem recepata, sortiranje (preporučeno / po broju / po nazivu)
- omiljeni i nedavno gledani recepti (lokalno u pregledaču)
- recept: grupe sastojaka sa štikliranjem, skaliranje mere (½× do 3×),
  tabele, varijante iz sveske, Majina beleška, napomena o prepisu
- deljenje linka (`#recept-059`), štampanje, „ekran upaljen“ dok se kuva
- listanje sveske (prethodni / sledeći, strelice na tastaturi)
- PWA manifest — može da se doda na početni ekran telefona

## Hosting

Sajt je objavljen preko ChatGPT Sites (`.openai/hosting.json`). Aplikacija je
standardni vinext (Next.js na Vite-u) + Cloudflare Worker, pa može da se
objavi i direktno na Cloudflare Workers uz `wrangler.jsonc`.
