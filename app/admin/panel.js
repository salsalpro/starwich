"use client";
import { useEffect, useState } from "react";
import {
  CategoryEditor,
  ItemEditor,
  SettingsEditor,
  AccountEditor,
  QRSettings,
} from "./forms";
import { Back, Title } from "../ui";
export async function api(path, body) {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...(body !== undefined
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "ارتباط برقرار نشد.");
  return data;
}
const tabs = {
  dashboard: "پیشخوان",
  categories: "دسته‌ها",
  items: "غذاها",
  content: "محتوای صفحات",
  qr: "کد QR",
  account: "حساب کاربری",
};
export default function Admin({ initialAuth, origin }) {
  const [auth, setAuth] = useState(initialAuth),
    [state, setState] = useState(null),
    [tab, setTab] = useState(initialAuth?.mustRotate ? "account" : "dashboard"),
    [message, setMessage] = useState(null),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    [filter, setFilter] = useState("");
  async function run(fn) {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ error: true, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (auth && !auth.mustRotate)
      run(async () => setState(await api("content")));
  }, [auth]);
  async function save(value) {
    const result = await api("content", { value, version: state.version });
    setState(result);
    setEditing(null);
    setMessage({ text: "تغییرات ذخیره شد." });
  }
  function update(kind, record) {
    const list = state.value[kind];
    return save({
      ...state.value,
      [kind]: list.some((x) => x.id === record.id)
        ? list.map((x) => (x.id === record.id ? record : x))
        : [...list, record],
    });
  }
  function reorder(kind, id, direction) {
    const list = [...state.value[kind]],
      index = list.findIndex((x) => x.id === id);
    let other = index + direction;
    if (kind === "items") {
      while (
        other >= 0 &&
        other < list.length &&
        list[other].categoryId !== list[index].categoryId
      )
        other += direction;
    }
    if (other < 0 || other >= list.length) return;
    [list[index], list[other]] = [list[other], list[index]];
    run(() => save({ ...state.value, [kind]: list }));
  }
  function remove(kind, id) {
    const item = state.value[kind].find((x) => x.id === id);
    if (
      kind === "categories" &&
      state.value.items.some((x) => x.categoryId === id)
    ) {
      setMessage({
        error: true,
        text: "این دسته غذا دارد. ابتدا غذاها را ویرایش و به دسته دیگری منتقل کنید؛ هیچ غذایی حذف نمی‌شود.",
      });
      return;
    }
    if (confirm(`«${item.name}» حذف شود؟ این کار قابل بازگشت نیست.`))
      run(() =>
        save({
          ...state.value,
          [kind]: state.value[kind].filter((x) => x.id !== id),
        }),
      );
  }
  const navigate = (k) => {
    setTab(k);
    setEditing(null);
    setMessage(null);
  };
  return (
    <main>
      <Back />
      {!auth && <Title>ورود مدیریت</Title>}
      <div className="admin-head">
        {auth && <h1>مدیریت استارویج</h1>}
        {auth && (
          <button
            onClick={() =>
              run(async () => {
                await api("logout", {});
                setAuth(null);
                setState(null);
              })
            }
          >
            خروج
          </button>
        )}
      </div>
      {message && (
        <div
          className={"feedback" + (message.error ? " error" : "")}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </div>
      )}
      {!auth ? (
        <form
          className="panel login"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(async () => {
              const a = await api("login", Object.fromEntries(f));
              setAuth({ ...a, phone: f.get("phone") });
              setTab(a.mustRotate ? "account" : "dashboard");
            });
          }}
        >
          <label>
            شماره همراه
            <input name="phone" type="tel" autoComplete="tel" required />
          </label>
          <label>
            رمز عبور
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <button className="primary wide" disabled={busy}>
            ورود
          </button>
        </form>
      ) : (
        <>
          {auth.mustRotate ? (
            <p className="feedback">
              برای فعال شدن مدیریت، رمز اولیه را با رمزی جدید و حداقل ۱۲ نویسه
              تغییر دهید.
            </p>
          ) : (
            <nav className="admin-tabs" aria-label="بخش‌های مدیریت">
              {Object.entries(tabs).map(([k, v]) => (
                <button
                  key={k}
                  className={tab === k ? "active" : ""}
                  onClick={() => navigate(k)}
                >
                  {v}
                </button>
              ))}
            </nav>
          )}
          {tab === "account" ? (
            <AccountEditor
              auth={auth}
              busy={busy}
              submit={(input) =>
                run(async () => {
                  await api("account", input);
                  setAuth({ phone: input.phone, mustRotate: false });
                  setMessage({
                    text: "اطلاعات ورود تغییر کرد. نشست‌های قبلی بسته شدند.",
                  });
                  setTab("dashboard");
                })
              }
            />
          ) : !state ? (
            <p role="status">
              در حال دریافت اطلاعات…{" "}
              <button
                onClick={() => run(async () => setState(await api("content")))}
              >
                تلاش دوباره
              </button>
            </p>
          ) : (
            <>
              {tab === "dashboard" && (
                <>
                  <p className="helper">
                    {new Intl.NumberFormat("fa-IR").format(
                      state.value.items.length,
                    )}{" "}
                    غذا ·{" "}
                    {new Intl.NumberFormat("fa-IR").format(
                      state.value.categories.length,
                    )}{" "}
                    دسته
                  </p>
                  <div className="dashboard-grid">
                    {Object.entries(tabs)
                      .filter(([k]) => k !== "dashboard")
                      .map(([k, v]) => (
                        <button key={k} onClick={() => navigate(k)}>
                          {v}
                        </button>
                      ))}
                  </div>
                </>
              )}
              {(tab === "categories" || tab === "items") && (
                <>
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(null)}>
                        بازگشت به فهرست
                      </button>
                      {tab === "categories" ? (
                        <CategoryEditor
                          key={editing.id}
                          value={editing}
                          busy={busy}
                          submit={(v) => run(() => update("categories", v))}
                        />
                      ) : (
                        <ItemEditor
                          key={editing.id}
                          value={editing}
                          categories={state.value.categories}
                          busy={busy}
                          submit={(v) => run(() => update("items", v))}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={
                            busy ||
                            (tab === "items" && !state.value.categories.length)
                          }
                          onClick={() =>
                            setEditing(
                              tab === "categories"
                                ? {
                                    id: crypto.randomUUID(),
                                    name: "",
                                    label: "",
                                    image: "/photos/pizza/pepperoni-pizza.webp",
                                  }
                                : {
                                    id: crypto.randomUUID(),
                                    categoryId:
                                      filter || state.value.categories[0]?.id,
                                    name: "",
                                    description: "",
                                    photo: "/photos/pizza/pepperoni-pizza.webp",
                                    quantity: "",
                                    prices: [
                                      {
                                        label: "",
                                        amount: null,
                                        currency: "تومان",
                                      },
                                    ],
                                  },
                            )
                          }
                        >
                          {tab === "categories" ? "افزودن دسته" : "افزودن غذا"}
                        </button>
                      </div>
                      {tab === "items" && (
                        <label>
                          فیلتر دسته
                          <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                          >
                            <option value="">همه دسته‌ها</option>
                            {state.value.categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <p className="helper">
                        برای ترتیب نمایش از «بالاتر» و «پایین‌تر» استفاده کنید.
                      </p>
                      <div className="admin-list">
                        {state.value[
                          tab === "categories" ? "categories" : "items"
                        ]
                          .filter(
                            (x) =>
                              tab === "categories" ||
                              !filter ||
                              x.categoryId === filter,
                          )
                          .map((x) => (
                            <div key={x.id} className="admin-row">
                              <img src={x.image || x.photo} alt="" />
                              <span className="row-title">{x.name}</span>
                              <div className="actions">
                                <button
                                  disabled={busy}
                                  onClick={() => reorder(tab, x.id, -1)}
                                  aria-label={"انتقال " + x.name + " به بالا"}
                                >
                                  بالاتر
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => reorder(tab, x.id, 1)}
                                  aria-label={"انتقال " + x.name + " به پایین"}
                                >
                                  پایین‌تر
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => setEditing(x)}
                                >
                                  ویرایش
                                </button>
                                <button
                                  className="danger"
                                  disabled={busy}
                                  onClick={() => remove(tab, x.id)}
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {tab === "content" && (
                <SettingsEditor
                  value={state.value.settings}
                  busy={busy}
                  submit={(settings) =>
                    run(() => save({ ...state.value, settings }))
                  }
                />
              )}
              {tab === "qr" && (
                <QRSettings
                  origin={origin}
                  value={state.value.settings}
                  busy={busy}
                  submit={(settings) =>
                    run(() => save({ ...state.value, settings }))
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
