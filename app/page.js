import Link from "next/link";
import { content } from "../lib/store.mjs";
import { Title } from "./ui";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { value } = await content();
  return (
    <main>
      <Title>منوی غذا</Title>
      <div className="category-grid">
        {value.categories.map((c, i) => (
          <Link className="category-card" href={"/category/" + c.id} key={c.id}>
            <img
              src={c.image}
              alt={c.name}
              width="380"
              height="225"
              loading={i < 2 ? "eager" : "lazy"}
            />
            <div>
              <h2>{c.name}</h2>
              <span aria-hidden="true">‹</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
