# App Store — Age Rating questionnaire (2025 system)

> Apple overhauled age ratings in 2025 (verified 2026-07-13, source:
> https://developer.apple.com/news/?id=ks775ehf). **New bands: 4+, 9+, 13+, 16+, 18+**
> (12+ and 17+ removed). All apps auto-migrated; the **new questions must be answered by
> 2026-01-31** or updates are blocked. Apple **computes** the final rating from these answers —
> you don't pick the number (you may only set a *higher* one manually). Ratings can vary by region.
>
> Below: every current questionnaire area answered for Qimmah's **actual** content, with the code
> justification. Answer these in App Store Connect → your app → **Age Rating → Edit**.

## The four 2025 questionnaire categories + classic content questions

### 1) Medical or wellness topics  ← the one that matters for Qimmah
Qimmah provides **fitness and nutrition guidance and tracking**: generated workout plans, calorie/macro
targets, and logging of supplements and medications *for the user's own reference*. It gives **no
diagnosis, no treatment, no medical advice** — medication/supplement entries are explicitly
tracking-only with disclaimers (`src/data/medications.ts`, copy "للمتابعة فقط، لا نصيحة طبية").

- **Health/Wellness/Fitness information present?** → **Yes** (fitness & nutrition guidance).
- **Medical/treatment information (diagnosis, dosage advice, treatment)?** → **No** — tracking only,
  no advice engine, no dosing recommendations.
- Expected mapping: a fitness/wellness app that *presents* wellness info but gives no medical
  treatment advice typically lands at **12+/13+-band** on the "medical/wellness: infrequent/mild"
  axis. **Apple computes the exact band** — do not assert a number in copy. **TO-CONFIRM after ASC.**

### 2) Capabilities (UGC, messaging, social, advertising exposure)
- **User-generated content shared with other users?** → **No.** Notes/logs are private to the
  account (device + own cloud row); there is no feed, no sharing between users
  (`src/lib/commitmentTracking.ts`, `historyStore.ts` — all rows are `user_id`-scoped, no social graph).
- **Messaging / chat / friends / followers / livestreaming / content-creation for others?** → **No.**
- **In-app advertising shown to users?** → **No** (no ad SDKs in `package.json`).
- **Content moderation / reporting / blocking needed?** → **N/A** (no UGC surface).

### 3) In-app controls (purchases, parental controls, unrestricted access)
- **In-app purchases / subscriptions?** → **No.** Qimmah+ is a single informational line, not a
  product; no StoreKit/IAP (`src/lib/profileV2Model.ts` `subscription.enabled:false`;
  `VITE_CHECKOUT_URL` empty).
- **Unrestricted web access / built-in browser?** → **No.** There is no in-app web browser. A few
  links (YouTube search, hosted legal pages) open the **system browser**, which is not "unrestricted
  web access" in Apple's sense (`docs/ios-setup.md`, `openFoodFacts.ts` is an API call, not a browser).
- **Gambling / contests / real-money?** → **No.**

### 4) Violent themes
- Cartoon/fantasy violence, realistic violence, prolonged/graphic/sadistic violence → **None.**

### Classic content questions (answer each **None / No**)
| Apple question | Answer | Why (Qimmah reality) |
|---|---|---|
| Cartoon or Fantasy Violence | None | fitness app; no game/violence content |
| Realistic Violence | None | — |
| Prolonged/Graphic/Sadistic Violence | None | — |
| Sexual Content or Nudity | None | exercise imagery is instructional, clothed (`src/data/exercises.ts` media) |
| Profanity or Crude Humor | None | warm MSA copy, no profanity |
| Alcohol, Tobacco, or Drug Use/References | None | none (medications = user's own tracking, not promotion) |
| Mature/Suggestive Themes | None | — |
| Horror/Fear Themes | None | — |
| Gambling (simulated or real) | None | — |
| Contests | None | achievements are personal medals, not prize contests (`features/achievements/*`) |
| Unrestricted Web Access | No | no in-app browser |
| Medical/Treatment Information | **No (advice)** / wellness = Yes | see category 1 |

## Interaction with the owner's pending **minimum-age** decision  ⚠ OWNER-DECISION
- **These are two different settings:**
  1. **Apple content Age Rating** — *computed* from the answers above (likely a 12+/13+-band due to
     the wellness/fitness axis; Apple decides).
  2. **Eligibility / minimum age** you state in **Terms §3** — currently **[OWNER-TO-CONFIRM]**;
     the app has **no age gate** today (setup age field accepts 12–90 for calorie math only,
     `src/lib/validation.ts`; `docs/legal/terms-of-service.md` §3, `pdpl-gap-checklist.md`).
- **They must be consistent.** If Apple computes, say, a 13+ band, your stated eligibility age must
  not be lower than that, and should also satisfy **PDPL minor provisions** for KSA.
- **Recommendation to owner:** decide the eligibility age (e.g. **13+** or **16+**) *before*
  submitting; if you require a hard gate, add an eligibility check (not just the calorie-math field).
  Then answer the questionnaire truthfully and let Apple compute — **do not** manually lower the
  rating below what the answers imply.

**TO-CONFIRM:** (a) exact rating Apple computes after you submit the answers; (b) the eligibility age
in Terms §3; (c) whether a hard in-app age gate is required for your chosen age + PDPL.
