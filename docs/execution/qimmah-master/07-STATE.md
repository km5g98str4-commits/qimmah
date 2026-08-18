# 07 — STATE (الحالة التشغيلية)

> **Canonical owner of one fact only: where execution currently stands.**
> **This is not a diary.** Operational state only. Every session ends by updating **this file
> and only this file**. History belongs in git and `CHANGELOG.md`.

```
LAST UPDATE : 2026-08-18 · session QIM-MASTER (recovery / control-plane)
HEAD        : read it — `git rev-parse --short HEAD` (a literal here goes stale within one commit)
```

---

## GROUND

```
branch : codex/qimmah-sovereign-closure-001
SHA    : 139a7b00d154e1950e5970ed86d2fe6165dba5c6
working branch : claude/qimmah-recovery-control-plane-hph1jg  (fast-forwarded onto the ground)
production     : main @ cc60adf  — 228 commits behind the ground (this is expected, see DEC-001)
```

## DONE SINCE LAST STATE

- **Ground established and proven by containment** over all 80 remote branches — not by branch name.
- **Gate measured here, not reported:** `npm ci` · `typecheck` · `lint` · `build` ·
  `test:gate` → all exit 0. Now **141 steps** (was 140).
- **`QIM-V1-001` DONE — CI is green.** Root cause was a stale harness assumption, not a product
  defect (DEC-008). Six harnesses now share one `answerDietPattern` helper that **imports the
  product's own `dietPatternApplies`**, so drift is impossible by construction, and asserts the
  contract in **both** directions. **CI run 423 on `dc031fa`: the whole run green**, including
  step 12 "Onboarding v2 browser E2E" — red since `7eaed49` — and step 13 artifact upload.
  The container-only `favicon.ico` 404 was classified INFRASTRUCTURE and CI confirmed it;
  **the console-error assertion was never relaxed to make it disappear.**
- **`QIM-V1-018` DONE — a safety claim no longer vanishes in English.** Three entries were
  missing, not one, including the case that matters most: a user whose injury note we could not
  parse was told **nothing** in English and left believing the plan accounted for it. New guard
  `test:plan-warning-parity` is structural (it extracts the emitted strings from the source) and
  is wired into the gate. Its red was reproduced for real, and the guard was **attacked and
  tightened** after its first form passed undeservedly on a missing entry.
- **`QIM-V1-005` DONE.** BR-02 adopted: an artifact/storage-quota failure can no longer mask a
  real gate result. Verified after merge — exactly two non-gating steps, all eight quality steps
  still gate.
- **`QIM-V1-004` CLOSED as unnecessary (`PLAN-CHANGE-001`).** Verification before merging showed
  the ground already holds everything BR-01 claimed, by a better path — and merging would have
  **regressed** the Today surface. See `03-BRANCH-LEDGER.md`.
