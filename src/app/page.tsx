import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoadmapCards } from "@/components/ui/RoadmapCards";
import { StatusTag } from "@/components/ui/StatusTag";

export default function Home() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Recruitment workspace"
        title="Foundation preview"
        description="The core workspace is taking shape. Applicant, evaluator, and HR tools will be added in the next build phases."
      />

      <section className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Project setup
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              A fairer path to public service.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white sm:text-base">
              This preview establishes the responsive workspace, shared form
              controls, and the visual system for the recruitment platform.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-primary hover:bg-primary-light"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/40 px-4 text-sm font-semibold text-white hover:bg-white/10"
                href="/register"
              >
                Applicant registration
              </Link>
            </div>
          </div>
          <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 md:max-w-[250px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Current phase</span>
              <StatusTag className="border-white/20 bg-white/15 text-white">
                Phase 3
              </StatusTag>
            </div>
            <p className="mt-2 text-xs leading-5 text-white">
              Authentication, invitations, and role-based access
            </p>
          </div>
        </div>
      </section>

      <section className="mt-9">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Roadmap
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              What this workspace will support
            </h2>
          </div>
          <p className="text-sm text-muted">Built in small, reviewable phases</p>
        </div>

        <RoadmapCards />
      </section>

      <p className="mt-8 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-xs leading-5 text-muted">
        Sign-in and applicant registration are available. Applicant data and
        live recruitment actions will open as their modules are implemented.
      </p>
    </AppShell>
  );
}
