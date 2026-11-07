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
- [ ] Create a central tokens file (CSS variables, Tailwind config, theme object, or equivalent)
- [ ] Define color palette (light and dark themes)
- [ ] Define typography scale and font stack
- [ ] Define spacing, radius, shadow, and motion tokens
- [ ] Implement theme switching (light, dark, system preference)
- [ ] Standardize on one icon set and replace mixed icons

### Phase 3: Component Refactor
Each component must support: default, hover, focus, active, disabled, loading, and error states where applicable.

- [ ] Button (primary, secondary, ghost, destructive, disabled, loading)
- [ ] Input, textarea, select, checkbox, radio, toggle, with validation states
- [ ] Card
- [ ] Modal and drawer
- [ ] Dropdown, tooltip, popover
- [ ] Table and list (sorting, filtering, empty state)
- [ ] Navigation (top bar, sidebar, breadcrumbs, tabs)
- [ ] Toast, alert, badge
- [ ] Skeleton loader

### Phase 4: Layout and Structure
- [ ] Convert layouts to responsive grid/flex, mobile-first
- [ ] Define breakpoints (e.g., 640, 768, 1024, 1280px)
- [ ] Increase whitespace and remove visual noise
- [ ] Simplify navigation; reduce clicks to key actions
- [ ] Establish a clear visual hierarchy on every page
- [ ] Add empty, error, and loading states to every screen

### Phase 5: Interaction and Motion
- [ ] Add hover, focus, and press micro-interactions
- [ ] Apply consistent transitions using motion tokens
- [ ] Replace spinners with skeleton screens where possible
- [ ] Respect `prefers-reduced-motion`

### Phase 6: Accessibility
- [ ] Text contrast ratio of at least 4.5:1 (3:1 for large text)
- [ ] Full keyboard navigation with a visible focus ring
- [ ] Use semantic HTML; add ARIA labels only where needed
- [ ] Touch targets of at least 44x44px on mobile
- [ ] Form fields have labels, error messages are announced
- [ ] Verify with an automated tool (axe, Lighthouse) and a screen reader

### Phase 7: Performance and Polish
- [ ] Optimize images (WebP/AVIF, lazy loading)
- [ ] Remove unused CSS, components, and dependencies
- [ ] Check cross-browser and cross-device rendering
- [ ] Verify every page uses design tokens and shared components (no leftovers)

### Phase 8: Testing and Release
- [ ] Run existing unit, integration, and e2e tests; fix regressions
- [ ] Add visual regression or snapshot tests for key components
- [ ] Update component documentation (Storybook or README)
- [ ] Prepare gradual rollout (feature flag or beta) if applicable
- [ ] Summarize changes in the PR or changelog

## 5. Acceptance Criteria (Definition of Done)

- [ ] All screens use shared design tokens and components
- [ ] Light and dark modes both work with no contrast failures
- [ ] Layout works from 320px to 1920px wide with no horizontal scroll
- [ ] Lighthouse accessibility score of 90 or higher
- [ ] No functional regressions; all existing tests pass
- [ ] Every screen has loading, empty, and error states
- [ ] Documentation is updated

## 6. Output Expected From the Agent

1. Code changes, committed in small logical steps
2. Updated checklist with completed items marked `[x]`
3. A short summary: what changed, what was skipped and why, and any follow-up recommendations
4. A list of open questions or assumptions

## 7. Quick-Start Prompt

> Refactor the UI/UX of this project to a modern style following `UI_UX_MODERNIZATION.md`. Detect the stack, build design tokens and reusable components first, then apply them screen by screen. Keep all existing functionality intact, support dark mode and responsive layouts, and meet WCAG AA. Update the checklist as you progress.
