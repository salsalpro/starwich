import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
const base = process.env.TEST_ORIGIN || "http://localhost:3000";
const env = Object.fromEntries(
  (await fs.readFile(".env.local", "utf8"))
    .trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
let cookie = "";
async function call(path, body, expected = 200, opts = {}) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    redirect: "manual",
    headers: {
      Origin: base,
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      Cookie: cookie,
      ...opts.headers,
    },
    ...(body !== undefined
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
  });
  assert.equal(
    r.status,
    expected,
    `${path}: ${r.status} ${expected === r.status ? "" : await r.text()}`,
  );
  if (r.headers.has("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  return r;
}
await call("/api/content", undefined, 401);
await call("/api/upload", new FormData(), 401);
await call("/api/content", {}, 403, {
  headers: { Origin: "https://evil.test" },
});
await call("/api/login", {
  phone: env.BOOTSTRAP_PHONE,
  password: env.BOOTSTRAP_PASSWORD,
});
await call("/api/content", undefined, 403);
const oldCookie = cookie;
const password = randomBytes(24).toString("base64url");
await call("/api/account", {
  phone: env.BOOTSTRAP_PHONE,
  currentPassword: env.BOOTSTRAP_PASSWORD,
  password,
});
const newCookie = cookie;
cookie = oldCookie;
await call("/api/content", undefined, 401);
cookie = newCookie;
await call(
  "/api/login",
  { phone: env.BOOTSTRAP_PHONE, password: env.BOOTSTRAP_PASSWORD },
  401,
);
let state = await (await call("/api/content")).json();
const original = structuredClone(state.value);
const initialVersion = state.version;
async function save(value) {
  state = await (
    await call("/api/content", { value, version: state.version })
  ).json();
}
try {
  const value = structuredClone(original);
  value.categories.push({
    id: "test-category",
    name: "آزمایش",
    label: "Test",
    image: value.categories[0].image,
  });
  value.items.push({
    id: "test-item",
    categoryId: "test-category",
    name: "غذای آزمایشی",
    description: "توضیحات آزمایشی",
    photo: value.items[0].photo,
    quantity: "",
    prices: [{ label: "کوچک", amount: "۱۲۳۴۵", currency: "تومان" }],
  });
  await save(value);
  assert.equal(state.value.items.at(-1).prices[0].amount, 12345);
  await call("/api/content", { value: original, version: initialVersion }, 409);
  const destructive = structuredClone(state.value);
  destructive.categories = destructive.categories.filter(
    (c) => c.id !== "test-category",
  );
  destructive.items = destructive.items.filter((c) => c.id !== "test-item");
  await call(
    "/api/content",
    { value: destructive, version: state.version },
    400,
  );
  const move = structuredClone(state.value);
  move.items.at(-1).categoryId = original.categories[0].id;
  move.categories = move.categories.filter((c) => c.id !== "test-category");
  await save(move);
  const form = new FormData();
  form.set(
    "image",
    new Blob([await fs.readFile("public/photos/pizza/house-pizza.webp")], {
      type: "image/webp",
    }),
    "photo.webp",
  );
  const upload = await (await call("/api/upload", form)).json();
  const edit = structuredClone(state.value);
  const pizza = edit.items.find((i) => i.id === "house-pizza");
  pizza.photo = upload.url;
  pizza.name = "پیتزا مخصوص آزمایش";
  pizza.description = "توضیح آزمایشی";
  pizza.prices = [
    { label: "کوچک", amount: 123000, currency: "تومان" },
    { label: "بزرگ", amount: null, currency: "تومان" },
  ];
  edit.settings.aboutTitle = "درباره ما آزمایش";
  edit.settings.address = "نشانی آزمایشی";
  edit.settings.qrTarget = "/contact";
  await save(edit);
  assert.ok(
    (await (await call("/category/pizza")).text()).includes(
      "پیتزا مخصوص آزمایش",
    ),
  );
  assert.ok((await (await call("/about")).text()).includes("درباره ما آزمایش"));
  assert.ok((await (await call("/contact")).text()).includes("نشانی آزمایشی"));
  await call(upload.url);
  const qr = await call("/qr", undefined, 307);
  assert.equal(qr.headers.get("location"), base + "/contact");
  assert.match(qr.headers.get("cache-control"), /no-store/);
  const invalid = new FormData();
  invalid.set("image", new Blob(["bad"], { type: "image/png" }), "bad.png");
  await call("/api/upload", invalid, 400);
  await save(original);
  await call("/qr", undefined, 307);
  await call("/api/account", {
    phone: "۰۹۱۲۸۶۳۳۳۱۳",
    currentPassword: password,
    password: "",
  });
  await call("/api/logout", {});
  await call("/api/login", { phone: "09128633313", password });
  await call("/api/account", {
    phone: env.BOOTSTRAP_PHONE,
    currentPassword: password,
    password: "",
  });
  await call("/api/logout", {});
  for (let i = 0; i < 5; i++)
    await call(
      "/api/login",
      { phone: env.BOOTSTRAP_PHONE, password: "not-correct" },
      401,
    );
  await call(
    "/api/login",
    { phone: env.BOOTSTRAP_PHONE, password: "not-correct" },
    429,
  );
  console.log(
    "PASS: auth, rotation, old session/password rejection, category/item CRUD, safe deletion, conflict detection, image replacement/validation, page settings, QR redirect, credential phone changes, rate limiting.",
  );
} catch (e) {
  cookie = newCookie;
  try {
    state = await (await call("/api/content")).json();
    await save(original);
  } catch {}
  throw e;
}
