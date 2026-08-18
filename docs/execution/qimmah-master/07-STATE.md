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

- **`QIM-V1-010` DONE — every commercial and sync claim now matches the code.** The Terms of
  Service no longer say *"No subscription is active in this version"* while 13 productive actions
  are gated. **Eleven files**, not the four the plan listed: the sweep found the same sentences in
  the canonical legal source, the compliance pack, the TestFlight pack, `PRODUCT.md`, and the
  site-copy source — the spring that had already re-introduced this copy once.
  `test:site-truth`: **19 → 234 checks**; it now scans the source documents, extracts the
  paid-access contract **by block boundaries**, and forbids any price figure on the site.
  Five real injections, each failing by name.
- **`QIM-V1-003` DONE — premise corrected (`PLAN-CHANGE-003`), and the proposed fix rejected.**
  The consent gates step 0, its copy is a *processing* consent, and all 20 questions already had
  consumption assertions. Wiring it into `hasSensitiveHealthConsent` would have converted
  "compute my plan" into "upload my health data" — against the privacy policy and DEC-007.
  Delivered instead: the separation is enforced (`test:onboarding-questions` §8-ب, 10 checks +
  a wiring counter-proof).
- **`QIM-V1-015` DONE — every dead surface declares itself.** Delivered through the existing
  guarded `CANONICAL-SURFACE-LOCK` registry: new `UNROUTED_MODULES` covers
  `src/lib/dataPortability.ts` and `src/lib/coach/*`. `CLAUDE.md`/`AGENTS.md` §11 no longer name
  the dead `WorkoutV2` as the save-honesty owner. Supersession banners on the five `STATE.md`
  files, the old runbook, the founder handoff, and `ROADMAP.md`.
- **Earlier this session:** `QIM-V1-001` (CI red closed), `QIM-V1-018` (English injury claim),
  `QIM-V1-005` (artifact masking), `QIM-V1-002` (one target-weight authority), plus the control
  plane itself and `PLAN-CHANGE-001`/`002`.

## IN_PROGRESS

**Nothing.** Every lane is at a clean stopping point.

## NEXT THREE TASKS

1. **`QIM-V1-006`** — prove `VITE_ENTITLEMENT_MODE` is unset in every deployed environment
   (`08-UNKNOWNS.md` UNK-01). Founder-assisted: Cloudflare is unreachable from agent containers.
2. **`QIM-V1-008`** — WebKit browser matrix on the candidate. The audience is iOS-Safari-heavy and
   a WebKit-only storage bug has shipped here before. Needs a WebKit-capable runner.
3. **`QIM-V1-009`** — the smallest truthful failure signal: a failed activation currently produces
   **zero** signal to anyone.

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

## RELEASE READINESS

```
READY_FOR_FOUNDER_QA = YES
```

The three items that blocked it — `QIM-V1-010`, `QIM-V1-003`, `QIM-V1-015` — are closed, gate-green
and CI-green. The founder can review a preview build whose Terms, landing page, support FAQ,
privacy page and store description all describe what the code actually does.

```
READY_FOR_PRODUCTION = NO   → QIM-V1-006 · QIM-V1-008 · QIM-V1-009 · QIM-V1-016
                              + FA-03 (apply migrations) · FA-06 (promotion = the launch)
```

**Before handing over a preview link:** confirm the footer / `qimmah-env` reads `founder_preview`
and not `production` (DEC-002). And the live **Salla storefront** still contradicts the corrected
copy — `FA-01`, outside this repository.

## FOUNDER DECISIONS REQUIRED

`FA-01` Salla storefront + 89.99 anchor 🟠 (**no longer blocking — see DEC-015**) · `FA-02` 82 MB food shards 🟠 ·
`FA-03` apply migrations 🟠 · `FA-04` 37 images / 22 videos 🟡 · `FA-05` AI-Coach vs backlog 🟡 ·
`FA-06` promotion to `main` = launch 🔴 · `FA-07` close 9 stale PRs + tag before any branch delete 🟢 ·
`FA-08` confirm V1 = Web-only 🟢 (confirmation, not a blocker).

Full text in `10-FOUNDER-ACTIONS.md`.

## LATEST VERIFIED GATE

```
commit    : working branch @ 96c2ae4 (ground + 001 · 018 · 005 · 002 · 010 · 003 · 015)
node      : v22.22.2 · npm 10.9.7 · after npm ci
typecheck : ✅ exit 0
lint      : ✅ exit 0   (--max-warnings 0)
build     : ✅ exit 0
test:gate : ✅ exit 0   (142 steps)
e2e       : ✅ green in CI (run 446, step 12)
```

## CURRENT CI

```
working branch @ 96c2ae4 : ✅ GREEN — run 446, ALL 13 steps (2026-08-18T22:46Z)
             @ b5fbd5a : ✅ run 444   ·   @ 43f79fe : ✅ run 443
main   @ cc60adf        : ❌ red (run 339) — untouched by design; clears on promotion (FA-06)
```

Verified step by step, not by conclusion alone (§4.0).

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
