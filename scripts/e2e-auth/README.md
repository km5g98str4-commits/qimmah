# Auth E2E Harness — Reset Password + Delete Account (local Supabase)

Full end-to-end tests for the two auth flows, run against a **local** Supabase stack
(Postgres + GoTrue + Inbucket) — never production. Built to run the moment access is
available; today the full run is **blocked** only by Docker image pulls (see below).

## One command

```bash
npm run test:e2e:auth            # full live run (needs Docker + Supabase images)
npm run test:e2e:auth:preflight  # offline checks — runs now, no Docker/network
npm run test:e2e:auth:preload    # pre-pull Supabase images (only if the ECR CDN is blocked)
```

### Blocked image CDN (this sandbox)

Some networks block the Docker/ECR image-layer CDNs (403) while allowing Google's
official Docker Hub mirror. If `docker pull public.ecr.aws/supabase/...` fails on the
blob layer, configure the daemon to mirror Docker Hub and preload:

```bash
echo '{ "registry-mirrors": ["https://mirror.gcr.io"] }' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker   # or restart dockerd
npm run test:e2e:auth:preload   # pulls identical images via the mirror, retags to the ECR names
npm run test:e2e:auth
```

`preload-images.mjs` pins each image:tag and sources it from Docker Hub (`supabase/*`) or
the official upstream (`kong`, `postgrest/postgrest`, `darthsim/imgproxy`, `timberio/vector`,
`axllent/mailpit`) — same content, digests verified — then retags to `public.ecr.aws/supabase/*`
so the CLI finds them locally. Only postgrest+imgproxy's dependents (storage/studio) and
edge-runtime (an rlimit issue under nested containers) are excluded from `supabase start`.

## What the full run does

1. `supabase start` — local Postgres + GoTrue + **Inbucket** (email catcher), using
   `scripts/e2e-auth/supabase-config.toml` (test-only, auto-confirm signups).
2. Applies the real `SUPABASE-SCHEMA.sql` (5 tables + RLS + `delete_own_account`) to the local DB.
3. Builds the app pointed at the local stack (`VITE_SUPABASE_URL`/`ANON_KEY`) and serves it.
4. **Reset Password:** register a test account → request reset → read the recovery link
   from Inbucket → open it (real GoTrue verify → `#/reset` → code exchange) → set a new
   password → confirm the new password logs in and the old one fails.
5. **Delete Account:** register + log in → create related rows → delete via the app's
   Settings UI (cancel first, then typed confirmation) → verify **directly in the DB**
   that the `auth.users` row is gone and all 5 tables are empty (cascade) → confirm login fails.
6. **Cleanup always** (even on failure): deletes every `@qimmah-e2e.test` user, `supabase stop`,
   removes the temp workdir.

## Production safety guards (`lib.mjs`)

- **Local-only:** `assertLocalTarget` throws unless the URL is `127.0.0.1`/`localhost`;
  it rejects any `supabase.co` URL and any key whose JWT `ref` is the production project
  (`ledlypcyrtnzvjvhykwz`).
- **Test emails only:** all accounts use the non-routable `@qimmah-e2e.test` domain;
  cleanup deletes **only** that domain.
- **No production env:** the app is built with the *local* URL/key read from
  `supabase status`; production env vars are never used.
- **No `service_role`:** auth-user deletion is verified via direct `psql` on the local DB,
  not a privileged API key.
- **No `supabase link`:** the stack is purely local; nothing touches the production project.

## Prerequisites for the full run

- Docker daemon running **and** Supabase images pullable (the image-layer CDN —
  `production.cloudflare.docker.com` / `production.cloudfront.docker.com` — must be reachable).
- `psql` client (present).
- `supabase` CLI (auto-installed via `npx` on first run).

If Docker/images are unavailable the runner prints a clear **BLOCKED** message with the
exact missing access and exits without logging any PASS — it never fakes a result.

## Not a mock

This harness uses a **real** GoTrue + Postgres + Inbucket. It is not a mock. The only
difference from production is the (local, ephemeral) project — the auth behavior,
recovery-link shape, code exchange, `updateUser`, and `delete_own_account` are the real
Supabase implementations.
