"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ children, className, align = "end" }: { children: ReactNode; className?: string; align?: "start" | "end" }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-52 rounded-lg border border-line bg-surface p-1 shadow-md data-[state=open]:animate-fade-in", className)}
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

const ITEM = "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[15px] text-ink outline-none data-[highlighted]:bg-subtle";

export function DropdownMenuLink({ href, children, className }: { href: ComponentProps<typeof Link>["href"]; children: ReactNode; className?: string }) {
  return (
    <Menu.Item asChild>
      <Link href={href} className={cn(ITEM, className)}>
        {children}
      </Link>
    </Menu.Item>
  );
}

export function DropdownMenuButton({ onSelect, children, className }: { onSelect: () => void; children: ReactNode; className?: string }) {
  return (
    <Menu.Item onSelect={onSelect} className={cn(ITEM, className)}>
      {children}
    </Menu.Item>
  );
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-line" />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-2.5 py-1.5 text-sm text-muted">{children}</Menu.Label>;
}
