"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Radio } from "antd";
import type { ReactNode } from "react";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

export type FormRadioOption = {
  label?: ReactNode;
  value: string | number | boolean;
  disabled?: boolean;
};

type FormRadioProps<T extends FieldValues> = FormControlProps<T> & {
  options: FormRadioOption[];
  disabled?: boolean;
  layout?: "inline" | "cards";
  className?: string;
};

export function FormRadio<T extends FieldValues>(props: FormRadioProps<T>) {
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
    layout = "inline",
    className = "",
  } = props;
  const radioId = fieldId(name, id);
  const cardLayout = layout === "cards";

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldFrame
          error={fieldState.error?.message}
          hint={hint}
          id={radioId}
          label={label}
          required={required}
        >
          <Radio.Group
            aria-describedby={
              fieldState.error
                ? `${radioId}-error`
                : hint
                  ? `${radioId}-hint`
                  : undefined
            }
            aria-invalid={fieldState.invalid}
            aria-labelledby={`${radioId}-label`}
            aria-required={required}
            disabled={disabled}
            id={radioId}
            className={className}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.target.value)}
            value={field.value}
          >
            <div
              className={
                cardLayout ? "grid gap-2" : "flex flex-wrap gap-x-5 gap-y-2"
              }
            >
              {options.map((option) => (
                <Radio
                  className={
                    cardLayout
                      ? "m-0! flex min-h-10 w-full items-center! rounded-sm border border-line-subtle bg-panel-muted/40 px-3 py-2.5 transition-colors [&.ant-radio-wrapper-checked]:border-primary [&.ant-radio-wrapper-checked]:bg-primary-light"
                      : "min-h-11 items-center!"
                  }
                  disabled={option.disabled}
                  key={String(option.value)}
                  value={option.value}
                >
                  {option.label}
                </Radio>
              ))}
            </div>
          </Radio.Group>
        </FieldFrame>
      )}
    />
  );
}
