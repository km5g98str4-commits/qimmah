# 07 — STATE (أين نحن الآن)

> **Canonical owner of one fact only: where execution stands right now.**
> A zero-context session reads `README.md` → `00-GROUND.md` → this file, and can continue.

**Last updated:** 2026-08-28 · **by:** جلسة إغلاق QA المؤسس قبل بوّابة سلة

---

## 0. ⚠️ الأرض تبدّلت — والاسم كاد يضلّل

> **كل رقم في §1 أدناه بائت.** أُبقي مرجعًا تاريخيًّا ولم يُحذف.

الترتيب الحقيقي **بالاحتواء** لا بالاسم (`git rev-list --left-right --count`):

```
dc031fa (المكتوب في §1)  →  139a7b0  →  43d92a3 codex/qimmah-sovereign-closure-001
   → 39fd151 codex/qimmah-final-sovereign-convergence-001   (+98 · 0 خلفه · 08-27)
        → 96e34b1 claude/founder-qa-final-001               (+5 · هذه الجلسة · مدفوع)
```

**فرعُ «الإغلاق» كان يبدو نهائيًّا باسمه وهو متأخّر ٩٨ التزامًا** — ولولا القياس
لأُعيد بناء ما هو مبنيّ. وهو `DEC-001` بعينه: **الاحتواء دليل، والاسم ليس دليلًا.**

```
GROUND     : codex/qimmah-final-sovereign-convergence-001 @ 39fd151
WORKING    : claude/founder-qa-final-001 @ 96e34b1
PRODUCTION : main @ cc60adf — متأخّر مئات الالتزامات (متوقَّع · DEC-001)
GATE       : 183 خطوة · exit 0 · typecheck · lint · build خضراء
```

### ما أُغلق في هذه الجلسة — بإثبات مُشغَّل

| البند | الإثبات |
|---|---|
| **«١ من ١» في التمرين** (حاجب إطلاق) | `test:session-integrity` ٢٣/٠ · ومُتحقَّق في المتصفّح ١/٧…٧/٧ |
| الهوية الواحدة على الويب | `test:canonical-url` ١٣/٠ |
| الإحماء نوع محتوى مستقلّ | `test:warmup-identity` ٨٠/٠ · `test:warmup-promise` ٤١/٠ |
| حارس الماء + الهدف والمتبقّي | `test:water-guard` ٧٦/٠ · ومُتحقَّق في المتصفّح |
| ثمانية برامج جاهزة **تصل الشاشة** | `test:builtin-templates` ٣٤٧/٠ |
| صدق وسائط التمارين (قياسًا) | `docs/media/EXERCISE-MEDIA-STATUS.md` |
| ١٨٧ منتجًا سعوديًّا بأسماء عربية | `test:food-pkg-batches` ٣٨/٠ · **والخطّ شُغِّل** |
| جودة البحث والترتيب | `test:search-quality` ٦٧/٠ |

**العطل الجذري:** `WorkoutView.applyEasyIfActive` كان يطبّق سقف الأسبوع الأول
**صامتًا على كل مستخدم**؛ والاقتطاع يشتدّ كلّما طالت الجلسة المختارة:
٤٥د⇒٢ · ٦٠د⇒٢ · **٧٥د⇒١** · **٩٠د⇒١**.
[WORKOUT-CONTINUITY-001] شخّصه ثم اختار أن **يُبلّغه ويُبقيه** لأن السقف كان
يُقرأ قرارًا مقفلًا؛ ونصّ المؤسس رفعه صراحةً.

**تسع خطوات بوّابة جديدة**، منها `test:warmup-promise` الذي كان في المستودع
**ولم يُشغَّل قطّ** — ولذلك مرّ عطل «الإحماء = الجهاز» تحت بوّابة تملك إثباته.

**أربعة حرّاس رُبِطوا بمقاصدهم** لا بأسماء دوالّ. ثلاثة منها كانت تسقط **لأن ما
تحرسه نجح** — وحارسٌ يسقط عند النجاح يُعلّم تعطيله.

### ينتظر قرار المؤسس

١) **فوتوغرافيا التمارين** — ١١٩ حقيقية · ٦٢ رسمًا داخليًا؛ والرتبة ١ تستند إلى
ترخيص مستودع بلا إقرار مصوّر (مراجعة قانونية إن لزمت سلسلة أقوى).
٢) **`site/` غير منشور** ومشروع `qimmah-site` لم يُنشأ قطّ.
٣) **`qimmah.app` لا يُحلّ** (NXDOMAIN) — المضيف المعتمد في `site/canonical-host.json`.
٤) **ترقية `main`** = إطلاق (`FA-06`).

### فجوات بيانات مُسمّاة — لا تُسدّ باختراع

- **«7UP Diet» غير موجود**؛ أقرب SKU حقيقي `7UP Zero Sugar`. ومساواة
  «دايت ≡ زيرو» **كذبة منتج** (دايت كوك وكوك زيرو يختلفان في الماكرو).
