# Design & Foundation Decisions

Separates **technical decisions made** (reversible, no visual authority) from
**subjective decisions deferred** to the founder / Cloud Design.

## Approved design direction: Qimmah App Foundation v2.1 (Founder Refinement Pass)

The founder has **approved v2.1 as the design direction** for future
implementation. This supersedes the earlier "no approved direction" status for
the areas it names. Implementation is **sliced** — v2.1 is adopted screen by
screen behind the reversible seam, not in one redesign.

**Approved v2.1 decisions (frozen):**

| Area | Decision |
|---|---|
| UI typeface | **IBM Plex Sans Arabic** (self-hosted) |
| Display / brand face | **Readex Pro** — brand/display only, never functional UI copy |
| Arabic tone | **Warm Modern Standard Arabic** — confident, motivating; not heavy slang, not cold/clinical |
| Tab labels (final) | اليوم · التمارين · تسجيل · التغذية · التقدم |
| Goal model | تنشيف · محافظة · تضخيم |
| Color family | **Momentum** — Ember / Graphite / Chalk / Blue |
| Ember usage | Reserved for the **primary action** + momentum moments |
| Error / destructive | **Separate** from Ember |
| Approved as direction (NOT yet built) | Today command center · Active Workout · Progress Brief |

**Slice 0 (this phase) — foundation only, near-zero visible change:**

- Self-hosted IBM Plex Sans Arabic + Readex Pro (`src/design-system/fonts.ts`),
  declared but rendered only under the v2 seam.
- v2.1 token aliases + `[data-design="v2"]` activation seam in
  `src/design-system/tokens.css` (color values **pending** the Momentum hex
  drop — they currently alias the v1 source, so flipping v2 changes only the
  typeface today).
- Canonical v2.1 tab labels + goal model frozen in
  `src/design-system/v2/labels.ts` (unwired; live UI unchanged).

**Not in Slice 0 (explicitly deferred to later slices):** any screen redesign —
Today command center, Onboarding, Active Workout, Progress Brief — and the
new "تسجيل" (Log) tab / nav restructure. Concrete Momentum hex values are still
pending; do not invent them.

## Technical decisions made this phase (reversible)

| Decision | Why safe / reversible |
|---|---|
| Add a semantic token seam `src/design-system/tokens.css` | Additive; aliases current values → **zero pixel change**. Delete the import to revert. |
| Typed token contract `src/design-system/tokens.ts` (names only, no duplicated values) | Pure additive module; unused values duplication avoided (values stay in CSS). |
| Keep colour source of truth as `--c-*` in `styles/index.css`; semantic layer aliases it | Preserves the runtime customization center (localStorage-driven `--c-primary`). |
| Neutral engineering scales (spacing 4px, radius, motion durations, type scale) | Not brand decisions; standard, safe defaults matching current usage. |
| Reduced-Motion collapses motion-duration tokens at the token layer | Accessibility; belt-and-suspenders with the global rule in `index.css`. |
| Verify (not regenerate) the existing iOS platform via `cap sync` | Non-destructive; preserves existing native project. |

## Subjective decisions deferred (founder / Cloud Design authority)

- Concrete **Momentum hex values** (Ember / Graphite / Chalk / Blue) — family
  approved, exact values pending the Cloud Design token drop.
- Final **logo** and **app icon** / splash assets.
- **Motion personality** (durations/easings are neutral; the *feel* is pending).
- Per-screen **layout** for the approved v2.1 directions (Today command center,
  Active Workout, Progress Brief) — approved as direction, not yet specced/built.

Font family is now **decided** (IBM Plex Sans Arabic for UI, Readex Pro for
display) per v2.1 — self-hosted in Slice 0, activated per screen in later slices.

## Explicitly NOT done (guardrails honored)

- No full redesign; no unapproved colours applied globally; no screen rebuilt.
- No production Supabase / schema / signing / App Store actions.
- v2.1 fonts (IBM Plex Sans Arabic, Readex Pro) are self-hosted via `@fontsource`
  (OFL) — bundled, not applied by default; no runtime CDN dependency.
- The rejected luxury direction was **not** re-enshrined.
- Protected `.patch` files untouched and untracked.

## Next reversible step (needs input)

Build a **dev-only** design-system preview (gated by `import.meta.env.DEV`) that
demonstrates the semantic tokens across primitives (button, input, card, metric,
exercise/set row, states) in **RTL + LTR**. It is deferred here because, with no
approved tokens, it would render the **rejected** temporary look; build it the
moment approved tokens arrive, or sooner if the founder wants the plumbing demoed
with clearly-labeled temporary values.
