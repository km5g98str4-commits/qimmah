# Design & Foundation Decisions

Separates **technical decisions made** (reversible, no visual authority) from
**subjective decisions deferred** to the founder / Cloud Design.

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

- Final **colour palette** and whether the app is light, dark, or both.
- Final **logo** and **app icon**.
- Final **font family** (Tajawal kept as the current safe font only).
- **Motion personality** (durations/easings are neutral; the *feel* is pending).
- **Navigation concept** for the native app (current: bottom tabs on mobile shell).
- Whether/how the "dumbbell mark" motion exists.
- The athletic/active visual language — **direction stated by founder, not yet specced**.

## Explicitly NOT done (guardrails honored)

- No full redesign; no unapproved logo/colours/fonts applied globally.
- No production Supabase / schema / signing / App Store actions.
- No new fonts downloaded or redistributed.
- The rejected luxury direction was **not** re-enshrined.
- Protected `.patch` files untouched and untracked.

## Next reversible step (needs input)

Build a **dev-only** design-system preview (gated by `import.meta.env.DEV`) that
demonstrates the semantic tokens across primitives (button, input, card, metric,
exercise/set row, states) in **RTL + LTR**. It is deferred here because, with no
approved tokens, it would render the **rejected** temporary look; build it the
moment approved tokens arrive, or sooner if the founder wants the plumbing demoed
with clearly-labeled temporary values.
