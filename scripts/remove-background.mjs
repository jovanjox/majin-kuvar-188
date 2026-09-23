// Uklanja belu pozadinu sa akvarel ilustracije: bela oblast povezana sa ivicom slike postaje providna,
// a u uskom pojasu oko crteža boja se „odvaja" od bele (color-to-alpha), da ne ostane beli oreol.
// Beli delovi unutar crteža (šlag, krem, tanjir) ostaju netaknuti jer nisu povezani sa ivicom.
import sharp from "sharp";

const isBackground = (r, g, b) => Math.min(r, g, b) >= 250 && Math.max(r, g, b) - Math.min(r, g, b) <= 6;
const EDGE_BAND = 3; // px oko pozadine u kojima se omekšava ivica

export async function removeWhiteBackground(input) {
  const { data, info } = await sharp(input).flatten({ background: "#ffffff" }).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const count = width * height;
  const background = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const visit = (index) => {
    if (background[index]) return;
    const p = index * 3;
    if (!isBackground(data[p], data[p + 1], data[p + 2])) return;
    background[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < count - width) visit(index + width);
  }

  // Udaljenost (u px, šahovska metrika) od pozadine, samo do EDGE_BAND.
  const distance = new Uint8Array(count).fill(255);
  let frontier = [];
  for (let i = 0; i < count; i += 1) if (background[i]) { distance[i] = 0; frontier.push(i); }
  for (let step = 1; step <= EDGE_BAND; step += 1) {
    const next = [];
    for (const index of frontier) {
      const x = index % width;
      for (const n of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index - width, index + width]) {
        if (n < 0 || n >= count || distance[n] !== 255) continue;
        distance[n] = step;
        next.push(n);
      }
    }
    frontier = next;
  }

  const out = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i += 1) {
    const p = i * 3;
    const q = i * 4;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    if (background[i]) { out[q + 3] = 0; continue; }
    if (distance[i] <= EDGE_BAND) {
      // color-to-alpha za belu: najmanja providnost koja na beloj daje istu boju.
      const alpha = Math.max(255 - r, 255 - g, 255 - b) / 255;
      const a = Math.max(alpha, (distance[i] - 1) / EDGE_BAND) || 0;
      if (a <= 0) { out[q + 3] = 0; continue; }
      out[q] = Math.round(Math.min(255, Math.max(0, (r - (1 - a) * 255) / a)));
      out[q + 1] = Math.round(Math.min(255, Math.max(0, (g - (1 - a) * 255) / a)));
      out[q + 2] = Math.round(Math.min(255, Math.max(0, (b - (1 - a) * 255) / a)));
      out[q + 3] = Math.round(a * 255);
      continue;
    }
    out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = 255;
  }
  return sharp(out, { raw: { width, height, channels: 4 } });
}

// Ilustracija koja već ima providnu pozadinu ostaje kakva jeste; ona sa belom pozadinom dobija providnu.
export async function ensureTransparent(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += info.channels) if (data[i] < 250) return sharp(input);
  return removeWhiteBackground(input);
}
