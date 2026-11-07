# TASK: Refactor UI/UX to a Modern Style

> **Audience:** AI coding agents and developers.
> **Instruction:** Work through the phases in order. Mark each item `[x]` when done. Do not skip phases. Do not change business logic or data flow, only presentation and interaction.

## 1. Objective

Refactor the existing UI/UX into a modern, clean, accessible, responsive interface built on a consistent design system.

**Target style:**
- Clean layout with generous whitespace
- Rounded, minimal components
- Subtle shadows and smooth animations
- Mobile-first responsive design
- Light and dark mode
- WCAG 2.1 AA accessibility

## 2. Constraints and Rules

1. **Do not break functionality.** Existing features, routes, APIs, and state logic must keep working.
2. **Detect the stack first** (React, Vue, Flutter, Svelte, plain HTML, etc.) and use its idioms. Do not introduce a new framework unless asked.
3. **Reuse before creating.** Extend existing components where possible.
4. **No hard-coded values.** Colors, spacing, radius, shadows, and font sizes must come from design tokens.
5. **Work in small steps.** One component or screen per change, and verify the app still builds and runs after each.
6. **Ask before destructive changes** (deleting files, renaming public components, changing dependencies).
7. **Document decisions** in a `CHANGELOG` or the PR description.

## 3. Design Token Spec (use as default unless the project already defines its own)

| Token group | Guidance |
|---|---|
| Spacing | 4px base grid: 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius | sm 6px, md 10px, lg 16px, full 9999px |
| Shadows | 3 levels: subtle (cards), medium (dropdowns), large (modals) |
| Typography | Inter, Geist, or system font stack; scale: 12, 14, 16, 18, 24, 32, 40 |
| Colors | Primary, neutral scale (50–900), semantic: success, warning, error, info |
| Motion | Duration 150–250ms, easing `ease-out` |
| Icons | One icon set only (e.g., Lucide or Heroicons) |

## 4. Task Checklist

### Phase 1: Audit and Planning
- [x] Inspect the current UI; list every screen, route, and component state
- [x] Record pain points: clutter, inconsistency, confusing navigation, slow flows
- [x] Identify the top 3 user journeys to improve first
- [x] Write findings to `docs/ui-audit.md`
- [x] Define success criteria (see Section 5)

### Phase 2: Design System Foundation
- [x] Create a central tokens file (CSS variables, Tailwind config, theme object, or equivalent)
- [x] Define color palette (light and dark themes)
- [x] Define typography scale and font stack
- [x] Define spacing, radius, shadow, and motion tokens
- [x] Implement theme switching (light, dark, system preference)
- [x] Standardize on one icon set and replace mixed icons

### Phase 3: Component Refactor
Each component must support: default, hover, focus, active, disabled, loading, and error states where applicable.

- [x] Button (primary, secondary, ghost, destructive, disabled, loading)
- [x] Input, textarea, select, checkbox, radio, toggle, with validation states
- [x] Card
- [x] Modal and drawer
- [x] Dropdown, tooltip, popover
- [x] Table and list (sorting, filtering, empty state)
- [x] Navigation (top bar, sidebar, breadcrumbs, tabs)
- [x] Toast, alert, badge
- [x] Skeleton loader

### Phase 4: Layout and Structure
- [x] Convert layouts to responsive grid/flex, mobile-first
- [x] Define breakpoints (Tailwind defaults: 640, 768, 1024, 1280, and 1536px)
- [x] Increase whitespace and remove visual noise
- [x] Simplify navigation; expose key actions in responsive navigation and page headers
- [x] Establish a clear visual hierarchy on every page
- [x] Add empty states to data views and shared loading/error fallbacks across routes

### Phase 5: Interaction and Motion
- [x] Add hover, focus, and press micro-interactions
- [x] Apply consistent transitions using motion tokens
- [x] Replace the notification spinner with a skeleton; use skeleton fallbacks for route loading
- [x] Respect `prefers-reduced-motion`

### Phase 6: Accessibility
- [x] Text contrast ratio of at least 4.5:1 (3:1 for large text) for the shared palette pairs checked
- [x] Full keyboard navigation with a visible focus ring
- [x] Use semantic HTML; add ARIA labels only where needed
- [x] Touch targets of at least 44x44px on mobile for interactive controls and primary links
- [x] Form fields have labels, error messages are announced
- [x] Run axe-core checks on public routes in Chrome and Edge; run explicit light/dark scans on those routes and Admin invitations in Edge (no violations found)
- [ ] Review authenticated workflows and keyboard behavior with a screen reader

### Phase 7: Performance and Polish
- [x] Optimize images (Next.js Image optimizer, responsive formats, and lazy loading)
- [x] Audit unused CSS, components, and dependencies (none found; unused starter assets were left intact)
- [x] Check public routes in Chrome and Edge at 320px and 1920px; authenticated viewports remain
- [x] Verify interactive pages use design tokens and shared components; print PDS retains paper colors

### Phase 8: Testing and Release
- [x] Check existing unit, integration, and e2e test availability; none are configured, and the production build passes
- [ ] Add visual regression or snapshot tests for key components
- [x] Update component documentation (README)
- [x] Prepare gradual rollout (feature flag or beta) if applicable (not applicable; theme is user-selectable and no feature-flag system exists)
- [x] Summarize changes in the changelog

> Verification note: `yarn build` passes. Axe-core found no violations on `/`, `/login`, and `/register` in Chrome 156 and Edge 156; explicit light/dark scans of those routes and `/admin/invitations` also passed in Edge. Public routes and Admin invitations had no horizontal overflow at 320px or 1920px. The mobile drawer opens, focuses its close button, and closes on Escape. Keyboard Tab focuses the skip link first with a visible 3px outline. There are no unit/e2e, Lighthouse, or visual-regression scripts in this package. `yarn lint` still reports existing hook purity/effect and printable-PDS errors; see `CHANGELOG.md`. Applicant/HR/Evaluator viewports and screen-reader checks remain open.

## 5. Acceptance Criteria (Definition of Done)

- [x] All interactive screens use shared design tokens and components
- [x] Light/dark switching works on public routes and Admin invitations; shared palette text pairs checked meet AA contrast
- [ ] Layout works from 320px to 1920px wide with no horizontal scroll on every route (public and Admin routes pass; Applicant/HR/Evaluator routes need signed-in QA)
- [ ] Lighthouse accessibility score of 90 or higher (Lighthouse is not installed)
- [ ] No functional regressions; all existing tests pass (no test suite is configured; production build passes)
- [x] Data views have empty states, with shared loading and error fallbacks across routes
- [x] Documentation is updated

## 6. Output Expected From the Agent

1. Code changes, committed in small logical steps
2. Updated checklist with completed items marked `[x]`
3. A short summary: what changed, what was skipped and why, and any follow-up recommendations
4. A list of open questions or assumptions

### Assumptions and follow-up

- The theme preference is per-browser and defaults to the operating system setting.
- Automated accessibility and viewport checks covered public routes. Authenticated workflows need local Supabase accounts, and a screen-reader review still needs to be done.
- Lighthouse and visual-regression checks remain open because neither tool is configured in this project.

## 7. Quick-Start Prompt

> Refactor the UI/UX of this project to a modern style following `UI_UX_MODERNIZATION.md`. Detect the stack, build design tokens and reusable components first, then apply them screen by screen. Keep all existing functionality intact, support dark mode and responsive layouts, and meet WCAG AA. Update the checklist as you progress.
