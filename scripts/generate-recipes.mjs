// Generiše app/recipes-data.json iz markdown izvora (~/Documents/Kuvar/recepti).
// Pokretanje: pnpm recipes            (koristi RECEPTI_DIR ili ../recepti ili ~/Documents/Kuvar/recepti)
//             RECEPTI_DIR=/putanja pnpm recipes
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const candidates = [
  process.env.RECEPTI_DIR,
  path.resolve("../recepti"),
  path.join(os.homedir(), "Documents/Kuvar/recepti"),
].filter(Boolean);
const sourceDir = candidates.find((dir) => fs.existsSync(dir));
if (!sourceDir) throw new Error(`Nema foldera sa receptima. Probano: ${candidates.join(", ")}`);
const outputFile = path.resolve("app/recipes-data.json");
const imageDir = path.resolve("public/recipes");

// ---------- pomoćne ----------
const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const inlineMarkdown = (value) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>");

const unquote = (raw) => {
  const value = raw.trim();
  if (value === "null" || value === "~" || value === "") return null;
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replaceAll('\\"', '"');
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

// "{ linija: "250 g čokolade", kolicina: 250, jedinica: "g", sastojak: "čokolade" }" -> objekat
function parseInlineMap(text) {
  const body = text.trim().replace(/^\{/, "").replace(/\}$/, "");
  const parts = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '"' && body[i - 1] !== "\\") inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current);
  const result = {};
  for (const part of parts) {
    const index = part.indexOf(":");
    if (index === -1) continue;
    result[part.slice(0, index).trim()] = unquote(part.slice(index + 1));
  }
  return result;
}

// Mini YAML parser za zaglavlja recepata: skalari, liste inline mapa i "varijante" sa ugnježdenim sastojcima.
function parseFrontMatter(text) {
  const data = {};
  let listKey = null;
  let variant = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const top = line.match(/^([a-zA-Z_][\w]*):\s*(.*)$/);
    if (top) {
      const [, key, value] = top;
      listKey = null;
      variant = null;
      if (value === "") {
        data[key] = [];
        listKey = key;
      } else if (value.startsWith("[")) {
        data[key] = value
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((item) => unquote(item))
          .filter((item) => item !== null);
      } else data[key] = unquote(value);
      continue;
    }
    if (!listKey) continue;
    const inlineItem = line.match(/^(\s+)-\s*(\{.*\})\s*$/);
    if (inlineItem) {
      const item = parseInlineMap(inlineItem[2]);
      if (variant && inlineItem[1].length >= 6) (variant.sastojci ||= []).push(item);
      else data[listKey].push(item);
      continue;
    }
    const variantStart = line.match(/^\s+-\s+([a-z_]+):\s*(.*)$/);
    if (variantStart) {
      variant = { [variantStart[1]]: unquote(variantStart[2]) };
      data[listKey].push(variant);
      continue;
    }
    const nested = line.match(/^\s+([a-z_]+):\s*(.*)$/);
    if (nested && variant) {
      if (nested[2] === "") variant[nested[1]] = [];
      else variant[nested[1]] = unquote(nested[2]);
      continue;
    }
    const plain = line.match(/^\s+-\s+(.+)$/);
    if (plain) data[listKey].push(unquote(plain[1]));
  }
  return data;
}

