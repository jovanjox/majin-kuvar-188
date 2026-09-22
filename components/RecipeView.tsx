"use client";

import { useEffect, useRef, useState } from "react";
import { allIngredients, categorySymbols, recipes, type Recipe } from "@/lib/recipes";
import { SCALES, formatQty } from "@/lib/scale";
import { IngredientList } from "./IngredientList";

export function RecipeView({
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
            {recipe.status === "delimičan" && (
              <p className="partial-note">Zapis u svesci je nepotpun — deo mera ili koraka treba dopuniti po osećaju.</p>
            )}
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
