// ============================================================================
// بيئة تشغيل حقيقية (Staging) — Postgres عنقودٌ كامل، لا محاكاة في العملية.
// ============================================================================
// **لماذا هذه إلى جانب `supabase-sandbox.mjs` ولا تحلّ محلّها؟**
// PGlite ممتازة وسريعة، لكنها **اتصال واحد**. وثلاث خصائص يطلبها هذا التكليف
// لا تُثبَت باتصال واحد إطلاقًا:
//   ① التزامن الحقيقي — استهلاك كودٍ من متصفّحين في آنٍ واحد.
//   ② أقفال الصفوف — `for update` و`skip locked` لا معنى لهما بلا منافس.
//   ③ عزل المعاملات — قراءةٌ تتنافس مع كتابة لم تُثبَّت بعد.
// فهذه الطبقة تفتح **عمليات psql مستقلّة**، كلٌّ اتصالٌ حقيقي، ويمكن تشغيلها
// متوازية فعلًا. والصندوق السريع يبقى لِما يكفيه اتصال واحد.
//
// ولا اعتمادية جديدة: `psql` موجود في الصورة، وكل حزمة سطح هجوم (قواعد الأمان).
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHmac, randomBytes } from 'node:crypto'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations')
const PSQL = process.env.QIMMAH_PSQL || 'psql'
const BASE = process.env.QIMMAH_PG_URL || 'postgresql://postgres@127.0.0.1:55432'

export const migrationFiles = () =>
  readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

// ── وعي البوّابة [20260827120004] ────────────────────────────────────────────
// بعد تبويب الطفرات الأربع في القاعدة، **لا تُنفَّذ بلا ختم `x-qimmah-gate`
// صالح**. فالطقم — بوصفه محاكيًا أمينًا للبوّابة — يسكّ الختم نفسه الذي تسكّه
// `qimmah-gateway`: نفس الصيغة `window.hmacHex(secret, 'action|uid|window')`،
// لكن **متزامنة** كي لا تكسر المستدعين المتزامنين. مُثبَتة مطابِقة بايتًا-ببايت
// لِـcontract.mjs hmacHex (scripts/attack/gateway-stamp-enforcement-attack.mjs).
export const GATE_ACTION_BY_RPC = {
  start_trial: 'start_trial',
  redeem_access_code_v2: 'redeem_access_code',
  claim_pending_grants: 'claim_pending_grants',
  submit_missing_food: 'submit_missing_food',
}
export function mintStampSync(secret, action, uid, nowMs = Date.now()) {
  const w = Math.floor(nowMs / 1000 / 120)
  const sig = createHmac('sha256', secret).update(`${action}|${uid}|${w}`).digest('hex')
  return `${w}.${sig}`
}
const quoteLit = (s) => `'${String(s).replace(/'/g, "''")}'`
function gateActionsIn(sql) {
  const hits = new Set()
  for (const [rpc, action] of Object.entries(GATE_ACTION_BY_RPC)) {
    if (new RegExp(`\\b${rpc}\\s*\\(`).test(sql)) hits.add(action)
  }
  return [...hits]
}
// يبني عبارة `perform set_config('request.headers', …)` للمقدّمة. `stamp`:
//   undefined → اكتشف الفعل المبوَّب واسكّ ختمًا صحيحًا (يتطلّب secret+uid).
//   false     → بلا ترويسة إطلاقًا (اختبار الالتفاف المباشر).
//   string    → يوضع حرفيًّا في x-qimmah-gate (مزوَّر/منتهٍ/مشوَّه محسوب مسبقًا).
function gateHeaderStmt(sql, { uid = null, secret = null, stamp } = {}) {
  if (stamp === false) return ''
  let value = null
  if (typeof stamp === 'string') value = stamp
  else if (secret && uid) {
    const actions = gateActionsIn(sql)
    if (actions.length === 1) value = mintStampSync(secret, actions[0], uid)
    else if (actions.length > 1) throw new Error(`gate: multiple gated actions in one statement: ${actions.join(',')}`)
  }
  if (value === null) return ''
  return `perform set_config('request.headers', ${quoteLit(JSON.stringify({ 'x-qimmah-gate': value }))}, false);`
}

