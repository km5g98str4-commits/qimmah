# DECISIONS.md — Qimmah Founder Decision Register

**Revision:** v0.9.1
**Status:** PLANNING + VERIFICATION MODE. Not frozen.
**Authority:** Only the founder moves a decision to `LOCKED`. No agent may self-lock.

---

## ⚠️ PROVENANCE NOTICE

This is a **new file**. It is not the same document as `/DECISIONS.md` or
`docs/product/DECISIONS.md`, both of which are historical per-agent work logs from
Phase 2/2.5 and contain **no `DEC-nnn` identifiers**. Verified:

```
$ grep -rn "DEC-013" --include="*.md" .     → no matches
$ grep -oE "DEC-[0-9]{3}" docs/product/DECISIONS.md | sort -u  → no matches
```

The `DEC-013` referenced by the founder instruction **could not be recovered from the
repository**. Its content survives only in conversation, which this control set does not
accept as evidence (`VERIFY.md` E-2). It is therefore recorded below as `PENDING_FOUNDER`
for *both* approval and restatement.

---

## Status vocabulary

| Status | Meaning |
|---|---|
| `LOCKED` | Founder has explicitly decided. Not reopened inside a wave. |
| `PENDING_FOUNDER` | **Blocked. Awaiting an explicit founder answer.** No agent may assume a value. |
| `PROPOSED` | An agent has a recommendation; carries no authority. |
| `SUPERSEDED` | Replaced by a later numbered decision. |

**Rule D-1:** A decision may **not** be `LOCKED` on the strength of conversation history,
a prior agent's report, or "we discussed this". Locking requires an explicit founder
statement that can be pointed to.

**Rule D-2:** While a decision is `PENDING_FOUNDER`, no agent may quietly resolve it by
building one branch of it, by putting the alternative into "Deferred", or by letting a
schedule decide. Silence is not consent.

---

## DEC-013 — status corrected

| Field | Value |
|---|---|
| **ID** | DEC-013 |
| **Status** | ~~`LOCKED`~~ → **`PENDING_FOUNDER`** |
| **Subject** | **UNRECOVERABLE from the repository.** Content existed only in conversation. |
| **Why changed** | It was marked `LOCKED` on conversation history alone. That violates Rule D-1. A lock that cannot be pointed at is indistinguishable from an assumption. |
| **What is needed** | The founder must (a) restate what DEC-013 actually decides, and (b) explicitly approve it. Restatement alone does not lock it. |
| **Blocking** | Unknown until restated — which is itself the risk. Any task that silently depended on DEC-013 is now proceeding on an unverified premise. |
| **Agent position** | No recommendation offered. Recommending on unknown subject matter would manufacture the exact false confidence this revision exists to remove. |

---

## DEC-014 — V1 product horizon *(new)*

| Field | Value |
|---|---|
| **ID** | DEC-014 |
| **Status** | **`PENDING_FOUNDER`** |
| **Question** | Is Qimmah V1 **(A) Web launch only** or **(B) Web + iOS launch**? |
| **Raised** | This revision, v0.9.1 |

### Why this must be decided before the plan freezes

This is not a scheduling preference — it changes the shape of V1. The repository currently
contains **both** postures simultaneously, unresolved:

- `capacitor.config.ts` and a full `ios/` directory exist at trunk.
- `docs/ios-setup.md`, `docs/appstore/`, and `docs/legal/APPSTORE-COMPLIANCE-PACK.md` exist.
- `AGENTS.md` §11 carries an **open, undiagnosed** iOS launch failure (`ERR_UNKNOWN` on a
  physical device) as open debt.
- Simultaneously, the most recent trunk commits are web-release work
  (`[QIM-WEB-RELEASE-001/002]`), and production hosting is Cloudflare Pages from `main`.

Until DEC-014 is answered, every downstream task has two different definitions of "done".

### Recommendation (PROPOSED — carries no authority)

**Option A — Web launch only.**

Reasoning, stated as inference rather than fact:
1. The trunk's own recent history is a web release line. The web path is the one with
   demonstrated momentum.
2. iOS carries a **known-open, undiagnosed** launch failure. Committing to a store launch
   while the app does not reliably boot on a device converts an engineering unknown into a
   dated external promise.
3. App Store review adds a third-party actor whose timing the founder does not control,
   on top of a codebase whose ground is only being verified today.
4. Option A is **not** a cancellation of iOS. It defers it to V1.1 with its work intact.

### Consequences of A — Web launch only

- **In scope:** web release, Cloudflare Pages production, Salla commercial path, web support.
- **Deferred to V1.1 (not cancelled, not deleted):** Capacitor packaging, `ios/`,
  TestFlight, App Store listing, App Store compliance pack, the `ERR_UNKNOWN` diagnosis.
- Native-specific verification (`V-IOS-01`) drops out of the V1 gate.
- App Store privacy-label obligations stop being a V1 blocker; **PDPL and web privacy
  obligations do not** — those remain in scope regardless.
- **Risk:** iOS code in the tree keeps ageing against an unshipped target and will cost
  more to revive later. Accepted cost, not a hidden one.

### Consequences of B — Web + iOS launch

- **In scope additionally:** `ERR_UNKNOWN` root-cause diagnosis, physical-device QA,
  App Store Connect setup, privacy labels, review submission and its iteration loop.
- Adds founder-only actions to the critical path: Apple Developer enrollment, signing
  certificates, App Store Connect records, TestFlight distribution (see `STATE.md`
  ACT-008/ACT-009).
- Adds a **hard external dependency** — review turnaround — to the release date.
- Every user-facing claim must be true on **two** platforms, roughly doubling the surface
  that `QIM-V1-TRUTH-001` must inventory and verify.
- **Risk:** an unresolved native boot failure becomes the single point of failure for the
  whole V1 date, including the web half that was otherwise ready.

### Default if the founder does not answer

**Default = A (Web launch only), and it is a *deferral*, not a decision.**

Guardrails on the default, so it cannot become a silent decision (Rule D-2):

1. iOS artefacts (`ios/`, `capacitor.config.ts`, App Store docs) are **not deleted, not
   archived, and not marked Deferred in `PLAN.md`** while DEC-014 is `PENDING_FOUNDER`.
   They are marked `HORIZON-PENDING`.
2. No release may be declared "V1" under the default. Shipping under an unanswered
   DEC-014 would let a timeout decide the product's scope.
3. The default expires the moment the founder answers, in either direction.

---

## Open decision index

| ID | Subject | Status | Blocks |
|---|---|---|---|
| DEC-013 | Unrecoverable — must be restated | `PENDING_FOUNDER` | Unknown (see above) |
| DEC-014 | V1 product horizon: Web only vs Web + iOS | `PENDING_FOUNDER` | QIM-V1-IOS-001, release scope, ACT-008, ACT-009, TRUTH-001 surface |

**DEC-001..DEC-012 are not recorded here.** No repository evidence of them exists. They
are **not** presumed locked, and **not** presumed absent — they are simply unverified.
If the founder holds them, they should be restated so they can be entered under Rule D-1.

---

## Change log

| Rev | Change |
|---|---|
| v0.9 | Baseline referenced by the founder instruction. Not present in this repository. |
| v0.9.1 | DEC-013 `LOCKED` → `PENDING_FOUNDER` and its unrecoverability recorded. DEC-014 (V1 horizon) created as `PENDING_FOUNDER` with recommendation, consequences and a guarded default. Rules D-1 and D-2 made binding. |
