import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "section" | "article";
  tone?: "default" | "muted" | "interactive";
};

const TONE_CLASSES = {
  default: "border-line bg-panel shadow-card",
  muted: "border-line-subtle bg-panel-muted",
  interactive:
    "border-line bg-panel shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-dropdown",
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
