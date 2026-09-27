---
name: ui-component
description: Build or change a reusable UI component in apps/web (components/ui or a shared feature widget) — design tokens, mobile-first, variants, accessibility, test. Use when adding UI kit components or widgets used on more than one page.
argument-hint: '[ComponentName] [purpose]'
---

Build the component: $ARGUMENTS

1. **Reuse first.** Look in `apps/web/src/components/ui` (shadcn/ui on Base UI, D-062) for a component to extend. If the kit lacks it, add it with the shadcn CLI (`npx shadcn add <name>` in `apps/web`), then adapt the generated file; write a component by hand only when shadcn has none.
2. **API.** Typed props; `variant` / `size` resolved through a variant map object, not ad-hoc class strings at call sites; native props forwarded; `className` as the last-resort escape hatch.
3. **Styling.** Tailwind 4 utilities that reference the tokens in `styles/tokens.css` (shadcn CSS variables + `@theme inline`) only — no raw hex or arbitrary colours. Mobile-first: base styles for phones, `md:` / `lg:` extend them. The tenant colour comes from `--primary` (and `--ring`).
4. **Accessibility.** Semantic element, label / accessible name (`form-field` wires label, hint and error), visible focus, keyboard support (Base UI handles Esc and focus trapping in Dialog, Sheet, Popover and Select), sufficient contrast. Links styled as buttons are router `Link`s with `buttonVariants`.
5. **States.** Disabled, loading, error and empty where they apply.
6. **Test** with Vitest and Testing Library: renders, variants, queries by role and name, interactions.
7. Put it in `components/ui/<name>.tsx` (kebab-case, as the CLI writes them; imported from its own file, there is no index) and run `/check`.
