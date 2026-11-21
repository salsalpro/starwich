import "server-only";
import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { readJSON, writeJSON, AppError } from "./store.mjs";
import { phone } from "./validation.mjs";
const file = "private/account.json";
export function hash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function matches(password, stored) {
  const [salt, key] = stored.split(":");
  return timingSafeEqual(
    Buffer.from(key, "hex"),
    scryptSync(password, salt, 64),
  );
}
export async function account() {
  let a = await readJSON(file);
  if (a) return a;
  if (!process.env.BOOTSTRAP_PASSWORD || !process.env.BOOTSTRAP_PHONE)
    throw new AppError("حساب مدیر هنوز راه‌اندازی نشده است.", 503);
  const value = {
    phone: phone(process.env.BOOTSTRAP_PHONE),
    hash: hash(process.env.BOOTSTRAP_PASSWORD),
    mustRotate: true,
    epoch: randomBytes(20).toString("hex"),
    buckets: {},
  };
  try {
    await writeJSON(file, value, null);
  } catch (e) {
    if (e.status !== 409) throw e;
  }
  return readJSON(file);
}
function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new AppError("تنظیمات امنیتی کامل نیست.", 503);
  return process.env.SESSION_SECRET;
}
const sign = (s) =>
  createHmac("sha256", secret()).update(s).digest("base64url");
export async function session(requireRotated = true) {
  const raw = (await cookies()).get("starwich_session")?.value;
  if (!raw) throw new AppError("ابتدا وارد شوید.", 401);
  const [payload, sig] = raw.split(".");
  const expected = sign(payload);
  if (
    !sig ||
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    throw new AppError("نشست معتبر نیست.", 401);
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url"));
  } catch {
    throw new AppError("نشست معتبر نیست.", 401);
  }
  const a = await readJSON(file);
  if (!a || data.exp < Date.now() || data.epoch !== a.value.epoch)
    throw new AppError("نشست پایان یافته است.", 401);
  if (requireRotated && a.value.mustRotate)
    throw new AppError("ابتدا رمز عبور را تغییر دهید.", 403);
  return a;
}
export async function setSession(a) {
  const payload = Buffer.from(
    JSON.stringify({ epoch: a.epoch, exp: Date.now() + 8 * 3600e3 }),
  ).toString("base64url");
  (await cookies()).set("starwich_session", `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function login(input, request) {
  if (typeof input.password !== "string" || input.password.length > 200)
    throw new AppError("اطلاعات ورود معتبر نیست.");
  let a;
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    "local";
  const key = createHash("sha256").update(ip.split(",")[0]).digest("hex");
  for (let attempt = 0; attempt < 5; attempt++) {
    a = await account();
    const now = Date.now();
    const buckets = Object.fromEntries(
      Object.entries(a.value.buckets || {}).filter(([, b]) => b.until > now),
    );
    for (const k of [key, "global"]) {
      const b = buckets[k] || { count: 0, until: now + 15 * 60e3 };
      if (b.count >= (k === "global" ? 100 : 5))
        throw new AppError(
          "تلاش‌های ورود زیاد است. ۱۵ دقیقه دیگر دوباره امتحان کنید.",
          429,
        );
      b.count++;
      buckets[k] = b;
    }
    a.value.buckets = buckets;
    try {
      await writeJSON(file, a.value, a.version);
      break;
    } catch (e) {
      if (e.status !== 409 || attempt === 4) throw e;
    }
  }
  if (
    phone(input.phone) !== a.value.phone ||
    !matches(input.password, a.value.hash)
  )
    throw new AppError("شماره یا رمز عبور نادرست است.", 401);
  await setSession(a.value);
  return { mustRotate: a.value.mustRotate };
}
export async function changeAccount(input) {
  const a = await session(false);
  if (
    typeof input.currentPassword !== "string" ||
    input.currentPassword.length > 200 ||
    !matches(input.currentPassword, a.value.hash)
  )
    throw new AppError("رمز عبور فعلی نادرست است.", 400);
  const newPhone = phone(input.phone);
  if (
    (a.value.mustRotate || input.password) &&
    (typeof input.password !== "string" ||
      input.password.length < 12 ||
      input.password.length > 128 ||
      matches(input.password, a.value.hash))
  )
    throw new AppError("رمز جدید و متفاوت، با حداقل ۱۲ نویسه وارد کنید.");
  const value = {
    ...a.value,
    phone: newPhone,
    hash: input.password ? hash(input.password) : a.value.hash,
    mustRotate: false,
    epoch: randomBytes(20).toString("hex"),
    buckets: {},
  };
  await writeJSON(file, value, a.version);
  await setSession(value);
  return { ok: true };
}
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !==
      `${process.env.VERCEL ? "https:" : new URL(request.url).protocol}//${request.headers.get("host")}`
  )
    throw new AppError("درخواست مجاز نیست.", 403);
}
