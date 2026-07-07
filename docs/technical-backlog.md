# Qimmah — Technical Backlog (internal)

Compiled from the 8-batch hardening audit. Items that were **safe** to fix were already
fixed (see git log); everything below was **left deliberately** (risky, backend, or a UI
change) and is prioritized here. Tags: `[bug]` `[improvement]` `[tech-debt]` `[future]`.

---

## 🔴 Critical (blocks a real launch)

1. `[improvement/backend]` **Deploy `delete_own_account` + RLS policies** to Supabase.
   Until then, in-app deletion removes profile data + local data + session, but the
   `auth.users` row persists → App Store **5.1.1(v)** compliance gap. SQL/checklist in
   `docs/ios/milestone-4a-backend-privacy.md`.
2. `[tech-debt/config]` **Production Supabase project.** `supabaseClient.ts` hardcodes a
   shared **template** URL + anon key as fallback. Production must set `VITE_SUPABASE_URL`
   / `VITE_SUPABASE_ANON_KEY` to a dedicated project with RLS, or all installs share one DB.
   (Anon key is public-by-design; the risk is the *shared default project*, not exposure.)
3. `[improvement]` **Public Privacy Policy URL + App Privacy Labels + Support URL** — App
   Store submission blockers. Content spec in the 4A doc.
4. `[improvement]` **App icons + splash** — currently Capacitor defaults; cannot ship.
   Needs the official 1024px asset → `@capacitor/assets`.

## 🟠 High

5. `[improvement/future]` **4.2 minimum-functionality mitigation** — add one native
   capability (recommended: local reminders, design in
   `docs/ios/milestone-4b-local-reminders-design.md`). Reduces web-wrapper rejection risk.
6. `[tech-debt]` **iOS keyboard behavior** — untested on device (WKWebView default resize).
   Evaluate `@capacitor/keyboard` if focused inputs get obscured.
7. `[tech-debt/security]` **`npm audit`** reports 2 vulnerabilities (1 high) inherited from
   deps. Triage and patch where non-breaking.

## 🟡 Medium

8. `[improvement]` **Touch targets** — ~25 icon buttons are `h-8 w-8` (32px), below the iOS
   44px guideline. Enlarging is a **visual change** (deferred out of the "no redesign"
   hardening scope).
9. `[perf]` **Bundled exercise images (~16M)** ship inside the iOS app. Audit the remaining
   125 `/exercise-images/{slug}/` dirs for exercises never surfaced, and/or move rarely-used
   media to on-demand/remote. (11 dead dirs already removed.)
10. `[tech-debt]` **DEV-only `ReviewPanelView`** still emits an ~11KB prod chunk (never
    fetched because the route is `import.meta.env.DEV`-gated). Exclude from the prod build.
11. `[tech-debt]` **Sync conflict resolution** is last-write-wins (`upsert`). Cross-device
    edits can silently lose data. Document the guarantee or add a merge/updatedAt strategy.
12. `[perf/tech-debt]` **Web-only assets in the native bundle** — `og-image.png`,
    `robots.txt`, `sitemap.xml` are copied into the iOS app. Exclude from the Capacitor copy.

## 🟢 Low

13. `[improvement/legal]` **Watermarked machine images** (commercial product):
    `decline-chest-press` (FITWILL), `hip-adductor` (TRAINING.fit), `glute-kickback` (123RF).
    Replace with clean/licensed assets.
14. `[data]` **`single-arm-lat-pulldown`** image shows a two-arm pulldown (owner-approved);
    revisit if a correct asset appears.
15. `[data]` **Saudi source anomalies** — `Ruwakah` kcal and `Melon Kunafah` carbs were made
    self-consistent; verify against the official source table when available.
16. `[tech-debt]` **GIF seam** — `exerciseGifs` map is empty and `public/exercise-gifs/` only
    holds `.gitkeep`. Remove the seam (`getExerciseGif`, empty dir) if animated media won't
    return, or wire a licensed source.
17. `[tech-debt]` **`demo` in `guardRoute` needsAccount list** — harmless leftover after the
    demo route removal; drop for tidiness.

---

## Category rollup

### Bugs
- (none open) — the deletion column bug (`id`→`user_id`) and the reps `'30 ث'` duplicate were
  fixed during hardening. Data anomalies (#15) are corrected pending source verification.

### Improvements
- #3 privacy/labels, #4 icons/splash, #5 reminders, #8 touch targets, #13 clean image assets.

### Technical debt
- #2 prod Supabase, #6 keyboard, #7 npm audit, #10 DEV chunk, #11 sync conflicts,
  #12 web assets in native, #16 GIF seam, #17 guard leftover.

### Future ideas (product — not scheduled)
- `[future]` Local reminders (workout/water/supplement) — also the 4.2 mitigation.
- `[future]` Apple Health steps/weight read (the `registerStepBridge` seam exists).
- `[future]` Progressive-overload suggestions + deload logic from logged history.
- `[future]` Weekly progress photo (measurements already tracked).
- `[future]` PDF progress export; home-screen widget (next workout / steps).
- `[future]` Expand Saudi/Gulf barcode product database.

---

## Hardening batches summary (what shipped)
- **B1 Perf:** removed 11 dead `/exercise-images/` dirs (−1.6M app payload).
- **B2 Stability:** audited — no fixable issues (parses/divisions/offline/boundaries all guarded).
- **B3 Data integrity:** audited — 0 orphans, 0 dup ids, user-scoped sync, NaN-guarded.
- **B4 iOS:** added top safe-area insets to all sticky headers + workout bottom bar.
- **B5 a11y/Arabic:** audited — 0 physical-direction classes, 0 unlabeled icon buttons.
- **B6 Security:** audited (clean) + removed 8 sections orphaned by the DemoView removal.
- **B7 Docs:** architecture, iOS setup, release checklist.
- **B8 Backlog:** this document.
