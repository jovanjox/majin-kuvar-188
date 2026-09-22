import recipes from "@/app/recipes-data.json";
import { pluralForm } from "./plural";

export const SITE_URL = "https://majin-kuvar-188.jovanjox600373.chatgpt.site";
export const SITE_NAME = "Majin kuvar";
export const THEME_COLOR = "#39432f";

export const RECIPE_COUNT = recipes.length;

export const siteTitle = `${SITE_NAME} — ${RECIPE_COUNT} ${pluralForm(RECIPE_COUNT, ["porodični recept", "porodična recepta", "porodičnih recepata"])}`;
export const siteDescription = `Porodična zbirka od ${RECIPE_COUNT} ${pluralForm(RECIPE_COUNT, ["pažljivo prepisanog recepta", "pažljivo prepisana recepta", "pažljivo prepisanih recepata"])} — od torti i peciva do tradicionalnih slanih jela.`;
