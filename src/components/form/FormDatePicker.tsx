"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormDatePickerProps<T extends FieldValues> = FormControlProps<T> & {
  format?: string;
  showTime?: DatePickerProps["showTime"];
  placeholder?: string;
  disabled?: boolean;
  valueFormat?: string;
  popupClassName?: string;
  disabledDate?: (date: Dayjs) => boolean;
};

function toPickerValue(value: unknown): Dayjs | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (dayjs.isDayjs(value)) return value;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  ) {
    const parsedValue = dayjs(value);
    return parsedValue.isValid() ? parsedValue : null;
  }

  return null;
}

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
    valueFormat,
    disabledDate,
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
            aria-describedby={
              fieldState.error
                ? `${pickerId}-error`
                : hint
                  ? `${pickerId}-hint`
                  : undefined
            }
            disabledDate={disabledDate}
            aria-invalid={fieldState.invalid}
            status={fieldState.invalid ? "error" : undefined}
            aria-labelledby={`${pickerId}-label`}
            aria-required={required}
            className="w-full"
            size="medium"
            id={pickerId}
            onChange={(value) =>
              field.onChange(
                valueFormat && value ? value.format(valueFormat) : value,
              )
            }
            onBlur={field.onBlur}
            ref={field.ref}
            value={toPickerValue(field.value)}
          />
        </FieldFrame>
      )}
    />
  );
}
