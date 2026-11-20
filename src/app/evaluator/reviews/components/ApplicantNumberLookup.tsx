"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form/FormInput";
import { Button } from "@/components/ui/Button";
import {
  applicantNumberLookupSchema,
  type ApplicantNumberLookupValues,
} from "../schema";

export function ApplicantNumberLookup({
  initialApplicantNumber = "",
  searchPath = "/evaluator/reviews",
}: {
  initialApplicantNumber?: string;
  searchPath?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ApplicantNumberLookupValues>({
    resolver: yupResolver(applicantNumberLookupSchema),
    defaultValues: { applicantNumber: initialApplicantNumber },
  });

  function submit(values: ApplicantNumberLookupValues) {
    const applicantNumber = encodeURIComponent(values.applicantNumber);
    startTransition(() => {
      router.push(`${searchPath}?applicantNumber=${applicantNumber}`);
    });
  }

  return (
    <form
      className="mt-5 flex flex-wrap items-end gap-3 rounded-sm border border-line bg-panel p-4"
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="min-w-60 flex-1">
        <FormInput
          control={form.control}
          label="Find applicant by ID"
          name="applicantNumber"
          placeholder="e.g. APP-0001"
          required
          size="medium"
        />
      </div>
      <Button disabled={pending} type="submit" variant="filled">
        {pending ? "Searching…" : "Find applicant"}
      </Button>
    </form>
  );
}
