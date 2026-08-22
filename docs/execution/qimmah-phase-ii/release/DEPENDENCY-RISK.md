# Dependency Risk Snapshot

Observed: 2026-08-22 19:40 +03  
Baseline: `origin/main@cc60adfc0da0f893b101230269d4847d33490429`  
Lockfile policy: inspected only; no automatic fix or dependency mutation

## Outcome

`npm audit` reports three high-severity transitive findings in the complete
development graph and zero findings when development dependencies are omitted.
The current evidence therefore identifies a build/tooling availability risk,
not a demonstrated vulnerability shipped in the production dependency set.

| Package | Locked affected path | Severity | Observed parent | Current reachability conclusion |
| --- | --- | --- | --- | --- |
| `brace-expansion@1.1.16` | multiple ESLint/minimatch/glob paths | High | `eslint@8.57.1` and its deprecated support packages | Development lint/tooling only in the audited graph. |
| `brace-expansion@5.0.8` | TypeScript ESLint/minimatch path | High | `@typescript-eslint/parser@8.62.0` | Development lint/parser tooling only. |
| `js-yaml@4.3.0` | ESLint configuration path | High | `eslint@8.57.1` | Development lint/config parsing only. |
| `nanoid@3.3.16` | PostCSS path | High | `postcss@8.5.23` | Build-time CSS tooling in this baseline; absent from `npm audit --omit=dev`. |

The advisories concern denial of service through adversarial expansion/YAML or
a zero-sized custom Nano ID generator. No claim is made that the code is safe in
all contexts; the narrower claim is that npm's production-only audit returned
zero vulnerable packages for this exact lockfile.

## Evidence

```text
npm ci
# success: 361 packages installed; complete audit summary = 3 high

npm audit --json
# exit 1: brace-expansion, js-yaml, nanoid; 3 high, 0 critical

npm ls brace-expansion js-yaml nanoid --all
# paths resolve through ESLint/TypeScript-ESLint/PostCSS tooling

npm audit --omit=dev --json
# exit 0: 0 total vulnerabilities; prod=39, dev=371, optional=54
```

The first production-only audit attempt failed DNS inside the sandbox and was
rerun with approved read-only network access. The successful result above is the
authoritative one.

## Decision

Do not run `npm audit fix` on the provisional Phase II baseline.

Reasons:

- an automatic fix can change direct and transitive versions without reviewing
  compatibility or generated lockfile differences;
- `package.json` is coordinator-owned;
- the accepted Web Sovereign dependency graph is not known yet and may already
  resolve or change these paths;
- rewriting the provisional lockfile now would create avoidable convergence
  churn without reducing a demonstrated production exposure.

This is a deferral with evidence, not acceptance of permanent high findings.

## Dependency

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-PACKAGE-LOCK-001` | The final application dependency graph is unaccepted, so remediation cannot be selected against an authoritative lockfile. | Founder-accepted Web Sovereign HEAD and its exact `package.json`/`package-lock.json`. | Coordinator-owned build-tooling wave immediately after the final-HEAD rebind. | Run fresh complete and production-only audits, prove runtime reachability, select reviewed version changes, regenerate the lockfile with npm, run the full gate/CI, and document any residual advisory. |

## Required post-rebind checks

1. Run `npm ci` from the accepted lockfile.
2. Capture `node --version`, `npm --version`, and the exact accepted SHA.
3. Run complete and `--omit=dev` audits.
4. Map each finding with `npm ls` and determine whether untrusted input can
   reach the vulnerable operation in CI, local tooling, or runtime.
5. Prefer direct supported parent upgrades over lockfile overrides when they are
   available and compatible.
6. If an override is necessary, add a counter-proof that installs from a clean
   lockfile and exercises the affected tool path.
7. Run typecheck, zero-warning lint, build, `test:gate`, lane proofs, and CI on
   the resulting exact SHA.

No production deployment or main integration is authorized by this assessment.
