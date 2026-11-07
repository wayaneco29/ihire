"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import type { UploadFile } from "antd";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FormUpload } from "@/components/form/FormUpload";
import { documentUploadSchema, type DocumentUploadValues } from "../schema";
import { uploadApplicantDocument } from "../actions";

const ACCEPTED_FILES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

export function DocumentUploadForm({ documentTypeId }: { documentTypeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<DocumentUploadValues>({
    resolver: yupResolver(documentUploadSchema),
    defaultValues: { files: [] },
  });

  function submit(values: DocumentUploadValues) {
    setMessage(null);
    const uploadFile = values.files[0]?.originFileObj as File | undefined;
    if (!uploadFile) {
      setMessage("Choose a document file.");
      return;
    }

    const formData = new FormData();
    formData.set("document_type_id", documentTypeId);
    formData.set("file", uploadFile);
    startTransition(async () => {
      const result = await uploadApplicantDocument(formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      form.reset({ files: [] as UploadFile[] });
      setMessage(`Version ${result.version} uploaded and sent for review.`);
      router.refresh();
    });
  }

  return (
    <form className="mt-4 border-t border-slate-100 pt-4" onSubmit={form.handleSubmit(submit)}>
      <FormUpload
        accept={ACCEPTED_FILES}
        control={form.control}
        hint="PDF, JPG, PNG, DOC, or DOCX · 50 MB maximum"
        label="Choose a file"
        maxCount={1}
        name="files"
      />
      <button
        className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Uploading…" : "Upload document"}
      </button>
      {message && <p className="mt-3 text-sm text-muted" role="status">{message}</p>}
    </form>
  );
}
