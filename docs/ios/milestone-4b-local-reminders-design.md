# Milestone 4B — Native Local Reminders (Technical Design Proposal)

> **Design only — not implemented.** This proposes local (on-device) reminders via
> Capacitor for iOS, reusing the existing seams:
> - `src/lib/reminderPrefs.ts` — already stores `{ trainingEnabled, trainingTime "HH:MM" }`
>   in `qimmah:reminders:v1` (comment: "full notification support later in the mobile app").
> - `src/lib/pwa.ts` — existing **web** Notification permission/request helpers.
> - Onboarding `remindersOptIn` + profile flag already captured.
> - Weekly routine days carry a `type` (`push|pull|legs|cardio|rest|full`) → workout days
>   are known per weekday. Supplements/medications carry a free-text `timing` (a hint like
>   "بعد الفطور", **not** a clock time).

## Scope
Workout reminders · Water reminders · Supplement/Medication reminders.

---

## 1) Plugin choice
- **`@capacitor/local-notifications`** (official Capacitor plugin, Capacitor 8 compatible).
- Purely on-device scheduling — **no server, no push certificates, no APNs**. Aligns with
  the local-first architecture and adds zero backend surface.
- Rejected alternatives: `@capacitor/push-notifications` (needs APNs + a server; out of
  scope for v1), third-party (Firebase) (overkill, adds SDK + privacy-label burden).

## 2) Permission flow
- Request **only when the user enables the first reminder** (not at launch) via
  `LocalNotifications.requestPermissions()`.
- iOS shows the system prompt. Handle: `granted` → schedule; `denied` → show an inline hint
  linking to iOS Settings, and keep the toggle off.
- **No `Info.plist` usage-string needed** — local-notifications permission is requested at
  runtime (unlike camera). Keeps permission minimization intact.
- On web (`!Capacitor.isNativePlatform()`), fall back to the existing `pwa.ts` behavior or
  hide native reminder UI (design keeps web unchanged).

## 3) iOS behavior
- Notifications fire even when the app is **backgrounded or killed** (scheduled in the OS).
- Use **repeating schedules** (`schedule: { on: { hour, minute }, allowWhileIdle: true }` or
  `every: 'day'`) rather than many one-off notifications.
- Respects Focus/Do-Not-Disturb and Low-Power Mode (may delay/suppress — expected).
- **Hard iOS limit: 64 pending notifications per app.** Repeating schedules count once;
  design must stay well under 64 (see water, §9).

## 4) UX placement
- A dedicated **"Reminders"** group in Settings (near the existing DeviceSettings /
  notification permission block), plus the onboarding `remindersOptIn` already asks intent.
- Per reminder type: a toggle + a time control. Minimal, matches current settings style
  (no redesign):
  - **Workout:** toggle + time (reuses `reminderPrefs.trainingTime`); fires on routine
    workout days only.
  - **Water:** toggle + start/end window + interval.
  - **Supplements/Meds:** toggle + one or more times.

## 5) Data model (extend `ReminderPrefs`, local-only)
```ts
interface ReminderPrefs {
  workout:     { enabled: boolean; time: string /*HH:MM*/ }          // exists today (rename-compatible)
  water:       { enabled: boolean; startTime: string; endTime: string; intervalHours: number }
  supplements: { enabled: boolean; times: string[] /*HH:MM[]*/ }     // shared for supplements+meds
}
```
- Stays in `qimmah:reminders:v1` (localStorage) — **device-specific, not cloud-synced**
  (reminders are per-device by nature). Included in `resetQimmah()` already.
- Backward-compatible migration from the current `{ trainingEnabled, trainingTime }` shape.

## 6) Scheduling logic
- **Single source of truth:** a `syncReminders()` function that (a) cancels all Qimmah
  notifications, then (b) re-schedules from `ReminderPrefs`. Call it on: app resume, prefs
  change, language change, and after login.
- **Stable numeric ID ranges** per type (e.g., workout `100+weekday`, water `200+slot`,
  supplement `300+index`) so cancel/replace is deterministic.
