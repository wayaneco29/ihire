"use server";

import { revalidatePath } from "next/cache";
import * as yup from "yup";
import { ValidationError } from "yup";
import { getHrContext } from "@/lib/auth/server";
import {
  positionSchema,
  positionActiveSchema,
  positionScoringStandardsSchema,
  positionWeightsSchema,
  type PositionActiveValues,
  type PositionScoringStandardsValues,
  type PositionValues,
} from "./schema";

type ActionResult = { success: boolean; message: string };

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

function positionUpdateErrorMessage(error: { code: string; message: string }) {
  return error.code === "23505"
    ? "A position with that title already exists for this hiring type."
    : error.message.includes("cannot be renamed")
      ? error.message
      : error.code === "P0002"
        ? "This position is unavailable. Refresh and try again."
        : "The position could not be updated. Refresh and try again.";
}

export async function savePositionWeights(
  positionId: string,
  input: unknown,
): Promise<ActionResult> {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };
  if (!/^[0-9a-f-]{36}$/i.test(positionId)) {
    return { success: false, message: "This position is unavailable." };
  }

  let values: { criterionIds: string[]; weights: number[] };
  try {
    values = await yup
      .object({
        criterionIds: yup.array().of(yup.string().uuid().required()).required(),
        weights: positionWeightsSchema,
      })
      .test(
        "matching-lengths",
        "A weight is required for every criterion.",
        (value) => value?.criterionIds?.length === value?.weights?.length,
      )
      .validate(input, { abortEarly: false, stripUnknown: true });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? (error.errors[0] ?? "Enter weights that total exactly 100 points.")
          : "Enter weights that total exactly 100 points.",
    };
  }

  const { error } = await hr.supabase.rpc("save_position_weight_profile", {
    p_position_id: positionId,
    p_weights: values.weights.map((points, index) => ({
      criterion_id: values.criterionIds[index],
      points,
    })),
  });

  if (error) {
    return {
      success: false,
      message:
        error.code === "22023"
          ? error.message
          : "The weight profile could not be saved. Refresh and try again.",
    };
  }

  revalidatePath("/hr/criteria");
  revalidatePath("/hr/postings");
  return { success: true, message: "Weight profile saved and versioned." };
}

export async function savePositionScoringStandards(
  positionId: string,
  input: unknown,
): Promise<ActionResult> {
  const hr = await getHrContext();
  if (!hr) return { success: false, message: "HR access is required." };
  if (!/^[0-9a-f-]{36}$/i.test(positionId)) {
    return { success: false, message: "This position is unavailable." };
  }

  let values: PositionScoringStandardsValues;
  try {
    values = await positionScoringStandardsSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? (error.errors[0] ??
            "Choose valid Education and Training standards.")
          : "Choose valid Education and Training standards.",
    };
  }

  const educationLevel = values.baseQualificationLevel
    ? Number(values.baseQualificationLevel)
    : null;
  const trainingLevel = values.baseTrainingIncrementLevel
    ? Number(values.baseTrainingIncrementLevel)
    : null;
  const experienceLevel = values.baseExperienceIncrementLevel
    ? Number(values.baseExperienceIncrementLevel)
    : null;
  const { data, error } = await hr.supabase
    .from("positions")
    .update({
      base_qualification_level: educationLevel,
      base_training_increment_level: trainingLevel,
      base_experience_increment_level: experienceLevel,
    })
    .eq("id", positionId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      message:
        "The scoring standards could not be saved. Refresh and try again.",
    };
  }

  revalidatePath("/hr/criteria");
  revalidatePath("/hr/postings");
  revalidatePath("/hr/postings/new");
  return {
    success: true,
    message:
      educationLevel === null &&
      trainingLevel === null &&
      experienceLevel === null
        ? "Position Education, Training, and Experience standards cleared."
        : "Position Education, Training, and Experience standards saved.",
  };
}
