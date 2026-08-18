# RELEASE CONVERGENCE — four verdicts

> ## ✅ RE-PRONOUNCED ON THE INTEGRATED HEAD — 2026-08-15
>
> **Measured against:** `03cda8f` — the Phase II convergence head, which contains
> the final Web Sovereign head `d83add2` (through `PKG-9`) **and** all five lanes.
>
> The earlier pass in this file was provisional against `1bcf7a9` (PKG-7).
> **That is superseded.** Layer 3 Profile landed in `PKG-8`; Layer 4 and Layer 6
> remain, and are the only Web Sovereign work still outstanding.
>
> **Every number in §0.1 below is from that re-run. Nothing is carried over.**
> Re-run command is unchanged: `node scripts/release/run-release-convergence.mjs`.

## 0.1 Results on the integrated head `03cda8f`

Run `2026-08-15T01:19:05Z` · evidence [`evidence/latest.json`](./evidence/latest.json).

| Suite | Engine | pass | fail | externally blocked |
|---|---|---:|---:|---:|
| `static-bundle-safety` | static | 22 | **1** | 0 |
| `static-regression-ledger` | static | 37 | 0 | 3 |
| `p1-preview-user` | chromium | 62 | **5** | 1 |
| `p2-premium-test-state` | chromium | 24 | 0 | 0 |
| `p3-returning-guest` | chromium | 15 | 0 | 0 |
| `p4-interrupted-onboarding` | chromium | 16 | 0 | 0 |
| `p5-dirty-state` | chromium | 52 | 0 | 0 |
| `p6-auth` | chromium | 50 | 0 | 1 |
| `p7-failure-conditions` | chromium | 27 | 0 | 0 |
| `p8-responsive-matrix` | chromium | 140 | 0 | 0 |
| **TOTAL** | | **445** | **6** | **5** |

⚠️ **`VALIDATION_DOWNGRADE = WEBKIT_UNAVAILABLE`** — no WebKit build exists in this
container (`/opt/pw-browsers/webkit-2311/pw_run.sh` absent, downloads disabled), so
**every browser number above is Chromium 141.0.7390.37 only**. The earlier WebKit
columns in this file were measured on `1bcf7a9` and **do not describe this head**.

**The 6 failures are 3 defects, none unexplained:**

1. **REL-003 (1 failure) — deliberate, must stay red.** The shipped destination is
   the Salla store root, not a product URL. `EXTERNALLY_BLOCKED / COMMERCIAL BLOCKER`
   until a real product URL exists. Reclassifying it green is forbidden.
2. **REL-002 (2 failures) — P1, still open.** `plan.saveEdit` is guarded on
   `WorkoutView` but **not** on `#/setup`: a Preview user changed goal `cut → bulk`
   and it **survived a reload**, with no gate on change and none on save.
3. **REL-001 (3 failures) — P2, partially fixed, still open on the live surfaces.**
   `22e9a4c` applied `formatNumber` to the live `NutritionView`/`WorkoutView` and
   the static ledger went green — but the **browser** shows Latin digits still
   reaching Arabic sessions (Nutrition `1937`; Workout `اليوم 1 · علوي`, `5`, `30`),
   and the same fact disagrees across screens (`#/profile` `٤ أيام/أسبوع`
   arabic-indic vs `#/workout` `4 أيام/أسبوع` latin).
   **Merge fidelity was verified**: both live files are byte-identical to lane head
   `8bc53b2`, so the fix was **not lost in the merge — it is incomplete**.
   *Lesson recorded:* the lane re-ran only the static suites after that fix. Presence
   of `formatNumber` in a file is not proof that every rendered number uses it.

**Contract:** `[QIMMAH-SOVEREIGN-PHASE-II-001]` · AGENT-A (Release Convergence / adversarial QA)
**Branch:** `codex/qimmah-release-convergence-001`
**Machine-readable evidence:** [`evidence/latest.json`](./evidence/latest.json)

