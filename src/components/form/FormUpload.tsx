"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Upload } from "antd";
import type { UploadFile } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormUploadProps<T extends FieldValues> = FormControlProps<T> & {
  accept?: string;
  disabled?: boolean;
  drag?: boolean;
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
    drag,
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
            {drag ? (
              <Upload.Dragger
                {...uploadProps}
                beforeUpload={() => false}
                className="rounded-lg"
                fileList={(field.value ?? []) as UploadFile[]}
                onChange={({ fileList }) => field.onChange(fileList)}
                showUploadList
              >
                <div className="flex min-h-14 items-center justify-between gap-3 px-2 text-left">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                      <InboxOutlined />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">Drop a file or browse</span>
                      <span className="mt-0.5 block text-xs text-muted">PDF, JPG, PNG, DOC or DOCX · up to 50 MB</span>
                    </span>
                  </div>
                  <span className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-line px-3 text-xs font-medium text-ink">
                    Choose file
                  </span>
                </div>
              </Upload.Dragger>
            ) : (
              <Upload
                {...uploadProps}
                beforeUpload={() => false}
                fileList={(field.value ?? []) as UploadFile[]}
                onChange={({ fileList }) => field.onChange(fileList)}
              >
                <button
                  aria-describedby={fieldState.error ? `${uploadId}-error` : hint ? `${uploadId}-hint` : undefined}
                  aria-label={`${label}${required ? ", required" : ""}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-panel px-3 text-sm font-medium text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={uploadProps.disabled}
                  type="button"
                >
                  <UploadOutlined />
                  Choose file
                </button>
              </Upload>
            )}
          </div>
        </FieldFrame>
      )}
    />
  );
}
