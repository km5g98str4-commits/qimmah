#!/usr/bin/env node
// إثبات صدق الموقع — يفشل إن عاد أي تصريح غير صحيح أو بريد قديم إلى `site/`.
//
// لماذا هذا السكربت موجود:
//   `site/privacy.html` كان يقول بخطّ عريض إن التطبيق «لا يقرأ Apple Health»
//   والتطبيق يقرأ ٢٤ نوعًا من HealthKit؛ وكان ينفي طلب الموقع والتطبيق يطلبه؛
//   وكان ينشر حدًّا أدنى للعمر (١٢) يرفضه مدقّق التطبيق نفسه (١٣).
//   هذه ليست صياغات متقادمة بل **نفيٌ صريح لسلوك قائم** على صفحة قانونية منشورة.
//   الإصلاح اليدوي يُصلح اليوم؛ وهذا الفحص يمنع العودة غدًا.
//
// المرجع: docs/site/SITE-COPY-ALIGNMENT.md (ح-١ · ح-٢ · ح-٣ · ت-٤)
//
// التشغيل: node scripts/run-site-truth-proof.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SITE_DIR = 'site'

/**
 * كل قاعدة تصف **جملة منفية بعينها**، لا كلمة مفتاحية.
 * الفارق جوهري: «لا نطلب موقعك أو جهات اتصالك أو صورك» كذبة،
 * بينما «لا نطلب موقعك إلا في حالة واحدة: …» هو التصحيح نفسه.
 * فحصٌ بالكلمة المفتاحية وحدها كان سيفشل على النصّ الصحيح — ويعلّمنا تعطيله.
 */
const FORBIDDEN = [
  {
    id: 'ح-١ · نفي قراءة Apple Health',
    patterns: [/لا\s+نقرأ\s+Apple\s+Health/u, /we\s+do\s+not\s+read\s+Apple\s+Health/iu],
    why: 'التطبيق يقرأ ٢٤ نوعًا من HealthKit (src/lib/health/metrics.ts). النفي تصريح غير صحيح عن بيانات صحية حسّاسة.',
  },
  {
    id: 'ح-٢ · نفي طلب الموقع',
    patterns: [
      /لا\s+نطلب\s+موقعك\s+(أو|و)\s*جهات\s+اتصالك/u,
      /we\s+do\s+not\s+request\s+your\s+location,\s*contacts/iu,
    ],
    why: 'التطبيق يطلب الموقع لجدولة الوضع الداكن (src/lib/geolocation.ts + NSLocationWhenInUseUsageDescription). الصياغة الصحيحة تستثني هذه الحالة صراحةً.',
  },
  {
    id: 'ح-٣ · حدّ أدنى للعمر غير الـ١٣',
    patterns: [/12\s+or\s+older/iu, /١٢\s+سنة/u, /\b12\+/u],
    why: 'الحدّ الأدنى ١٣ سنة — نهائي. ونشر ١٢ يخالف مدقّق التطبيق (AGE_RANGE في src/lib/onboardingV2Flow.ts) وتصنيف App Store Connect.',
  },
  {
    id: 'ت-٤ · بريد الدعم القديم',
    patterns: [/support@qimmah\.app/iu],
    why: 'بريد الدعم المنشور يجب أن يعمل — رسالة مرتدّة على الموقع أو في App Store Connect سبب رفض مباشر. البريد المعتمد: qimmah.support@gmail.com',
  },
  {
    id: 'ص-٥ · وعد «الأساسيات مجانية»',
    patterns: [
      /الأساسيات\s+تبقى\s+مجانية/u,
      /الميزات\s+الأساسية\s+تبقى\s+مجانية/u,
      /essentials\s+stay(?:ing)?\s+free/iu,
      /Core\s+features\s+remain[\s\S]{0,12}free/iu,
    ],
    why: 'غير صحيح: ثلاثة عشر فعلًا منتجًا محجوبة خلف استحقاق مُتحقَّق من الخادم — تسجيل المجموعات والطعام والماء والوزن والقياسات وتعديل الخطة والتعافي (src/lib/access/paidActions.ts:18-53). المجاني هو التصفّح والتخصيص وتوليد الخطة ومعاينتها.',
  },
  {
    id: 'ص-٦ · نفي وجود اشتراك/وصول مدفوع',
    patterns: [/لا\s+يوجد\s+اشتراك\s+فعّال/u, /No\s+subscription\s+is\s+active/iu],
    why: 'وثيقة قانونية تنفي وجود وصول مدفوع بينما مسار شراء سلة وبوّابة Premium يشحنان فعلًا. هذا أخطر ما في السجلّ.',
  },
  {
    id: 'ص-٧ · «التطبيق يعمل كاملًا بلا حساب»',
    patterns: [/يعمل\s+التطبيق\s+كاملًا\s+بلا\s+حساب/u, /works\s+fully\s+without\s+(?:one|an\s+account)/iu],
    why: 'التصفّح بلا حساب صحيح؛ أما التسجيل فيحتاج وصولًا مفعّلًا، والوصول يحتاج حسابًا موثَّقًا. «كاملًا» تجعل النصف كلًّا.',
  },
  {
    id: 'ص-٨ · لفظ ممنوع في وصف Premium (§0.1)',
    patterns: [/مدى\s+الحياة/u, /\blifetime\b/iu, /كل\s+التحديثات\s+الحالية\s+والمستقبلية/u],
    why: 'الميثاق §0.1 يمنعها في كل سطح يراه المستخدم: «مدى الحياة» و«lifetime» تقيّدان قانونيًا وتسويقيًا، و«كل التحديثات الحالية والمستقبلية» وعدٌ يُقتبس ضدّنا إن ضاق نطاق Premium.',
  },
  {
    id: 'ص-٩ · رقم سعر منشور على الموقع',
    patterns: [/\d{1,4}[.,٫]\d{2}\s*(?:ريال|ريالًا|SAR|ر\.?س)/u],
    why: 'السعر له مصدر واحد هو قناة البيع. ونسخة ثانية منه على الموقع تشيخ بصمت وتصير تصريحًا غير صحيح — وهو بعينه ما وقع في واجهة سلة. الموقع يصف بنية الوصول لا مبلغه.',
  },
  {
    id: 'وسم مسوّدة أو موضع غير مملوء',
    patterns: [/\[OWNER-EMAIL\]/u, /\[DATE\]/u, /مسودة للمراجعة القانونية/u],
    why: 'صفحة منشورة لا تحمل وسم «مسوّدة» ولا أقواسًا غير مملوءة.',
  },
]

