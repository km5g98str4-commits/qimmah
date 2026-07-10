# Cloud Design — Deliverable Inventory

A record of what design input exists in the repository and its approval state,
so the next agent does not re-search from scratch or assume a deliverable exists.

## Search performed

Repo-wide (excluding `node_modules`, `dist`, `ios/App/App/public`) by **content
and type**, not filename alone:

- names: `*design*`, `*token*`, `*brand*`, `*north*star*`, `*foundation*`,
  `*cloud*`, `*visual*`, `*figma*`, `*identity*`
- types: `*.pdf`, `*.zip`, `*.fig`, `*.json`, `*.css`, `*.md`, images
- recently-modified non-code files (where handoffs typically land)

## Result: no new Cloud Design "App Foundation" deliverable found

There is **no** committed Cloud Design output titled/approximating "Qimmah App
Foundation — Brand, Product UI and Motion System — v1", and **no** design token
export, brand package, logo/icon proposal, motion spec, or screen-design set in
the repo.

## Inventory

| Artifact | Path | Role | Approval | Implementation-ready? |
|---|---|---|---|---|
| Design Specification v1.1 | not in repo (prior chat/artifact) | Historical direction | Not approved | No — concepts, not tokens |
| Visual North Star | not in repo (prior chat/artifact) | Historical direction | Not approved | No |
| Health OS package | not in repo (prior chat/artifact) | Historical scope | Not approved | No |
| Current CSS tokens | `src/styles/index.css` `:root` | Live (temporary) values | **Not** an approved direction | Values only; rejected look |
| Tailwind theme | `tailwind.config.js` | Live (temporary) values | Not approved | Mixed CSS-var + hardcoded hex |
| Product screenshots (p10) | `docs/product/assets/*.png` | Historical product reference | n/a | Reference only |
| App icons (p12) | `docs/product/p12-icons/*.png` | Prior web/PWA icons | Not the final app icon | Reference only |

## Conflicts and their resolution class

| Conflict | Resolution class |
|---|---|
| Old luxury palette vs. desired athletic direction | **User decision already resolves it** — old direction rejected; new one PENDING Cloud Design. |
| CSS-var tokens (`index.css`) vs. hardcoded hex (`tailwind.config.js`) | **Engineering requirement** — consolidate under the semantic seam over time. |
| Dark-only (`color-scheme: dark`) vs. possible light mode | **Requires future approval** — light/dark is a Cloud Design decision. |
| Font: CDN Tajawal vs. native self-hosting | **Engineering requirement** — self-host for native (see IOS-FOUNDATION-STATUS). Final family is a Cloud Design decision. |

## Conclusion

No approved visual direction is available. Per the source-of-truth rules, the
full visual redesign is **blocked on an approved Cloud Design deliverable**.
A neutral, reversible technical foundation (token seam, iOS/RTL/safe-area,
docs) was built without selecting a direction.
