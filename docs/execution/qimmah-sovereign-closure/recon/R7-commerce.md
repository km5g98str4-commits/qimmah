# R7 — COMMERCIAL FUNNEL + PREVIEW SAFETY (forensic, read-only)

**Repo:** `/Users/ziyad/qimmah-deploy` · **Branch:** `codex/qimmah-sovereign-closure-001` · **HEAD:** `740023b`
**Method:** static read of source, migrations, edge functions and proof scripts. No builds, no installs, no network, no writes to the repo.
**Confidence legend:** `[FACT]` read directly from code · `[INFERENCE]` derived from code paths · `[ASSUMPTION]` stated and unverified.

---

## 0. Funnel map — as actually wired

```
                        ┌──────────────── src/views/StartViewV2.tsx (landing) ────────────────┐
                        ▼
  OnboardingV2 (18 questions)  src/views/OnboardingV2.tsx
                        │  onPlanReady(artifacts) ─► SetupView state
                        │  markCompleted(uid)  ◄── happens BEFORE handoff renders
                        ▼
  REVEAL / HANDOFF  ── SetupView.tsx:62-79 renders <PlanHandoffScreen> only while `finished === true`
        │
        ├─ [1] PREMIUM  → OnboardingV2.tsx:1271-1280  <a href={product.checkoutUrl} target=_blank>
        │                 config/product.ts:30-44 → https://salla.sa/Qimmahsa/…/p1181109938
        │                 (pure link; no network call from the app — proven in preview-safety e2e)
        │
        ├─ [2] TRIAL    → OnboardingV2.tsx:1286-1295 `handoff-trial-cta` → onTrial() :1186-1197
        │                 !signedIn ⇒ local short-circuit 'not_authenticated' (never touches server)
        │                 signedIn  ⇒ useAccess().beginTrial() → provider.tsx:96-100
        │                            → entitlementSource.startTrial() :151-162
        │                            → entitlementBackend.startTrialOnServer() :231-250
        │                            → supabase.rpc('start_trial')  [72h, server clock]
        │
        └─ [3] PREVIEW  → onEnter = App.enterFromHandoff (App.tsx:389-392) → markCompleted → #/dashboard

  IN-APP (any paid action) ── guard.ts:39 assertPaid() in the STORE layer
        │                      + provider.guard() opens the gate (provider.tsx:68-78)
        ▼
  PREMIUM GATE  src/components/PremiumGate.tsx  (mounted once, App.tsx:98-105 + :668)
        ├─ "Get Qimmah Premium" → same Salla URL
        └─ "Have a code?" → submitCode() :65-68 → provider.redeem() :80-89
                           → entitlementSource.redeemActivationCode() :98-128
                           → entitlementBackend.redeemCodeOnServer() :207-220
                           → supabase.rpc('redeem_access_code', {p_code})

  ACCOUNT  src/views/LoginView.tsx → authContext.tsx:245 signUp
           (LoginView.tsx:175 branches on auth.configured; :373-378 is the "cloud off" wall)

  SALLA → WEBHOOK → ENTITLEMENT
      salla.sa order paid
        → supabase/functions/salla-webhook/index.ts (Deno)
            ① verifyAuthenticity BEFORE any DB write (index.ts:59-69)
            ② parseSallaEvent / decideGrant (contract.mjs)
            ③ rpc salla_ingest_event  ← atomic, migration 20260812120001:175-248
                 → admin_grant_premium (20260812120001:52-121)
                     → purchase_ledger (no user_id ⇒ survives account deletion)
                     → entitlements: entitlement_type='premium', expires_at=NULL, no_expiry=true
        → client: provider.tsx:44-64 on SIGNED_IN → claim_pending_grants() → refresh()
        → my_entitlement() (20260806120002:56-87) derives state from server now()

  EXPIRATION
      private.derive_state (20260806120002:25-42) — pure function of
      (type, no_expiry, expires_at, revoked_at) vs server now().
      trial past 72h ⇒ 'trialExpired' ⇒ statusForServerState ⇒ 'none' ⇒ back to Preview + gate.
```

**Structural note that shapes everything below:** the client entitlement snapshot
(`entitlementStore.ts:38`) is an in-memory module variable. It is **never persisted** and
**never rendered**. `useAccess()` is consumed in 13 places and every one of them destructures
only `guard` / `can` / `blockedAction` / `beginTrial` — **no component reads
`entitlement.status`, `entitlement.detail`, or `entitlement.lastError`.** `remainingMs()`
(`entitlementBackend.ts:124-128`) has zero callers. `accessStrings.previewBadge`
(`i18n/dict/access.ts:19,61,90`) has zero callers.

---

## 1. TRIAL BUTTON — **CONFIRMED DEAD, and worse than reported**

**Verdict:** the button is not "dead" in the sense of an unbound handler. It is **dead as a funnel**:
in `founder_preview` its success path is structurally impossible, and in the **production** build
the only remedy it offers (create an account) **destroys the only screen from which a trial can
ever be started**. There is no second entry point anywhere in the app.

### 1.1 Proof — the CTA has exactly one host, and it is transient

- `handoff-trial-cta` exists at `src/views/OnboardingV2.tsx:1286-1295`, inside `PlanHandoffScreen`.
- `PlanHandoffScreen` has exactly one caller: `src/views/SetupView.tsx:64-77`, rendered **only**
  when the local latch `finished === true` (`SetupView.tsx:54`, `:62`).
- `beginTrial` has exactly one consumer in the whole tree — `grep -rn "beginTrial" src/` returns
  `provider.tsx` (definition) and `OnboardingV2.tsx:1178,1196`. `PremiumGate.tsx` offers **no**
  trial CTA (`PremiumGate.tsx:107-167` = Premium link, "have a code", dismiss). Settings has none.
- Therefore: **the 72-hour trial is offered on one screen, once, and never again.** `[FACT]`

### 1.2 Proof — the CTA's own remedy is what kills it

`src/views/OnboardingV2.tsx:1186-1197`:

```ts
const onTrial = async () => {
  if (trialState === 'working') return
  if (!signedIn) { setTrialState('not_authenticated'); return }   // ← guest short-circuit
  setTrialState('working')
  setTrialState(await beginTrial())
}
```

`signedIn` comes from `SetupView.tsx:66` → `user !== null`. Per `[WAVE-A]` the questions now
precede the account, so **the overwhelmingly common visitor at this screen is a guest** and always
lands on `not_authenticated`. That renders `reveal-create-account-cta`
(`OnboardingV2.tsx:1304-1313`) wired to `App.tsx:513` → `goAuth('signup')` → `setView('signup')`.

`setView('signup')` swaps the `content` branch (`App.tsx:504-517` vs the auth branch), so
`<V.SetupView>` **unmounts** and the `finished` latch (`SetupView.tsx:54`) is destroyed.
After signup, `enterApp()` (`App.tsx:342-359`) routes to `dashboard` — and because onboarding was
already marked complete **before** the handoff rendered (`SetupView.tsx:86-87` comment; the plan is
saved and `markCompleted` runs before `onComplete`), any later return to `#/setup` resolves
`mode='advanced'` (`App.tsx:507,515`) → `CustomizationCenter`, **not** the reveal screen.

