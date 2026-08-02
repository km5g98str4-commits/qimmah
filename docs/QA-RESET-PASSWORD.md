# QA — Password Reset Flow

Verification guide for Qimmah's password-recovery flow (Sprint A, commit `246ff28`).
Arabic-first web app, hash routing, Supabase Auth (PKCE), deployed on Cloudflare Pages.

> **Safety:** never paste a full recovery URL, `code`, `access_token`, or password into
> logs, screenshots, tickets, or chat. Redact tokens as `…`. Use a throwaway test
> account, never the founder's.

---

## 1. Purpose

Confirm end-to-end that a user can recover access:
request a reset email → open it → land on the in-app reset screen → set a new
password → sign in with it. This flow was previously broken (email opened
`localhost`, no in-app screen to set the password).

## 2. What the code does (source of truth)

- `src/lib/authContext.tsx` → `resetPassword(email)` calls
  `supabase.auth.resetPasswordForEmail(email, { redirectTo })` where
  `redirectTo = ${window.location.origin}${window.location.pathname}#/reset`
  (dynamic — no hardcoded host).
- `src/lib/authContext.tsx` → `updatePassword(password)` calls
  `supabase.auth.updateUser({ password })` on the active recovery session.
- `src/lib/appRoutes.ts` → public `reset` route; `routeFromHash` tolerates a
  trailing recovery-token fragment.
- `src/views/ResetPasswordView.tsx` → the set-new-password screen. Keys off
  `auth.session`: present → form; absent → calm expired-link state. Signs out on
  success so the user logs in fresh.

## 3. Prerequisites (founder / production, one-time)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://qimmah-8qp.pages.dev`
- **Redirect URLs (allow-list):**
  - `https://qimmah-8qp.pages.dev/*`
  - `http://localhost:5173/*` (local dev only)

Supabase → **Authentication → Providers → Email**: password min length ≥ 8
(matches the client policy in `src/lib/passwordPolicy.ts`).

Without the allow-list entry, Supabase falls back to Site URL and the reset link
may not return to the app.

## 4. Test account guidance

- Create a dedicated throwaway account (e.g. an alias inbox you control).
- Do **not** use the founder's real account or any real user's email.
- Confirm the account's email first (recovery is only sent to existing users).

## 5. Step-by-step test (deployed site)

| # | Step | Expected |
|---|------|----------|
| 1 | Open `https://qimmah-8qp.pages.dev/#/login` | Login screen (Arabic, RTL) |
| 2 | Tap **نسيت كلمة المرور؟** | Forgot screen, key icon, single email field |
| 3 | Enter the test email → **إرسال رابط الاستعادة** | Generic notice: «إن كان البريد مسجّلًا لدينا…» (does **not** reveal whether the account exists) |
| 4 | Open the email, inspect the link (don't click yet) | Points to `https://qimmah-8qp.pages.dev/...#/reset` (deployed origin, **not** localhost) |
| 5 | Click the link | Lands on the reset screen with **two** password fields («كلمة المرور الجديدة» + «تأكيد كلمة المرور») |
| 6 | Enter a **weak** password (e.g. `abc`) | Calm error: «كلمة المرور ضعيفة — ٨ أحرف على الأقل مع حرف ورقم.» — submit stays disabled/blocked |
| 7 | Enter a valid password but a **mismatched** confirmation | Calm error: «كلمتا المرور غير متطابقتين…» |
| 8 | Enter a valid, matching password → **حفظ كلمة المرور** | Success state: «تم تحديث كلمة المرور بنجاح.» + one CTA back to login |
| 9 | Observe session | User is signed out (recovery session ended) |
| 10 | Go to Login, sign in with the **new** password | Succeeds → dashboard/onboarding |
| 11 | Sign out, try the **old** password | Fails (invalid credentials) |
| 12 | Re-open the **same** reset link | Calm expired-link state: «الرابط لم يعد صالحًا» + back CTA (link is single-use / expired) |

## 6. Expected URL shapes

- **Reset request redirect target:** `https://qimmah-8qp.pages.dev/#/reset`
- **Email link after Supabase verify (PKCE):**
  `https://qimmah-8qp.pages.dev/?code=…#/reset` — `code` in the query, `#/reset`
  in the hash (no collision). `detectSessionInUrl: true` exchanges the code into
  a session automatically.
- **Direct visit with no session:** `https://qimmah-8qp.pages.dev/#/reset` →
  expired-link state (correct — nothing to reset).

## 7. Security checks (must all hold)

- [ ] Request copy never reveals whether an email is registered (no enumeration).
- [ ] `redirectTo` resolves to the deployed origin, never `localhost`, in production.
- [ ] No token, `code`, or password is logged to the console or network beyond the
      Supabase SDK's own auth calls.
- [ ] `updateUser({ password })` requires a valid session; direct `#/reset` with no
      session cannot set a password.
- [ ] Reset link is single-use / time-limited (Supabase default) → step 12 shows expired.
- [ ] No `service_role` key anywhere in the client bundle.

## 8. What NOT to log or share

- Full recovery URLs, `code`, `access_token`, `refresh_token`.
- The test account password.
- Real user emails.
- Anything from `src/lib/supabaseClient.ts` beyond the public anon key (which is
  safe and RLS-protected).

## 9. Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| Link opens localhost | Site URL / Redirect URLs not updated | Apply §3 in Supabase dashboard |
| Lands on app but shows expired state immediately | Redirect URL not allow-listed → session not established; or link already used/expired | Verify §3; request a fresh link |
| "Cloud sync unavailable" on forgot screen | Supabase not configured in this build | Check `VITE_SUPABASE_*` / built-in defaults in `src/lib/supabaseClient.ts` |
| Form never appears, only expired state | `detectSessionInUrl` didn't find the recovery session | Confirm the email link's origin is allow-listed; check the link wasn't reused |
| Weak/mismatch errors don't show | Policy regression | Check `src/lib/passwordPolicy.ts` + `ResetPasswordView` validation |

## 10. Automated coverage (current)

- Route resolution + expired-state render verified locally via a headless drive
  (`#/reset` → hash stays `#/reset`, expired title renders, 0px horizontal overflow).
- The **recovery-session form** path (session present → `updateUser`) is
  type-checked and gated in code but requires a live Supabase recovery session to
  exercise end-to-end — run §5 on the deployed/preview environment.

---

_Owner: engineering. Update this doc if the reset route, redirect shape, or Supabase
URL configuration changes._
