import assert from "node:assert/strict";
import test from "node:test";
import { formatQty, scaledText, unitLabel } from "../lib/scale.ts";

// Pravi sastojak u obliku kao u app/recipes-data.json.
const ingredient = (text, qty, unit, item, extra = {}) => ({ text, qty, qtyTo: null, unit, item, note: null, ...extra });

test("formatQty: cele vrednosti i razlomci", () => {
  assert.equal(formatQty(2), "2");
  assert.equal(formatQty(250), "250");
  assert.equal(formatQty(0.5), "½");
  assert.equal(formatQty(1.5), "1½");
  assert.equal(formatQty(0.25), "¼");
  assert.equal(formatQty(0.75), "¾");
  assert.equal(formatQty(1 / 3), "⅓");
  assert.equal(formatQty(2 / 3), "⅔");
  assert.equal(formatQty(2 + 2 / 3), "2⅔");
});

test("formatQty: ostale decimale sa zarezom", () => {
  assert.equal(formatQty(1.3), "1,3");
  assert.equal(formatQty(0.1), "0,1");
  assert.equal(formatQty(2.46), "2,5");
});

test("unitLabel: srpska množina jedinica", () => {
  assert.equal(unitLabel("kašika", 1), "kašika");
  assert.equal(unitLabel("kašika", 2), "kašike");
  assert.equal(unitLabel("kašika", 5), "kašika");
  assert.equal(unitLabel("mala kašika", 3), "male kašike");
  assert.equal(unitLabel("čen", 1), "čen");
  assert.equal(unitLabel("čen", 21), "čen");
  assert.equal(unitLabel("čen", 12), "čenova");
  // Necela količina uzima drugu formu ("½ kašike", "1½ šolje").
  assert.equal(unitLabel("kašika", 0.5), "kašike");
  assert.equal(unitLabel("šolja", 1.5), "šolje");
});

test("unitLabel: komadi, bez jedinice i nepoznate jedinice", () => {
  assert.equal(unitLabel("kom", 3), "");
  assert.equal(unitLabel(null, 3), "");
  assert.equal(unitLabel("g", 250), "g");
  assert.equal(unitLabel("pakovanje", 2), "pakovanje");
});

test("scaledText: faktor 1 i sastojak bez količine vraćaju original", () => {
  const cokolada = ingredient("250 g čokolade", 250, "g", "čokolade");
  assert.equal(scaledText(cokolada, 1), "250 g čokolade");
  const kora = ingredient("nastrugana kora limuna", null, null, "nastrugana kora limuna");
  assert.equal(scaledText(kora, 2), "nastrugana kora limuna");
  assert.equal(scaledText(kora, 0.5), "nastrugana kora limuna");
});

test("scaledText: menja samo broj i čuva Majin zapis", () => {
  const cokolada = ingredient("250 g čokolade", 250, "g", "čokolade");
  assert.equal(scaledText(cokolada, 2), "500 g čokolade");
  assert.equal(scaledText(cokolada, 0.5), "125 g čokolade");
  const zumanca = ingredient("6 žumanaca", 6, "kom", "žumanaca");
  assert.equal(scaledText(zumanca, 1.5), "9 žumanaca");
  const voda = ingredient("2,5 dl vode", 2.5, "dl", "vode");
  assert.equal(scaledText(voda, 2), "5 dl vode");
  assert.equal(scaledText(voda, 0.5), "1¼ dl vode");
});

test("scaledText: reč jedinice prati novu količinu", () => {
  const puter = ingredient("1 kašika putera", 1, "kašika", "puter");
  assert.equal(scaledText(puter, 2), "2 kašike putera");
  assert.equal(scaledText(puter, 0.5), "½ kašike putera");
  const brasno = ingredient("1 velika kašika brašna", 1, "velika kašika", "brašna");
  assert.equal(scaledText(brasno, 3), "3 velike kašike brašna");
  const ren = ingredient("2 čena rena", 2, "čen", "rena");
  assert.equal(scaledText(ren, 0.5), "1 čen rena");
});

test("scaledText: razlomak u tekstu", () => {
  const prasak = ingredient("1/2 kesice praška za pecivo", 0.5, "kesica", "praška za pecivo");
  assert.equal(scaledText(prasak, 0.5), "¼ kesice praška za pecivo");
  assert.equal(scaledText(prasak, 2), "1 kesica praška za pecivo");
  assert.equal(scaledText(prasak, 3), "1½ kesice praška za pecivo");
  const sNapomenom = ingredient("1/2 kesice praška za pecivo (1 mala kašika)", 0.5, "kesica", "praška za pecivo", {
    note: "1 mala kašika",
  });
  assert.equal(scaledText(sNapomenom, 2), "1 kesica praška za pecivo (1 mala kašika)");
});

test("scaledText: kg i g se preračunavaju", () => {
  const visnje = ingredient("1/2 kg višanja", 0.5, "kg", "višanja");
  assert.equal(scaledText(visnje, 1), "1/2 kg višanja");
  assert.equal(scaledText(visnje, 0.5), "250 g višanja");
  assert.equal(scaledText(visnje, 2), "1 kg višanja");
  const secer = ingredient("1 kg šećera", 1, "kg", "šećera");
  assert.equal(scaledText(secer, 0.5), "500 g šećera");
  const maline = ingredient("500 g malina", 500, "g", "malina");
  assert.equal(scaledText(maline, 2), "1 kg malina");
  assert.equal(scaledText(maline, 3), "1½ kg malina");
});

test("scaledText: litri ispod 1 postaju decilitri", () => {
  const mleko = ingredient("1/2 l mleka", 0.5, "l", "mleka");
  assert.equal(scaledText(mleko, 1), "1/2 l mleka");
  assert.equal(scaledText(mleko, 0.5), "2½ dl mleka");
  assert.equal(scaledText(mleko, 2), "1 l mleka");
  const litar = ingredient("1 l mleka", 1, "l", "mleka");
  assert.equal(scaledText(litar, 0.5), "5 dl mleka");
});

test("scaledText: opseg skalira obe granice", () => {
  const luk = ingredient("3-4 čena belog luka", 3, "čen", "belog luka", { qtyTo: 4 });
  assert.equal(scaledText(luk, 2), "6-8 čena belog luka");
  assert.equal(scaledText(luk, 1), "3-4 čena belog luka");
  const rum = ingredient("1-2 male kašike ruma", 1, "mala kašika", "ruma", { qtyTo: 2 });
  assert.equal(scaledText(rum, 0.5), "½-1 male kašike ruma");
});

test("scaledText: sastavlja tekst kad se broj iz linije ne poklapa", () => {
  const jaja = ingredient("jaja, 3 komada", 3, "kom", "jaja");
  assert.equal(scaledText(jaja, 2), "6 jaja");
  const pavlaka = ingredient("pavlaka", 2, "kašika", "pavlake", { note: "kisele" });
  assert.equal(scaledText(pavlaka, 0.5), "1 kašika pavlake (kisele)");
});