**Net effect in the production build:** guest sees "Try Premium for 3 days" → is told to create an
account → creates it → is dropped on the dashboard → the trial button no longer exists anywhere.
`start_trial()` is reachable only by a user who was *already* signed in and verified at the exact
moment they finished onboarding. `[FACT for the code path; INFERENCE for "no user can practically
reach it", since a signed-in-then-onboarding order does exist]`

### 1.3 Environment matrix

| Build | `signedIn` reachable? | What the button does | Server touched? |
|---|---|---|---|
| `founder_preview` (`VITE_APP_ENV=founder_preview`) | **No** — `isSupabaseConfigured()===false` (`supabaseClient.ts:48-56`) ⇒ `AuthProvider` never gets a user (`authContext.tsx:155,165`) | always `trialNeedsAccount` → create-account CTA → `LoginView.tsx:373-378` wall | never |
| production (`npm run build`) | Yes, but only pre-onboarding | guest: `trialNeedsAccount` → signup → **CTA gone forever**; signed-in+verified: real `start_trial()` | yes, on the signed-in path only |

So the answer to "dead in founder_preview only, or also in production?" — **dead in both, for
different reasons.** In preview it is a wall; in production it is a trapdoor.

### 1.4 Secondary defect in the same handler — wrong blame (see §3)

`OnboardingV2.tsx:1205`:
```ts
: trialState === 'offline' || trialState === 'revoked' ? rv.cta.trialOffline
```
`revoked` (a *permanent administrative ban*, raised as `access_revoked` by
`start_trial` at migration `20260806120002:115-118`) is rendered as
`reveal.ts:141` → **«ما قدرنا نوصل للخادم. تأكّد من اتصالك وجرّب مرة ثانية.»**
A banned user is told their internet is broken and invited to retry forever.

### 1.5 Minimal fix (no server authority weakened)

1. **Give the trial a durable home.** Add a trial CTA to `PremiumGate.tsx` (below the Premium link,
   above "have a code"), driven by the same `useAccess().beginTrial()`. This is the one surface
   every blocked action already funnels to, so it needs no new routing.
2. **Preserve the reveal intent across signup.** Set a one-shot local intent before `goAuth('signup')`
   and, in `enterApp()`, if the intent is present and the account is verified, call `beginTrial()`
   once and show the result — or simply route back to a trial-offer surface instead of the dashboard.
3. **Split `revoked` from `offline`** at `OnboardingV2.tsx:1205` (needs new key, see §3.5).
4. In `founder_preview`, short-circuit earlier and say so honestly (see §3 key `trialBackendAbsent`).

**Files:** `src/views/OnboardingV2.tsx`, `src/components/PremiumGate.tsx`, `src/App.tsx`,
`src/views/SetupView.tsx`, `src/i18n/dict/reveal.ts`, `src/i18n/dict/access.ts`.

---

## 2. SIGNUP UNAVAILABLE IN PREVIEW — **CONFIRMED (by design), with a copy defect**

### 2.1 Mechanism

`AuthProvider` reads `configured = isSupabaseConfigured()` once (`src/lib/authContext.tsx:155`).
In `founder_preview` that is `false` (`supabaseClient.ts:48-56`), so:

- `authContext.tsx:165-167` sets `loading=false` and never restores a session.
- Every mutating auth method returns `cloudDisabledError()` (`authContext.tsx:137-140`,
  used at `:245, :266, :309, :319, :345, :487-500`).
- `LoginView.tsx:175` branches on `auth.configured`. The `false` arm is `LoginView.tsx:373-378`:
  **no email field, no password field, no submit button** — only a card with two strings.

### 2.2 What the user actually sees `[FACT]`

`src/config/strings.ts:532-533` (ar):
> **«تسجيل الدخول السحابي مو مفعّل حاليًا»**
> «المزامنة السحابية مو مفعّلة في هذي النسخة. **كلّم مزوّد الخدمة عشان يفعّل لك الحساب.**»

`src/config/strings.ts:1006-1007` (en):
> "Cloud login isn't available right now"
> "Cloud sync isn't enabled in this build. **Contact the provider to enable accounts.**"

### 2.3 Defects in that copy

1. **Template language.** "كلّم مزوّد الخدمة" / "Contact the provider" addresses the reader as a
   *buyer of a deployment*, not the end user of Qimmah. This is exactly the register the charter
   §0.2 and `.claude/rules/product.md` forbid, and `test:no-template-language` does not catch it
   (it guards «صفحتك» / "your page"). There is no "provider" for a user to contact.
2. **Wrong subject.** The user pressed *create account*; the message talks about *cloud sync*.
   Two different promises (§0.1: storage ≠ access).
3. **Dead end.** Nothing tells the reviewer this is a review build, and no next step is offered —
   while `BUILD_LABEL` already knows (`src/lib/buildInfo.ts:24-25`).

### 2.4 Minimal fix

Add a preview-specific pair used when `isFounderPreview()` (`src/lib/appEnv.ts:39-41`) is true:
`authPreviewTitle` / `authPreviewBody` — «هذي نسخة مراجعة، ما فيها حسابات. تصفّح كل شي، والحساب
يشتغل في النسخة الحيّة.» And rewrite the generic pair to drop "provider".
**Files:** `src/config/strings.ts`, `src/views/LoginView.tsx`.

---

## 3. ACTIVATION ERROR BLAMES INTERNET — **CONFIRMED**; taxonomy below

### 3.1 Exact keys and the branch that picks them

Dictionary: `src/i18n/dict/access.ts` — interface at `:41-51`, Arabic values `:75-82`, English `:104-111`.
The offending string is **`codeOffline`**:

- `src/i18n/dict/access.ts:80` — «ما قدرنا نتحقّق الحين. تأكّد من النت وجرّب بعد شوي.»
- `src/i18n/dict/access.ts:109` — "We couldn't check right now. Check your connection and try again shortly."

Selector: `src/components/PremiumGate.tsx:70-79`

```ts
const message =
  state === 'checking' ? s.codeChecking
    : state === 'success' ? s.codeSuccess
      : state === 'already_used' ? s.codeAlreadyUsed
        : state === 'expired' ? s.codeExpired
          : state === 'offline' ? s.codeOffline      // ← the sink
          : state === 'revoked' ? s.codeRevoked
          : state === 'not_authenticated' ? s.codeNeedsAccount
            : state === 'invalid' ? s.codeInvalid : ''
```

The sibling in the trial path is `src/views/OnboardingV2.tsx:1205` → `reveal.ts:141` `trialOffline`.

### 3.2 Every failure mode the code can actually detect

**Client-side, before any request:**

