# Support Playbook + FAQ — Qimmah

Owner-facing triage for user support, plus a publishable AR/EN FAQ. Every answer
reflects the **real app behaviour** on `integration/wave3`.

> **Note:** there is no `site/support.html` in the repo yet. The App Store listing
> requires a **Support URL** (`PREVIEW-CHECKLIST.md`, branch `docs/appstore-listing-r2`).
> The FAQ below is the seed content for that page. Hosted legal pages
> (`public/legal/privacy.html`, `terms.html`) live on branch `legal/appstore-pack`.

## Channels
- **Primary:** in-app Contact → `mailto:support@qimmah.app`. **This mailbox must be
  monitored** (release gate item).
- **Self-service in-app:** password reset, account deletion, edit profile — most tickets
  are resolvable by the user without support.

## Triage playbook

| Symptom | Likely cause | Resolution (traced) |
|---|---|---|
| "Can't log in / forgot password" | needs reset | Send them the reset flow; deep link handled by `recoveryState.ts` → reset screen. Owner ref: `docs/QA-RESET-PASSWORD.md`. |
| "Reset link doesn't open the app" | deep-link config | Confirm `VITE_RESET_REDIRECT_URL` + Supabase Redirect URLs + Info.plist `CFBundleURLTypes` (`com.qimmah.mobile`). |
| "Stuck on verify-email" | email unconfirmed | App shows `VerifyEmailView` until `email_confirmed_at` set (`authContext`). Ask them to open the confirmation email; resend from the screen. |
| "My data isn't on my other device" | sync not flushed / offline | Sync is signed-in + online only; queue persists locally (`syncQueue.ts`) and flushes on foreground (`startSyncLifecycle`). Ask them to sign in on both, open the app foreground, check connectivity. **No data is lost** — it's local-first. |
| "I deleted my account but…" | partial delete | Deletion is honest: it only reports success when the auth user is actually deleted (`delete_own_account` RPC), else a calm failure «لم نتمكن من حذف الحساب بالكامل… تواصل معنا» with retry. If it failed, retry; if persistent, escalate. |
| "Give me a copy of my data" (PDPL access) | R-1 access request | Follow `docs/DATA-EXPORT-DESIGN.md` Path 1 (owner-run export). Log the request + fulfilment date. |
| "I think my account was accessed" | possible incident | Treat as suspected breach → `docs/BREACH-RUNBOOK.md` (72h SDAIA clock starts at your awareness). |
| "The app lost my workout" | usually resume/plan mismatch | Active workout auto-restores (<12h) via `activeSession` snapshot; if the plan regenerated, the session resets to Plan (by design, no crash). |

## Escalation
- **Access/erasure requests →** `DATA-EXPORT-DESIGN.md` (R-1) / `delete_own_account` (R-3).
- **Suspected breach →** `BREACH-RUNBOOK.md` (do not wait).
- **Legal/privacy questions →** privacy policy (branch `legal/appstore-pack`), controller `[OWNER-EMAIL]`.

---

## FAQ (publishable — AR + EN)

### هل بياناتي آمنة؟
نعم. بياناتك تُخزَّن أولًا على جهازك، وتُزامَن سحابيًا فقط عند تسجيل الدخول وبحماية صفوف
لكل مستخدم (لا يرى أحد بيانات غيره). لا نطلب موقعك ولا جهات اتصالك ولا صورك، ولا نبيع بياناتك.

### كيف أستعيد كلمة المرور؟
من شاشة الدخول اختر «نسيت كلمة المرور»، ويصلك رابط بريدي يفتح شاشة تعيين كلمة مرور جديدة.

### كيف أحذف حسابي؟
من **الملف الشخصي › الإعدادات والخصوصية › حذف الحساب**. عند نجاح الحذف تُمحى بياناتك
السحابية والمحلية. إن تعذّر الحذف الكامل نعرض رسالة صادقة ونطلب المحاولة أو التواصل معنا.

### كيف أحصل على نسخة من بياناتي؟
راسِل `support@qimmah.app` بطلب «نسخة من بياناتي»، ونزوّدك بها خلال المدة النظامية.

### لماذا لا تظهر بياناتي على جهازي الآخر؟
المزامنة تعمل عند تسجيل الدخول والاتصال بالإنترنت. سجّل الدخول على الجهازين وافتح التطبيق؛
لا تُفقد بياناتك — فهي محفوظة محليًا وتُرفع عند توفّر الاتصال.

### كيف أتواصل معكم؟
عبر `support@qimmah.app` (زر «تواصل معنا» داخل التطبيق).

---

### Is my data safe?
Yes. Your data is stored on your device first and synced to the cloud only when you're
signed in, protected by per-user row-level security (no one sees another user's data).
We don't request your location, contacts, or photos, and we don't sell your data.

### How do I reset my password?
On the sign-in screen tap "Forgot password"; you'll get an email link that opens the
"set a new password" screen.

### How do I delete my account?
**Profile › Settings & Privacy › Delete account.** On success your cloud and local data
are erased. If full deletion can't complete, we show an honest message and ask you to
retry or contact us.

### How do I get a copy of my data?
Email `support@qimmah.app` requesting "a copy of my data"; we provide it within the
statutory period.

### Why isn't my data on my other device?
Sync runs when you're signed in and online. Sign in on both devices and open the app —
nothing is lost; your data is stored locally and uploads when a connection is available.

### How do I contact you?
`support@qimmah.app` (the in-app "Contact us" button).
