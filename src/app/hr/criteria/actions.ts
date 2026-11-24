"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { getHrContext } from "@/lib/auth/server";
import type { Json } from "@/types/database-json";
import {
  positionSchema,
  type PositionValues,
} from "./schema";

type ActionResult = { success: boolean; message: string };

export async function saveScoringProfile(positionId: string, input: unknown): Promise<ActionResult> {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };
  const { scoringRulesSchema, scoringPublicationError } = await import("@/utils/scoring-schema");
  try {
    const rules = await scoringRulesSchema.validate(input, { abortEarly: false, stripUnknown: true });
    const issue = scoringPublicationError(rules);
    if (issue) return { success: false, message: issue };
    const { error } = await hr.supabase.rpc("save_position_scoring_profile", { p_position_id: positionId, p_rules: rules as unknown as Json });
    if (error) return { success: false, message: error.code === "22023" ? error.message : "The scoring profile could not be saved." };
    revalidatePath("/hr/criteria");
    revalidatePath("/hr/postings");
    return { success: true, message: "Scoring profile saved as a new version." };
  } catch (error) {
    return { success: false, message: error instanceof ValidationError ? error.errors[0] : "Check the scoring rules." };
  }
}

export async function createPosition(input: unknown): Promise<ActionResult> {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };

  let values: PositionValues;
  try {
    values = await positionSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? (error.errors[0] ?? "Check the position details.")
          : "Check the position details.",
    };
  }

  const applicationType =
    values.applicationType === "TEACHING" ? "teaching" : "non-teaching";
  const { data: applicationTypeData, error: applicationTypeError } =
    await hr.supabase
      .from("application_type")
      .select("id")
      .eq("name", applicationType)
      .single();

  if (applicationTypeError || !applicationTypeData) {
    return { success: false, message: "The position could not be created." };
  }

  const { error } = await hr.supabase.from("positions").insert({
    application_type_id: applicationTypeData.id,
    title: values.title,
  });

  if (error?.code === "23505") {
    return {
      success: false,
      message: "That title already exists for this application type.",
    };
  }
  if (error) {
    return { success: false, message: "The position could not be created." };
  }

  revalidatePath("/hr/criteria");
  revalidatePath("/hr/postings/new");
  revalidatePath("/hr/postings");
  return { success: true, message: "Position created." };
}
