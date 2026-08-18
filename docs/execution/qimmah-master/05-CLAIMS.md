# 05 — PRODUCT CLAIM LEDGER (سجلّ ما نَعِد به)

> **Canonical owner of one fact only: does the product do what it tells the user it does?**
> **The product must never promise something the implementation does not perform.**
> Audited at `139a7b0` across app copy, the landing site, Terms & Privacy, the App Store
> description, the Salla store copy and transactional email.

Status: `TRUE` · `PARTIALLY_TRUE` · `FALSE` · `UNVERIFIED`

---

## 🔴 THE FALSE CLAIMS — ordered by harm

### CLM-001 … CLM-004 — "the basics stay completely free" · "no subscription is active in this version"

**This is the single most serious gap in the project, and it sits in a legal document.**

| where the user reads it | text |
|---|---|
| `site/terms.html:84` | «قد نطرح **لاحقًا** اشتراكًا مدفوعًا … وتبقى الأساسيات مجانية. **لا يوجد اشتراك فعّال في هذه النسخة.**» |
| `site/terms.html:132` | "…with the essentials staying free. **No subscription is active in this version.**" |
| `site/index.html:150` | «اختياري تمامًا … **الأساسيات تبقى مجانية بالكامل**.» |
| `docs/appstore/02-description.md:42` | «قِمّة+ (لاحقًا) … **والأساسيات تبقى مجانية**.» |
| `site/support.html:65` / `:99` | «هل أحتاج حساب؟ **لا. يعمل التطبيق كاملًا بلا حساب**» / "No. The app works fully without one" |

**What the code actually does** (verified in this session, `src/lib/access/paidActions.ts:18-53`):
**thirteen** productive actions require a server-verified `status === 'active'` —

> `workout.start` · `workout.startEmpty` · `workout.logSet` · `workout.finish` ·
> `nutrition.addFood` · `nutrition.removeFood` · `nutrition.quickAdd` · `nutrition.water` ·
> `nutrition.toggleMeal` · `progress.logWeight` · `progress.logMeasurement` ·
> `plan.saveEdit` · `recovery.log`

`isPaidActionAllowed` returns true **only** for `'active'` (`paidActions.ts:89-92`), enforced at the
store layer by `assertPaid` (`access/guard.ts:38-40`), across 17 call sites. The gate is mounted at
`App.tsx:685`. Entitlement comes only from an authenticated server RPC.

So: **you can browse every screen without an account; you cannot log a single set, meal, glass of
water or weight.** That is a coherent, founder-approved product principle — *"visible ≠ usable"*
(`paidActions.ts:4-6`). **The copy describing it is three product generations out of date.**

- **Status: FALSE** on all four surfaces.
- **Harm:** a Terms of Service asserting "no subscription is active" while a live Salla purchase
  flow, a paywall and entitlement gating all ship is a liability, not a typo.
- **Not blocked.** The policy was already decided by the charter — **DEC-015**: 19.99 SAR,
  one-time purchase, no subscription, no permanent second price. `QIM-V1-010` can correct every
  in-repo surface now; only the external Salla storefront needs the founder (`FA-01`).

### CLM-005 — "cloud sync … only works if you sign in and enable it"

`site/index.html:134`. **No user can enable it.** Two independent blocks (`04-FEATURE-MAP.md` F-GAP-12):
`VITE_SYNC_ENABLED` is empty by default and only the literal `'true'` enables it
(`syncQueue.ts:11`); and the only writer of sync consent, `SyncConsentGate.tsx:5`, is **never mounted**.
Sync being off in V1 is a correct decision (DEC-007). Advertising it as available is not.
- **Status: FALSE** → fold into `QIM-V1-010`.

### CLM-019 — the injury-safety promise silently disappears in English

`planGenerator.ts:1100` emits the warning keyed «راعينا مناطق الإصابة التي تعرّفنا عليها: …»,
but `src/i18n/dict/profileChoices.ts:70` only holds the **stale** key «راعينا الإصابات المحددة…».
No entry exists for the `unrecognized` case either (`planGenerator.ts:1103`). English users therefore
fall through to `generatedWarningFallback`: *"Review this plan note before applying your changes."*

The filtering itself is real and correct (CLM-018 / F-03). **The dangerous direction is the second
half:** an English user whose injury note could not be parsed is told nothing, and is left believing
the plan accounted for it.
- **Status: FALSE** (English) · **BLOCKS_V1 — user safety** → **`QIM-V1-018`**

### CLM-013 / CLM-014 — the Salla store sells a subscription the code does not implement

Live merchant copy catalogued at `docs/product/SALLA-MERCHANT-COPY-CHANGES.md:19,21,22,24`:
«19.99 ريال **سنويًا**» · «اشترك الحين واحتفظ بسعرك» · «تنتقل تلقائيًا للتطبيق **بنفس اشتراكك بدون أي رسوم إضافية**».
The implemented grant is a **one-time `no_expiry = true`** with no renewal logic anywhere in
`supabase/migrations/`, and the founder's app-carry-over decision is **30 days**
(`docs/product/APP-LAUNCH-BONUS-REQUIREMENT.md:21,28`).
- **Status: FALSE** · external surface — **founder-owned** (`FA-01`), corrections drafted in-repo but
  not confirmed applied to the live storefront (`08-UNKNOWNS.md` UNK-05).

