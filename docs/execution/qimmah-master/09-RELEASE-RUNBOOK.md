# 09 — RELEASE RUNBOOK (كُتيّب الإصدار)

> **Canonical owner of one fact only: how this repository is built, gated and shipped.**
> Supersedes `docs/RELEASE-RUNBOOK.md` for V1, which still describes an
> `integration/waveN` branch model that no longer exists and an iOS-first path
> deferred by DEC-014. That file stays as the iOS reference for later.

---

## 1. Environment

| | value |
|---|---|
| Node | **22** (CI `.github/workflows/ci.yml`; local verified `v22.22.2`) |
| package manager | **npm**, `npm ci` only — never `npm install` |
| why `npm ci` | it installs deterministically from the lockfile **and deletes extras**. `npm install` leaves the previous branch's `node_modules` behind, so a gate can pass against a tree that matches no branch. This has happened here: a merge passed only because a stale `react-body-highlighter` survived — the very package that merge deleted. |
| **after every branch switch** | `npm ci` **before** any gate step |
| Playwright | Chromium preinstalled in agent containers; export `PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. **Never** run `playwright install`. |

---

## 2. The gate

```bash
npm ci
npm run typecheck        # tsc -b --noEmit
npm run lint             # eslint --max-warnings 0
npm run build            # tsc -b && vite build
npm run test:gate        # every deterministic proof, no browser (count: read it from package.json)
```

Browser steps live **outside** the local gate on purpose (a browser in every local gate
costs more than it returns). The binding price of that exemption is **§4.0: read CI
before every landing**:

```bash
npm run test:e2e:onboarding   # the step CI runs and the local gate does not
```

### Command → what it proves (the ones worth knowing by name)

| command | proves |
|---|---|
| `test:injury-safety` | 80 checks over 7920 generated plans — no forbidden movement survives, and none is replaced by an equivalent forbidden movement |
| `test:equipment-capability` | "gym" ≠ "machines only"; declared equipment beats declared place |
| `test:numeral-policy` | Arabic-Indic ↔ Latin round trip; the limit is checked at the **display call site**, not by symbol presence |
| `test:storage-honesty` | no success screen before a checked `WriteResult` |
| `test:food-meal-search` | one search authority; 10 counter-proofs |
| `test:access-gate` · `test:activation-ui` | the entitlement guard is the **first statement** in each of the 7 writers |
| `test:branch-preview-safety` | a preview build cannot hold production write authority (DEC-002) |
| `test:plan-recovery` | corrupt state recovers from trusted profile data, never a fabricated plan |
| `test:e2e:onboarding` | the real onboarding component in a real browser at 320 px, RTL |

---

## 3. CI

Two workflows. `ci.yml` runs on **every push and PR to every branch**;
`nightly.yml` runs the same gate on `main` at 02:00 UTC plus non-gating browser proofs.

**Read CI before every landing. Red freezes the landing even when the local gate is green.**

```bash
# from an agent container (no gh CLI here — use the GitHub MCP tools):
#   actions_list  method=list_workflow_runs  resource_id=ci.yml  branch=<branch>
#   actions_list  method=list_workflow_jobs  resource_id=<run id>
#   get_job_logs  job_id=<job id>  return_content=true
```

Every red must be recorded as: **workflow · job · step · first failing commit · classification**,
where classification is exactly one of `PRODUCT` · `TEST` · `INFRASTRUCTURE` · `EXTERNAL`.

> **The masking lesson:** a failing step stops the steps after it. Red can hide red.
> Do not declare a fire out until the **whole** run is green. The trunk once stayed red
> for six days and nineteen commits because every wave truthfully reported "gates green" —
> the failing test was outside their definition of "gate".
>
> **Do not hide infrastructure red either.** An artifact-upload failure caused by a GitHub
> storage quota once masked a genuine E2E failure for days. `QIM-V1-005` makes that
> particular step non-blocking so it can never mask again.

Current CI state is recorded in `07-STATE.md`, not here.

---

## 4. Deployment

| | |
|---|---|
| host | **Cloudflare Pages**, project `qimmah` (`wrangler.toml`) |
| production | auto-deploys from **`main`** |
| production URL | https://qimmah-8qp.pages.dev |
| preview | branch deploys on sub-domains, e.g. `https://claude-founder-qa-final-001.qimmah-8qp.pages.dev/` (المرشّح الحالي — المصدر الواحد `site/canonical-host.json`) |
| owner command | `wrangler pages deploy dist` (project + output dir read from `wrangler.toml`) |
| verify the deployed build | the footer / `view-source` → `qimmah-env` and `BUILD_LABEL` (commit hash) |

**Preview safety check — run it every time before handing a preview link to anyone:**
the page must report `founder_preview`, **not** `production`. If it says `production`,
stop: that build carries production write authority (DEC-002).

> **Cloudflare is not reachable from agent containers**: `api.cloudflare.com` → 403,
> `*.pages.dev` → 000, `wrangler whoami` → `fetch failed`, the MCP connector exposes
> **no Pages tools**, and R2 is not enabled on the account (error 10042).
> Read-only workaround that does work: `curl -s "https://r.jina.ai/https://qimmah-8qp.pages.dev/"`.
> **⇒ No agent can deploy or verify production. Deployment is founder-only in fact, not only by rule.**

---

## 5. Supabase

