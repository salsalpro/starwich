import Link from "next/link";
import { notFound } from "next/navigation";
import { content } from "../../../lib/store.mjs";
import { Items, Back } from "../../ui";
export const dynamic = "force-dynamic";
export default async function Category({ params }) {
  const { id } = await params;
  const { value } = await content();
  const c = value.categories.find((c) => c.id === id);
  if (!c) notFound();
  return (
    <main>
      <Back />
      <div className="category-banner">
        <div>
          <h1>{c.name}</h1>
          <span lang="en">{c.label}</span>
        </div>
        <img src={c.image} alt="" width="210" height="175" />
      </div>
      <Items
        items={value.items.filter((i) => i.categoryId === id)}
        category={c}
      />
      <Link className="back wide" href="/">
        بازگشت به منو
      </Link>
      <nav className="category-nav" aria-label="دسته‌های دیگر">
        {value.categories
          .filter((v) => v.id !== id)
          .map((c) => (
            <Link href={"/category/" + c.id} key={c.id}>
              {c.name}
            </Link>
          ))}
      </nav>
    </main>
  );
}
