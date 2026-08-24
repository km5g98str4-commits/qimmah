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

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations')
const PSQL = process.env.QIMMAH_PSQL || 'psql'
const BASE = process.env.QIMMAH_PG_URL || 'postgresql://postgres@127.0.0.1:55432'

export const migrationFiles = () =>
  readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

/** هل العنقود حيّ؟ الرفض هنا **معلَن** لا صامت — الطقم يعلن التخطّي بسببه. */
export function clusterAvailable() {
  try {
    execFileSync(PSQL, [`${BASE}/postgres`, '-tAc', 'select 1'], { stdio: 'pipe', timeout: 8000 })
    return true
  } catch { return false }
}

function run(url, sql, { role = null, uid = null } = {}) {
  // الدور والهوية يُضبطان **داخل نفس الاتصال** — وإلا فالفحص يقيس المالك لا العميل.
  // ⚠️ المقدّمة تُنفَّذ في كتلة `do` **بلا مخرَج**. النسخة الأولى استعملت
  // `select set_config(...)`، فكان سطر المقدّمة يتقدّم نتيجة الاستعلام الحقيقي
  // ويُقرأ على أنه الجواب — فتُبلّغ الدالّة عن قيمةٍ ليست لها. عطلٌ في الأداة
  // كان سيُفسد كل تأكيد فوقها بصمت (§4.2).
  const prelude = `do $$ begin perform set_config('request.jwt.claim.sub', ${uid === null ? "''" : `'${uid}'`}, false); end $$;\n`
    + (role ? `set role ${role};` : 'reset role;')
  const file = join(mkdtempSync(join(tmpdir(), 'pgq-')), 'q.sql')
  writeFileSync(file, `${prelude}\n${sql}`)
  const out = execFileSync(PSQL, [url, '-tAqX', '-v', 'ON_ERROR_STOP=1', '-f', file],
    { stdio: 'pipe', timeout: 60_000 }).toString()
  return out.split('\n').filter((l) => l.trim() !== '' && !/^(SET|DO|RESET)$/.test(l))
}

/** ينشئ قاعدة نظيفة، يهيّئها كمشروع Supabase، ويطبّق كل الهجرات. */
export function createStaging(name = `qimmah_stg_${Date.now().toString(36)}`) {
  execFileSync(PSQL, [`${BASE}/postgres`, '-qX', '-c', `drop database if exists ${name}`], { stdio: 'pipe' })
  execFileSync(PSQL, [`${BASE}/postgres`, '-qX', '-c', `create database ${name}`], { stdio: 'pipe' })
  const url = `${BASE}/${name}`
  execFileSync(PSQL, [url, '-qX', '-v', 'ON_ERROR_STOP=1', '-f', join(ROOT, 'scripts/db/lib/supabase-shim.sql')], { stdio: 'pipe' })

  const applied = [], failed = []
  for (const f of migrationFiles()) {
    try {
      execFileSync(PSQL, [url, '-qX', '-v', 'ON_ERROR_STOP=1', '-f', join(MIGRATIONS_DIR, f)], { stdio: 'pipe' })
      applied.push(f)
    } catch (e) {
      failed.push({ file: f, message: String(e.stderr || e.message).split('\n').find((l) => /ERROR/.test(l)) || 'unknown' })
    }
  }
  return {
    name, url, applied, failed,
    sql: (s, o) => run(url, s, o),
    one: (s, o) => (run(url, s, o)[0] ?? null),
    /** ينفّذ عبارةً في **عملية منفصلة** — اتصال حقيقي يمكن أن يتسابق. */
    async race(statements, opts = []) {
      const procs = statements.map((s, i) => {
        const o = opts[i] || {}
        const prelude = `do $$ begin perform set_config('request.jwt.claim.sub', ${o.uid ? `'${o.uid}'` : "''"}, false); end $$;\n`
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