| # | Condition | Where | Current outcome |
|---|---|---|---|
| 1 | empty / whitespace code | `PremiumGate.tsx:144` | button disabled, **no message** (§5) |
| 2 | code normalizes to empty (all separators) | `entitlementSource.ts:102-103` | `invalid` → `codeInvalid` ✅ |
| 3 | **backend not configured** (`founder_preview`, or missing env) | `entitlementSource.ts:117`; `entitlementBackend.ts:208` | **`offline` → «تأكّد من النت»** ❌ |
| 4 | supabase-js failed to load / client build failed | `supabaseClient.ts:118-121` → `entitlementBackend.ts:209-210` | **`offline`** ❌ |
| 5 | no session | `entitlementBackend.ts:211-212` | `not_authenticated` → `codeNeedsAccount` ✅ |

**Server round-trip** — `redeemOutcomeFor()` at `entitlementBackend.ts:198-205`:

| # | Postgres signal | Raised by | Mapped to | Shown as |
|---|---|---|---|---|
| 6 | `code_already_redeemed` / SQLSTATE `23505` | `20260806120002:211` | `already_used` | `codeAlreadyUsed` ✅ |
| 7 | `access_revoked` / `28000` | `20260806120002:182` | `revoked` | `codeRevoked` ✅ |
| 8 | `not authenticated` / `28000` | `20260806120002:172` | `not_authenticated` | `codeNeedsAccount` ✅ |
| 9 | `invalid_code` / `22023` | `20260806120002:204` **and** `20260809120004:33-36` | `invalid` | `codeInvalid` — *deliberately collapsed*, see 3.3 |
| 10 | RPC timeout ≥ 8 s | `entitlementBackend.ts:88, 215` | **`offline`** ❌ (indistinguishable from #3, #4) |
| 11 | genuine network failure | error → `redeemOutcomeFor` default `:204` | **`offline`** ✅ (only correct use) |
| 12 | `identity_pepper: no active version` (`P0002`) | `20260806120001:94` | **`offline`** ❌ — a **server misconfiguration** reported as the user's WiFi |
| 13 | `unknown user` (`P0002`) | `20260806120002:174` | **`offline`** ❌ |
| 14 | `permission denied` (`42501`) / function missing (`42883`) after a bad migration | Postgres | **`offline`** ❌ |
| 15 | any future unmapped exception | default `:204` | **`offline`** ❌ |

**Dead branch:** `state === 'expired'` (`PremiumGate.tsx:74`) and the key `codeExpired`
(`access.ts:47, 79, 108`) are **unreachable in production**. `RedeemServerOutcome`
(`entitlementBackend.ts:185-191`) has no `'expired'` member and the switch at
`entitlementSource.ts:119-127` never yields it; only `MOCK_CODES['QIMMAH-TEST-EXPIRED']`
(`entitlementSource.ts:58`) can, and mock is stripped from production builds. An actually-expired
code raises `invalid_code` and reads as `codeInvalid`. `[FACT]`

### 3.3 What must stay collapsed

Row #9 is **correct and must not be split.** `redeem_access_code`
(`20260806120002:197-205`) fuses "not found · disabled · not started · window closed ·
max redemptions reached" into one `invalid_code` precisely so the field is not an oracle for code
existence. Splitting it would weaken server authority. **Leave it.**

### 3.4 What is currently collapsed and should not be

Rows **#3, #4, #10, #12, #13, #14, #15** all render as "check your internet". Three distinct
classes are hiding there:
- **backend absent by build** (preview) — not an error at all,
- **backend unreachable / slow** — genuinely transient,
- **backend broken** (missing pepper, missing grant, missing function) — an operator incident that
  currently produces zero signal and invites the user to retry a request that will never succeed.

### 3.5 Proposed dictionary keys (exact names)

Add to `AccessStrings` in `src/i18n/dict/access.ts`, both languages:

| Key | Selects on | Intent (ar draft) |
|---|---|---|
| `codeBackendAbsent` | new outcome `backend_unconfigured` (rows 3, 4) | «التفعيل ما يشتغل في نسخة المراجعة. جرّبه في النسخة الحيّة.» |
| `codeTimeout` | new outcome `timeout` (row 10) | «الطلب طوّل أكثر من اللازم. جرّب مرة ثانية.» |
| `codeServiceError` | new outcome `service_error` (rows 12–15) | «فيه خلل عندنا مو عندك. سجّلناه، وراسل الدعم إذا تكرّر.» |
| `codeOffline` | **narrowed** to row 11 only | keep current text |
| `codeExpired` | **either wire it or delete it** — today it is unreachable | — |

Mirror in `src/i18n/dict/reveal.ts` for the trial path:

| Key | Selects on | Note |
|---|---|---|
| `trialBackendAbsent` | `backend_unconfigured` | preview build honesty |
| `trialTimeout` | `timeout` | |
| `trialServiceError` | unmapped server errors | |
| `trialRevoked` | `revoked` | **currently mis-routed to `trialOffline`** — highest-value split |
| `trialOffline` | narrowed to real network failure | |

**Type changes required (fail-closed preserved — every new member is still a refusal):**
- `RedeemOutcome` (`entitlementSource.ts:38-45`) `+ 'backend_unconfigured' | 'timeout' | 'service_error'`
- `RedeemServerOutcome` (`entitlementBackend.ts:185-191`) same additions
- `TrialOutcome` (`entitlementBackend.ts:223-229`) same additions
- `withTimeout` (`:91-101`) must return a distinguishable sentinel rather than `null` collapsing to `offline`.

**Files:** `src/lib/access/entitlementBackend.ts`, `src/lib/access/entitlementSource.ts`,
`src/components/PremiumGate.tsx`, `src/views/OnboardingV2.tsx`, `src/i18n/dict/access.ts`,
`src/i18n/dict/reveal.ts`.

> Already raised as `R-2` in `docs/execution/qimmah-founder-qa/PREVIEW-SAFETY.md:171-180` and as
> `F-2` in `FOUNDER-QA-FINDINGS.md:38-50`. Both correctly note it reaches production and needs a
> founder decision. This section supplies the full taxonomy those notes deferred — and adds the
> **trial `revoked`** case, which neither document names.

---

## 4. PREMIUM MODAL SURVIVES ROUTE CHANGE — **CONFIRMED** (+ focus restoration missing)

### 4.1 Mount topology

- `blockedAction` lives in `EntitlementProvider` state (`src/lib/access/provider.tsx:20`), mounted at
  `src/main.tsx:76-81` — **above** `App`, so it outlives every route.
- `PremiumGateLayer` (`src/App.tsx:98-105`) renders on `blockedAction` alone and is placed at
  `src/App.tsx:668`, **outside** the `content` if/else chain (`App.tsx:~440-560`). Route changes
  replace `content`; the gate layer is untouched.
- `closeGate` has exactly **three** callers, all inside the dialog itself:
  `PremiumGate.tsx:50` (Escape), `:100` (X button), `:163` (dismiss button).
  `grep -rn "closeGate" src/` outside `src/lib/access/` returns nothing else. `[FACT]`
- The route effect `src/App.tsx:283-296` (`hashchange` → `setView(guardRoute(...))`) contains
  **no** gate teardown.

### 4.2 Repro `[INFERENCE from the above — not executed]`

1. Trigger any paid action (e.g. water logging) → gate opens, `blockedAction` set.
2. Press the browser **Back** button (or follow any deep link / `#/…` change).
3. `hashchange` fires → `setView` swaps the underlying screen → **`blockedAction` is still set**,
   so the gate stays mounted `fixed inset-0 z-[85]` over a screen the user never asked to gate.

The in-app bottom nav is *not* a repro path: the backdrop covers it. Back/forward, deep links and
any programmatic `setHashRoute` are.

### 4.3 Focus restoration — **missing** `[FACT]`

`PremiumGate.tsx:37-44` focuses `closeRef` on open. Nothing captures
`document.activeElement` beforehand, and nothing restores it. On close, `blockedAction` → `null` →
`PremiumGateLayer` returns `null` → the whole subtree unmounts and focus falls to `<body>`.
A keyboard user who pressed "Add food", got the gate, dismissed it, resumes tabbing **from the top
of the document**. WCAG 2.4.3 / dialog authoring practice.

Related, smaller: the background is not `inert`/`aria-hidden`, so the focus trap
(`PremiumGate.tsx:47-61`) holds Tab but a screen-reader virtual cursor can still browse behind the
dialog. The trap's `querySelectorAll` (`:52`) also omits `select`, `textarea` and
`[tabindex]` — harmless for the current markup, fragile if the dialog grows.

### 4.4 Minimal fix

```ts
// provider.tsx — add alongside the existing effects
useEffect(() => {
  const clear = () => setBlockedAction(null)
  window.addEventListener('hashchange', clear)
  return () => window.removeEventListener('hashchange', clear)
}, [])
```
```ts
// PremiumGate.tsx — restore focus
const returnFocusRef = useRef<HTMLElement | null>(null)
useEffect(() => {
  if (!blockedAction) return
  returnFocusRef.current = document.activeElement as HTMLElement | null
  closeRef.current?.focus()
  return () => returnFocusRef.current?.focus?.()
}, [blockedAction])
```
**Files:** `src/lib/access/provider.tsx`, `src/components/PremiumGate.tsx`.
**Counter-proof to add (§4.2 of the charter):** a check that opening the gate then dispatching
`hashchange` leaves `blockedAction === null`, and a mutation that removes the listener must fail it
by name.

---

## 5. EMPTY ACTIVATION CODE DOES NOTHING — **CONFIRMED (low severity)**

`src/components/PremiumGate.tsx:141-150`:
```tsx
<button
  type="button"
  onClick={() => void submitCode()}
  disabled={!code.trim() || state === 'checking' || state === 'success'}
  ...
```
and the Enter path `:135`: `onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) void submitCode() }}`.

**Consequences `[FACT]`:**
- Empty or whitespace-only input ⇒ button `disabled` ⇒ **click produces no DOM event at all**; Enter
  is swallowed by the guard. The `role="status"` region (`:151-159`) renders only when `message` is
  non-empty, so **nothing is announced and nothing appears**.
- The only feedback is `disabled:opacity-40` — a purely visual cue with no text, no
  `aria-describedby`, and no `title`. A screen-reader user hears "dimmed" with no reason.
- `submitCode()` itself (`:65-68`) has **no validation whatsoever**; it delegates entirely to
  `redeemActivationCode`, which does return `'invalid'` for an empty normalization
  (`entitlementSource.ts:102-103`) — but that branch is unreachable from the UI because of the
  `disabled` gate.

**Not a security issue.** Server-side, `private.normalize_access_code`
(`20260809120004:17-38`) rejects anything under 10 chars or outside the 32-symbol alphabet, so an
empty code could never redeem regardless.

**Minimal fix:** keep the button enabled, and in `submitCode()` add
`if (!code.trim()) { setState('invalid'); return }` — or better, a dedicated
`codeEmpty` key («اكتب الكود أول.») so "you typed nothing" is not conflated with "that code is wrong".
Add `aria-describedby="activation-code-message"` to the input.
**Files:** `src/components/PremiumGate.tsx`, `src/i18n/dict/access.ts`.

---

## 6. ENTITLEMENT AUTHORITY — **cannot be spoofed into server access; local writes are a different question**

### 6.1 Where entitlement lives

| Layer | Storage | Client-writable? |
|---|---|---|
| Truth | `public.entitlements` row, read only via `public.my_entitlement()` (`20260806120002:56-87`) | **No.** `20260806120001:274-312`: RLS enabled, **zero write policies**, `revoke all` then `grant select` only — the selective-revoke TRUNCATE hole is explicitly closed and commented at `:304-310` |
| Client mirror | `entitlementStore.ts:38` — a module-scope `let`, in memory | not persisted anywhere |
| Mock seam | `sessionStorage['qimmah:entitlement-mock:v1']` (`entitlementSource.ts:30`) | **gated by build-time `VITE_ENTITLEMENT_MODE==='mock'`** (`:33-35`) — the read at `:62-68` returns `false` immediately in production |

**There is no client-writable key that grants access in a production build.** `[FACT]`
`entitlementSource.ts:11-15` states the contract; `resolveEntitlement` (`:77-91`) never reads
`location`, and the mock store is unreadable when `mockEnabled()` is false.

### 6.2 The honest limit

`guard.ts:12-14` says it plainly: the client guard is **not a security boundary**. Anyone with
devtools can call the store's writers or the underlying model functions and write **local**
`localStorage` rows. What that cannot do:
- mint or alter a server entitlement (no write policy, no RPC reachable without the server agreeing);
- unlock anything for another device or after a reload (`entitlement` is re-resolved from
  `my_entitlement()` on every mount, `provider.tsx:35-37`);
- reach the sync pipeline — `VITE_SYNC_ENABLED` is off (`src/lib/syncQueue.ts:11`).

So the exposure of local spoofing is **free local logging on one browser**, not paid access.
`[INFERENCE]`

### 6.3 What each attack suite proves — and what it does **not**

All six are inside `test:gate` (verified by reading `package.json` `test:gate` and by
`gate-integrity-attack.mjs:55-62` which asserts their membership).

| Script | Proves | Does **not** cover |
|---|---|---|
| `scripts/attack/premium-forgery-attack.mjs` (`test:attack-forgery`) | Every client-controlled vector (localStorage, sessionStorage, URL, postMessage) is filled with "paid" values against the **real bundled** `src/` code; production build refuses all. Counter-proved by a second build with `VITE_ENTITLEMENT_MODE=mock` where the seed vector **does** succeed — so the refusal is earned, not harness blindness (`:10-16`). | Does not test the server. Does not test a hostile *runtime* (devtools calling store writers directly) — only *input vectors*. |
| `scripts/attack/commerce-sql-attack.mjs` (`test:attack-commerce`) | Applies **all** migrations from clean PGlite (including the Salla layer `20260812120001`, unlike `test:entitlements`). Executes: brute-force rate measurement, trial re-use after storage wipe / row delete / **account deletion + re-registration**, `expires_at` compared to server `now()` only, order-replay under another identity, idempotent re-grant, unconfirmed-email theft. Carries **inverted sentinels** for closed defects (`F-2`, `F-2b` at `:389-400`) that fail by name if the hole returns. | Live-DB reality: it proves the *migration set in the repo*, not what is applied to the production project. It does not exercise PostgREST, JWT verification, HTTP rate limits, or Supabase Auth. Open findings it **documents rather than fixes**: `F-4` (`+alias` gives a fresh 72h trial, `:341-345`), `F-5` (code contract enforces shape, not entropy, `:280-286`), `F-2c` (`redeem_access_code` does not require a confirmed email, `:401`). |
| `scripts/attack/webhook-spoof-attack.mjs` (`test:attack-webhook`) | Imports the **actual** `supabase/functions/salla-webhook/contract.mjs`. Attacks: no signature, wrong signature, valid signature over a different body, replay, reordered fields, wrong product, unpaid status, altered amount, strategy downgrade, JSON padding, nested-amount inflation. Proves **no DB write precedes verification** two ways: structural block-bounded parse of `index.ts` **and** re-running the same sequence over a fake terminal that counts writes (`:11-17`). | `index.ts` is Deno and is never actually executed — the transport layer is proven by reconstruction, not by running it. Does not test Salla's real signature format against a real Salla payload, nor the deployed function's env. |
| `scripts/attack/admin-escalation-attack.mjs` (`test:attack-admin`) | Malformed role claims (null, object, array, case, whitespace, `__proto__`, prototype pollution, Symbol) all denied; full Supabase-shaped `session.user.app_metadata` used, not a mini shape; proves the admin panel has **no read path** at the data layer; counter-proves that a correct claim **passes**. | Client-side role resolution only. Does not prove the server enforces the role — that is `test:admin-access-denial` + RLS. |
| `scripts/attack/bundle-safety-attack.mjs` (`test:attack-bundle`) | Builds a real bundle via `npx vite build` (`:70`) and scans `dist` for mock seams (`QIMMAH-TEST-*`, `qimmah:entitlement-mock`, `VITE_ENTITLEMENT_MODE`) **and** server secrets (`service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `SALLA_WEBHOOK_SECRET`, `identity_pepper`, `private.*` RPC names). Each class has a planted-pattern counter-proof (`scanner-blind`, `:164`). | Does **not** check the Supabase URL / anon key (those are *supposed* to ship). Does not check the founder-preview build — that is `test:preview-safety` §10. |
| `scripts/attack/gate-integrity-attack.mjs` (`test:attack-gates`) | Attacks the guards themselves and records 8 live weaknesses (below). | It is a mirror, not a fix — every `⚔️` line asserts the weakness **still exists**, so tightening any guard deliberately fails it. |

**Open guard weaknesses recorded by `test:attack-gates` (read them as a live defect list):**

| ID | Severity | What |
|---|---|---|
| `G-1`/`G-1b` (`:47-51`) | P2 | `test:bundle-safety` is in neither `test:gate` nor CI — mitigated by `test:attack-bundle` being in the gate |
| `G-2` (`:68`) | P2 | `test:e2e:preview-gate` — the **live** paid-gate behaviour — is in neither gate nor CI |
| `G-3` (`:81-86`) | **P1** | `scripts/db/entitlements-proof.mjs` applies migrations **by name** and omits `20260812120001_salla_webhook_ingest.sql`, so it certifies an `admin_grant_premium` shape that exists in no deployed environment |
| `G-4` (`:103-110`) | P2 | `privileges-proof.mjs` has no "every table must be classified" assertion; `salla_webhook_events` is unclassified |
| `G-5`/`G-5b`/`G-5c` (`:118-170`) | P2/P3 | admin-denial mutation battery asserts `!isAdmin` but not the **reason name**; a mutation swapping `forged-claim`→`no-role-claim` survives it (proved by execution) |
| `G-6` (`:184`) | P3 | `test:access-gate` accepts `assertPaid` **after** the write; only compensated by a separate explicit check that the 7 real writers guard on line 1 |
| `G-7` (`:227`) | P3 | `test:activation-ui` verifies dialog a11y attributes with whole-file `includes()` — scattered unrelated elements satisfy it |
| `G-8` (`:254`) | P2 | **no access-code generator exists in the repo** (all of `src`, `scripts`, `supabase`, `docs` scanned). Codes are hand-written; the DB contract enforces *shape* (≥10 of 32 symbols ⇒ 50 bits **ceiling**) but not entropy — `commerce-sql-attack.mjs:283` proves `RAMADAN2345` passes normalization |

### 6.4 Not covered by any of the six

- **Live production database state.** Every SQL proof runs on PGlite from `supabase/migrations/`.
  Nothing in the repo verifies which migrations are applied to the real project. `[FACT]`
- **The deployed edge function.** `docs/product/SALLA-STAGING-READINESS.md:3-4` states plainly:
  *«لا نشر · لا هجرة · لا تسجيل webhook · لا مساس بالإنتاج»*, and
  `SALLA-MERCHANT-COPY-CHANGES.md:100` says *«التفعيل الآلي غير حيّ»*. So the Salla→entitlement arc
  is **built and proven but not live**.
- **Rate limiting.** `commerce-sql-attack.mjs:276` measures 300 consecutive `redeem_access_code`
  calls with zero throttling; `20260809120001` header and
  `ACCESS-ENTITLEMENT-ARCHITECTURE.md §11.2` name it as an explicit external blocker.
- **Email-alias abuse** (`F-4`) and **weak hand-picked codes** (`F-5`/`G-8`) are documented, unfixed.

---

## 7. TRIAL CLOCK — **server-controlled. Cannot be reset by storage or device clock.**

### 7.1 Grant

`public.start_trial()` (`20260806120002:90-154`):
- `expires_at = now() + interval '72 hours'` (`:146,149`) — `now()` is **database** time.
- Requires `email_confirmed_at` (`:109`); refuses when a permanent revocation exists (`:115-118`).
- **Permanent one-shot:** `trial_ledger` is keyed on a peppered `email_hash` and carries **no
  `user_id`** (`20260806120001:203-212`), so `delete_own_account()` — which deletes rows from every
  table that *has* `user_id` (`20260713120007`) — cannot erase it. The check at `:125-131` scans
  **all** pepper versions.

### 7.2 Evaluation

`private.derive_state` (`20260806120002:25-42`) compares `p_expires_at > now()`. It takes **no time
parameter** and `my_entitlement()` takes **no parameters at all** — proven at
`commerce-sql-attack.mjs:319-326` (`'ولا يقبل أي بارامتر وقت من المستدعي'`,
`'my_entitlement بلا بارامترات'`).

### 7.3 Client side

- `remainingMs()` (`entitlementBackend.ts:124-128`) is computed from `expiresAtMs - serverTimeMs`
  minus elapsed measured by `performance.now()` — a monotonic counter immune to system-clock changes
  (`:117-123`). **But it has zero callers** — nothing displays a countdown.
- The snapshot is in memory only (`entitlementStore.ts:38`) and is re-resolved from the server on
  every mount (`provider.tsx:35-37`) and on every auth event (`:44-64`).
- `fetchEntitlement` explicitly does not cache between sessions (`entitlementBackend.ts:137-138`).

### 7.4 Executed proofs (in `commerce-sql-attack.mjs` §④, `:289-345`)

- second `start_trial()` ⇒ `trial_already_used` (`:298`)
- **wipe all local state + delete the entitlement row** ⇒ still `trial_already_used` (`:305-308`)
- **delete the auth user and re-register with the same email** ⇒ still `trial_already_used` (`:311-315`)
- `expires_at` set to the past ⇒ `my_entitlement()` returns `trialExpired` immediately, no cron (`:332-336`)

**Answer:** clearing storage — no effect. Moving the device clock — no effect (server `now()` only,
and even the display helper uses `performance.now()`).

### 7.5 The two real gaps

1. **`+alias` bypass** (`F-4`, `:341-345`, P2, **open**): `trial+farm1@example.com` hashes
   differently from `trial@example.com`, so one mailbox yields unlimited 72-hour trials. Named in
   the architecture doc §11/4 as a structural limit, not closed.
2. **Stale client after expiry `[INFERENCE]`:** the provider re-resolves only on mount and on
   `onAuthStateChange`. A session left open past the 72-hour mark keeps `status === 'active'` until
   the next token refresh fires an auth event (roughly hourly with `autoRefreshToken: true`,
   `supabaseClient.ts:111`). The write still succeeds locally in that window; nothing on the server
   is granted. Minimal fix: schedule a re-`refresh()` at `remainingMs()` — the helper already exists
   and is otherwise unused.

---

## 8. ACTIVATION CODE REDEMPTION — **atomic and single-use. CONFIRMED.**

`public.redeem_access_code` (`20260806120002:157-246`, re-declared with the shared normalizer at
`20260809120004:66+`):

1. **Row lock first:** `select * into c from public.access_codes … for update` (`:192-195`).
   Concurrent redeemers serialize at that lock, and the read after the lock is fresh — the header
   comment at `:188-191` states exactly this.
2. **Limit checked under the lock:** `c.redemption_count >= c.max_redemptions` → `invalid_code`
   (`:202-204`), then `redemption_count = redemption_count + 1` (`:214-216`) — read-check-write is
   inside one lock, so no TOCTOU.
3. **Structural backstop independent of the lock:** `constraint access_codes_within_limit
   check (redemption_count <= max_redemptions)` (`20260806120001:161`). Even if the lock were
   removed the DB refuses over-redemption.
4. **Per-identity single use, survives account deletion:** `code_redemption_ledger` has PK
   `(code_id, email_hash)` and **no `user_id`** (`20260806120001:237-246`); the pre-check at
   `:208-212` scans every pepper version and raises `code_already_redeemed`.
5. **Per-user idempotence:** `access_code_redemptions … on conflict (code_id, user_id) do nothing`
   (`:220-221`).
6. **No downgrade:** an existing longer expiry is preserved (`:226-230`) and an existing Premium
   returns `premiumActive` without being overwritten (`:231-234`).
7. **Whole function is one transaction** (plpgsql `security definer`), so an exception at any step
   rolls back the counter and both ledgers together.

**Verdict: atomic.** `[FACT]`

**Named residual risks (not atomicity):**
- `redeem_access_code` does **not** require `email_confirmed_at` — asymmetric with `start_trial`
  (finding `F-2c`, `commerce-sql-attack.mjs:401`, P2, open). An unverified address can burn a code
  belonging to someone else's mailbox.
- No rate limiting (§6.4).
- Code entropy is a ceiling, not a floor (`G-8` / `F-5`).

---

## 9. COMMERCIAL CONTRADICTION — annual store copy vs. no-expiry grant

**Documented, not resolved. This is a founder decision (§0.1 / charter §3).**

### Side A — the Salla storefront (live, unchanged)

`docs/product/SALLA-MERCHANT-COPY-CHANGES.md:4` fixes the observation:
> «**المرصود:** متجر `Qimmahsa` (`1460504714`) — منتج `1181109938` وصفحته العامة، بتاريخ 2026-08-11.»
> «**الحالة:** ⛔ **لم يُعدَّل شيء في لوحة سلة.**»

Verbatim live strings, `SALLA-MERCHANT-COPY-CHANGES.md:19-22`:

| Row | Live text | Surface |
|---|---|---|
| 1 | **«19.99 ريال سنويًا»** | product `1181109938` description |
| 2 | **«قريبًا ينزل تطبيق قمة على آيفون وأندرويد، وبعدها يرتفع السعر إلى 89.99 ريال سنويًا للمشتركين الجدد.»** | product description |
| 3 | **«اشترك الحين واحتفظ بسعرك»** | product description |
| 4 | **«اشتراك قمة السنوي الان بسعر 19.99 ريال»** | store homepage banner |
| 5 | **«وش تحصل في اشتراكك؟»** | benefits heading |
| 6 | **«تنتقل تلقائيًا للتطبيق بنفس اشتراكك بدون أي رسوم إضافية»** | product description |
| 8 | product category: **«الاشتراكات»** | store taxonomy |

### Side B — what the backend actually grants

`supabase/migrations/20260812120001_salla_webhook_ingest.sql:105-113` (and identically
`20260806120002:341-347`, `20260806120002:277-283`):

```sql
insert into public.entitlements (user_id, email, entitlement_type, source,
                                 activated_at, expires_at, no_expiry)
values (uid, p_email, 'premium', p_provider, now(), null, true)
on conflict (user_id) do update
  set entitlement_type = 'premium', source = p_provider, activated_at = now(),
      expires_at = null, no_expiry = true, activation_code_id = null
  where public.entitlements.entitlement_type <> 'premium';
```

`private.derive_state` (`20260806120002:36`):
```sql
when p_type = 'premium' and p_no_expiry then 'premiumActive'
```
— `premiumActive` has **no time term at all**. Enforced by the schema:
`entitlements_premium_shape` (`20260806120001:183-184`) makes `premium ⇔ no_expiry`, and
`entitlements_no_expiry_shape` (`:181`) forbids `premium` from carrying an `expires_at`.
**A Premium grant cannot expire; the schema makes an expiring Premium unrepresentable.**

### Side C — what the in-app copy says

`src/i18n/dict/reveal.ts:132` / `:189` (the only approved Premium line, charter §0.1):
> «يشمل تحديثات قِمّة — بلا اشتراك شهري» / "Includes Qimmah updates — no monthly subscription"

### The contradiction, precisely

1. **Duration.** Salla sells **«١٩٫٩٩ ريال سنويًا»** and categorises the product under
   **«الاشتراكات»**. The backend writes `expires_at = NULL, no_expiry = true` — **perpetual, with no
   renewal mechanism of any kind** (no cron, no expiry job, no renewal RPC anywhere in
   `supabase/`). A buyer told they bought a year owns it forever; there is no code path that could
   ever revoke it on an anniversary except manual `admin_revoke`.
2. **Renewal.** «اشترك الحين واحتفظ بسعرك» promises a locked-in renewal price for a contract that
   does not exist. There is no subscription object, no renewal webhook event handled
   (`SUPPORTED_EVENTS` in `contract.mjs`), and no billing state in the schema.
3. **App scope.** «تنتقل تلقائيًا للتطبيق بنفس اشتراكك بدون أي رسوم إضافية» promises the mobile app
   is included forever. The repo's own note marks this ⛔ **«الأخطر»** and says it contradicts the
   founder's decision (one free month, then app policy). Nothing in the schema distinguishes web
   from app entitlement — `entitlement_type='premium'` is unscoped, so the DB currently *would*
   honour the promise, which is precisely the exposure.
4. **Second permanent price.** «٨٩٫٩٩ ريال سنويًا للمشتركين الجدد» is a standing second price;
   charter §0.1 permits only temporary campaigns or codes.
5. **Charter-forbidden register.** «سنوي/سنوية» is on the repo's own banned list
   (`SALLA-MERCHANT-COPY-CHANGES.md:10`) alongside «مدى الحياة» / «lifetime», and there is a
   *planned but absent* guard: `test:premium-copy` is described in
   `.claude/rules/copywriting.md` as «الحارس المخطَّط … يهبط مع حزمة نصوص الوصول، لا قبلها» —
   **it does not exist in `package.json`.** So nothing mechanically prevents "annual" from
   re-entering app surfaces either.

### Aggravating factor: the activation channel is doubly promised

`SALLA-MERCHANT-COPY-CHANGES.md:35` records the live store text
**«يوصلك رابط التفعيل على الواتساب مباشرة»** — a manual WhatsApp activation — while the built path
is an automatic webhook. And per `SALLA-STAGING-READINESS.md:3-4` the webhook is **not deployed**.
So today a real purchase grants **nothing automatically**, and the promised manual channel is a
human process with no code behind it. `[FACT from docs; INFERENCE that a live purchase strands]`

**No resolution proposed. Founder decision.**

---

## 10. PREVIEW SAFETY — mechanism, break conditions, proof quality

### 10.1 The mechanism, named

**One build-time constant folded by the minifier, in exactly one file.**

`src/lib/supabaseClient.ts:48-50`:
```ts
const IS_FOUNDER_PREVIEW = import.meta.env.VITE_APP_ENV === 'founder_preview'
const url     = explicitUrl     || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_URL)
const anonKey = explicitAnonKey || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_ANON_KEY)
```
`isSupabaseConfigured()` (`:55-57`) then returns `false`, and `getSupabase()` (`:103-104`) returns
`null` before importing supabase-js at all.

**Why this location and no other:** every production mutation in the app funnels through that one
predicate — enumerated as ①–⑩ in `PREVIEW-SAFETY.md:34-55` (`start_trial`, `redeem_access_code`,
`claim_pending_grants`, `my_entitlement`, `signUp`, `signInWithPassword`/`resetPasswordForEmail`/
`updateUser`, `profiles.upsert`, sync deletes, admin tables, deep-link recovery). Each already
fails closed with an honest existing state, so no second code path was written.

**Why `import.meta.env` is read inline rather than through `APP_ENV`:** Vite text-substitutes
`import.meta.env.VITE_APP_ENV` at build, making the ternary constant, so the minifier tree-shakes
`DEFAULT_SUPABASE_URL` **out of the preview artifact entirely**. A function call from another module
would not fold, leaving the credentials in the bundle behind a runtime boolean. Documented at
`supabaseClient.ts:36-47` and `appEnv.ts:43-45`. *"The credential is absent from the artifact" is
strictly stronger than "present and unused."*

**Files:** `src/lib/appEnv.ts` (declaration + `isFounderPreview()`), `src/lib/supabaseClient.ts:48-52`
(the actual cut), `src/lib/buildInfo.ts:24-25` (`BUILD_LABEL` suffix), `vite.config.ts:48,58-60`
(`<meta name="qimmah-env">`), `package.json:11` (`build:founder-preview`),
`src/vite-env.d.ts:6-7` (type).

### 10.2 What would break it — ranked by likelihood

| # | Break | Severity | Caught by? |
|---|---|---|---|
| 1 | **Cloudflare Pages Git integration builds the preview branch with `npm run build`** | ⛔ **critical** | **nothing in the repo** — see 10.3 |
| 2 | Deploying with `npx wrangler pages deploy dist` after a plain `npm run build` instead of `build:founder-preview` (`PREVIEW-SAFETY.md:219-223`) | critical | only the manual 30-second post-deploy check at `PREVIEW-SAFETY.md:233-237` |
| 3 | Refactoring `supabaseClient.ts:48` to `isFounderPreview()` from `appEnv` (a natural "DRY" cleanup) | high — credential returns to the bundle | ✅ layer ① of `test:preview-safety` greps `dist` |
| 4 | Reverting the ternary to the unconditional `|| DEFAULT_…` | high | ✅ layers ① and ④ |
| 5 | A **second** module hardcoding the project URL/key | high | ✅ layer ① (greps every file in `dist`) — this is the layer that matters |
| 6 | Setting `VITE_SUPABASE_URL`+`ANON_KEY` in the preview environment (the deliberate escape hatch, `supabaseClient.ts:51-52`) | by design | not caught, and should not be |
| 7 | CSP in `public/_headers:10` still allows `connect-src … https://*.supabase.co wss://*.supabase.co` for **both** builds | defence-in-depth left unused (`R-3`, `PREVIEW-SAFETY.md:182-192`) | no |
| 8 | The artifact scan matches the **URL host only** (`PROD_HOST = 'ledlypcyrtnzvjvhykwz'`, `run-founder-preview-safety-proof.mjs:31`). The anon key is a JWT whose `ref` is base64-encoded, so the host string does **not** appear in it literally — a bundle that shipped the key without the URL would pass layer ① | medium | no (though `isSupabaseConfigured()` needs both, so it is not exploitable today) |

