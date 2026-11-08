# Job Recruitment System: Project Spec & Agent Handoff

> **Audience:** any AI agent continuing this build. Read this whole file before writing code.
> **Client:** Division of Southern Leyte (Region VIII, Eastern Visayas). Seal/logo provided by the user (`Division_of_Southern_Leyte_Seal.png`).
> **Form reference:** `PDS-2026.xlsx` = CS Form 212 (Revised 2026), the official Personal Data Sheet.

---

## 0. How You Must Work (MANDATORY WORKFLOW)

The user requires a strict **Step-by-Step Task Checklist** workflow.

1. **Before writing any code**, output a Markdown checklist of the phase and its subtasks.
2. Use this exact format on every turn:

```
### [ ] Current Phase: [Name of Phase]
- [ ] Subtask 1: [Description]
- [ ] Subtask 2: [Description]
```

3. When a subtask or phase is complete, update it to `[x]` before moving on.
4. **Ask for approval** before starting a new phase, then execute one subtask at a time.
5. If you notice a gap in the requirements, tell the user ("feel free to tell me so I know").
6. Never silently change a decision recorded in section 3. Ask first.

---

## 1. Project Overview

A role-based recruitment platform with three user roles plus a seeded Admin:

| Role | How they get an account | Purpose |
|---|---|---|
| **APPLICANT** | Self sign-up / login | Fills PDS, uploads documents, applies to jobs |
| **EVALUATOR** | **Invite-only** (sent by ADMIN) | Reviews applicant documents and marks status before it goes to HR |
| **HR** | **Invite-only** (sent by ADMIN) | Posts jobs, views anonymized applicants per posting, selects who to hire |
| **ADMIN** | Seeded (one account) | Sends invitations to HR and Evaluators |

### Core principle: anonymity
Applicants are **anonymized to HR and Evaluators to prevent cheating/bias**. They see only the **Applicant Number** (e.g. `APP-0001`) and **credibility data**, never identity. This must be **enforced at the database level** (RLS plus views), not only hidden in the UI.

**Credibility data** shown in place of identity: education level, years of experience, training hours, skills. No name, sex, age or address.

**Questionnaire (PDS items 34-40) IS displayed** to HR/Evaluators (user decision), still without identity data.

---

## 2. Tech Stack

- **Next.js** (App Router, TypeScript, `src/` dir) + **Tailwind CSS**
- **Ant Design (antd)**: UI library (use `@ant-design/nextjs-registry`)
- **react-hook-form** + **yup** (+ `@hookform/resolvers`)
- **React Context** for global state
- **Supabase**: overall backend (Auth, Postgres, RLS, Storage) via `@supabase/supabase-js` and `@supabase/ssr`
- **dayjs** for dates

---

## 3. Decisions Already Made (do not re-ask)

| # | Decision |
|---|---|
| 1 | HR and Evaluator accounts are **invite-only**, created through a seeded **ADMIN** role |
| 2 | Required documents are **global** (`document_types`), not per job |
| 3 | If an applicant updates a document or submits a new PDS version, an evaluator **re-reviews** it |
| 4 | Credibility data = education level, years of experience, training hours, skills |
| 5 | **Any** evaluator can review **any** applicant (no assignment table) |
| 6 | **In-app notifications only** (no email for now) |
| 7 | Color palette derived from the seal; **green is primary** |
| 8 | **One application per applicant per job** (`UNIQUE(job_id, applicant_id)`) |
| 9 | PDS item **40a** = indigenous group membership (RA 8371), "please specify" |
| 10 | Questionnaire (items 34-40) is **displayed** to HR/Evaluators |
| 11 | **No digital oath/signature/photo/thumbmark.** HR prints the PDS and the applicant signs physically. Wizard step 11 is "Review & Submit". Build a **print-ready PDS view** (CS Form 212, 4 pages) for HR |
| 12 | Each upload of **Training and Seminar Certificates** captures rendered hours. Applicants can link an upload to a PDS training entry; linked hours replace that entry's PDS hours in the total, while unlinked uploads count separately. Uploaded hours count immediately. OCR is deferred. |

### Still open (ask the user; use the default until answered)
- **When does HR see the applicant's real identity / unlock the printable PDS?**
  Working default: identity remains hidden (Applicant No. only) until HR marks the applicant **HIRED**. The printable PDS unlocks at that point. *Awaiting user confirmation; the Phase 7 implementation uses this default until it is changed.*

