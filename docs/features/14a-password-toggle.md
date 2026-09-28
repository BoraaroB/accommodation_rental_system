# Feature 14a — Password toggle

- **Branch:** `feat/password-toggle`
- **Status:** PR merged — #31, 2026-09-28

## Goal and scope

A change of plan asked for by the repository owner between features 14 and 15: every password field gets an eye button that shows and hides the password, as most apps have. Sign-in, registration and the admin's host form are the three password fields. Validation, requests and errors do not change.

## Decisions

- **D-073** (new): `PasswordInput` on the kit's `InputGroup`, a toggle button with one accessible name and `aria-pressed`, no autocapitalisation or autocorrection while the password is shown.
- The component lives in `components/` next to `MoneyInput`, the other shared input built on `InputGroup`; `components/ui` keeps the generated kit.

## What was done

- `components/PasswordInput.tsx`: the input and an `InputGroupButton` (`EyeIcon` / `EyeOffIcon`) that switches the type between `password` and `text`; every other prop, including the ref from `register`, goes to the input.
- `LoginForm`, `RegisterForm` and `AddHostForm` use `PasswordInput` instead of `Input type="password"`.
- Docs: `implementation-plan.md` (changes table and feature table), `architecture.md`, `decisions.md`.

## Key files

- `apps/web/src/components/PasswordInput.tsx`, `PasswordInput.spec.tsx`
- `apps/web/src/features/auth/components/LoginForm.tsx`, `RegisterForm.tsx`
- `apps/web/src/features/admin/components/AddHostForm.tsx`

## Verification

| Command                         | Result                                                                  |
| ------------------------------- | ----------------------------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                                   |
| `npm test`                      | shared 238, API 227, web 246 (3 new: toggle, label and hint, no submit) |
| `npm run build`, `format:check` | green                                                                   |
| `npm run test:e2e -w apps/api`  | not run: the API is unchanged                                           |
| Review of the diff              | no blocking findings; the label check was added to the spec             |

## Deliberately left out

- No change to the kit's `Input`: a password type there would have to wrap itself in an `InputGroup`, whose `InputGroupInput` renders `Input`.

## Possible improvements (not in the plan)

- Hide the password again when its form is submitted, so it is never sent from a plain text field (comment in `apps/web/src/components/PasswordInput.tsx`).

## Commit message

One commit on `feat/password-toggle`, merged into `main` by merge commit `25cc35a` (PR #31).

`d0857e2`:

```
feat(web): add a show/hide toggle to password fields

- PasswordInput on the kit's InputGroup with an eye toggle button
- Sign-in, registration and the admin's host form use it
- One accessible name with aria-pressed; the toggle never submits
- D-073; plan, architecture and progress updated
```
