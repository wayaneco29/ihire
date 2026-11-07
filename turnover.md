# Project Turnover

**Project:** Southern Leyte Recruitment Portal  
**Handoff date:** 2026-11-07  
**Workspace:** `C:\Users\wayan\Desktop\Workspace\JAVASCRIPT\final`

## Current status

- Phases 0 through 7 are implemented. Phase 8 implementation is in place; items 8.1 and 8.2 remain open for browser viewport QA and a fresh local RLS run. See [PROJECT_SPEC.md](PROJECT_SPEC.md) for the checklist.
- Follow the workflow in section 0 of `PROJECT_SPEC.md`: get approval before a new phase, then complete and mark one subtask at a time.
- The local Admin account was seeded as `admin@local.test`. Its password is stored only in the ignored `.env.local` file as `LOCAL_ADMIN_PASSWORD`; this handoff intentionally contains no secret values.

## Stack and conventions

- Next.js 16.4.5 App Router, React 19.3, TypeScript, Tailwind CSS v4, Ant Design 6, React Hook Form, Yup, and Supabase.
- Yarn is the package manager. `yarn.lock` is the lockfile; `package-lock.json` was removed.
- App source lives under `src/`. Shared form controls are in `src/components/form/`; global layout and UI components are in `src/components/`.
- Keep files below 500 lines, use the existing form components and palette tokens, and check `src/utils/` before adding helpers.
- Next.js 16 deprecates the `middleware.ts` convention in favor of `proxy.ts`; session refresh and role redirects live in `src/proxy.ts`.
- `.env.local` is ignored by Git. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code; server-only Supabase admin access is in `src/lib/supabase/admin.ts`.

## Completed work

### Phase 1: Boilerplate

- Set up the App Router, TypeScript, Tailwind v4, Ant Design registry, and global theme/provider.
- Added palette tokens and responsive application shell with desktop sidebar and mobile drawer.
- Added reusable React Hook Form controls: input, select, date picker, textarea, upload, checkbox, radio, and yes/no radio.
- Added shared UI components, date/class utilities, Supabase browser/server clients, and `.env.example`.
- Moved the starter application under `src/app/`; included the Southern Leyte logo and school image under `public/`.

### Phase 2: Database and Supabase

- Configured local Supabase on alternate ports in `supabase/config.toml` to avoid the existing Supabase stack. Main ports are API `55321`, database `55322`, and Studio `55323`.
- Added 16 ordered migrations:

  1. `20261106000000_create_enums.sql`
  2. `20261106000100_create_identity_tables.sql`
  3. `20261106000200_add_invitations_notifications.sql`
  4. `20261106000300_add_pds_tables.sql`
  5. `20261106000400_add_jobs_documents_evaluation.sql`
  6. `20261106000500_enforce_single_admin.sql`
  7. `20261106000600_sync_profile_roles_from_auth_metadata.sql`
  8. `20261106000700_create_private_rls_helpers.sql`
  9. `20261106000800_add_role_based_rls_policies.sql`
  10. `20261106000900_add_anonymized_views.sql`
  11. `20261106001000_add_private_document_storage.sql`
  12. `20261106001100_add_pds_application_workflows.sql`
  13. `20261106001200_add_review_notification_triggers.sql`
  14. `20261106001300_allow_navigation_to_completed_pds_steps.sql`
  15. `20261106001400_add_pds_draft_autosave.sql`
  16. `20261107000100_allow_applicants_to_read_applied_jobs.sql`

- Created role/status enums, profiles and applicant numbering, invitations, notifications, all PDS tables, jobs/applications, documents/reviews/evaluations, and hiring decisions.
- Added role-based RLS, private helper functions, anonymized applicant/credibility/questionnaire/document views, and the private `applicant-documents` bucket with opaque UUID paths.
- Added PDS draft/step/clone/submit workflows, job application function, Auth role synchronization, re-review and notification triggers.
- Seeded six global document types and the single local Admin user.
- Generated split TypeScript database definitions under `src/types/database*` and typed both Supabase clients.
- Added local scripts: `migrate-local.mjs`, `seed-local-admin.mjs`, `generate-database-types.mjs`, and `verify-local-rls.mjs`.

### Phase 3: Auth, invites, and role-based routing