/** التصريحات التي **يجب أن تبقى** — الفحص يعمل في الاتجاهين. */
const REQUIRED = [
  { file: 'privacy.html', pattern: /qimmah\.support@gmail\.com/u, what: 'بريد التواصل المعتمد' },
  { file: 'privacy.html', pattern: /الحد\s+الأدنى\s+للعمر:\s*١٣\s+سنة/u, what: 'الحدّ الأدنى ١٣ (عربي)' },
  { file: 'privacy.html', pattern: /Minimum\s+age:\s*13\s+years/iu, what: 'الحدّ الأدنى ١٣ (إنجليزي)' },
  { file: 'privacy.html', pattern: /قراءة\s+فقط/u, what: 'تصريح قراءة HealthKit فقط' },
  { file: 'terms.html', pattern: /الحد\s+الأدنى\s+للعمر:\s*١٣\s+سنة/u, what: 'الحدّ الأدنى ١٣ في الشروط' },
  { file: 'terms.html', pattern: /ليس\s+تشخيصًا/u, what: 'التنويه الطبي' },
  { file: 'index.html', pattern: /على\s+جهازك\s+أولًا/u, what: 'هوية «محلي أولًا» على الصفحة الرئيسية' },
  // ص-١٠ — المزامنة: العيب لم يكن قولَ «اختيارية» بل **إغفال أنها غير متاحة**.
  // فالمطلوب حضور التصريح، لا منع الوصف.
  { file: 'index.html', pattern: /المزامنة\s+بين\s+الأجهزة\s+غير\s+مفعّلة\s+في\s+هذه\s+النسخة/u, what: 'تصريح تعطّل المزامنة (الرئيسية)' },
  { file: 'support.html', pattern: /المزامنة\s+بين\s+الأجهزة\s+غير\s+مفعّلة\s+في\s+هذه\s+النسخة/u, what: 'تصريح تعطّل المزامنة (الدعم — عربي)' },
  { file: 'support.html', pattern: /Cross-device\s+sync\s+is\s+not\s+enabled\s+in\s+this\s+version/iu, what: 'تصريح تعطّل المزامنة (الدعم — إنجليزي)' },
  { file: 'privacy.html', pattern: /في\s+هذه\s+النسخة\s+المزامنة\s+غير\s+مفعّلة/u, what: 'تصريح تعطّل المزامنة (الخصوصية — عربي)' },
  { file: 'privacy.html', pattern: /In\s+this\s+version\s+sync\s+is\s+not\s+enabled/iu, what: 'تصريح تعطّل المزامنة (الخصوصية — إنجليزي)' },
]

