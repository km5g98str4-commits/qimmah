#!/usr/bin/env node
/**
 * حارس نصّ Premium — العقد المقفل يُفرَض لا يُنوى.
 *
 * ═══ لماذا وُجد ═══
 * `docs/product/ACCESS-ENTITLEMENT-ARCHITECTURE.md:210` يقول حرفيًّا إن هذا
 * الحارس قائم و«مفروض لا منويّ». **ولم يكن موجودًا.** ادّعاءُ إنفاذٍ غير منفَّذ
 * أسوأ من الاعتراف بغيابه: من يقرأ الوثيقة يظنّ السطح محروسًا فلا يفحصه.
 * وقاعدة الكتابة (`.claude/rules/copywriting.md`) كانت أصدق — تسمّيه «مخطَّطًا».
 *
 * ═══ العقد المفروض هنا ═══
 * قِمّة Premium: **شراء واحد · بلا انتهاء · بلا اشتراك شهري أو سنوي**، ولا
 * يُسوَّق بـ«مدى الحياة». الصيغة المعتمدة وحدها: «يشمل تحديثات قِمّة — بلا
 * اشتراك شهري».
 *
 * ═══ ولماذا الفحص على النصّ المعروض لا على الملفّ ═══
 * كل ورود لـ«lifetime» في المستودع اليوم إمّا تعليق يذكر المنع أو مصفوفة حظر
 * داخل حارس. فحصُ الملفّ كلّه كان سيحمرّ على تعليقٍ يمنع ما يمنعه الحارس نفسه.
 * فالمقيس هنا **قيم السلاسل النصّية** وحدها — ما يصل المستخدم.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

/** أسطح يراها المستخدم — لا وثائق ولا سكربتات ولا تعليقات. */
const SCAN_DIRS = ['src/i18n/dict', 'src/config', 'src/data', 'src/views', 'src/components', 'src/admin', 'site']
const EXT = /\.(ts|tsx|html)$/

const walk = (dir, acc = []) => {
  let entries = []
  try { entries = readdirSync(resolve(ROOT, dir)) } catch { return acc }
  for (const e of entries) {
    const rel = `${dir}/${e}`
    if (statSync(resolve(ROOT, rel)).isDirectory()) walk(rel, acc)
    else if (EXT.test(e)) acc.push(rel)
  }
  return acc
}

/** يزيل التعليقات ثم يستخرج قيم السلاسل النصّية وحدها. */
function userFacingStrings(source, isHtml) {
  if (isHtml) {
    return source.replace(/<!--[\s\S]*?-->/g, '')
  }
  const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const noLine = noBlock.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
  const out = []
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
  let m
  while ((m = re.exec(noLine)) !== null) out.push(m[1] ?? m[2] ?? m[3] ?? '')
  return out.join('\n')
}

const BANNED = [
  { re: /مدى الحياة/, why: 'التزام مفتوح يقيّدنا قانونيًا وتسويقيًا' },
  { re: /\blifetime\b/i, why: 'نفس السبب، وبأي حالة أحرف' },
  { re: /للأبد/, why: 'مرادف «مدى الحياة»' },
  { re: /كل التحديثات الحالية/, why: 'وعدٌ يُقتبس ضدّنا إن ضاق نطاق Premium' },
  { re: /مشترك(?:و|ي)\s*Premium/, why: 'الشراء واحد — المشتري مالك لا مشترك' },
  { re: /Premium subscriber/i, why: 'اشتراك: عقد متجدّد لا نبيعه' },
  { re: /اشتراك\s*(?:قمة|قِمّة)\s*السنوي/, why: 'لا اشتراك سنويًّا — شراء واحد' },
]

console.log('\n① لا صيغة محظورة في أي سطح يراه المستخدم')
const files = SCAN_DIRS.flatMap((d) => walk(d))
const violations = []
for (const rel of files) {
  const src = readFileSync(resolve(ROOT, rel), 'utf8')
  const text = userFacingStrings(src, rel.endsWith('.html'))
  for (const b of BANNED) {
    const hit = text.split('\n').find((line) => b.re.test(line))
    if (hit) violations.push(`${rel} :: «${hit.trim().slice(0, 70)}» — ${b.why}`)
  }
}
check(`صفر مخالفة عبر ${files.length} ملفًّا في ${SCAN_DIRS.length} أدلّة`, violations.length === 0,
  violations.slice(0, 6).join(' | '))

console.log('\n② الصيغة المعتمدة حاضرة فعلًا — الحارس ليس نافيًا فحسب')
const reveal = readFileSync(resolve(ROOT, 'src/i18n/dict/reveal.ts'), 'utf8')
check('العربية: «يشمل تحديثات قِمّة — بلا اشتراك شهري»', reveal.includes('يشمل تحديثات قِمّة — بلا اشتراك شهري'))
check('الإنجليزية: «Includes Qimmah updates — no monthly subscription»',
  reveal.includes('Includes Qimmah updates — no monthly subscription'))

console.log('\n③ محاكاة الالتفاف — كل صيغة محظورة تُرصد باسمها')
for (const b of BANNED) {
  const planted = `const x = 'قِمّة Premium ${b.re.source.includes('lifetime') ? 'lifetime' : ''}'`
  void planted
}
{
  const sample = "  gatePrimary: 'قِمّة Premium مدى الحياة',"
  const caught = BANNED.some((b) => b.re.test(userFacingStrings(sample, false)))
  check('⚔️ نصّ مزروع بـ«مدى الحياة» يُرصد', caught)
}
{
  const sample = "  label: 'Premium subscribers',"
  check('⚔️ ونصّ مزروع بـ«subscribers» يُرصد',
    BANNED.some((b) => b.re.test(userFacingStrings(sample, false))))
}
{
  // التأكيد المضادّ الأهم: تعليقٌ يذكر المنع **لا** يُرصد — وإلا احمرّ الحارس
  // على كل ملفّ يشرح القاعدة، فيُعطَّل بعد يومين.
  const commentOnly = "// ممنوع: «مدى الحياة» و«lifetime»\nconst ok = 'شراء واحد'"
  check('⚔️ وتعليقٌ يذكر الممنوع لا يُرصد — الحارس يقيس المعروض لا الشارح',
    !BANNED.some((b) => b.re.test(userFacingStrings(commentOnly, false))))
}
{
  const bannedList = "const FORBIDDEN = ['مدى الحياة', 'lifetime']"
  check('⚠️ مصفوفة حظر داخل حارس تُرصد — تُستثنى بالموضع لا بالصمت',
    BANNED.some((b) => b.re.test(userFacingStrings(bannedList, false))))
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} نصّ Premium: ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
