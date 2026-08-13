# Qimmah Web Sovereign — autonomous founder decisions

Updated: 2026-08-13 (Layer 0 / PKG-0)

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

- Decision: treat `71129f9c310f750cc24d1ed1fcf1a8d013f439b1` as a candidate implementation source for Layer 1, not as authority. Adopt it only after diff review and fresh focused/full gates in this isolated worktree.
- Why: it is the only branch advanced from the exact baseline and directly addresses discovered Preview/Measurements defects. Rebuilding the same patch would violate the project’s verify-before-build rule.
- Alternatives rejected: modifying its existing worktree; merging its moving branch name; blindly trusting its commit message.
- Risk: it includes performance/lazy-loading and route-convergence changes beyond the two guard fixes; each hunk must retain a named DoD connection.
- Reversibility: one cherry-pick/revertable package commit on this execution branch.
- Affected files: none yet.

## Decision 005 — Do not claim 18 questions from visible controls

- Decision: baseline count is 13 proven meaningful questions. Equipment preference is rejected from the count until it has a real consumer. The four training-history concepts are candidates, not counted until implemented with real effects and never-trained counter-proofs.
- Why: “stored/visible” is not a consumer, and truth outranks the numerical target.
- Alternatives rejected: count health consent as personalization; count discarded preference; add filler; mutate QAE.
- Risk: final N may remain below 18 if no safe real consumer exists. That will be reported, not hidden.
- Reversibility: update the count and candidate disposition as Layer 2 evidence lands.
- Affected files: execution records only.

## Tests changed

No pre-existing test was modified in PKG-0.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |
