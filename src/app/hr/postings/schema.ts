import * as yup from "yup";
import { scoringRulesSchema } from "@/utils/scoring-schema";

export const JOB_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
export const HIRING_TRACKS = ["TEACHING", "NON_TEACHING"] as const;
export type HiringTrack = (typeof HIRING_TRACKS)[number];

export const postingSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(3, "Must at least 3 characters")
    .max(160)
    .required("Enter a job title."),
  description: yup
    .string()
    .trim()
    .min(10, "Add a little more detail to the description.")
    .max(10000)
    .required("Enter a job description."),
  requirements: yup
    .array()
    .of(
      yup
        .string()
        .trim()
        .min(1, "Enter a requirement or remove this row.")
        .max(10000, "Each requirement must be 10,000 characters or fewer.")
        .required("Enter a requirement or remove this row."),
    )
    .min(1, "Add at least one requirement.")
    .max(50, "A posting can have up to 50 requirements.")
    .test(
      "requirements-size",
      "The requirements list is too long.",
      (items) =>
        !items ||
        (items.every((item) => typeof item === "string") &&
          items.map((item) => item.trim()).join("\n").length <= 10000),
    )
    .required("Add at least one requirement."),
  slots: yup
    .number()
    .transform((value, original) => (original === "" ? Number.NaN : value))
    .integer("Enter a whole number of slots.")
    .min(1, "At least one slot is required.")
    .max(10000, "The slot count is too large.")
    .required("Enter the number of slots."),
  deadline: yup
    .string()
    .defined()
    .test(
      "valid-deadline",
      "Enter a valid deadline.",
      (value) => !value || Number.isFinite(Date.parse(value)),
    )
    .required("Deadline is required"),
  status: yup
    .mixed<(typeof JOB_STATUSES)[number]>()
    .oneOf(JOB_STATUSES, "Choose a posting status.")
    .required("Choose a posting status."),
  hiringTrack: yup
    .mixed<(typeof HIRING_TRACKS)[number]>()
    .oneOf(HIRING_TRACKS, "Choose a hiring type.")
    .required("Choose a hiring type."),
  positionIds: yup
    .array()
    .of(yup.string().uuid("Choose a valid position.").required())
    .min(1, "Select at least one applicable position.")
    .required("Select at least one applicable position.")
    .test(
      "unique-positions",
      "Do not select a position more than once.",
      (values) => !values || new Set(values).size === values.length,
    ),
  scoring: yup.array().of(yup.object({
    position_id: yup.string().uuid().required(),
    rules: scoringRulesSchema,
  })).required(),
  minimumScores: yup.array().of(yup.object({
    position_id: yup.string().uuid().required(),
    minimum_total_points: yup.number().transform((value, original) => original === "" || original == null ? null : value)
      .nullable().defined().min(0, "Minimum total score cannot be less than zero.")
      .max(100, "Minimum total score cannot exceed 100 points."),
  })).required(),
});

export type PostingValues = yup.InferType<typeof postingSchema>;
