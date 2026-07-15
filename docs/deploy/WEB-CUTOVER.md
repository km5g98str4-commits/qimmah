# Cloudflare Pages web cutover (prepare only)

Cloudflare project: `qimmah`. Production deploys automatically from `main`; this document does
not authorize a deploy. Preview branches use `https://<branch>.qimmah-8qp.pages.dev`.

## Returning-user story

`vite.config.ts` replaces `__SW_VERSION__` with the deploy commit and injects the hashed boot
assets into `sw.js`. Install uses `skipWaiting`; activate deletes every cache not prefixed by the
new version and claims clients. Navigation is network-first, so an online return receives v2
HTML; offline return receives the last fully installed shell. `sw.js`, `index.html`, and the
manifest are explicitly non-cacheable at Cloudflare; hashed `/assets/*` are immutable.

## Verify locally

```bash
npm ci && npm run build
rg 'qimmah-[0-9a-f]{7}' dist/sw.js
npx vite preview --host 127.0.0.1 --port 4173
curl -I http://127.0.0.1:4173/sw.js
```

Browser stale-SW check: install build A, load once offline, build commit B, reload online, confirm
old cache names disappear in DevTools → Application → Cache Storage, then reload offline.

## Deploy and rollback (owner)

One-command manual fallback: `npx wrangler pages deploy dist --project-name qimmah --branch <branch>`.
Normal production remains the `main` Git integration. Roll back in Cloudflare Pages → Deployments
→ select the prior known-good commit → Rollback; verify footer/console `BUILD_LABEL` matches it.

`public/_headers` allows only self, Supabase realtime/API, and Open Food Facts API/images. Test a
preview with the browser console at zero CSP violations before production promotion.
