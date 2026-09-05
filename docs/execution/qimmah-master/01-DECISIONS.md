# 01 — DECISIONS REGISTER (سجلّ القرارات)

> **Canonical owner of one fact only: what has already been decided, and what has not.**
> A `LOCKED` decision **must not be reopened** by a later agent because it prefers a
> different architecture. Reopening requires a **new numbered decision** recording who
> reopened it and why. Preference is not a reopen condition.

Status: `LOCKED` · `PENDING_FOUNDER` · `SUPERSEDED`

---

## LOCKED — do not reopen

### DEC-001 — `main` is the production pointer; the frontier is a different commit
- **decision:** `main` = what Cloudflare Pages serves. The development frontier is
  `CANONICAL_GROUND` (`00-GROUND.md`). They are 228 commits apart and that is not a bug.
- **reason:** Every restart of this project began with an agent reading `CLAUDE.md §1`
  ("الجذع الحالي: `main`"), treating `main` as the frontier, and rebuilding work that
  already existed 200 commits ahead.
- **evidence:** `git rev-list --left-right --count origin/main...origin/codex/qimmah-sovereign-closure-001` → `0  228`
- **owner:** control plane · **date:** 2026-08-18
- **reopen condition:** the founder promotes the ground to `main`; then they coincide and
  this decision is superseded by the promotion, not by an agent.

### DEC-002 — A preview build must never hold production Supabase authority
- **decision:** In a `founder_preview` build, missing Supabase env means **"configured with
  nothing"** — the baked production credentials are *absent from the artifact*, so
  `isSupabaseConfigured()` is false and every dangerous writer fails **closed**.
  Production behaviour is unchanged: the public URL + `anon` key stay baked in (they are
  public by design and protected by RLS — charter §9).
- **reason:** The fallback used to be unconditional, so *absence of configuration* meant
  *full write access to the production database*. Any review deployment could
  `redeem_access_code` (irreversible), `start_trial`, `claim_pending_grants`, or
  `auth.signUp` real users and send real email.
- **the subtlety that makes it hold:** `import.meta.env.VITE_APP_ENV` is read **inline**,
  not through an imported helper, so Vite folds the constant and tree-shakes
  `DEFAULT_SUPABASE_*` out of the preview bundle entirely. *"The credential is not in the
  artifact"* is strictly stronger than *"it is there and unused"* — and it is checkable:
  `grep` the preview `dist/assets/*.js` for the project URL and find nothing.
- **evidence:** `src/lib/supabaseClient.ts:17-50` (verified this session);
  `vite.config.ts:23-24` auto-sets `founder_preview` for non-production Cloudflare branches;
  `docs/execution/qimmah-founder-qa/PREVIEW-SAFETY.md` §1–§2;
  guard `test:branch-preview-safety` (9/9, 3 counter-proofs).
- **owner:** founder-QA lane · **status:** implemented and guarded
- **reopen condition:** none. This is a security invariant.

### DEC-003 — Promotion to `main`, any deploy, and any production migration are founder-only
- **evidence:** `CLAUDE.md §1`, `§1.1`, `QIMMAH-QUALITY-CHARTER.md §7`
- **note:** pushing commits to a *working branch* is ordinary work; **promotion is not**.
- **reopen condition:** none.

### DEC-004 — The merge button is founder-only; ambiguity is answered with a question, not an action
- **evidence:** `CLAUDE.md §1.1`. An authorisation addressed to anyone else is not an
  authorisation to the agent, even in the same message.
- **reopen condition:** none.

### DEC-005 — Entitlement is server-owned; the client may never grant Premium
- **decision:** Trial, activation codes, and Salla grants are decided by Postgres RPCs
  (`start_trial`, `redeem_access_code`, `claim_pending_grants`, `my_entitlement`).
  The client renders an answer; it never computes one.
- **evidence:** `src/lib/access/entitlementBackend.ts:149,214,238,262`;
  `supabase/functions/salla-webhook/index.ts`; gate steps `test:access-gate`, `test:activation-ui`.
- **reopen condition:** none. Client-side entitlement is a commercial integrity failure.

### DEC-006 — No silent storage success
- **decision:** Every write goes through the checked `safeStorage` wrapper and its
  `WriteResult` is inspected. No success screen and no state clear before the write is
  confirmed. On failure: restore the snapshot, tell the truth, keep the data.
- **evidence:** `CLAUDE.md §5`; gate step `test:storage-honesty`.
- **reopen condition:** none.

### DEC-007 — Local-first; cloud sync is opt-in and health data needs its own consent
- **decision:** Sync is off unless `VITE_SYNC_ENABLED` is set (`.env.example:39`, empty by
  default). Sensitive health data syncs **only** behind a separate explicit consent.
- **evidence:** `.env.example:39`; `CLAUDE.md §8` locked decision 5; gate steps
  `test:sync-consent`, `test:sync-honesty`, `test:sync-coverage`.
- **reopen condition:** an explicit founder notice enabling sync (charter §3-5).

