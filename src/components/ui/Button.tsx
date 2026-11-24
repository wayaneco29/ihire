import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/utils/cn";

export type ButtonVariant =
  | "filled"
  | "bordered"
  | "ghost"
  | "danger"
  | "unstyled";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  block?: boolean;
  icon?: ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled:
    "border-primary bg-primary text-on-primary enabled:hover:bg-primary-dark",
  bordered:
    "border-line-strong bg-panel text-ink enabled:hover:border-primary enabled:hover:bg-panel-muted",
  ghost:
    "border-transparent bg-transparent text-primary enabled:hover:bg-primary-light",
  danger: "border-danger bg-transparent text-danger enabled:hover:bg-danger/10",
  unstyled: "",
};

export function Button({
  "aria-busy": ariaBusy,
  block = false,
  className,
  children,
  disabled,
  icon,
  loading = false,
  type = "button",
  variant = "filled",
  ...props
}: ButtonProps) {
  const isUnstyled = variant === "unstyled";

  return (
    <button
      className={cn(
        isUnstyled
          ? "cursor-pointer disabled:cursor-not-allowed"
          : "inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border font-semibold leading-6 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
        !isUnstyled && "min-h-11 px-4 py-2 text-base",
        VARIANT_CLASSES[variant],
        block && "w-full",
        className,
      )}
      aria-busy={loading || ariaBusy || undefined}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
