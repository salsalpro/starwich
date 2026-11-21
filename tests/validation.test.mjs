import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { digits, phone, target, validateContent } from "../lib/validation.mjs";
const seed = JSON.parse(fs.readFileSync("data/content.json"));
test("all 77 archive items and six categories survive validation", () => {
  const v = validateContent(seed);
  assert.equal(v.items.length, 77);
  assert.equal(v.categories.length, 6);
  for (const i of v.items) assert.ok(fs.existsSync("public" + i.photo));
  for (const c of v.categories) assert.ok(fs.existsSync("public" + c.image));
  assert.equal(
    v.items.find((i) => i.id === "special-mixed-meat").prices[0].amount,
    null,
  );
});
test("normalizes all three digit alphabets", () => {
  assert.equal(digits("۰۱۲٣٤٥6789"), "0123456789");
  assert.equal(phone("۰۹۱۲۸۶۳۳۳۱۲"), "09128633312");
  const v = structuredClone(seed);
  v.items[0].prices[0].amount = "۲۸۰٬۰۰۰";
  assert.equal(validateContent(v).items[0].prices[0].amount, 280000);
});
test("rejects broken references, duplicate IDs, invalid prices and images", () => {
  for (const change of [
    (v) => (v.items[0].categoryId = "missing"),
    (v) => (v.items[0].id = v.items[1].id),
    (v) => (v.items[0].prices[0].amount = -1),
    (v) => (v.items[0].photo = "https://bad.test/a.png"),
    (v) => v.categories.push(v.categories[0]),
  ]) {
    const v = structuredClone(seed);
    change(v);
    assert.throws(() => validateContent(v));
  }
});
test("QR requires safe relative or HTTPS URLs", () => {
  assert.equal(target("/"), "/");
  assert.equal(target("https://example.com/menu"), "https://example.com/menu");
  for (const x of [
    "javascript:alert(1)",
    "//evil.test",
    "/qr",
    "/\\evil.test",
    "https://user:pass@example.com",
  ])
    assert.throws(() => target(x));
});
