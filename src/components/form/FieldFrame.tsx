import type { ReactNode } from "react";

type FieldFrameProps = {
  id: string;
  label?: string;
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
    <div className="min-w-0">
      {label && (
        <label
          className="mb-2 block text-base font-medium text-ink"
          htmlFor={id}
          id={`${id}-label`}
        >
          {label}
          {required && (
            <span className="ml-1 text-xs font-normal text-red-500">*</span>
          )}
        </label>
      )}
      {children}
      {(error || hint) && (
        <p
          className={`mt-2 text-xs leading-6 ${error ? "text-danger" : "text-muted"}`}
          id={error ? `${id}-error` : `${id}-hint`}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
