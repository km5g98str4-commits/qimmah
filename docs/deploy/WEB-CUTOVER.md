# Qimmah — Web v2 Production Cutover (Cloudflare Pages)

Everything is **prepared, not deployed**. The owner runs one command when ready.
Base: `integration/wave5`. Surface touched: `public/_headers` (new), `wrangler.toml` (new),
`docs/deploy/**`. No `src`, `package.json`, `netlify.toml`, or `site/**` changes.

---

## 1. Service-worker / PWA cache audit — can a stale v1 shell hold v2 hostage?

**Short answer: No** — given the SW's design **plus** the new `public/_headers`. The one residual
risk (an HTTP layer pinning `/sw.js` or `/index.html`) is exactly what the headers close.

### The SW (`public/sw.js`, version injected at build by `vite.config.ts`)
- `VERSION = qimmah-<commit-hash>` — **every deploy is a new version** (this build: `qimmah-26818c4`).
- **install** → precache the shell (`/`, `/index.html`, `/manifest.webmanifest`, icons, and the
  content-hashed `/assets/*` of *this* build) then `skipWaiting()`.
- **activate** → delete **every** cache whose key doesn't start with the new `VERSION` (purges all
  v1 caches) then `clients.claim()`.
- **fetch** → navigations are **network-first** (fresh HTML online, cached shell only when offline);
  `/assets/*` is cache-first (safe — filenames are content-hashed); other same-origin is SWR.

### What happens to a returning **v1-PWA** user, step by step (first visit after the v2 deploy)
1. User opens the installed PWA / tab; the browser requests `/`.
2. The **old v1 SW is still active**, but its navigation handler is **network-first**, so it fetches
   `/` from the network → Cloudflare returns the **new v2 `index.html`** (kept fresh by the `no-cache`
   header) → **the user sees v2 immediately** (online). That HTML points at the new hashed
   `/assets/*` → fetched fresh.
3. In parallel the browser revalidates `/sw.js` (forced by `Cache-Control: no-cache`) → gets the new
   bytes (`qimmah-<newcommit>`) → installs the new SW.
4. New SW `install` (precache v2 shell) → `skipWaiting` → `activate` (**delete all old v1 caches**) →
   `clients.claim()`. The v2 SW now controls the page.
5. **Net:** online users flip to v2 on the very first navigation; the SW swap then makes v2 the
   offline shell too. No v1 hostage.

### Documented edge cases
- **Offline-only first open:** a user who opens the installed PWA with **no connection** gets the
  cached v1 shell (offline fallback) until they're online once; the next online navigation runs
  steps 2–4 and flips them to v2. Unavoidable (they had no network to receive v2) and self-healing.
- **First-cutover bootstrap:** the *currently-live v1* deploy may not send `no-cache` on `/sw.js`.
  Modern browsers bypass the HTTP cache on SW update checks and cap SW-script caching at 24h, and
  navigation is network-first regardless — so the HTML is fresh immediately and the new SW is picked
  up within ≤24h worst case. **After this deploy ships `_headers`, every later cutover is instant.**
- **iOS Safari standalone PWA:** same network-first behavior — the WKWebView "stale shell" trap is
  avoided precisely because navigation is network-first and the shell is versioned + purged.

### The fix these headers add (see §2)
`/sw.js`, `/`, `/index.html`, `/manifest.webmanifest` → `no-cache` (always revalidate → new deploy
picked up); `/assets/*` → `immutable` 1y (content-hashed → safe + fast).

---

## 2. Production `_headers` + `_redirects`

`public/_headers` (new) applies to every response on Cloudflare Pages:
- **CSP** fitted to the app's real needs and **verified locally with zero violations** (see §5):
  `script-src 'self'` (no inline JS — only an `application/ld+json` data block + the hashed module),
  `style-src 'self' 'unsafe-inline'` (React inline styles), `connect-src` self + `*.supabase.co`
  (+`wss:` realtime) + `world.openfoodfacts.org`, `img-src` self + `data:`/`blob:` +
  `raw.githubusercontent.com` (exercise images) + `*.openfoodfacts.org`, `worker-src 'self' blob:`,
  `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`.
