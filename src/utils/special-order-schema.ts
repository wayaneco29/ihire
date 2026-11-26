import * as yup from "yup";
import { validIsoDate } from "./philippine-time";

export const specialOrderDraftSchema = yup.object({
  position: yup.string().trim().max(160).defined(),
  designation: yup.string().trim().max(300).defined(),
  orderNumber: yup.string().trim().max(80).defined(),
  date: yup.string().required("Choose the order date.").test("date", "Choose a valid date.", validIsoDate),
});
export const specialOrderSchema = specialOrderDraftSchema.shape({
  position: yup.string().trim().max(160).required("Enter the appointment position."),
  designation: yup.string().trim().max(300).required("Enter the designation or assignment."),
});
export type SpecialOrderValues = yup.InferType<typeof specialOrderSchema>;
