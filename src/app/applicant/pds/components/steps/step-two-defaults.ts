import dayjs from "dayjs";
import type { Json } from "@/types/database";
import type { PdsStepTwoValues } from "../../schema";

const EMPTY_FAMILY_BACKGROUND: PdsStepTwoValues["familyBackground"] = {
  spouse_surname: "",
  spouse_first_name: "",
  spouse_middle_name: "",
  spouse_name_extension: "",
  spouse_occupation: "",
  spouse_employer: "",
  spouse_business_address: "",
  spouse_telephone_no: "",
  father_surname: "",
  father_first_name: "",
  father_middle_name: "",
  father_name_extension: "",
  mother_surname: "",
  mother_first_name: "",
  mother_middle_name: "",
};

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

export function createStepTwoDefaults(draftData: Json): PdsStepTwoValues {
  const step = asRecord(asRecord(draftData)["2"]);
  const family = asRecord(step.familyBackground);
  const childRows = Array.isArray(step.children) ? step.children : [];

  return {
    familyBackground: Object.fromEntries(
      Object.keys(EMPTY_FAMILY_BACKGROUND).map((key) => [
        key,
        asString(family[key]),
      ]),
    ) as PdsStepTwoValues["familyBackground"],
    children: childRows.flatMap((child) => {
      const row = asRecord(child);
      const fullName = asString(row.full_name);
      const date = asString(row.date_of_birth);
      if (!fullName && !date) return [];
      return [
        {
          full_name: fullName,
          date_of_birth: date && dayjs(date).isValid() ? dayjs(date) : null,
        },
      ];
    }),
  };
}
