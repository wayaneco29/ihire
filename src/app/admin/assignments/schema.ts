import * as yup from "yup";

const UNASSIGNED_EVALUATOR = "UNASSIGNED";

export const assignmentSchema = yup.object({
  applicationId: yup
    .string()
    .matches(/^[0-9a-f-]{36}$/i, "Choose a valid application.")
    .required("Choose a valid application."),
  evaluatorId: yup
    .string()
    .required("Choose an evaluator or leave the application unassigned.")
    .test(
      "evaluator-id",
      "Choose a valid evaluator.",
      (value) => value === UNASSIGNED_EVALUATOR || /^[0-9a-f-]{36}$/i.test(value),
    ),
});

export type AssignmentValues = yup.InferType<typeof assignmentSchema>;
export { UNASSIGNED_EVALUATOR };
