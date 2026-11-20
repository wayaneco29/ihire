"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Upload } from "antd";
import type { UploadFile } from "antd";
import { Image as AntImage } from "antd";
import { Button } from "@/components/ui/Button";
import {
  FileOutlined,
  FilePdfOutlined,
  InboxOutlined,
  UploadOutlined,
} from "@ant-design/icons";
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
  previewFile?: boolean;
  previewName?: string;
  previewUrl?: string | null;
};

function middleEllipsis(value: string, maxLength = 32) {
  if (value.length <= maxLength) return value;

  const dot = value.lastIndexOf(".");
  const extension = dot > 0 ? value.slice(dot) : "";
  const stem = extension ? value.slice(0, dot) : value;
  const available = maxLength - extension.length - 3;
  const startLength = Math.ceil(available / 2);
  const endLength = Math.floor(available / 2);

  return `${stem.slice(0, startLength)}...${stem.slice(-endLength)}${extension}`;
}

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
    previewFile,
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
                showUploadList={!previewUrl && !previewFile}
              >
                <div className="flex min-h-14 items-center justify-between gap-3 px-2 text-left">
                  <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
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
                    ) : previewFile ? (
                      <span
                        aria-label="File preview"
                        className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-danger/10 text-danger"
                      >
                        {previewName?.toLowerCase().endsWith(".pdf") ? (
                          <FilePdfOutlined className="text-2xl" />
                        ) : (
                          <FileOutlined className="text-2xl" />
                        )}
                      </span>
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary-light text-primary">
                        <InboxOutlined />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span
                        className="block whitespace-nowrap text-sm font-medium text-ink"
                        title={previewName}
                      >
                        {previewUrl || previewFile
                          ? previewName
                            ? middleEllipsis(previewName)
                            : "Selected image"
                          : "Drop a file or browse"}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {previewUrl || previewFile
                          ? "Drop another file or choose a replacement"
                          : "PDF, JPG, PNG, DOC or DOCX · up to 50 MB"}
                      </span>
                    </span>
                  </div>
                  <span className="inline-flex min-h-11 shrink-0 items-center rounded-[8px] border border-line px-4 text-sm font-semibold text-ink">
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