const htmlFiles = readdirSync(SITE_DIR).filter((f) => f.endsWith('.html'))
const failures = []
let checks = 0

// ١) لا عبارة ممنوعة في أي صفحة.
for (const file of htmlFiles) {
  const text = readFileSync(join(SITE_DIR, file), 'utf8')
  for (const rule of FORBIDDEN) {
    for (const pattern of rule.patterns) {
      checks++
      const hit = text.match(pattern)
      if (hit) {
        failures.push(`${file} — ${rule.id}\n      وُجد: «${hit[0]}»\n      السبب: ${rule.why}`)
      }
    }
  }
}

// ٢) وكل تصريح واجب حاضر في موضعه.
for (const rule of REQUIRED) {
  checks++
  const text = readFileSync(join(SITE_DIR, rule.file), 'utf8')
  if (!rule.pattern.test(text)) {
    failures.push(`${rule.file} — تصريح واجب مفقود: ${rule.what}`)
  }
}

// ٣) حارس السجلّين — كل صياغة في صفحتها، ولا واحدة في صفحة الأخرى.
//
// نفس المعلومة (إذن الموقع لجدولة الوضع الداكن) مكتوبة **بصياغتين مختلفتين
// عمدًا**: القانونية في privacy.html مُعنونة ومفصولة بصريًا («و) موقعك — يُطلب
// فقط إذا…»)، والسردية في support.html داخل جواب سؤال شائع.
//
// **الخطر الذي يحرسه:** محرّر لاحق يرى «تكرارًا» فيوحّدهما — فتفقد إحدى
// الصفحتين سجلّها. §6: الشاشة ذرّة في صوت المنتج، والكتلة القانونية صوت ثانٍ
// **معلَن مفصول بصريًا**. والتوحيد يهدم الفصل.
const REGISTERS = [
  {
    file: 'privacy.html',
    own: { pattern: /<strong>و\)\s*موقعك<\/strong>/u, what: 'الصياغة القانونية المُعنونة' },
    foreign: { pattern: /لا\s+نطلب\s+موقعك\s+إلا\s+في\s+حالة\s+واحدة/u, what: 'الصياغة السردية (صفحة الدعم)' },
  },
  {
    file: 'support.html',
    own: { pattern: /لا\s+نطلب\s+موقعك\s+إلا\s+في\s+حالة\s+واحدة/u, what: 'الصياغة السردية' },
    foreign: { pattern: /<strong>و\)\s*موقعك<\/strong>/u, what: 'الصياغة القانونية المُعنونة (صفحة الخصوصية)' },
  },
]
for (const r of REGISTERS) {
  const text = readFileSync(join(SITE_DIR, r.file), 'utf8')
  checks++
  if (!r.own.pattern.test(text)) {
    failures.push(`${r.file} — سجلّها الخاص غائب: ${r.own.what}\n      السبب: كل صفحة تحمل صياغتها، والغياب يعني توحيدًا هدم الفصل.`)
  }
  checks++
  if (r.foreign.pattern.test(text)) {
    failures.push(`${r.file} — تسرّبت إليها صياغة صفحة أخرى: ${r.foreign.what}\n      السبب: الكتلة القانونية صوت ثانٍ معلَن مفصول بصريًا (§6) — لا تُنسخ في سطح سردي ولا العكس.`)
  }
}

// ٤) تأكيد مضادّ (§4.2) — الحارس أعلاه ليس فارغًا.
// لو تغيّر مسار إحدى الصفحتين أو فرغت لمرّت فحوص السجلّين مجّانًا.
for (const r of REGISTERS) {
  checks++
  const text = readFileSync(join(SITE_DIR, r.file), 'utf8')
  if (text.length < 500 || !/موقعك/u.test(text)) {
    failures.push(`${r.file} — التأكيد المضادّ سقط: الصفحة فارغة أو لا تذكر الموقع أصلًا، فحارس السجلّين يمرّ مجّانًا.`)
  }
}

