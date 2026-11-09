"use client";

import { Checkbox } from "antd";
import type { CheckboxOptionType } from "antd/es/checkbox";
import { Controller, type FieldValues } from "react-hook-form";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";
import { cn } from "@/utils/cn";

type FormCheckboxGroupProps<T extends FieldValues> = FormControlProps<T> & {
  options: CheckboxOptionType<string>[];
  disabled?: boolean;
  className?: string;
};

export function FormCheckboxGroup<T extends FieldValues>(
  props: FormCheckboxGroupProps<T>,
) {
  const {
    control,
    name,
    label,
    id,
    hint,
    required,
    rules,
    options,
    disabled,
    className,
  } = props;
  const inputId = fieldId(name, id);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldFrame
          error={fieldState.error?.message}
          hint={hint}
          id={inputId}
          label={label}
          required={required}
        >
          <div onBlur={field.onBlur}>
            <Checkbox.Group
              aria-describedby={
                fieldState.error
                  ? `${inputId}-error`
                  : hint
                    ? `${inputId}-hint`
                    : undefined
              }
              aria-invalid={fieldState.invalid}
              aria-required={required}
              className={cn("grid gap-2 sm:grid-cols-2", className)}
              disabled={disabled}
              name={field.name}
              onChange={(values: string[]) => field.onChange(values)}
              options={options}
              value={(field.value ?? []) as string[]}
            />
          </div>
        </FieldFrame>
      )}
    />
  );
}
