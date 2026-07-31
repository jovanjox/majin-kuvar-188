import fs from "node:fs";
import path from "node:path";

const sourceDir = path.resolve("../recepti");
const outputFile = path.resolve("app/recipes-data.json");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const inlineMarkdown = (value) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  const flushCode = () => {
    if (!code.length) return;
    html.push(`<div class="notebook-lines">${code
      .filter((line) => line.trim())
      .map((line) => `<div>${inlineMarkdown(line.trim())}</div>`)
      .join("")}</div>`);
    code = [];
  };

  for (const line of lines) {
    if (line.trim() === "```") {
      flushParagraph();
      flushList();
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
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  flushCode();
  return html.join("\n");
}

function readValue(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return "";
  const raw = match[1].trim();
  if (raw === "null") return "";
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replaceAll('\\"', '"');
  }
  return raw;
}

function broadCategory(raw, id) {
  const category = raw.toLocaleLowerCase("sr");
  const number = Number(id);
  if (category.includes("torta")) return "Torte";
  if (
    number <= 93 ||
    category.includes("kolač") ||
    category.includes("poslastica") ||
    category.includes("krem") ||
    category.includes("sladoled") ||
    category.includes("preliv")
  ) return "Poslastice";
  if (
    category.includes("peciva") ||
    category.includes("hleb") ||
    category.includes("pita") ||
    category.includes("testo za prženje")
  ) return "Hleb i peciva";
  if (category.includes("zimnica")) return "Zimnica";
  if (
    category.includes("testenina") ||
    category.includes("prilog") ||
    category.includes("supa (uložak")
  ) return "Testenine i prilozi";
  if (
    category.includes("salata") ||
    category.includes("paštet") ||
    number === 147 ||
    number === 174 ||
    number === 175
  ) return "Predjela i salate";
  return "Glavna jela";
}

const files = fs
  .readdirSync(sourceDir)
  .filter((file) => /^\d{3}-.+\.md$/.test(file))
  .sort();

const recipes = files.map((file) => {
  const raw = fs.readFileSync(path.join(sourceDir, file), "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid recipe format: ${file}`);
  const [, frontMatter, markdownBody] = match;
  const id = readValue(frontMatter, "id");
  const name = readValue(frontMatter, "naziv") || file.replace(/^\d{3}-|\.md$/g, "");
  const subtitle = readValue(frontMatter, "podnaslov");
  const category = readValue(frontMatter, "kategorija");
  const ingredients = [...frontMatter.matchAll(/linija:\s*"([^"]*)"/g)].map((item) =>
    item[1].replaceAll('\\"', '"'),
  );
  const cleanedBody = markdownBody
    .replace(/^#\s+.*$/m, "")
    .replace(/^\*[^\n]+\*\s*$/m, "")
    .trim();

  return {
    id,
    slug: file.replace(/\.md$/, ""),
    name,
    subtitle,
    category,
    broadCategory: broadCategory(category, id),
    temperature: readValue(frontMatter, "temperatura"),
    time: readValue(frontMatter, "vreme_pecenja") || readValue(frontMatter, "vreme"),
    note: readValue(frontMatter, "napomena"),
    status: readValue(frontMatter, "status"),
    hasQuestion: Number(readValue(frontMatter, "nejasno") || 0) > 0,
    ingredients: [...new Set(ingredients)],
    bodyHtml: markdownToHtml(cleanedBody),
    searchText: `${name} ${subtitle} ${category} ${ingredients.join(" ")}`.toLocaleLowerCase("sr"),
    image: Number(id) <= 10 ? `/recipes/${id}.png` : "",
  };
});

fs.writeFileSync(outputFile, `${JSON.stringify(recipes, null, 2)}\n`, "utf8");
console.log(`Generated ${recipes.length} recipes at ${outputFile}`);