// ٥) المنابع — لا الصفحات وحدها.
//
// ═══ الدرس الذي يفرض هذا القسم ═══
// نصوص `site/` ليست أصلًا؛ لها منابع: النصّ القانوني في `docs/legal/`، ووصف
// المتجر في `docs/appstore/`، ومقترحات نصّ الموقع في `docs/site/`. وحين صُحّحت
// الصفحة وحدها في موجة سابقة عاد الخطأ من منبعه في الموجة التالية — ولذلك
// **يُفحص المنبع بنفس القواعد**. (استُثني `docs/execution/` عمدًا: سجلّ
// التصريحات يقتبس العيوب كأدلّة، واقتباس العيب ليس ارتكابه.)
const SOURCE_DOCS = [
  'docs/legal/terms-of-service.md',
  'docs/legal/privacy-policy.md',
  'docs/legal/APPSTORE-COMPLIANCE-PACK.md',
  'docs/appstore/02-description.md',
  'docs/appstore/STORE-TESTFLIGHT-PACK.md',
  'docs/site/SITE-COPY-ALIGNMENT.md',
]
const SOURCE_RULES = new Set(['ص-٥ · وعد «الأساسيات مجانية»', 'ص-٦ · نفي وجود اشتراك/وصول مدفوع', 'ص-٨ · لفظ ممنوع في وصف Premium (§0.1)'])
for (const rel of SOURCE_DOCS) {
  let text
  try { text = readFileSync(rel, 'utf8') } catch {
    checks++
    failures.push(`${rel} — منبع مفقود: الملفّ مُعلَن في هذا الحارس وغير موجود. إمّا يُعاد أو يُحذف من القائمة.`)
    continue
  }
  checks++
  if (text.length < 200) {
    failures.push(`${rel} — التأكيد المضادّ سقط: المنبع شبه فارغ، ففحصه يمرّ مجّانًا.`)
  }
  for (const rule of FORBIDDEN) {
    if (!SOURCE_RULES.has(rule.id)) continue
    for (const pattern of rule.patterns) {
      checks++
      const hit = text.match(pattern)
      if (hit) failures.push(`${rel} — ${rule.id}\n      وُجد: «${hit[0]}»\n      السبب: ${rule.why}`)
    }
  }
}