### 10.3 The critical one, spelled out

`FOUNDER-QA-FINDINGS.md:80-101` (F-5) **raises the right question** — "is the Pages project
Git-connected? then pushing this branch may have auto-built it with `npm run build`, i.e.
production mode, with the baked credentials — exactly the unsafe build this wave guards against" —
and then **reasons to the wrong answer**, arguing (`:88-91`) that a 318-commit-stale deployment
implies direct upload.

Contradicting evidence exists outside the repo, in this machine's session memory
(`~/.claude/projects/-Users-ziyad-qimmah-deploy/memory/qimmah-deploy-authority.md`), recorded
2026-08-11 after `wrangler pages project list`:

> «**تكامل Git مفعّل (`Git Provider: Yes`)**: كل دفع إلى `main` يبني وينشر **إنتاجًا تلقائيًا**،
> وكل فرع آخر يبني **Preview**.»
> «⚠️ مصيدة تشخيص وقعتُ فيها: `gh api repos/.../deployments` يرجع `[]` … **تكامل Pages لا يكتب
> سجلّات deployment في GitHub.** التحقّق الصحيح: `wrangler pages project list`.»

If that memory is current, then **every branch push already produces a Pages preview built with the
project's configured build command**. Unless that command is `npm run build:founder-preview` (it
almost certainly is not, since `main` must build as production), those automatic previews are
**production-credentialed builds sitting on `*.pages.dev` subdomains** — the precise artifact this
wave exists to prevent, created without anyone running the deploy command.

