---
name: ui
description: Reuse-first rules for writing or editing React / Next.js UI code. Always check for existing components, utils, hooks and form fields before creating anything new; style only with Tailwind classes; use Heroicons for every icon; build forms with Ant Design inputs wrapped in reusable form components, validated with react-hook-form + yup. Use this skill whenever the user asks to build, add, change, refactor or restyle any page, component, form, modal, table, layout, helper or utility in a frontend codebase, even if they don't mention reuse, Tailwind, Ant Design, icons or forms.
---

# Reuse-first frontend

A codebase stays maintainable when each thing exists once. Duplicate components drift apart, fix one bug three times, and make the UI inconsistent. So the default move is to find what already exists and use it, and to create something new only when nothing fits.

## 1. Look before you write (always)

Do this discovery before writing any component, form field, helper or style, even for "small" requests:

1. Find the shared folders: look for `components/`, `components/ui/`, `components/forms/`, `common/`, `shared/`, `hooks/`, `utils/`, `lib/`, `helpers/`, `validators/`, `schemas/`, `constants/`. Open the index files to see what is exported.
2. Search by purpose, not just by name. For a "status badge" also search for `Badge`, `Tag`, `Chip`, `Status`; for a date format, search `format`, `date`, `dayjs`. Use `grep -ri` / `rg` on likely keywords.
3. Check how a similar page already does it. Copy its patterns (imports, props, folder placement).
4. Check `package.json` before adding a dependency. If a library already covers the need, use it.

Then decide, in this order:

| Situation                               | Action                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| An existing component/util does the job | **Use it as is.**                                                                  |
| It almost fits                          | **Extend it**: add a prop or variant, keep existing callers working.               |
| Several small ones cover it             | **Compose** them.                                                                  |
| Nothing fits                            | **Create a new one in the shared folder**, generic and typed, not inside the page. |

Never copy-paste a component into a page and tweak it. Never write a new helper before searching `utils/`.

## 2. Components and utils

- New shared components go where the project keeps shared components, follow its naming and export style, and are generic (props for content, variants, sizes), with no hard-coded page data.
- If the same markup or class string appears twice, extract it into a component.
- Put pure helpers (formatting, parsing, mapping, constants) in `utils/` or the project's equivalent, with types. Do not define them inline in components.
- Reuse existing hooks and constants (status labels, roles, routes) instead of re-declaring strings.

## 3. Styling: Tailwind classes only

- Style with Tailwind utility classes in `className`. Do not add inline `style={{}}`, CSS modules, styled-components or new `.css` rules for things Tailwind can express.
- Use the project's theme tokens (colors, spacing, fonts in `tailwind.config`) before arbitrary values like `text-[#1f6b45]`. Reach for an arbitrary value only when no token fits, and consider adding a token instead.
- Join conditional classes with the project's helper (`cn`, `clsx`, `twMerge`) if one exists; look in `utils/` first.
- The only acceptable `style` prop is a truly dynamic runtime value (for example a computed width or a CSS variable) that Tailwind cannot express.
- Ant Design components are styled through `className` and Tailwind where possible. Global overrides belong in the existing theme/config (`ConfigProvider`), not scattered per page.

## 4. Icons: Heroicons only

Use the `@heroicons/react` package for every icon, so the icon set looks consistent and nothing else gets bundled.

- Import from the style/size folder that matches the context: `@heroicons/react/24/outline` for general UI, `24/solid` for filled or active states, `20/solid` for compact spots like inputs, buttons and badges.
- Size and color them with Tailwind classes (`className="h-5 w-5 text-green-700"`), never with `size` or `color` props.
- Name imports with the icon's own name (`import { BellIcon } from '@heroicons/react/24/outline'`).
- Pass them into Ant Design through its icon slots (`<Button icon={<PlusIcon className="h-4 w-4" />}>`, `Input prefix`, `Menu` items).
- Do not add `@ant-design/icons`, `lucide-react`, `react-icons`, emoji or hand-written inline SVGs for icons. If Heroicons has no icon that fits, pick the closest one, and mention the gap in your closing note instead of switching libraries.
- Check first for an existing shared icon wrapper or icon map (for example a status-to-icon mapping) and reuse it.

## 5. Forms: Ant Design + react-hook-form + yup

Every form follows the same three-layer pattern so forms stay consistent and cheap to build:

- **Fields: Ant Design.** Use antd inputs (`Input`, `Select`, `DatePicker`, `Checkbox`, `Radio.Group`, `Switch`, `Input.TextArea`, `Upload`, ...), never raw `<input>` or another UI library.
- **Reusable field wrappers.** Each antd input type has one wrapper (for example `FormInput`, `FormSelect`, `FormDatePicker`) that binds it to react-hook-form with `Controller`, wraps it in `Form.Item`, and shows the yup error message. Pages use the wrappers, not bare antd inputs with hand-written `Controller` code. If a wrapper for that input type doesn't exist yet, create it once in the shared forms folder, then use it. Templates are in `references/form-patterns.md`.
- **Validation: react-hook-form + yup.** Define a yup schema, connect it with `yupResolver`, and infer the value type with `yup.InferType`. Do not use antd's `rules` prop or write manual validation in handlers; yup is the single source of truth.

Before writing a schema, search for existing schemas and reusable rules (email, phone, required text, date ranges) in `schemas/`, `validators/` or `utils/`, and import them. Add new shared rules there, not inline in the page.

Always set `defaultValues`, show loading/disabled state on submit via `formState.isSubmitting`, and keep submit handlers thin (call an existing API/service function).

## 6. Finish by saying what you reused

End each task with a short note: which existing components/utils/schemas you reused, which you extended, and anything new you created and where. This lets the user catch a missed existing component quickly. If you couldn't find a shared folder at all (new project), say so and propose a structure before creating one.

## Quick self-check before you hand back code

- Did I search for an existing component, util and schema for each piece?
- Is there any duplicated markup or logic I should have extracted?
- Is everything styled with Tailwind classes (no stray `style`, CSS files)?
- Are all icons from `@heroicons/react`, sized with Tailwind classes?
- Are all form inputs antd, wrapped in reusable form components, with yup + `yupResolver` for validation?
