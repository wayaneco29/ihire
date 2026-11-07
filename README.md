# Southern Leyte Recruitment Portal

The Division of Southern Leyte recruitment workspace is built with Next.js App Router, TypeScript, Tailwind CSS v4, Ant Design, React Hook Form, and Supabase.

## Local setup

1. Install Node.js 20.9 or newer, Yarn, and the Supabase CLI if they are not available in your terminal.
2. Install the project dependencies from `yarn.lock`:

   ```bash
   yarn install
   ```

3. Start the local Supabase stack:

   ```bash
   supabase start
   ```

   This project uses the local ports configured in `supabase/config.toml` to avoid colliding with other Supabase projects.
4. Run `supabase status --output env` and copy `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` respectively. Keep the service role key server-only.
5. Apply local database migrations and seed the global document types:

   ```bash
   node scripts/migrate-local.mjs
   ```

   This uses the local database owner role required to configure private Supabase Storage policies.
6. Refresh the generated TypeScript types after schema changes:

   ```bash
   node scripts/generate-database-types.mjs
   ```

7. Set `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD` in `.env.local`, then create the single local Admin account:

   ```bash
   node scripts/seed-local-admin.mjs
   ```

   The script uses the local Auth admin API and does not print the password or service key.
8. Optionally set `LOCAL_DEMO_PASSWORD` in `.env.local` and seed synthetic demo accounts and records:

   ```bash
   node scripts/seed-local-demo.mjs
   ```

   Demo accounts share this local-only password. The fixture uses invented names and details; it does not use the sample PDS spreadsheet. Never run this script against production.
9. Verify the database access rules locally as Applicant, HR, Evaluator, and Admin:

   ```bash
   node scripts/verify-local-rls.mjs
   ```

   The script creates temporary local-only fixtures, checks identity isolation, anonymized views, invitation access, and private document access, then removes its fixtures.
10. Start the development server:

   ```bash
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000).

The `SUPABASE_SERVICE_ROLE_KEY` is for server-only use. Never expose it through a `NEXT_PUBLIC_` variable.

## Structure

- `src/app/` contains App Router pages and root providers.
- `src/components/form/` contains reusable Ant Design and React Hook Form controls.
- `src/components/layout/` contains the responsive application shell.
- `src/lib/supabase/` contains browser and server Supabase client factories.
- `src/constants/`, `src/types/`, and `src/utils/` hold shared project definitions and helpers.

## Current state

The portal includes applicant PDS, profile, jobs, applications, documents, notifications, evaluator review, HR hiring, and Admin invitations. Role routing, database RLS, anonymized review views, and private document storage protect the workflow. Use `PROJECT_SPEC.md` for the completed phase checklist and `turnover.md` for the implementation handoff.

## Production deployment

1. Apply the Supabase migrations to the intended project from a trusted development or CI environment. The local migration script refuses non-local URLs; use the Supabase CLI to link the project and push migrations.
2. Seed the global document types from `supabase/seed.sql` in the target database. Do not apply local demo fixtures to production.
3. Import the repository into Vercel and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or the supported publishable key), and server-only `SUPABASE_SERVICE_ROLE_KEY` for the appropriate Vercel environments.
4. Deploy with Node.js 20.9 or newer. Keep the service-role key out of client bundles and `NEXT_PUBLIC_` variables; the HR printable PDS route uses it only after server-side HR ownership and HIRED checks.
5. Create the production Admin through an approved, secure Supabase Auth process. `scripts/seed-local-admin.mjs` and `scripts/seed-local-demo.mjs` are local-only utilities.

For local smoke checks, run `node scripts/verify-local-rls.mjs`, `yarn lint`, and `yarn build` after migrations and environment variables are configured.
