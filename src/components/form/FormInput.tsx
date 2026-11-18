"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Input } from "antd";
import type { InputProps } from "antd";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormInputProps<T extends FieldValues> = FormControlProps<T> &
  Omit<InputProps, "id" | "value" | "onChange" | "onBlur">;

export function FormInput<T extends FieldValues>(props: FormInputProps<T>) {
  const { control, name, label, id, hint, required, rules, ...inputProps } =
    props;
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
          <Input
            {...inputProps}
            aria-describedby={
              fieldState.error
                ? `${inputId}-error`
                : hint
                  ? `${inputId}-hint`
                  : undefined
            }
            aria-invalid={fieldState.invalid}
            aria-labelledby={`${inputId}-label`}
            aria-required={required}
            id={inputId}
            name={field.name}
            onBlur={field.onBlur}
            size="medium"
            onChange={field.onChange}
            ref={field.ref}
            value={(field.value ?? "") as InputProps["value"]}
          />
        </FieldFrame>
      )}
    />
  );
}
