# UI/UX Audit

**Date:** 2026-11-07  
**Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Ant Design 6, React Hook Form, Supabase.

## Screen and route inventory

| Area | Routes/screens | Main states and interactions |
|---|---|---|
| Public | `/` | Project overview, sign-in and registration links. The copy still described modules as future work after the workflows had shipped. |
| Authentication | `/login`, `/register`, `/invite/[token]` | Validation, submitting, authentication errors, invitation status and expired/invalid invitation states. |
| Admin | `/admin/invitations` | Invitation list, create/revoke actions, empty state, validation and action errors. |
| Applicant | `/applicant`, `/applicant/dashboard`, `/applicant/pds`, `/applicant/profile` | Role redirect; dashboard summaries; 11-step PDS with validation, autosave, saved/submitted versions; profile details and unavailable/empty states. |
| Applicant | `/applicant/jobs`, `/applicant/jobs/[id]` | Search/filter, posting list/detail, application action, closed/full/expired states and empty results. |
| Applicant | `/applicant/applications`, `/applicant/applications/[id]` | Application list/detail, status timeline, empty and unavailable states. |
| Applicant | `/applicant/documents`, `/applicant/notifications` | Document upload/review status, notification list/read action, loading, empty, and unavailable states. |
| Evaluator | `/evaluator/reviews`, `/evaluator/applications/[id]`, `/evaluator/documents/[id]` | Anonymized queue, applicant review, evaluation form, document review, filters, pending actions, empty and unavailable states. |
| HR | `/hr/dashboard`, `/hr/postings`, `/hr/postings/new`, `/hr/postings/[id]`, `/hr/postings/[id]/edit` | Hiring totals, posting management, applicant filters, hire/reject confirmations, capacity/deadline states, validation and unavailable/empty states. |
| HR | `/hr/applications/[id]/pds` | Authorized printable four-page PDS and print action. Print colors and page geometry are intentionally fixed for paper output. |

## Shared component and state inventory

- `AppShell`, `Header`, `Sidebar`, and `MobileDrawer`: desktop navigation, compact mobile header, role-aware nav, sign-out, notification popover, and keyboard/focus behavior.
- `FieldFrame` and reusable Ant Design form controls: labels, hints, required indicators, validation messages, and upload controls.
- `PageHeader`, `EmptyState`, `StatusTag`, and `WorkflowStatusTag`: page hierarchy, empty/error surfaces, and workflow statuses.
- Ant Design buttons, alerts, popovers, badges, forms, and confirmation dialogs provide disabled, loading, validation, and action feedback states.
- Route-level `loading.tsx`, `error.tsx`, and `not-found.tsx` provide global loading, recovery, and unknown-route states.
- Icons are consistently from `@ant-design/icons`; the brand seal uses `next/image`. Other public image assets were preserved and are not referenced by the current interface.

## Pain points found

1. The existing palette was duplicated between CSS and the Ant Design provider, and its page, panel, border, and text utilities assumed a light theme. There was no user-selectable theme preference.
2. Many pages used raw `bg-white`, slate text/border classes, and locally composed cards. This made surface and contrast changes difficult to apply consistently.
3. Shared navigation and action targets were often 40px, below the 44px mobile target in the brief. Motion preferences and a shared skeleton treatment were not defined.
4. The landing page still presented the product as a foundation preview even though the main applicant, evaluator, HR, and admin workflows existed.
5. PDS print styling is intentionally dense and fixed to paper colors; it should remain isolated from interactive theme changes.

## Three journeys to prioritize

1. **Applicant:** create account or sign in → complete and submit the 11-step PDS → browse a posting → apply → follow application status and notifications.
2. **Evaluator:** open the review queue → inspect anonymized applicant and supporting documents → record an evaluation result.
3. **HR:** create/open a posting → review anonymized applicants and capacity → hire or reject → access the authorized printable PDS for a hired applicant.

Admin invitation management remains a supporting staff journey and must keep its existing role restrictions and actions.

## Success criteria

- Preserve all existing routes, permissions, form schemas, server actions, database calls, and workflow rules.
- Use shared semantic design tokens for interactive surfaces and synchronize Ant Design with the active theme.
- Offer light, dark, and system preference; maintain readable contrast and visible focus states.
- Keep layouts usable at 320px through 1920px, with no horizontal overflow, and make common mobile controls at least 44px tall.
- Preserve route-level loading, empty, error, validation, pending, and disabled states; provide a shared skeleton where it improves clarity.
- Run the existing lint/build checks. Automated accessibility and cross-device checks are recorded separately if the required browser tooling is unavailable.
