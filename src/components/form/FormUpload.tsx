"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Upload } from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormUploadProps<T extends FieldValues> = FormControlProps<T> & {
  accept?: string;
  disabled?: boolean;
  maxCount?: number;
  multiple?: boolean;
};

export function FormUpload<T extends FieldValues>(props: FormUploadProps<T>) {
  const {
    control,
    name,
    label,
    id,
    hint,
    required,
    rules,
    ...uploadProps
  } = props;
  const uploadId = fieldId(name, id);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldFrame
          error={fieldState.error?.message}
          hint={hint}
          id={uploadId}
          label={label}
          required={required}
        >
          <div aria-label={label} id={uploadId}>
            <Upload
              {...uploadProps}
              beforeUpload={() => false}
              fileList={(field.value ?? []) as UploadFile[]}
              onChange={({ fileList }) => field.onChange(fileList)}
            >
              <button
                aria-describedby={fieldState.error ? `${uploadId}-error` : hint ? `${uploadId}-hint` : undefined}
                aria-label={`Choose ${label.toLocaleLowerCase()} file`}
                aria-required={required}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={uploadProps.disabled}
                type="button"
              >
                <UploadOutlined />
                Choose file
              </button>
            </Upload>
          </div>
        </FieldFrame>
      )}
    />
  );
}
