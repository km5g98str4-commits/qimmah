# E plan preview host proof

This wave turns the existing plan preview and rationale cards into a complete,
presentational screen contract. It adds explicit `loading`, `empty`, `error`,
and `filled` states; shows the full first training day, weekly summary, and
nutrition targets; composes “why this plan”; and exposes the “Save your plan”
CTA in Arabic and English.

The view intentionally has no storage, auth, account-adoption, or routing code.
The coordinator seam must pass a generated plan and rationale, route `onEdit`
back to the questions, and route `onSave` to signup plus explicit guest-data
adoption. Until that seam lands, this screen is a verified component and is not
reachable in the product journey.

Run the focused proof:

```sh
node scripts/run-e-plan-preview-host-proof.mjs
```

Refresh the 393 px Arabic and English screenshots:

```sh
node scripts/run-e-plan-preview-host-shot.mjs
```

Captured artifacts:

- `plan-preview-ar-393.png`
- `plan-preview-en-393.png`

Before publishing the wave, also run:

```sh
npm run typecheck
npm run lint -- --max-warnings 0
npm run build
npm run test:gate
```

`package.json` is coordinator-owned, so the focused runner is not linked into
`test:gate` by this lane.
