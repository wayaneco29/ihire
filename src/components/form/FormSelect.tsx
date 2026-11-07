"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Select } from "antd";
import type { SelectProps } from "antd";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormSelectProps<T extends FieldValues> = FormControlProps<T> & {
  options: NonNullable<SelectProps["options"]>;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showSearch?: boolean;
};

export function FormSelect<T extends FieldValues>(props: FormSelectProps<T>) {
  const {
    control,
    name,
    label,
    id,
    hint,
    required,
    rules,
    ...selectProps
  } = props;
  const selectId = fieldId(name, id);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldFrame
          error={fieldState.error?.message}
          hint={hint}
          id={selectId}
          label={label}
          required={required}
        >
          <Select
            {...selectProps}
            aria-describedby={fieldState.error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            aria-invalid={fieldState.invalid}
            aria-labelledby={`${selectId}-label`}
            aria-required={required}
            className="w-full"
            id={selectId}
            onBlur={field.onBlur}
            onChange={field.onChange}
            options={selectProps.options}
            value={field.value as SelectProps["value"]}
          />
        </FieldFrame>
      )}
    />
  );
}