| Suite | Engine | pass | fail | externally blocked |
|---|---|---:|---:|---:|
| `static-bundle-safety` | — | 22 | 1 | 0 |
| `static-regression-ledger` | — | 25 | 3 | 2 |
| `p1-preview-user` | chromium | 54 | 5 | 1 |
| `p1-preview-user` | **webkit** | 54 | 5 | 1 |
| `p2-premium-test-state` | chromium | 24 | 0 | 0 |
| `p3-returning-guest` | chromium | 15 | 0 | 0 |
| `p3-returning-guest` | **webkit** | 15 | 0 | 0 |
| `p4-interrupted-onboarding` | chromium | 16 | 0 | 0 |
| `p5-dirty-state` | chromium | 52 | 0 | 0 |
| `p6-auth` | chromium | 50 | 0 | 1 |
| `p7-failure-conditions` | chromium | 27 | 0 | 0 |
| `p8-responsive-matrix` | chromium | 140 | 0 | 0 |
| `p8-responsive-matrix` | **webkit** | 140 | 0 | 0 |

**Every one of the 14 failures maps to exactly four defects** — REL-001 (4
assertions × 2 engines + the ledger entry), REL-002 (2 × 2 engines), REL-003 (1),
REL-004 (2). There is no unexplained red.

Local gates run in this pass: `npm ci` ✅ · `npm run typecheck` ✅ exit 0 ·
`npm run lint` ✅ exit 0 (zero warnings) · `npm run build` ✅ (both artifacts).
`npm run test:gate` and the CI read were **not** performed — see §2.4.

---

## 0. How this was measured

Everything below was exercised against the **final built artifact** served by
`vite preview` — not a dev server. Two artifacts were built from the same commit:

| Artifact | Build | Purpose |
|---|---|---|
| `dist-release/prod` | `vite build` | exactly what ships |
| `dist-release/mock` | `VITE_ENTITLEMENT_MODE=mock vite build` | the sanctioned test-only entitlement seam |

Engines: **Chromium** (full matrix) and **WebKit** (the mandated iPhone-critical
personas). WebKit was available on this machine, so **no validation downgrade
was recorded**.

**The judgement rule used throughout:** whether a blocked action actually
happened is decided by a **byte diff of every `qimmah:*` storage key**, never by
whether a button was visible. Hiding a control is not a boundary.

### What was reused rather than rebuilt

The repository already carries 124 `test:*` scripts including deep e2e suites
(`test:e2e:preview-gate`, `:nutrition`, `:workout`, `:progress`, `:exercises`,
`:navigation`, `:onboarding`, `:settings-security`, `:install-overlap`). **None
of them was duplicated.** This harness covers what they structurally cannot: the
cross-cutting persona journeys, the dirty/corrupt-state surface, the
width × language matrix, the shipped-bundle scan, and a re-run of the whole
historical defect ledger in one place.

---

## 1. Real defects found against PKG-7

### REL-001 — the numeral policy was applied to two dead files; the live screens still show Latin digits in Arabic — **P2, OPEN**

**What the user sees.** In one Arabic session at `1bcf7a9`:

| Live screen | Same class of value | Rendered as |
|---|---|---|
| `#/nutrition` | remaining calories, protein/carb/fat targets, water | `1937`, `148`, `206`, `58`, `3000` — **Latin** |
| `#/workout` | training days, exercises per day, minutes | `4 أيام/أسبوع`, `اليوم 1`, `5`, `30` — **Latin** |
| `#/profile` | the same training days | `٤ أيام/أسبوع` — **Arabic-Indic** |
| `#/progress` | weight, target | `٨٢ كجم`, `٧٤` — **Arabic-Indic** |
| `#/calc` | the user's own numbers | `١٬٧٩٨`, `١٬٩٣٧` — **Arabic-Indic** |

The decisive pair: **`٤ أيام/أسبوع` on Profile and `4 أيام/أسبوع` on Workout —
one fact, two numeral systems, one session.**

**Root cause.** BUG-019 declared `formatNumber` the single presentation boundary
for Layer-3 critical surfaces. It was wired into:

- `src/views/TodayV2.tsx` — **live** (DashboardView renders it) ✔
- `src/views/ProgressV2.tsx` — **live** (ProgressView wraps it) ✔
- `src/views/NutritionV2.tsx` — **no importer anywhere in `src/`** ✘
- `src/views/WorkoutV2.tsx` — **no importer anywhere in `src/`** ✘

The two live owners — `src/views/NutritionView.tsx` (App.tsx:28, 563) and
`src/views/WorkoutView.tsx` — never import `formatNumber`. `NutritionView.tsx`
still formats with a local `const round = (n) => Math.round(n)`.

**Why the existing gate did not catch it.** `scripts/settings-preferences-proof.ts`
(lines 42–51) checks exactly this list:

```
src/views/NutritionV2.tsx   ← dead
src/views/TodayV2.tsx       ← live
src/views/WorkoutV2.tsx     ← dead
src/views/ProgressV2.tsx    ← live
src/lib/progressV2Model.ts  ← live
```

and its named assertion `'التغذية لا تفرض أرقام en-US داخل العربية'` reads
`src/views/NutritionV2.tsx`. The repository's **own** analytics proof already
records both files as unrendered — `scripts/run-analytics-proof.mjs:71`:
"`views/NutritionV2.tsx` … وكلاهما **بلا مستورد** — كودٌ لا يُرسَم للمستخدم".

So `test:settings-preferences` 17/17 is green **because it is measuring files the
user never sees**. This is the §4.2 "مرور غير مستحقّ" pattern: the assertion can
be satisfied while its stated purpose is defeated.

**Reproduction**

```bash
node scripts/release/run-release-convergence.mjs --only=p1,static-ledger
# p1  → section "numeral policy holds across every LIVE numeric surface"
# ledger → BUG-019
```

Manually: build, serve, complete onboarding as a guest in Arabic, decline
Premium, then compare `#/profile` and `#/workout`.

**Not decided here (needs an owner):** whether the fix is to route
`NutritionView`/`WorkoutView` through `formatNumber`, or to narrow the declared
policy. Charter §7 — a conflict between standard and code is raised, not settled
by an agent.

---

### REL-002 — the declared paid action `plan.saveEdit` is enforced on one live path and open on another — **P1, OPEN**

**What a Preview user can do at `1bcf7a9`:**

1. `#/settings` → «تعديل خطتي» → lands on `#/setup` (the customization centre)
2. change the goal from **cut → bulk**
3. press **«حفظ مؤقت»**
4. **no Premium gate opens**, `qimmah:customization:v1` is written, and
   `profile.goal === "bulk"` **survives a reload**

`goal` is the top-level plan driver — it feeds calorie targets, macros and plan
generation. An entitlement-`none` user permanently re-configured their plan.

**Why this is a defect and not a policy choice.** The repository's own central
enum declares it paid — `src/lib/access/paidActions.ts:33`:

```
| 'plan.saveEdit' // حفظ تعديل ينتج حالة مدفوعة
```

and it **is** guarded, but at exactly one site —
`src/views/WorkoutView.tsx:493`, `guardPaid('plan.saveEdit', …)` on
`CustomPlanBuilder.onSave`. There is no `assertPaid('plan.saveEdit')` anywhere in
the writer layer, so the customization-centre save has neither a UI guard nor a
writer guard. The same conceptual action is therefore **gated on one route and
open on another** — the exact shape of BUG-001 and BUG-010.

**Why `test:access-gate` 84/84 is green.** `scripts/run-access-gate-proof.mjs`
maps the action to a single named site (lines 90 and 138):

```
'plan.saveEdit': 'WorkoutView CustomPlanBuilder.onSave'
```

It asserts that site is guarded. It has no mechanism to discover a *second* live
writer of the same paid concern, so a second path is invisible to it by
construction.

**Reproduction**

```bash
node scripts/release/run-release-convergence.mjs --only=p1
# section "plan-edit boundary — the SECOND live path to the same paid state"
```

**Two defensible resolutions — this needs a decision, not an agent's choice
(charter §3):**

