import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type PdsSupabaseClient = SupabaseClient<Database>;

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function omit(value: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key)),
  );
}

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export async function hydratePdsDraftData(
  supabase: PdsSupabaseClient,
  pdsVersionId: string,
  draftData: Json,
): Promise<Json | null> {
  const [
    personalInfo,
    addresses,
    familyBackground,
    children,
    education,
    eligibility,
    workExperience,
    voluntaryWork,
    learningDevelopment,
    otherInfo,
    questionnaire,
    references,
  ] = await Promise.all([
    supabase.from("pds_personal_info").select("*").eq("pds_version_id", pdsVersionId).maybeSingle(),
    supabase.from("pds_addresses").select("*").eq("pds_version_id", pdsVersionId),
    supabase.from("pds_family_background").select("*").eq("pds_version_id", pdsVersionId).maybeSingle(),
    supabase.from("pds_children").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
    supabase.from("pds_education").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
    supabase.from("pds_eligibility").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
    supabase.from("pds_work_experience").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
    supabase.from("pds_voluntary_work").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
    supabase.from("pds_learning_development").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
    supabase.from("pds_other_info").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
    supabase.from("pds_questionnaire").select("*").eq("pds_version_id", pdsVersionId),
    supabase.from("pds_references").select("*").eq("pds_version_id", pdsVersionId).order("sort_order"),
  ]);

  if (
    personalInfo.error ||
    addresses.error ||
    familyBackground.error ||
    children.error ||
    education.error ||
    eligibility.error ||
    workExperience.error ||
    voluntaryWork.error ||
    learningDevelopment.error ||
    otherInfo.error ||
    questionnaire.error ||
    references.error
  ) {
    return null;
  }

  const addressRows = addresses.data ?? [];
  const residential = addressRows.find((row) => row.type === "RESIDENTIAL");
  const permanent = addressRows.find((row) => row.type === "PERMANENT");

  const normalized: Record<string, Json> = {
    "1": {
      personalInfo: personalInfo.data
        ? asJson(omit(personalInfo.data, ["pds_version_id"]))
        : {},
      addresses: {
        residential: residential
          ? asJson(omit(residential, ["pds_version_id", "type", "same_as_residential"]))
          : {},
        permanent: permanent
          ? asJson(omit(permanent, ["pds_version_id", "type", "same_as_residential"]))
          : {},
        sameAsResidential: permanent?.same_as_residential ?? false,
      },
    },
    "2": {
      familyBackground: familyBackground.data
        ? asJson(omit(familyBackground.data, ["pds_version_id"]))
        : {},
      children: asJson(
        (children.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
    },
    "3": {
      education: asJson(
        (education.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
    },
    "4": {
      eligibility: asJson(
        (eligibility.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
    },
    "5": {
      workExperience: asJson(
        (workExperience.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
    },
    "6": {
      voluntaryWork: asJson(
        (voluntaryWork.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
    },
    "7": {
      learningDevelopment: asJson(
        (learningDevelopment.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
    },
    "8": {
      otherInfo: asJson(
        (otherInfo.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
    },
    "9": {
      questionnaire: asJson(
        (questionnaire.data ?? []).map((row) => ({
          question_code: row.question_code,
          answer: row.answer,
          details: row.question_code === "39" ? "" : row.details,
          country: row.question_code === "39" ? row.details ?? "" : "",
          date_filed: row.date_filed,
          case_status: row.case_status,
          id_no: row.id_no,
        })),
      ),
    },
    "10": {
      references: asJson(
        (references.data ?? []).map((row) =>
          omit(row, ["id", "pds_version_id", "sort_order"]),
        ),
      ),
      confirm_unrelated: false,
    },
  };

  return asJson({ ...normalized, ...asRecord(draftData) });
}
