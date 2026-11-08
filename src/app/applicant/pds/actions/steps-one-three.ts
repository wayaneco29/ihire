"use server";

import { getApplicantContext } from "@/lib/auth/server";
import type { Json } from "@/types/database";
import dayjs from "dayjs";
import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { completeAndAdvanceStep, type NavigationResult } from "../action-utils";
import {
  pdsStepOneSchema,
  pdsStepTwoSchema,
  pdsStepThreeSchema,
} from "../schema";

export async function savePdsPersonalStep(
  pdsVersionId: string,
  input: unknown,
): Promise<NavigationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(pdsVersionId)) {
    return { success: false, message: "This PDS draft is not available." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Applicant access is required." };
  }

  let values;
  try {
    values = await pdsStepOneSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? (error.errors[0] ?? "Check the required personal information.")
          : "Check the required personal information.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 1,
      p_payload: JSON.parse(JSON.stringify(values)) as Json,
    },
  );
  if (draftError) {
    return {
      success: false,
      message: "Your PDS draft could not be saved. Please try again.",
    };
  }

  const personal = values.personalInfo;
  const { error: personalError } = await applicant.supabase
    .from("pds_personal_info")
    .upsert(
      {
        pds_version_id: pdsVersionId,
        surname: personal.surname,
        first_name: personal.first_name,
        middle_name: personal.middle_name ?? null,
        name_extension: personal.name_extension ?? null,
        date_of_birth: dayjs(personal.date_of_birth).format("YYYY-MM-DD"),
        place_of_birth: personal.place_of_birth,
        sex_at_birth: personal.sex_at_birth,
        civil_status: personal.civil_status,
        civil_status_other: personal.civil_status_other ?? null,
        height_m: personal.height_m ?? null,
        weight_kg: personal.weight_kg ?? null,
        blood_type: personal.blood_type || null,
        umid_no: personal.umid_no ?? null,
        pagibig_no: personal.pagibig_no ?? null,
        philhealth_no: personal.philhealth_no ?? null,
        philsys_no: personal.philsys_no ?? null,
        tin_no: personal.tin_no ?? null,
        agency_employee_no: personal.agency_employee_no ?? null,
        citizenship: personal.citizenship,
        dual_citizenship_by: personal.dual_citizenship_by ?? null,
        dual_citizenship_country: personal.dual_citizenship_country ?? null,
        telephone_no: personal.telephone_no ?? null,
        mobile_no: personal.mobile_no ?? null,
        email: personal.email,
      },
      { onConflict: "pds_version_id" },
    );

  console.log(personalError);
  if (personalError) {
    return {
      success: false,
      message:
        "Your personal information could not be saved. Please try again.",
    };
  }

  const residential = values.addresses.residential;
  const permanent = values.addresses.sameAsResidential
    ? residential
    : values.addresses.permanent;
  const addressRows = [
    { type: "RESIDENTIAL", address: residential, same: false },
    {
      type: "PERMANENT",
      address: permanent,
      same: values.addresses.sameAsResidential,
    },
  ].map(({ type, address, same }) => ({
    pds_version_id: pdsVersionId,
    type,
    house_block_lot_no: address.house_block_lot_no ?? null,
    street: address.street ?? null,
    subdivision_village: address.subdivision_village ?? null,
    barangay: address.barangay,
    city_municipality: address.city_municipality,
    province: address.province,
    zip_code: address.zip_code,
    same_as_residential: same,
  }));

  const { error: addressError } = await applicant.supabase
    .from("pds_addresses")
    .upsert(addressRows, { onConflict: "pds_version_id,type" });
  if (addressError) {
    return {
      success: false,
      message: "Your addresses could not be saved. Please try again.",
    };
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    1,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}

export async function savePdsFamilyStep(
  pdsVersionId: string,
  input: unknown,
): Promise<NavigationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(pdsVersionId)) {
    return { success: false, message: "This PDS draft is not available." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Applicant access is required." };
  }

  let values;
  try {
    values = await pdsStepTwoSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? (error.errors[0] ?? "Check the family information.")
          : "Check the family information.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 2,
      p_payload: JSON.parse(JSON.stringify(values)) as Json,
    },
  );
  if (draftError) {
    return {
      success: false,
      message: "Your PDS draft could not be saved. Please try again.",
    };
  }

  const family = values.familyBackground;
  const { error: familyError } = await applicant.supabase
    .from("pds_family_background")
    .upsert({
      pds_version_id: pdsVersionId,
      spouse_surname: family.spouse_surname ?? null,
      spouse_first_name: family.spouse_first_name ?? null,
      spouse_middle_name: family.spouse_middle_name ?? null,
      spouse_name_extension: family.spouse_name_extension ?? null,
      spouse_occupation: family.spouse_occupation ?? null,
      spouse_employer: family.spouse_employer ?? null,
      spouse_business_address: family.spouse_business_address ?? null,
      spouse_telephone_no: family.spouse_telephone_no ?? null,
      father_surname: family.father_surname ?? null,
      father_first_name: family.father_first_name ?? null,
      father_middle_name: family.father_middle_name ?? null,
      father_name_extension: family.father_name_extension ?? null,
      mother_surname: family.mother_surname ?? null,
      mother_first_name: family.mother_first_name ?? null,
      mother_middle_name: family.mother_middle_name ?? null,
    });
  if (familyError) {
    return {
      success: false,
      message: "Your family information could not be saved. Please try again.",
    };
  }

  const { error: deleteError } = await applicant.supabase
    .from("pds_children")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "The children list could not be updated. Please try again.",
    };
  }

  if (values.children.length > 0) {
    const children = values.children.map((child, index) => ({
      pds_version_id: pdsVersionId,
      full_name: child.full_name,
      date_of_birth: child.date_of_birth
        ? dayjs(child.date_of_birth).format("YYYY-MM-DD")
        : null,
      sort_order: index + 1,
    }));
    const { error: childrenError } = await applicant.supabase
      .from("pds_children")
      .insert(children);
    if (childrenError) {
      return {
        success: false,
        message: "The children list could not be saved. Please try again.",
      };
    }
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    2,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}

export async function savePdsEducationStep(
  pdsVersionId: string,
  input: unknown,
): Promise<NavigationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(pdsVersionId)) {
    return { success: false, message: "This PDS draft is not available." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Applicant access is required." };
  }

  let values;
  try {
    values = await pdsStepThreeSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? (error.errors[0] ?? "Check your education details.")
          : "Check your education details.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 3,
      p_payload: JSON.parse(JSON.stringify(values)) as Json,
    },
  );
  if (draftError) {
    return {
      success: false,
      message: "Your PDS draft could not be saved. Please try again.",
    };
  }

  const { error: deleteError } = await applicant.supabase
    .from("pds_education")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your education history could not be updated. Please try again.",
    };
  }

  const rows = values.education.map((row, index) => ({
    pds_version_id: pdsVersionId,
    level: row.level,
    school_name: row.school_name ?? null,
    degree_course: row.degree_course ?? null,
    period_from: row.period_from ?? null,
    period_to: row.period_to ?? null,
    highest_level_units_earned: row.highest_level_units_earned ?? null,
    year_graduated: row.year_graduated ?? null,
    honors_received: row.honors_received ?? null,
    sort_order: index + 1,
  }));
  const { error: insertError } = await applicant.supabase
    .from("pds_education")
    .insert(rows);
  if (insertError) {
    return {
      success: false,
      message: "Your education history could not be saved. Please try again.",
    };
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    3,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}
