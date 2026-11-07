import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type StatusTagProps = {
  children: ReactNode;
  className?: string;
};

export function StatusTag({ children, className }: StatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
