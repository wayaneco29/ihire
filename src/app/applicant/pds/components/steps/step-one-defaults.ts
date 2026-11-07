import dayjs from "dayjs";
import type { Json } from "@/types/database";
import type { PdsStepOneValues } from "../../schema";

const EMPTY_ADDRESS = {
  house_block_lot_no: "",
  street: "",
  subdivision_village: "",
  barangay: "",
  city_municipality: "",
  province: "",
  zip_code: "",
};

const EMPTY_PERSONAL_INFO = {
  surname: "",
  first_name: "",
  middle_name: "",
  name_extension: "",
  date_of_birth: null,
  place_of_birth: "",
  sex_at_birth: "" as const,
  civil_status: "" as const,
  civil_status_other: "",
  height_m: null,
  weight_kg: null,
  blood_type: "",
  umid_no: "",
  pagibig_no: "",
  philhealth_no: "",
  philsys_no: "",
  tin_no: "",
  agency_employee_no: "",
  citizenship: "" as const,
  dual_citizenship_by: "" as const,
  dual_citizenship_country: "",
  telephone_no: "",
  mobile_no: "",
  email: "",
};

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function addressDefaults(value: Json | undefined) {
  const address = asRecord(value);
  return {
    house_block_lot_no: asString(address.house_block_lot_no),
    street: asString(address.street),
    subdivision_village: asString(address.subdivision_village),
    barangay: asString(address.barangay),
    city_municipality: asString(address.city_municipality),
    province: asString(address.province),
    zip_code: asString(address.zip_code),
  };
}

export function createStepOneDefaults(draftData: Json): PdsStepOneValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["1"]);
  const personalInfo = asRecord(step.personalInfo);
  const addresses = asRecord(step.addresses);
  const date = asString(personalInfo.date_of_birth);

  return {
    personalInfo: {
      ...EMPTY_PERSONAL_INFO,
      ...personalInfo,
      date_of_birth: date && dayjs(date).isValid() ? dayjs(date) : null,
      height_m:
        typeof personalInfo.height_m === "number" ? personalInfo.height_m : null,
      weight_kg:
        typeof personalInfo.weight_kg === "number" ? personalInfo.weight_kg : null,
      surname: asString(personalInfo.surname),
      first_name: asString(personalInfo.first_name),
      middle_name: asString(personalInfo.middle_name),
      name_extension: asString(personalInfo.name_extension),
      place_of_birth: asString(personalInfo.place_of_birth),
      civil_status_other: asString(personalInfo.civil_status_other),
      blood_type: asString(personalInfo.blood_type),
      umid_no: asString(personalInfo.umid_no),
      pagibig_no: asString(personalInfo.pagibig_no),
      philhealth_no: asString(personalInfo.philhealth_no),
      philsys_no: asString(personalInfo.philsys_no),
      tin_no: asString(personalInfo.tin_no),
      agency_employee_no: asString(personalInfo.agency_employee_no),
      dual_citizenship_country: asString(personalInfo.dual_citizenship_country),
      telephone_no: asString(personalInfo.telephone_no),
      mobile_no: asString(personalInfo.mobile_no),
      email: asString(personalInfo.email),
    } as PdsStepOneValues["personalInfo"],
    addresses: {
      residential: addressDefaults(addresses.residential),
      permanent: addressDefaults(addresses.permanent),
      sameAsResidential: addresses.sameAsResidential === true,
    },
  };
}

export const EMPTY_STEP_ONE_VALUES: PdsStepOneValues = {
  personalInfo: EMPTY_PERSONAL_INFO,
  addresses: {
    residential: EMPTY_ADDRESS,
    permanent: EMPTY_ADDRESS,
    sameAsResidential: false,
  },
};
