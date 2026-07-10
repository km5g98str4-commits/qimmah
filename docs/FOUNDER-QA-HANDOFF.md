# Qimmah — Founder QA Handoff

What to test manually before Codex review. Everything below is **local only** —
nothing is pushed, merged, or deployed. Codex review is **on hold** until you ask.

Related docs: [`QA-RESET-PASSWORD.md`](./QA-RESET-PASSWORD.md) · [`APP-READINESS.md`](./APP-READINESS.md) ·
[`release-checklist.md`](./release-checklist.md) · [`ios-setup.md`](./ios-setup.md).

Visual QA artifact: https://claude.ai/code/artifact/42b82397-5a99-4947-b394-f8d5773cb699

> **Safety while testing:** use a throwaway account, never your real one. Never paste
> a full recovery URL, `code`, `access_token`, or password into logs/tickets/chat — redact as `…`.

---

## 1. Current local commit stack

| Hash | What |
|---|---|
| `9671c0f` | App/TestFlight readiness pack + branding cleanup (HEAD) |
| `042b061` | reset-password QA doc |
| `f29348c` | privacy analytics disclosure |
| `9ba03a3` | account-deletion hardening (no false success) |
| `246ff28` | password-reset flow (redirect + recovery route) |
| `f622075` | web hardening + machine-based plans |

Two untracked review patches (`phase3-final-review.patch`, `phase3-fix-review.patch`)
are intentionally left as-is — do not commit/delete/gitignore them.

## 2. What is ready (code complete, gates green)

- ✅ Password-reset flow: dynamic `redirectTo` → in-app `#/reset` screen → set new password → expired-link state.
- ✅ Account deletion: honest — only reports success / signs out / wipes when the auth user is actually deleted; otherwise a calm failure with retry + contact.
- ✅ Privacy: analytics disclosed in the Privacy Policy; opt-out toggle; PII-free; no-op by default.
- ✅ Web hardening: Arabic-first RTL, deep-night + warm-stone, machine-based default plans, App Coming Soon card (no fake button), 0px overflow at 320/390.
- ✅ Docs: reset QA, app readiness, this handoff.

## 3. What must be manually tested (needs live Supabase / staging — could not be exercised in the sandbox)

1. **Reset password** end-to-end on the deployed site (§4).
2. **Account deletion** on a staging/test account, incl. the **failure path** (§5).
3. **Visual QA** of the auth-gated screens a logged-in user sees (§6).

These three are the gap between "code-verified" and "product-verified." Everything else is verified.

## 4. Reset password — exact test steps (deployed site)

Prereq: Supabase → Auth → URL Configuration has Site URL `https://qimmah-8qp.pages.dev`
and Redirect URLs allow `https://qimmah-8qp.pages.dev/*` (+ `http://localhost:5173/*` for dev).
You reported this is handled — step 4 confirms it.

1. Open `https://qimmah-8qp.pages.dev/#/login` → tap **نسيت كلمة المرور؟**.
2. Enter the test email → **إرسال رابط الاستعادة**. Expect the generic notice
   («إن كان البريد مسجّلًا لدينا…») — it must **not** reveal whether the account exists.
3. Open the email; **inspect the link without clicking** — it must point to
   `https://qimmah-8qp.pages.dev/...#/reset` (deployed domain, **not** localhost).
4. Click it → the reset screen appears with **two** password fields.
5. Try a **weak** password → calm error, blocked. Try a **mismatched** confirm → calm error.
6. Enter a valid, matching password → **حفظ كلمة المرور** → success state; you are signed out.
7. Log in with the **new** password → succeeds.
8. Sign out, try the **old** password → fails.
9. Re-open the **same** email link → expired-link state («الرابط لم يعد صالحًا»).

Pass = all nine behave as described. Details/troubleshooting in `QA-RESET-PASSWORD.md`.

## 5. Account deletion — exact staging test steps (test account only)

Prereq: the `delete_own_account` RPC (security definer, granted to `authenticated`) is
**deployed** on the Supabase project. If it isn't, the app will now correctly show the
**failure** path instead of a fake success — that is the point of the fix.

