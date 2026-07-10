# Qimmah — App Store / TestFlight Readiness (status snapshot)

Status as of local commit stack `f622075 → 246ff28 → 9ba03a3 → f29348c → 042b061`
(overnight readiness session). This is a **status + blocker view**; the canonical
gate list is [`docs/release-checklist.md`](./release-checklist.md) and iOS setup is in
[`docs/ios-setup.md`](./ios-setup.md). Nothing here modifies native files, Supabase,
or App Store Connect.

Legend: ✅ done in code · 🟡 partial / needs verification · ⛔ blocked (founder / access /
design) · 📋 documentation only.

---

## 1. Native shell audit (read-only)

| Item | Value / status |
|---|---|
| Capacitor `appId` | `com.qimmah.mobile` ✅ |
| Capacitor `appName` | `Qimmah` ✅ |
| `webDir` | `dist` ✅ |
| iOS project | exists (SPM, no CocoaPods) ✅ |
| Bundle ID (pbxproj Debug+Release) | `com.qimmah.mobile` — consistent ✅ |
| Display name (Info.plist) | `Qimmah` ✅ |
| Marketing version | `1.0` ✅ |
| Signing team (`DEVELOPMENT_TEAM`) | **not set** ⛔ (needs Apple Developer account) |
| Native permissions | only `NSCameraUsageDescription` (barcode) — minimal ✅ |
| App icon | single 1024 present, **no full size set** 🟡 (design-gated) |
| Splash | default Capacitor placeholder (triplicated asset) 🟡 (design-gated) |
| Asset pipeline | no `@capacitor/assets`, no `resources/` 📋 (add at icon/splash time) |
| Plugins | `@capacitor/core`, `/ios`, `/local-notifications` v8 ✅ |
| Android | not present (out of scope) — |
| `cap sync` npm script | none; run `npx cap sync ios` manually 📋 |

## 2. Must fix before TestFlight

- ⛔ **Signing team** — set `DEVELOPMENT_TEAM` in Xcode on a Mac (Apple Developer account).
- 🟡 **App icon set** — all required sizes from an approved 1024 source (design-gated, §7).
- 🟡 **Splash** — real splash from an approved source (design-gated, §7).
- 🟡 **Reset password verified** — code done (`246ff28`); run [`QA-RESET-PASSWORD.md`](./QA-RESET-PASSWORD.md)
      on the deployed site with the Supabase URL config the founder applied.
- 🟡 **Account deletion verified end-to-end** — code done (`9ba03a3`), now surfaces failure
      honestly; verify on staging **with `delete_own_account` RPC deployed** (§5).
- 🟡 **Build/archive check** — `npm run build && npx cap sync ios && npx cap open ios` on a Mac.
- ✅ **No dead "coming soon"/placeholder controls** — App Coming Soon card is informational, buttonless.

## 3. Must fix before App Store Review

- 🟡 **In-app account deletion** — present + honest; confirm auth user is actually removed (Apple 5.1.1(v)).
- ⛔ **Public Privacy Policy URL** — in-app copy is real and now discloses analytics (`f29348c`); a
      **hosted** public URL is still needed for App Store Connect (founder/legal).
- ⛔ **Public Terms URL** — same (in-app present; hosted URL needed).
- ⛔ **App Privacy nutrition label** — fill per `release-checklist.md` (no tracking, no ad sharing, PII-free analytics).
- 🟡 **No placeholder screenshots** — capture from the deployed hardened UI.
- ✅ **No unsupported medical claims** — verified in copy sweep.
- ✅ **No external purchase links in native v1** — `VITE_CHECKOUT_URL` empty; app is free.
- ✅ **Support/contact** — in-app Contact (`mailto:support@qimmah.app`); confirm the mailbox is monitored.
- 🟡 **Notification permission explanation** — local reminders only; confirm the prompt copy on device.

## 4. Should fix before public launch

- ⛔ **Analytics: opt-out vs opt-in** — currently opt-out/default-on, PII-free, no-op by default.
      Founder decision; optionally add a first-run notice. Copy already honest (`f29348c`).
- ⛔ **Final legal text** — hosted, lawyer-reviewed Privacy/Terms.
- 🟡 **Visual QA** — 430px/desktop pass (320/390 proven).
- ⛔ **Cloud Design North Star** — icon/splash/deep visual overhaul (§7).
- 📋 **Codex review** — of the local commit stack.

## 5. Account deletion readiness

- Flow: Settings → Account → Delete account → typed confirmation → `delete_own_account` RPC
  (auth user) + best-effort RLS row deletes + sign-out + local wipe.
- **Honesty fix (`9ba03a3`):** the app now signs out / wipes / reports success **only** when the
  auth user is confirmed deleted; otherwise it keeps the session and shows a calm failure with
  retry + contact. **No false success.**
- **Dependency:** `delete_own_account` (security definer, granted to `authenticated`) must be
  **deployed** on the production Supabase project. If absent, deletion now correctly reports
  failure. Verify on staging with a throwaway account (auth user + all 5 tables gone).

## 6. Reset password readiness

- Code complete (`246ff28`): dynamic `redirectTo` → `#/reset`, public reset route, in-app
  set-password screen (`updateUser`), expired-link state, enumeration-safe copy, no token logging.
- **Dependency:** Supabase Site URL + Redirect URLs (founder reports applied). Verify via
  [`QA-RESET-PASSWORD.md`](./QA-RESET-PASSWORD.md).

## 7. Icon / splash handoff (do NOT create finals yet — Cloud Design North Star gated)

When the official brand direction is approved, produce:

**App icon**
- Source: **1024×1024** PNG, no alpha, no text.
- Legible at 40px and 60px (Settings / Spotlight sizes).
- Dark-first background consistent with deep-night (`#101216`) + a warm-stone (`#F26A21`) mark.
- Avoid clichés: no generic mountain-cliff stock, no gym/dumbbell symbol, no medical cross,
  no neon, no human-body silhouette. A restrained, distinctive summit/step mark that reads at
  small size is the brief.

**Splash**
- Source: large square (≈2732×2732) on the deep-night background, centered mark, generous safe margins.
- No text baked in beyond the wordmark if the brand calls for it; respect device safe areas.

**Pipeline (after assets approved)**
- Add `@capacitor/assets` (dev dep) + a `resources/` folder (`icon.png`, `splash.png`).
- Generate: `npx @capacitor/assets generate --ios` → then `npx cap sync ios`.
- This replaces the current single-size icon + placeholder splash. Runs on a Mac / CI with the tool.

## 8. What must wait for Cloud Design North Star

Official logo/wordmark; final icon + splash; deep internal-screen redesigns; final typography;
any warm-stone hue adjustment; full workout/nutrition/progress visual overhaul.

## 9. What requires production / Supabase access (founder)

- Site URL + Redirect URLs for reset (reportedly applied — verify).
- `delete_own_account` RPC deployed + verified.
- Production `VITE_SUPABASE_*` pointing at the production project (not the shared template default).
- App Privacy labels + hosted Privacy/Terms URLs.

## 10. What requires Apple Developer access (founder)

- Signing team / provisioning; App Store Connect app record; TestFlight testers; screenshots; metadata.

## 11. Founder decisions needed

1. Analytics **opt-out vs opt-in** (+ first-run notice?).
2. Apple Developer **team** / account.
3. **Final legal pages** (hosted, reviewed).
4. **Cloud Design North Star** sign-off → unblocks icon/splash + visual overhaul.
5. Confirm `support@qimmah.app` is monitored.

---

_Update this snapshot as items close. Canonical gates: `docs/release-checklist.md`._
