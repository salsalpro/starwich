import "server-only";
import fs from "node:fs/promises";
import seedContent from "../data/content.json";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.join(process.cwd(), ".local-store");
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const digest = (b) => createHash("sha256").update(b).digest("hex");
function remote() {
  if (process.env.CONTENT_REPO && process.env.CONTENT_TOKEN) return true;
  if (process.env.VERCEL)
    throw new AppError("ذخیره‌سازی پایدار تنظیم نشده است.", 503);
  return false;
}
let privacyChecked = 0;
async function ensurePrivate() {
  if (Date.now() - privacyChecked < 60000) return;
  const r = await fetch(
    `https://api.github.com/repos/${process.env.CONTENT_REPO}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.CONTENT_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!r.ok || (await r.json()).private !== true)
    throw new AppError("مخزن ذخیره‌سازی باید خصوصی و قابل دسترس باشد.", 503);
  privacyChecked = Date.now();
}
async function api(name, options = {}) {
  await ensurePrivate();
  const r = await fetch(
    `https://api.github.com/repos/${process.env.CONTENT_REPO}/contents/${name}`,
    {
      ...options,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.CONTENT_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    },
  );
  return r;
}
export async function readFile(name) {
  if (remote()) {
    const r = await api(name);
    if (r.status === 404) return null;
    if (!r.ok) throw new AppError("ارتباط با فضای ذخیره‌سازی برقرار نشد.", 503);
    const x = await r.json();
    return { bytes: Buffer.from(x.content, "base64"), version: x.sha };
  }
  try {
    const bytes = await fs.readFile(path.join(root, name));
    return { bytes, version: digest(bytes) };
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
let queue = Promise.resolve();
export async function writeFile(name, bytes, version) {
  if (remote()) {
    const r = await api(name, {
      method: "PUT",
      body: JSON.stringify({
        message: `Update ${name.startsWith("private/") ? "private state" : name}`,
        content: bytes.toString("base64"),
        ...(version ? { sha: version } : {}),
      }),
    });
    if (r.status === 409 || r.status === 422)
      throw new AppError(
        "تغییر دیگری ذخیره شده است. صفحه را تازه کنید و دوباره تلاش کنید.",
        409,
      );
    if (!r.ok) throw new AppError("ذخیره انجام نشد؛ دوباره تلاش کنید.", 503);
    return (await r.json()).content.sha;
  }
  const task = queue.then(async () => {
    const current = await readFile(name);
    if ((current?.version ?? null) !== (version ?? null))
      throw new AppError("تداخل تغییرات؛ صفحه را تازه کنید.", 409);
    const target = path.join(root, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target + ".tmp", bytes, { mode: 0o600 });
    await fs.rename(target + ".tmp", target);
    return digest(bytes);
  });
  queue = task.catch(() => {});
  return task;
}
export async function readJSON(name) {
  const f = await readFile(name);
  return f ? { value: JSON.parse(f.bytes), version: f.version } : null;
}
export const writeJSON = (name, value, version) =>
  writeFile(name, Buffer.from(JSON.stringify(value)), version);
export async function content() {
  const saved = await readJSON("data/content.json");
  if (saved) return saved;
  return { value: structuredClone(seedContent), version: null };
}