- **41 migrations** in `supabase/migrations/`, `20260713120001` … `20260827120004`.
  > ⚠️ صُحِّح في [RED-TEAM-FINAL]: كان السطر يقول «٢٤ … `20260816120004`» وهو **بائت
  > بسبعة عشر ملفًّا**، آخرها هجرة إنفاذ البوّابة التي يعتمد عليها البند أدناه.
- **13 are `APPLY_PENDING` against production** — DEC-103 / `FA-03`. Until applied, the
  admin dashboard is closed to the founder himself and entitlement/webhook tables are absent.
- Edge function: `supabase/functions/salla-webhook/` (+ `contract.mjs`), proven by
  `scripts/db/salla-webhook-proof.mjs` and attacked by `scripts/attack/webhook-spoof-attack.mjs`.
- **Production migrations are founder-only** (DEC-003). An agent may write a migration;
  an agent may never apply one.
- Email provider / outbox: `20260816120004_email_outbox.sql` — status in `08-UNKNOWNS.md`.

### ⛔ بوّابة إطلاق صلبة — `qimmah-gateway` قبل أي طفرة تجارية

> **أُضيف في [RED-TEAM-FINAL] بعد عطلٍ مُعاد إنتاجه.** هذا ليس تحسينًا: بدونه
> **لا تجربة تبدأ ولا كودٌ يُسترَدّ ولا شراءٌ يُطالَب به ولا بلاغ طعام يصل.**

هجرة `20260827120004` تجعل ختم `x-qimmah-gate` **سلطةً في القاعدة**: الطفرات
الأربع (`start_trial` · `redeem_access_code_v2` · `claim_pending_grants` ·
`submit_missing_food`) لا تُنفَّذ بلا ختم صالح، ولا يسكّه إلا الطرفية. والعميل
صار يمرّ بها (`src/lib/access/gatewayClient.ts`). فالثلاثة أدناه **شرطٌ لازم
معًا** — وغياب أيٍّ منها يعطّل التجارة بالكامل بينما يبقى باقي التطبيق يعمل،
فيبدو العطل «مشكلة حساب» لا مشكلة نشر:

| # | الشرط | من يملكه | كيف يُتحقَّق منه |
|---|-------|----------|------------------|
| ١ | الطرفية منشورة | المؤسس | `supabase functions deploy qimmah-gateway` (`verify_jwt=true`) |
| ٢ | `QIMMAH_GATE_SECRET` (٣٢ محرفًا+) مضبوط على الطرفية | المؤسس | لوحة Supabase → Edge Functions → Secrets |
| ٣ | `qimmah_gate_secret` في Vault **بنفس القيمة** | المؤسس | `select vault.create_secret('<نفس القيمة>', 'qimmah_gate_secret', '…')` |

- **الخطوات الثلاث بيد المؤسس** (DEC-003) — لا يطبّقها وكيل.
- **فشلٌ مغلق مقصود:** غياب السرّ ⇒ `private.gate_secret()` تعيد `null` ⇒ كل
  نداء مبوَّب يُرفض. لا مسار «تخطَّ التحقّق»، ولا تدهور صامت.
- **تحقّق ما بعد النشر (لا يُستنتَج):** بحسابٍ حقيقي على staging، ابدأ تجربة
  واسترِدّ كودًا. النجاح هو الدليل الوحيد؛ خضرة البوّابة المحلّية **لا تثبت**
  هذا البند لأن طقومها تسكّ الختم بنفسها.
- الحارس البنيوي: `test:attack-gateway-coupling` — يمنع عودة الطرفين إلى
  الاختلاف (نداءٌ عارٍ لدالّة مبوَّبة، أو فعلٌ مبوَّب بلا مستدعٍ).
- التفصيل الكامل: [`docs/security/GATEWAY-STAMP-ENFORCEMENT.md`](../../security/GATEWAY-STAMP-ENFORCEMENT.md).


---

## 6. RELEASE DONE — the three-level definition

**TASK DONE** — implementation · targeted test · counter-proof where a guard is involved ·
evidence (command + real output) · commit.

**MILESTONE DONE** — every task DoD in it · integration test · verified browser behaviour ·
no unresolved blocker inside the milestone.

**RELEASE DONE** — all of:
- [ ] the release candidate is one named branch + SHA
- [ ] `npm ci` clean from the lockfile
- [ ] full gate green (`typecheck` · `lint` · `build` · `test:gate` · `test:e2e:onboarding`)
- [ ] **CI green on that exact SHA**, whole run, not first-failure
- [ ] browser matrix: Chromium **and** WebKit (the audience is iOS-Safari-heavy; a WebKit-only
      storage bug has already shipped here once)
- [ ] security: no secrets in the repo, `rel="noopener noreferrer"` on every `target="_blank"`,
      preview build proven without production authority
- [ ] deployment readiness: `BUILD_LABEL` resolves to the candidate SHA
- [ ] founder action list issued **before** the last hour (`10-FOUNDER-ACTIONS.md`)
- [ ] rollback path named (below)
- [ ] known-blocker ledger published — no unnamed red

**"Code exists" is never DONE.**

---

## 7. Rollback

Production is `main` and Pages deploys from it, so rollback is a **revert commit on `main`**,
never a force-push (DEC-003, charter §1.1). Cloudflare Pages also keeps previous
deployments — the founder can promote an earlier one from the dashboard, which is the
fastest path and requires no git operation at all.

**Before any approved branch deletion: tag the branch head first**, so the deletion is
fully reversible (charter §1.1).
