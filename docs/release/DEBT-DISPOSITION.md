# Final machine-debt disposition

No vague `SHOULD-FIX` or release `BLOCKED` item remains. `OWNER` means credentials, legal
authority, a paid account, licensed source material, or physical hardware is required.

| Source item | Disposition | Reason / proof |
|---|---|---|
| Wave4 legal placeholders and PDPL wording | OWNER | owner identity/email plus Saudi counsel approval |
| Wave4 production Supabase/RLS/delete RPC | OWNER | production credentials; run `npm run db:verify` |
| Universal Links/AASA | OWNER | templates and entitlement shipped; Apple Team ID/domain confirmation remains |
| Physical keyboard/reminder/camera/Safari taps | OWNER | requires the target iPhone |
| Nutrition 623 kB warning | FIXED | `docs/perf/WAVE5-RESULTS.md` |
| Unassigned AppIcon duplicate | FIXED | undeclared `AppIcon-512@2x.png` removed |
| Credentialed live-auth E2E | OWNER | exact local/hosted commands in `docs/testing/LIVE-AUTH.md` |
| Production Supabase project | OWNER | owner selects and provisions the production project |
| Public legal/support URLs and store labels | OWNER | Apple/store/domain access |
| Icons and splash defaults | FIXED | canonical reproducible brand renderer and pixel proof |
| Native minimum functionality | FIXED | local notification engine and native scheduling |
| iOS keyboard behavior | OWNER | physical-device checklist |
| npm audit — production dependencies | FIXED | safe lockfile updates applied; `npm audit --omit=dev` reports zero |
| npm audit — legacy ESLint 8 toolchain | TRACKED | 9 high dev-only findings remain behind a breaking ESLint 10 migration; no `--force` upgrade |
| 32 px legacy touch targets | DROPPED | v2 promotion removes legacy surfaces; v2 contract uses 44 px actions |
| 16 MB exercise images | DROPPED | shipped offline media is intentional product content, not boot JS |
| DEV review-panel production chunk | FIXED | compile-time DEV import; absent from final production build |
| Sync last-write-wins | DROPPED | documented deterministic policy; a merge UI is new product scope, not release debt |
| Web-only native assets | DROPPED | harmless static bytes; custom copy filtering would make Capacitor sync nonstandard |
| Watermarked media replacements | OWNER | licensed replacement assets required |
| Single-arm image mismatch | OWNER | owner-approved pending a licensed correct asset |
| Saudi source anomalies | OWNER | source-table verification required |
| Empty GIF seam | DROPPED | remote/local image fallback remains an intentional compatible media extension point |
| Removed demo guard route | FIXED | no `demo` route remains in `guardRoute` |
| `test/proof-deepening` branch absent | DROPPED | its intended coverage is superseded by the full 19-suite gate and deterministic journey |
| CustomizationCenter / StepReview plan-template trust model | TRACKED | See dedicated entry below (added by grand consolidation 2026-07-17). |

## Tracked debt — plan-template trust model (CustomizationCenter / StepReview)

**Added:** 2026-07-17 (grand consolidation, `design/v21-promotion` @ `7b35435`). **Severity:** low, non-blocking. **Not** a release blocker; logged for a future gated wave.

**What.** `src/sections/CustomizationCenter.tsx` (`onImportFile`, state-only plan-draft restore) and
`src/components/customizer/steps/StepReview.tsx` accept/restore a **plan-template** object into in-memory
customizer state. The QEA-001 remediation (`f4b2f95`) routes *persisted user-data* export/import through the
hardened `src/lib/portability` pipeline (schemaVersion gate, per-store shape validation, owner rekey, atomic
apply/undo) and `0e293bf` added a proto-pollution-safe reviver + object guard to `onImportFile` as
defense-in-depth. **However** the plan-template restore/review path does **not** yet run through the same
formal trust boundary as the data-portability pipeline — it trusts the template's shape beyond the reviver
guard.

**Why it's only debt (not a defect).** The plan template is application-generated (not persisted cross-owner
account data), the restore is memory-only (no `localStorage`/account mutation), and the proto-pollution reviver
already blocks the classic injection. The chaos harness (INV 6, 57/57) and `test:e2e:settings-security` (34/34)
prove the *persisted* import surface is sealed; this item is about hardening the *plan-template* surface to the
same explicit-schema standard for symmetry and future-proofing.

**How to apply (future wave).** Introduce a `parsePlanTemplate()` validator (allowlisted keys, bounded
depth/size, typed field checks) mirroring `parseImportFile`, and gate both `CustomizationCenter.onImportFile`
and `StepReview` restore through it; add a proof block enumerating malformed/oversized/hostile templates.
Relates to QEA-001; see `docs/security/QEA-001-secure-import-pipeline.md`.
