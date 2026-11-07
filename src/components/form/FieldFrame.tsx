import type { ReactNode } from "react";

type FieldFrameProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function FieldFrame({
  id,
  label,
  required,
  error,
  hint,
  children,
}: FieldFrameProps) {
  return (
    <div className="mb-4 min-w-0">
      <label
        className="mb-1.5 block text-sm font-medium text-ink"
        htmlFor={id}
        id={`${id}-label`}
      >
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
      {(error || hint) && (
        <p
          className={`mt-1.5 text-xs leading-5 ${error ? "text-danger" : "text-muted"}`}
          id={error ? `${id}-error` : `${id}-hint`}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
