"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Checkbox } from "antd";
import { fieldId, type FormControlProps } from "./field-types";

export function FormCheckbox<T extends FieldValues>(
  props: FormControlProps<T> & { disabled?: boolean },
) {
  const { control, name, label, id, hint, required, rules, disabled } = props;
  const checkboxId = fieldId(name, id);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className="mb-4 min-w-0">
          <Checkbox
            aria-describedby={fieldState.error ? `${checkboxId}-error` : hint ? `${checkboxId}-hint` : undefined}
            aria-invalid={fieldState.invalid}
            aria-required={required}
            checked={Boolean(field.value)}
            disabled={disabled}
            id={checkboxId}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.target.checked)}
          >
            <span className="text-sm font-medium text-ink">
              {label}
              {required && <span className="ml-1 text-danger">*</span>}
            </span>
          </Checkbox>
          {(fieldState.error?.message || hint) && (
            <p
              className={`mt-1.5 text-xs leading-5 ${fieldState.error ? "text-danger" : "text-muted"}`}
              id={fieldState.error ? `${checkboxId}-error` : `${checkboxId}-hint`}
              role={fieldState.error ? "alert" : undefined}
            >
              {fieldState.error?.message ?? hint}
            </p>
          )}
        </div>
      )}
    />
  );
}
