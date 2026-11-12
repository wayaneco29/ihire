"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { getAdminContext } from "@/lib/auth/server";
import { assignmentSchema, UNASSIGNED_EVALUATOR } from "./schema";

type ActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function validationMessage(error: unknown) {
  return error instanceof ValidationError
    ? error.errors[0] ?? "Choose a valid assignment."
    : "Choose a valid assignment.";
}

export async function reassignApplication(
  values: unknown,
): Promise<ActionResult> {
  const admin = await getAdminContext();
  if (!admin) return { success: false, message: "Admin access is required." };

  let input;
  try {
    input = await assignmentSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return { success: false, message: validationMessage(error) };
  }

  const { data, error } = await admin.supabase.rpc(
    "reassign_application_evaluator",
    {
      p_application_id: input.applicationId,
      p_evaluator_id:
        input.evaluatorId === UNASSIGNED_EVALUATOR ? null : input.evaluatorId,
    },
  );
  if (error) {
    const message = error.message.includes("eligible evaluator")
      ? "That account is not an eligible evaluator."
      : error.message.includes("Application was not found")
        ? "This application is no longer available for assignment."
        : "The assignment could not be updated. Refresh and try again.";
    return { success: false, message };
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/evaluator/reviews");
  return {
    success: true,
    message: data ? "Application assignment updated." : "Assignment unchanged.",
  };
}