- **`QIM-V1-002` DONE — one target-weight authority.** The adapter now calls `deriveTargetWeight`
  instead of carrying its own constants. Locked by `test:target-weight-authority` (behavioural
  3×9 matrix + stored profile + direction, **plus a structural check that no weight multiplier may
  exist in the adapter at all**). Red reproduced for real: 4 named failures with concrete numbers.
  The gate then caught a second thing — `body-fields-proof.ts:68` asserted the literal `81`
  (= 90 × 0.9, the old constant). It was **rebound to its stated intent** ("derived from the
  answered weight, not the default") rather than having its number updated, so no copied constant
  is left to age in two files.
- **Control plane created** at `docs/execution/qimmah-master/` — 13 files, one owner per fact.
  `CLAUDE.md`/`AGENTS.md` now point at it **from their first screen**, not only from §11.
- **`DEC-101` corrected to `DEC-015`.** It was registered as an open founder decision on the
  strength of an earlier state document; the **charter had already decided it** (`AGENTS.md §0.1`)
  and the backend already matches. This removed the only human from the critical path.
- **Cold-start acceptance test run** with a zero-context agent against repository files only. All
  ten questions answered from the control plane. Its findings were treated as defects and fixed —
  most importantly the charter pointer, which now sits at the top of the file.
- **Every branch classified.** 27 fully contained, 8 current-era branches with unique work.
- **Feature map and claim ledger built** from code, with `path:line` evidence throughout.

## IN_PROGRESS

**Nothing.** Every lane is at a clean stopping point — no half-finished task.

## NEXT THREE TASKS

1. **`QIM-V1-010`** — make the free-tier, subscription and sync claims true across `site/terms.html`,
   `site/index.html`, `site/support.html` and `docs/appstore/02-description.md`. The Terms of Service
   currently say *"No subscription is active in this version"* while **13 productive actions** are
   gated (`src/lib/access/paidActions.ts:18-53`). **Now unblocked** (DEC-015) and the highest-harm
   item in the ledger. Extend `test:site-truth` to cover these claims — it does not today, which is
   why they survived. `READY`.
2. **`QIM-V1-003`** — stop collecting health-data consent that gates nothing
   (`onboardingProfile.ts:135-138`), and extend `test:onboarding-questions` to assert **downstream
   consumption**, not just UI binding — the blind spot that let it through. `READY`.
3. **`QIM-V1-015`** — stamp the orphan surfaces and the five superseded `STATE.md` files. A
   cold-start audit confirmed the risk is live: `find . -name STATE.md` returns the stale ones first
   and **none of them says it is superseded**. Also correct `CLAUDE.md §11`'s reference to the
   `WorkoutV2` save-honesty chain (the live one is in `WorkoutView`). `READY`.

## BLOCKERS

| blocker | blocks | owner |
|---|---|---|
| **DEC-103** — 13 migrations unapplied in production | admin surface, real commerce testing | **founder** (`FA-03`) |
| WebKit not installed in this container | `QIM-V1-008` | founder machine / WebKit runner |
| Cloudflare unreachable from agent containers (403 / 000 / `fetch failed`, no Pages tools in MCP) | `QIM-V1-006`, `QIM-V1-007`, any deploy | **founder** |

**Nothing on the critical path is blocked.** `QIM-V1-010` was recorded as waiting on `FA-01`
("what is Premium?"); the charter had already decided it (`AGENTS.md §0.1`) and the backend already
matches — see **DEC-015**. The founder is still needed for the **external Salla storefront**, which
is not a file in this repository.

## FOUNDER DECISIONS REQUIRED

`FA-01` Salla storefront + 89.99 anchor 🟠 (**no longer blocking — see DEC-015**) · `FA-02` 82 MB food shards 🟠 ·
`FA-03` apply migrations 🟠 · `FA-04` 37 images / 22 videos 🟡 · `FA-05` AI-Coach vs backlog 🟡 ·
`FA-06` promotion to `main` = launch 🔴 · `FA-07` close 9 stale PRs + tag before any branch delete 🟢 ·
`FA-08` confirm V1 = Web-only 🟢 (confirmation, not a blocker).

Full text in `10-FOUNDER-ACTIONS.md`.

## LATEST VERIFIED GATE

```
commit    : working branch @ f47ce98 (139a7b0 + 001 + 018 + 005 + 002 + docs)
node      : v22.22.2 · npm 10.9.7 · after npm ci
typecheck : ✅ exit 0
lint      : ✅ exit 0   (--max-warnings 0)
build     : ✅ exit 0
test:gate : ✅ exit 0   (142 steps — plan-warning-parity + target-weight-authority added)
e2e       : ✅ green in CI (run 427, step 12)
```

## CURRENT CI

```
workflow : CI (.github/workflows/ci.yml)
working branch @ f47ce98 : ✅ GREEN — run 427, ALL 13 steps success (2026-08-18T19:38Z)
             @ 8e83963 : ✅ GREEN — run 424
             @ dc031fa : ✅ GREEN — run 423   ← the run that closed QIM-V1-001
             @ 9930142 : cancelled — superseded by the next push
                          (`concurrency.cancel-in-progress: true`; not a red)
ground @ 139a7b0        : ❌ red (run 421) — superseded by the fix on this branch
main   @ cc60adf        : ❌ red (run 339) — same root cause; untouched by design
```

**Verified step by step, not by conclusion alone** (§4.0: red can hide red). Run 427:
typecheck · lint · build · perf · food-db · **full gate** · Playwright install ·
**Onboarding v2 browser E2E** · artifact upload — all success.

`main` stays red until the founder promotes a candidate carrying `QIM-V1-001`. That is a
promotion decision (`FA-06`), not an agent action — merging to `main` **is** the production deploy.

## PREVIEW / PRODUCTION

```
PREVIEW    : Cloudflare Pages branch deploys. Always confirm the footer / `qimmah-env` reads
             `founder_preview` before sharing a link. If it reads `production`, stop — that build
             carries production write authority (DEC-002).
PRODUCTION : https://qimmah-8qp.pages.dev — auto-deploys from `main` @ cc60adf.
             NOT verified from this session: Cloudflare is unreachable from agent containers (UNK-04).
             Read-only workaround: curl -s "https://r.jina.ai/https://qimmah-8qp.pages.dev/"
```

---

### For the next session — the two things most likely to mislead you

1. **`CLAUDE.md §1` says the trunk is `main`.** It is right about governance and misleading about
   development: the work is **228 commits ahead** of `main`. Read `DEC-001` before acting on it.
2. **Green does not always mean shipped.** Three guards were found green and hollow in one day:
   `test:onboarding-questions` asserts binding but not consumption; `run-food-longtail-proof` passes
   whether the shards are all present or all absent; the AI-Coach "16-check guard" has **no runner at
   all**. Before trusting a proof, read what it asserts.
