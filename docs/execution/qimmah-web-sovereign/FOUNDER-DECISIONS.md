# Qimmah Web Sovereign — autonomous founder decisions

Updated: 2026-08-13 (Layer 1 / PKG-1 verified)

## Decision 001 — Use the exact Founder checkpoint

- Decision: execute from `af5274b2f8558079b43ad1d2dc2676b03db23d2b` on `codex/qimmah-web-sovereign-001` in `/private/tmp/qimmah-web-sovereign-001`.
- Why: the exact object resolved after the required fetch and is contained by the named Founder Web line.
- Alternatives rejected: current `codex/ui-polish`, arbitrary `main`, reviewed integration reference, and branch-name guessing.
- Risk: the remote may move later; all provenance is pinned by immutable SHA.
- Reversibility: delete the isolated worktree/branch only after explicit authorization; no other checkout was touched.
- Affected files: Git worktree metadata only; this execution directory thereafter.

## Decision 002 — Treat current Salla store root as a conversion limitation, not product acceptance

- Decision: keep the existing store-root CTA until a verified paid-product URL is discoverable; do not invent a URL containing `1181109938`.
- Why: the contract explicitly forbids guessing. Repository search found no approved direct product URL.
- Alternatives rejected: inferred Salla URL formats; trial id `1084925309`; fake in-app checkout.
- Risk: users may land at the store rather than the exact paid item; paid commercial GO remains NO-GO.
- Reversibility: replace the single `product.checkoutUrl` when an approved URL exists.
- Affected files: none in PKG-0.

## Decision 003 — Do not auto-fix dependency advisories

- Decision: record the three transitive high advisories and continue product work without `npm audit fix` or version changes.
- Why: dependency upgrades are a hard no-touch area tonight; the findings are in lint/build tooling and need their own authorized wave.
- Alternatives rejected: lockfile mutation, broad upgrade, suppressing the audit.
- Risk: build tooling can be DoS’d by hostile inputs in developer/CI contexts; no browser runtime path has been found.
- Reversibility: fully reversible in a dedicated dependency update.
- Affected files: none.

## Decision 004 — Reuse reviewed existing work only by immutable commit, inside this branch

- Decision: adopt the useful hunks from `71129f9c310f750cc24d1ed1fcf1a8d013f439b1` without preserving its commit, then own the result as a separately verified package.
- Why: it is the only branch advanced from the exact baseline and directly addresses discovered Preview/Measurements defects. Rebuilding the same patch would violate the project’s verify-before-build rule.
- Alternatives rejected: modifying its existing worktree; merging its moving branch name; blindly trusting its commit message.
- Risk: it includes performance/lazy-loading and route-convergence changes beyond the two guard fixes; each hunk must retain a named DoD connection.
- Reversibility: one cherry-pick/revertable package commit on this execution branch.
- Review corrections: replaced a lazy component used as its own Suspense fallback; caught deferred native-import failures; extended the canonical ErrorBoundary; removed setup false completion.
- Evidence: focused source proofs green; three real-browser suites green; fresh full gate green through its final `test:workout-day-source` step.
- Affected files: `App.tsx`, access/progress/recovery/Premium surfaces, boot imports, and their proof scripts.

## Decision 005 — Do not claim 18 questions from visible controls

- Decision: baseline count is 13 proven meaningful questions. Equipment preference is rejected from the count until it has a real consumer. The four training-history concepts are candidates, not counted until implemented with real effects and never-trained counter-proofs.
- Why: “stored/visible” is not a consumer, and truth outranks the numerical target.
- Alternatives rejected: count health consent as personalization; count discarded preference; add filler; mutate QAE.
- Risk: final N may remain below 18 if no safe real consumer exists. That will be reported, not hidden.
- Reversibility: update the count and candidate disposition as Layer 2 evidence lands.
- Affected files: execution records only.

## Tests changed

PKG-1 changes tests only by strengthening named launch contracts. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `run-access-gate-proof.mjs` | writer guards and policy | also bind every live mutation handler to its central guard; attack each removal | closes exception-vs-dialog gaps | stronger |
| `e2e/preview-gate.mjs` | basic workout/nutrition Preview | 34-case Preview/activated matrix, tampering, focus/Escape, recovery, measurements, zero-write checks | prove policy in a real browser | stronger |
| `e2e/install-overlap.mjs` | selected widths | 320/360/375/390/430 in ar/en plus ≥44px nav and attack | cover narrow devices and touch targets | stronger |
| `run-activation-ui-proof.mjs` | absent | 13 structural/counter-proof checks | keep activation honest and accessible | new guard |
| `run-error-boundary-proof.mjs` | absent | 14 structural/counter-proof checks | one primitive, no false completion, one support address, support reference | new guard |
| `run-no-template-language-proof.mjs` | legitimate copy exception hard-bound to `config/strings.ts` | searches the same complete `SURFACES` set used by its forbidden-copy scan | follow canonical dictionary ownership without weakening the phrase assertion | stronger scope |

## Decision 006 — Error recovery never means product completion

- Decision: a render failure may retry/reload/contact support, but cannot mark onboarding complete or synthesize a plan.
- Why: completion is a data fact established only after the generated plan and profile persist successfully.
- Alternatives rejected: “escape to dashboard” by writing completion; a third setup-specific boundary; displaying raw stack/message.
- Risk: a deterministic setup render bug may require reload/support instead of entering the dashboard immediately; this is honest and preserves the draft.
- Reversibility: recovery actions can be expanded inside the same primitive without changing completion semantics.
- Affected files: `src/components/ErrorBoundary.tsx`, `src/views/SetupView.tsx`, `src/i18n/dict/errorBoundary.ts`, legacy error copy in `src/config/strings.ts`.
