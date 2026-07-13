# Branch protection — owner setup

Goal: **no change reaches `main` or an `integration/*` branch unless CI is green.** These are one-time GitHub
settings only the repo owner/admin can apply. CI itself (the workflow) is already in the repo; this just makes it
*required*.

## Prerequisite
Let **CI** run at least once (any push) so GitHub learns the status-check name. The check appears as:

> **`Quality gate (typecheck · lint · build · proofs)`**  (workflow **CI** → job **gate**)

## A. Protect `main` (GitHub UI)
1. **Settings → Branches → Add branch ruleset** (or “Add rule” on classic protections).
2. **Branch name pattern:** `main`
3. Enable:
   - ✅ **Require a pull request before merging** (≥ 1 approval recommended).
   - ✅ **Require status checks to pass before merging** → search & select **`Quality gate (typecheck · lint · build · proofs)`**.
   - ✅ **Require branches to be up to date before merging** (re-runs CI on the merge result).
   - ✅ **Require conversation resolution before merging** (optional).
   - ✅ **Do not allow bypassing the above settings** (applies to admins too).
   - ✅ **Restrict force-pushes** and **restrict deletions**.

## B. Protect `integration/*`
Repeat step A with **Branch name pattern:** `integration/*` and the same required check. (PR approval can be
relaxed here if integration branches are agent-driven, but keep **Require status checks** on.)

## C. Equivalent via GitHub CLI (classic protection, run per branch)
```bash
# main
gh api -X PUT repos/km5g98str4-commits/gym-os-template/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=Quality gate (typecheck · lint · build · proofs)' \
  -f 'enforce_admins=true' \
  -f 'required_pull_request_reviews[required_approving_review_count]=1' \
  -F 'restrictions='
```
> For `integration/*` (a wildcard), use a **repository ruleset** (`Settings → Rules → Rulesets`) with target
> pattern `integration/*` and a **Require status checks** rule referencing the same check — the classic
> `branches/{branch}/protection` API takes a literal branch, not a glob.

## Result
- Push to a feature branch → CI runs → open PR → merge is **blocked** until the gate is green.
- Nightly (once on `main`) surfaces drift on `integration/*` even with no new push.
- The browser-proof job in Nightly is intentionally **non-gating** (informational only).
