# Changelog

## 2026-11-07 — UI/UX modernization

- Added centralized light/dark palettes, layout and motion tokens, and System/Light/Dark theme selection. The preference is local to the browser and defaults to the OS theme.
- Added shared surface cards and skeleton loading, standardized empty/error surfaces, and synchronized Ant Design with the active palette.
- Migrated interactive routes to semantic surface, text, border, and status colors; updated the public overview to describe the shipped applicant, evaluator, and HR workspaces.
- Improved small-screen navigation, skip navigation, focus visibility, reduced-motion behavior, loading feedback, and minimum touch targets for primary actions.
- Kept the printable PDS on its paper-specific styles. The brand mark uses Next.js `Image`, which applies lazy loading and responsive image optimization.
- No package dependencies or business data flows were changed.

### Verification and follow-up

- `yarn build` passes.
- `axe-core` reported no violations on `/`, `/login`, or `/register` in headless Chrome 156 and Edge 156, including explicit light and dark mode runs in Edge. Those routes had no horizontal scroll at 320px or 1920px in either browser.
- The local Admin account reached `/admin/invitations`; axe-core reported no violations in either theme after correcting Ant Design primary-button text contrast in dark mode. The page had no horizontal overflow at 320px or 1920px, and the mobile navigation opened, focused its close action, and closed on Escape.
- A keyboard Tab check focuses the skip link first and shows its 3px focus outline.
- A 320px screenshot review caught a shortened mobile brand label; the header now shows “Southern Leyte” without truncation.
- `yarn lint` still reports existing React Hooks purity/effect and PDS try/catch errors, plus warnings in local RLS scripts and React Hook Form `watch()` usage. The UI-only edits did not change those workflows.
- The package defines no unit, integration, e2e, Lighthouse, or visual-regression scripts. Manual screen-reader review and authenticated cross-device review remain follow-up checks.
- Static palette checks measured at least 4.5:1 for primary, danger, success, warning, info, ink, and muted text against the light and dark panels. This does not replace a page-by-page assistive-technology audit.