### DEC-008 — A question with no consumer is not asked
- **decision:** `nutrition.diet_pattern` renders **only** when `intent === 'meals'`,
  because the meal generator is its only consumer.
- **reason:** Charter §5 — asking a user something that changes nothing is a lie about
  why you asked.
- **evidence:** `src/lib/onboardingV2Flow.ts:111`; `src/views/OnboardingV2.tsx:1172`;
  commit `2e3042d`; guard `scripts/onboarding-questions-proof.ts:477-480`.
- **⚠ WHY THIS IS REGISTERED:** this correct change is what turned CI red (`QIM-V1-001`).
  **Do not "fix" the red by making the question unconditional again.** The harness is
  wrong, not the product.
- **reopen condition:** a second consumer for diet pattern appears.

### DEC-009 — QAE stays REFERENCE until after launch
- **decision:** `archive/qae-training-wave2-269b2bb` and `claude/qae-architecture-design-fhg2mh`
  (~121k lines, a second and more rigorous training engine) are **preserved, not adopted**.
- **reason:** Adopting a second plan engine during release convergence is precisely the
  move that has restarted this project. The shipping engine is guarded and green.
- **evidence:** `03-BRANCH-LEDGER.md` BR-06/BR-07.
- **reopen condition:** post-launch, by a new numbered decision. Preservation task `QIM-V1-014`.

### DEC-010 — Injury safety is a union, and it fails closed
- **decision:** Exercise exclusion uses **both** the structured `jointLoads` model (181/181
  exercises, compiler-enforced) **and** the legacy hand list — union, not replacement.
  Anything unclassified is **excluded**, not allowed.
- **reason:** The hand list alone accepted **70 of 181** forbidden exercises; the model
  alone missed 12 the list catches. Substitution previously replaced `arnold-press` with
  `dumbbell-shoulder-press` — literally the same mechanics.
- **evidence:** `test:injury-safety` — 80 checks, 0 failures, 7920 plans across 11 personas × 720 configurations.
- **reopen condition:** none. Fail-closed is not negotiable.

### DEC-011 — Numeral policy is enforced at the display boundary; storage stays Latin
- **decision:** Arabic-Indic numerals are produced by `formatNumeralsIn` **at the display
  call site**; stored values stay Latin.
- **reason:** The earlier guard asserted that `workoutDayLabel.ts` emits Arabic-Indic
  digits — but its output is *stored* (`planGenerator.ts:757`), not displayed. The guard
  watched the wrong file and stayed green after the real limit was removed.
- **evidence:** commit `f92f8bc` [FINAL-019] on `codex/qimmah-final-release-convergence-001`
  — **already on the ground**, which is why `QIM-V1-004` was closed as unnecessary
  (`PLAN-CHANGE-001`); `test:numeral-policy` 69/0.
- **reopen condition:** none.

### DEC-012 — Age floor 13 — **SUPERSEDED by DEC-016**
- **historical decision:** The minimum supported age was 13.
- **superseded by:** the founder's final age-floor authorisation recorded in DEC-016.
- **preservation:** this entry remains so the earlier `test:age-13` and App Store evidence are read as history, not current authority.

### DEC-016 — Age floor is 12; adult numeric personalization remains 18+
- **decision:** supported ages are 12+; ages 12–17 remain minors; age 18 restores the adult numeric path.
- **safety invariant:** ages 12–17 receive no adult-derived calorie, macro, hydration, BMI/BMR/TDEE,
  deficit/surplus, weight-change-rate, or numeric forecast prescriptions. Workouts, food logging,
  progress tracking, and qualitative guidance remain available.
- **evidence:** `AGE_RANGE` in `src/config/profileDomain.ts`; `ADULT_MIN_AGE` in
  `src/lib/calculators.ts`; gate steps `test:age-12`, `test:body-fields`, `test:minors`,
  `test:formula`, and `test:prelaunch-age-beginner`.
- **owner:** founder · **date:** 2026-09-05.
- **reopen condition:** a later explicit founder decision.

### DEC-013 — Founder decisions already locked in the charter stay locked
1. Nutrition **budget** feature is out of V1.
2. The Ramadan question is permanent, neutrally worded, seasonally activated.
3. Plan changes are **always a suggestion** in V1 — no silent automatic edit; every change
   is explained.
4. The expanded exercise-library source stays **suspended** until the current library is inventoried.
5. Sensitive health data syncs only behind separate explicit consent.
- **evidence:** `CLAUDE.md §8`. · **reopen condition:** founder, in a numbered message.

### DEC-014 — V1 ships as the Arabic-first **Web/PWA**; native iOS is deferred
- **decision:** The launch horizon is the web app on Cloudflare Pages. Capacitor/iOS
  packaging, TestFlight and App Store submission are **post-launch**.
- **evidence:** the last two commits on `main` are `QIM-WEB-RELEASE-001/002` (PWA
  convergence, promotion of an approved *web* build); the founder-QA link is a Pages
  preview; the open iOS item (`ERR_UNKNOWN` boot failure) is recorded in `CLAUDE.md §11`
  as debt **outside** the coordinator's scope.