/** هل العنقود حيّ؟ الرفض هنا **معلَن** لا صامت — الطقم يعلن التخطّي بسببه. */
export function clusterAvailable() {
  try {
    execFileSync(PSQL, [`${BASE}/postgres`, '-tAc', 'select 1'], { stdio: 'pipe', timeout: 8000 })
    return true
  } catch { return false }
}

function run(url, sql, opts = {}) {
  const { role = null, uid = null } = opts
  // الدور والهوية يُضبطان **داخل نفس الاتصال** — وإلا فالفحص يقيس المالك لا العميل.
  // ⚠️ المقدّمة تُنفَّذ في كتلة `do` **بلا مخرَج**. النسخة الأولى استعملت
  // `select set_config(...)`، فكان سطر المقدّمة يتقدّم نتيجة الاستعلام الحقيقي
  // ويُقرأ على أنه الجواب — فتُبلّغ الدالّة عن قيمةٍ ليست لها. عطلٌ في الأداة
  // كان سيُفسد كل تأكيد فوقها بصمت (§4.2).
  // وختم البوّابة يُضبط في نفس الكتلة قبل تبديل الدور (كما jwt.claim.sub).
  const gate = gateHeaderStmt(sql, { uid, secret: opts.secret, stamp: opts.stamp })
  const prelude = `do $$ begin perform set_config('request.jwt.claim.sub', ${uid === null ? "''" : `'${uid}'`}, false); ${gate} end $$;\n`
    + (role ? `set role ${role};` : 'reset role;')
  const file = join(mkdtempSync(join(tmpdir(), 'pgq-')), 'q.sql')
  writeFileSync(file, `${prelude}\n${sql}`)
  const out = execFileSync(PSQL, [url, '-tAqX', '-v', 'ON_ERROR_STOP=1', '-f', file],
    { stdio: 'pipe', timeout: 60_000 }).toString()
  return out.split('\n').filter((l) => l.trim() !== '' && !/^(SET|DO|RESET)$/.test(l))
}

/**
 * ينشئ قاعدة نظيفة، يهيّئها كمشروع Supabase، ويطبّق الهجرات.
 * @param {{ exclude?: string[] }} opts هجرات تُستثنى (لتصوير حالة ما قبل الإصلاح).
 */
