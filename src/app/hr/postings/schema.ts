import * as yup from "yup";

export const JOB_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;

export const postingSchema = yup.object({
  title: yup.string().trim().min(3).max(160).required("Enter a job title."),
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
    .test("valid-deadline", "Enter a valid deadline.", (value) =>
      !value || Number.isFinite(Date.parse(value)),
    ),
  status: yup
    .mixed<(typeof JOB_STATUSES)[number]>()
    .oneOf(JOB_STATUSES, "Choose a posting status.")
    .required("Choose a posting status."),
});

export type PostingValues = yup.InferType<typeof postingSchema>;
