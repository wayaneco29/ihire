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
        "inline-flex min-h-8 max-w-full items-center rounded-sm border px-2.5 py-1 text-xs font-medium leading-5",
        className,
      )}
    >
      {children}
    </span>
  );
}
