"use client";

import { Bell, ChevronDown, CreditCard, FileText, LogOut, Search, Settings, Shield, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuButton,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuLink,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/text";
import type { HeaderUser } from "./header-types";

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };
}

export function UserMenu({ user }: { user: HeaderUser }) {
  const signOut = useSignOut();
  const icon = "size-4 text-muted";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 items-center gap-2 rounded-md px-1.5 text-sm text-ink-2 hover:bg-subtle hover:text-ink data-[state=open]:bg-subtle">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-ink">
          {initials(user.name)}
          {user.unreadNotifications > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-danger" aria-hidden="true" />
          ) : null}
        </span>
        <span className="hidden max-w-32 truncate xl:inline">{user.name}</span>
        <ChevronDown className="hidden size-4 xl:inline" aria-hidden="true" />
        <span className="sr-only">Меню на профила</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuLink href="/profil">
          <User className={icon} aria-hidden="true" /> Моят профил
        </DropdownMenuLink>
        <DropdownMenuLink href="/profil/obiavi">
          <FileText className={icon} aria-hidden="true" /> Моите обяви
        </DropdownMenuLink>
        <DropdownMenuLink href="/profil/tarseniya">
          <Search className={icon} aria-hidden="true" /> Запазени търсения
        </DropdownMenuLink>
        <DropdownMenuLink href="/profil/izvestiya">
          <Bell className={icon} aria-hidden="true" /> Известия
          {user.unreadNotifications > 0 ? <span className="ml-auto text-sm font-semibold text-danger tabular">{user.unreadNotifications}</span> : null}
        </DropdownMenuLink>
        <DropdownMenuLink href="/profil/plashtaniya">
          <CreditCard className={icon} aria-hidden="true" /> Плащания
        </DropdownMenuLink>
        {user.hasDealer ? (
          <DropdownMenuLink href="/profil/dilar">
            <Store className={icon} aria-hidden="true" /> Дилърски панел
          </DropdownMenuLink>
        ) : null}
        {user.isStaff ? (
          <DropdownMenuLink href="/admin">
            <Shield className={icon} aria-hidden="true" /> Администрация
          </DropdownMenuLink>
        ) : null}
        <DropdownMenuLink href="/profil/nastroiki">
          <Settings className={icon} aria-hidden="true" /> Настройки
        </DropdownMenuLink>
        <DropdownMenuSeparator />
        <DropdownMenuButton onSelect={() => void signOut()}>
          <LogOut className={icon} aria-hidden="true" /> Изход
        </DropdownMenuButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

