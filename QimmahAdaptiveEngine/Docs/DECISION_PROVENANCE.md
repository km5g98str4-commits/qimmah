# QAE Decision Provenance

**Status:** Baseline · Mandated by [CTO-QAE-003]

## 1. The law

> **Every decision must be fully reconstructable.**
>
> Given the same **Inputs** + the same **Rule Manifest** + the same **Seed** + the same **Engine Version**, the engine MUST produce a **byte-identical Proposal** (under canonical serialization, NUMERIC-CONTRACT §3).
>
> **If it does not, that is a bug** — not a tolerance case, not an environment quirk. Replay divergence is a gate failure.

## 2. Provenance record — carried by every proposal

```
DecisionProvenance {
  origin:                RuleId  # the rule that produced the winning candidate
  pipelineStage:         string  # where the final form was fixed (resolved | budgeted | safetyScreened)
  engineVersion:         string  # QAE_ENGINE_VERSION constant baked into the build
  decisionSchemaVersion: string  # [CTO-QAE-004] — the Proposal SHAPE's own version; may migrate
                                 #  while the engine stays compatible, and vice versa
  ruleManifest:  contentHash     # SHA-256 of the canonical rule-set manifest
  oracleVersion: string          # host/harness-supplied oracle identity ('none' when no oracle consulted)
  timestamp:     epochMs         # from the REQUEST's Now — never from a system clock
  seed:          integer         # replay-format field; the domain has no randomness and must ignore it
}
```

Minimum mandated set ([CTO-QAE-004]): `engineVersion · decisionSchemaVersion · oracleVersion · manifestHash · seed · timestamp · origin`. `pipelineStage` is carried additionally.

No field is optional. A proposal without complete provenance is unconstructible in the pipeline (the builder requires every field) and rejected by the proof suite.

## 3. Two sealing layers plus provenance ([CTO-QAE-003])

1. **Compile-time brand** — sealed types (`IssuablePlan`, and the pipeline's `Proposal`) cannot be typed into existence outside their issuing module.
2. **Runtime seal** — WeakSet registries; `assertIssuable`/`assertPipelineProposal` fail forgeries **by name**.
3. **Decision provenance** — even a legitimately issued object is traceable a year later: which rule, which manifest, which engine build, which oracle, at what request-time.

Neither layer substitutes for another; all three are mandatory.

## 4. Replay procedure

1. Load the audit record: request snapshot + manifest hash + engineVersion + seed.
2. Check out / select the engine build matching `engineVersion` and a rule set whose manifest hash matches (manifests are content-addressed; a matching hash **is** the rule set).
3. Re-run the evaluation with the recorded request (including its `now`).
4. Canonically serialize the emitted proposals and compare byte-for-byte with the recorded ones.

Divergence at step 4 = bug, filed against determinism (the highest-severity defect class after safety).

## 5. Sources of divergence that are structurally excluded

- System time (all timestamps flow from request `now`), randomness (none; seed ignored), locale (recorded to prove non-dependence), float arithmetic (integers only past the adapter boundary), map/iteration order (canonical serialization sorts; all pipeline orderings have total keys), hidden state (pipeline is pure functions; proof suite includes a mutable-global source scan and an interleaved-evaluation isolation check).

## 6. Storage expectations (host-side, for integration phases)

Persist with every issued proposal and every applied plan version: the provenance record, the full canonical request snapshot (or its hash + retrievable body), and the ReasonTrace. "Which rule version created this recommendation?" must be answerable from storage alone, indefinitely.
