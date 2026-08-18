# 00 — GROUND (الأرض المعتمدة)

> **Canonical owner of one fact only: which commit is the product.**
> Anything else lives in another file of this control plane. Do not duplicate truth here.

---

## CANONICAL_GROUND

```
CANONICAL_GROUND_BRANCH = codex/qimmah-sovereign-closure-001
CANONICAL_GROUND_SHA    = 139a7b00d154e1950e5970ed86d2fe6165dba5c6
ESTABLISHED             = 2026-08-18
ESTABLISHED_BY          = QIM-MASTER (recovery / control-plane mission)
WORKING_BRANCH          = claude/qimmah-recovery-control-plane-hph1jg  (fast-forwarded onto the ground)
```

**`main` is NOT the frontier.** `main = cc60adf` is **228 commits behind** the ground.
`main` is the *production* pointer (Cloudflare Pages auto-deploys from it), not the
development frontier. Treating `main` as the frontier is the single mistake that has
restarted this project more than once.

```
PRODUCTION_POINTER = main @ cc60adfc0da0f893b101230269d4847d33490429  (2026-08-11)
FRONTIER           = codex/qimmah-sovereign-closure-001 @ 139a7b0     (2026-08-18)
main .. ground     = 228 commits ahead, 0 behind
```

---

## Why this ground and not another — PROVEN BY CONTAINMENT, not by name

The ground was **not** chosen because its branch name sounds final. It was chosen because
every other live candidate is an **ancestor** of it. Reproduce the proof:

```bash
git rev-list --left-right --count origin/codex/qimmah-sovereign-closure-001...origin/<branch>
```

| candidate | date | behind ground | ahead of ground | verdict |
|---|---|---|---|---|
| `main` | 08-11 | 228 | **0** | fully contained |
| `codex/qimmah-canonical-launch-candidate-001` | 08-18 | 72 | **0** | fully contained |
| `s/food-search` | 08-18 | 70 | **0** | fully contained |
| `s/catalog-jointloads` | 08-18 | 71 | **0** | fully contained |
| `codex/qimmah-founder-qa-candidate-001` | 08-17 | 74 | **0** | fully contained |
| `codex/qimmah-sovereign-overnight-rc-001` | 08-16 | 87 | **0** | fully contained |
| `claude/qimmah-today-home-redesign-2q1wdk` | 08-16 | 85 | **0** | fully contained |
| `claude/salla-reconciled` | 08-13 | — | **0** | fully contained |
| `codex/qimmah-final-release-convergence-001` | 08-16 | 139 | **4** | ⚠ see 03-BRANCH-LEDGER (ADOPT) |

Of the 80 remote branches, **27 are fully contained** in the ground and 53 carry at least one
commit it does not. Of those 53, **only 8 are from the current era** (August 2026, after the
frontier formed); the other 45 are June–July branches sitting 300–1050 commits behind, whose
unique commits are experiments already re-implemented on the frontier.
Every one of the 80 is classified in [`03-BRANCH-LEDGER.md`](./03-BRANCH-LEDGER.md).
**No branch is left as "maybe useful."**

---

## Verified gate on the ground — measured here, not reported by a lane

Run on `139a7b0`, Node `v22.22.2`, npm `10.9.7`, after `npm ci`:

| step | command | result |
|---|---|---|
| install | `npm ci` | ✅ exit 0 |
| typecheck | `npm run typecheck` | ✅ exit 0 |
| lint (`--max-warnings 0`) | `npm run lint` | ✅ exit 0 |
| build | `npm run build` | ✅ exit 0 |
| deterministic gate | `npm run test:gate` | ✅ exit 0 |
| browser E2E | `npm run test:e2e:onboarding` | ❌ **FAILS** — see below |

**Gate size is deliberately not quoted as a number here.** It grows every time a guard is added, so
a number in prose goes stale within a wave and then contradicts `07-STATE.md`. Read it from source:

```bash
node -e "const p=require('./package.json');console.log(Object.keys(p.scripts).length,'scripts ·',p.scripts['test:gate'].split('&&').length,'gate steps')"
```

`version = 1.0.0`, `license = UNLICENSED` (bumping the version is a launch act — `FA-06`).

### The one red — named, root-caused, owned

```
WORKFLOW : CI  (.github/workflows/ci.yml)
JOB      : Quality gate (typecheck · lint · build · proofs)
STEP     : 12 — "Onboarding v2 browser E2E"  (npm run test:e2e:onboarding)
FIRST RED COMMIT : 7eaed49  merge(entry): [SOVEREIGN-ENTRY-001]  (carries 2e3042d)
LAST GREEN       : 2b2413d  (CI run 418, 2026-08-18T13:23Z)
CLASSIFICATION   : TEST  (stale harness, not a product defect)
TASK             : QIM-V1-001
```

Failure: `locator('[data-question-id="nutrition.diet_pattern"]')` times out after 30 s.

Root cause (`src/views/OnboardingV2.tsx:1172`): commit `2e3042d` made the diet-pattern
question render **only when `intent === 'meals'`** (`src/lib/onboardingV2Flow.ts:111`) —
a correct product change: a question with no consumer must not be asked. The E2E drivers
still click it unconditionally, and the harness selects `intents[0] = 'plan'`
(`src/i18n/dict/onboardingIntent.ts:99`), so the group legitimately never renders.

Six harnesses share the stale assumption:
`scripts/e2e/lib/onboarding-driver.mjs:28` · `scripts/onboarding-matrix-e2e.mjs:69` ·
`scripts/release/lib/drive.mjs:140` · `scripts/e2e/journeys/{newcomer,minor,advanced}.mjs`.

Reproduced locally on this ground (16 ✅ then the timeout), so it is **not** CI infrastructure.

---

## Environment facts measured this session

| fact | value | evidence |
|---|---|---|
| Node | 22 (CI) / v22.22.2 (local) | `.github/workflows/ci.yml`, `node -v` |
| package manager | npm 10.9.7, `npm ci` mandatory | charter §4 |
| remote branches | 80 | `git branch -r \| wc -l` |
| commits on ground | 1057 | `git rev-list --count` |
| Playwright Chromium | preinstalled, needs `PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` | measured |
| Cloudflare API | **blocked from agent containers** (403 / `wrangler` fetch failed) | `docs/execution/qimmah-sovereign-closure/STATE.md §5` |
| Supabase migrations | 24 files in `supabase/migrations/` | `ls` |

---

## SESSION PROTOCOL — read this before doing anything

Every session starts by reading, in order:

1. `00-GROUND.md` (this file)
2. `01-DECISIONS.md`
3. `06-MASTER-PLAN.md`
4. `07-STATE.md`

Then verify the ground still exists remotely:

```bash
git fetch origin codex/qimmah-sovereign-closure-001
git rev-parse origin/codex/qimmah-sovereign-closure-001   # must contain 139a7b0 in its history
git merge-base --is-ancestor 139a7b0 origin/codex/qimmah-sovereign-closure-001 && echo GROUND-OK
```

Every session **ends** by updating `07-STATE.md` only. Not this file — the ground SHA
changes only through a numbered decision in `01-DECISIONS.md`.
