"use server";

import { revalidatePath } from "next/cache";
import { getEvaluatorContext } from "@/lib/auth/server";
import type { Json } from "@/types/database";

export async function scheduleApplicationAssessment(input: {
  applicationId: string;
  scheduledAt: string;
}): Promise<{ success: boolean; message: string }> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.applicationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.applicationId) ||
    typeof input.scheduledAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.scheduledAt) ||
    !Number.isFinite(Date.parse(input.scheduledAt)) ||
    Date.parse(input.scheduledAt) <= Date.now()
  ) {
    return {
      success: false,
      message: "Choose a valid future assessment date and time.",
    };
  }

  const evaluator = await getEvaluatorContext();
  if (!evaluator) {
    return { success: false, message: "Evaluator access is required." };
  }

  const { data: application, error: applicationError } =
    await evaluator.supabase
      .from("v_anonymized_applicants")
      .select("application_id, application_status")
      .eq("application_id", input.applicationId)
      .maybeSingle();
  if (applicationError || !application) {
    return {
      success: false,
      message: "This application is no longer available for review.",
    };
  }
  if (["ASSESSMENT_SCORED", "QUALIFIED", "NOT_QUALIFIED", "HIRED", "NOT_SELECTED", "REJECTED"].includes(application.application_status)) {
    return {
      success: false,
      message: "This assessment has already been scored or decided.",
    };
  }

  const { data: scheduled, error: scheduleError } =
    await evaluator.supabase.rpc("schedule_application_assessment", {
      p_application_id: input.applicationId,
      p_scheduled_at: input.scheduledAt,
    });
  if (scheduleError || !scheduled) {
    return {
      success: false,
      message: "The assessment could not be scheduled. Refresh and try again.",
    };
  }

  revalidatePath(`/evaluator/applications/${input.applicationId}`);
  revalidatePath("/evaluator/reviews");
  revalidatePath(`/applicant/applications/${input.applicationId}`);
  revalidatePath("/applicant/applications");
  revalidatePath("/applicant/dashboard");
  revalidatePath("/hr/dashboard");
  return { success: true, message: "Assessment schedule saved." };
}

