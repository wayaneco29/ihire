"use server";

import { revalidatePath } from "next/cache";
import { getEvaluatorContext } from "@/lib/auth/server";
import { APPLICATION_EVALUATION_RESULTS } from "./schema";

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
  if (["HIRED", "REJECTED"].includes(application.application_status)) {
    return {
      success: false,
      message: "This application already has a final hiring decision.",
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
  result: string;
  remarks: string;
}): Promise<{ success: boolean; message: string }> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.applicationId !== "string" ||
    typeof input.result !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.applicationId) ||
    !APPLICATION_EVALUATION_RESULTS.includes(input.result as (typeof APPLICATION_EVALUATION_RESULTS)[number]) ||
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
    .select("application_id, application_status")
    .eq("application_id", input.applicationId)
    .maybeSingle();
  if (applicationError || !application) {
    return { success: false, message: "This application is no longer available for review." };
  }
  if (["HIRED", "REJECTED"].includes(application.application_status)) {
    return { success: false, message: "This application already has a final hiring decision." };
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
    result: input.result,
    remarks: input.remarks.trim() || null,
  });

  if (error) {
    return { success: false, message: "The evaluation could not be saved. Refresh and try again." };
  }

  revalidatePath(`/evaluator/applications/${input.applicationId}`);
  revalidatePath("/evaluator/reviews");
  return { success: true, message: "Application evaluation saved." };
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
  if (["HIRED", "REJECTED"].includes(applicationView.data.application_status)) {
    return { success: false, message: "This application already has a final hiring decision." };
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
    .in("criterion_key", ["CLASSROOM_OBSERVATION", "TEACHER_REFLECTION"]);
  if (criteriaError || !criteria?.length) {
    return { success: false, message: "The position scoring criteria could not be loaded." };
  }

  if (
    criteria.some(
      (criterion) => !["CLASSROOM_OBSERVATION", "TEACHER_REFLECTION"].includes(criterion.criterion_key),
    )
  ) {
    return { success: false, message: "The position scoring criteria are invalid." };
  }
  const maximumByCriterion = new Map(
    weights.map((weight) => [weight.criterion_id, weight.points]),
  );
  if (
    criteria.length !== 2 ||
    input.scores.length !== 2 ||
    new Set(input.scores.map((score) => score.criterionId)).size !== 2 ||
    criteria.some((criterion) => !input.scores.some((score) => score.criterionId === criterion.id))
  ) {
    return {
      success: false,
      message: "Enter both demo teaching and teaching reflection form points.",
    };
  }
  const validatedScores: { criterionId: string; points: number }[] = [];
  for (const score of input.scores) {
    const criterion = criteria.find((item) => item.id === score.criterionId);
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

  for (const score of validatedScores) {
    const { error: saveError } = await evaluator.supabase.rpc(
      "save_application_criterion_score",
      {
        p_application_id: input.applicationId,
        p_criterion_id: score.criterionId,
        p_points: score.points,
      },
    );
    if (!saveError) continue;
    const message = saveError.message.includes("another evaluator")
      ? "This application already has scores from another evaluator."
      : saveError.message.includes("no longer assigned")
        ? "This application is no longer assigned to you."
        : "Criterion scores could not be saved. Refresh and try again.";
    return { success: false, message };
  }

  revalidatePath(`/evaluator/applications/${input.applicationId}`);
  revalidatePath("/evaluator/reviews");
  revalidatePath("/evaluator/demo-teaching");
  return { success: true, message: "Criterion scores saved." };
}
