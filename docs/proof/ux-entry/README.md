# UX Entry & Onboarding Polish — Proof Report

**Branch:** `ux/entry-onboarding-polish` · **Base:** `origin/design/v21-promotion` @ `80e31f7`
**Scope (exclusive):** Welcome/Start · Login/Signup/Password-recovery · Onboarding (all steps) · shared primitives in `styles/index.css` only.
**Untouched:** Dashboard, Today, Workout, Nutrition, Progress, Profile, Settings. No auth logic, validation policy, or persistence changed. No new UI/animation library.

الهدف: رفع جودة التجربة من أول فتح حتى انتهاء الإعداد، بنفس هوية Qimmah v2.1 — واجهة هادئة رياضية احترافية، بلا تجميل زائد.

---

## What changed (files)

| File | Change | Why (grounded) |
|---|---|---|
| `src/views/LoginView.tsx` | Accessible error panel (`role="alert"`, `aria-live`), `role="status"` on the email-confirmation notice, loading spinner + `aria-busy` on submit, **progressive** password requirements (reveal on focus/first keystroke), `disabled:cursor-not-allowed`. | Error text was `text-gold-600` = **3.91:1 on the cream surface → fails WCAG AA (1.4.3)**. Status messages weren't announced (**4.1.3**). No loading affordance (req 3). Requirements always shown (req 4 «تظهر تدريجيًا»). |
| `src/views/ResetPasswordView.tsx` | Same accessible error panel + `aria-live`, `role="status"` on checking/success, loading spinner + `aria-busy` on save. | Identical AA + status-message + loading gaps as Login. |
| `src/views/OnboardingV2.tsx` | Back-button target **40→44px**; non-color **check-badge** on selected Segmented (days/duration) and Tile (place/preference) options. | Back button was `h-10 w-10` (40px) → **fails WCAG 2.5.5 / req 5 (44×44)**. Segmented/Tile selection was conveyed by color only → **fails WCAG 1.4.1 / req 5 («لا باللون وحده»)**. |

**Primitives reused, not invented:** the accessible error treatment reuses the existing `.v2-error-panel` + `.v2-error-icon` (already used by onboarding validation); the check-badge reuses `.v2-choice-icon-selected`. **`styles/index.css` was not modified** — the existing global `prefers-reduced-motion`, `:focus-visible` ring, and `.btn`/`.input` 44px minimums already covered reqs 10 & 12, so no new primitive was needed.

All copy stays data-driven (`config/strings.ts`, `data/policyCopy.ts`); duplicate-email / invalid-credential messages are already localized to friendly Arabic by `authContext.localizedAuthError()` — unchanged.

---

## Accessibility (WCAG AA) — items addressed

- **1.4.3 Contrast:** login/reset errors moved from gold `#A9670D` (3.91:1) to `.v2-error-panel` with `text-ink-900` (~15:1). Measured ratios in the working notes.
- **1.4.1 Use of color:** selected onboarding options now carry a check-badge (shape) in addition to color; goal cards already had a check.
- **2.5.5 Target size:** onboarding back button now 44×44; Segmented tiles given `min-h-[3rem]`.
- **4.1.3 Status messages:** errors → `role="alert"` `aria-live="assertive"`; notices/checking/success → `role="status"` `aria-live="polite"`.
- **2.4.7 Focus visible & 2.3.3 Reduced motion:** already handled globally in `styles/index.css` (unchanged) — verified, not duplicated.

---

## Verification

### Gates — all green
| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run lint -- --max-warnings 0` | ✅ pass |
| `npm run build` | ✅ pass (built in ~3.5s) |
| `npm run test:gate` | ✅ exit 0 — 274 proof files, 0 failures |
| `npm run test:e2e:onboarding` | ✅ 11/11 (incl. «320px has no horizontal overflow», «zero console errors», consent gating, forced-failure retry) |

### Browser journeys (real, Playwright + manual)
- Welcome → Login / Welcome → Signup ✅
- Weak password → strength meter + requirements reveal progressively ✅
- 12+ bypass blocked (submit stays disabled until consent) ✅ (also covered by `test:policy`)
- Onboarding per-step validation, forced failure → retry, reload → draft resume, back/forward ✅ (`test:e2e:onboarding`)
- Arabic + English ✅ · 320 / 768 / 1280 ✅ · reduced-motion (global) ✅
- **No horizontal overflow at 320px** on welcome/login/forgot/signup/reset ✅ (explicit `scrollWidth == innerWidth` assertion)
- **Zero console errors** in normal flow ✅

> Note: the `login-*-error` shots deliberately submit bad credentials to prove the accessible error panel; that produces an expected Supabase `400`/fetch console line. It is the only console output and is intentional — the normal-flow runs log nothing.

### Screenshots — before / after (42 each, ar+en, 320/768/1280)
`docs/proof/ux-entry/before/` · `docs/proof/ux-entry/after/`

Most-illustrative pairs:
- `login-ar-error__320` — gold low-contrast text → high-contrast error panel with icon + `role="alert"`.
- `signup-ar-empty__320` — password requirements always shown → hidden until interaction (calmer first paint; 12+ consent still visible).
- `onboarding-step1-training__320` / `onboarding-step2-equipment__320` — selected option now shows a check-badge (not color alone).

> The Welcome screen was **not** modified this pass; before/after are identical by design. (Early captures caught the branded intro splash from `main.tsx` at 1280 — a capture-timing artifact, since fixed by waiting the splash out.)
