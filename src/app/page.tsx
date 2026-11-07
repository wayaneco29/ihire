import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoadmapCards } from "@/components/ui/RoadmapCards";
import { StatusTag } from "@/components/ui/StatusTag";

export default function Home() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Southern Leyte recruitment portal"
        title="A clearer path to public service"
        description="A secure workspace for applicants and the teams supporting fair public service hiring."
      />

      <section className="hero-surface mt-7 overflow-hidden rounded-3xl p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest">
              Hiring journey
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              A fairer path to public service.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 sm:text-base">
              Follow your application from a complete PDS through review and hiring.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-panel px-4 text-sm font-semibold text-primary hover:bg-panel-muted"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-hero-line px-4 text-sm font-semibold text-hero-text hover:bg-hero-surface"
                href="/register"
              >
                Applicant registration
              </Link>
            </div>
          </div>
          <div className="w-full rounded-2xl border border-hero-line bg-hero-surface p-4 md:max-w-64">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Workspace</span>
              <StatusTag className="border-hero-line bg-hero-surface text-hero-text">
                Available
              </StatusTag>
            </div>
            <p className="mt-2 text-xs leading-5 text-hero-text">
              Applicant, evaluator, HR, and admin workflows
            </p>
          </div>
        </div>
      </section>

      <section className="mt-9">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Roadmap
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              A connected hiring process
            </h2>
          </div>
          <p className="text-sm text-muted">Built in small, reviewable phases</p>
        </div>

        <RoadmapCards />
      </section>

      <p className="mt-8 rounded-xl border border-line bg-panel px-4 py-3 text-xs leading-5 text-muted">
        Applicant information stays private while staff review applications using role-specific access.
      </p>
    </AppShell>
  );
}