const groupTitles = {
  sastojci: "Sastojci",
  testo: "Testo",
  fil: "Fil",
  glazura: "Glazura",
  kore: "Kore",
  kora: "Kora",
  krem: "Krem",
  sirup: "Sirup",
  preliv: "Preliv",
  sos: "Sos",
  premaz: "Premaz",
  besamel: "Bešamel",
  karamel: "Karamel",
  dekoracija: "Dekoracija",
  za_slaganje: "Za slaganje",
  za_zavrsetak: "Za završetak",
  list_putera: "List putera",
  list_margarina: "List margarina",
  bolonjeze: "Bolonjeze",
  meso: "Meso",
  marinada: "Marinada",
  punjenje: "Punjenje",
  zavrsnica: "Završnica",
  zapeka: "Zapeka",
  cokoladni_sos: "Čokoladni sos",
  cokoladna_smesa: "Čokoladna smesa",
  puter_krem: "Puter krem",
  zuti_krem: "Žuti krem",
  zute_kuglice: "Žute kuglice",
  pastry_cream: "Pastry cream",
  egg_wash: "Egg wash",
  beze_kore: "Beze kore",
  francusko_testo: "Francusko testo",
  kvasac: "Kvasac",
  povrce: "Povrće",
  spanac: "Spanać",
  visnje: "Višnje",
  puslice: "Puslice",
  korpice: "Korpice",
  noklice: "Noklice",
  paprikas: "Paprikaš",
  osnova: "Osnova",
  salata: "Salata",
  dressing: "Dressing",
  parmezan: "Parmezan",
  sarlota: "Šarlota",
  namaz_od_cimeta: "Namaz od cimeta",
  kuvanje_mesa: "Kuvanje mesa",
  prvi_deo: "Prvi deo",
  tamni_deo: "Tamni deo",
  srednja_kora: "Srednja kora",
  veca_mera: "Veća mera",
  najveca_mera: "Najveća mera",
  fil_mak: "Fil od maka",
  fil_mak_bogati: "Bogati fil od maka",
  fil_orasi_prost: "Fil od oraha",
  i_fil: "I fil",
  i_fil_alternativni: "I fil (alternativa)",
  i_nadev: "I nadev",
  ii_nadev: "II nadev",
  za_fil_i_glazuru: "Za fil i glazuru",
  druga_varijanta_testa: "Druga varijanta testa",
  dodatna_varijanta_punjenja_zeleni_okvir_u_originalu: "Dodatna varijanta punjenja",
  pzp: "PZP",
  cup: "Cup",
  rastvor: "Rastvor",
  rastvor_veliki_sud: "Osnovni rastvor (veliki sud)",
  rastvor_10l: "Rastvor za 10 l",
  rastvor_1l: "Rastvor za 1 l",
  rastvor_3l: "Rastvor za 3 l",
  rastvor_4l_amc: "Rastvor za 4 l (AMC)",
  rastvor_5l: "Rastvor za 5 l",
};

const titleFromKey = (key) => {
  const short = key.replace(/^sastojci_?/, "") || "sastojci";
  if (groupTitles[short]) return groupTitles[short];
  return short.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
};

const toIngredient = (item) => {
  if (typeof item === "string") return { text: cleanText(item), qty: null, qtyTo: null, unit: null, item: item, note: null };
  return {
    text: cleanText(item.linija ?? ""),
    qty: typeof item.kolicina === "number" ? item.kolicina : null,
    qtyTo: typeof item.kolicina_do === "number" ? item.kolicina_do : null,
    unit: item.jedinica ?? null,
    item: item.sastojak ?? null,
    note: cleanText(item.napomena ?? "") || null,
  };
};

// ---------- markdown -> html ----------
const normLine = (line) => line.toLocaleLowerCase("sr").replace(/\s+/g, " ").trim();