---

## 4. Rules (from the user, follow strictly)

1. Create **reusable components for Antd inputs, selects, etc.** (`FormInput`, `FormSelect`, ...). Always reuse them in forms.
2. **Always check `utils/` for an existing helper before creating a new one.**
3. **Max 500 per file** (user wrote "500 char"; interpret as 500 lines). Longer files must be split into smaller chunks/components.
4. **Clean, route-colocated folder structure.** Each page folder holds:
   ```
   dashboard/
   ├── components/   ← only components this page needs (NOT global)
   ├── page.tsx
   └── schema.ts     ← yup schema for this page
   ```
5. **Prefer Tailwind utility classes** over writing new CSS.
6. **Everything must be mobile responsive.**
7. **Follow the color palette** (section 5) for consistency. Keep Tailwind tokens and Antd `ConfigProvider` theme in sync.

---

## 5. Color Palette (sampled from the seal)

| Token | Hex | Use |
|---|---|---|
| `primary` | `#087808` | Buttons, active nav, links (about 5.9:1 on white) |
| `primary-dark` | `#066006` | Hover / pressed |
| `primary-light` | `#E6F4E6` | Selected rows, tag backgrounds |
| `danger` | `#D80808` | Errors, REJECTED, destructive actions |
| `accent` | `#F8D808` | Highlights, badges, FOR_REVIEW |
| `ink` | `#111827` | Primary text |
| `muted` | `#6B7280` | Secondary text |
| `surface` | `#F8F8F8` | Backgrounds |

Use the seal image as the app logo (sidebar/header/login).

---