export async function submitApplicationEvaluation(input: {
  applicationId: string;
  remarks: string;
}): Promise<{ success: boolean; message: string }> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.applicationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.applicationId) ||
    typeof input.remarks !== "string" ||
    input.remarks.length > 2000
  ) {
    return { success: false, message: "Enter a valid application evaluation." };
  }

  const evaluator = await getEvaluatorContext();
  if (!evaluator) {
    return { success: false, message: "Evaluator access is required." };
  }

  const { data: application, error: applicationError } = await evaluator.supabase
    .from("v_anonymized_applicants")
    .select("application_id, application_status, position_track, job_id")
    .eq("application_id", input.applicationId)
    .maybeSingle();
  if (applicationError || !application) {
    return { success: false, message: "This application is no longer available for review." };
  }
  if (["HIRED", "NOT_SELECTED", "REJECTED", "NOT_QUALIFIED"].includes(application.application_status)) {
    return { success: false, message: "This application already has a final hiring outcome." };
  }
  if (!["ASSESSMENT_SCORED", "QUALIFIED"].includes(application.application_status)) {
    return { success: false, message: "Submit a score for every configured criterion before making the evaluation decision." };
  }

  const [requiredTypesResult, documentsResult] = await Promise.all([
    evaluator.supabase
      .from("document_types")
      .select("name")
      .eq("is_required", true),
    evaluator.supabase
      .from("v_anonymized_documents")
      .select("document_type, document_status, uploaded_at")
      .eq("application_id", input.applicationId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (requiredTypesResult.error || documentsResult.error) {
    return { success: false, message: "Required document statuses could not be checked. Refresh and try again." };
  }

  const latestByType = new Map<string, string>();
  for (const document of documentsResult.data ?? []) {
    if (!latestByType.has(document.document_type)) {
      latestByType.set(document.document_type, document.document_status);
    }
  }
  const missingTypes = (requiredTypesResult.data ?? [])
    .filter((type) => latestByType.get(type.name) !== "VERIFIED")
    .map((type) => type.name);

  if (missingTypes.length) {
    return {
      success: false,
      message: `Required documents must be approved first: ${missingTypes.join(", ")}.`,
    };
  }

  const { error } = await evaluator.supabase.from("application_evaluations").insert({
    application_id: input.applicationId,
    evaluator_id: evaluator.user.id,
    result: "QUALIFIED",
    remarks: input.remarks.trim() || null,
  });

  if (error) {
    if (error.message.includes("All hiring slots have been filled")) {
      return {
        success: false,
        message: "All hiring slots have been filled. This application can no longer be qualified.",
      };
    }
    return { success: false, message: "The evaluation could not be saved. Refresh and try again." };
  }

  revalidatePath(`/evaluator/applications/${input.applicationId}`);
  revalidatePath("/evaluator/reviews");
  revalidatePath(`/applicant/applications/${input.applicationId}`);
  revalidatePath("/applicant/applications");
  revalidatePath("/applicant/dashboard");
  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/postings");
  revalidatePath(`/hr/postings/${application.job_id}`);
  return {
    success: true,
    message: "Applicant qualified and forwarded to HR for ranking.",
  };
}

export async function submitApplicationCriterionScores(input: {
  applicationId: string;
  scores: { criterionId: string; points: number | null }[];
}): Promise<{ success: boolean; message: string }> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.applicationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.applicationId) ||
    !Array.isArray(input.scores) ||
    input.scores.some(
      (score) =>
        !score ||
        typeof score.criterionId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(score.criterionId) ||
        typeof score.points !== "number" ||
        !Number.isFinite(score.points),
    )
  ) {
    return { success: false, message: "Enter valid criterion scores." };
  }

  const evaluator = await getEvaluatorContext();
  if (!evaluator) {
    return { success: false, message: "Evaluator access is required." };
  }

  const [applicationView, applicationResult] = await Promise.all([
    evaluator.supabase
      .from("v_anonymized_applicants")
      .select("application_id, application_status")
      .eq("application_id", input.applicationId)
      .maybeSingle(),
    evaluator.supabase
      .from("applications")
      .select("job_id, position_id")
      .eq("id", input.applicationId)
      .maybeSingle(),
  ]);
  if (
    applicationView.error ||
    applicationResult.error ||
    !applicationView.data ||
    !applicationResult.data
  ) {
    return { success: false, message: "This application is no longer available for review." };
  }
  if (["HIRED", "NOT_SELECTED", "REJECTED"].includes(applicationView.data.application_status)) {
    return { success: false, message: "This application already has a final hiring outcome." };
  }
  if (!applicationResult.data.position_id) {
    return { success: false, message: "A position must be selected before criterion scores can be entered." };
  }
  const positionId = applicationResult.data.position_id;

  const { data: jobPosition, error: jobPositionError } = await evaluator.supabase
    .from("job_posting_positions")
    .select("weight_profile_id")
    .eq("job_id", applicationResult.data.job_id)
    .eq("position_id", positionId)
    .maybeSingle();
  if (jobPositionError || !jobPosition) {
    return { success: false, message: "The scoring profile for this application could not be loaded." };
  }

  const { data: weights, error: weightsError } = await evaluator.supabase
    .from("position_criterion_weights")
    .select("criterion_id, points")
    .eq("profile_id", jobPosition.weight_profile_id);
  if (weightsError || !weights?.length) {
    return { success: false, message: "The position scoring criteria could not be loaded." };
  }
  const { data: criteria, error: criteriaError } = await evaluator.supabase
    .from("position_criteria")
    .select("id, criterion_key, title")
    .in(
      "id",
      weights.map((weight) => weight.criterion_id),
    )
    .eq("position_id", applicationResult.data.position_id)
    .order("display_order");
  if (criteriaError || !criteria?.length) {
    return { success: false, message: "The position scoring criteria could not be loaded." };
  }

  const automaticCriterionKeys = new Set(["EDUCATION", "TRAINING", "EXPERIENCE"]);
  const manualCriteria = criteria.filter((criterion) => !automaticCriterionKeys.has(criterion.criterion_key));
  const maximumByCriterion = new Map(
    weights.map((weight) => [weight.criterion_id, weight.points]),
  );
  if (
    manualCriteria.length === 0 ||
    new Set(manualCriteria.map((criterion) => criterion.criterion_key)).size !== manualCriteria.length ||
    input.scores.length !== manualCriteria.length ||
    new Set(input.scores.map((score) => score.criterionId)).size !== manualCriteria.length ||
    manualCriteria.some((criterion) => !input.scores.some((score) => score.criterionId === criterion.id))
  ) {
    return {
      success: false,
      message: "Enter points for every configured assessment criterion.",
    };
  }
  const validatedScores: { criterionId: string; points: number }[] = [];
  for (const score of input.scores) {
    const criterion = manualCriteria.find((item) => item.id === score.criterionId);
    const maximum = maximumByCriterion.get(score.criterionId);
    if (
      !criterion ||
      maximum === undefined ||
      score.points === null ||
      score.points < 0 ||
      score.points > maximum ||
      Math.abs(score.points * 100 - Math.round(score.points * 100)) >= 1e-8
    ) {
      return {
        success: false,
        message: "Each score must be between zero and its criterion maximum, using at most two decimal places.",
      };
    }
    validatedScores.push({
      criterionId: score.criterionId,
      points: score.points,
    });
  }

  const { error: saveError } = await evaluator.supabase.rpc(
    "save_application_assessment_scores",
    {
      p_application_id: input.applicationId,
      p_scores: validatedScores.map((score) => ({
        criterion_id: score.criterionId,
        points: score.points,
      })) as Json,
    },
  );
  if (saveError) {
    const message = saveError.message.includes("another evaluator")
      ? "This application already has scores from another evaluator."
      : saveError.message.includes("below the minimum total score")
        ? "The applicant is below the minimum total score and was automatically marked Not Qualified."
        : saveError.message.includes("no longer assigned")
        ? "This application is no longer assigned to you."
        : "Criterion scores could not be saved. Refresh and try again.";
    return { success: false, message };
  }

  revalidatePath(`/evaluator/applications/${input.applicationId}`);
  revalidatePath("/evaluator/reviews");
  revalidatePath("/evaluator/evaluation-schedules");
  revalidatePath(`/applicant/applications/${input.applicationId}`);
  revalidatePath("/applicant/applications");
  revalidatePath("/applicant/dashboard");
  const { data: scoredApplication } = await evaluator.supabase
    .from("v_anonymized_applicants")
    .select("application_status")
    .eq("application_id", input.applicationId)
    .maybeSingle();
  return {
    success: true,
    message: scoredApplication?.application_status === "NOT_QUALIFIED"
      ? "Criterion scores are saved. This application is marked Not Qualified."
      : "All configured criterion scores are saved. Review the completed total before qualifying the applicant.",
  };
}