function markdownToHtml(markdown, { ingredientLines }) {
  // Blok iz sveske se preskače samo ako ponavlja sastojke iz zaglavlja; redosled slaganja i slično ostaje.
  const tokens = (line) => new Set(normLine(line).replace(/[^\p{L}\p{N} ]/gu, " ").split(" ").filter((t) => t.length > 1));
  const ingredientTokens = [...ingredientLines].map(tokens);
  const similar = (row) => {
    const a = tokens(row);
    if (!a.size) return false;
    return ingredientTokens.some((b) => {
      const shared = [...a].filter((t) => b.has(t)).length;
      return shared / (a.size + b.size - shared) >= 0.5;
    });
  };
  const isIngredientBlock = (rows) => {
    if (!ingredientLines.size) return false;
    const hits = rows.filter((row) => ingredientLines.has(normLine(row)) || similar(row)).length;
    return hits / rows.length >= 0.5;
  };
  const lines = markdown.replace(/\r/g, "").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let table = [];
  let inCode = false;
  let pendingHeading = null; // naslov koji čeka da vidi da li sekcija ima sadržaj

  const emitHeading = () => {
    if (pendingHeading) {
      html.push(pendingHeading);
      pendingHeading = null;
    }
  };
  const flushParagraph = () => {
    if (!paragraph.length) return;
    emitHeading();
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    emitHeading();
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  const flushCode = () => {
    const rows = code.filter((line) => line.trim());
    code = [];
    if (!rows.length || isIngredientBlock(rows)) return;
    emitHeading();
    html.push(`<div class="notebook-lines">${rows.map((line) => `<div>${inlineMarkdown(line.trim())}</div>`).join("")}</div>`);
  };
  const flushTable = () => {
    if (!table.length) return;
    emitHeading();
    const rows = table
      .map((row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
      .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)));
    const [head, ...body] = rows;
    const cell = (tag, cells) => `<tr>${cells.map((c) => `<${tag}>${inlineMarkdown(c)}</${tag}>`).join("")}</tr>`;
    html.push(
      `<div class="table-wrap"><table><thead>${cell("th", head)}</thead><tbody>${body.map((r) => cell("td", r)).join("")}</tbody></table></div>`,
    );
    table = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushTable();
  };

  for (const line of lines) {
    if (line.trim() === "```") {
      flushAll();
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      pendingHeading = `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushParagraph();
      flushList();
      table.push(line);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      flushTable();
      list.push(bullet[1]);
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }
    flushList();
    flushTable();
    paragraph.push(line.trim());
  }
  flushAll();
  if (inCode) flushCode();
  return html.join("\n");
}

// ---------- čišćenje uredničkih napomena (nisu za sajt) ----------
const ARCHIVAL = /nečitk|necitk|nejasn|original|dopisan|prepis|fragment|verovatno|precrtan|prekrižen|zamagljen|rukom (do)?pisan|rukopis|img_|fotograf|stranic|svesci|sveske|sveska|nalepljen|isečen|štampani|potvrđuje|potvrd|vlasnik|nedostaje|nije zapisan|nije naveden|nisu naveden|nije upisan|nije cela|hemijsk|olovkom|crvenim|plavim|plavom|zeleni okvir|vidi dole|na dnu strane|na vrhu strane|na dnu:|na vrhu:|komadu papira|ispod recepta|zaglavlje sekcije|uz naslov|uz sastojke|naslov je|čitka|čitljiv|nalepnic|naslov na vrhu|takođe pominje|glavni spisak|\[\?\]|\(\?\)/i;

// Skida zagrade sa uredničkim sadržajem i rečenice koje govore o svesci, a ne o jelu.
function cleanText(value) {
  if (!value || typeof value !== "string") return value ?? "";
  let text = value.replace(/\s*\[\?\]/g, "").replace(/\s*\([^()]*\)/g, (m) => (ARCHIVAL.test(m) ? "" : m));
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZČĆŠŽĐ0-9'"„])/);
  text = sentences.filter((sentence) => !ARCHIVAL.test(sentence)).join(" ").trim();
  return ARCHIVAL.test(text) ? "" : text;
}

// Sekcije koje samo ponavljaju spisak sastojaka (naslov = naslov grupe, sadržaj samo lista) ne trebaju u postupku.
function dropIngredientSections(lines, groupTitles) {
  const titles = new Set(groupTitles.map((title) => title.toLocaleLowerCase("sr")));
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const heading = lines[i].match(/^##\s+(.+)$/);
    if (heading) {
      let j = i + 1;
      while (j < lines.length && !/^##\s/.test(lines[j])) j += 1;
      const body = lines.slice(i + 1, j).filter((line) => line.trim());
      const onlyList = body.length > 0 && body.every((line) => /^\s*[-*]\s/.test(line) || line.trim() === "```" || /^\s{2,}/.test(line));
      const title = heading[1].replace(/\*/g, "").trim().toLocaleLowerCase("sr");
      if (titles.has(title) && onlyList) {
        droppedSections.push(`${currentFile}: ## ${heading[1]}`);
        i = j;
        continue;
      }
    }
    out.push(lines[i]);
    i += 1;
  }
  return out;
}
const droppedSections = [];
let currentFile = "";

function cleanBody(markdown, groupTitles = []) {
  return dropIngredientSections(markdown.split("\n"), groupTitles)
    .filter((line) => !/^\s*>/.test(line))
    .map((line) =>
      line
        .replace(/\s*\([^()]*\)/g, (m) => (ARCHIVAL.test(m) ? "" : m))
        .replace(/\s*\[\?\]/g, "")
        .replace(/\*\*\s*\*\*/g, "")
        .replace(/\s\*+\s*$/, ""),
    )
    .filter((line) => /^\s*\|/.test(line) || line.trim() === "```" || !ARCHIVAL.test(line))
    .join("\n");
}