| Option | Change | Consequence |
|---|---|---|
| **A — close the gap** | Put the central guard on the customization-centre save, and add `assertPaid('plan.saveEdit')` to the `qimmah:customization:v1` writer. | Preview users can browse the editor but not persist. Matches the declared enum. |
| **B — narrow the declaration** | Remove `plan.saveEdit` from `PAID_ACTIONS` and state that plan editing is free (consistent with §0.1 making التخصيص free), removing the WorkoutView guard too. | Preview users may re-plan freely. Requires the founder's explicit word, since it changes what "paid" means. |

Either way, `test:access-gate` should be strengthened to enumerate **every**
live writer of a paid concern rather than one named site — otherwise the next
second path will be invisible again.

---

### REL-003 — the shipped Premium destination is a store root, not the product — **P1 commercial, EXTERNALLY_BLOCKED**

`src/config/product.ts:25` ships `https://salla.sa/Qimmahsa` — the Salla **store
root**. It is the only Salla URL in the production artifact. A buyer who taps
«احصل على Premium» arrives at a store, not at the ١٩٫٩٩ product, so the paid
funnel cannot be proven to terminate on the right SKU.

This confirms upstream `EXTERNAL-001` at the **artifact** level rather than the
source level. It cannot be closed from here: it needs the founder to supply the
verified public product URL and set `VITE_CHECKOUT_URL`.

---

### REL-004 — the local data-key registry points at a dead owner and misses the live one — **P3, OPEN**

`src/lib/userDataKeys.ts` calls itself «السجل المركزي لمفاتيح البيانات — مصدر
الحقيقة الوحيد لتصنيف كل مفتاح localStorage», and its own header requires that
«أي مفتاح جديد يجب تسجيله هنا».

| | |
|---|---|
| The **live** active-session key | `qimmah:activeWorkout:v1` — `src/lib/activeWorkout.ts:17` (`ACTIVE_WORKOUT_KEY`) |
| What the registry contains | `qimmah:active-workout:v2`, owner `WorkoutV2` — **a view with no importer anywhere in `src/`** |
| Is the live key registered? | **No.** |

Also unregistered but live: `qimmah:firstWin:v1:<owner>` and
`qimmah:migrations:v1` (the latter *is* in the `accountScope` allowlist).

**Impact, stated precisely — no data leak was found.** Account switching and
wipe are handled by `src/lib/accountScope.ts`, which uses an independent
**fail-safe allowlist**: any `qimmah:*` key not explicitly kept is deleted. So
the unregistered session key *is* wiped correctly — **because the wipe does not
use this registry**, not because the registry is right. The registry does feed
`unscopedUserKeys()` → `src/lib/dataOwnership.ts` (ownership stamping /
quarantine / migration), so the live active-session key sits outside that
machinery.

This also had a direct effect on **this harness**: the first version of the
Preview assertion "no workout session was ever written" watched only the
registered `qimmah:active-workout*` prefix — a key the app never writes — so it
would have passed no matter what Preview did. It was caught by Persona 2, which
proved an *entitled* user creates `qimmah:activeWorkout:v1`, and the assertion
now watches both spellings with a counter-proof. Recorded here because it is a
worked example of the §4.2 "مرور غير مستحقّ" pattern the registry drift can cause
in any test that trusts it.

**Reproduction:** `node scripts/release/run-release-convergence.mjs --only=static-ledger`
→ section "local data-key registry integrity".

---

### Observations recorded, not raised as defects

