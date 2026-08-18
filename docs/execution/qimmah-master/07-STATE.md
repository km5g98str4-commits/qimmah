# 07 — STATE (الحالة التشغيلية)

> **Canonical owner of one fact only: where execution currently stands.**
> **This is not a diary.** Operational state only. Every session ends by updating **this file
> and only this file**. History belongs in git and `CHANGELOG.md`.

```
LAST UPDATE : 2026-08-18 · session QIM-MASTER (recovery / control-plane)
HEAD        : e72cd62 + merge of BR-02  (working branch, pushed)
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
- **Control plane created** at `docs/execution/qimmah-master/` — 13 files, one owner per fact,
  and `CLAUDE.md`/`AGENTS.md` §11 now point at it.
- **Every branch classified.** 27 fully contained, 8 current-era branches with unique work.
- **Feature map and claim ledger built** from code, with `path:line` evidence throughout.

## IN_PROGRESS

**Nothing.** Every lane is at a clean stopping point — no half-finished task.

## NEXT THREE TASKS

1. **`QIM-V1-002`** — one target-weight authority. `planDerive` (`×0.92`/`×1.05`) drives the
   delivery screen and the stored profile; `onboardingV2Adapter` (`×0.9`/`×1.1`) drives the engine.
   An 80 kg cutter is shown 74 kg and given a plan built for 72 kg. `READY`.
2. **`QIM-V1-003`** — stop collecting health-data consent that gates nothing
   (`onboardingProfile.ts:135-138`), and extend `test:onboarding-questions` to assert **downstream
   consumption**, which is the blind spot that let it through. `READY`.
3. **`QIM-V1-010`** — make the commercial and sync claims true. **BLOCKED on `FA-01`** — the
   founder must first say what Premium is. This is the only task in the plan waiting on a human.

## BLOCKERS

| blocker | blocks | owner |
|---|---|---|
| **DEC-101** — is Premium annual or perpetual? Three surfaces disagree | `QIM-V1-010` — the largest truth gap in the project | **founder** (`FA-01`) |
| **DEC-103** — 13 migrations unapplied in production | admin surface, real commerce testing | **founder** (`FA-03`) |
| WebKit not installed in this container | `QIM-V1-008` | founder machine / WebKit runner |
| Cloudflare unreachable from agent containers (403 / 000 / `fetch failed`, no Pages tools in MCP) | `QIM-V1-006`, `QIM-V1-007`, any deploy | **founder** |

## FOUNDER DECISIONS REQUIRED

`FA-01` Premium period 🔴 (**on the critical path**) · `FA-02` 82 MB food shards 🟠 ·
`FA-03` apply migrations 🟠 · `FA-04` 37 images / 22 videos 🟡 · `FA-05` AI-Coach vs backlog 🟡 ·
`FA-06` promotion to `main` = launch 🔴 · `FA-07` close 6 stale PRs + tag before any branch delete 🟢 ·
`FA-08` confirm V1 = Web-only 🟢 (confirmation, not a blocker).

Full text in `10-FOUNDER-ACTIONS.md`.

## LATEST VERIFIED GATE

```
commit    : working branch (139a7b0 + QIM-V1-001 + QIM-V1-018 + QIM-V1-005)
node      : v22.22.2 · npm 10.9.7 · after npm ci
typecheck : ✅ exit 0
lint      : ✅ exit 0   (--max-warnings 0)
build     : ✅ exit 0
test:gate : ✅ exit 0   (141 steps — test:plan-warning-parity added)
e2e       : ✅ green in CI (run 423, step 12)
```

## CURRENT CI

```
workflow : CI (.github/workflows/ci.yml)
working branch @ dc031fa : ✅ GREEN — run 423, ALL 13 steps success (2026-08-18T19:09Z)
ground @ 139a7b0         : ❌ red (run 421) — superseded by the fix on the working branch
main @ cc60adf           : ❌ red (run 339) — same root cause; untouched by design (production pointer)
```

**The first fully green CI on this line since run 418.** `main` stays red until the founder
promotes a candidate carrying `QIM-V1-001` — that is a promotion decision (`FA-06`), not an
agent action.

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
