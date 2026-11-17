import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "ADMIN") return null;

  return { supabase, user };
}

export async function getApplicantContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, has_submitted_pds")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "APPLICANT") return null;

  const { data: applicant } = await supabase
    .from("applicants")
    .select("id, applicant_number")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!applicant) return null;

  return { supabase, user, profile, applicant };
}

export async function getEvaluatorContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  if (user.app_metadata.role !== "EVALUATOR") return null;

  return { supabase, user };
}

export async function getDocumentReviewerContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  if (user.app_metadata.role !== "DOCUMENT_REVIEWER") return null;

  console.log(user);
  return { supabase, user };
}

export async function getHrContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  if (user.app_metadata.role !== "HR") return null;

  return { supabase, user };
}