## 6. Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/              → components/ page.tsx schema.ts
│   │   └── register/           → components/ page.tsx schema.ts   (applicants only)
│   │   └── invite/[token]/     → accept-invite flow for HR/Evaluator
│   ├── applicant/
│   │   ├── dashboard/          → components/ page.tsx
│   │   ├── jobs/               → components/ page.tsx
│   │   │   └── [id]/
│   │   ├── profile/            → components/ page.tsx
│   │   ├── applications/       → components/ page.tsx
│   │   │   └── [id]/
│   │   ├── documents/          → components/ page.tsx schema.ts
│   │   └── pds/                → components/ page.tsx schema.ts
│   ├── evaluator/
│   │   └── reviews/            → components/ page.tsx
│   ├── hr/
│   │   ├── dashboard/          → components/ page.tsx
│   │   └── postings/           → components/ page.tsx schema.ts
│   │       └── [id]/applicants/
│   ├── admin/
│   │   └── invitations/        → components/ page.tsx schema.ts
│   ├── layout.tsx
│   └── providers.tsx
├── components/                 ← GLOBAL, reusable only
│   ├── form/                   (FormInput, FormSelect, FormDatePicker, FormTextArea,
│   │                            FormUpload, FormCheckbox, FormRadio, FormRadioYesNo)
│   ├── layout/                 (Sidebar, Header, MobileDrawer)
│   └── ui/                     (StatusTag, PageHeader, EmptyState)
├── context/                    (AuthContext, ...)
├── lib/supabase/               (client.ts, server.ts, middleware.ts)
├── types/
├── utils/
├── constants/                  (roles, statuses, colors)
└── middleware.ts
```

---

## 7. Page Requirements

### 7.1 Applicant
Sign up / Login. Pages:

| Page | Behavior |
|---|---|
| **Dashboard** | Data related to the user (application counts and statuses, document statuses, PDS status, notifications) |
| **Jobs** | Lists jobs HR posted. Applicant **applies here**. Applicant is anonymous to HR/Evaluator. Only their credibility is shown. |
| **Profile** | Read-only view of data from the **latest SUBMITTED PDS**: Personal Information, Educational Background, Work Experience, Trainings, Skills |
| **My Application** | Lists the user's applications. Each opens a detail on a **new page** |
| **Documents** | Upload a document; view or update it. Updating triggers re-review |
| **PDS** | Wizard form (see 8) |

**First-login rule:** on first login the applicant **must** complete the PDS before using the rest of the app (`profiles.has_submitted_pds`).

### 7.2 Evaluator
Reviews applicant documents and sets the document status before it reaches HR. Statuses: `FOR_REVIEW`, `VERIFIED`, `REJECTED`, `FOR_RESUBMISSION`. Sees only anonymized data (Applicant No. + credibility). Any evaluator can review any applicant.

### 7.3 HR
- **Dashboard**: total postings, open postings, total applicants, qualified vs total per posting, pending evaluation count, hired count.
- **Postings**: list of postings with **number of applicants**, and **qualified / total** (as checked by evaluators).
- **Posting detail**: list of applicants for that job, **anonymized, showing only Applicant Number** (plus credibility), from which HR can **select to hire**.
- **Printable PDS** (CS Form 212 layout) for HR to print so the applicant signs physically. Unlock timing: see open question in section 3.

### 7.3 Admin
Create and manage invitations (email, role HR/EVALUATOR, token, expiry).

---

## 8. PDS Wizard (critical)

**Source:** `PDS-2026.xlsx`, sheets `C1`-`C4`. **Use ALL fields.** Do not store the sample person's data from the xlsx anywhere in the repo or seed data (structure only).

### Wizard behavior
- Stepper with indicators showing which steps are **finished**.
- **Clicking steps to skip is disabled.** A step is clickable **only once the user has finished that step** (and earlier ones). Enforce server-side too using `completed_steps`.
- Reuse the shared form components for every field.

### 11 steps
| # | Step | PDS Section / Items |
|---|---|---|
| 1 | Personal Information | I (1-21) |
| 2 | Family Background | II (22-25) |
| 3 | Educational Background | III (26) |
| 4 | Civil Service Eligibility | IV (27) |
| 5 | Work Experience | V (28) |
| 6 | Voluntary Work | VI (29) |
| 7 | Learning & Development | VII (30) |
| 8 | Other Information | VIII (31-33) |
| 9 | Questionnaire | IX (34-40) |
| 10 | References | IX (41) |
| 11 | Review & Submit | summary; no digital oath/photo/signature |

### Versioning rules
- The first submit creates **version 1** (`SUBMITTED`).
- "Update PDS" **clones the latest SUBMITTED version into a new DRAFT** (version N+1).
- While the new version is `DRAFT`, **display the previous SUBMITTED version** everywhere (Profile, HR/Evaluator views, applications).
- Only when the new version becomes `SUBMITTED` does it replace the displayed data.
- A newly submitted version sets affected applications back to re-evaluation (see 10).

### Field-level notes from the form
- **Name extension** (JR., SR) exists for the applicant, spouse and father.
- **Sex at birth**: Male / Female.
- **Civil status**: Single, Married, Widow/er, Separated, Solo Parent, Others (specify).
- **Citizenship**: Filipino or Dual citizenship (by birth / by naturalization, plus country from a country list).
- **Addresses**: residential and permanent (house/block/lot, street, subdivision/village, barangay, city/municipality, province, zip). Provide a "same as residential" toggle.
- **Education levels**: Elementary, Secondary, Vocational/Trade, College, Graduate Studies. Fields: school, degree/course, period from/to, highest level/units earned (if not graduated), year graduated, scholarship/honors.
- **Work experience**: dates (end date empty means present), position, agency/company, monthly salary, salary/job/pay grade and step, status of appointment, gov't service Y/N, and optional duties description (for the Work Experience Sheet). Most recent first.
- **"N/A" handling**: the paper form fills blanks with N/A. In the app, optional sections can be empty or marked "None".
- **Questionnaire** (Yes/No with conditional detail fields):

| Code | Question (summary) | Extra fields when YES |
|---|---|---|
| 34A | Related within 3rd degree to appointing/recommending authority, chief of bureau, or immediate supervisor | details |
| 34B | Related within 4th degree (LGU career employees) | details |
| 35A | Found guilty of any administrative offense | details |
| 35B | Criminally charged before any court | details, **date filed**, **status of case** |
| 36 | Convicted of any crime/violation of law, decree, ordinance or regulation | details |
| 37 | Separated from service (resignation, retirement, dropped from rolls, dismissal, termination, end of term, finished contract, phased out) | details |
| 38A | Candidate in national/local election within the last year (except Barangay) | details |
| 38B | Resigned from gov't service in the 3-month period before the last election to campaign | details |
| 39 | Immigrant or permanent resident of another country | country |
| 40A | Member of an indigenous group (RA 8371) | specify |
| 40B | Person with disability (RA 7277) | **ID No.** |
| 40C | Solo parent (RA 11861) | **ID No.** |

- **References (41)**: exactly **3** persons not related by consanguinity or affinity: name, office/residential address, contact no. and/or email.

---

## 9. Database Design (Supabase / Postgres)

### Identity, access, notifications
| Table | Key Columns |
|---|---|
| **profiles** | `id` (FK auth.users), `role` (APPLICANT/HR/EVALUATOR/ADMIN), `email`, `has_submitted_pds`, `created_at` |
| **applicants** | `id`, `profile_id`, `applicant_number` (unique, e.g. APP-0001): the anonymized identity |
| **invitations** | `id`, `email`, `role` (HR/EVALUATOR), `token`, `invited_by` (admin), `expires_at`, `accepted_at` |
| **notifications** | `id`, `user_id`, `type`, `title`, `body`, `link`, `is_read`, `created_at` |

### PDS (versioned; child tables keyed by `pds_version_id`)
| Table | Section | Columns |
|---|---|---|
| **pds_versions** | n/a | `id`, `applicant_id`, `version_no`, `status` (DRAFT/SUBMITTED), `current_step`, `completed_steps` int[], `submitted_at` |
| **pds_personal_info** | I | `surname`, `first_name`, `middle_name`, `name_extension`, `date_of_birth`, `place_of_birth`, `sex_at_birth`, `civil_status`, `civil_status_other`, `height_m`, `weight_kg`, `blood_type`, `umid_no`, `pagibig_no`, `philhealth_no`, `philsys_no`, `tin_no`, `agency_employee_no`, `citizenship`, `dual_citizenship_by`, `dual_citizenship_country`, `telephone_no`, `mobile_no`, `email` |
| **pds_addresses** | I | `type` (RESIDENTIAL/PERMANENT), `house_block_lot_no`, `street`, `subdivision_village`, `barangay`, `city_municipality`, `province`, `zip_code`, `same_as_residential` |
| **pds_family_background** | II | Spouse: `spouse_surname`, `spouse_first_name`, `spouse_middle_name`, `spouse_name_extension`, `spouse_occupation`, `spouse_employer`, `spouse_business_address`, `spouse_telephone_no`. Father: `father_surname`, `father_first_name`, `father_middle_name`, `father_name_extension`. Mother (maiden): `mother_surname`, `mother_first_name`, `mother_middle_name` |
| **pds_children** | II | `full_name`, `date_of_birth` |
| **pds_education** | III | `level`, `school_name`, `degree_course`, `period_from`, `period_to`, `highest_level_units_earned`, `year_graduated`, `honors_received` |
| **pds_eligibility** | IV | `eligibility_name`, `rating`, `exam_date`, `exam_place`, `license_no`, `license_valid_until` |
| **pds_work_experience** | V | `date_from`, `date_to`, `position_title`, `agency_company`, `monthly_salary`, `salary_grade_step`, `appointment_status`, `is_gov_service`, `duties_description` |
| **pds_voluntary_work** | VI | `organization_name_address`, `date_from`, `date_to`, `hours`, `position_nature` |
| **pds_learning_development** | VII | `title`, `date_from`, `date_to`, `hours`, `ld_type`, `conducted_by` |
| **pds_other_info** | VIII | `category` (SKILL_HOBBY / RECOGNITION / MEMBERSHIP), `description` |
| **pds_questionnaire** | IX | `question_code`, `answer` (bool), `details`, `date_filed`, `case_status`, `id_no` |
| **pds_references** | IX | `name`, `address`, `contact` (exactly 3) |

> There is **no** `pds_declaration` table (decision 11).

### Jobs, documents, evaluation, hiring
| Table | Key Columns |
|---|---|
| **job_postings** | `id`, `hr_id`, `title`, `description`, `requirements`, `slots`, `status` (DRAFT/OPEN/CLOSED), `deadline`, `created_at` |
| **applications** | `id`, `job_id`, `applicant_id`, `pds_version_id` (snapshot), `status`, `applied_at`. **UNIQUE(job_id, applicant_id)** |
| **document_types** | `id`, `name`, `is_required` (global) |
| **documents** | `id`, `applicant_id`, `document_type_id`, `file_path`, `version`, `status`, `uploaded_at`; training certificate uploads also store `training_hours` and optional `pds_learning_development_id` |
| **document_reviews** | `id`, `document_id`, `evaluator_id`, `status`, `remarks`, `reviewed_at` |
| **application_evaluations** | `id`, `application_id`, `evaluator_id`, `result` (QUALIFIED/NOT_QUALIFIED), `remarks`, `evaluated_at` |
| **hiring_decisions** | `id`, `application_id`, `hr_id`, `decision` (HIRED/REJECTED), `decided_at` |

### Statuses
- **Document:** `PENDING` → `FOR_REVIEW` → `VERIFIED` / `REJECTED` / `FOR_RESUBMISSION`
- **Application:** `SUBMITTED` → `UNDER_EVALUATION` → `QUALIFIED` / `NOT_QUALIFIED` → `HIRED` / `REJECTED`
- **PDS version:** `DRAFT` → `SUBMITTED`

### Anonymity enforcement
- HR and Evaluator **cannot read** `profiles`, `pds_personal_info`, `pds_addresses`, `pds_family_background`, `pds_children` or `pds_references` directly (RLS blocks it).
- They read through **views** (e.g. `v_anonymized_applicants`) exposing only `applicant_number`, credibility data (education level, years of experience, training hours, skills) and the questionnaire answers.
- Documents shown to Evaluators must not leak identity (use applicant number; consider a signed-URL-only access pattern and watch for names inside file names).
- Identity unlock timing is the open question in section 3.

---

## 10. Cross-Cutting Behaviors

- **Re-review rule:** a new document upload, or a new submitted PDS version, sets the document/application back to `FOR_REVIEW` and sends an in-app notification to evaluators. Keep old files as versions.
- **Notifications (in-app):** document status changes (applicant), re-review needed (evaluators), applicant qualified (HR), application status changes (applicant), invite accepted (admin).
- **Route protection:** `middleware.ts` plus role-based routing. Applicants with no submitted PDS are redirected to `/applicant/pds`.
- **Storage:** private Supabase buckets for documents. Access through signed URLs and RLS.

---

## 11. Roadmap & Current Status

- [x] **Phase 0:** Requirements & schema design (done; this document)
- [x] **Phase 1:** Boilerplate setup (complete)
- [x] **Phase 2:** Database & Supabase (schema, RLS, views, storage) — complete
- [x] **Phase 3:** Auth, invites & role-based routing — complete
- [x] **Phase 4:** Applicant: PDS wizard (11 steps, versioning)
- [x] **Phase 5:** Applicant: Dashboard, Profile, Jobs, Applications, Documents
- [x] **Phase 6:** Evaluator module
- [x] **Phase 7:** HR module (including the printable PDS)
- [ ] **Phase 8:** QA, responsiveness & polish

> Subtask-level checklists for Phases 2 to 8 are in **section 11A** below.

### Phase 1 checklist (Boilerplate Setup)
- [x] **1.1** Next.js App Router, TypeScript, and Tailwind v4 scaffold (existing install moved under `src/`)
- [x] 1.2 Install dependencies with Yarn (`yarn.lock` is the project lockfile)
- [x] 1.3 Create the clean folder structure (section 6)
- [x] 1.4 Palette in Tailwind tokens and Antd `ConfigProvider` theme (section 5)
- [x] 1.5 Antd registry and global `Providers` (ConfigProvider and Context)
- [x] 1.6 `utils/` starter helpers (checked for existing helpers first)
- [x] 1.7 Reusable form components (`FormInput`, `FormSelect`, `FormDatePicker`, `FormTextArea`, `FormUpload`, `FormCheckbox`, `FormRadio`, `FormRadioYesNo`)
- [x] 1.8 Supabase clients (browser and server) and `.env.example`
- [x] 1.9 Responsive layout shell (sidebar and mobile drawer) using `public/logo.png` as the seal, with a monogram fallback

**Package manager:** Yarn. Install from the tracked `yarn.lock` with:
```bash
yarn install
```
**Tailwind v4 has no `tailwind.config.ts`; theme tokens go in CSS (`@theme`).**

---

## 11A. Full Phase Checklists (Phases 2 to 8)

> Same workflow as section 0: show the phase checklist, get approval, then do one subtask at a time and tick it `[x]`.
> **Definition of done for every subtask:** uses shared form components, follows the folder rule (`components/`, `page.tsx`, `schema.ts`), mobile responsive, uses palette tokens, no file over 500 lines, `utils/` checked before creating helpers.

### [x] Phase 2: Database & Supabase
- [x] 2.1 Start the local Supabase project and configure `.env.local` (URL, anon key, service role key server-side only); use the alternate local ports in `supabase/config.toml` to avoid the existing backend stack
- [x] 2.2 Migration: enums (`user_role`, `pds_status`, `document_status`, `application_status`, `job_status`, `civil_status`, `education_level`, `question_code`, `other_info_category`)
- [x] 2.3 Migration: `profiles`, `applicants` (with auto `applicant_number` sequence like `APP-0001`) and a trigger on `auth.users` that creates the profile
- [x] 2.4 Migration: `invitations` and `notifications`
- [x] 2.5 Migration: all PDS tables (`pds_versions` and the 12 child tables in section 9)
- [x] 2.6 Migration: `job_postings`, `applications` (with `UNIQUE(job_id, applicant_id)`), `document_types`, `documents`, `document_reviews`, `application_evaluations`, `hiring_decisions`
- [x] 2.7 Seed: global `document_types` via `supabase/seed.sql` and the single local ADMIN account via `scripts/seed-local-admin.mjs`
- [x] 2.8 RLS policies per role (applicant sees only own rows; HR/Evaluator blocked from identity tables; ADMIN manages invitations)
- [x] 2.9 Anonymized views (`v_anonymized_applicants`, `v_anonymized_credibility`, and `v_anonymized_questionnaire`) expose applicant numbers, application context, credibility aggregates, and questionnaire answers without identity fields
- [x] 2.10 Private `applicant-documents` bucket with opaque UUID storage keys, role-scoped object policies, and signed-URL-compatible reads
- [x] 2.11 DB functions/triggers: initial PDS draft, sequential step progress, `clone_pds_version()`, `submit_pds_version()` (sets `has_submitted_pds`), `apply_to_job()`, re-review and notification triggers
- [x] 2.12 Generate TypeScript database types from local Supabase into split `src/types/database*` modules, and type both Supabase clients
- [x] 2.13 Verify RLS and anonymity with test queries as each role (HR/Evaluator cannot read profile rows; anonymous reviewer views expose no identity fields)

### [x] Phase 3: Auth, Invites & Role-Based Routing
- [x] 3.1 `AuthContext` (session, profile, role, `has_submitted_pds`) and a `NotificationContext` shell
- [x] 3.2 `(auth)/register`: applicant-only sign-up (schema.ts, reusable form components)
- [x] 3.3 `(auth)/login`: shared login for all roles with redirect by role
- [x] 3.4 Session refresh and route protection per role (`/applicant`, `/evaluator`, `/hr`, `/admin`) using Next.js 16 `src/proxy.ts` (the installed version deprecates `middleware.ts`)
- [x] 3.5 `admin/invitations`: create an invite (email, role HR/EVALUATOR), list, revoke, resend
- [x] 3.6 `(auth)/invite/[token]`: accept-invite page (set password, profile created with the invited role, token validated and expired/used handling)
- [x] 3.7 First-login guard: applicants without a submitted PDS are redirected to `/applicant/pds`
- [x] 3.8 Role-based navigation config (sidebar items per role) and logout
- [x] 3.9 Notification bell in the header (unread count, list, mark as read)

### [x] Phase 4: Applicant PDS Wizard (with versioning)
- [x] 4.1 Wizard shell: stepper with finished indicators; **steps not clickable until completed**; server-enforced via `completed_steps`
- [x] 4.2 PDS context: load/create the DRAFT, autosave per step, resume at `current_step`
- [x] 4.3 Reusable dynamic-row component (react-hook-form `useFieldArray`) for repeating sections
- [x] 4.4 Constants: country list, blood types, civil statuses, education levels, L&D types, appointment statuses
- [x] 4.5 Step 1: Personal Information (items 1-21, residential and permanent address with same-as toggle)
- [x] 4.6 Step 2: Family Background (spouse, children, father, mother's maiden name)
- [x] 4.7 Step 3: Educational Background (5 levels, period, units, year, honors)
- [x] 4.8 Step 4: Civil Service Eligibility
- [x] 4.9 Step 5: Work Experience (recent first, present job, gov't service, duties description)
- [x] 4.10 Step 6: Voluntary Work
- [x] 4.11 Step 7: Learning & Development
- [x] 4.12 Step 8: Other Information (skills/hobbies, recognitions, memberships)
- [x] 4.13 Step 9: Questionnaire (34A to 40C with conditional detail fields: date filed, case status, ID no.)
- [x] 4.14 Step 10: References (exactly 3)
- [x] 4.15 Step 11: Review & Submit (summary only, no digital oath/photo/signature)
- [x] 4.16 Versioning: "Update PDS" clones the latest SUBMITTED into a new DRAFT; the previous SUBMITTED stays displayed until the new one is SUBMITTED
- [x] 4.17 Submit flow: set `SUBMITTED`, set `has_submitted_pds`, trigger re-review of affected applications and notifications
- [x] 4.18 Per-step yup schemas and mobile check of the stepper (collapses to compact on small screens)

### [x] Phase 5: Applicant Pages
- [x] 5.1 Applicant layout (sidebar, mobile drawer)
- [x] 5.2 Dashboard: PDS status, applications by status, document statuses, recent notifications
- [x] 5.3 Profile: read-only view of the latest SUBMITTED PDS (Personal Info, Education, Work Experience, Trainings, Skills) plus an "Update PDS" button
- [x] 5.4 Jobs list: open postings with search/filter and "already applied" state
- [x] 5.5 Job detail and Apply (one application per job, snapshots `pds_version_id`, anonymized to HR/Evaluator)
- [x] 5.6 My Applications list with status tags
- [x] 5.7 Application detail on a new page (`/applicant/applications/[id]`): status timeline, job info, evaluator remarks
- [x] 5.8 Documents: upload per global document type, view (signed URL), update (new version resets status to `FOR_REVIEW`), status and remarks display; Training and Seminar Certificate uploads capture hours and optionally link to a PDS training entry
- [x] 5.9 Notifications page (full list)

### [x] Phase 6: Evaluator Module
- [x] 6.1 Evaluator layout and navigation
- [x] 6.2 Review queue: anonymized list (Applicant No., credibility, document status) filtered by `FOR_REVIEW`; any evaluator sees all
- [x] 6.3 Applicant review page: credibility data, questionnaire answers, documents (still no identity)
- [x] 6.4 Document viewer (signed URL) with a status action: `VERIFIED` / `REJECTED` / `FOR_RESUBMISSION`, plus remarks
- [x] 6.5 Application evaluation: set `QUALIFIED` / `NOT_QUALIFIED` with remarks once the required documents are verified
- [x] 6.6 Re-review queue (items reset by updated documents or new PDS versions) and notifications
- [x] 6.7 Verify anonymity (no name, sex, age, address, no identity inside file names)

### [x] Phase 7: HR Module
- [x] 7.1 HR layout and navigation
- [x] 7.2 Dashboard: total postings, open postings, total applicants, qualified vs total per posting, pending evaluation count, hired count
- [x] 7.3 Postings list: number of applicants, **qualified / total** evaluated by evaluators
- [x] 7.4 Posting create/edit (title, description, requirements, slots, deadline, status)
- [x] 7.5 Posting detail: anonymized applicants (Applicant No. + credibility only) with filters
- [x] 7.6 Hire action: select applicant by Applicant No. and set `HIRED` / `REJECTED` (`hiring_decisions`), notify the applicant
- [x] 7.7 Printable PDS (CS Form 212 layout, 4 pages) with print CSS; unlocks per the current working default in section 3
- [x] 7.8 Slots/capacity handling and closing a posting

### [ ] Phase 8: QA, Responsiveness & Polish
- [ ] 8.1 Responsive audit of every page (mobile, tablet, desktop)
- [ ] 8.2 Anonymity/RLS audit per role (no direct reads of identity tables, no leaks in URLs, file names or views)
- [x] 8.3 Code standards audit (no file over 500 lines, reuse of form components and `utils/`, folder rule)
- [x] 8.4 Palette/consistency pass (Tailwind tokens and Antd theme in sync)
- [x] 8.5 Loading, error and empty states everywhere; form validation messages
- [x] 8.6 Accessibility pass (labels, focus, contrast)
- [x] 8.7 Demo seed data (fake people only, never the sample PDS data)
- [x] 8.8 README and deployment notes (env vars, Supabase migrations, Vercel)

Phase 8 implementation is in place. Items 8.1 and 8.2 remain open until the app can be checked at browser viewports and the expanded local RLS verification can be run after applying pending migrations.

---

## 12. Environment Notes

- The authoring shell does not expose Node.js or Yarn. Keep `.env.local` private and configure local Supabase before running migration, seed, or RLS verification scripts.
- Uploaded assets: `public/logo.png` (Division of Southern Leyte seal), `school.jpg`, and `PDS-2026.xlsx` (form structure only; it contains real personal data, so never copy it into the repo).
