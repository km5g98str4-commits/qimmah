// ============================================================================
// test:admin-chunk — حزمة اللوحة **كسولة**، وزائرٌ عامّ لا ينزّل أدوات المؤسس.
// [ADMIN-R4] · حارة لوحة المؤسس.
// ============================================================================
// اللوحة الآن تحمل إدارة أكواد وسحب وصول وصفحة حساب. وكلّها كودٌ **لا يحتاجه
// أحد غير المؤسس**. فإن دخل في حزمة الإقلاع صار كل زائر ينزّله — كلفةً بلا
// مقابل، وسطحَ قراءة لمن يفتّش الحزمة.
//
// الفحص على **مخرَج البناء الحقيقي** لا على سطر الاستيراد في المصدر: `lazy()`
// في الكود لا يعني قطعًا في المخرَج (إعادة تصدير من باب مشترك تكفي لسحب
// الوحدة إلى حزمة الإقلاع بلا أن يتغيّر سطر واحد في `App.tsx`).
//
// التشغيل: npm run test:admin-chunk   ·   يحتاج `npm run build` قبله.
// ============================================================================
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const assets = join(dist, 'assets')

let pass = 0
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  if (ok) pass += 1
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return ok
}

console.log('\nإثبات كسل حزمة اللوحة')

if (!existsSync(assets)) {
  console.error('FAIL: dist/assets غير موجودة — شغّل npm run build أولًا')
  process.exit(1)
}

const files = readdirSync(assets).filter((f) => f.endsWith('.js'))
const html = readFileSync(join(dist, 'index.html'), 'utf8')

// ── ① الحزمة موجودة **مفصولة** ──
// العلامة بنيوية (`data-admin-shell`) لا نصّية: نصّ عربي قد يظهر في حزمة أخرى.
const adminChunks = files.filter((f) => readFileSync(join(assets, f), 'utf8').includes('data-admin-shell'))
check(`حزمة اللوحة مفصولة في ملفّ واحد (${adminChunks.join(', ') || 'لا شيء'})`, adminChunks.length === 1)
const adminFile = adminChunks[0]
const adminRaw = readFileSync(join(assets, adminFile), 'utf8')
const bytes = statSync(join(assets, adminFile)).size
const gz = gzipSync(Buffer.from(adminRaw)).length
console.log(`     الحجم: ${bytes} بايت · ${gz} مضغوطة`)
// سقف معلَن: أضعاف الحجم الحالي، فلا يمرّ انفجار صامت ولا يسقط الفحص على نموّ طبيعي.
check(`حجم حزمة اللوحة دون السقف المعلَن (${gz} ≤ 60000 مضغوطة)`, gz <= 60_000, `${gz}`)

// ── ② نقطة الدخول تستوردها **ديناميكيًا** لا ساكنًا ──
const entryMatch = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)
check('نقطة الدخول محدَّدة من index.html', Boolean(entryMatch), entryMatch?.[1] ?? '')
const entry = readFileSync(join(assets, entryMatch[1]), 'utf8')
// الاستيراد الديناميكي يظهر `import("./<chunk>")`؛ والساكن يظهر `from"./<chunk>"`.
check('نقطة الدخول تستورد اللوحة استيرادًا ديناميكيًا', entry.includes(`import("./${adminFile}")`))
check(
  'ولا استيراد ساكن للحزمة في نقطة الدخول',
  !new RegExp(`from\\s*["']\\./${adminFile.replace(/\./g, '\\.')}["']`).test(entry),
)

// ── ③ لا تحميل مُسبَق في الصفحة ──
// `modulepreload` ينزّل الملفّ عند الإقلاع ولو لم يُنفَّذ — كسلٌ اسمًا لا فعلًا.
check('اللوحة ليست ضمن modulepreload في index.html', !html.includes(adminFile))

// ── ④ لا أثر للوحة في حزمة الإقلاع نفسها ──
const TRACES = ['data-admin-shell', 'data-posture', 'data-codes-panel', 'founder_executive_snapshot', 'founder_issue_access_code']
const leaked = TRACES.filter((t) => entry.includes(t))
check(`لا أثر للوحة في حزمة الإقلاع (${TRACES.length} علامات)`, leaked.length === 0, leaked.join(' '))

