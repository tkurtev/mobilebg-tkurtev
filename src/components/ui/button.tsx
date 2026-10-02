import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover border border-brand hover:border-brand-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-subtle",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-subtle hover:text-ink",
  danger: "bg-surface text-danger border border-line-strong hover:bg-danger-soft hover:border-danger",
  link: "bg-transparent text-brand border-0 underline-offset-2 hover:underline px-0 h-auto",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-[15px] gap-2",
  lg: "h-12 px-5 text-base gap-2",
  icon: "h-10 w-10 p-0",
};

export function buttonClasses(options: { variant?: Variant; size?: Size; className?: string } = {}): string {
  const { variant = "primary", size = "md", className } = options;
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
    VARIANTS[variant],
    variant === "link" ? "" : SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; pending?: boolean; icon?: ReactNode };

export function Button({ variant, size, pending = false, icon, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function ButtonLink({ variant, size, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}
