import { useId, type HTMLAttributes, type ReactNode } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { cn } from "@/utils/cn";

type Props = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  contentClassName?: string;
  contentId?: string;
  contentPadding?: boolean;
  header?: ReactNode;
  headerClassName?: string;
  headingClassName?: string;
  headingLevel?: "h3" | "h4";
  title?: ReactNode;
  tone?: "default" | "muted" | "interactive";
};

export function PdsSectionCard({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  contentClassName,
  contentId,
  contentPadding = true,
  header,
  headerClassName,
  headingClassName,
  headingLevel = "h3",
  title,
  tone = "default",
  ...props
}: Props) {
  const generatedHeadingId = useId();
  const Heading = headingLevel;
  const hasTitle = title !== undefined && title !== null;
  const hasHeader = header !== undefined && header !== null && header !== false;
  const hasChildren =
    children !== undefined && children !== null && children !== false;

  return (
    <SurfaceCard
      as="section"
      aria-label={ariaLabel}
      aria-labelledby={
        ariaLabelledBy ?? (hasTitle ? generatedHeadingId : undefined)
      }
      className={cn("overflow-hidden", className)}
      tone={tone}
      {...props}
    >
      {hasHeader ? (
        <div className={headerClassName}>{header}</div>
      ) : hasTitle ? (
        <header
          className={cn(
            "border-b border-line-subtle px-4 py-3 sm:px-5 bg-primary-light",
            headerClassName,
          )}
        >
          <Heading
            className={cn(
              "text-base font-semibold text-primary-dark",
              headingClassName,
            )}
            id={generatedHeadingId}
          >
            {title}
          </Heading>
        </header>
      ) : null}
      {hasChildren && (
        <div
          className={cn(
            contentPadding ? "p-4 sm:p-5" : undefined,
            contentClassName,
          )}
          id={contentId}
        >
          {children}
        </div>
      )}
    </SurfaceCard>
  );
}