- **`sanity.mjs:52`** يتخطّى مصالحة أتواتر تحت ٤٠ سعرة ⇒ عمى عن كل المشروبات؛
  والأثر مشحون فعلًا («7UP ZERO» ١٨ سعرة بماكروز أصفار).

---

## 1. What a cold session must know in ten lines

> ⚠️ **تاريخي — تجاوزه §0 أعلاه.** يُقرأ لمعرفة من أين جئنا لا أين نحن.

| | |
|---|---|
| **Ground SHA** | `dc031fa36929e07c3b00fa025a676ed64327ce59` — pinned, see `00-GROUND.md` |
| **Working branch** | `codex/qimmah-v1-ground-composition-001` (descends from the ground) |
| **`main`** | `cc60adfc0da0f893b101230269d4847d33490429` — **untouched**, production pointer only |
| **Mode** | composition + blocker closure. **No production deploy, no migration applied, no merge to `main`.** |
| **Control plane** | **this folder is canonical.** `docs/control/` is stamped SUPERSEDED (evidence archive; GOV-002 forensics still valid there). |
| **V1 scope** | `02-SCOPE.md` · **out of V1:** AI Coach, QAE, iOS (pending DEC-014) |
| **Next task** | see §5 |

---

## 2. Blockers closed by GOV-003 — each with its counter-proof

| # | Blocker | Status | Evidence |
|---|---|---|---|
| **A** | Commercial/legal copy contradicted the entitlement contract | ✅ **CLOSED** | 7 surfaces rewritten to DEC-015/§0.1. `test:site-truth` 79 → **452 checks**, 13 structural access blocks. Four attacks each fail by name (incl. a coupling attack proving block-local extraction, and a `price:"0"` JSON-LD offer found beyond the brief). |
| **C** | Dead/superseded surfaces could be mistaken for canonical | ✅ **CLOSED** | `dataPortability.ts`, `lib/coach/provenance.ts`, `lib/personalization/engine.ts` stamped; the three view twins were already stamped. Nothing deleted. |
| **D** | Corrupt state bypassed the paid-edit guard | ✅ **CLOSED** | Root cause: the guard asked *"can we read it?"* not *"was there a plan?"*. `hasPriorPlanEvidence()` now gates `saved｜recoverable｜unreadable`, leaves `absent` free (first plan is free, §0.1) and `storage-blocked` free (the write fails honestly anyway — a paywall there would blame the user for our fault). `test:plan-edit-guard` 9 → **13 checks**; restoring the bypass fails **3 named checks**. |
| **Safety A** | Allergy notice never reached a user | ✅ **CLOSED** | It was mounted only on the unrouted `NutritionV2`. Now on the live `NutritionView`. Proof rebuilt: real SSR render + import-graph reachability, **22 checks**, four named attacks. |
| **STITCH-01** | Divergent regression ledger | ✅ **CLOSED** | Semantic union: 4 display-site patterns adopted, **2 rejected with evidence** (one measured the model layer while the display owner already converts at `NextActionCard.tsx:97`; the other guarded a symbol with zero consumers). Blind adoption would have added two assertions that fail on correct code. |

---

## 3. Open — named precisely, not hand-waved

| # | Item | State | What closes it |
|---|---|---|---|
| **B** | Sensitive-health consent is not a live write boundary: `syncFieldPolicy.ts` sanitizes `profiles` only, while `daily_logs` ships supplements+medications verbatim | **IN FLIGHT** — implementation landed, verification incomplete at handoff | Fail-closed table→policy registry + two-direction proof (denied ⇒ absent, granted ⇒ present) + a named bypass simulation for a new table |
| **STITCH-02** | Journey manifests cannot be regenerated | **BLOCKED** | `scripts/e2e/journeys/newcomer.mjs` waits on the text selector «استعرض قِمّة أولًا», which no longer appears where the harness expects it (the welcome screen was added later). Needs a stable `data-testid`, not a text match. `npm run journeys:sheet` stays unbuildable until then. |
| **WebKit** | Cannot run in this container | **BLOCKED BY ENVIRONMENT** | `cdn.playwright.dev` and `playwright.download.prss.microsoft.com` return `403 request blocked: no rule or allowlist entry allows host`. Not a repo defect. Needs a machine whose network policy allows the Playwright CDN. |
| **`test:chaos`** | Was passing **vacuously** | **EXPOSED, not gated** | `VITE_SYNC_ENABLED` was unset in the harness, so every `enqueueSyncOperation` was a silent no-op and 12 queue invariants never executed. Flag now set; the proof also needs consent seeding (it never grants cloud-sync consent). **Not added to the gate while red.** |
| **`activeSession.ts` dead-surface coverage** | **NAMED, unfixed** | `saveActiveSession` (`src/lib/activeSession.ts:151`) has **zero production callers** — its only importer is `WorkoutV2.tsx`, which carries a `CANONICAL-SURFACE-LOCK` header naming itself unshipped. The live app writes `activeWorkout.ts` instead. So "app killed → workout resumes" is proven against a module the shipping app never writes, and **`test:active-session` (in gate)** tests the same twin. Fix = repoint that coverage at `activeWorkout.ts`; separate wave, other lane's files. |
| **Salla storefront** | «19.99 سنويًا» + a permanent «89.99 سنويًا» anchor violate §0.1 | **FOUNDER-ONLY** | Outside the repo. Replacement strings pre-drafted in `docs/product/SALLA-MERCHANT-COPY-CHANGES.md:19-22`. |
| **`terms-of-service.md:82`** | says minimum age **12** while the ground and store rating say **13** | **NAMED, unfixed** | Owner-draft file outside `run-site-truth-proof.mjs`'s `site/` scan. Reported rather than silently edited. |