| # | Observation | Why it is not filed as a defect |
|---|---|---|
| OBS-1 | `http://localhost:9999` ships inside `assets/index-*.js` | It is a `gotrue-js` (`@supabase/supabase-js` 2.108.2) internal vendor default, inert because the client is always constructed with the configured URL. Named exclusion in the scan, guarded by a counter-proof that any other loopback URL is still caught. |
| OBS-2 | `#/calc` renders formula constants (`10`, `6.25`, `9`) in Latin | A published equation's constants are notation, not user values; the same screen renders the user's own numbers Arabic-Indic. Named exclusion, guarded by the paired same-fact check. |
| OBS-3 | `src/config/product.ts:2` — «👈 هذا أول ملف يعدّله **المشتري** لتخصيص علامته بالكامل» | Template language describing the repository as a product sold to a buyer (charter §0.2). `test:no-template-language` **does** scan this exact file, but its `FORBIDDEN` list covers «صفحتك» / "your page" / "page owner" and not «المشتري» — so the line passes. It is a comment, not a user surface, hence low severity; worth one line in a text wave. |
| OBS-4 | The dashboard CTA «ابدأ التمرين» performs navigation, not a mutation | Correct behaviour. Recorded because the existing `test:e2e:preview-gate` taps `/ابدأ تمرين اليوم\|ابدأ تمرين/` on `#/workout`, where the only match is «ابدأ تمرين فارغ» — so that assertion is actually exercising `workout.startEmpty` under the label «بدء التمرين». Not a product defect; a labelling imprecision in an existing proof. |

---

## 2. THE FOUR VERDICTS

### 2.1 `GO_FOUNDER_DEVICE_QA` — **PROVISIONAL GO**

**The founder can pick this build up and use it.** Nothing crashes, nothing eats
data, and every surface renders.

Evidence:

- All 15 browsable routes render real content in Preview; no blank screens, no 404s where content is expected.
- Eight dirty/corrupt-state vectors — legacy v5 draft, truncated JSON, unknown future version, array/object mismatch, scalar-in-object slot, stale foreign session, empty-string values, prototype-pollution payload — every one boots, renders every main tab, destroys no unrelated key, and shows no raw exception. `Object.prototype` was not polluted.
- A device that refuses **every** `qimmah:*` write still boots, still navigates, destroys no existing key, and never shows a storage exception to the user.
- Invalid routes, malformed deep links, traversal-shaped hashes and injected query junk all resolve honestly with a way back.
- A failed lazy route chunk keeps the shell alive and shows a recovery surface with a `QW-*` support reference (BUG-005 contract intact).
- Ten widths × two languages: no surface scrolls sideways, the bottom bar covers no interactive content, and the Premium dialog fits and stays operable everywhere.
- WebKit — the closest available proxy for iPhone — ran the critical paths without a downgrade.

**Carry into device QA:** REL-001 (numerals) is immediately visible on device and
will look like a bug to anyone who opens Nutrition next to Progress. REL-002 is
reachable in three taps.

**Out of scope of any browser:** the open `ERR_UNKNOWN` iOS boot defect (charter
§11) and real TestFlight behaviour.

---

### 2.2 `GO_PREVIEW_FREE_USERS` — **PROVISIONAL GO, CONDITIONAL**

**The Preview boundary holds where it matters most, with one named hole.**

What holds:

- **11 of 13** enumerated paid actions were classified with live evidence; the other 2 (`workout.logSet`, `workout.finish`) are unreachable **because** `workout.start` is blocked — proven by the absence of any `qimmah:active-workout*` key across the entire matrix, not assumed.
- Every exercised mutation opened the one coherent Premium surface, wrote **zero** bytes of paid state, and surfaced no raw exception.
- Forged authority is refused: a `localStorage` "premium" flag, a `?premium=active` query parameter and a planted `qimmah:entitlement-mock:v1` value in `localStorage` all fail to grant anything — the mock store is read from `sessionStorage` only, so a `localStorage` forge cannot reach it even in the mock build.
- A returning guest is still a Preview user after reload, Back and Forward, with no data loss and no silent mutation.
- The reveal screen carries a real personalized plan, offers both Premium and a free-preview exit, opens the purchase link with `noopener noreferrer`, and contains none of the three forbidden Premium promises.
- **No forbidden promise ships**: «مدى الحياة», "lifetime" and «كل التحديثات الحالية والمستقبلية» are absent from the production artifact.

