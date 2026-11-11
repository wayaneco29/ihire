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
    valueFormat,
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
            aria-invalid={fieldState.invalid}
            aria-labelledby={`${pickerId}-label`}
            aria-required={required}
            className="w-full"
            id={pickerId}
            onChange={(value) =>
              field.onChange(
                valueFormat && value ? value.format(valueFormat) : value,
              )
            }
            onBlur={field.onBlur}
            ref={field.ref}
            value={
              valueFormat && typeof field.value === "string"
                ? field.value
                  ? dayjs(field.value)
                  : null
                : (field.value as Dayjs | null | undefined)
            }
          />
        </FieldFrame>
      )}
    />
  );
}
