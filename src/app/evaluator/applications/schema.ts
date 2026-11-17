import * as yup from "yup";
import { isFuturePhilippineDateTime } from "@/utils/philippine-time";

export const applicationEvaluationSchema = yup.object({
  remarks: yup.string().trim().max(2000, "Remarks must be 2,000 characters or fewer.").defined(),
});

export type ApplicationEvaluationValues = yup.InferType<typeof applicationEvaluationSchema>;

export const applicationAssessmentScheduleSchema = yup.object({
  scheduledAt: yup
    .string()
    .required("Choose the assessment date and time.")
    .test(
      "valid-date",
      "Choose a valid assessment date and time.",
      (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value ?? ""),
    )
    .test(
      "future-date",
      "The assessment must be scheduled for a future date and time.",
      (value) => !value || isFuturePhilippineDateTime(value),
    ),
});

export type ApplicationAssessmentScheduleValues = yup.InferType<
  typeof applicationAssessmentScheduleSchema
>;

export type ManualScoringCriterion = {
  id: string;
  title: string;
  maxPoints: number;
};

export const applicationCriterionScoresSchema = (
  criteria: ManualScoringCriterion[],
) =>
  yup.object({
    scores: yup
      .array()
      .of(
        yup.object({
          criterionId: yup.string().required(),
          points: yup
            .number()
            .transform((value, originalValue) =>
              originalValue === "" ? null : value,
            )
            .nullable()
            .defined()
            .test("score-required", "Enter points for this criterion.", (value) =>
              value !== null,
            )
            .min(0, "Points cannot be negative.")
            .test(
              "two-decimal-places",
              "Enter up to two decimal places.",
              (value) =>
                value == null ||
                Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
            )
            .test(
              "criterion-maximum",
              function (value) {
                const criterion = criteria.find(
                  (item) => item.id === this.parent.criterionId,
                );
                if (value == null) return true;
                if (criterion && value <= criterion.maxPoints) return true;
                return this.createError({
                  message: criterion
                    ? `Points cannot exceed ${criterion.maxPoints}.`
                    : "This criterion is not available for scoring.",
                });
              },
            ),
        }),
      )
      .required()
      .length(criteria.length),
  });

export type ApplicationCriterionScoresValues = yup.InferType<
  ReturnType<typeof applicationCriterionScoresSchema>
>;
