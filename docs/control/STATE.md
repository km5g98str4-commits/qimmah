# STATE.md — Qimmah Project State

**Revision:** v0.9.1
**Status:** PLANNING + VERIFICATION MODE.
**Purpose:** the single record of what is **VERIFIED** versus what is merely **CLAIMED**.

---

## ⚠️ PROVENANCE NOTICE

No predecessor `STATE.md` exists in this repository (`VERIFY.md` §Provenance). This file
is new. Everything in it is either evidence gathered under this revision, or explicitly
labelled as CLAIMED.

---

## 1. The CLAIMED / VERIFIED boundary

| Class | Meaning | Usable as a basis for work? |
|---|---|---|
| **VERIFIED** | Established under `VERIFY.md` evidence rules E-1..E-8, with a full SHA and a reproducible command | Yes |
| **CLAIMED** | Asserted by a document, a report, a branch name, or a conversation | **No** |

**Everything in this repository's ~40 root and `docs/` report files is CLAIMED** until
re-verified. This includes `MERGE_REPORT.md`, `FEATURE_INVENTORY.md`, `CODE_REVIEW.md`,
`BRANCH_AUDIT.md`, `E2E_GATE_REPORT.md`, `PREVIEW-CHECKLIST.md`, every `PHASE*_QA_REPORT.md`,
and `AGENTS.md` §11 "الحالة الجارية". Their age and authorship are unverified.

This is not a judgement about their accuracy. It is a statement that their accuracy is
**unknown**, which is the condition this control set exists to end.

---

## 2. VERIFIED GROUND

> Populated by Tier-1 execution. See `VERIFY.md` §3 for the check definitions.

*(Recorded at the end of this file, §5, under this revision's execution.)*

---

## 3. FOUNDER ACTIONS

**This section is distinct from Founder Decisions (`DECISIONS.md`).**

- A **Founder Decision** is a *choice* only the founder may make.
- A **Founder Action** is an *operation* only the founder can perform or authorize —
  typically because it requires a credential, an identity, a legal capacity, or an
  irreversible production effect that no agent holds or may hold.

**Rule A-1:** An agent may **prepare** a Founder Action (write the migration, draft the
copy, stage the config) but may **never execute** one.
**Rule A-2:** A blocked PLAN task stays blocked. It is not routed around.
**Rule A-3:** Every action below is included **only** on verified repository evidence that
the project actually requires it. Actions considered and excluded are listed in §3.1.

| ACTION_ID | Action | Why the founder is required | Blocks | When required | Status |
|---|---|---|---|---|---|
| **ACT-001** | **Salla commercial verification** — confirm the Salla store is live, commercially verified, and that `https://salla.sa/Qimmahsa` resolves to the correct, purchasable product | Commercial/legal identity of the merchant. No agent can hold or verify a merchant account. | ENT-001, TRUTH-001 (subscription duration, trial, Premium claims) | Before any Premium or purchase claim is verified | ⬜ NOT STARTED |
| **ACT-002** | **Production secrets provisioning** — set real values for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_*`, `WORKOUTX_API_KEY` in the platform panel (never the repo) | Secrets must never reach an agent or the repository (`.claude/rules/security.md`) | REL-002, SEC-001 | Before production deploy | ⬜ NOT STARTED |
| **ACT-003** | **Production database migration authorization** — authorize applying `supabase/migrations/*` (12 files) to the live project | Irreversible effect on live user data. Charter §1: founder-only, named authorization each time. | ACC-001, SEC-001, REL-002 | Before production launch | ⬜ NOT STARTED |
| **ACT-004** | **Supabase production project action** — confirm which project is production, its auth settings, and its RLS enforcement state | Requires console access no agent holds | ACC-001, SEC-001 | Before ACC-001 verification | ⬜ NOT STARTED |
| **ACT-005** | **DNS / domain action for `qimmah.app`** — the site declares `https://qimmah.app/` canonical across `index/privacy/terms/press/support`, while the deployed production URL is `qimmah-8qp.pages.dev`. The domain must be owned, pointed, and TLS-valid — or the canonical URLs corrected. | Domain registrar and DNS control | TRUTH-001, REL-002 | Before public launch | ⬜ NOT STARTED |
| **ACT-006** | **Cloudflare Pages production deployment** — the actual production deploy of the `qimmah` Pages project | Charter §1: any deploy is founder-only, with named authorization each time | REL-002 | At release | ⬜ NOT STARTED |
| **ACT-007** | **Email provider configuration** — auth email delivery (signup confirm, password reset via `VITE_RESET_REDIRECT_URL`) and a monitored `support@qimmah.app` inbox | Requires provider/domain credentials; also a standing human commitment to read support mail | ACC-001, REL-001 (support destination must actually work) | Before ACC-001 and REL-001 verification | ⬜ NOT STARTED |
| **ACT-008** | **Final merge to `main`** — promotion of the release commit to the trunk | Charter §1: trunk promotion is founder-only and is the launch act | REL-002 | At release | ⬜ NOT STARTED |
| **ACT-009** | **App Store / TestFlight action** — Apple Developer enrollment, signing, App Store Connect records, TestFlight distribution | Apple developer identity and legal entity | IOS-001 | **Only if DEC-014 = B.** `HORIZON-PENDING` while DEC-014 is unanswered. | ⏸ HORIZON-PENDING |

### 3.1 Considered and excluded — no evidence the project requires them

Listed so their absence is a recorded finding rather than an oversight.

| Candidate | Why excluded |
|---|---|
| Founder / admin role provisioning | **No evidence found.** `grep -rn "is_admin\|role.*admin\|founder" SUPABASE-SCHEMA.sql supabase/` returns nothing. The schema has no admin/role concept. If an admin surface is later introduced, this becomes ACT-010. |
| Payment-processor (Stripe/Apple IAP) setup | No processor integration in the tree. Purchase is an **outbound link** to Salla (`src/config/product.ts:25`), and `[CTO-009/WP-3]` records "no in-app payment". Commercial verification is covered by ACT-001. |
| App-store age-rating / third-party review accounts | Subsumed by ACT-009; not separated while DEC-014 is unanswered. |

---

## 4. Open founder items — summary

### Decisions required (`DECISIONS.md`)
| ID | Subject | Status |
|---|---|---|
| DEC-013 | Unrecoverable — must be **restated** and then approved | `PENDING_FOUNDER` |
| DEC-014 | V1 horizon: Web only (A) vs Web + iOS (B) | `PENDING_FOUNDER` |

### Actions required (§3)
Nine actions, ACT-001..ACT-009. **None is required today** — none blocks Tier-1
verification. Their timing is stated per-row above.

---

## 5. TIER-1 GROUND VERIFICATION RESULTS

*Executed under revision v0.9.1. Definitions: `VERIFY.md` §3.*

> Appended by execution.
