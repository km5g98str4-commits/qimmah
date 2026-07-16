# v2.1 promotion report

Base: `integration/wave5 @ ee39fcc`. Promotion remains a separate owner-approval branch and
must not be merged before the recorded physical-device week and explicit `approved`.

## Cutover

- `VITE_DESIGN_V2`, the HTML injection plugin, query/localStorage preview module, and every
  runtime `isDesignV2()` branch are removed.
- Root design tokens are unconditional; the stable route adapters render only v2.1.
- Legacy screen implementations and their orphan components/sections/helpers are deleted.
- Storage compatibility is retained: onboarding/customization/history/nutrition migration readers
  and legacy key fallbacks remain. This promotion changes presentation ownership, not user data.

## Bundle comparison (raw / gzip)

| Route | Wave 5 dual-surface | Promotion |
|---|---:|---:|
| Dashboard | 73.01 / 20.34 kB | 16.69 / 5.94 kB |
| Workout | 104.25 / 26.46 kB | 27.99 / 8.73 kB |
| Nutrition | 214.46 / 37.48 kB | 191.97 / 32.24 kB |
| Progress | 46.64 / 14.42 kB | 25.94 / 8.25 kB |
| Profile | 62.86 / 18.11 kB | 49.12 / 14.39 kB |
| Entry | 283.86 / 79.68 kB | 261.52 / 72.73 kB |

`node scripts/e2e/promotion-smoke.mjs` renders fresh, reviewer, and veteran profiles through
Dashboard/Workout/Nutrition/Progress/Profile with zero console errors and writes proof PNGs.
