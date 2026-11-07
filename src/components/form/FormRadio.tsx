"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Radio } from "antd";
import type { ReactNode } from "react";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

export type FormRadioOption = {
  label: ReactNode;
  value: string | number | boolean;
  disabled?: boolean;
};

type FormRadioProps<T extends FieldValues> = FormControlProps<T> & {
  options: FormRadioOption[];
  disabled?: boolean;
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
  } = props;
  const radioId = fieldId(name, id);

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
            aria-describedby={fieldState.error ? `${radioId}-error` : hint ? `${radioId}-hint` : undefined}
            aria-invalid={fieldState.invalid}
            aria-labelledby={`${radioId}-label`}
            aria-required={required}
            disabled={disabled}
            id={radioId}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.target.value)}
            value={field.value}
          >
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {options.map((option) => (
                <Radio
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
