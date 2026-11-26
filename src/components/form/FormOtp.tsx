"use client";

import { Input } from "antd";
import { Controller, type FieldValues } from "react-hook-form";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

export function FormOtp<T extends FieldValues>({ control, name, label, id, hint, required, rules, disabled }: FormControlProps<T> & { disabled?: boolean }) {
  const inputId = fieldId(name, id);
  return (
    <Controller control={control} name={name} rules={rules} render={({ field, fieldState }) => (
      <FieldFrame id={inputId} label={label} required={required} hint={hint} error={fieldState.error?.message}>
        <Input.OTP
          id={inputId} ref={field.ref} length={6} autoFocus autoComplete="one-time-code" inputMode="numeric"
          formatter={(value) => value.replace(/[^\d ]/g, "")} disabled={disabled}
          value={field.value ?? ""}
          onInput={(digits) => field.onChange(digits.map((digit) => digit || " ").join(""))}
          onBlur={field.onBlur}
          status={fieldState.invalid ? "error" : undefined} aria-invalid={fieldState.invalid}
          aria-labelledby={`${inputId}-label`} aria-describedby={fieldState.error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          classNames={{
            root: "grid! w-full! grid-cols-6 gap-2 [&>.ant-otp-input-wrapper]:min-w-0 [&>.ant-otp-input-wrapper]:w-full",
            input: "h-12 w-full! min-w-0 text-center text-xl",
          }}
        />
      </FieldFrame>
    )} />
  );
}
