# App Store — Naming sheet (Qimmah / قِمّة)

> Primary localization: **Arabic (ar)** — the app is Arabic-first (`src/config/product.ts:9-11`,
> `CFBundleDisplayName = قِمّة`). English is a secondary localization.
> Character counts below were measured by code-point (`[...str].length`); **always re-confirm in
> the App Store Connect field counter before saving** — Apple counts diacritics as characters.
>
> Apple limits (verified 2026-07-13): App name ≤ **30**, Subtitle ≤ **30**, Promotional text ≤ **170**,
> Keywords ≤ **100** (comma-separated, no spaces). Sources in `07-second-pass-verification.md`.

Brand line: **«درّب بوضوح. تقدّم بثقة.»** — the approved v2.1 Welcome hero (PDF §01, "CHOSEN").
It is placed as the **Subtitle** (its natural home: a promise under the name), and echoed as the
opening of the Description + Promotional text. Do **not** bury it inside the app name.

---

## 1. App name (AR, ≤30) — 3 options

| # | Option | Chars | Score /5 | Notes |
|---|--------|-------|----------|-------|
| **A ✅ recommended** | **قِمّة: تمارين وتغذية وتقدّم** | 27 | **5** | Brand first, then the three pillars users search (workout/nutrition/progress). Clear, calm MSA, no hype. |
| B | قِمّة — تمارين، تغذية، تقدّم | 28 | 4 | Same pillars, comma style; em-dash reads slightly more "marketing". |
| C | قِمّة: مدرّبك الشخصي للّياقة | 28 | 3.5 | "Personal coach" framing; softer on search keywords, and "coach" slightly overpromises vs. a self-tracking app. |

> ✗ Rejected: `قِمّة — لياقتك وتغذيتك بالعربية` = **31 chars (over limit)**.
> Bare `قِمّة` (5 chars) is too generic for search and wastes the name's keyword value.

**Recommendation: A** — `قِمّة: تمارين وتغذية وتقدّم`.

**English name (secondary localization):** `Qimmah: Workouts, Nutrition & Progress` (38 → **trim to ≤30**),
recommended **`Qimmah — Fitness & Nutrition`** (28). Verify counter. `nameLatin = 'Qimmah'` (`product.ts:12`).

---

## 2. Subtitle (AR, ≤30) — 3 options

| # | Option | Chars | Score /5 | Notes |
|---|--------|-------|----------|-------|
| **A ✅ recommended** | **درّب بوضوح. تقدّم بثقة.** | 23 | **5** | The approved brand line. Emotive + on-brand; pairs perfectly under name A. |
| B | تمرينك وتغذيتك في مكان واحد | 27 | 4 | Functional ("all in one place"); descriptive, less distinctive. |
| C | خطة تمرين وتغذية بالعربية | 25 | 4 | Leads with "Arabic-first plan"; strong for the KSA differentiator. |

**Recommendation: A** — the brand line as subtitle; keep B/C as A/B-test alternates.

---

## 3. Promotional text (AR, ≤170) — editable anytime without a new build

| # | Option | Chars | Score /5 |
|---|--------|-------|----------|
| **A ✅** | درّب بوضوح. تقدّم بثقة. قِمّة يجمع تمارينك وتغذيتك وقياساتك وتقدّمك في تطبيق عربي واحد يعمل على جهازك — بخطوات واضحة، بلا إعلانات ولا تتبّع. | 140 | **5** |
| B | جديد: مسح باركود الأطعمة، سجّل وجبتك بثانية. تابع تمرينك وخطواتك وقياساتك وأرقامك القياسية — كله بالعربية، وكله على جهازك أولًا. | 128 | 4 |
| C | خطتك تُبنى من إعدادك: تمارين، سعرات، مكمّلات، تذكيرات. راجع تقدّمك بلغة صادقة لا وعود مبالغ فيها. ابدأ اليوم. | 108 | 4 |

**Recommendation: A** (leads with the brand line + the privacy promise). Rotate B for a barcode push.

---

## 4. Keywords field (100 chars, comma-separated, **no spaces**) — AR + EN for Saudi search

> Do **not** repeat words already in the app name/subtitle (Apple indexes those separately) — but a
> little overlap on the highest-value terms is acceptable. Avoid spaces to save characters.

| # | Option | Chars | Score /5 | Notes |
|---|--------|-------|----------|-------|
| **A ✅** | `تمرين,لياقة,تغذية,نادي,جيم,سعرات,رجيم,عضلات,دمبل,وزن,بروتين,gym,workout,fitness,diet` | 84 | **5** | Balanced AR core + top EN terms Saudi users type in Latin. 16 chars headroom. |
| B | `تمرين,تغذية,لياقة,جيم,نادي,سعرات,دمبل,عضلات,وزن,باركود,مكملات,gym,workout,calories,protein` | 90 | 4.5 | Adds باركود/مكملات (real features) + protein/calories. |
| C | `لياقة,تمارين,تغذية,نادي,جيم,سعرات,عضلات,وزن,بروتين,رشاقة,gym,fitness,diet,macros,tracker` | ~88 | 4 | "tracker/macros/رشاقة"; drop the multi-word term to avoid a space. |

**Recommendation: A**, with room to swap 1–2 terms toward B once ASO data lands. **Fill the 16 spare
chars** with a locale term the owner validates (e.g. `,سعودي` or `,رشاقة`) — re-count first.

---

## Placement summary (what goes where)

| Field | Value |
|---|---|
| App name (AR) | قِمّة: تمارين وتغذية وتقدّم |
| Subtitle (AR) | درّب بوضوح. تقدّم بثقة. |
| Promotional text (AR) | Option A (140 chars) |
| Keywords (AR/EN) | Option A (84 chars) |
| Primary language | Arabic (ar) — supported ASC localization (verified 2026-07-13) |

**TO-CONFIRM:** English name final trim to ≤30; the spare-keyword term; whether to also localize
name/subtitle for the `en` App Store storefront or ship AR-only metadata first.
