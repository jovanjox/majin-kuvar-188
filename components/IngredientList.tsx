"use client";

import type { Ingredient } from "@/lib/types";
import { scaledText } from "@/lib/scale";

export function IngredientList({
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