// ٦) عقد الوصول في الشروط — **كتلة مقترنة بحدودها، لا includes متفرّقة.**
//
// ═══ لماذا الاستخراج بالحدود ═══
// سابقة هذا المستودع: بوابة الموافقة الصحية كانت خمس `includes()` على الملفّ
// كلّه، فكانت تُرضى من مواضع متفرّقة لا علاقة لبعضها ببعض. فالفحص هنا يستخرج
// بند «الوصول المدفوع» **من عنوانه إلى العنوان الذي يليه**، ويشترط الحقائق
// داخله. جملةٌ صحيحة في أسفل الصفحة لا تُرضيه.
const ACCESS_BLOCKS = [
  {
    file: 'terms.html',
    lang: 'عربي',
    open: /<h2>٨\)\s*الوصول المدفوع[^<]*<\/h2>/u,
    close: /<h2>٩\)/u,
    must: [
      { p: /التصفّح\s+مجاني\s+بلا\s+حساب\s+وبلا\s+دفع/u, what: 'ما هو مجاني، مسمّى' },
      { p: /يحتاج\s+وصولًا\s+مفعّلًا\s+تسجيلُ/u, what: 'ما يحتاج وصولًا، مسمّى' },
      { p: /٧٢\s*ساعة/u, what: 'مدّة التجربة' },
      { p: /كود\s+وصول/u, what: 'بوّابة كود الوصول' },
      { p: /شراء\s+واحد\s+لا\s+اشتراكًا\s+متجدّدًا/u, what: 'شراء واحد لا اشتراك' },
      { p: /بلا\s+اشتراك\s+شهري/u, what: 'الصيغة المعتمدة (§0.1)' },
    ],
  },
  {
    file: 'terms.html',
    lang: 'إنجليزي',
    open: /<h2>8\)\s*Paid access[^<]*<\/h2>/u,
    close: /<h2>9\)/u,
    must: [
      { p: /Browsing\s+is\s+free/iu, what: 'ما هو مجاني، مسمّى' },
      { p: /Active\s+access\s+is\s+required/iu, what: 'ما يحتاج وصولًا، مسمّى' },
      { p: /72-hour/iu, what: 'مدّة التجربة' },
      { p: /access\s+code/iu, what: 'بوّابة كود الوصول' },
      { p: /one-time\s+purchase,\s*not\s+a\s+recurring\s+subscription/iu, what: 'شراء واحد لا اشتراك' },
      { p: /no\s+monthly\s+subscription/iu, what: 'الصيغة المعتمدة (§0.1)' },
    ],
  },
]
/** يستخرج الكتلة بحدودها، ويعيد null إن غاب أحد الحدّين. */
function extractBlock(text, open, close) {
  const o = text.match(open)
  if (!o) return null
  const rest = text.slice(o.index + o[0].length)
  const c = rest.match(close)
  return c ? rest.slice(0, c.index) : null
}
for (const b of ACCESS_BLOCKS) {
  const text = readFileSync(join(SITE_DIR, b.file), 'utf8')
  checks++
  const block = extractBlock(text, b.open, b.close)
  if (block === null) {
    failures.push(`${b.file} (${b.lang}) — بند «الوصول المدفوع» غير موجود بحدوده. عقد الوصول يجب أن يكون بندًا مستقلًّا يقرأه المستخدم، لا جملًا متناثرة.`)
    continue
  }
  for (const m of b.must) {
    checks++
    if (!m.p.test(block)) {
      failures.push(`${b.file} (${b.lang}) — داخل بند الوصول المدفوع، ينقص: ${m.what}`)
    }
  }
  // تأكيد مضادّ: الكتلة ليست الصفحة كلّها (وإلا لعاد الفحص إلى includes متفرّقة).
  checks++
  if (block.length >= text.length * 0.5) {
    failures.push(`${b.file} (${b.lang}) — الاستخراج ابتلع نصف الصفحة أو أكثر: الحدّ الختامي لم يُطابَق، فالفحص عاد includes على الملفّ كلّه.`)
  }
}

// ٧) ⚔️ محاكاة التفاف على فحص الكتلة — يجب أن تسقط بفحص مسمّى (§4.2).
{
  checks++
  const scattered = '<h2>٨) الوصول المدفوع — قِمّة Premium</h2><p>نصّ آخر</p><h2>٩) غيره</h2>' +
    '<p>التصفّح مجاني بلا حساب وبلا دفع ٧٢ ساعة كود وصول شراء واحد لا اشتراكًا متجدّدًا بلا اشتراك شهري</p>'
  const blk = extractBlock(scattered, ACCESS_BLOCKS[0].open, ACCESS_BLOCKS[0].close)
  const satisfied = blk !== null && ACCESS_BLOCKS[0].must.every((m) => m.p.test(blk))
  if (satisfied) {
    failures.push('⚔️ الالتفاف نجح: حقائق الوصول متناثرة **خارج** البند أرضت الفحص — فالفحص عاد includes على الملفّ.')
  }
}
{
  // ولو غاب الحدّ الختامي لصار الاستخراج بلا حدود.
  checks++
  const unbounded = '<h2>٨) الوصول المدفوع — قِمّة Premium</h2><p>لا عنوان تاسع بعده</p>'
  if (extractBlock(unbounded, ACCESS_BLOCKS[0].open, ACCESS_BLOCKS[0].close) !== null) {
    failures.push('⚔️ الاستخراج قبل كتلة بلا حدّ ختامي — الحدود ليست حدودًا.')
  }
}

if (failures.length > 0) {
  console.error(`\n❌ إثبات صدق الموقع فشل — ${failures.length} مخالفة من ${checks} فحصًا:\n`)
  for (const f of failures) console.error(`   • ${f}\n`)
  console.error('   المرجع: docs/site/SITE-COPY-ALIGNMENT.md\n')
  process.exit(1)
}

console.log(`✅ إثبات صدق الموقع: ${checks} فحصًا على ${htmlFiles.length} صفحات — لا تصريح غير صحيح ولا بريد قديم.`)
