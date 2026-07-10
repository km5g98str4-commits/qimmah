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

## Current status (as of this foundation phase)

- **No new Cloud Design "App Foundation" deliverable exists in the repository.**
  A repo-wide search (all file types) found no design export, token file, brand
  package, "north star", or "cloud design" artifact. See
  [`CLOUD-DESIGN-INVENTORY.md`](./CLOUD-DESIGN-INVENTORY.md).
- Earlier specs (Design Specification v1.1, Visual North Star, Health OS
  package) were delivered as **chat/artifacts in prior sessions, not committed
  files**, and are **historical references, not approved**.
- **No visual direction is currently approved.** Therefore the app's colors,
  logo, icon, font choice, palette, and motion personality are all **PENDING**.

## What is temporary vs final

| Area | State | Notes |
|---|---|---|
| Colors (deep-night + warm-stone) in `styles/index.css` | **TEMPORARY** | Inherited from the previous build. **Not approved.** |
| Semantic tokens in `src/design-system/tokens.css` | **TEMPORARY architecture** | Names are the stable seam; values alias the temporary source. |
| Font (Tajawal) | **Temporary-safe** | Kept as the current safe font; final family is a Cloud Design decision. |
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
