import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import path from "node:path";

const [phase, origin] = process.argv.slice(2);
if (
  !["before", "after"].includes(phase) ||
  !/^https:\/\/[^/]+$/.test(origin || "")
)
  throw Error(
    "Usage: node scripts/production-check.mjs before|after https://production-origin",
  );
const privateDir = path.join(process.cwd(), ".private");
await fs.mkdir(privateDir, { recursive: true, mode: 0o700 });
const credentialPath = path.join(privateDir, "manager-login.json");
const snapshotPath = path.join(privateDir, "production-test-snapshot.json");
const fileEnv = Object.fromEntries(
  (await fs.readFile(".env.local", "utf8"))
    .split("\n")
    .filter((x) => x.includes("="))
    .map((x) => {
      let n = x.indexOf("=");
      return [x.slice(0, n), x.slice(n + 1)];
    }),
);
let cookie = "";
async function request(route, body, expected = 200, headers = {}) {
  const response = await fetch(origin + route, {
    method: body === undefined ? "GET" : "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      Cookie: cookie,
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body === undefined
      ? {}
      : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  });
  if (response.status !== expected)
    throw Error(
      `${route}: expected ${expected}, received ${response.status}; ${await response.text()}`,
    );
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return response;
}
const sha = (b) => createHash("sha256").update(b).digest("hex");
async function login(phone, password) {
  await request("/api/login", { phone, password });
}
async function getContent() {
  return await (await request("/api/content")).json();
}
async function save(value, version) {
  return await (await request("/api/content", { value, version })).json();
}
async function qr() {
  return sha(
    Buffer.from(await (await request("/api/qr?download=1")).arrayBuffer()),
  );
}
for (const route of [
  "/",
  "/category/appetizer",
  "/category/pizza",
  "/category/fried",
  "/category/sandwich",
  "/category/burger",
  "/category/economic",
  "/about",
  "/contact",
  "/create-menu",
])
  await request(route);
await request("/api/content", undefined, 401);
if (phase === "before") {
  let credential;
  try {
    credential = JSON.parse(await fs.readFile(credentialPath, "utf8"));
  } catch {
    credential = {
      phone: fileEnv.BOOTSTRAP_PHONE,
      password: randomBytes(32).toString("base64url"),
    };
    await fs.writeFile(credentialPath, JSON.stringify(credential), {
      mode: 0o600,
    });
  }
  try {
    await login(credential.phone, credential.password);
  } catch {
    await login(fileEnv.BOOTSTRAP_PHONE, fileEnv.BOOTSTRAP_PASSWORD);
    await request("/api/content", undefined, 403);
    await request("/api/account", {
      phone: credential.phone,
      currentPassword: fileEnv.BOOTSTRAP_PASSWORD,
      password: credential.password,
    });
    await request(
      "/api/login",
      { phone: fileEnv.BOOTSTRAP_PHONE, password: fileEnv.BOOTSTRAP_PASSWORD },
      401,
    );
  }
  const state = await getContent();
  assert.equal(state.value.items.length, 77);
  assert.equal(state.value.categories.length, 6);
  const original = structuredClone(state.value);
  const beforeHash = await qr();
  await fs.writeFile(
    snapshotPath,
    JSON.stringify({ original, beforeHash, uploaded: null }),
    { mode: 0o600 },
  );
  const form = new FormData();
  form.set(
    "image",
    new Blob([await fs.readFile("public/photos/pizza/house-pizza.webp")], {
      type: "image/webp",
    }),
    "house-pizza.webp",
  );
  const uploaded = await (await request("/api/upload", form)).json();
  await fs.writeFile(
    snapshotPath,
    JSON.stringify({ original, beforeHash, uploaded: uploaded.url }),
    { mode: 0o600 },
  );
  const edit = structuredClone(original);
  edit.settings.aboutTitle = "درباره ما — آزمون انتشار";
  edit.settings.address = "تهران، شهریار، سعیدآباد، استارویچ — آزمون انتشار";
  edit.settings.qrTarget = "/contact";
  const item = edit.items.find((i) => i.id === "house-pizza");
  item.photo = uploaded.url;
  item.name += " — آزمون انتشار";
  edit.categories.push({
    id: "publish-test",
    name: "دسته آزمایشی",
    label: "Test",
    image: edit.categories[0].image,
  });
  edit.items.push({
    id: "publish-test-item",
    categoryId: "publish-test",
    name: "غذای آزمایشی",
    description: "آزمون انتشار",
    quantity: "",
    photo: uploaded.url,
    prices: [{ label: "", amount: null, currency: "تومان" }],
  });
  await save(edit, state.version);
  assert((await (await request("/about")).text()).includes("آزمون انتشار"));
  assert((await (await request("/contact")).text()).includes("آزمون انتشار"));
  assert(
    (await (await request("/category/pizza")).text()).includes("آزمون انتشار"),
  );
  await request(uploaded.url);
  const redirect = await request("/qr", undefined, 307);
  assert.equal(redirect.headers.get("location"), origin + "/contact");
  assert.match(redirect.headers.get("cache-control"), /no-store/);
  assert.equal(await qr(), beforeHash);
  console.log(
    "BEFORE PASS: public routes, credentials rotated, unauthorized rejection, CRUD, upload, About/Contact edits, QR target change and unchanged QR image. Ready for redeploy.",
  );
} else {
  const credential = JSON.parse(await fs.readFile(credentialPath, "utf8"));
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
  await login(credential.phone, credential.password);
  const state = await getContent();
  assert(state.value.categories.some((c) => c.id === "publish-test"));
  assert(state.value.items.some((i) => i.id === "publish-test-item"));
  assert((await (await request("/about")).text()).includes("آزمون انتشار"));
  assert((await (await request("/contact")).text()).includes("آزمون انتشار"));
  await request(snapshot.uploaded);
  assert.equal(
    (await request("/qr", undefined, 307)).headers.get("location"),
    origin + "/contact",
  );
  assert.equal(await qr(), snapshot.beforeHash);
  await save(snapshot.original, state.version);
  assert.equal(
    (await request("/qr", undefined, 307)).headers.get("location"),
    origin + "/",
  );
  assert.equal(await qr(), snapshot.beforeHash);
  assert(!(await (await request("/about")).text()).includes("آزمون انتشار"));
  console.log(
    "AFTER PASS: edits and uploaded image survived redeploy; same QR image sent to changed destination, then original content and QR destination were restored.",
  );
}
