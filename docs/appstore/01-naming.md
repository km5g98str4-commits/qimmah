# App Store — Naming Sheet (AR primary)

> Limits **verified July 2026** (see `07-second-pass.md` for sources+dates): App Name ≤ **30 chars**, Subtitle ≤ **30 chars**, Promotional Text ≤ **170 chars**, Keywords ≤ **100 BYTES** (not chars — Arabic ≈2 bytes/char in UTF-8).
> Char/byte counts below are measured (Unicode code points; keywords in UTF-8 bytes). Brand line «درّب بوضوح. تقدّم بثقة.» is placed as the **Subtitle** (its correct home — the brand tagline).

## 1. App Name (≤30 chars) — Arabic – Saudi Arabia

| # | Option | Chars | Score /10 | Rationale |
|---|---|---|---|---|
| **1 ✅** | **قِمّة — تمرين وتغذية ولياقة** | 27 | **9** | Brand + the 3 highest-value AR search nouns in the strongest-weighted field; natural, not stuffed. |
| 2 | قِمّة — لياقتك بالعربية | 23 | 8 | Elegant; leads with the Arabic-first differentiator; only one keyword. |
| 3 | قِمّة: تمرين وتغذية وتقدّم | 26 | 7 | Swaps «لياقة» for the brand value «تقدّم»; slightly less search reach. |

**Recommended: Option 1** — the Name field is the single strongest ASO ranking signal; three natural nouns maximize Saudi search reach without keyword-stuffing risk.

## 2. Subtitle (≤30 chars)

| # | Option | Chars | Score /10 | Rationale |
|---|---|---|---|---|
| **1 ✅** | **درّب بوضوح. تقدّم بثقة.** | 23 | **9** | The approved brand line (`labels.ts` V2_WELCOME.ar.headline). Confident warm MSA; reinforces brand, not keywords. |
| 2 | خطة تمرين وتغذية وتقدّم صادق | 28 | 7 | Keyword-leaning subtitle; useful if Name is the clean Option 2. |
| 3 | لياقتك في نظام واحد بالعربية | 28 | 7 | Positioning ("one system, Arabic"); weaker verb energy. |

**Recommended: Option 1** — places the brand line where Apple shows it under the name; pairs with keyword-rich Name Option 1 (don't stuff both fields).

## 3. Promotional Text (≤170 chars) — editable anytime without re-review

| # | Option | Chars | Score /10 |
|---|---|---|---|
| **1 ✅** | ابدأ بخطة تُبنى على هدفك، وتابع تمرينك وتغذيتك وتقدّمك بخطوات واضحة. سجّل وجباتك بالباركود، ودرّب في وضع مركّز، وقِس تقدّمك بصدق — بالعربية أولًا، وبلا إعلانات. | 160 | **9** |
| 2 | جديد: امسح باركود طعامك لجلب القيم فورًا، ودرّب في وضع مركّز مع مؤقّت راحة ذكي. كل تقدّمك في مكان واحد بالعربية. | 108 | 8 (campaign/update use) |
| 3 | قِمّة تجمع تمرينك وتغذيتك وتقدّمك في نظام عربي واحد — خطوات واضحة، أرقام صادقة، وخصوصية أولًا بلا إعلانات ولا تتبّع. | 112 | 8 (evergreen) |

**Recommended: Option 1** — leads with the core benefit + names concrete features (all code-true), ends on the privacy differentiator.

## 4. Keywords (≤100 BYTES, comma, no spaces, no repeats of Name/Subtitle words)

| # | Option | Bytes | Score /10 | Notes |
|---|---|---|---|---|
| **1 ✅** | `تمرين,لياقة,تغذية,نادي,بروتين,سعرات,باركود,gym,diet,workout` | 95 | **9** | Balanced AR (Saudi intent) + EN (reach); covers scan + nutrition + gym. |
| 2 | `تمرين,لياقة,تغذية,بروتين,سعرات,gym,workout,fitness,diet,calories` | 90 | 8 | More EN reach; drops «نادي/باركود». |
| 3 | `تمرين,لياقة,تغذية,نادي,بروتين,سعرات,وزن,باركود,عضلات` | 96 | 7 | Arabic-only; deepest Saudi intent, zero EN reach. |

**Recommended: Option 1** (95 bytes, 5 bytes headroom).
> ASO note: Apple indexes Name + Subtitle words separately, so keywords here deliberately avoid «تمرين/تغذية/لياقة» IF you keep them in the Name — consider swapping those out post-launch for «سعرات/باركود/نادي» synonyms to widen coverage. Marked as a tuning task, not a blocker.

---

## Recommended set (copy-paste)
- **Name:** `قِمّة — تمرين وتغذية ولياقة`
- **Subtitle:** `درّب بوضوح. تقدّم بثقة.`
- **Promotional Text:** Option 1 above (160 chars)
- **Keywords:** `تمرين,لياقة,تغذية,نادي,بروتين,سعرات,باركود,gym,diet,workout`
