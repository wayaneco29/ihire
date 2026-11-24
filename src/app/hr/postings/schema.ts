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
  requirements: yup.string().trim().max(10000).defined(),
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
});

export type PostingValues = yup.InferType<typeof postingSchema>;