const stripHtml = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function broadCategory(raw, id) {
  const category = (raw || "").toLocaleLowerCase("sr");
  const number = Number(id);
  if (category.includes("torta")) return "Torte";
  if (
    number <= 93 ||
    category.includes("kolač") ||
    category.includes("poslastica") ||
    category.includes("krem") ||
    category.includes("sladoled") ||
    category.includes("preliv") ||
    category.includes("sufle") ||
    category.includes("soufflé") ||
    number === 189 ||
    category.includes("profiterol")
  ) return "Poslastice";
  if (
    category.includes("peciva") ||
    category.includes("hleb") ||
    category.includes("pita") ||
    category.includes("testo za prženje")
  ) return "Hleb i peciva";
  if (category.includes("zimnica")) return "Zimnica";
  if (category.includes("testenina") || category.includes("prilog") || category.includes("supa (uložak")) return "Testenine i prilozi";
  if (category.includes("salata") || category.includes("paštet") || [147, 174, 175].includes(number)) return "Predjela i salate";
  return "Glavna jela";
}

// ---------- glavna petlja ----------
const files = fs.readdirSync(sourceDir).filter((file) => /^\d{3}-.+\.md$/.test(file)).sort();
const warnings = [];

const recipes = files.map((file) => {
  const raw = fs.readFileSync(path.join(sourceDir, file), "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Neispravan format recepta: ${file}`);
  const [, frontMatterText, markdownBody] = match;
  const fm = parseFrontMatter(frontMatterText);
  const id = String(fm.id ?? file.slice(0, 3)).padStart(3, "0");
  const name = cleanText(fm.naziv) || file.replace(/^\d{3}-|\.md$/g, "");
  const category = fm.kategorija || "";

  const groupKeys = Object.keys(fm).filter((key) => key === "sastojci" || key.startsWith("sastojci_"));
  // Naslovi iz tela recepta ("## Testo" ispred bloka sastojaka) čuvaju dijakritike bolje od ključeva zaglavlja.
  const bodyHeadings = [...markdownBody.matchAll(/^##\s+(.+)\n+```/gm)].map((m) => m[1].replace(/\*/g, "").trim());
  const ingredientGroups = groupKeys
    .map((key, index) => ({
      title: cleanText(bodyHeadings.length === groupKeys.length ? bodyHeadings[index] : titleFromKey(key)),
      items: (fm[key] || []).map(toIngredient),
    }))
    .filter((group) => group.items.length);
  if (ingredientGroups.length === 1) ingredientGroups[0].title = ingredientGroups[0].title === "Sastojci" ? "" : ingredientGroups[0].title;
  if (!ingredientGroups.length) warnings.push(`${file}: nema sastojaka u zaglavlju`);

  const variants = Array.isArray(fm.varijante)
    ? fm.varijante
        .filter((variant) => variant && typeof variant === "object")
        .map((variant) => ({
          title: cleanText(variant.naziv) || "Varijanta",
          note: cleanText(variant.napomena) || null,
          items: (variant.sastojci || []).map(toIngredient),
        }))
    : [];

  currentFile = file;
  const cleanedBody = cleanBody(markdownBody, ingredientGroups.map((group) => group.title))
    .replace(/^#\s+.*$/m, "")
    .replace(/^\*[^\n]+\*\s*$/m, "")
    .trim();
  const ingredientLines = new Set(
    [...ingredientGroups, ...variants].flatMap((group) => group.items.map((item) => normLine(item.text))),
  );
  const bodyHtml = markdownToHtml(cleanedBody, { ingredientLines });
  const bodyText = stripHtml(bodyHtml);
  if (!bodyText) warnings.push(`${file}: prazan postupak`);

  const image = fs.existsSync(path.join(imageDir, `${id}.webp`)) ? `/recipes/${id}.webp` : "";
  if (!image) warnings.push(`${file}: nema slike public/recipes/${id}.webp`);

  const subtitle = cleanText(fm.podnaslov);
  return {
    id,
    name,
    subtitle,
    category,
    broadCategory: broadCategory(category, id),
    temperature: fm.temperatura || "",
    time: fm.vreme_pecenja || fm.vreme || "",
    yield: fm.prinos || "",
    source: fm.izvor || "",
    note: cleanText(fm.napomena),
    status: fm.status || "",
    ingredientGroups,
    variants,
    bodyHtml,
    image,
  };
});

const ids = new Set(recipes.map((recipe) => recipe.id));
if (ids.size !== recipes.length) throw new Error("Dupli ID recepta");

fs.writeFileSync(outputFile, `${JSON.stringify(recipes, null, 2)}\n`, "utf8");
console.log(`Generisano ${recipes.length} recepata iz ${sourceDir} -> ${outputFile}`);
for (const warning of warnings) console.warn(`  ! ${warning}`);
if (process.env.DEBUG_SECTIONS) for (const item of droppedSections) console.log(`  - izbačena sekcija ${item}`);