1. Sign in with a throwaway account → **Settings → Account**.
2. Confirm **حذف الحساب** is visible with the description line.
3. Tap it → confirm the warning copy states deletion is **permanent** (device + cloud).
4. Confirm **cancel** («إلغاء») closes the flow and clears the typed word.
5. Type the confirmation word («حذف» / "DELETE") → the destructive button enables.
6. Tap **حذف حسابي نهائيًا**.
7. **Success path** (RPC deployed): user is signed out, local data wiped, app returns to login.
8. Verify server-side: the **auth user is gone** and all 5 user tables have no rows for that id.
9. **Failure path** (simulate by testing before the RPC is deployed, or on a project without it):
   the app must show the calm failure alert («لم نتمكن من حذف الحساب بالكامل… تواصل معنا»),
   keep the session, and **not** claim success. Retry works once the RPC is available.

Pass = success path deletes the auth user + rows; failure path shows honest error, no false success.
Residual note: best-effort cloud row-deletes run before the RPC result is known, so a failed
deletion can leave cloud rows gone while the auth user remains (partial state) — resolved by
deploying/verifying the RPC. See `APP-READINESS.md §5`.

## 6. Visual QA checklist

Pre-auth (also captured live in the artifact — re-check on a real device):
- [ ] Splash — warm-stone mark, «قِمّة», tagline, deep night
- [ ] Start — one primary CTA, «بلا إعلانات، وبلا مبالغات.»
- [ ] Login — one primary action, calm forgot link
- [ ] Register — password strength (icon + text, not colour-only)
- [ ] Forgot — calm, non-enumerating copy
- [ ] Reset — form (with a real recovery session) + expired-link state

Auth-gated (log in with the test account and eyeball):
- [ ] Today/Home — Next Step card makes the next action obvious; one primary
- [ ] App Coming Soon card — informational, **no button**, lower emphasis
- [ ] Meal logging — grams shown with a household serving beside them (grams = source of truth)
- [ ] Machine workout cards — machine photos render (not free-weights), neutral day labels
- [ ] Settings → Privacy — analytics toggle + honest copy; Privacy/Terms open
- [ ] Settings → Account → Delete account — visible, calm, distinct destructive, clear cancel

Check on each: Arabic reads right-to-left cleanly, no horizontal scroll, 44px tap targets,
readable contrast, no clipped buttons.

## 7. Web limited-user readiness checklist (before sharing a public link)

- [ ] Reset password verified end-to-end (§4)
- [ ] No console errors on the deployed site (open DevTools on Start/Login)
- [ ] Privacy/Terms/Contact links open
- [ ] Account deletion works (§5) — required if users can register
- [ ] Analytics stance decided (opt-out today; decide if a first-run notice is wanted)
- [ ] Footer BUILD_LABEL shows the deployed commit

## 8. App Store / TestFlight blocker checklist (summary — full list in APP-READINESS.md)

Before TestFlight: Apple signing team · app icon set · splash · reset verified · deletion verified · archive build.
Before Review: in-app deletion verified · hosted Privacy URL · hosted Terms URL · App Privacy labels · real screenshots · no dead buttons · support URL.
Design-gated (Cloud Design North Star): final logo/icon/splash, deep visual overhaul.

## 9. Founder decisions needed

1. Analytics **opt-out vs opt-in** (+ first-run notice?).
2. Apple Developer **team** / account.
3. **Hosted, reviewed** Privacy + Terms pages (in-app copy is real; a public URL is still needed).
4. **Cloud Design North Star** sign-off → unblocks icon/splash + visual overhaul.
5. Confirm `support@qimmah.app` is monitored.
6. Confirm `delete_own_account` RPC is deployed on the production Supabase project.

## 10. What NOT to do yet

- ❌ No push · ❌ no merge · ❌ no deploy.
- ❌ No production Supabase mutation beyond the URL config already handled.
- ❌ No Codex review until you ask (the stack is accepted for now).
- ❌ Don't touch the two `.patch` files.
- ❌ No new risky feature sprint.

## 11. Next recommended action when you return

1. Run **§4 reset password** on the deployed site (fastest confidence win).
2. Run **§5 account deletion** on a staging/test account with the RPC deployed.
3. Do the **§6 auth-gated visual QA** pass.
4. If all pass, hand Codex `git diff f622075..HEAD` (5 commits) for review.
5. Make the **§9** decisions in parallel — they gate TestFlight, not the code.

---

_Local handoff only. No push/merge/deploy. `.patch` files untouched._
