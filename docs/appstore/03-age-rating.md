# App Store — Age Rating Questionnaire (answered for Qimmah's real content)

> **System verified July 2026:** Apple's expanded age ratings (announced 2025‑07‑24, mandatory 2026‑01‑31) — categories **4+, 9+, 13+, 16+, 18+**. Topic list from `developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions/` (accessed July 2026). Apple **computes** the final rating from these answers; answer honestly, then read the result.

## Answers by topic

### In-App Controls
| Question | Answer | Justification |
|---|---|---|
| Parental Controls | **No** | App has no parental-control feature. |
| Age Assurance | **No** | No age-verification/assurance mechanism (see min-age flag below). |

### Capabilities
| Question | Answer | Justification |
|---|---|---|
| Unrestricted Web Access | **No** | No in-app browser. Only outbound links open in Safari (legal pages, external YouTube *search* links) — not an embedded unrestricted browser (`terms-of-service.md` §"third parties"; no WKWebView browsing UI in `src/`). |
| User-Generated Content | **No** | Notes are private to the account; nothing is shared/published to other users (`commitmentTracking.ts` device/account-scoped). |
| Social Media | **No** | No social feed, following, or posting. |
| Messaging / Chat | **No** | None. |
| Advertising | **No** | No ads of any kind (`app-privacy-labels.md` §A). |

### Mature Themes
| Question | Answer | Justification |
|---|---|---|
| Profanity or Crude Humor | **No** | Warm-MSA copy; none. |
| Horror / Fear | **No** | None. |
| Alcohol, Tobacco, or Drug Use or References | **No** ⚠️ | App **tracks** user-entered supplements/medications as a personal wellness log — it does **not depict, reference, or encourage** recreational drug/alcohol/tobacco use. This is Health-data logging, declared under Health & Fitness (`app-privacy-labels.md` §B), not a "drug reference." *Judgment call — see note.* |

### Medical or Wellness  ⚠️ PIVOTAL
| Question | Answer | Justification |
|---|---|---|
| Contains medical/wellness information or guidance | **Yes — general fitness & nutrition guidance only** | Qimmah gives training plans, calorie/macro targets, and coach-style cues (`OnboardingV2.tsx`, `NutritionV2.tsx`). It is **not** a medical device and gives **no diagnosis/treatment**; Terms disclaim medical advice. Select the *general wellness/fitness* option, **not** "medical treatment information." |

### Sexuality or Nudity
| Question | Answer | Justification |
|---|---|---|
| Sexual Content or Nudity | **No** | None. |

### Violence
| Question | Answer | Justification |
|---|---|---|
| Cartoon/Fantasy, Realistic, Prolonged Graphic, Guns/Weapons | **No / None** | No violent content. |

### Chance-Based Activities
| Question | Answer | Justification |
|---|---|---|
| Gambling (real) | **No** | No gambling. |
| Simulated Gambling | **No** | None. |
| Contests | **No** | None. |
| Loot Boxes | **No** | None. |

## Expected result
With all "No" except a **general** wellness/fitness selection, Qimmah is expected to land at **4+ (or 9+)**. **Final rating is computed by Apple — TO-CONFIRM after entering answers in App Store Connect.** Do not hard-state a number in marketing until ASC shows it.

## ⚠️ Two judgment calls + the owner min-age interaction
1. **Medications/supplements answer** — answered "No" to the drug-reference question because it's personal health logging, not depiction/promotion. If a reviewer reads it differently the rating could rise. Low risk; documented here for consistency.
2. **Medical/Wellness answer** is the pivot: choosing "medical treatment information" (wrong here) vs "general fitness/wellness" (correct) changes the rating. Use general wellness.
3. **Interaction with the owner's pending minimum-age decision (OWNER-DECISION):** the App Store **content** age rating (above, likely 4+) is **separate** from the **eligibility age** in `terms-of-service.md` §3, which is currently **unset** («[يُؤكَّد من المالك]») and has **no code gate** (`validation.ts` accepts 12–90 for calorie math only). Recommendation: owner sets an explicit eligibility age (e.g. **13+** or **16+**, PDPL-aware), and it should be **≥ the App Store content rating**. If owner chooses 16+/18+ eligibility for legal reasons, that does **not** change Apple's content rating but should be reflected in Terms and, if enforced, a real age gate. **Decision needed before submission.**
