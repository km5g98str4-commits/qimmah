# E personalization guardrail proof

## What this wave proves

- `generatePlan` treats the canonical `GoalType` as stored input and derives one effective goal from `age + goalType`.
- Ages 13, 15, and 17 with `cutting` or `bulking` produce maintenance calories, macros, nutrition, workout sets/reps/rest, commitments, label, explanation, and goal-specific warnings.
- The restriction remains visible through the existing minor-goal warning.
- Age 18 is the negative boundary: cutting and bulking behavior is restored instead of turning the exception into a general rule.
- A beginner plan contains no advanced-level exercise and none of `RIR`, `RPE`, `Deload`, `1RM`, or `AMRAP` in engine-owned output.

## Run

```bash
node scripts/run-e-personalization-guardrail-proof.mjs
npm run typecheck
npm run lint
npm run build
```

The coordinator can link this runner into `test:gate`; this lane intentionally does not edit `package.json`.

## Verification result — 2026-07-30

- Red/green attack: removing the boundary fix makes the E proof fail by name across every tested minor age on prescriptions, commitments, labels, explanations, and warnings; restoring it returns the proof to green.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed (`2508` modules transformed).
- `npm run test:gate`: passed completely outside the filesystem sandbox. The sandboxed attempt reached `test:media-rights` and hit `listen EPERM 127.0.0.1`; the unrestricted rerun passed that proof with `inventory=274 magic=274 http=274`, then completed through `test:site-truth`.

## Deliberate boundary

This is a small defensive wave at the `generatePlan` boundary. It does not add the missing `trainingFocus` or equipment schema, does not extend onboarding/adapters, and does not complete Phase 2a personalization.
