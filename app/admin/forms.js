"use client";
import { useState } from "react";
import { api } from "./panel";
function Field({ label, name, value, set, type = "text", ...props }) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={(e) => set(e.target.value)}
        {...props}
      />
    </label>
  );
}
function Upload({ url, onChange, onBusy }) {
  const [error, setError] = useState("");
  return (
    <div>
      <img className="preview" src={url} alt="تصویر انتخاب‌شده" />
      <label>
        تغییر تصویر (حداکثر ۴ مگابایت)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setError("");
            onBusy(true);
            try {
              const form = new FormData();
              form.set("image", file);
              onChange((await api("upload", form)).url);
            } catch (err) {
              setError(err.message);
            } finally {
              onBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="danger">
          {error}
        </p>
      )}
    </div>
  );
}
export function CategoryEditor({ value, submit, busy }) {
  const [v, set] = useState(value),
    [uploading, setUploading] = useState(false);
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        submit(v);
      }}
    >
      <h2>ویرایش دسته</h2>
      <Field
        label="نام دسته"
        value={v.name}
        set={(name) => set({ ...v, name })}
        required
        maxLength={80}
      />
      <Field
        label="عنوان انگلیسی (اختیاری)"
        value={v.label}
        set={(label) => set({ ...v, label })}
        maxLength={80}
      />
      <Upload
        url={v.image}
        onChange={(image) => set({ ...v, image })}
        onBusy={setUploading}
      />
      <button className="primary" disabled={busy || uploading}>
        {uploading ? "در حال بارگذاری…" : "ذخیره دسته"}
      </button>
    </form>
  );
}
export function ItemEditor({ value, categories, submit, busy }) {
  const [v, set] = useState(value),
    [uploading, setUploading] = useState(false);
  function change(k, x) {
    set({ ...v, [k]: x });
  }
  function priceAt(n, k, x) {
    change(
      "prices",
      v.prices.map((p, i) => (i === n ? { ...p, [k]: x } : p)),
    );
  }
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        submit(v);
      }}
    >
      <h2>ویرایش غذا</h2>
      <Field
        label="نام غذا"
        value={v.name}
        set={(x) => change("name", x)}
        required
        maxLength={120}
      />
      <label>
        دسته
        <select
          value={v.categoryId}
          onChange={(e) => change("categoryId", e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        توضیحات
        <textarea
          value={v.description}
          maxLength={2000}
          onChange={(e) => change("description", e.target.value)}
        />
      </label>
      <Field
        label="مقدار / تعداد نفر (اختیاری)"
        value={v.quantity}
        set={(x) => change("quantity", x)}
        maxLength={100}
      />
      <Upload
        url={v.photo}
        onChange={(x) => change("photo", x)}
        onBusy={setUploading}
      />
      <h3>قیمت‌ها به تومان</h3>
      <p className="helper">
        قیمت خالی یعنی «استعلام قیمت». برای قیمت تکی، نام اندازه را خالی
        بگذارید.
      </p>
      {v.prices.map((p, i) => (
        <div className="panel" key={i}>
          <div className="form-row">
            <Field
              label="اندازه / عنوان"
              value={p.label}
              set={(x) => priceAt(i, "label", x)}
              maxLength={80}
            />
            <Field
              label="قیمت (تومان)"
              value={p.amount}
              set={(x) => priceAt(i, "amount", x)}
              inputMode="numeric"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              change(
                "prices",
                v.prices.filter((_, j) => j !== i),
              )
            }
          >
            حذف این قیمت
          </button>
        </div>
      ))}
      <div className="actions">
        <button
          type="button"
          onClick={() =>
            change("prices", [
              ...v.prices,
              { label: "", amount: null, currency: "تومان" },
            ])
          }
          disabled={v.prices.length >= 12}
        >
          افزودن اندازه / قیمت
        </button>
        <button className="primary" disabled={busy || uploading}>
          {uploading ? "در حال بارگذاری…" : "ذخیره غذا"}
        </button>
      </div>
    </form>
  );
}
export function SettingsEditor({ value, submit, busy }) {
  const [v, set] = useState(value);
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        submit(v);
      }}
    >
      <h2>درباره ما و ارتباط با ما</h2>
      <Field
        label="نشانی رستوران"
        value={v.address}
        set={(address) => set({ ...v, address })}
        required
        maxLength={500}
      />
      <Field
        label="تلفن رستوران"
        value={v.phone}
        set={(phone) => set({ ...v, phone })}
        required
        type="tel"
      />
      <Field
        label="عنوان درباره ما"
        value={v.aboutTitle}
        set={(aboutTitle) => set({ ...v, aboutTitle })}
        required
        maxLength={120}
      />
      <label>
        متن درباره ما
        <textarea
          value={v.aboutBody}
          onChange={(e) => set({ ...v, aboutBody: e.target.value })}
          required
          maxLength={5000}
        />
      </label>
      <button className="primary" disabled={busy}>
        ذخیره محتوا
      </button>
    </form>
  );
}
export function AccountEditor({ auth, submit, busy }) {
  const [v, set] = useState({
    phone: auth.phone,
    currentPassword: "",
    password: "",
  });
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        submit(v);
      }}
    >
      <h2>اطلاعات ورود مدیر</h2>
      <Field
        label="شماره همراه"
        value={v.phone}
        set={(phone) => set({ ...v, phone })}
        type="tel"
        required
        autoComplete="tel"
      />
      <Field
        label="رمز فعلی"
        value={v.currentPassword}
        set={(currentPassword) => set({ ...v, currentPassword })}
        type="password"
        required
        autoComplete="current-password"
      />
      <Field
        label="رمز جدید (حداقل ۱۲ نویسه)"
        value={v.password}
        set={(password) => set({ ...v, password })}
        type="password"
        required={auth.mustRotate}
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
      />
      <p className="helper">
        {auth.mustRotate
          ? "رمز اولیه پس از ذخیره دیگر قابل استفاده نیست."
          : "برای تغییر فقط شماره، رمز جدید را خالی بگذارید. با ذخیره، نشست‌های قبلی بسته می‌شوند."}
      </p>
      <button className="primary" disabled={busy}>
        ذخیره اطلاعات ورود
      </button>
    </form>
  );
}
export function QRSettings({ origin, value, submit, busy }) {
  const [url, set] = useState(value.qrTarget);
  return (
    <section className="panel">
      <h2>کد QR همیشگی منو</h2>
      {origin ? (
        <>
          <a className="contact-link email" dir="ltr" href={origin + "/qr"}>
            {origin}/qr
          </a>
          <img className="qr-preview" src="/api/qr" alt="کد QR منوی استارویج" />
          <a className="back wide" href="/api/qr?download=1" download>
            دانلود PNG با کیفیت چاپ
          </a>
        </>
      ) : (
        <p role="status">پس از تأیید دامنه اصلی، کد QR فعال می‌شود.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit({ ...value, qrTarget: url });
        }}
      >
        <label>
          مقصد QR
          <input
            dir="ltr"
            value={url}
            onChange={(e) => set(e.target.value)}
            required
            maxLength={2048}
          />
        </label>
        <p className="helper">
          برای منوی اصلی «/» یا یک نشانی کامل با https وارد کنید.
        </p>
        <button className="primary" disabled={busy}>
          ذخیره مقصد
        </button>
      </form>
      <p className="helper">
        پیش از چاپ: دامنه {origin || "اصلی"} و مسیر /qr باید همیشه فعال بمانند؛
        حتی اگر منو به دامنه دیگری منتقل شود.
      </p>
    </section>
  );
}
