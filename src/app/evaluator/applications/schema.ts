import * as yup from "yup";

export const APPLICATION_EVALUATION_RESULTS = [
  "QUALIFIED",
  "NOT_QUALIFIED",
] as const;

export const applicationEvaluationSchema = yup.object({
  result: yup
    .mixed<(typeof APPLICATION_EVALUATION_RESULTS)[number]>()
    .oneOf([...APPLICATION_EVALUATION_RESULTS], "Choose an evaluation result.")
    .required("Choose an evaluation result."),
  remarks: yup.string().trim().max(2000, "Remarks must be 2,000 characters or fewer.").defined(),
});

export type ApplicationEvaluationValues = yup.InferType<typeof applicationEvaluationSchema>;

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
