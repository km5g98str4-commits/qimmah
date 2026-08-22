# Provisional Baseline Build Audit

Observed: 2026-08-22  
Verdict: `PROVISIONAL_FAIL / NOT A WEB SOVEREIGN RELEASE VERDICT`

This audit exercises the new artifact tools against the isolated Release lane
at `102f43f17b1442b5c56a30062162f632969a39e4`. That lane is based on
`main@cc60adfc0da0f893b101230269d4847d33490429`; it is not the accepted final
Web Sovereign artifact. The result is a tooling and risk-discovery checkpoint,
not a final candidate decision.

## Engineering gate

- `npm ci`: PASS, 361 packages installed.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, zero warnings.
- `npm run build`: PASS, 2,539 modules transformed.
- `npm run test:gate`: the sandboxed attempt stopped at `test:media-rights`
  with `listen EPERM 127.0.0.1`; the approved unrestricted rerun completed the
  entire gate with exit 0.
- `git diff --check`: PASS; the worktree remained clean.

The first failure was named and rerun under the required local-listener
permission. It was not relabeled as a test failure or silently skipped.

## Artifact identity

The built directory was generated from the exact isolated Release head above.
The manifest was written outside the repository, then independently checked:

| Field | Value |
| --- | --- |
| Files | 408 |
| Total bytes | 19,243,731 |
| Content SHA-256 | `3d52463666ab72bea8d516abd623e0ce908676652bc10d0a8e884cb472a8e6f6` |
| Manifest SHA-256 | `a8c17e28a74bd9a91899e8e3600bbe8da550a3f3509cc3f15009c0587b03042e` |

The second `--check` pass reproduced all counts and digests.

## Policy result

Policy `qimmah-built-artifact-policy-v1`, SHA-256
`e3e0f85796cec7406899b3dbdb0e18db9c5dde8198a02e549e22d7f70dadcff8`,
scanned 408 files and decoded 96 text files / 2,701,767 bytes.

It failed on exactly one finding:

| Rule | Built path | Match digest | Read-only source diagnosis |
| --- | --- | --- | --- |
| `LOCAL_WEB_ENDPOINT` | `assets/index-Qj1tetv6.js` | `623413ff7f0e4715bdce6c57bdc67882986dc281781e6d61cfe155a54ee71de4` | Supabase GoTrue client v2.108.2 bundles its default `http://localhost:9999` constant. |

The application source search found no corresponding HTTP localhost literal;
the visible occurrence is dependency output. Phase II did not add an allowlist,
change the dependency, or modify product/runtime code. The final accepted build
must be scanned afresh, and the finding must be fixed or explicitly isolated by
the founder under the release rules.

## Dependency

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-LOCAL-ENDPOINT-001` | The provisional baseline bundle contains a localhost URL literal from the GoTrue dependency; the final bundle identity and dependency graph are not accepted yet. | Founder-accepted Web Sovereign SHA, final lockfile, and exact built artifact. | Final dependency audit and built-artifact policy scan after lane rebind. | Rebuild and rescan; if still present, determine reachable behavior and remove/upgrade it or obtain an explicit founder isolation decision. Never add a silent scanner exception. |
