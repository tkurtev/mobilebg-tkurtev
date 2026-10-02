import Link from "next/link";
import { getActiveCategories } from "@/features/catalog/queries";
import { Wordmark } from "./logo";

export async function SiteFooter() {
  const categories = await getActiveCategories();
  const year = new Date().getFullYear();
  const column = "space-y-2 text-sm";
  const link = "text-ink-2 hover:text-ink hover:underline";

  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-muted">Обяви за автомобили и техника в България. Всички цени са в евро.</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Категории</h2>
          <ul className={`${column} columns-2 gap-4`}>
            {categories.map((category) => (
              <li key={category.slug} className="break-inside-avoid">
                <Link href={`/${category.slug}`} className={link}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Профил</h2>
          <ul className={column}>
            <li><Link href="/publikuvai" className={link}>Публикувай обява</Link></li>
            <li><Link href="/profil/obiavi" className={link}>Моите обяви</Link></li>
            <li><Link href="/lyubimi" className={link}>Любими</Link></li>
            <li><Link href="/profil/tarseniya" className={link}>Запазени търсения</Link></li>
            <li><Link href="/suobshteniya" className={link}>Съобщения</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">MobiTed</h2>
          <ul className={column}>
            <li><Link href="/dilari" className={link}>Дилъри</Link></li>
            <li><Link href="/profil/dilar/nov" className={link}>Регистрация на дилър</Link></li>
            <li><Link href="/usloviya" className={link}>Условия за ползване</Link></li>
            <li><Link href="/poveritelnost" className={link}>Поверителност</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-4 text-sm text-muted">© {year} MobiTed</p>
      </div>
    </footer>
  );
}
