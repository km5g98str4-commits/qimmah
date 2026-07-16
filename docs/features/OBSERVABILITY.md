# Observability — privacy-first production errors

Qimmah initializes `@sentry/react` only when `VITE_SENTRY_DSN` is non-empty. Without that
variable, `initMonitoring()` returns before the SDK import: no Sentry initialization, request,
queue, cookie, or storage write occurs. Product analytics remains a separate consent-gated layer.

## What leaves the device

- Exception type and stack, build release (`1.0.0+<commit>`), environment, and a fixed error-source tag.
- A SHA-256 hash of the random analytics anonymous ID when Web Crypto is available; never an account ID.
- Navigation breadcrumbs only, with query strings and fragments removed.

`beforeSend` removes email patterns, account/owner/user identifiers, request bodies, headers,
cookies, query strings, tokens, secrets, and any local/session-storage payload. `sendDefaultPii`
is disabled. All other breadcrumb categories are denied.

## OWNER — 10-minute Sentry setup

1. Create a browser React project in the owner-controlled Sentry organization.
2. In Cloudflare Pages → `qimmah` → Settings → Variables, add `VITE_SENTRY_DSN` for Production
   (and Preview only if preview reporting is wanted). Treat it as public client configuration.
3. Redeploy and confirm one deliberate test error arrives with release `1.0.0+<commit>`.
4. Confirm the event has no email, account ID, request body/header, or storage value.
5. Set alert routing and retention in Sentry; record the owner and review cadence.

Source maps remain disabled in `vite.config.ts`. To upload them later, OWNER must create a
Sentry auth token in CI, generate hidden production source maps, upload them for the exact
`1.0.0+<commit>` release, and delete maps from `dist` before deployment. This run does not create
or use a token and does not upload source maps.

## Proof

Run `npm run test:observability`. It directly proves the SDK loader is not called without a DSN,
renders the Arabic fallback, and plants then verifies removal of PII and storage payloads.
