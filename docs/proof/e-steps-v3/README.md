# Lane E — standalone Steps page

## What the user sees

- A standalone, bilingual Steps page reached from Progress.
- Today versus the saved daily goal, plus real 7-day and 30-day totals.
- Best logged day, consecutive logged-day streak, and a seven-day pattern.
- Today’s distance is explicitly marked as an estimate using `0.75 m / step`;
  it is not presented as GPS or HealthKit distance.
- The source is the stable stored source ID (`manual`, `healthkit`,
  `google-fit`, or `external`) translated only at display time.
- Missing Apple Health access is described without claiming that iOS denied it.
  The page sends the user to data settings and never opens a permission sheet.

## System states

- Loading: the local snapshot or opted-in HealthKit refresh is in progress.
- Error: a refresh failed; saved history remains unchanged, with retry/settings actions.
- Empty: no logged steps, with a data-settings action.
- Filled: today, goal, history statistics, estimate, chart, and source.

## Proof images

- `filled/steps-ar-393.png`
- `filled/steps-en-393.png`
- `empty/steps-empty-ar-393.png`
- `empty/steps-empty-en-393.png`
- `error/steps-error-ar-393.png`
- `error/steps-error-en-393.png`

## Re-run

```bash
node scripts/run-e-steps-proof.mjs
```

The root test coordinator should link this runner as `test:e-steps` and include it
in `test:gate`; this lane does not edit `package.json`.

## Known boundary

The newer broad HealthKit store contains a real walking-distance metric, but it
has no production connection surface yet. This page therefore does not read or
claim that metric. Unifying the legacy steps bridge with the broad health layer
is outside lane E.