export function createStaging(name = `qimmah_stg_${Date.now().toString(36)}`, { exclude = [] } = {}) {
  execFileSync(PSQL, [`${BASE}/postgres`, '-qX', '-c', `drop database if exists ${name}`], { stdio: 'pipe' })
  execFileSync(PSQL, [`${BASE}/postgres`, '-qX', '-c', `create database ${name}`], { stdio: 'pipe' })
  const url = `${BASE}/${name}`
  execFileSync(PSQL, [url, '-qX', '-v', 'ON_ERROR_STOP=1', '-f', join(ROOT, 'scripts/db/lib/supabase-shim.sql')], { stdio: 'pipe' })

  const applied = [], failed = []
  for (const f of migrationFiles()) {
    if (exclude.includes(f)) continue
    try {
      execFileSync(PSQL, [url, '-qX', '-v', 'ON_ERROR_STOP=1', '-f', join(MIGRATIONS_DIR, f)], { stdio: 'pipe' })
      applied.push(f)
    } catch (e) {
      failed.push({ file: f, message: String(e.stderr || e.message).split('\n').find((l) => /ERROR/.test(l)) || 'unknown' })
    }
  }

  // ── بديل Vault [20260827120004] ────────────────────────────────────────────
  // على Supabase الحقيقي السرّ يعيش في `vault.decrypted_secrets`؛ الطقم يزرع
  // بديلًا **بنفس الشكل** (name/decrypted_secret) وسرًّا يُولَّد وقت التشغيل —
  // فالسرّ لا يُكتب في مستودع، و`private.gate_secret()` يقرؤه بنفس المسار تمامًا.
  // (الربط المتأخّر في plpgsql يجعل إنشاءه بعد الهجرة صحيحًا.)
  const gateSecret = `stg-gate-secret-${randomBytes(24).toString('hex')}` // ≥32 محرفًا
  execFileSync(PSQL, [url, '-qX', '-v', 'ON_ERROR_STOP=1', '-c',
    `create schema if not exists vault;
     create table if not exists vault._secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text);
     create or replace view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault._secrets;
     insert into vault._secrets(name, secret) values ('qimmah_gate_secret', ${quoteLit(gateSecret)})
       on conflict (name) do update set secret = excluded.secret;`], { stdio: 'pipe' })

  const withSecret = (o = {}) => ({ secret: gateSecret, ...o })
  return {
    name, url, applied, failed, gateSecret,
    sql: (s, o) => run(url, s, withSecret(o)),
    one: (s, o) => (run(url, s, withSecret(o))[0] ?? null),
    /** ينفّذ عبارةً في **عملية منفصلة** — اتصال حقيقي يمكن أن يتسابق. */
    async race(statements, opts = []) {
      const procs = statements.map((s, i) => {
        const o = withSecret(opts[i] || {})
        const gate = gateHeaderStmt(s, { uid: o.uid, secret: o.secret, stamp: o.stamp })
        const prelude = `do $$ begin perform set_config('request.jwt.claim.sub', ${o.uid ? `'${o.uid}'` : "''"}, false); ${gate} end $$;\n`
          + (o.role ? `set role ${o.role};` : 'reset role;')
        const file = join(mkdtempSync(join(tmpdir(), 'pgr-')), 'q.sql')
        writeFileSync(file, `${prelude}\n${s}`)
        return new Promise((res) => {
          const p = spawn(PSQL, [url, '-tAqX', '-v', 'ON_ERROR_STOP=1', '-f', file], { stdio: ['ignore', 'pipe', 'pipe'] })
          let out = '', err = ''
          p.stdout.on('data', (d) => { out += d })
          p.stderr.on('data', (d) => { err += d })
          p.on('close', (code) => res({ code, out: out.trim(), err: err.trim() }))
        })
      })
      return Promise.all(procs)
    },
    drop() { try { execFileSync(PSQL, [`${BASE}/postgres`, '-qX', '-c', `drop database if exists ${name} with (force)`], { stdio: 'pipe' }) } catch { /* تنظيف أفضل-جهد */ } },
  }
}

/**
 * خطوات التشغيل التي **لا تعيش في الهجرات بقصد** — وتنفيذها هنا يجعل الطقم
 * نموذجًا أمينًا لتكليف الإنتاج بدل أن يقفز فوقه.
 *
 * الملح (`identity_pepper`) سرٌّ، والسرّ لا يوضع في مستودع (قواعد الأمان).
 * فالهجرة تنشئ الجدول وتترك القيمة، و`start_trial` تفشل **بصوتٍ مسمّى**
 * («no active version») حتى تُزرع. وهذا سلوكٌ صحيح لا عطل: بناءٌ بلا ملح
 * لا يستطيع تجزئة الهوية، فالأصحّ أن يتوقّف لا أن يخترع تجزئة ضعيفة.
 */
export function provision(stg, { founderEmail = null, pepperVersion = 1 } = {}) {
  const steps = []
  stg.sql(`insert into private.identity_pepper (version, pepper)
           values (${pepperVersion}, 'stg-pepper-v${pepperVersion}-' || encode(extensions.gen_random_bytes(16), 'hex'))
           on conflict (version) do nothing;`)
  steps.push(`identity_pepper v${pepperVersion}`)
  if (founderEmail) {
    stg.sql(`select public.admin_set_role('${founderEmail}', 'founder', 'staging commissioning');`,
      { role: 'service_role' })
    steps.push(`founder role -> ${founderEmail}`)
  }
  return steps
}

export function makeUser(stg, email, { confirmed = true } = {}) {
  return stg.one(
    `insert into auth.users (email, email_confirmed_at) values ('${email}', ${confirmed ? 'now()' : 'null'}) returning id;`
  )
}