---

## 🟠 PARTIALLY TRUE — each names its missing half

| ID | claim | missing half |
|---|---|---|
| CLM-023 | «كل تغيير في خطتك نشرح لك سببه — ولا نغيّر شي بصمت» (`reveal.ts:150`) | `buildPlanChanges` has **one** call site, `StepReview.tsx:23`. A regeneration from onboarding (`onboardingProfile.ts:196`) produces no before→after rationale. Touches locked decision DEC-013.3. → `QIM-V1-019` |
| CLM-034 | «امسح باركود المنتج **ليُضاف لسجلّك**» | scanning works; the *adding* half is `nutrition.addFood`, gated (`nutritionV2Model.ts:231`) |
| CLM-036 | «{n} تمرين **بشرح**» (`library.ts:113`) | the count is honest, the "with guidance" half is false in English: `exerciseGuidance.ts:164,180` returns `[]` for catalog items, and only **2 of 181** exercises carry English text |
| CLM-038 | «ما عندنا صورة… **الخطوات المكتوبة تحت كاملة وصحيحة**» | image honesty is TRUE; "written steps are complete" is FALSE in English (same cause) |
| CLM-037 | «مكتبة تمارين **مصوّرة**» | 144/181 images (~80 %). Gaps show an honest empty state, not a fake placeholder |
| CLM-041 / CLM-045 | «مزايا تعمل **اليوم**» including Apple Health | `healthKit.ts:67` requires native iOS; inert on the only shipped surface (the site's own CTA says «قريبًا على iOS») |
| CLM-051 | «يعمل قِمّة **بلا إنترنت**» | browsing works offline; **logging does not** — entitlement resolves over the network and `loading` fails closed |
| CLM-050 | support address | `qimmahsupport@gmail.com` on `support.html`/`press.html` vs `qimmah.support@gmail.com` everywhere else. Gmail ignores dots so both deliver; the published inconsistency is unguarded (`run-site-truth-proof.mjs:59` only checks `privacy.html`) |

---

## ✅ TRUE — verified, and worth defending

Storage honesty (`finishWorkout.ts:9,108,113`) · onboarding save honesty
(`onboardingProfile.ts:196-199`) · account deletion honesty — no wipe, no sign-out, no false success
unless the server call returns ok (`DeleteAccountDialog.tsx:68-79`) · sensitive-health **second**
consent filters the payload at the single choke point (`syncFieldPolicy.ts:61-66` → `syncQueue.ts:204`) ·
72-hour trial on **server** time, once per verified account (`entitlement_rpcs.sql:128-152`) ·
Premium `no_expiry` with no renewal logic — the code matches CLM-012 even while the store copy does not ·
purchase needs no activation code (`access.ts:139`) · injury engine correctness (`injurySafety.ts:44-95`,
fail-closed) · plan-rationale honestly separates `measured` from `structural` and names inactive axes
(`planRationale.ts:143-165`) · minors limited to maintenance (`calculators.ts:75,327`) · age floor 13 ·
analytics local-only, **no endpoint at all** (`tracking/index.ts:1-6`) · location read once, never
stored or sent (`geolocation.ts:21`) · Apple Health **read-only** (`health/connect.ts:53`) ·
disconnecting a metric purges its samples (`:298-306`) · export works from the UI ·
**no medical claims anywhere** · **no template/"your page" language** (guarded).

Also confirmed fixed at this commit, and therefore stale in `CLAUDE.md §11`:
the `noopener` regression (`OnboardingV2.tsx:728,1499-1500`) and the "P0 الجسدي" — age/sex/height/weight
are collected and the minor gate is live (`onboardingV2Flow.ts:187-190,370-375`).

---

## UNVERIFIED

**CLM-048** — «الرابط لك وحدك … ما نرسل لك كلمة مرور ولا نطلبها منك أبدًا» (purchase email).
Needs the mailer's real send payload plus a live `email_outbox` row. → `08-UNKNOWNS.md` UNK-03.

---

## The pattern behind these gaps — worth naming once

Every FALSE claim here is **copy that was true when written** and was never revisited when the
product moved: the free-tier promise predates entitlement gating; the sync promise predates the
consent gate being unmounted; the Salla copy predates `no_expiry`; the English injury string
predates a rekeyed warning. **None is a lie anyone told.** They are the cost of shipping copy and
code from different generations with no ledger tying them together.

**That ledger is this file.** Any wave that changes a gated behaviour, a price, or a consent must
re-check its row here — and `test:site-truth` should grow to cover the free-tier and sync claims,
which it currently does not.
