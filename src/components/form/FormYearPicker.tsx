"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import dayjs from "dayjs";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormYearPickerProps<T extends FieldValues> = FormControlProps<T> & {
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
};

export function FormYearPicker<T extends FieldValues>(
  props: FormYearPickerProps<T>,
) {
  const {
    control,
    name,
    label,
    id,
    hint,
    required,
    rules,
    disabled,
    minYear,
    maxYear,
    placeholder = "Select year",
  } = props;
  const pickerId = fieldId(name, id);

  const disabledDate: DatePickerProps["disabledDate"] = (date) =>
    (minYear !== undefined && date.year() < minYear) ||
    (maxYear !== undefined && date.year() > maxYear);

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
            aria-describedby={
              fieldState.error
                ? `${pickerId}-error`
                : hint
                  ? `${pickerId}-hint`
                  : undefined
            }
            aria-invalid={fieldState.invalid}
            status={fieldState.invalid ? "error" : undefined}
            aria-labelledby={`${pickerId}-label`}
            aria-required={required}
            className="w-full"
            disabled={disabled}
            disabledDate={disabledDate}
            size="medium"
            id={pickerId}
            onBlur={field.onBlur}
            onChange={(value) => field.onChange(value?.year() ?? null)}
            picker="year"
            placeholder={placeholder}
            ref={field.ref}
            value={
              typeof field.value === "number" && Number.isInteger(field.value)
                ? dayjs(`${field.value}-01-01`)
                : null
            }
          />
        </FieldFrame>
      )}
    />
  );
}
