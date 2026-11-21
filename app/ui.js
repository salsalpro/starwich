"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
const links = [
  ["/admin", "ورود مدیریت", "♙"],
  ["/about", "درباره ما", "ⓘ"],
  ["/contact", "ارتباط با ما", "♧"],
  ["/create-menu", "ساخت منوی شخصی", "✳"],
];
export function Shell({ children }) {
  const drawer = useRef(null);
  function close() {
    drawer.current.close();
  }
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" aria-label="صفحه اصلی" className="brand-icon">
            <img
              src="/branding/starwich-mark.png"
              alt=""
              width="44"
              height="44"
            />
          </Link>
          <Link href="/" className="wordmark">
            <img
              src="/branding/wordmark.png"
              alt="استارویج"
              width="120"
              height="62"
            />
          </Link>
          <button
            className="menu-button"
            aria-label="باز کردن منو"
            onClick={() => drawer.current.showModal()}
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </header>
      <dialog
        ref={drawer}
        className="drawer"
        onClick={(e) => {
          if (e.target === drawer.current) close();
        }}
      >
        <div className="drawer-head">
          <strong>استارویج</strong>
          <button onClick={close} aria-label="بستن منو">
            ×
          </button>
        </div>
        <nav>
          {links.map(([href, label, icon]) => (
            <Link key={href} href={href} onClick={close}>
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <Link className="back" href="/" onClick={close}>
          بازگشت به منو
        </Link>
      </dialog>
      {children}
      <footer>
        <div className="footer-inner">
          <div className="footer-brand">
            <img
              src="/branding/starwich-mark.png"
              alt=""
              width="32"
              height="32"
            />
            <span className="wordmark">
              <img
                src="/branding/wordmark.png"
                alt="استارویج"
                width="100"
                height="51"
              />
            </span>
          </div>
          <nav>
            {links.map(([href, label, icon]) => (
              <Link key={href} href={href}>
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
export function Spark() {
  return (
    <svg className="spark" viewBox="0 0 120 92" fill="none" aria-hidden="true">
      <ellipse
        cx="59"
        cy="46"
        rx="54"
        ry="22"
        transform="rotate(-18 59 46)"
        stroke="#cb853f"
        strokeWidth="1.3"
      />
      <path
        d="M64 4C63 36 56 42 33 45C56 48 63 55 64 82C66 55 73 49 96 45C73 42 66 35 64 4Z"
        fill="#f5a056"
      />
      <path d="M29 47Q12 62 24 85Q39 65 29 47" fill="#a7bc71" />
      <path d="M24 83L29 55" stroke="#526037" />
      <path
        d="M26 11v10m-5-5h10M99 71v14m-7-7h14"
        stroke="#f5a056"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export const Back = () => (
  <Link href="/" className="back">
    بازگشت به منو <span aria-hidden="true">›</span>
  </Link>
);
export function Title({ children }) {
  return (
    <div className="page-title">
      <h1>{children}</h1>
      <Spark />
    </div>
  );
}
export function price(prices) {
  if (!prices.length || prices.some((p) => p.amount == null))
    return "استعلام قیمت";
  const n = Math.min(...prices.map((p) => p.amount));
  return `${prices.length > 1 ? "از " : ""}${new Intl.NumberFormat("fa-IR").format(n)} تومان`;
}
export function Items({ items, category }) {
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (selected) {
      ref.current.showModal();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);
  const close = () => {
    ref.current.close();
    setSelected(null);
  };
  return (
    <>
      <div className="item-grid">
        {items.map((i) => (
          <button
            className="food-card"
            key={i.id}
            onClick={() => setSelected(i)}
          >
            <div className="food-image">
              <img
                src={i.photo}
                alt={i.name}
                loading="lazy"
                width="380"
                height="250"
              />
              {i.quantity && <span className="quantity">{i.quantity}</span>}
            </div>
            <div className="food-caption">
              <h2>{i.name}</h2>
              <p>{price(i.prices)}</p>
            </div>
          </button>
        ))}
      </div>
      {!items.length && (
        <p className="empty">غذاهای این دسته به‌زودی اضافه می‌شوند.</p>
      )}
      <dialog
        ref={ref}
        className="sheet"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        {selected && (
          <div className="sheet-inner">
            <div className="handle" />
            <div className="detail-photo">
              <img
                src={selected.photo}
                alt={selected.name}
                width="800"
                height="800"
              />
              <button
                className="close"
                onClick={close}
                aria-label="بستن جزئیات"
              >
                ×
              </button>
            </div>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            {selected.quantity && <p>{selected.quantity}</p>}
            <div className="price-grid">
              {(selected.prices.length
                ? selected.prices
                : [{ label: "", amount: null }]
              ).map((p, i) => (
                <div key={i}>
                  <span>{p.label || "قیمت"}</span>
                  <strong>
                    {p.amount == null
                      ? "استعلام قیمت"
                      : new Intl.NumberFormat("fa-IR").format(p.amount) +
                        " تومان"}
                  </strong>
                </div>
              ))}
            </div>
            <button className="back wide" onClick={close}>
              بازگشت به {category.name}
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
