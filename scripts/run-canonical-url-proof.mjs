#!/usr/bin/env node
// حارس الهوية الواحدة على الويب — [FOUNDER-QA-002].
//
// ═══ العطل المحروس (مقيس، لا مُستشعَر) ═══
// بلاغ المؤسس: «انتهينا من العيش عبر معاينات قديمة… المستخدم يجب ألّا يتساءل
// أيّ قِمّة هي الحقيقية». والقياس أسوأ من البلاغ:
//   • `qimmah.app` كان مضيف **كل** رابط قانوني ومشاركة وخريطة موقع — ١٩ موضعًا
//     في ثمانية ملفات — و**لا يُحلّ أصلًا**: استعلام DoH لسجلّ A يعيد
//     `Status 3` (NXDOMAIN) لـ`qimmah.app` ولـ`www.qimmah.app` (٢٠٢٦-٠٨-٢٨).
//     أي أن `<link rel="canonical">` يخبر محرّكات البحث أن النسخة الأصلية على
//     مضيف غير موجود، وبطاقة المشاركة تطلب صورة من العدم.
//   • `qimmah-site.pages.dev` مذكور في وثائق الإطلاق **ومشروعه غير موجود**
//     (`wrangler pages project list` يعيد مشروعًا واحدًا: `qimmah`).
//
// ═══ ما يُثبَت هنا ═══
//   ① المضيف مصدر **واحد** (`site/canonical-host.json`) لا تسعة عشر نصًّا.
//   ② ولا يبقى مضيف قديم في أي ملف منشور.
//   ③ والمضيف المُعلَن حيّ لا مُتمنّى — حالته موثّقة بدليلها، والنطاق المخطَّط
//     يبقى مفصولًا في `plannedOrigin` حتى يُسجَّل فعلًا.
//   ④ ووثائق الإطلاق لا تحيل إلى مشروع نشرٍ غير موجود.
//   ⟲ تأكيدات مضادّة: إعادة أي مضيف قديم — ولو في ملف واحد — تسقط **بفحص مسمّى**.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CANONICAL_FILES, KNOWN_HOSTS, readCanonical, rewrite } from './apply-canonical-host.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

let pass = 0
const fails = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

const canonical = readCanonical()
const { origin } = canonical

console.log('\n① المضيف مصدر واحد')
check('`site/canonical-host.json` يُعلن مضيفًا واحدًا صالحًا', /^https:\/\/[a-z0-9.-]+$/.test(origin), origin)
check('  ومعه دليل حالته لا ادّعاؤها',
  typeof canonical.evidence === 'string' && canonical.evidence.length > 10 && canonical.status === 'live')

console.log('\n② لا مضيف قديم في أي ملف منشور')
const strays = []
for (const rel of CANONICAL_FILES) {
  const { hits } = rewrite(read(rel), origin)
  if (hits > 0) strays.push(`${rel} (${hits})`)
}
check('كل رابط مطلق في الملفات المنشورة على المضيف المعتمد',
  strays.length === 0, strays.length === 0 ? `${CANONICAL_FILES.length} ملفات` : strays.join(' · '))

// والملفات المُعلَنة تغطّي فعلًا ما يحمل روابط — قائمةٌ ناقصة تجعل ② خضراء بلا معنى.
const declared = new Set(CANONICAL_FILES)
const mustCover = ['index.html', 'site/index.html', 'site/sitemap.xml', 'site/robots.txt']
check('  والقائمة تغطّي الأسطح التي تحمل الهوية فعلًا',
  mustCover.every((f) => declared.has(f)), mustCover.join(' · '))

console.log('\n③ النطاق المخطَّط مفصول حتى يُسجَّل')
const planned = canonical.plannedOrigin
check('`plannedOrigin` معلَن بحالته ودليله لا مدمَجًا في المنشور',
  !!planned && planned.status !== 'live' && typeof planned.evidence === 'string',
  planned ? `${planned.origin} — ${planned.status}` : 'غائب')