- Added `AuthContext` and `NotificationContext` in `src/context/`, wired through `src/app/providers.tsx`.
- Added applicant-only registration and shared login pages under `src/app/(auth)/`; forms use the shared controls and route-colocated Yup schemas.
- Login redirects by role. Applicants without a submitted PDS are sent to `/applicant/pds`.
- Added `src/proxy.ts` for Supabase session refresh and role route redirects for `/applicant`, `/evaluator`, `/hr`, and `/admin`. The applicant PDS check uses the caller's RLS-scoped profile row.
- Added Admin invitation management at `/admin/invitations`: create, list, revoke, and resend links for HR/Evaluator.
- Invitation bearer tokens are generated randomly; only a SHA-256 hash is stored. They expire after seven days and are one-use. Since the project decision is in-app notifications only, the Admin page displays a copyable link instead of sending email.
- Added invite acceptance at `/invite/[token]`; the server validates token state and expiry, sets the invited role via Supabase Auth Admin, and creates the profile through the database trigger.
- Added role-based sidebar items, logout, notification fetching, unread count, notification list, and mark-as-read behavior.
- Added placeholder pages for the not-yet-built Applicant dashboard/PDS, Evaluator review queue, and HR dashboard.

### Phase 4: Applicant PDS wizard and versioning

- Built `/applicant/pds` as an 11-step wizard with resume support, server-enforced progression, completed-step navigation, autosave, and responsive navigation.
- Added React Hook Form screens and per-step Yup validation for personal details, family, education, eligibility, employment, volunteering, learning, other information, questionnaire, references, and final review.
- Added dynamic repeating rows, PDS option lists, review summary, and an explicit confirmation before submission.
- Saving a step writes normalized PDS records and draft data. Applicants can return to completed steps and edit their answers.
- Added PDS update cloning. The last submitted version remains active for applications until the new draft is submitted; submission updates the applicant flag and invokes the existing re-review and notification workflows.
- Split wizard actions and schemas into modules that stay below the 500-line source-file limit.

### Phase 5: Applicant pages

- Added the shared applicant layout using the existing responsive sidebar and mobile drawer.
- Replaced the dashboard placeholder with applicant-scoped PDS, application, document, and notification summaries.
- Added a read-only profile sourced from the latest submitted PDS; while an update draft exists, the submitted version remains visible.
- Added searchable/filterable open jobs, job details, and an apply action using the `apply_to_job()` RPC so the submitted PDS version is snapshotted and duplicate applications are blocked.
- Added the My Applications list and detail timeline with evaluation remarks and hiring decisions.
- Added document upload per global type, version history, review remarks, and short-lived signed URLs. Uploads use the server-only service client after applicant authorization; files remain in the private bucket under opaque UUID paths. The Server Action body limit is 51 MB to accommodate the bucket's 50 MB file limit.
- Added a paginated full notifications page and changed the header bell to use an exact unread count.
- Added migration `20261107000100_allow_applicants_to_read_applied_jobs.sql` so applicants can still see job details for postings they applied to after a posting closes.

### Phase 6: Evaluator module

- Added the shared evaluator layout and a server-side `getEvaluatorContext()` authorization helper. The existing proxy protects `/evaluator/*`, and each data page and mutation also checks evaluator role.
- Built the review queue from anonymized applicant and document views, showing applicant numbers, credibility aggregates, current document statuses, and separate Initial/Re-review filters.
- Added application review pages with questionnaire answers and supporting document status, using anonymized views only.
- Added evaluator document pages with short-lived signed URLs, opaque storage keys, and server-validated `VERIFIED`, `REJECTED`, and `FOR_RESUBMISSION` actions with remarks.
- Added application evaluation actions for `QUALIFIED` and `NOT_QUALIFIED`; server-side checks require each global required document type's latest uploaded version to be verified.
- Re-review queues recognize applications returned to `UNDER_EVALUATION` after a submitted PDS update and applications with new `FOR_REVIEW` documents. Existing in-app notifications link to the implemented application/document review pages.
- Reviewed evaluator data queries and UI fields: no applicant names, sex, age, addresses, or original filenames are queried or displayed. The document object path is a UUID and viewing uses a 60-second signed URL. Document contents may themselves contain identifying information; a redaction workflow would be needed to guarantee anonymity inside the files.

### Phase 7: HR module

- Added the shared HR workspace layout and navigation, plus a server-side HR role context check for page queries and actions.
- Built the hiring dashboard and postings list with applicant totals, qualified-to-total counts, posting status, open count, pending evaluation count, and hired count. HR data queries use the existing ownership RLS rules and anonymized applicant views.
- Added job posting create/edit forms for title, description, requirements, slots, deadline, and DRAFT/OPEN/CLOSED status. Open postings reject expired deadlines and filled capacity; slots cannot be reduced below existing hires.
- Added posting applicant review with status filters and Applicant No. plus credibility data only. Hiring/rejection decisions are confirmed before submission and notify applicants through the existing database trigger.
- Added migration `20261107000200_add_hr_capacity_workflows.sql`: a posting row lock serializes hire decisions, enforces qualification and slot limits, closes a posting when the final slot is filled, and blocks direct client writes to `hiring_decisions` that could bypass those checks.
- Added a four-page CS Form 212-style printable PDS with print CSS. Identity access is limited to the owning HR account after an application is marked HIRED; the route checks the anonymized application view before using the server-only service key to read PDS data. This follows the working default in section 3 of [PROJECT_SPEC.md](PROJECT_SPEC.md), which is still awaiting your confirmation.

