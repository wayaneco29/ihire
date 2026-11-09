import * as yup from "yup";

export const applicationSchema = yup.object({
  positionId: yup
    .string()
    .uuid("Choose a valid position.")
    .required("Choose the position you are applying for."),
});

export type ApplicationValues = yup.InferType<typeof applicationSchema>;