**The condition:** REL-002. A Preview user can persist a plan-configuration edit
that the app's own enum calls paid. Free preview can open **either** with that
gap closed (Option A) **or** with the founder's explicit statement that plan
editing is free (Option B) — but not with the two in contradiction, because the
contradiction is what makes the boundary unpredictable.

---

### 2.3 `GO_PAID_COMMERCIAL_FUNNEL` — **NO-GO**

**Not a judgement call. The funnel has no proven terminus and no activation.**

| Blocker | Status | Evidence |
|---|---|---|
| The Premium CTA points at a store root, not the ١٩٫٩٩ product | **REL-003 / EXTERNAL-001** | `https://salla.sa/Qimmahsa` is the only Salla URL in the production artifact; no product id reaches the frontend |
| No entitlement backend exists | **EXTERNAL-002** | `resolveEntitlement()` returns `{status:'none', source:'none'}` in any non-mock build; `redeemActivationCode()` returns `offline` |
| Real payment | **NOT PERFORMABLE** | No payment may be executed from this environment under any circumstance |
| The 72-hour trial and the 14-day access code have no server to issue or expire them | **EXTERNAL-002** | the three gates of §0.1 have no live implementation to test |

What **is** proven, and is a genuine asset for the day the backend exists:

- The production build **cannot grant Premium to anyone**. Proven live: the same valid `QIMMAH-TEST-OK` code that activates in the mock build returns an honest offline outcome in the production build and grants no write.
- The test seam does not ship. No mock code string, no mock storage key, no `VITE_ENTITLEMENT_MODE` reference survives into `dist-release/prod` — and the counter-proof confirms the same scan **does** find all of it in `dist-release/mock`, so the scan is measuring something.
- Activation-code outcomes are honest and give no oracle: two different unknown codes return the same generic message, while used / expired / unknown remain distinguishable.
- No secret material ships: no `service_role` key, PEM block, live secret key, GitHub token or AWS key id; no source maps; no external `sourceMappingURL`.

---

### 2.4 `GO_MERGE_MAIN` — **NO-GO / NOT YET ISSUABLE**

Three independent reasons, any one sufficient:

1. ~~**The baseline is not the tip.**~~ ✅ **Closed** — this pass measured `03cda8f`, which contains the final Web Sovereign head `d83add2` and all five lanes. Layer 3 Profile landed in `PKG-8`; only Layer 4 and Layer 6 remain.
2. **Two open defects** — REL-001 (P2) and REL-002 (P1) — and REL-002 in particular is a paid-boundary inconsistency, which is the class this whole programme exists to prevent shipping.
3. **Open defects** REL-001, REL-002, REL-004 all remain unresolved.
4. **The charter's landing gate was not completed in this pass** and is outside this contract's scope:
   - `npm run typecheck` ✅ exit 0 · `npm run lint` ✅ exit 0 (both run here)
   - `npm run build` ✅ (both artifacts built)
   - `npm run test:gate` — ✅ **run and green on the integrated head**, exit 0 across all 109 steps after `npm ci`
   - **CI must be read before any landing** (charter §4.0) — **still not performed**; the integrated head has not been pushed through CI yet
5. **The merge button is the founder's alone** (charter §1.1). No agent may merge, and no authorization to do so exists in this contract.

**What would make it issuable:** final HEAD + REL-001/REL-002/REL-004 resolved or
explicitly waived + full `test:gate` green after `npm ci` + a green CI read +
a founder-signed `[CTO-n]`.

---

## 3. Verdict summary

| Verdict | Result | Gating item |
|---|---|---|
| `GO_FOUNDER_DEVICE_QA` | **GO** | on the integrated head; carry REL-001/REL-002 into the session knowingly |
| `GO_PREVIEW_FREE_USERS` | **NO-GO** | REL-002 is a *proven* paid-boundary breach on `#/setup`, not a theoretical one |
| `GO_AUTHENTICATED_FREE` | **NO-GO** | EXTERNAL-003 — live account lifecycle never proven against a real server |
| `GO_PAID_COMMERCIAL_FUNNEL` | **NO-GO** | EXTERNAL-001 (product binding) + EXTERNAL-002 (no backend) |
| `GO_MERGE_MAIN` | **NO-GO** | REL-002 open · WebKit unproven on this head · founder-only authority (charter §1.1) |

