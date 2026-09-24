---
name: ui-component
description: Build or change a reusable UI component in apps/web (shared/ui or a shared feature widget) — design tokens, mobile-first, variants, accessibility, test. Use when adding UI kit components or widgets used on more than one page.
argument-hint: '[ComponentName] [purpose]'
---

Build the component: $ARGUMENTS

1. **Reuse first.** Look in `apps/web/src/shared/ui` for a component to extend before creating a new one.
2. **API.** Typed props; `variant` / `size` resolved through a variant map object, not ad-hoc class strings at call sites; native props forwarded; `className` as the last-resort escape hatch.
3. **Styling.** Tailwind 4 utilities that reference the tokens in `styles/tokens.css` (`@theme`) only — no raw hex or arbitrary colours. Mobile-first: base styles for phones, `md:` / `lg:` extend them. The tenant colour comes from `--color-primary`.
4. **Accessibility.** Semantic element, label / accessible name, visible focus, keyboard support (Esc closes Modal and Drawer, focus is trapped inside them), sufficient contrast.
5. **States.** Disabled, loading, error and empty where they apply.
6. **Test** with Vitest and Testing Library: renders, variants, queries by role and name, interactions.
7. Export it from the `shared/ui` index and run `/check`.
