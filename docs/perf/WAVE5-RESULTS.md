# Wave 5 bundle result

Measured with production builds. The baseline is the pre-split Wave 5 record in
`docs/perf/BASELINE.md`; the final row is the Vite 6.4.3 build after Food R2.

| Artifact | Before raw / gzip | Wave 5 final raw / gzip | Result |
|---|---:|---:|---|
| Nutrition route | 623.10 / 151.61 kB | 214.46 / 37.48 kB | warning removed; 66% raw and 75% gzip reduction |
| ZXing | inside Nutrition | 444.18 / 111.69 kB on demand | not fetched until scanner opens |
| Review panel | 11.92 / 3.97 kB in production | absent | development-only import is compile-time excluded |

Vite emits no chunk-size warning. `NutritionV2` dynamically imports `ScanFoodPanel`; the
`vendor-zxing` chunk remains isolated and is not a dependency of the Nutrition route entry.
