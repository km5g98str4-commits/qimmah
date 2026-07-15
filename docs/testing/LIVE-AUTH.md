# Live-auth E2E

Credential-free journey tests run against local Vite preview. Live auth requires a disposable
Supabase project or local stack and must never target production.

Local command: `docker compose -f infra/docker/docker-compose.supabase.yml up -d && npm run
test:e2e:auth:preflight && npm run test:e2e:auth`.

Hosted disposable command: `E2E_SUPABASE_URL=https://PROJECT.supabase.co
E2E_SUPABASE_ANON_KEY=PUBLIC_ANON npm run test:e2e:auth`.

No disposable credentials were available during the sweep; live auth is OWNER, never fake green.
