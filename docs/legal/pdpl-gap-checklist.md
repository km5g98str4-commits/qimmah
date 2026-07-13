# Saudi PDPL (SDAIA) — Gap Checklist

> **Draft for owner + legal review — not legal advice.** Assessed against the actual code in
> `integration/wave2`. Each item: **status** (Compliant / Gap / Confirm) + **smallest fix**.

| # | PDPL area | What the app actually does (evidence) | Status | Smallest fix |
|---|---|---|---|---|
| **C-1** | **Lawful basis / consent — analytics** | Analytics consent **defaults to `granted`** (`consent.ts:18`), opt-out model. Inert today (provider is `noop` unless `VITE_ANALYTICS_ENDPOINT` set). | **Gap (conditional)** | If any analytics endpoint is ever configured: change default to `denied` and add an explicit in-app opt-in toggle. While noop, low risk — document the decision. |
| **C-2** | **Explicit consent — health data (sensitive)** | Health/fitness + medications/supplements are processed and synced with only implied consent (account creation). PDPL treats health data as sensitive. | **Gap** | Add a short, explicit consent notice at sign-up/onboarding for processing health data (link to Privacy Policy); record acceptance. |
| **R-1** | **Right of access** | User can view profile in-app; **no data export** (`ProfileV2` privacy screen shows “تنزيل نسخة — قادم لاحقًا”, disabled). | **Gap** | Provide export: implement the disabled “export my data”, or honour access requests via `support@qimmah.app` within the statutory period (document the manual process now). |
| **R-2** | **Right to correction** | Profile/body data editable in-app; edits recompute and re-sync. | **Compliant** | — |
| **R-3** | **Right to deletion** | `delete_own_account` RPC wipes auth user + 5 tables + full local wipe; no partial delete/false success (`authContext.tsx:374-397`, `resetQimmah.ts`). | **Compliant** | Confirm the `delete_own_account` function **is deployed** on the production Supabase project (client handles its absence safely, but deletion won’t occur). **OWNER-TO-CONFIRM.** |
| **R-4** | **Right to object / restrict** | No in-app objection/restriction mechanism beyond deletion. | **Gap (minor)** | State in the Privacy Policy that requests go to `support@qimmah.app`; handle manually. |
| **B-1** | **Breach notification (72h to SDAIA + affected)** | No documented breach-response process in the repo. | **Gap** | Add a one-page breach runbook: detection (Supabase logs/alerts), assessment, notify SDAIA + affected users within 72h, owner contact. |
| **X-1** | **Cross-border transfer** | Data syncs to Supabase, region **`ap-northeast-1` (Tokyo, Japan)** — owner-confirmed. | **Confirmed (KSA → Japan)** | Cross-border transfer **CONFIRMED (KSA → Japan)**. Disclosure added to Privacy Policy §6 (AR + EN) and DATA-INVENTORY. Contractual safeguards via Supabase DPA. **Final PDPL transfer-mechanism sign-off remains OWNER+LEGAL before public launch (beta OK with disclosure).** No adequacy status claimed. |
| **M-1** | **Minors** | No eligibility age gate; age field accepts 12–90 for calorie math only (`validation.ts:6`). | **Gap** | Set an explicit eligibility age in Terms §3 and (if under the PDPL minor threshold) a parental-consent step; enforce in onboarding if required. |
| **G-1** | **Controller identity / record of processing** | No named controller entity in the repo (support email `support@qimmah.app` exists). | **Gap** | Name **[OWNER-ENTITY]** (legal entity + address) in Privacy Policy & Terms; keep an internal record-of-processing for the categories in `DATA-INVENTORY.md`. |
| **S-1** | **Security of processing** | HTTPS transport; server-side auth; RLS referenced by the self-delete path (rows keyed by `user_id`); no secrets in client (public anon key only). | **Compliant (verify)** | Confirm RLS policies are actually enabled on all 5 user tables server-side. **OWNER-TO-CONFIRM.** |
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
1. **R-3 / R-1 confirm** — verify `delete_own_account` deployed; document/implement access-export. (Data-subject rights are the highest App-review + PDPL risk.)
2. **X-1** — region confirmed `ap-northeast-1` (Japan); disclosure shipped. Remaining: OWNER+LEGAL sign-off on the PDPL transfer mechanism (SCCs/safeguards) before public launch — beta OK with the disclosure.
3. **C-2 / M-1 / G-1** — health-data consent, eligibility age, named controller.
4. **B-1** — breach runbook.
5. **C-1** — analytics opt-in (only if an endpoint is configured).