**This is the single highest-value verification in the whole lane, and it cannot be done from here**
(F-1: Cloudflare blocked at the time of that report; the memory notes the block later lifted).
One command settles it:
```bash
npx wrangler pages deployment list --project-name qimmah
```
Any row for `codex/qimmah-founder-qa-candidate-001` or `codex/qimmah-sovereign-closure-001` ⇒
Git-connected ⇒ those deployments are **not** safe preview builds and should be deleted.
`[FACT that the repo contains no protection; INFERENCE that previews are auto-built, resting on
memory not re-verified this session]`

**Fail-closed hardening that would remove the dependency on operator discipline entirely:**
make the *production* build the one that must be declared. E.g. require `VITE_APP_ENV=production`
for the baked fallback to apply (`supabaseClient.ts:48-50` inverted), so an un-parameterised
CI/Pages build produces a credential-free artifact by default. Production deploys then set the flag
explicitly. This is a one-line inversion with the same tree-shaking property, and it converts
"forgot the preview flag" from *ships production credentials* into *ships nothing*.

### 10.4 Is `test:preview-safety` a real proof or a vacuous one? — **REAL, with two named soft spots**

`scripts/run-founder-preview-safety-proof.mjs`, in `test:gate`.

**It does counter-prove the production case. Explicitly:**