- **Workout:** schedule on each non-`rest` routine weekday at `workout.time`
  (iOS weekday repeat).
- **Water:** compute discrete times from `startTime`→`endTime` step `intervalHours`; one
  daily-repeating notification per slot (cap slots, §9).
- **Supplements/Meds:** one daily-repeating notification per configured time.

## 7) Cancellation / editing
- Editing any pref → `syncReminders()` (cancel-all + reschedule) — idempotent, avoids drift.
- Disabling a type → cancel that type's ID range.
- **On account deletion / reset** → cancel **all** Qimmah notifications (wire into
  `deleteAccount` flow and `resetQimmah`).

## 8) Localization (Arabic/English)
- Title/body pulled from a new i18n dict (`ar`/`en`) at **schedule time** using the current
  language. Example: workout → «وقت تمرينك 💪» / "Time to train 💪".
- On language switch, `syncReminders()` re-schedules so future notifications match the new
  language. (Already-scheduled OS notifications keep their text until rescheduled — handled
  by the language-change hook.)

## 9) Failure cases
- **Permission denied / revoked in iOS Settings:** show guidance, keep toggles off; never
  crash. Re-check permission on app resume.
- **64-notification cap:** the water reminder is the only risk. Mitigate by (a) using
  repeating daily slots (each counts once), and (b) capping slots (e.g. ≤ 8/day). Total
  across all types must stay < 64.
- **Focus/DND/Low-Power:** may delay — acceptable; document as OS behavior.
- **Timezone/DST changes:** repeating `on:{hour,minute}` schedules follow local time;
  re-sync on resume to be safe.
- **App never opened for long:** repeating schedules persist in the OS regardless.
- **Web/PWA:** `isNativePlatform()` false → no native scheduling (fall back or hide).

## 10) Testing plan (real device)
- Permission: grant, deny, revoke-in-Settings, re-grant.
- Fire: foreground, background, **force-quit** app → still fires.
- Each type: correct time, correct days (workout on routine days only), correct count (water).
- Edit/disable → old notifications cancelled, new ones correct.
- Language switch → next notification is in the new language.
- Timezone/DST change → still fires at local time.
- Account delete / reset → all notifications cancelled.
- iOS notification settings off for the app → no crash, graceful.
- Verify < 64 pending via debug listing.

## 11) App Store 4.2 benefit
- Scheduled **on-device notifications that work offline and when the app is closed** are a
  genuine **native capability a website cannot provide** — the strongest, cheapest
  mitigation for the "minimum functionality / web-wrapper" concern (4.2).

## 12) Risks
- **64 pending cap** (water) — bounded by design (§9).
- **User expectation vs Focus/Low-Power** suppression — set expectations in copy.
- **Permission fatigue** — request only on first enable.
- **Medication reminders = health sensitivity** — keep strictly "tracking only, not medical
  advice"; **no dosage guidance**, neutral copy. This is the highest-scrutiny type.
- Extra plugin + native permission = a bit more device-only testing surface.

---

## Recommendation
**Implement in v1, but ship ONE type first: the Workout reminder.**

Rationale:
- Reuses the existing `reminderPrefs.trainingEnabled/trainingTime` seam → smallest, safest
  slice.
- Avoids the two riskiest parts up front: the water 64-cap math and the medication
  health-sensitivity.
- Delivers the full **4.2 native-capability** benefit immediately (a real scheduled
  notification), which is the whole point for TestFlight.

**Fast-follow (post first TestFlight build):** Water reminders, then Supplements/Meds —
each behind its own toggle, added once the Workout reminder is validated on device.

Suggested Milestone 4B implementation order when approved:
1. Add `@capacitor/local-notifications` + a `reminders.ts` scheduler (cancel-all/reschedule).
2. Extend `ReminderPrefs` (migration-safe) + Workout reminder UI in Settings.
3. Wire `syncReminders()` into app-resume, prefs-change, language-change, delete/reset.
4. Device test per §10 → then add Water, then Supplements/Meds.
