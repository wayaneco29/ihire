"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button } from "antd";
import { useForm, type Resolver } from "react-hook-form";
import { FormInput, FormSelect, FormTextArea } from "@/components/form";
import { createJobPosting, updateJobPosting } from "../actions";
import { postingSchema } from "../schema";

type Values = {
  title: string;
  description: string;
  requirements: string;
  slots: number;
  deadline: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
};

type PostingSeed = Values & { id: string };

export function PostingForm({ posting }: Readonly<{ posting?: PostingSeed }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: yupResolver(postingSchema) as Resolver<Values>,
    defaultValues: posting
      ? {
          title: posting.title,
          description: posting.description,
          requirements: posting.requirements,
          slots: posting.slots,
          deadline: "",
          status: posting.status,
        }
      : {
          title: "",
          description: "",
          requirements: "",
          slots: 1,
          deadline: "",
          status: "DRAFT",
        },
  });

  useEffect(() => {
    if (!posting?.deadline) return;
    const date = new Date(posting.deadline);
    if (!Number.isFinite(date.getTime())) return;
    const localValue = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 16);
    reset({ ...posting, deadline: localValue });
  }, [posting, reset]);

  const submit = handleSubmit(async (values) => {
    setError(null);
    setMessage(null);
    const payload = {
      ...values,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : "",
    };
    const result = posting
      ? await updateJobPosting(posting.id, payload)
      : await createJobPosting(payload);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    router.refresh();
    router.push(posting ? `/hr/postings/${posting.id}` : "/hr/postings");
  });

  return (
    <form
      className="mt-7 max-w-3xl space-y-5 rounded-sm border border-line bg-panel p-5 sm:p-7"
      onSubmit={submit}
    >
      <FormInput
        autoComplete="off"
        control={control}
        label="Job title"
        maxLength={160}
        name="title"
        required
      />
      <FormTextArea
        control={control}
        label="Description"
        maxLength={10000}
        name="description"
        required
        rows={6}
        showCount
      />
      <FormTextArea
        control={control}
        hint="Include qualifications and supporting details for applicants."
        label="Requirements"
        maxLength={10000}
        name="requirements"
        rows={5}
        showCount
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormInput
          control={control}
          label="Available slots"
          max={10000}
          min={1}
          name="slots"
          required
          step={1}
          type="number"
        />
        <FormInput
          control={control}
          hint="Leave blank for no deadline."
          label="Application deadline"
          name="deadline"
          type="datetime-local"
        />
      </div>
      <FormSelect
        control={control}
        label="Posting status"
        name="status"
        options={[
          { label: "Draft", value: "DRAFT" },
          { label: "Open for applications", value: "OPEN" },
          { label: "Closed", value: "CLOSED" },
        ]}
        required
      />
      {error && <Alert message={error} showIcon type="error" />}
      {message && <Alert message={message} showIcon type="success" />}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button htmlType="submit" loading={isSubmitting} type="primary">
          {posting ? "Save changes" : "Create posting"}
        </Button>
        <Button
          disabled={isSubmitting}
          href={posting ? `/hr/postings/${posting.id}` : "/hr/postings"}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
