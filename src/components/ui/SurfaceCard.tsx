import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "section" | "article";
  tone?: "default" | "muted" | "interactive";
};

const TONE_CLASSES = {
  default: "border-line bg-panel",
  muted: "border-line-subtle bg-panel-muted",
  interactive:
    "border-line bg-panel transition-colors hover:border-primary hover:bg-panel-muted",
} as const;

export function SurfaceCard({
  as: Component = "div",
  className,
  tone = "default",
  ...props
}: SurfaceCardProps) {
  return (
    <Component
      className={cn("rounded-sm border", TONE_CLASSES[tone], className)}
      {...props}
    />
  );
}
