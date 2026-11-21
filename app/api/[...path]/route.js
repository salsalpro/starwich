import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import QRCode from "qrcode";
import {
  content,
  readFile,
  writeFile,
  writeJSON,
  AppError,
} from "../../../lib/store.mjs";
import {
  session,
  login,
  changeAccount,
  sameOrigin,
} from "../../../lib/auth.mjs";
import { validateContent } from "../../../lib/validation.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function json(v, status = 200) {
  return NextResponse.json(v, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function GET(req, { params }) {
  try {
    const p = (await params).path.join("/");
    if (p.startsWith("media/")) {
      const id = p.slice(6);
      if (!/^[a-f0-9-]+\.webp$/.test(id))
        throw new AppError("تصویر یافت نشد.", 404);
      const c = await content();
      if (
        !c.value.items.some((i) => i.photo === `/api/media/${id}`) &&
        !c.value.categories.some((i) => i.image === `/api/media/${id}`)
      )
        await session();
      const f = await readFile("images/" + id);
      if (!f) throw new AppError("تصویر یافت نشد.", 404);
      return new Response(f.bytes, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const a = await session(false);
    if (p === "session")
      return json({ mustRotate: a.value.mustRotate, phone: a.value.phone });
    await session();
    if (p === "content") return json(await content());
    if (p === "qr") {
      const origin = process.env.PUBLIC_ORIGIN;
      if (!origin) throw new AppError("دامنه نهایی هنوز تنظیم نشده است.", 503);
      const url = origin + "/qr";
      if (new URL(req.url).searchParams.has("download")) {
        const png = await QRCode.toBuffer(url, {
          width: 2400,
          margin: 4,
          errorCorrectionLevel: "H",
        });
        return new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": 'attachment; filename="starwich-qr.png"',
            "Cache-Control": "no-store",
          },
        });
      }
      return new Response(
        await QRCode.toString(url, {
          type: "svg",
          margin: 4,
          errorCorrectionLevel: "H",
        }),
        {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    throw new AppError("یافت نشد.", 404);
  } catch (e) {
    return json(
      { error: e.status ? e.message : "خطایی رخ داد؛ دوباره تلاش کنید." },
      e.status || 500,
    );
  }
}
export async function POST(req, { params }) {
  try {
    sameOrigin(req);
    const p = (await params).path.join("/");
    if (p === "logout") {
      (await cookies()).delete("starwich_session");
      return json({ ok: true });
    }
    if (p === "login") {
      if (Number(req.headers.get("content-length")) > 5000)
        throw new AppError("درخواست بیش از حد بزرگ است.", 413);
      return json(await login(await req.json(), req));
    }
    if (p === "account") return json(await changeAccount(await req.json()));
    await session();
    if (p === "content") {
      if (Number(req.headers.get("content-length")) > 2000000)
        throw new AppError("درخواست بیش از حد بزرگ است.", 413);
      const b = await req.json();
      let value;
      try {
        value = validateContent(b.value);
      } catch (e) {
        throw new AppError(e.message);
      }
      const current = await content();
      if (current.version !== b.version)
        throw new AppError(
          "تغییر دیگری ذخیره شده است؛ صفحه را تازه کنید.",
          409,
        );
      const removed = current.value.categories.filter(
        (c) => !value.categories.some((v) => v.id === c.id),
      );
      for (const c of removed) {
        if (
          current.value.items.some(
            (i) =>
              i.categoryId === c.id && !value.items.some((v) => v.id === i.id),
          )
        )
          throw new AppError(
            "ابتدا غذاهای این دسته را به دسته دیگری منتقل کنید.",
          );
      }
      const origin = process.env.PUBLIC_ORIGIN;
      if (
        origin &&
        new URL(value.settings.qrTarget, origin).origin === origin &&
        /^\/qr\/?$/.test(new URL(value.settings.qrTarget, origin).pathname)
      )
        throw new AppError("مقصد QR نباید خود نشانی QR باشد.");
      return json({
        value,
        version: await writeJSON("data/content.json", value, b.version),
      });
    }
    if (p === "upload") {
      if (Number(req.headers.get("content-length")) > 4200000)
        throw new AppError("حداکثر حجم تصویر ۴ مگابایت است.", 413);
      const form = await req.formData(),
        file = form.get("image");
      if (
        !file ||
        file.size > 4e6 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        throw new AppError("تصویر PNG، JPEG یا WebP تا ۴ مگابایت انتخاب کنید.");
      let bytes;
      try {
        bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 24000000,
        })
          .rotate()
          .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        throw new AppError("فایل تصویر معتبر نیست.");
      }
      const id = randomUUID() + ".webp";
      await writeFile("images/" + id, bytes, null);
      return json({ url: "/api/media/" + id });
    }
    throw new AppError("یافت نشد.", 404);
  } catch (e) {
    return json(
      { error: e.status ? e.message : "خطایی رخ داد؛ دوباره تلاش کنید." },
      e.status || 500,
    );
  }
}
