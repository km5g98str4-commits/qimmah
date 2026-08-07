# QAE Explainability

**Status:** Baseline · Mandated by [CTO-QAE-002]

## 1. Principle

Every decision the engine makes — including the decision to change nothing — is explainable at three audiences from one underlying record. **Raw rules are never exposed to the user.** Domain logic emits ReasonCodes and traces; humans see composed explanations rendered by the host.

## 2. ReasonCode composition

- A `ReasonCode` is a registered, closed, camelCase identifier (`Contracts/reason-codes.json`): `{code, domain, severity, description}`. Codes are facts or judgments, never sentences.
- **Composition, not concatenation:** a proposal's explanation is the ordered set of its codes plus its `EvidenceRef`s (observed value, window, threshold, register id). The host composes copy from that structure; the engine never pre-composes text.
- Ordering for display: safety codes first (by tier CRITICAL→LOW), then the proposal's own priority-class order, then supporting/positive codes. This ordering is part of the contract (deterministic).
- One code = one meaning forever. A code's semantics never change; superseded meanings get new codes and the old one is deprecated in the registry (never deleted — stored proposals reference it).

## 3. The three audiences

| Audience | Surface | Content | What is withheld |
|---|---|---|---|
| **User** | host UI, Arabic/English via app i18n | Composed copy mapped from codes + evidence values ("وزنك ثابت من ٣ أسابيع والتزامك ممتاز، فنقترح…") — honest, tone per charter §6: measured facts stated plainly, inferences marked approximate | rule IDs, priority scores, manifest hashes, suppressed-candidate internals — anything that reads as machinery |
| **Developer** | debug surface / logs | Full `ReasonTrace`: fired, suppressed (with suppressor), notFired, insufficientEvidence — each with rule IDs, scores, evidence, cooldown states, budget accounting | user PII beyond what the trace needs |
| **Audit** | persisted with every proposal & plan version | The complete evaluation record: request snapshot reference, `RuleSetManifest`, engineVersion, determinism envelope, emitted proposals with verdicts, full trace | nothing — the audit record is total; "which rule version created this recommendation?" is answerable forever |

## 4. User-facing explanation rules

1. Every proposal shown to the user answers three questions in order: **what we noticed** (evidence, in plain terms) · **what we suggest** (the action) · **why it's safe/right** (the constraint or goal it serves).
2. `keepPlan` and `requestMoreData` get first-class explanations — "we looked and are deliberately not changing anything, because…" is a feature, not an absence.
3. Suppressions surface honestly at user level when they matter: S34's user learns their plateau *was seen* and recovery took precedence — without exposing rule machinery.
4. Safety blocks always explain: what was blocked, why, and the safe fallback — never a bare "not allowed."
5. Tone constraints are inherited from the product charter (no blame, no pressure, conservative language for inferred values, decisive language for measured ones). The registry's `severity` field helps hosts pick register; the engine never emits tone.

## 5. Internal audit trail

- Persisted per evaluation: `{requestHash, manifest, engineVersion, determinismEnvelope, proposals[], reasonTrace, dataQualityReport, validDecisionSpace}`.
- Persisted per applied change: proposalId → planVersion n+1 linkage (structural reversibility).
- Replay guarantee: the audit record plus the stored request reproduces the outputs byte-for-byte (determinism envelope; TESTING-STRATEGY §1b).

## 6. Anti-patterns (rejected by review/linter)

- Emitting UI strings, Arabic/English text, or templated sentences from domain code.
- Free-text "reason" fields — everything goes through registered codes.
- Explanations that assert certainty about inferred values (violates the measured-vs-inferred tone constant).
- Collapsing the developer trace into the user surface (exposes raw rules) or hiding suppressions from the audit trail (breaks honesty).
