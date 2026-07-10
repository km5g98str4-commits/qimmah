# Qimmah — Merge / Push / Deploy Plan (not executed)

**This document is a plan only.** No push, merge, or deploy happens without Ziyad's
explicit **"approved"** (per `CLAUDE.md`). It exists so that when the go-ahead comes,
the steps are exact and safe.

Related: [`FOUNDER-QA-HANDOFF.md`](./FOUNDER-QA-HANDOFF.md) · [`QA-RESET-PASSWORD.md`](./QA-RESET-PASSWORD.md) ·
[`APP-READINESS.md`](./APP-READINESS.md) · [`release-checklist.md`](./release-checklist.md).

---

## 1. Current local stack (branch `claude/p10-integrate-qa-deploy-kr4q6x`)

| Hash | What |
|---|---|
| `2167e5a` | fix(auth): exchangeCodeForSession fallback for recovery (H1) — HEAD |
| `e74ec4a` | app-readiness: avoid partial account deletion on RPC failure (M1) |
| `46caa65` | docs: founder QA handoff |
| `9671c0f` | app-readiness: TestFlight/App Store checklist + branding cleanup |
| `042b061` | qa: reset-password verification doc |
| `f29348c` | app-readiness: privacy analytics disclosure |
| `9ba03a3` | app-readiness: account-deletion hardening |
| `246ff28` | feat(auth): password-reset flow |
| `f622075` | prelaunch(web): web hardening + machine plans (base) |

Untracked (leave as-is): `phase3-final-review.patch`, `phase3-fix-review.patch`,
`qimmah-readiness-final-codex-review.patch`.

## 2. Hard preconditions — ALL must be true before merge/deploy

- [ ] **Live reset password PASS** (`QA-RESET-PASSWORD.md`) — form appears (not expired), new password works, old fails, reused link expired. *H1 makes this robust across redirect shapes; still verify.*
- [ ] **Live account deletion PASS** on a staging account — auth user actually removed in Supabase → Authentication → Users; failure path shows no false success.
- [ ] **`delete_own_account` RPC deployed** on production Supabase (else deletion honestly fails).
- [ ] **Supabase URL config** applied: Site URL `https://qimmah-8qp.pages.dev`; Redirect URLs allow `https://qimmah-8qp.pages.dev/*` (+ dev localhost).
- [ ] **Auth-gated visual QA** done (Today/Home, Settings/Privacy/Delete).
- [ ] Gates green on the merge commit: `typecheck`, `lint`, `build`.
- [ ] Explicit **"approved"** from Ziyad.

If any box is unchecked, **stop** — the stack stays local.

## 3. Merge / push plan (run only after §2, and only when told)

Preferred: open a PR from the feature branch to `main` (review trail), rather than a direct push to `main`.

```
# 1. sync base
git fetch origin main
# 2. rebase the readiness stack onto latest main (resolve conflicts if any)
git checkout claude/p10-integrate-qa-deploy-kr4q6x
git rebase origin/main
# 3. re-run gates after rebase
npm run typecheck && npm run lint && npm run build
# 4. push the feature branch (NOT main)
git push -u origin claude/p10-integrate-qa-deploy-kr4q6x
# 5. open a PR -> main; merge only on Ziyad's approval
```

Notes:
- Never force-push `main`. Never push directly to `main` for this change — use a PR.
- The three `.patch` files are untracked and must **not** be included in the push.
- Commit author stays `Claude <noreply@anthropic.com>`.

## 4. Pre-deploy review (Cloudflare Pages)

Hosting is **Cloudflare Pages** (project `qimmah`), auto-deploys from `main`;
preview branches deploy to subdomains. Production: `https://qimmah-8qp.pages.dev`.

- [ ] **Env vars on Cloudflare Pages** point at the **production** Supabase project:
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (not the shared template default baked in `supabaseClient.ts`).
- [ ] `VITE_ANALYTICS_ENDPOINT` — set only if a real HTTPS ingest exists; else leave empty (no-op).
- [ ] No secrets in the repo or build config (anon key is public/RLS-safe; that's fine).
- [ ] `BUILD_LABEL` (footer/console) shows the deployed commit after deploy.
- [ ] Merge to `main` → confirm the Pages build succeeds and the production URL serves the new commit.
- [ ] Smoke test on production: Start/Login/Forgot load, `#/reset` behaves, no console errors.

## 5. Supabase production readiness (founder / dashboard — not code)

- [ ] `delete_own_account` function deployed (security definer, granted to `authenticated`).
- [ ] RLS own-row select/insert/update/**delete** on all 5 user tables.
- [ ] Auth email templates configured (confirmation + recovery).
- [ ] URL config (§2).

## 6. Rollback

- Cloudflare Pages keeps prior deployments — roll back to the previous successful build from the Pages dashboard if a regression appears.
- Code: the readiness stack is a clean linear set of commits on top of `f622075`; reverting a single commit (e.g. `git revert <hash>`) is safe since each is scoped.

## 7. What this plan deliberately does NOT do

No push, no merge, no deploy, no Supabase mutation, no `service_role`, no native build.
Those are gated on §2 + explicit approval.

---

_Plan only. Update after live QA passes and before requesting approval._