// ── ⑤ ولا سرّ في الحزمة المشحونة ──
const SECRETS = ['service_role', 'SUPABASE_SERVICE_ROLE_KEY', 'supabaseAdmin']
const secretsInAdmin = SECRETS.filter((s) => adminRaw.includes(s))
check(`لا اسم مميّز في حزمة اللوحة (${SECRETS.length} أنماط)`, secretsInAdmin.length === 0, secretsInAdmin.join(' '))

/*
  ═══ استثناء معلَن ومحروس (الميثاق §4.2) ═══
  أسماء الدوال الإدارية (`admin_set_role` وأخواتها) **تظهر في الحزمة عمدًا**:
  شاشة المنع تسمّي `admin_set_role` للمؤسس كي يعرف كيف يُزوَّد الدور، وهذا صدقٌ
  لا تسريب — الاسم لا يمنح شيئًا، والمنع في القاعدة بـ`REVOKE` لا بالإخفاء.

  فالشرط الصحيح ليس **غياب الاسم** بل **غياب النداء**: لا يجوز أن يمرّ اسمٌ
  إداريّ إلى `client.rpc(...)` من أي مسار عميل. والاستثناء يُحرَس بمحاكاة
  أدناه تسقط بفحص مسمّى، فلا يصير الاستثناء قاعدةً صامتة.
*/
const PRIVILEGED_RPCS = ['admin_grant_premium', 'admin_unrevoke', 'admin_set_role', 'admin_revoke', 'admin_create_access_code']
const rpcCallOf = (text) => PRIVILEGED_RPCS.filter((n) => new RegExp(`rpc\\(\\s*["'\`]${n}["'\`]`).test(text))
check(`لا نداء RPC إداريّ من الحزمة (${PRIVILEGED_RPCS.length} أسماء)`, rpcCallOf(adminRaw).length === 0, rpcCallOf(adminRaw).join(' '))
check('ولا من حزمة الإقلاع', rpcCallOf(entry).length === 0, rpcCallOf(entry).join(' '))
// حارس الاستثناء: نداءٌ مزروع يُكشف باسمه — وإلا كان الفحص أعلاه يمرّ مجّانًا.
check('محاكاة: نداء RPC إداريّ مزروع يُكشف', rpcCallOf(`${adminRaw}\nx.rpc("admin_grant_premium",{})`).includes('admin_grant_premium'))

// ولا مولّد أكواد في العميل: التوليد فعل خادم، وعشوائية المتصفّح ليست الحكم.
check('لا مولّد أكواد في حزمة العميل', !adminRaw.includes('generate_access_code'))
// وأسماء دوال المؤسس **متوقَّعة** في الحزمة — نداءات RPC مسمّاة، لا أسرارًا.
check('أسماء دوال المؤسس حاضرة كنداءات معلَنة', adminRaw.includes('founder_executive_snapshot'))

// ── ⑥ التأكيد المضادّ — أثرٌ مزروع في حزمة الإقلاع يُكشف باسمه ──
// (§4.2: كل شدّ بوابة يُرفَق بمحاكاة التفافٍ تفشل بفحص مسمّى.)
const infectedEntry = `${entry}\n/* injected */ "data-admin-shell";`
const caught = TRACES.filter((t) => infectedEntry.includes(t))
check('محاكاة: أثر لوحة في حزمة الإقلاع يُكشف', caught.includes('data-admin-shell'))
// ومحاكاة ثانية: حزمة إقلاع تحمل اسمًا مميّزًا.
const infectedAdmin = `${adminRaw}\nconst k="service_role";`
check('محاكاة: اسم مميّز في الحزمة يُكشف', SECRETS.some((s) => infectedAdmin.includes(s)))

const failedCount = results.filter((r) => !r.ok).length
console.log(`\n${failedCount === 0 ? '✅' : '❌'} ${pass}/${results.length} فحصًا — كسل حزمة اللوحة (${adminFile}: ${bytes} بايت · ${gz} مضغوطة)\n`)
if (failedCount > 0) {
  for (const r of results.filter((x) => !x.ok)) console.error(`   ✗ ${r.name}`)
  console.error(`FAIL: ${failedCount} فحصًا سقط في إثبات كسل الحزمة`)
  process.exit(1)
}