### Open defects at `03cda8f` (the integrated head)

| id | severity | title |
|---|---|---|
| REL-001 | P2 | **still open** — partially fixed in `22e9a4c`; the browser still shows Latin digits on live Nutrition/Workout in Arabic |
| REL-002 | P1 | `plan.saveEdit` enforced on one live path, open on the customization-centre path |
| REL-003 | P1 commercial (externally blocked) | shipped Premium destination is the Salla store root, not the product |
| ~~REL-004~~ | P3 | ✅ **CLOSED** in `1412648` — the live `qimmah:activeWorkout:v1` is registered; ledger 37/0 |

---

## 4. Re-running this on the final HEAD

```bash
git rebase <FINAL_HEAD>
npm ci
node scripts/release/run-release-convergence.mjs
```

One command. See [`DEPENDENCIES.md`](./DEPENDENCIES.md) for the item-by-item
list of what specifically requires the final HEAD and what will never be
closable from this environment.

---

## 5. The harness

| Path | What it is |
|---|---|
| `scripts/release/run-release-convergence.mjs` | the one command; builds, serves, runs every suite on every engine, writes the evidence |
| `scripts/release/lib/harness.mjs` | recorder, build/serve, engine probe, viewport matrix, storage diffing, the named exclusion lists |
| `scripts/release/lib/drive.mjs` | stable app drivers + the captured completed-guest seed |
| `scripts/release/personas/p1..p8` | the eight persona suites |
| `scripts/release/static/bundle-safety.mjs` | what actually ships |
| `scripts/release/static/regression-ledger.mjs` | BUG-001..019 re-run + registry integrity |
| `docs/execution/qimmah-postweb/release/evidence/latest.json` | machine-readable record of the last pass |

It lives under `scripts/release/**` rather than `scripts/e2e/**` on purpose: the
Web Sovereign run is still landing packages inside `scripts/e2e/`, so a later
rebase onto the final HEAD cannot collide.

### Named exclusions, each with a counter-proof (§4.2)

No exclusion in this harness is silent. Each is declared at its use site and
guarded by an assertion that fails if it ever becomes a blanket pass:

| Exclusion | Why | Its guard |
|---|---|---|
| `qimmah:tracking:events:*` ignored in paid-state diffs | local usage telemetry legitimately records that the user *tried* a blocked action | a probe writes a real paid key and asserts the same diff detects it |
| `http://localhost:9999` in the bundle scan | a `gotrue-js` vendor default, inert | the scan asserts it *did* find loopback literals, so the pattern is live |
| `#/calc` formula constants left Latin | a published equation's constants are notation, not user values | the paired same-fact check (`أيام/أسبوع` on two live screens) which `#/calc` cannot satisfy by accident |
| WebKit `sw.js` access-control page error | WebKit refuses service-worker registration on a non-secure origin; the real https origin is unaffected | four genuine error strings are asserted to pass *through* the filter |
| `serviceWorkers: 'block'` in the failed-chunk vector | a service worker would serve the chunk and the injected failure would do nothing | the vector counts aborted requests and fails if the injection never fired |

### Requested `package.json` script lines

`package.json` was **not edited** (charter §1.4/2 — the coordinator owns it).
Requested additions:

```json
"test:release:convergence": "node scripts/release/run-release-convergence.mjs",
"test:release:fast": "node scripts/release/run-release-convergence.mjs --skip-build --engine=chromium",
"test:release:preview": "node scripts/release/run-release-convergence.mjs --only=p1,p3,static",
"test:release:static": "node scripts/release/run-release-convergence.mjs --only=static"
```

These are **not** proposed for `test:gate`: the full pass costs two production
builds and ~35 minutes of real browser time on two engines. It belongs where
`test:e2e:*` already lives — outside the four local gates, run deliberately
before a landing, exactly as charter §4.0 describes for the browser-backed steps.
