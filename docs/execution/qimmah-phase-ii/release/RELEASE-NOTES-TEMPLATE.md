# Qimmah Release Notes — Evidence Template

Status: `UNRELEASED_NOT_GENERATED`

This file is a release-notes contract, not a claim about the current product.

Do not replace the status above until a founder-accepted Web SHA, rebound Phase
II lane heads, final candidate SHA, and exact evidence bundle all exist.

## 1. Immutable identity

| Field | Required value |
| --- | --- |
| Release label | Founder-approved human label; does not change `package.json` by itself |
| Accepted Web SHA | Full 40-character SHA |
| Release lane SHA | Full 40-character rebound SHA |
| Food lane SHA | Full 40-character rebound SHA |
| Exercise lane SHA | Full 40-character rebound SHA |
| Executive lane SHA | Full 40-character rebound SHA |
| Final candidate SHA | Full 40-character SHA |
| Dist manifest SHA-256 | Hash of ordered built-artifact path/digest list |
| Food dataset version | Schema + normalization + source fingerprint + artifact manifest SHA |
| Exercise media version | Review-ledger schema + source fingerprint + manifest SHA |
| Executive source mode | `fixture`, `live-read`, or `unavailable`; never inferred |
| Evidence completed at | UTC ISO-8601 |

No branch name substitutes for a SHA. No release label substitutes for a build
identity.

## 2. User-facing Arabic notes

Write in Qimmah's warm white-dialect product voice, not legal formal Arabic.
Every bullet must map to an included commit and a passed user journey.

```text
وش الجديد
- [ميزة/تحسين يقدر المستخدم يلاحظه — دليل: assertion IDs]

وش تحسّن
- [سلوك أصلحناه بصياغة بلا تهويل أو لوم — دليل: bug/assertion IDs]

وش باقي
- [حد معروف يؤثر المستخدم، مع الخطوة الصادقة التالية]
```

Do not mention internal architecture, test counts, or a feature that exists only
behind an unavailable backend.

## 3. User-facing English notes

The English section conveys the same claims in friendly natural English; it is
not a literal machine translation.

```text
What's new
- [Observable change — evidence: assertion IDs]

What's improved
- [Honest behavior improvement — evidence: bug/assertion IDs]

What's still limited
- [Known user-facing limit and next step]
```

Arabic and English must have claim parity. A claim present in one language and
absent from the other blocks publication.

## 4. Operator notes

### Application

- Canonical routes changed: `[derive from accepted range]`.
- Storage/schema versions changed: `[derive; include migration/rollback]`.
- Service worker/cache identity changed: `[derive and verify]`.
- Environment variables added/removed: `[names only; never values]`.

### Food data

- Source fingerprints: `[manifest reference]`.
- Accepted/shipped/rejected counts: `[machine-derived report]`.
- Saudi/GCC/Arabic/brand/macro coverage: `[machine-derived report]`.
- Attribution/license package: `[evidence path]`.
- Artifact activation and rollback pointer: `[runbook step]`.

### Exercise media

- Canonical/reviewed/missing counts: `[review ledger]`.
- Newly generated/replaced assets: `[job IDs and versions]`.
- Duplicate/orphan/media-failure counts: `[validator report]`.
- Manifest activation and rollback pointer: `[runbook step]`.

### Executive Dashboard

- Frontend mode: `[fixture/live-read/unavailable]`.
- Authorized roles: `[reviewed server contract]`.
- Metric sources unavailable or partial: `[explicit list]`.
- Admin writes: `none` unless separately reviewed and authorized.

## 5. Security and privacy notes

- Dependency audit result for final lockfile: `[complete and prod-only]`.
- Secret/bundle/test-hook scan: `[evidence]`.
- Preview and admin bypass attacks: `[evidence IDs]`.
- RLS/deletion/sync-consent verification: `[authorized staging evidence or external blocker]`.
- Dataset/media licence and attribution: `[evidence]`.

Never include email addresses, user IDs, activation codes, tokens, private URLs,
raw health values, or live database output.

## 6. Validation summary

| Gate | Exact result | Evidence |
| --- | --- | --- |
| `npm ci` | `[exit/time/version]` | `[log]` |
| typecheck/lint/build/test gate | `[all exact exits]` | `[log]` |
| Release personas | `[pass/fail/blocked totals]` | `[evidence manifest]` |
| Chromium/WebKit/physical device | `[coverage/downgrade]` | `[evidence]` |
| Food pipeline | `[counts/checksums]` | `[report]` |
| Exercise media | `[counts/checksums/review]` | `[report]` |
| Executive authorization/UI | `[states/attacks/a11y]` | `[report]` |
| GitHub CI | `[workflow conclusion at candidate SHA]` | `[URL]` |

A numeric test total without the failed/blocked list is incomplete.

## 7. Known blockers and limits

For each remaining item:

```text
ID:
User impact:
Status: BLOCKED | DEFERRED | ACCEPTED_LIMIT
Owner:
Blocking external artifact/decision:
Work remaining:
Does it block each GO verdict?:
```

Do not hide external commerce, backend, device, licensing, or deployment limits
inside a generic “known issues” sentence.

## 8. Rollback and support

- Application rollback target: `[previous immutable SHA/build]`.
- Food rollback target: `[previous manifest/data version]`.
- Media rollback target: `[previous review manifest version]`.
- Database rollback: owner-controlled runbook only; never improvised here.
- User support route and escalation owner: `[current verified path]`.
- Breach/incident runbook reviewed date: `[date and owner]`.

## 9. Verdicts

Each value is generated from the final evidence report, never typed from memory.

```text
GO_FOUNDER_DEVICE_QA=
GO_PREVIEW_FREE_USERS=
GO_PAID_COMMERCIAL_FUNNEL=
GO_EXECUTIVE_DASHBOARD_FRONTEND=
GO_PRODUCTION_DATA_INGEST=
GO_EXERCISE_MEDIA_RELEASE=
GO_MERGE_MAIN=
```

Every GO/NO-GO links to its exact evidence and remaining blockers.

## 10. Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-RELEASE-NOTES-001` | Current notes cannot be generated from an unaccepted implementation range. | Founder-accepted Web SHA, all rebound lane heads, and final candidate SHA. | Final reporting after convergence evidence passes. | Derive the commit range, map every user claim to passed evidence, fill data/media/admin versions, list blockers, run AR/EN claim-parity review, and remove all placeholders. |

## Publication guard

Publication fails if:

- status is still `UNRELEASED_NOT_GENERATED`;
- any bracketed placeholder remains;
- any SHA is abbreviated;
- Arabic/English user claim sets differ;
- a claim lacks an included commit and passing assertion;
- a GO lacks evidence;
- a known blocker is omitted;
- deployment identity or rollback target is unknown.

Completing this template does not authorize changing package version, merging,
deploying, or submitting to an app store.
