/**
 * حارس ترقيم الهجرات — نسخة واحدة لكل رقم.
 *
 * سبب وجوده واقعة لا فرضية: ثلاث هجرات حملت `20260816120001` معًا
 * (`commerce_integrity_fixes` · `email_outbox` · `founder_role_provisioning`).
 * و`schema_migrations` يفهرس على **الرقم**، فالتصادم يجعل الترتيب غير معرَّف —
 * وقد يُسقط إحداها صامتة عند أول `db push`.
 *
 * ويفحص كذلك **قيد الاعتماد**: `founder_dashboard_reads` ينادي `require_founder`
 * التي يعرّفها `founder_role_provisioning`، فترتيبهما ليس تجميلًا.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'supabase/migrations')
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
let passed = 0
const check = (label, cond) => { assert.ok(cond, label); passed += 1; console.log(`  ✓ ${label}`) }

const versionsOf = (list) => list.map((f) => f.split('_')[0])
const dupesIn = (list) => {
  const seen = new Map()
  for (const v of versionsOf(list)) seen.set(v, (seen.get(v) ?? 0) + 1)
  return [...seen.entries()].filter(([, n]) => n > 1).map(([v, n]) => `${v}×${n}`)
}

console.log('\n① لكل هجرة رقم فريد')
check(`عدد الهجرات ${files.length} ولا رقم مكرَّر`, dupesIn(files).length === 0)
check('كل اسم يبدأ بطابع ١٤ رقمًا ثم `_`', files.every((f) => /^\d{14}_/.test(f)))

console.log('\n② قيد الاعتماد: تعريف الدور قبل قراءات اللوحة')
const roleFile = files.find((f) => f.includes('founder_role_provisioning'))
const readFile = files.find((f) => f.includes('founder_dashboard_reads'))
check('الملفّان موجودان', Boolean(roleFile && readFile))
check(`${roleFile.split('_')[0]} < ${readFile.split('_')[0]}`, roleFile.split('_')[0] < readFile.split('_')[0])
const readsBody = readFileSync(resolve(DIR, readFile), 'utf8')
check('قراءات اللوحة تستدعي فعلًا `require_founder`/`is_founder` (وإلا فالقيد وهمي)',
  /require_founder|is_founder/.test(readsBody))

console.log('\n③ محاكاة الالتفاف — تفشل بفحص مسمّى')
assert.throws(
  () => {
    const collided = [...files, `${files[0].split('_')[0]}_fake_duplicate.sql`]
    assert.ok(dupesIn(collided).length === 0, 'migration-version-collision: رقمان متطابقان مرّا')
  },
  /migration-version-collision/,
  'محاكاة: رقم مكرَّر يجب أن يسقط بفحص مسمّى',
)
check('إدراج رقم مكرَّر يسقط بفحص مسمّى', true)
assert.throws(
  () => {
    const swapped = ['20260816120009_founder_role_provisioning.sql', '20260816120003_founder_dashboard_reads.sql']
    assert.ok(swapped[0].split('_')[0] < swapped[1].split('_')[0], 'migration-order-broken: القراءات قبل تعريف الدور')
  },
  /migration-order-broken/,
  'محاكاة: عكس الترتيب يجب أن يسقط بفحص مسمّى',
)
check('عكس ترتيب الدور/القراءات يسقط بفحص مسمّى', true)

console.log(`\n✅ ترقيم الهجرات: ${passed}/${passed} فحصًا`)