check('  ولا يظهر النطاق المخطَّط في أي ملف منشور قبل أن يحيا',
  CANONICAL_FILES.every((rel) => !read(rel).includes(planned.origin)))

console.log('\n④ لا إحالة إلى مشروع نشر غير موجود')
// `qimmah-site.pages.dev` مشروع لا وجود له — وثائق الإطلاق كانت ترسل القارئ إليه.
const docFiles = ['docs/site/LAUNCH-HANDOFF.md']
/**
 * المقصد: ألّا **يُرسَل القارئ** إلى مضيف لا وجود له. وتسميةُ الميت ميتًا ليست
 * إرسالًا إليه — بل هي التوثيق نفسه. فالفحص على الصيغة **القابلة للنقر**
 * (`https://…`) لا على ورود الاسم؛ ومنعُ ذكر الاسم كان سيمنع كتابة سبب موته.
 */
const CLICKABLE_GHOST = /https:\/\/qimmah-site\.pages\.dev/
const ghosts = docFiles.filter((f) => {
  try { return CLICKABLE_GHOST.test(read(f)) } catch { return false }
})
check('وثائق الإطلاق لا ترسل القارئ إلى `qimmah-site.pages.dev`',
  ghosts.length === 0, ghosts.length === 0 ? `${docFiles.length} وثيقة` : ghosts.join(' · '))
check('  ومع ذلك تسمّيه صراحةً مشروعًا لا وجود له — لا تحذفه بصمت',
  docFiles.every((f) => read(f).includes('qimmah-site.pages.dev')))

console.log('\n⟲ التأكيدات المضادّة — الحارس ليس فارغًا')
// ⟲-١ عودة المضيف الميت إلى ملف واحد تُلتقط بنفس الفحص.
const revived = read('index.html').replace(origin, 'https://qimmah.app')
check('⟲ إعادة `qimmah.app` إلى `index.html` تُسقط ② بفحصه المسمّى',
  rewrite(revived, origin).hits > 0 && rewrite(read('index.html'), origin).hits === 0)
// ⟲-٢ ومضيف المعاينة الميت كذلك — لا يُحرَس مضيفٌ واحد ويُترك الآخر.
const revived2 = read('site/sitemap.xml').replace(origin, 'https://qimmah-site.pages.dev')
check('⟲ وإعادة `qimmah-site.pages.dev` إلى خريطة الموقع تُلتقط أيضًا',
  rewrite(revived2, origin).hits > 0)
// ⟲-٣أ وعودة الصيغة القابلة للنقر إلى الوثيقة تسقط ④ باسمها.
check('⟲ رابط قابل للنقر إلى المشروع الميت يُسقط ④ بفحصه المسمّى',
  CLICKABLE_GHOST.test(`${read(docFiles[0])}\nافتح https://qimmah-site.pages.dev/privacy.html`) &&
  !CLICKABLE_GHOST.test(read(docFiles[0])))
// ⟲-٣ والقائمة المعروفة تشمل المضيفين الميتين فعلًا — قائمةٌ فارغة تجعل ② لا تفحص شيئًا.
check('⟲ قائمة المضيفات المعروفة تسمّي الميتين لا تتجاهلهما',
  KNOWN_HOSTS.includes('https://qimmah.app') && KNOWN_HOSTS.includes('https://qimmah-site.pages.dev'),
  `${KNOWN_HOSTS.length} مضيفات`)
// ⟲-٤ وتفريغ قائمة الملفات يجعل ② خضراء زورًا — فيحرسها الفحص المُضاف في ②.
check('⟲ تفريغ قائمة الملفات كان سيجعل ② خضراء بلا معنى — ولذلك تُفحص التغطية',
  CANONICAL_FILES.length >= mustCover.length && mustCover.every((f) => declared.has(f)))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} الهوية الواحدة: ${pass} ناجحة · ${fails.length} فاشلة`)
if (fails.length > 0) { for (const f of fails) console.log(`   · ${f}`); process.exit(1) }
