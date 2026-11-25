"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { getHrContext } from "@/lib/auth/server";
import type { Json } from "@/types/database-json";
import { scoringPublicationError } from "@/utils/scoring-schema";
import { serializeRequirements } from "@/utils/job-requirements";
import { postingSchema, type HiringTrack } from "./schema";

type ActionResult = { success: boolean; message: string; jobId?: string };

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

async function validateHiringTrack(
  supabase: NonNullable<Awaited<ReturnType<typeof getHrContext>>>["supabase"],
  positionIds: string[],
  hiringTrack: HiringTrack,
  archivedPositionIds: string[] = [],
) {
  const applicationTypeName =
    hiringTrack === "TEACHING" ? "teaching" : "non-teaching";
  const { data: applicationType, error: applicationTypeError } = await supabase
    .from("application_type")
    .select("id")
    .eq("name", applicationTypeName)
    .single();
  if (applicationTypeError || !applicationType) {
    return "The selected positions could not be verified. Refresh and try again.";
  }

  const { data: positions, error } = await supabase
    .from("positions")
    .select("id, application_type_id, is_active")
    .in("id", positionIds);

  if (error) {
    return "The selected positions could not be verified. Refresh and try again.";
  }
  const archivedPositionAllowlist = new Set(archivedPositionIds);
  if (
    !positions ||
    positions.length !== positionIds.length ||
    positions.some(
      (position) =>
        position.application_type_id !== applicationType.id ||
        (!position.is_active && !archivedPositionAllowlist.has(position.id)),
    )
  ) {
    return "Select active positions that match the chosen hiring type. Existing archived positions may stay on this posting.";
  }
  return null;
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

  const hiringTrackMessage = await validateHiringTrack(
    hr.supabase,
    values.positionIds,
    values.hiringTrack,
  );
  if (hiringTrackMessage) {
    return { success: false, message: hiringTrackMessage };
  }

  if (values.status === "OPEN" && values.deadline && Date.parse(values.deadline) <= Date.now()) {
    return { success: false, message: "An expired posting cannot be opened." };
  }

  if (values.status !== "DRAFT") {
    for (const entry of values.scoring) {
      const issue = scoringPublicationError(entry.rules);
      if (issue) return { success: false, message: issue };
    }
  }

  const { data, error } = await hr.supabase.rpc("save_scored_posting", {
    p_job_id: null,
    p_title: values.title,
    p_description: values.description,
    p_requirements: serializeRequirements(values.requirements),
    p_slots: values.slots,
    p_status: values.status,
    p_deadline: deadlineIso(values.deadline),
    p_position_ids: values.positionIds,
    p_scoring: values.scoring as unknown as Json,
  });

  if (error || !data) {
    return { success: false, message: error?.code === "22023" ? error.message : "The posting could not be created. Check its details and status." };
  }

  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath("/applicant/jobs");
  revalidatePath("/applicant/jobs/" + data);
  return { success: true, message: "Job posting created.", jobId: data };
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

  const { data: currentPositionLinks, error: currentPositionLinksError } =
    await hr.supabase
      .from("job_posting_positions")
      .select("position_id")
      .eq("job_id", jobId);
  if (currentPositionLinksError) {
    return {
      success: false,
      message: "The current positions could not be checked. Refresh and try again.",
    };
  }

  const hiringTrackMessage = await validateHiringTrack(
    hr.supabase,
    values.positionIds,
    values.hiringTrack,
    (currentPositionLinks ?? []).map((link) => link.position_id),
  );
  if (hiringTrackMessage) {
    return { success: false, message: hiringTrackMessage };
  }

  const capacityMessage = await validateCapacity(
    hr.supabase,
    jobId,
    values.slots,
    values.status,
    values.deadline,
  );
  if (capacityMessage) return { success: false, message: capacityMessage };

  if (values.status !== "DRAFT") {
    for (const entry of values.scoring) {
      const issue = scoringPublicationError(entry.rules);
      if (issue) return { success: false, message: issue };
    }
  }

  const { data, error } = await hr.supabase.rpc(
    "save_scored_posting",
    {
      p_job_id: jobId,
      p_title: values.title,
      p_description: values.description,
      p_requirements: serializeRequirements(values.requirements),
      p_slots: values.slots,
      p_status: values.status,
      p_deadline: deadlineIso(values.deadline),
      p_position_ids: values.positionIds,
      p_scoring: values.scoring as unknown as Json,
    },
  );

  if (error || !data) {
    return { success: false, message: error?.code === "22023" ? error.message : "The posting could not be updated. Refresh and try again." };
  }

  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath(`/hr/postings/${jobId}`);
  revalidatePath("/applicant/jobs");
  revalidatePath("/applicant/jobs/" + jobId);
  return { success: true, message: "Job posting updated.", jobId: data };
}
