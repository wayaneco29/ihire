import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAdminContext } from "@/lib/auth/server";
import { AssignmentManager } from "./components/AssignmentManager";

const PAGE_SIZE = 50;

export const metadata: Metadata = { title: "Evaluator assignments" };

export default async function AssignmentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    filter?: string | string[];
    page?: string | string[];
  }>;
}>) {
  const admin = await getAdminContext();
  if (!admin) redirect("/");

  const params = await searchParams;
  const filter = params.filter === "unassigned" ? "unassigned" : "all";
  const parsedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let assignmentsQuery = admin.supabase
    .from("v_admin_application_assignments")
    .select(
      "application_id, applicant_number, job_id, job_title, application_status, applied_at, assigned_evaluator_id, assigned_evaluator_email",
      { count: "exact" },
    )
    .order("applied_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filter === "unassigned") {
    assignmentsQuery = assignmentsQuery.is("assigned_evaluator_id", null);
  }

  const [
    assignmentsResult,
    openCountResult,
    unassignedCountResult,
    evaluatorCountsResult,
    evaluatorsResult,
    historyResult,
  ] = await Promise.all([
    assignmentsQuery,
    admin.supabase
      .from("v_admin_application_assignments")
      .select("application_id", { count: "exact", head: true }),
    admin.supabase
      .from("v_admin_application_assignments")
      .select("application_id", { count: "exact", head: true })
      .is("assigned_evaluator_id", null),
    admin.supabase
      .from("v_admin_evaluator_assignment_counts")
      .select("evaluator_id, evaluator_email, assigned_count")
      .order("evaluator_email"),
    admin.supabase
      .from("profiles")
      .select("id, email")
      .eq("role", "EVALUATOR")
      .order("email"),
    admin.supabase
      .from("v_admin_application_assignment_history")
      .select(
        "id, application_id, assignment_source, assigned_at, previous_evaluator_email, evaluator_email, assigned_by_email",
      )
      .order("assigned_at", { ascending: false })
      .limit(25),
  ]);

  if (
    assignmentsResult.error ||
    openCountResult.error ||
    unassignedCountResult.error ||
    evaluatorCountsResult.error ||
    evaluatorsResult.error ||
    historyResult.error
  ) {
    return (
      <AppShell>
        <div className="space-y-7">
          <PageHeader
            eyebrow="Administration"
            title="Evaluator assignments"
            description="Monitor round-robin assignments and manage pending work."
          />
          <EmptyState
            description="Refresh this page to try loading assignment data again."
            title="Assignment data unavailable"
          />
        </div>
      </AppShell>
    );
  }

  const totalCount = assignmentsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages && totalCount > 0) {
    redirect(
      filter === "unassigned"
        ? `/admin/assignments?filter=unassigned&page=${totalPages}`
        : `/admin/assignments?page=${totalPages}`,
    );
  }

  return (
    <AppShell>
      <div className="space-y-7">
        <PageHeader
          eyebrow="Administration"
          title="Evaluator assignments"
          description="Monitor the round-robin workload, resolve unassigned applications, and keep a record of changes."
        />
        <AssignmentManager
          assignments={assignmentsResult.data ?? []}
          evaluatorCounts={evaluatorCountsResult.data ?? []}
          evaluators={evaluatorsResult.data ?? []}
          filter={filter}
          history={historyResult.data ?? []}
          openCount={openCountResult.count ?? 0}
          page={page}
          totalPages={totalPages}
          unassignedCount={unassignedCountResult.count ?? 0}
        />
      </div>
    </AppShell>
  );
}
