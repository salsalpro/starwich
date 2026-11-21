export const digits = (v) =>
  String(v ?? "")
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
export function text(v, max = 200, required = true) {
  if (typeof v !== "string" || v.length > max || (required && !v.trim()))
    throw Error("متن واردشده معتبر نیست.");
  return v.trim();
}
export function phone(v) {
  v = digits(v).replace(/[\s-]/g, "");
  if (!/^0\d{10}$/.test(v))
    throw Error("شماره تلفن باید ۱۱ رقم و با صفر آغاز شود.");
  return v;
}
export function target(v) {
  v = text(v, 2048);
  if (
    v === "/" ||
    (/^\/(?!\/)/.test(v) && !/[\\\s#?]/.test(v) && !/^\/qr\/?$/.test(v))
  )
    return v;
  let u;
  try {
    u = new URL(v);
  } catch {
    throw Error("نشانی معتبر وارد کنید.");
  }
  if (u.protocol !== "https:" || u.username || u.password)
    throw Error("نشانی باید با https آغاز شود.");
  return u.href;
}
const asset = (v) => {
  v = text(v, 250);
  if (!/^\/(photos\/[a-z0-9/-]+\.webp|api\/media\/[a-f0-9-]+\.webp)$/.test(v))
    throw Error("تصویر معتبر انتخاب کنید.");
  return v;
};
export function validateContent(v) {
  if (
    !v ||
    !Array.isArray(v.categories) ||
    !Array.isArray(v.items) ||
    v.categories.length > 100 ||
    v.items.length > 2000
  )
    throw Error("داده معتبر نیست.");
  const ids = new Set();
  const categories = v.categories.map((c) => {
    if (!/^[a-z0-9-]{1,80}$/.test(c.id) || ids.has(c.id))
      throw Error("شناسه دسته تکراری یا نامعتبر است.");
    ids.add(c.id);
    return {
      id: c.id,
      name: text(c.name, 80),
      label: text(c.label || "", 80, false),
      image: asset(c.image),
    };
  });
  const itemIds = new Set();
  const items = v.items.map((i) => {
    if (
      !ids.has(i.categoryId) ||
      !/^[a-z0-9-]{1,80}$/.test(i.id) ||
      itemIds.has(i.id)
    )
      throw Error("دسته یا شناسه غذا معتبر نیست.");
    itemIds.add(i.id);
    if (!Array.isArray(i.prices) || i.prices.length > 12)
      throw Error("قیمت‌ها معتبر نیستند.");
    return {
      id: i.id,
      categoryId: i.categoryId,
      name: text(i.name, 120),
      description: text(i.description, 2000, false),
      quantity: text(i.quantity || "", 100, false),
      photo: asset(i.photo),
      prices: i.prices.map((p) => {
        let a =
          p.amount === null || p.amount === ""
            ? null
            : Number(digits(p.amount).replace(/[,٬]/g, ""));
        if (a !== null && (!Number.isSafeInteger(a) || a < 0 || a > 1e10))
          throw Error("قیمت معتبر وارد کنید.");
        return {
          label: text(p.label || "", 80, false),
          amount: a,
          currency: "تومان",
        };
      }),
    };
  });
  const s = v.settings;
  return {
    categories,
    items,
    settings: {
      address: text(s.address, 500),
      phone: phone(s.phone),
      aboutTitle: text(s.aboutTitle, 120),
      aboutBody: text(s.aboutBody, 5000),
      qrTarget: target(s.qrTarget),
    },
  };
}
