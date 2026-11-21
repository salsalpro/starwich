import { notFound } from "next/navigation";
import { content } from "../../lib/store.mjs";
import { Title, Back } from "../ui";
export const dynamic = "force-dynamic";
export default async function Info({ params }) {
  const { page } = await params;
  const {
    value: { settings: s },
  } = await content();
  if (!["about", "contact", "create-menu"].includes(page)) notFound();
  return (
    <main className="info-page">
      <Back />
      <Title>
        {page === "about"
          ? s.aboutTitle
          : page === "contact"
            ? "ارتباط با ما"
            : "ساخت منوی شخصی"}
      </Title>
      {page === "about" ? (
        <>
          <img
            className="about-photo"
            src="/photos/burger/cheeseburger.webp"
            alt="برگر استارویج"
            width="750"
            height="510"
          />
          <p className="body-copy">{s.aboutBody}</p>
        </>
      ) : page === "contact" ? (
        <div className="info-card">
          <h2>نشانی ما</h2>
          <p>{s.address}</p>
          <h2>تماس با استارویج</h2>
          <a className="contact-link" href={"tel:" + s.phone} dir="ltr">
            {s.phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])}
          </a>
        </div>
      ) : (
        <div className="info-card">
          <h2>منوی شما، به سبک خودتان</h2>
          <p>
            برای ساخت منوی دیجیتال شخصیِ رستوران یا کافه‌تان با ما در ارتباط
            باشید.
          </p>
          <a className="contact-link" href="tel:09925202638" dir="ltr">
            ۰۹۹۲۵۲۰۲۶۳۸
          </a>
          <a className="contact-link" href="tel:09379424233" dir="ltr">
            ۰۹۳۷۹۴۲۴۲۳۳
          </a>
          <a
            className="contact-link email"
            href="mailto:to.salsal.pro@gmail.com"
          >
            to.salsal.pro@gmail.com
          </a>
        </div>
      )}
      <div className="info-back">
        <Back />
      </div>
    </main>
  );
}
