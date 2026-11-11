"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Upload } from "antd";
import type { UploadFile } from "antd";
import { Image as AntImage } from "antd";
import { Button } from "@/components/ui/Button";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { FieldFrame } from "./FieldFrame";
import { fieldId, type FormControlProps } from "./field-types";

type FormUploadProps<T extends FieldValues> = FormControlProps<T> & {
  accept?: string;
  disabled?: boolean;
  drag?: boolean;
  maxCount?: number;
  multiple?: boolean;
  onFileChange?: (file: File | undefined) => void;
  previewAlt?: string;
  previewName?: string;
  previewUrl?: string | null;
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
    onFileChange,
    previewAlt,
    previewName,
    previewUrl,
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
                className="rounded-sm"
                fileList={(field.value ?? []) as UploadFile[]}
                onChange={({ fileList }) => {
                  field.onChange(fileList);
                  const file = fileList[0]?.originFileObj;
                  onFileChange?.(file instanceof File ? file : undefined);
                }}
                showUploadList={!previewUrl}
              >
                <div className="flex min-h-14 items-center justify-between gap-3 px-2 text-left">
                  <div className="flex min-w-0 items-center gap-3">
                    {previewUrl ? (
                      <span className="size-12 shrink-0 overflow-hidden rounded-sm">
                        <AntImage
                          alt={previewAlt ?? "Selected file preview"}
                          className="size-12 object-cover"
                          height={48}
                          preview={false}
                          src={previewUrl}
                          width={48}
                        />
                      </span>
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary-light text-primary">
                        <InboxOutlined />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {previewUrl
                          ? previewName ?? "Selected image"
                          : "Drop a file or browse"}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {previewUrl
                          ? "Drop another file or choose a replacement"
                          : "PDF, JPG, PNG, DOC or DOCX · up to 50 MB"}
                      </span>
                    </span>
                  </div>
                  <span className="inline-flex min-h-9 shrink-0 items-center rounded-sm border border-line px-3 text-xs font-medium text-ink">
                    Choose file
                  </span>
                </div>
              </Upload.Dragger>
            ) : (
              <Upload
                {...uploadProps}
                beforeUpload={() => false}
                fileList={(field.value ?? []) as UploadFile[]}
                onChange={({ fileList }) => {
                  field.onChange(fileList);
                  const file = fileList[0]?.originFileObj;
                  onFileChange?.(file instanceof File ? file : undefined);
                }}
              >
                <Button
                  aria-describedby={
                    fieldState.error
                      ? `${uploadId}-error`
                      : hint
                        ? `${uploadId}-hint`
                        : undefined
                  }
                  aria-label={`${label}${required ? ", required" : ""}`}
                  className="min-h-11 rounded-sm px-3 text-sm font-medium"
                  disabled={uploadProps.disabled}
                  type="button"
                  variant="bordered"
                >
                  <UploadOutlined />
                  Choose file
                </Button>
              </Upload>
            )}
          </div>
        </FieldFrame>
      )}
    />
  );
}
