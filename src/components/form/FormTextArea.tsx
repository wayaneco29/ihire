"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Input } from "antd";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormTextAreaProps<T extends FieldValues> = FormControlProps<T> & {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  showCount?: boolean;
};

export function FormTextArea<T extends FieldValues>(
  props: FormTextAreaProps<T>,
) {
  const { control, name, label, id, hint, required, rules, ...textAreaProps } =
    props;
  const textAreaId = fieldId(name, id);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldFrame
          error={fieldState.error?.message}
          hint={hint}
          id={textAreaId}
          label={label}
          required={required}
        >
          <Input.TextArea
            {...textAreaProps}
            aria-describedby={
              fieldState.error
                ? `${textAreaId}-error`
                : hint
                  ? `${textAreaId}-hint`
                  : undefined
            }
            aria-invalid={fieldState.invalid}
            aria-labelledby={`${textAreaId}-label`}
            aria-required={required}
            id={textAreaId}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            value={(field.value ?? "") as string}
          />
        </FieldFrame>
      )}
    />
  );
}
