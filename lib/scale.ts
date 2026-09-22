// Skaliranje količina sastojaka (½× do 3×) uz čuvanje Majinog načina zapisa.
import type { Ingredient } from "./types";
import { pluralForm } from "./plural.ts";

export const SCALES = [0.5, 1, 1.5, 2, 3] as const;

const fractions: [number, string][] = [
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

export function formatQty(value: number): string {
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

export function unitLabel(unit: string | null, value: number): string {
  if (!unit || unit === "kom") return "";
  const forms = unitForms[unit];
  if (!forms) return unit;
  if (!Number.isInteger(value)) return forms[1];
  return pluralForm(value, forms);
}

const parseLeading = (token: string): number | null => {
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const num = Number(token.replace(",", "."));
  return Number.isFinite(num) ? num : null;
};

export function scaledText(ingredient: Ingredient, factor: number): string {
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
