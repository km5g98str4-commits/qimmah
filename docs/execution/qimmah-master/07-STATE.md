# 07 — STATE (الحالة التشغيلية)

> **Canonical owner of one fact only: where execution currently stands.**
> **This is not a diary.** Operational state only. Every session ends by updating **this file
> and only this file**. History belongs in git and `CHANGELOG.md`.

```
LAST UPDATE : 2026-08-18 · session QIM-MASTER (recovery / control-plane)
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
  `test:gate` (140 steps) → all exit 0.
- **CI red root-caused and fixed — `QIM-V1-001`.** `test:e2e:onboarding` was timing out on
  `[data-question-id="nutrition.diet_pattern"]`; the product change was correct (DEC-008) and six
  harnesses were stale. All six now route through one `answerDietPattern` helper that **imports the
  product's own `dietPatternApplies`**, so harness drift is impossible by construction, and asserts
  the contract **in both directions**. Local run: the timeout is gone and every prior assertion passes.
- **Control plane created** at `docs/execution/qimmah-master/` — 12 files, one owner per fact.
- **Every branch classified.** 8 of 80 carry unique commits; each has exactly one decision.
- **Feature map and claim ledger built** from code, with `path:line` evidence throughout.

## IN_PROGRESS

`QIM-V1-001` — **VERIFYING**. Local E2E no longer fails on the product assertion. One residual
console-error assertion fails **in this container only**: a browser-initiated `GET /favicon.ico` → 404
on the dev harness page, which declares no icon (the real `index.html:10-13` declares four).
**Classified INFRASTRUCTURE, not PRODUCT:** zero files changed under `scripts/momentum-shot/`,
`public/`, `index.html`, `vite.config.ts` or `src/main.tsx` between the last green CI run
(418 @ `2b2413d`) and the ground, and that run passed this exact assertion.
**CI on the pushed branch is the authority.** The assertion was deliberately **not** relaxed —
weakening a console-error guard to make a local artifact disappear is exactly the move this control
plane exists to prevent.

## NEXT THREE TASKS

1. **`QIM-V1-005`** — adopt `ci/artifact-quota-nonblocking` so an artifact-upload/storage-quota
   failure can never again mask a real gate result. `READY` once `QIM-V1-001` is green in CI.
2. **`QIM-V1-018`** — the English injury-safety warning currently vanishes into a generic fallback
   (`planGenerator.ts:1100` emits a key `profileChoices.ts:70` no longer holds). **Safety.** `READY`.
3. **`QIM-V1-004`** — adopt the four convergence commits from
   `codex/qimmah-final-release-convergence-001` (numeral guard at the display boundary + BUG-033..036).
   `READY`.

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
commit    : 139a7b0 (+ the QIM-V1-001 harness change)
node      : v22.22.2 · npm 10.9.7 · after npm ci
typecheck : ✅ exit 0
lint      : ✅ exit 0   (--max-warnings 0)
build     : ✅ exit 0
test:gate : ✅ exit 0   (140 steps)
e2e:onboarding : product assertions ✅ — one container-specific favicon 404 (see IN_PROGRESS)
```

## CURRENT CI

```
workflow : CI (.github/workflows/ci.yml)
main @ cc60adf          : ❌ RED  — run 339 (same root cause as below, untouched: production pointer)
ground @ 139a7b0        : ❌ RED  — run 421, job "Quality gate", step 12 "Onboarding v2 browser E2E"
last green on ground    : run 418 @ 2b2413d
first red commit        : 7eaed49 (merge carrying 2e3042d)
classification          : TEST — stale harness, fixed by QIM-V1-001, awaiting CI confirmation
```

**Every other step of run 421 was green**, including the 140-step gate — the red is the last
product step only.

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