- `:65-72` — `filesWithProdHost(env)` runs an actual `npm run build` and greps every emitted file.
  - `:76-78`: preview build ⇒ `previewHits.length === 0`
  - `:80`: **production build ⇒ `prodHits.length >= 1`** ← the counter-proof you asked about.
    If a refactor accidentally stripped the credential from production too, this line fails.
- `:180-181` — production `isSupabaseConfigured()` and `backendAvailable()` must be `true`.
- `:196-198` — **production builds a real client object; preview returns `null`.** This replaced an
  earlier, genuinely vacuous assertion, and the file says so at `:183-194`: the first version measured
  "zero network calls", which passed **meaninglessly** because production *also* stops at
  `getSession()` with no session. Zero was zero in both builds. Replaced by presence-of-client, which
  actually discriminates.
- `:200-202` — the network tripwire is proved *functional* by deliberately fetching the production
  host and asserting the counter goes 0 → 1. So the earlier zero is a measured zero, not a dead hook.
- `:157-161` — a storage-injection attack (`VITE_APP_ENV=production` written into localStorage) is
  executed and must not flip the mode.

**Soft spot 1 — layer ④ is textual, not executed.** `:164-172` mutates the source *string* and only
asserts the mutated text differs and no longer matches a regex. It does **not** rebuild and re-measure
that the credential returns. It is a tripwire on one specific rollback edit, not on the property.
Layer ① is the real guarantee (it greps the whole `dist`), so the coverage holds — but ④ should not
be read as a behavioural counter-proof.

