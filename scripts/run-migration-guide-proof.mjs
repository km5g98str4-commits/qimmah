#!/usr/bin/env node
/**
 * إثبات: دليل تطبيق الهجرات يطابق ما في `supabase/migrations/` — ملفًا بملف وترتيبًا.
 *
 * ═══ الفجوة التي يغلقها ═══
 * تطبيق الهجرات فعلٌ **بيد المؤسس وحده** (لا مفتاح خدمة في التطبيق)، فالوثيقة
 * هي واجهة ذلك الفعل الوحيدة. وكانت تسرد **١٢** ملفًا والمستودع يشحن **٢٤**:
 * الاثنا عشر الغائبة هي الاستحقاقات والتجارة وويبهوك سلة و**دور المؤسس**
 * و**قراءات اللوحة** وصندوق البريد. فمن يتبع «الخيار ب» حرفيًّا يطبّق نصف
 * المخطّط، ثم يجد اللوحة التنفيذية مغلقة عليه — والسبب وثيقةٌ شاخت لا عطل كود.
 *
 * الوثيقة هنا **جزء من المنتج**: السهم `مستند ← فعل المؤسس ← خلفية ← لوحة`
 * كان مقطوعًا عند أوّل حلقة. فيُحرَس كما يُحرَس الكود.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GUIDE = 'scripts/db/apply-guide.md'
const DIR = 'supabase/migrations'

let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

const onDisk = readdirSync(resolve(root, DIR)).filter((f) => f.endsWith('.sql')).sort()
const guide = readFileSync(resolve(root, GUIDE), 'utf8')
const listed = [...guide.matchAll(/^\d+\. `([^`]+\.sql)`/gm)].map((m) => m[1])

console.log('\nإثبات دليل تطبيق الهجرات — الوثيقة واجهة فعلٍ لا نصّ زينة\n')

console.log('① التطابق — ملفًا بملف وترتيبًا')
check(`الدليل يسرد كل هجرة على القرص (${onDisk.length} ملفًا)`, listed.length === onDisk.length,
  `القرص ${onDisk.length} · الدليل ${listed.length}`)
const missing = onDisk.filter((f) => !listed.includes(f))
check('لا هجرة على القرص غائبة عن الدليل', missing.length === 0, missing.join(' · '))
const ghost = listed.filter((f) => !onDisk.includes(f))
check('ولا اسم في الدليل بلا ملف', ghost.length === 0, ghost.join(' · '))
check('والترتيب هو ترتيب الأسماء بالضبط', JSON.stringify(listed) === JSON.stringify(onDisk))

console.log('\n② الملفّان اللذان يفتحان اللوحة مذكوران بالاسم')
for (const f of ['20260816120002_founder_role_provisioning.sql', '20260816120003_founder_dashboard_reads.sql']) {
  check(`«${f}» في الدليل`, listed.includes(f))
}

console.log('\n③ التأكيد المضادّ — الحارس يكشف الانحراف باسمه')
const dropOne = listed.filter((f) => f !== listed[listed.length - 1])
check('⚔️ حذف هجرة من الدليل كان سيُكتشف', dropOne.length !== onDisk.length)
const reordered = [listed[1], listed[0], ...listed.slice(2)]
check('⚔️ وتبديل ترتيب ملفين كان سيُكتشف',
  JSON.stringify(reordered) !== JSON.stringify(onDisk),
  'الترتيب يهمّ: الدليل نفسه يقول إن إعادة التشغيل تعتمد عليه')
check('⚔️ واسمٌ لملف غير موجود كان سيُكتشف',
  ![...listed, 'ghost_migration.sql'].every((f) => onDisk.includes(f)))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
