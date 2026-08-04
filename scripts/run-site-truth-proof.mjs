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

if (failures.length > 0) {
  console.error(`\n❌ إثبات صدق الموقع فشل — ${failures.length} مخالفة من ${checks} فحصًا:\n`)
  for (const f of failures) console.error(`   • ${f}\n`)
  console.error('   المرجع: docs/site/SITE-COPY-ALIGNMENT.md\n')
  process.exit(1)
}

console.log(`✅ إثبات صدق الموقع: ${checks} فحصًا على ${htmlFiles.length} صفحات — لا تصريح غير صحيح ولا بريد قديم.`)
