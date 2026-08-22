# Phase II Source-of-Truth Discovery

Observed: 2026-08-22 19:37 +03  
Method: read-only `git fetch`, graph/ancestry inspection, GitHub PR inventory,
and GitHub Actions metadata. No branch was checked out, merged, rebased,
cherry-picked, reset, or modified during discovery.

## Authority order

1. A final Web Sovereign SHA explicitly accepted by the founder is the future
   implementation baseline.
2. Until that acceptance exists, `origin/main` is the only stable provisional
   build root for independent Phase II work.
3. Remote branches are evidence and prior work candidates, not authority merely
   because their commit messages say "final", "green", or "closure".
4. CI evidence is attached to an exact SHA. A green ancestor does not make a
   different head green, and a locally green gate does not erase a red workflow.

## Confirmed refs

| Ref | SHA | Relation to `origin/main` | Current treatment |
| --- | --- | ---: | --- |
| `origin/main` | `cc60adfc0da0f893b101230269d4847d33490429` | canonical comparison point | Provisional Phase II baseline only. |
| `origin/codex/qimmah-web-sovereign-001` | `d83add22e904819c7d7fdc27890c757cd5dbaa5c` | 0 behind / 17 ahead | Read-only and unaccepted. |
| Local active Web worktree | `e8f3bb64569f8732e444dddd6acbd4b9be35c6be` | remote branch is one commit ahead | Never modify or advance it. |

No founder message in this task accepts `d83add2` or any later closure branch as
the official final HEAD. Commit text is not founder acceptance.

## Existing Phase II remote work

A fresh fetch revealed that the exact Phase II program had already produced
remote branches after the provisional baseline was created. This discovery
changes execution: the branches must be audited before new work is authored, or
the program would violate its zero-duplication criterion.

| Remote branch | Head | Commits beyond `main` | Commits not in `d83add2` | Observed Phase II surface | Isolation decision |
| --- | --- | ---: | ---: | --- | --- |
| `origin/codex/qimmah-release-convergence-001` | `54ad599` | 28 | 11 | persona harness, static release proofs, convergence ledger | Quarantined: `d83add2` is an ancestor and product fixes are mixed in. |
| `origin/codex/qimmah-food-production-001` | `e12bad0` | 34 | 17 | schemas, accepted/rejected data, manifests, ETL scripts, runtime integration | Quarantined: `d83add2` is an ancestor and runtime/product output is mixed in. |
| `origin/codex/qimmah-exercise-production-001` | `dfde745` | 23 | 6 | metadata audit, media manifest, English coaching, video registry, UI binding | Quarantined: `d83add2` is an ancestor and live detail integration is mixed in. |
| `origin/codex/qimmah-executive-dashboard-001` | `1091451` | 23 | 6 | data contract, isolated admin module, proofs, previews | Quarantined: `d83add2` is an ancestor; isolated commits require file-level review before any reuse. |
| `origin/codex/qimmah-postweb-convergence-001` | `11a1464` | 23 | 6 | cross-lane dependency and handoff documents | Quarantined by name, ancestry, and explicit post-Web purpose. |
| `origin/codex/qimmah-final-release-convergence-001` | `df10b88` | 93 | 76 | combined Phase II assets, QA documents, scripts, product fixes | Quarantined: it combines Web and every Phase II lane. |

The table is an inventory, not permission to consume these branches. Phase II
will inspect them read-only to identify already-completed investigation. It will
not copy Web changes. Any reuse must be limited to a commit proven to be Phase
II-owned, implementation-independent, and outside all Web-owned product paths;
uncertainty becomes a dependency.

Several still-newer candidate/closure branches also exist, including
`origin/claude/qimmah-sovereign-closure-h503u6@aa27fb1` (260 commits beyond
`main`). They are not accepted by the founder in this task and therefore carry
no baseline authority.

## Pull request inventory

GitHub reported eight open pull requests. None uses a Phase II branch or
`codex/qimmah-web-sovereign-001` as its head. The open requests target historical
`design/v21-promotion` or chained `e/*` branches (#38, #39, #42–#47). They are
not Phase II integration authorization and are excluded from convergence.

## CI truth

### `main`

The latest ten `Nightly` runs through 2026-08-22 were successful on exact SHA
`cc60adf`. This proves those nightly jobs on that SHA only; it is not Web
Sovereign acceptance.

### Web Sovereign

All eleven CI runs visible for `codex/qimmah-web-sovereign-001` are red. The
first visible red SHA is
`f78676e3abfe877248ef9126427ee52d6f65a894`; the latest red SHA is `d83add2`.
The failed step in both inspected endpoints is `Upload dist artifact` in job
`Quality gate (typecheck · lint · build · proofs)`.

For the latest run, typecheck, zero-warning lint, production build, food proof,
the deterministic gate, and the 20-case onboarding browser E2E all passed. The
workflow then failed because GitHub Actions artifact storage quota was full.
This is an infrastructure failure, but the workflow conclusion remains red and
must not be reported as green.

An independent remote candidate already exists:
`origin/ci/artifact-quota-nonblocking@9e679c3`. It changes only the artifact
upload policy, but it is neither in `main` nor in Web Sovereign (`main` is three
commits ahead and the candidate is one commit ahead in the opposite direction).
Reimplementing that investigation would duplicate work; adopting it requires a
separate coordinator decision and verification, not silent copying.

## Safe continuation rule

- Continue only with net-new, implementation-independent artifacts on the four
  `-002` Phase II branches.
- Before each write, compare the intended artifact with the remote Phase II and
  later closure branches.
- Do not use an existing artifact merely because it looks complete; first prove
  ownership, ancestry, and independence.
- Record any coupled or ambiguous item in the dependency ledger and move to the
  next independent task.
- When the founder accepts a final Web SHA, fetch it, record the acceptance
  evidence, rebase one lane at a time, and resolve only recorded dependencies.

## Evidence commands

```text
git fetch origin
git rev-list --left-right --count origin/main...origin/codex/qimmah-web-sovereign-001
git merge-base --is-ancestor origin/codex/qimmah-web-sovereign-001 <phase-ref>
git diff --name-only origin/codex/qimmah-web-sovereign-001...<phase-ref>
gh pr list --state open --limit 100 --json ...
gh run list --branch main --limit 10 --json ...
gh run list --branch codex/qimmah-web-sovereign-001 --limit 100 --json ...
gh run view 31843290007 --json ...
gh run view 31734560913 --json ...
```

The exact GitHub run URLs are:

- Latest Web CI: <https://github.com/km5g98str4-commits/qimmah/actions/runs/31843290007>
- First visible Web CI red: <https://github.com/km5g98str4-commits/qimmah/actions/runs/31734560913>
- Latest observed `main` nightly: <https://github.com/km5g98str4-commits/qimmah/actions/runs/32547184342>