---

## 4. The one genuine founder decision

> **Does a completed Premium purchase entitle logging while the entitlement server is unreachable?**

Everything else in the commercial contract is already settled — **DEC-015 is LOCKED** (one-time
19.99 SAR, no subscription, three gates), and the code matches it. This one claim is not:
`05-CLAIMS.md:91` (CLM-051) records it once, with **no owning task and no DEC number**, and
`QIM-V1-010`'s definition of done does not cover it.

It matters because `site/index.html` promises the app works «بلا إنترنت», while
`entitlementBackend.ts:199-200` never caches a grant — so a paying customer who loses signal is
shown a *purchase* button. Two defensible answers, both preserving server authority:

- **(a) Premium is an online product** — delete the offline promise from every surface. Zero code change.
- **(b) Premium survives a bounded outage** — honour the `expiresAtMs`/`serverTimeMs` pair the server *already sends*, for a short server-named grace window measured on `performance.now()`. Needs a DEC entry and a guard with a counter-proof.

**Not decidable by an agent.** It is what the buyer was sold.

---

## 5. Next three tasks — the actual critical path

1. **Finish blocker B** — land the fail-closed sanitizer registry with its two-direction proof, then wire it into `test:gate`. It must be done **before `VITE_SYNC_ENABLED` is ever true**, not before launch.
2. **Answer the offline-Premium question (§4)**, then run `QIM-V1-010`'s remaining copy pass if answer (a).
3. **Repair `scripts/e2e/journeys/*` selectors** (`data-testid`, not text), which unblocks STITCH-02, the contact sheet, and the journey matrix in one move.

Everything else on the board is either closed above, environment-blocked, or founder-owned.

---

## 6. Staging commissioning — current operational state

- **Branch:** `codex/qimmah-final-sovereign-convergence-001`.
- **Staging project:** `qimmah-staging` · ref `odpkvswfiihrkglgfghd` · region
  `ap-south-1` · status `ACTIVE_HEALTHY`.
- **Completed:** §1 and staging SQL bundles 01–06. The branch was fast-forwarded to `aa54bafa`;
  all six bundles were then applied in filename order through the Management API to staging ref
  `odpkvswfiihrkglgfghd`, each returning HTTP 201. `supabase-shim.sql` was not run.
- **Database verification:** `tables=27`, `with_rls=27`, `policies=71`, `anon_writes=0`,
  `pepper=1`, `client_rpcs=6`, `legacy_open=0`, `migrations=33`.
- **Behavioral smoke:** after fast-forwarding the branch to `cb838d8d`, a direct staging preflight
  returned `total_users=0`. The updated, unmodified `staging-smoke.sql` then returned its computed
  final row through the Supabase SQL interface: `verdict=PASS`, `passed=9`, `failed=0`,
  `leftover_users=0`, `leftover_codes=0`, `total_users=0`. The `checks` column returned all nine
  named checks with `ok=true`; no notice, dashboard session, login, or inferred success was needed.
- **Anon-surface probe:** after fast-forwarding to `c8e1d8cc`, `npm run staging:probe` ran against
  staging with the active public legacy `anon` key only and no `service_role`. Its positive control
  returned HTTP 401 for both the correct key and a deliberately corrupted key, so the probe declared
  itself **blind** and stopped before the table/RPC checks. This run proves no public-surface verdict;
  the probe made no database writes and no repair or permission expansion was attempted.
- **Auth:** `GET /config/auth` returned HTTP 403 because the supplied PAT is scoped to Database +
  Project; `Confirm email = ON` is therefore not yet independently verified. The public legacy
  anon key was retrieved through the publishable-keys endpoint; no secret key was requested or
  reported.
- **Not started:** §§4–11. No preview deployment, Edge Function deployment, Salla purchase, or
  production operation has run.
- **Security:** no database password, `service_role` key, Salla secret, or gateway secret was
  written to the repository or reported. Production ref `ledlypcyrtnzvjvhykwz` remains untouched.