**Soft spot 2 — host-only scanning** (see 10.2 row 8).

**And the honest limits the doc itself states:** the live e2e (`test:e2e:preview-safety`, 74 checks)
measures "zero external requests" **only on the screens actually walked** (`PREVIEW-SAFETY.md:148-150`),
the exercise library still fetches images from `raw.githubusercontent.com`, and **WebKit is
unavailable** in the environment so iOS Safari — the target browser — has no automated coverage
(`FOUNDER-QA-FINDINGS.md:69-77`).

**Residual risk R-1 stands as written** (`PREVIEW-SAFETY.md:159-169`): both Premium CTAs point at the
**real** Salla store, so a reviewer who completes a purchase creates a genuine production entitlement.
It was left unblocked deliberately (it is a link, not a call; blocking it hides the thing most worth
reviewing) with a checklist item as the control.

---

## Appendix — defect ledger

| # | Claim | Verdict | Severity | Primary evidence |
|---|---|---|---|---|
| 1 | Trial button dead | **Confirmed, both builds** — preview: wall; production: create-account destroys the only trial surface | **P1** | `OnboardingV2.tsx:1186-1197,1286-1313`; `SetupView.tsx:54,62-79`; `App.tsx:513,342-359` |
| 1b | `revoked` shown as "check your internet" | **Confirmed** | P2 | `OnboardingV2.tsx:1205` → `reveal.ts:141` |
| 2 | Signup unavailable in preview | **Confirmed** (by design) + template-language copy defect | P2 (copy) | `LoginView.tsx:175,373-378`; `strings.ts:532-533,1006-1007` |
| 3 | Activation error blames internet | **Confirmed**; 7 distinct causes collapse into `codeOffline` | P2 | `access.ts:80,109`; `PremiumGate.tsx:70-79`; `entitlementBackend.ts:198-205` |
| 3b | `codeExpired` unreachable in production | **Confirmed dead string** | P3 | `entitlementBackend.ts:185-191`; `entitlementSource.ts:119-127` |
| 4 | Gate survives route change | **Confirmed** | P2 | `App.tsx:98-105,283-296,668`; no `closeGate` caller outside the dialog |
| 4b | No focus restoration on close | **Confirmed** | P2 (a11y) | `PremiumGate.tsx:37-44` |
| 5 | Empty code does nothing | **Confirmed** (visual-only feedback) | P3 | `PremiumGate.tsx:135,144,151` |
| 6 | Entitlement spoofable locally | **Disproven for server access**; local-only writes remain possible by design | — | `entitlementStore.ts:38`; `20260806120001:274-312`; `test:attack-forgery` |
| 7 | Trial clock client-controlled | **Disproven** — server `now()` only; survives storage wipe, row delete, account deletion | — | `20260806120002:25-42,146`; `commerce-sql-attack.mjs:289-345` |
| 7b | `+alias` resets the trial | **Confirmed open** (`F-4`) | P2 | `commerce-sql-attack.mjs:341-345` |
| 8 | Redemption atomic / single-use | **Confirmed atomic** | — | `20260806120002:192-221`; `20260806120001:161,237-246` |
| 8b | `redeem_access_code` skips email confirmation | **Confirmed open** (`F-2c`) | P2 | `commerce-sql-attack.mjs:401` |
| 9 | Salla "annual" vs no-expiry grant | **Confirmed contradiction — documented only** | founder decision | `SALLA-MERCHANT-COPY-CHANGES.md:19-26`; `20260812120001:105-113` |
| 10 | Preview safety mechanism | **Real, non-vacuous proof**; critical operational gap at the Pages layer | **P1 (operational)** | `supabaseClient.ts:48-50`; `run-founder-preview-safety-proof.mjs:76-80,196-202` |
| — | No entitlement status surface anywhere | **New finding** — `entitlement.status/detail/lastError` and `remainingMs()` have zero UI consumers | P2 | `grep -rn "useAccess()" src/` (13 sites, none read the snapshot) |
| — | `test:premium-copy` guard planned but absent | **New finding** | P2 | `.claude/rules/copywriting.md`; absent from `package.json` |

**Security posture of every proposal above:** all fixes add *client-side honesty* (better messages,
gate teardown, focus restoration, a durable trial entry). None removes a server check, none moves a
decision from the server to the client, and every new outcome member is a refusal. The one structural
suggestion (10.3, inverting the credential default so production must be declared) makes the system
strictly more fail-closed.