### Phase 8: QA, responsiveness, and polish

- Added shared App Router loading, error, and not-found pages. The error boundary offers a retry action and tells users their saved information remains available.
- Connected reusable form labels, hints, and validation messages to their controls with accessible descriptions and invalid-state attributes. Added visible keyboard focus styles and a keyboard-trapped mobile navigation dialog that restores focus when closed.
- Improved text contrast in navigation, dashboard, notification, and landing-page content. Tailwind CSS palette tokens match the shared Ant Design theme colors.
- Hardened post-login session handling: auth events defer profile work until the callback returns, profile lookups have a timeout, and the login form uses trusted role metadata without repeating profile reads when available. Initial session failures now stop the account loading state instead of leaving it pending forever.
- Added `scripts/seed-local-demo.mjs`, a local-only synthetic fixture for HR, Evaluator, and two Applicants. It uses invented names and records and does not read the sample PDS spreadsheet. `LOCAL_DEMO_PASSWORD` is documented in `.env.example`.
- Extended the role-based RLS verifier to check direct access to PDS identity, address, family, education, eligibility, work, questionnaire, and reference tables. Moved SQL assertion generation to `scripts/rls-verification-assertions.mjs`; the verifier and demo seeder are both below 500 lines.
- Updated README setup and deployment steps for Yarn, local migration and seeding, RLS checks, environment variables, and Vercel.
- Static review confirmed all TypeScript and JavaScript files under `src/` and `scripts/` are at most 500 lines. Browser rendering, lint/build, and the expanded RLS script were not run in this authoring shell because Node.js and Yarn are unavailable on PATH. Phase 5 and Phase 7 migrations also still need to be applied locally before a fresh RLS run.

## Local setup and useful commands

1. Install dependencies with `yarn install`.
2. Start local Supabase with `supabase start`.
3. Copy local `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` from `supabase status --output env` into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key server-only.
4. Apply migrations and seed document types:

   ```bash
   node scripts/migrate-local.mjs
   ```

5. If the local database has been reset, set `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD` in `.env.local`, then run:

   ```bash
   node scripts/seed-local-admin.mjs
   ```

6. Start the app with `yarn dev`, then sign in as the local Admin at `/login`.
7. After schema changes, refresh generated types with `node scripts/generate-database-types.mjs`.

The migration script uses the local database owner role needed to apply private Storage policies. Use the project scripts rather than `yarn supabase`; the Supabase CLI is a separate CLI installation.

## Verification status

- A previous `node scripts/verify-local-rls.mjs` run passed for Applicant, HR, Evaluator, and Admin before the Phase 8 checks were added. The expanded verifier has not been run after the Phase 7 migration and Phase 8 updates.
- HR and Evaluator profile reads are filtered to zero rows by RLS; the SQL query itself does not raise a permission error.
- The package currently has `dev`, `build`, `start`, and `lint` scripts, but no unit or E2E test runner. Phase 1 and Phase 3 were not run through a build, lint, or browser test during this work.
- `git diff --check` was run; Git emitted line-ending configuration warnings, not whitespace errors.
- No build, lint, or browser test was run for Phases 4 through 7.

## Open decisions and remaining work

- **Identity unlock timing is still awaiting confirmation** in section 3 of `PROJECT_SPEC.md`. Phase 7 follows the documented working default: keep identity hidden until HR marks an applicant `HIRED`, then unlock the printable PDS.
- The Phase 5 and Phase 7 migrations have not been applied in this authoring shell because Node.js is not available on PATH. From the development environment with local Supabase running, run `node scripts/migrate-local.mjs` to apply pending migrations and seed document types.
- Phase 8 items 8.1 and 8.2 remain open in [PROJECT_SPEC.md](PROJECT_SPEC.md): inspect each route at mobile, tablet, and desktop browser widths; apply pending migrations and run the expanded local RLS verifier.
- This authoring shell has no `node`, `yarn`, or `npm` command on PATH, so lint/build, browser rendering, local migration, demo seeding, and the current RLS verifier could not be run here.
- Authentication and invitation code has not received an end-to-end browser test. Confirm local Supabase is running and `.env.local` is configured before testing it.
