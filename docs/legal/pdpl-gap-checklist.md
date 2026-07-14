# Saudi PDPL (SDAIA) — Gap Checklist

> **Draft for owner + legal review — not legal advice.** Assessed against the actual code in
> `integration/wave4`. Each item: **status** (Compliant / Gap / Confirm) + **smallest fix**.

| # | PDPL area | What the app actually does (evidence) | Status | Smallest fix |
|---|---|---|---|---|
| **C-1** | **Lawful basis / consent — analytics** | Analytics consent **defaults to `granted`** (`consent.ts:18`), opt-out model. Inert today (provider is `noop` unless `VITE_ANALYTICS_ENDPOINT` set). | **Gap (conditional)** | If any analytics endpoint is ever configured: change default to `denied` and add an explicit in-app opt-in toggle. While noop, low risk — document the decision. |
| **C-2** | **Explicit consent — health data (sensitive)** | Both onboarding flows block at the first metrics stage until the user accepts the health-data notice; acceptance, time, and policy version are stored in `OnboardingProfile.consents`. | **Implemented (legal review)** | Confirm final wording and lawful-basis treatment with Saudi counsel before public launch. |
| **R-1** | **Right of access** | Both settings surfaces export an explicit, schema-labelled JSON copy of the current owner's on-device profile, history, nutrition, wellness, reminders, plan, tasks, achievements, and coaching state. The same schema supports guarded restore with preview, backup, and rollback. Auth tokens, sync internals, caches, and other owners' records are excluded. | **Implemented (legal review)** | Confirm the JSON scope and response workflow with Saudi counsel. |
| **R-2** | **Right to correction** | Profile/body data editable in-app; edits recompute and re-sync. | **Compliant** | — |
| **R-3** | **Right to deletion** | `delete_own_account` deletes rows from every public table carrying `user_id`, then the auth user; the client performs the full local wipe only after success. | **Compliant** | Confirm the latest function is deployed on production. **OWNER-TO-CONFIRM.** |
| **R-4** | **Right to object / restrict** | No in-app objection/restriction mechanism beyond deletion. | **Gap (minor)** | State in the Privacy Policy that requests go to `support@qimmah.app`; handle manually. |
| **B-1** | **Breach notification (72h to SDAIA + affected)** | No documented breach-response process in the repo. | **Gap** | Add a one-page breach runbook: detection (Supabase logs/alerts), assessment, notify SDAIA + affected users within 72h, owner contact. |
| **X-1** | **Cross-border transfer** | Data syncs to Supabase, region **`ap-northeast-1` (Tokyo, Japan)** — owner-confirmed. | **Confirmed (KSA → Japan)** | Cross-border transfer **CONFIRMED (KSA → Japan)**. Disclosure added to Privacy Policy §6 (AR + EN) and DATA-INVENTORY. Contractual safeguards via Supabase DPA. **Final PDPL transfer-mechanism sign-off remains OWNER+LEGAL before public launch (beta OK with disclosure).** No adequacy status claimed. |
| **M-1** | **Minors** | **Eligibility age = 12** (owner decision). Signup is blocked until the user confirms 12+ and accepts Terms + Privacy. The setup age minimum is also 12. | **Implemented (legal review)** | No parental-consent or identity-verification flow exists; confirm age-12 treatment against final SDAIA guidance before launch. |
| **G-1** | **Controller identity / record of processing** | Controller named as **تطبيق قِمّة — يمثله مالكه / Qimmah App — represented by its owner**; public contact is `support@qimmah.app`. No registration status/address is invented. | **Gap (reduced)** | Owner confirms the support inbox is monitored and, if operating as a registered entity, supplies its legal registration + address; keep an internal record-of-processing for the `DATA-INVENTORY.md` categories. |
| **S-1** | **Security of processing** | HTTPS transport; server-side auth; owner-keyed RLS migrations cover all sync tables; no secrets in client (public anon key only). | **Compliant (verify)** | Deploy migrations and run `npm run db:verify` against production. **OWNER-TO-CONFIRM.** |
| **P-1** | **Transparency / policy availability** | This Privacy Policy + Terms will be hosted (`public/legal/*.html`); in-app privacy screen exists. | **Compliant on publish** | Link both from the App Store listing and in-app once hosted. |
| **D-1** | **Data minimisation** | Local-first; only needed fields synced; no ads/tracking SDKs; barcode sends only the number; fonts self-hosted. | **Compliant** | — |

## Sources & verification status
The PDPL points above were corroborated against authoritative secondary references during a research pass
(**no claim was refuted**); the automated adversarial verification/synthesis step was cut short by a session
limit, so treat these as **sourced but pending final legal confirmation** — consistent with the “owner + legal
review” header. Owner’s counsel should confirm against the official SDAIA regulations before publishing.
- **Breach notification 72h (B-1)** — controller notifies SDAIA within 72 hours of awareness; affected data
  subjects informed without undue delay. Refs: SDAIA PDPL / Implementing Regulations; DLA Piper Data Protection
  — Saudi Arabia (<https://www.dlapiperdataprotection.com/?c=SA>).
- **Sensitive data incl. health (C-2)** — PDPL enumerates health as *sensitive* personal data. Ref: DLA Piper (above).
- **Cross-border transfer (X-1)** — no official adequacy list published yet; use SDAIA-approved safeguards/SCCs for
  non-adequate destinations. Refs: DLA Piper (above); CMS “one-year anniversary Saudi PDPL”.
- **Data-subject rights (R-1…R-4)** — access, correction, deletion, objection/restriction (and data
  access/portability) are PDPL rights. Ref: DLA Piper (above).

## Priority order for the owner
1. **R-3 / R-1 confirm** — verify `delete_own_account` deployed and obtain legal sign-off on the implemented access-export scope. (Data-subject rights are the highest App-review + PDPL risk.)
2. **X-1** — region confirmed `ap-northeast-1` (Japan); disclosure shipped. Remaining: OWNER+LEGAL sign-off on the PDPL transfer mechanism (SCCs/safeguards) before public launch — beta OK with the disclosure.
3. **C-2 / M-1 legal sign-off** — product gates now ship; counsel confirms wording and minor-treatment basis. **G-1** still needs confirmation that `support@qimmah.app` is actively monitored.
4. **B-1** — breach runbook.
5. **C-1** — analytics opt-in (only if an endpoint is configured).
