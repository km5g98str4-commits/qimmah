# Built Artifact Policy Scan

Status: `PROOF_READY / FINAL ARTIFACT NOT SCANNED`

This read-only scanner prepares the final production-bundle check required by
Release Convergence. It does not claim that source comments are deployable
bytes, and it does not scan or accept a moving Web branch. Its future input is
the exact built directory already bound by the artifact manifest.

## Current rules

- Supabase service-role references.
- HTTP/WebSocket endpoints at localhost, loopback, wildcard, or RFC1918 hosts.
- explicit test-entitlement and fixture-admin hooks.
- explicit Preview-bypass hooks.
- private-key headers and recognized live provider-secret prefixes.
- symlinks anywhere in the artifact tree.

Findings contain rule ID, relative path, and a digest of the match. They never
echo the matched value. Binary assets are counted but only the extensions in
`data/phase-ii-release/artifact-scan-policy.json` are decoded as text.

## Future invocation

```bash
node scripts/phase-ii-release/artifact-policy-scan.mjs \
  --root /absolute/path/to/accepted/dist \
  --candidate-sha <full-accepted-sha>
```

A nonzero exit is a release blocker. A zero exit is evidence only for the
enumerated rules; it is not a general secret-safety guarantee and does not
replace source review, dependency audit, authorization tests, or browser/network
inspection.

## Counter-proof

`node scripts/phase-ii-release/artifact-policy-scan-proof.mjs` creates synthetic
fixtures and attacks every rule, secret redaction, symlink rejection, and policy
rule uniqueness. No production or Web file is changed.

## Dependency

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-ARTIFACT-SCAN-001` | The scanner is executable, but no artifact scan can support a release verdict before the immutable accepted build exists. | Founder-accepted Web Sovereign SHA and its exact built directory. | Final artifact-manifest and release-evidence package. | Build once from the accepted SHA, verify the manifest, run this scan, attach its policy/report identity, inspect any finding, and bind the result to the seven release verdicts. |
