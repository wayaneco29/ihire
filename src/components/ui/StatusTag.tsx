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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
