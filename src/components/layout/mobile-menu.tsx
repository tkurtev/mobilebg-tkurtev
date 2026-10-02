"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { HeaderUser } from "./header-types";
import { useSignOut } from "./user-menu";

type MobileMenuProps = { categories: { slug: string; name: string }[]; user: HeaderUser | null };

const LINK = "flex h-11 items-center rounded-md px-2 text-[15px] text-ink hover:bg-subtle";

export function MobileMenu({ categories, user }: MobileMenuProps) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const signOut = useSignOut();
  // Navigating to another page closes the menu because it was opened on a different path.
  const open = openOn === pathname;

  return (
    <Dialog open={open} onOpenChange={(next) => setOpenOn(next ? pathname : null)}>
      <DialogTrigger className="flex size-10 items-center justify-center rounded-md text-ink-2 hover:bg-subtle lg:hidden" aria-label="Меню">
        <Menu className="size-5" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent title="Меню" variant="sheet" side="right" className="max-w-sm">
        <nav aria-label="Мобилно меню" className="-mx-2 space-y-5">
          <div>
            {user ? (
              <>
                <p className="px-2 pb-1 text-sm text-muted">{user.name}</p>
                <Link href="/profil" className={LINK}>Моят профил</Link>
                <Link href="/profil/obiavi" className={LINK}>Моите обяви</Link>
                <Link href="/suobshteniya" className={LINK}>
                  Съобщения
                  {user.unreadMessages > 0 ? <span className="ml-auto text-sm font-semibold text-danger">{user.unreadMessages}</span> : null}
                </Link>
                <Link href="/profil/tarseniya" className={LINK}>Запазени търсения</Link>
                <Link href="/profil/izvestiya" className={LINK}>
                  Известия
                  {user.unreadNotifications > 0 ? <span className="ml-auto text-sm font-semibold text-danger">{user.unreadNotifications}</span> : null}
                </Link>
                {user.hasDealer ? <Link href="/profil/dilar" className={LINK}>Дилърски панел</Link> : null}
                {user.isStaff ? <Link href="/admin" className={LINK}>Администрация</Link> : null}
                <Link href="/profil/nastroiki" className={LINK}>Настройки</Link>
              </>
            ) : (
              <>
                <Link href="/vhod" className={LINK}>Вход</Link>
                <Link href="/registratsiya" className={LINK}>Регистрация</Link>
              </>
            )}
            <Link href="/lyubimi" className={LINK}>Любими</Link>
          </div>
          <div className="border-t border-line pt-4">
            <p className="px-2 pb-1 text-sm text-muted">Категории</p>
            {categories.map((category) => (
              <Link key={category.slug} href={`/${category.slug}`} className={LINK}>
                {category.name}
              </Link>
            ))}
            <Link href="/dilari" className={LINK}>Дилъри</Link>
          </div>
          {user ? (
            <div className="border-t border-line pt-4">
              <button type="button" onClick={() => void signOut()} className={`${LINK} w-full text-danger`}>
                Изход
              </button>
            </div>
          ) : null}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
