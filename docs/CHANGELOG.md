# Changelog — Qimmah

Honest, dated history generated from git (`git log` on `integration/wave3`).
Format follows [Keep a Changelog](https://keepachangelog.com). Dates are commit
dates (YYYY-MM-DD). Version `1.0.0` is **not yet shipped to the App Store**; the
entries below are integration *waves* on the road to 1.0.0.

## [Unreleased] — targeting 1.0.0

### Wave 3 — 2026-07-13 (`integration/wave3`)
Cloud durability, onboarding polish, native hardening, backend security.
- **Added — sync queue & service wiring** (`e2bea07`): every `historyStore` write
  auto-enqueues; `syncQueue`/`syncService` drain to Supabase, gated by owner + not-recovering.
- **Added — onboarding async-feedback + a11y** (`95f37fe`): full-screen plan-build state,
  visible failure + retry, per-step validation, owner-scoped resumable draft, labelled fieldsets.
- **Added — iOS native hardening** (`428701a`): safe-area, Keyboard `resize:native`, StatusBar,
  splash (no white flash), deep-link URL scheme `com.qimmah.mobile`.
- **Added — Supabase schema + RLS** (`6662c4d`): 13 tables with own-row RLS,
  `delete_own_account`, `handle_new_user`, `db:verify` tooling.
- **Fixed — features actually react** (`8576257`): finished v2 workouts persist through the
  canonical path (Progress/Today/Profile update); NutritionV2 unified into the canonical
  nutrition store (Today تغذية pillar advances).
- **Fixed** (`e610b11`): preserve onboarding draft + approved copy.

### Wave 2 — 2026-07-13 (`integration/wave2`)
Design v2.1 (Momentum) screens behind the design seam.
- **Added — Today command center v2.1** (`d240c6f`) with a 3-state proof (§04).
- **Added — Profile «ملفك التدريبي» + v2.1 shell tab bar** (`02664d8`, §03/§06).
- **Added — Active Workout dark mode + Progress Brief** (`4ad07e0`, §04 Slice 4 / §05 Slice 6).
- **Added — Nutrition hero + iOS app assets + native install fix** (`405672a`, §05 Slice 5).
- **Added — `VITE_DESIGN_V2` production switch** (`f0cf693`): ship v2.1 on via a build flag.

### Wave 1 — 2026-07-11…12 (`integration/wave1`)
Stability + design foundation.
- **Fixed — reset-password deep link** (`2b2f0ad`), **account data isolation** (`13546f9`),
  **workout persistence** (`83c6ce0`).
- **Added — design-v2 wave 1** (`aa9d665`): typography, spacing & rhythm (no color/motion yet).

## Pre-wave phases — 2026-06-26…07-10

- **2026-07-09 — Phase 3 retention** (`0c01573`, `ae65734`): workout local reminders (iOS-only)
  + home momentum signal.
- **2026-07-09 — Phase 2 analytics** (`f2a161a`): lightweight, privacy-friendly, opt-in, HTTPS-only.
- **2026-07-09 — Phase 1 backend schema** (`980f101`): `delete_own_account` + active/deferred table split.
- **2026-07-05 — P0 launch-blocker wave** (`bf07512`): onboarding escape, password policy,
  email-verification gate, watermark removal, admin-tool gating.
- **2026-07-03 — P12 machine catalog** (`ed373f1`…`fb694ae`): 32-machine catalog, bilingual
  how-to, alternatives, machines-only generator, canonical GIF re-key, app-icon redesign.
- **2026-07-03 — P10.1 localization** (`9849bba`…`b7303f2`): bilingual day/muscle/exercise names,
  onboarding choice cards, bidi isolation, legacy plan normalization.
- **2026-07-02 — P10** (`0d642d1`, `4e47b93`, `1d975fb`): session-persistence fix, maintain goal +
  protein 1.8 g/kg + calculator page, dashboard quick to-do.

## Content / docs branches (not on wave3)
- `content/catalog-audit-seed` — media/seed proofs + demo-seed tooling + catalog audit.
- `docs/runbooks` — breach, release, architecture, data-export, testing, support runbooks.
- `legal/appstore-pack` — privacy policy, terms, PDPL gap checklist, data inventory, app-privacy labels.

---
*Span: 2026-06-26 → 2026-07-13 · 346 commits. Regenerate: `git log --date=short --pretty="%ad %h %s"`.*
