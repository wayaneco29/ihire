"use client";

import { FormRadio } from "./FormRadio";
import type { FormControlProps } from "./field-types";
import type { FieldValues } from "react-hook-form";

export function FormRadioYesNo<T extends FieldValues>(
  props: FormControlProps<T> & { disabled?: boolean },
) {
  return (
    <FormRadio
      {...props}
      options={[
        { label: "Yes", value: true },
        { label: "No", value: false },
      ]}
    />
  );
}