- **reopen condition:** the founder names a TestFlight date. Listed for confirmation as
  `FA-08` — it does **not** block execution.

---

## PENDING_FOUNDER — execution continues around these; they block only their own tasks

> **DEC-101 used to head this list. It was wrong** — the charter had already decided it. It is kept
> below, struck through and re-registered as the LOCKED **DEC-015**, because a corrected decision
> teaches more than a deleted one. **Nothing on the critical path waits on a human any more.**

### ~~DEC-101~~ → **DEC-015 — Premium is a one-time 19.99 SAR purchase. ALREADY DECIDED.**
> **This entry was wrong when first written, and the correction matters more than the entry.**
> It was registered as `PENDING_FOUNDER` ("is Premium annual or perpetual?") on the strength of an
> earlier session's state document. **The charter had already answered it** — `AGENTS.md §0.1`,
> which is founder-signed constitution, not an agent's note. Charter §1.5 warns about exactly this:
> *"القرار قد يكون هو البائت"* — check the document's provenance before its content.
> Re-registered as **LOCKED**, and `01`'s `PENDING_FOUNDER` list is one item shorter.

- **the decision, from `AGENTS.md §0.1`:**
  - **19.99 SAR, unified across every channel** (Salla · app · site).
  - **one-time purchase — no monthly subscription, no renewal.** The only approved user-facing
    sentence is «يشمل تحديثات قِمّة — بلا اشتراك شهري».
  - **a permanent second price is forbidden**: «العروض تكون حملات مؤقّتة أو أكوادًا، **لا سعرًا
    ثانيًا دائمًا**».
  - banned words on every user surface: «مدى الحياة» · "lifetime" · "all current and future updates".
  - three gates only: **72-hour trial** (once per verified account) · **Premium** · **access code**
    (default 14 days).
- **the code already matches it:** the backend grants `no_expiry = true` with no renewal logic
  anywhere in `supabase/migrations/` — which is exactly "one-time purchase, no subscription".
  The schema making an *expiring* Premium unrepresentable is **correct**, not a defect.
- **so what is actually wrong is one thing, and it is outside the repository:** the live Salla
  storefront says «19.99 ريال **سنويًا**» and carries a permanent second price of «89.99 سنويًا».
  Both violate §0.1. **The corrections are already drafted**, string by string, in
  `docs/product/SALLA-MERCHANT-COPY-CHANGES.md:19-22`.
- **the only genuinely open question** is narrow and commercial: keep or delete the struck-through
  **89.99** price anchor (`SALLA-MERCHANT-COPY-CHANGES.md §3`). Keeping it is defensible only if
  89.99 was or will be a real price.
- **consequence — this unblocks the critical path:** `QIM-V1-010` no longer waits on a human for
  anything inside the repository. Every in-repo surface can now be corrected against a decided
  policy. `FA-01` is narrowed to the external storefront edit and the 89.99 anchor.
- **reopen condition:** the founder changes the price or the access model in a numbered message.

### DEC-102 — Commit the 82 MB food long-tail shards, or host them
- 59,941 records · 41 shards · **82 MB**, generated and fingerprint-verified against the
  committed manifest. Committing them is permanent repository weight; not committing them
  means the long tail is not served in production.
- **the proof is honest either way** — the product degrades truthfully.
- **blocks:** `QIM-V1-011` · **founder action:** `FA-02`

### DEC-103 — Apply the 13 `APPLY_PENDING` migrations to production
- Without them the executive dashboard is closed **to the founder himself**, and
  entitlement/webhook tables do not exist in production.
- **blocks:** `QIM-V1-012`, admin surface · **founder action:** `FA-03`

### DEC-104 — 37 missing exercise images / 22 videos
- Part rights, part **tone** (`face-pull`, `arnold-press`). The founder's own 588 MB library
  covers named gaps: **9 approved · 36 awaiting QA · 136 queued**.
- **blocks:** `QIM-V1-013` · **founder action:** `FA-04`

### DEC-105 — AI Coach contradicts `docs/product/BACKLOG.md:32`
- The backlog explicitly excludes a smart coach; the founder authorised one in a later
  mission. A written resolution is needed — the document and the code currently disagree.
- **current state:** `src/lib/coach/` exists as a logic layer with a 16-check attribution
  guard, **no UI and no route**. It ships to nobody today, so this blocks nothing in V1.
- **founder action:** `FA-05`

---

## SUPERSEDED

### DEC-901 — "The trunk is `design/v21-promotion`" — **SUPERSEDED** by DEC-001
Already corrected in `CLAUDE.md §1` at [CTO-71]; recorded here so the nine open PRs listed in the ledger are read correctly (`03-BRANCH-LEDGER.md` §D).

### DEC-902 — "`main` is the frontier" — **SUPERSEDED** by DEC-001
This is the specific belief that restarted the project. `CLAUDE.md §1` is *correct about
governance* (`main` is where releases land) and *misleading about development* (the work
is 228 commits ahead). Both readings are now reconciled in DEC-001.