- **Security headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` (camera=self for barcode; geo/mic/
  payment off), `Strict-Transport-Security` (2y, includeSubDomains).
- **Cache-Control:** the cutover safety net described in §1.

`public/_redirects` — **corrected in [QIM-WEB-HOTFIX-002] after a P0 production outage.**

It previously read `/*  /index.html  200` with the note "real files are served before the catch-all".
That note was true but **incomplete, and the gap was the outage**: real files are served first, yet
*missing* files still fall through to the catch-all. So a content-hashed chunk deleted by a newer
deployment returned **`HTTP 200` + the body of `index.html`** instead of `404`. Measured live:
`GET /assets/does-not-exist-12345.js` → `200` + HTML. The browser requests that URL as
`type="module"`, and `X-Content-Type-Options: nosniff` (§ above) forbids sniffing — so it fails with
a MIME error, surfacing to the user as the `RouteErrorBoundary` card «صار خلل بسيط» after a long
wait. The old service worker then cached that HTML under the JS URL, making the failure sticky.

The catch-all is therefore replaced by an **explicit allowlist** of the app's routes (mirroring
`ROUTES` in `src/lib/appRoutes.ts`), plus `public/404.html`. **Both are required:** without a
top-level `404.html`, Pages assumes a single-page app and serves `/` for every unmatched path —
re-creating the same bug (`pages/configuration/serving-pages`). Note also that Pages' `_redirects`
supports redirects (301/302/303/307/308) and 200-rewrites **only** — a `404` status is explicitly
unsupported (`pages/configuration/redirects`), which is why the fix is an allowlist rather than a
`/assets/* … 404` rule.

The app root `/` is unaffected: it resolves via directory-index to `index.html`, independently of
`_redirects`. Guarded by `npm run test:asset-integrity` (in `test:gate`) and the two-build
`npm run test:deploy-cutover` simulation.

> If an analytics endpoint (`VITE_ANALYTICS_ENDPOINT`) is ever configured for the web build, add its
> origin to `connect-src`. It is off by default, so CSP omits it today.

---

## 3. PWA manifest

`public/manifest.webmanifest` is already on-brand — no change needed, audited:
- `name`/`short_name`: **قِمّة**, `lang: ar`, `dir: rtl`, `display: standalone`.
- `theme_color`/`background_color`: **`#101216`** (the Momentum deep-night canvas, matching the
  `<meta name="theme-color">`).
- Icons: `icon-192/512.png` + maskable 192/512 present (canonical). If agent-1 lands refreshed
  canonical icons, they drop into `public/` under the **same filenames** — no manifest edit needed.

---

## 4. Deploy — the owner's one command

Prerequisites (owner, one-time): `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID`). Project name `qimmah` is read from `wrangler.toml`.

**Until v2 promotion merges (v2 is behind the flag):**
```bash
VITE_DESIGN_V2=true npm run build && npx wrangler pages deploy dist
```

**After promotion merges (commander removes the flag → v2 is the default):**
```bash
npm run build && npx wrangler pages deploy dist
```

That's it — `wrangler pages deploy dist` reads the project + output dir from `wrangler.toml`; the
`_headers`/`_redirects` ship inside `dist`.

> One-line wirings for the commander (do NOT let this agent edit `package.json`): optionally add
> `"deploy:web": "wrangler pages deploy dist"` and `"build:web:v2": "VITE_DESIGN_V2=true vite build"`.

---

## 5. Local proof (already run on this branch)
- `VITE_DESIGN_V2=true npm run build` → clean.
- Served `dist/` under the real `_headers` (CSP + security headers applied to every response),
  driven headless: **0 CSP violations, 0 console errors** on landing + app routes.
  Screenshots: `docs/deploy/screenshots/landing-under-csp.png`, `app-under-csp.png`.
- Full repo gate (typecheck, lint `--max-warnings 0`, build, all `test:*`) green.

---

## 6. Rollback plan
Cloudflare Pages keeps every deployment. To roll back:
- **Dashboard:** Pages → `qimmah` → Deployments → pick the previous good one → **Rollback**.
- **CLI:** `npx wrangler pages deployment list` → redeploy/promote the prior deployment.
- **Escape hatch:** `git checkout <pre-cutover-commit> && npm run build && npx wrangler pages deploy dist`.

Rollback is **instant and safe**: the older build's `/sw.js` carries its own `VERSION`, so on the
next navigation the old SW reinstalls and its `activate` purges the newer caches — the same
versioning that makes the forward cutover clean makes the rollback clean.

---

## 7. Post-deploy verification checklist (owner runs after deploying)
1. **Headers:** `curl -sI https://<prod-url>/` and `/sw.js` and an `/assets/<hashed>.js`:
   - CSP + `X-Content-Type-Options` + HSTS present on `/`.
   - `/sw.js` and `/index.html` → `cache-control: no-cache`.
   - `/assets/*` → `cache-control: public, max-age=31536000, immutable`.
2. **Console/CSP:** open prod in a fresh browser → DevTools Console shows **0 CSP violations, 0
   errors**. Application → Service Workers: `qimmah-<newcommit>` is **activated**.
3. **Stale-SW check on a previously-installed PWA** (the key WKWebView-lesson test): on a device that
   had v1 installed, open the PWA **online once** → confirm v2 renders; Application → Cache Storage
   shows **only** `qimmah-<newcommit>-*` caches (old ones gone). Then toggle **offline** + reload →
   the v2 shell still loads.
4. **Journeys:** landing → login/start → a couple of tabs render; barcode opens the camera prompt
   (Permissions-Policy `camera=self`); no console errors.
5. **Installability:** Lighthouse PWA/installable check passes (optional).

If any check fails → §6 rollback, then diagnose.
