# Qimmah — Design Source of Truth

Read this before making **any** visual change. It exists so no future agent
silently re-enshrines a rejected direction or invents an unapproved one.

## Precedence (highest wins)

1. Explicit user (founder) decisions and approvals.
2. Latest **approved** Cloud Design deliverable.
3. Current functional product requirements.
4. Accessibility + Apple HIG.
5. Existing behavior not intentionally changed.
6. Earlier Qimmah design docs — **historical reference only**.
7. Engineering judgment.

## Current status

- **APPROVED DIRECTION: Qimmah App Foundation v2.1 (Founder Refinement Pass).**
  The founder has approved v2.1 as the design direction for future
  implementation. The frozen decisions and the Slice-0 foundation are recorded
  in [`DESIGN-DECISIONS.md`](./DESIGN-DECISIONS.md). Adoption is **sliced** —
  screens migrate to v2.1 behind the `[data-design="v2"]` seam, not in one pass.
- **Decided by v2.1:** UI typeface (IBM Plex Sans Arabic), display face (Readex
  Pro, brand/display only), Arabic tone (warm MSA), final tab labels, goal model
  (تنشيف / محافظة / تضخيم), and the **Momentum** color *family* (Ember /
  Graphite / Chalk / Blue) with Ember reserved for the primary action and
  error/destructive kept separate.
- **Still PENDING under v2.1:** concrete **Momentum hex values** (family
  approved, exact values await the Cloud Design token drop), final logo / app
  icon / splash, and per-screen layouts (Today command center, Active Workout,
  Progress Brief are approved as *direction*, not yet built).
- Earlier specs (Design Specification v1.1, Visual North Star, Health OS
  package) remain **historical references, not approved** — v2.1 supersedes them.

## What is temporary vs final

| Area | State | Notes |
|---|---|---|
| Colors (deep-night + warm-stone) in `styles/index.css` | **TEMPORARY** | Inherited from the previous build. **Not approved.** v2.1 Momentum hex will replace these at the seam. |
| Semantic tokens in `src/design-system/tokens.css` | **TEMPORARY values / stable architecture** | Names are the stable seam; v1 + v2.1 aliases both currently resolve to the temporary source. |
| Font — v1 default (Tajawal) | **Temporary-safe** | Renders today; superseded by IBM Plex Sans Arabic as v2.1 activates per screen. |
| Font — v2.1 (IBM Plex Sans Arabic UI, Readex Pro display) | **APPROVED, prepared** | Self-hosted in Slice 0; rendered only under `[data-design="v2"]` until screen slices adopt it. |
| Icon / splash / logo | **PENDING** | No approved assets. Do not ship invented ones. |
| Spacing / radius / motion-duration scales | **Neutral engineering scales** | Not brand decisions; safe to keep. |

## ⛔ The rejected direction — do NOT silently restore it

The founder **explicitly rejected** the previous feeling as *too luxurious /
too restrained* — "a luxury private club", "a premium wellness concierge", "a
15,000 SAR gym membership", "polished editorial instead of an active daily
fitness product."

Therefore, until an approved Cloud Design direction says otherwise:

- Do **not** treat dark-luxury styling as the default.
- Do **not** assume muted stone / beige / bronze / gold / near-black surfaces are approved.
- Do **not** preserve the old calm/premium/energy ratio by default.
- Do **not** make the product feel elitist, ceremonial, cold, or static.
- Do **not** reduce visible product capability just to look minimal.

**Desired destination** (direction, not a spec): athletic, active, useful,
modern, motivating, friendly, confident, feature-rich, Arabic-first, refined
but **not** excessively luxurious; energetic without being childish/neon/chaotic;
trustworthy without being medical/solemn. The approved Cloud Design deliverable
will make this concrete — this doc does **not** authorize implementing it.

## How approved tokens land (the seam)

`src/design-system/tokens.css` is the single drop-in point. When Cloud Design
ships approved tokens, replace the right-hand values there (and/or the `--c-*`
source in `styles/index.css`) — components that consume semantic tokens update
app-wide from one place. Do not scatter new raw hex through components.

## "Recommended" ≠ "Approved"

If a Cloud Design deliverable marks a direction "recommended", that is **not**
approval. Do not implement a full visual redesign until the founder explicitly
approves a direction. A neutral, reversible technical foundation may still be built.
