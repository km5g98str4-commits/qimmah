# Live-auth E2E

Credential-free journey tests run against local Vite preview. Live auth requires a disposable
Supabase project or local stack and must never target production.

## Preflight (offline — no Docker)

`npm run test:e2e:auth:preflight`

Pure logic checks (production guards, test-email guard, generators, recovery-link parser, script
sanity) plus an informational tool-availability report. Needs no Docker, no network.

## Local live auth (Supabase CLI stack)

`npm run test:e2e:auth`

The runner **self-manages the stack** — it runs `npx supabase start` internally
(`scripts/e2e-auth/run.mjs`), bringing up GoTrue auth on `127.0.0.1:54321` and Inbucket on
`127.0.0.1:54324` from `scripts/e2e-auth/supabase-config.toml`. The only prerequisite is a
**running Docker daemon** (the Supabase CLI uses Docker to pull and run the auth images); no manual
`docker compose` step is needed.

> Do **not** use `infra/docker/docker-compose.supabase.yml` for live auth. That compose defines only
> a Postgres service (port `54322`) — it has no GoTrue/Inbucket, so it cannot serve auth. It backs
> `npm run db:verify` (RLS verification), not this flow.

## Hosted disposable project

`E2E_SUPABASE_URL=https://PROJECT.supabase.co E2E_SUPABASE_ANON_KEY=PUBLIC_ANON npm run test:e2e:auth`

## Status

Offline preflight verified here: **19 PASS · 0 FAIL**. The full live-auth run was **not executed** in
this environment — no Docker daemon is installed (`docker` not found), so the Supabase CLI stack
cannot start. Live auth is an OWNER step; never fake green.
