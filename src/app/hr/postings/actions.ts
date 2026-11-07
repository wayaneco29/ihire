"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { getHrContext } from "@/lib/auth/server";
import { postingSchema } from "./schema";

type ActionResult = { success: boolean; message: string };

function validationMessage(error: unknown) {
  return error instanceof ValidationError
    ? error.errors[0] ?? "Check the posting details."
    : "Check the posting details.";
}

async function validateCapacity(
  supabase: NonNullable<Awaited<ReturnType<typeof getHrContext>>>["supabase"],
  jobId: string,
  slots: number,
  status: string,
  deadline: string,
) {
  const { data: applications, error } = await supabase
    .from("v_anonymized_applicants")
    .select("application_status")
    .eq("job_id", jobId);

  if (error) {
    return "Application capacity could not be checked. Refresh and try again.";
  }

  const hiredCount = (applications ?? []).filter(
    (application) => application.application_status === "HIRED",
  ).length;
  if (slots < hiredCount) {
    return `Slots cannot be lower than the ${hiredCount} applicants already hired.`;
  }
  if (status === "OPEN" && hiredCount >= slots) {
    return "All slots are filled. Increase the slot count before reopening this posting.";
  }
  if (status === "OPEN" && deadline && Date.parse(deadline) <= Date.now()) {
    return "An expired posting cannot be opened. Choose a future deadline or clear it.";
  }
  return null;
}

async function parseInput(input: unknown) {
  try {
    return await postingSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    throw new Error(validationMessage(error));
  }
}

function deadlineIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export async function createJobPosting(input: unknown): Promise<ActionResult> {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };

  let values;
  try {
    values = await parseInput(input);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Check the posting details." };
  }

  if (values.status === "OPEN" && values.deadline && Date.parse(values.deadline) <= Date.now()) {
    return { success: false, message: "An expired posting cannot be opened." };
  }

  const { error } = await hr.supabase.from("job_postings").insert({
    hr_id: hr.user.id,
    title: values.title,
    description: values.description,
    requirements: values.requirements || null,
    slots: values.slots,
    status: values.status,
    deadline: deadlineIso(values.deadline),
  });

  if (error) {
    return { success: false, message: "The posting could not be created. Check its details and status." };
  }

  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath("/applicant/jobs");
  return { success: true, message: "Job posting created." };
}

export async function updateJobPosting(
  jobId: string,
  input: unknown,
): Promise<ActionResult> {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return { success: false, message: "This job posting is not available." };
  }

  let values;
  try {
    values = await parseInput(input);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Check the posting details." };
  }

  const capacityMessage = await validateCapacity(
    hr.supabase,
    jobId,
    values.slots,
    values.status,
    values.deadline,
  );
  if (capacityMessage) return { success: false, message: capacityMessage };

  const { data, error } = await hr.supabase
    .from("job_postings")
    .update({
      title: values.title,
      description: values.description,
      requirements: values.requirements || null,
      slots: values.slots,
      status: values.status,
      deadline: deadlineIso(values.deadline),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "The posting could not be updated. Refresh and try again." };
  }

  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath(`/hr/postings/${jobId}`);
  revalidatePath("/applicant/jobs");
  return { success: true, message: "Job posting updated." };
}
