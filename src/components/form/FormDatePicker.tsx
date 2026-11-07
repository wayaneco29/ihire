"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormDatePickerProps<T extends FieldValues> = FormControlProps<T> & {
  format?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function FormDatePicker<T extends FieldValues>(
  props: FormDatePickerProps<T>,
) {
  const {
    control,
    name,
    label,
    id,
    hint,
    required,
    rules,
    ...pickerProps
  } = props;
  const pickerId = fieldId(name, id);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldFrame
          error={fieldState.error?.message}
          hint={hint}
          id={pickerId}
          label={label}
          required={required}
        >
          <DatePicker
            {...pickerProps}
            aria-describedby={fieldState.error ? `${pickerId}-error` : hint ? `${pickerId}-hint` : undefined}
            aria-invalid={fieldState.invalid}
            aria-labelledby={`${pickerId}-label`}
            aria-required={required}
            className="w-full"
            id={pickerId}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            value={field.value as Dayjs | null | undefined}
          />
        </FieldFrame>
      )}
    />
  );
}
