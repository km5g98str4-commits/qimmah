#!/usr/bin/env node
// إثبات صدق الموقع — يفشل إن عاد أي تصريح غير صحيح أو بريد قديم إلى `site/`،
// أو عاد ادّعاء تجاري بائت إلى أي سطح يقرأ عليه المستخدم نموذج الوصول والدفع.
//
// لماذا هذا السكربت موجود:
//   `site/privacy.html` كان يقول بخطّ عريض إن التطبيق «لا يقرأ Apple Health»
//   والتطبيق يقرأ ٢٤ نوعًا من HealthKit؛ وكان ينفي طلب الموقع والتطبيق يطلبه؛
//   وكان ينشر حدًّا أدنى للعمر يخالف مدقّق التطبيق نفسه. الاتجاه انعكس
//   بقرار المؤسس (الحدّ ١٢)، والخطر باقٍ معكوسًا: نصّ متخلّف يقول «13».
//   هذه ليست صياغات متقادمة بل **نفيٌ صريح لسلوك قائم** على صفحة قانونية منشورة.
//   الإصلاح اليدوي يُصلح اليوم؛ وهذا الفحص يمنع العودة غدًا.
//
// المرجع: docs/site/SITE-COPY-ALIGNMENT.md (ح-١ · ح-٢ · ح-٣ · ت-٤)
//        · AGENTS.md §0.1 و`01-DECISIONS.md` DEC-015 و`05-CLAIMS.md` CLM-001…004 (ص-١ … ص-٦)
//
// التشغيل: node scripts/run-site-truth-proof.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SITE_DIR = 'site'
const CANONICAL_LEGAL = 'src/legal/canonicalLegalContent.ts'

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
    id: 'ح-٣ · حدّ أدنى للعمر غير الـ١٢',
    patterns: [/13\s+or\s+older/iu, /١٣\s+سنة/u, /\b13\+/u],
    why: 'الحدّ الأدنى ١٢ سنة (قرار المؤسس — AGE 12 SUCCESSOR RC). ونشر ١٣ يخالف مدقّق التطبيق (AGE_RANGE في src/config/profileDomain.ts).',
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
  { file: CANONICAL_LEGAL, root: true, pattern: /configured\(c\.contactEmail/u, what: 'حقل بريد التواصل المحكوم بالإطلاق' },
  { file: CANONICAL_LEGAL, root: true, pattern: /الحد الأدنى المدعوم 12 سنة/u, what: 'الحدّ الأدنى 12 (عربي)' },
  { file: CANONICAL_LEGAL, root: true, pattern: /minimum supported age is 12/iu, what: 'الحدّ الأدنى 12 (إنجليزي)' },
  { file: CANONICAL_LEGAL, root: true, pattern: /Apple Health قراءة فقط/u, what: 'تصريح قراءة HealthKit فقط' },
  { file: CANONICAL_LEGAL, root: true, pattern: /ليس جهة طبية/u, what: 'التنويه الطبي' },
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
  const text = readFileSync(rule.root ? rule.file : join(SITE_DIR, rule.file), 'utf8')
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
    file: '../src/legal/canonicalLegalContent.ts',
    own: { pattern: /لا يُطلب موقعك إلا إذا اخترت جدولة الوضع الداكن/u, what: 'الصياغة القانونية المُعنونة' },
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

// ═══════════════════════════════════════════════════════════════════════════
// ٥) صدق الادّعاء التجاري — نموذج الوصول والدفع
// ═══════════════════════════════════════════════════════════════════════════
//
// لماذا أُضيف هذا القسم:
//   كانت الشروط المنشورة تقول «لا يوجد اشتراك فعّال في هذه النسخة» و«تبقى
//   الأساسيات مجانية»، بينما الكود يحجب **ثلاثة عشر فعلًا منتِجًا** خلف استحقاق
//   يتحقّق منه الخادم (`src/lib/access/paidActions.ts` — `PAID_ACTIONS`،
//   و`isPaidActionAllowed` لا تمنح إلا على `active`). هذا ليس نصًّا متقادمًا بل
//   **نفيٌ صريح لسلوك قائم في وثيقة قانونية منشورة** — أخطر من كل ما سبقه هنا.
//
// المرجع الحاكم: `AGENTS.md §0.1` (دستور موقّع) · `DEC-015` في
//   `docs/execution/qimmah-master/01-DECISIONS.md:153-183` (مقفل) ·
//   سجلّ الادّعاءات `docs/execution/qimmah-master/05-CLAIMS.md` (CLM-001…004).
//
// **ولماذا لا `includes()` متفرّقة:** بوابة تفحص وجود كلمات متناثرة في ملف كامل
// تُرضى من مواضع لا علاقة بينها (§4.2). فالفحص هنا **بنيوي مقترن**: تُستخرج كتلة
// «الوصول والدفع» بحدودها من كل سطح، ويُطلب أن تحمل **الكتلة نفسها** الحقيقة
// كاملة — ما هو مجاني، وما هو مدفوع، والبوّابات الثلاث، وأن الشراء واحد لا اشتراك.

/** الأسطح التي يقرأ عليها المستخدم نموذج الوصول — الموقع والمتجر والقانوني. */
const COMMERCIAL_SURFACES = [
  CANONICAL_LEGAL,
  'site/index.html',
  'site/support.html',
  'docs/legal/APPSTORE-COMPLIANCE-PACK.md',
  'docs/appstore/02-description.md',
  'docs/appstore/STORE-TESTFLIGHT-PACK.md',
]

/** الجُمَل التي **لا يجوز أن تعود** — كل واحدة نفيٌ لسلوك قائم أو وعدٌ محظور. */
const STALE_COMMERCIAL = [
  {
    id: 'ص-١ · «الأساسيات تبقى مجانية»',
    patterns: [
      /الأساسيات\s+تبقى\s+مجانية/u,
      /تبقى\s+الأساسيات\s+مجانية/u,
      /الميزات\s+الأساسية\s+تبقى\s+مجانية/u,
      /essentials\s+(staying|stay)\s+free/iu,
      /core\s+features\s+remain\s+free/iu,
    ],
    why: 'تسجيل مجموعة أو وجبة أو ماء أو وزن **أفعال أساسية**، وكلّها محجوبة بلا استحقاق (paidActions.ts:17-52). المجاني هو التخصيص وتوليد الخطة ومعاينتها وإنشاء الحساب — لا «الأساسيات».',
  },
  {
    id: 'ص-٢ · «لا يوجد اشتراك فعّال في هذه النسخة»',
    patterns: [/لا\s+يوجد\s+اشتراك\s+فعّال/u, /no\s+subscription\s+is\s+active/iu],
    why: 'مسار شراء حيّ وبوّابة استحقاق وحارس تخزين تشحن كلها. نفيها في وثيقة قانونية مسؤولية لا سهو.',
  },
  {
    id: 'ص-٣ · «يعمل التطبيق كاملًا بلا حساب»',
    patterns: [
      /يعمل\s+التطبيق\s+كاملًا\s+بلا\s+حساب/u,
      /works\s+fully\s+without\s+(one|an\s+account)/iu,
    ],
    why: 'التصفّح بلا حساب يعمل، والتسجيل لا. الصياغة الصحيحة تفصل الاثنين بدل أن تُلَيِّن الادّعاء.',
  },
  {
    id: 'ص-٤ · «قِمّة+» / «الاشتراك المستقبلي»',
    patterns: [/الاشتراك\s+المستقبلي/u, /future\s+subscription/iu, /قِمّة\+/u, /Qimmah\+/u],
    why: 'المنتج المدفوع اسمه «قِمّة Premium» وهو قائم لا مستقبلي، وشراء واحد لا اشتراك (DEC-015).',
  },
  {
    id: 'ص-٥ · وعد محظور في §0.1',
    patterns: [
      /مدى\s+الحياة/u,
      /\blifetime\b/iu,
      /all\s+current\s+and\s+future\s+updates/iu,
      /كل\s+التحديثات\s+الحالية\s+والمستقبلية/u,
    ],
    why: '§0.1 يحظرها بالاسم: الأوليان تقيّدان قانونيًا وتسويقيًا، والأخيرة وعدٌ يُقتبس ضدّنا إن ضاق نطاق Premium.',
  },
  {
    id: 'ص-٦ · سعر صفر في البيانات المهيكلة',
    patterns: [/"price"\s*:\s*"?0"?/u, /priceCurrency/u],
    why: 'عرض `price: 0` للزاحف يقول «التطبيق مجاني» بلغة الآلة — وهو نفس ادّعاء ص-١ في صيغة لا يقرأها المحرّر البشري.',
  },
]

/**
 * كتل «الوصول والدفع» — لكل سطح حدوده، ولكل كتلة ما **يجب** أن تحمله هي نفسها.
 * الاقتران هو الفحص: مرور الكتلة يعني أنها تقول الحقيقة كاملة في موضع واحد.
 */
const AR_FREE = { what: 'ما هو مجاني (معاينة الخطة)', pattern: /معاينة|معاينتها/u }
const AR_TRIAL = { what: 'بوّابة التجربة (٧٢ ساعة)', pattern: /٧٢\s*ساعة/u }
const AR_PREMIUM = { what: 'بوّابة Premium', pattern: /قِمّة\s+Premium/u }
const AR_CODE = { what: 'بوّابة كود الوصول', pattern: /كود\s+وصول/u }
const AR_ONETIME = { what: 'شراء واحد لا اشتراك', pattern: /بلا\s+اشتراك\s+شهري/u }
const EN_FREE = { what: 'what is free (plan preview)', pattern: /preview/iu }
const EN_TRIAL = { what: 'the trial gate (72 hours)', pattern: /72-hour/iu }
const EN_PREMIUM = { what: 'the Premium gate', pattern: /Qimmah\s+Premium/u }
const EN_CODE = { what: 'the access-code gate', pattern: /access\s+code/iu }
const EN_ONETIME = { what: 'one-time purchase, not a subscription', pattern: /no\s+monthly\s+subscription/iu }

const ACCESS_BLOCKS = [
  {
    file: CANONICAL_LEGAL,
    id: 'الشروط القانونية المعتمدة — العربية',
    start: /heading: '٤\. المعاينة المجانية والوصول المدفوع'/u,
    end: /\{ heading: '٦\./u,
    must: [AR_FREE, AR_TRIAL, AR_PREMIUM, AR_CODE, AR_ONETIME, { what: 'السعر 19.99', pattern: /19\.99/u }],
    leak: { what: 'القسم السادس (الحدّ انفلت)', pattern: /\{ heading: '٦\./u },
  },
  {
    file: CANONICAL_LEGAL,
    id: 'canonical legal terms — English',
    start: /heading: '4\. Free preview and paid access'/u,
    end: /\{ heading: '6\./u,
    must: [EN_FREE, EN_TRIAL, EN_PREMIUM, EN_CODE, EN_ONETIME, { what: 'the SAR 19.99 price', pattern: /19\.99/u }],
    leak: { what: 'section six (boundary escaped)', pattern: /\{ heading: '6\./u },
  },
  {
    file: 'docs/legal/APPSTORE-COMPLIANCE-PACK.md',
    id: 'حزمة امتثال المتجر — العربية',
    start: /## ٨\. الوصول والدفع/u,
    end: /\n## /u,
    must: [AR_FREE, AR_TRIAL, AR_PREMIUM, AR_CODE, AR_ONETIME],
    leak: { what: 'عنوان قسم آخر', pattern: /\n#{2,3} /u },
  },
  {
    file: 'docs/legal/APPSTORE-COMPLIANCE-PACK.md',
    id: 'حزمة امتثال المتجر — الإنجليزية',
    start: /## 8\. Access and payment/u,
    end: /\n## /u,
    must: [EN_FREE, EN_TRIAL, EN_PREMIUM, EN_CODE, EN_ONETIME],
    leak: { what: 'another section heading', pattern: /\n#{2,3} /u },
  },
  {
    file: 'site/index.html',
    id: 'الصفحة الرئيسية — سطر Premium (تسويقي)',
    start: /<div class="plus-line">/u,
    end: /<\/div>/u,
    must: [AR_FREE, AR_TRIAL, AR_PREMIUM, AR_ONETIME],
    leak: { what: 'نهاية الحاوية', pattern: /<\/div>/u },
  },
  {
    file: 'site/support.html',
    id: 'الدعم — سؤال الحساب (عربي)',
    start: /<summary>هل أحتاج حسابًا لاستخدام قِمّة؟<\/summary>/u,
    end: /<\/details>/u,
    must: [
      AR_FREE, AR_TRIAL, AR_PREMIUM, AR_CODE,
      { what: 'ما الذي يحتاج حسابًا فعلًا (التسجيل)', pattern: /التسجيل/u },
      { what: 'ما الذي لا يحتاجه (التصفّح بلا حساب)', pattern: /بلا\s+حساب/u },
    ],
    leak: { what: 'نهاية عنصر السؤال', pattern: /<\/details>/u },
  },
  {
    file: 'site/support.html',
    id: 'الدعم — سؤال الحساب (إنجليزي)',
    start: /<summary>Do I need an account\?<\/summary>/u,
    end: /<\/details>/u,
    must: [
      EN_FREE, EN_TRIAL, EN_PREMIUM, EN_CODE,
      { what: 'what actually needs an account (logging)', pattern: /logging/iu },
      { what: 'what does not (browsing without an account)', pattern: /without\s+an\s+account/iu },
    ],
    leak: { what: 'end of the FAQ item', pattern: /<\/details>/u },
  },
  {
    file: 'docs/appstore/02-description.md',
    id: 'وصف المتجر — سطر Premium (عربي)',
    start: /قِمّة Premium: إعدادك/u,
    end: /\n/u,
    must: [AR_FREE, AR_TRIAL, AR_PREMIUM, AR_CODE, AR_ONETIME],
    leak: { what: 'سطر ثانٍ', pattern: /\n/u },
  },
  {
    file: 'docs/appstore/02-description.md',
    id: 'وصف المتجر — سطر Premium (إنجليزي)',
    start: /Qimmah Premium: your setup/u,
    end: /\n/u,
    must: [EN_FREE, EN_TRIAL, EN_PREMIUM, EN_CODE, EN_ONETIME],
    leak: { what: 'a second line', pattern: /\n/u },
  },
  {
    file: 'docs/appstore/STORE-TESTFLIGHT-PACK.md',
    id: 'حزمة TestFlight — سطر Premium (عربي)',
    start: /قِمّة Premium: إعدادك/u,
    end: /\n/u,
    must: [AR_FREE, AR_TRIAL, AR_PREMIUM, AR_CODE, AR_ONETIME],
    leak: { what: 'سطر ثانٍ', pattern: /\n/u },
  },
  {
    file: 'docs/appstore/STORE-TESTFLIGHT-PACK.md',
    id: 'حزمة TestFlight — سطر Premium (إنجليزي)',
    start: /Qimmah Premium: your setup/u,
    end: /\n/u,
    must: [EN_FREE, EN_TRIAL, EN_PREMIUM, EN_CODE, EN_ONETIME],
    leak: { what: 'a second line', pattern: /\n/u },
  },
]

/** يقتطع ما بين `start` وأوّل `end` بعده — و`null` إن لم يوجد المبتدأ. */
function extractBlock(text, startRe, endRe) {
  const s = text.match(startRe)
  if (!s) return null
  const rest = text.slice(s.index + s[0].length)
  const e = rest.match(endRe)
  return e ? rest.slice(0, e.index) : rest
}

// ٥-أ) لا جملة تجارية بائتة على أي سطح.
for (const file of COMMERCIAL_SURFACES) {
  const text = readFileSync(file, 'utf8')
  for (const rule of STALE_COMMERCIAL) {
    for (const pattern of rule.patterns) {
      checks++
      const hit = text.match(pattern)
      if (hit) {
        failures.push(
          `${file} — ${rule.id}\n      وُجد: «${hit[0]}»\n      السبب: ${rule.why}`,
        )
      }
    }
  }
}

// ٥-ب) وكل كتلة «وصول ودفع» تقول الحقيقة كاملة **في موضع واحد**.
for (const block of ACCESS_BLOCKS) {
  const text = readFileSync(block.file, 'utf8')
  const body = extractBlock(text, block.start, block.end)

  checks++
  if (body === null) {
    failures.push(
      `${block.file} — كتلة «${block.id}» غائبة: لم يُعثر على مبتدئها.\n` +
        `      السبب: السطح فقد بيان الوصول والدفع كليًا — والغياب أسوأ من الادّعاء البائت.`,
    )
    continue
  }

  // تأكيد مضادّ (§4.2): كتلة فارغة أو بلا حدّ تُمرّر كل ما بعدها مجّانًا.
  checks++
  if (body.trim().length < 60) {
    failures.push(
      `${block.file} — كتلة «${block.id}» فارغة أو أقصر من أن تحمل بيانًا (${body.trim().length} حرفًا).\n` +
        `      السبب: كتلة فارغة تجعل فحوص الاقتران أدناه تمرّ بلا مضمون.`,
    )
    continue
  }
  checks++
  if (body.length > 3000) {
    failures.push(
      `${block.file} — كتلة «${block.id}» انفلتت حدودها (${body.length} حرفًا).\n` +
        `      السبب: مستخرِج ابتلع الملف يُرضي الاقتران من مواضع متفرّقة — وهو بعينه ما يمنعه هذا الفحص.`,
    )
    continue
  }
  checks++
  if (block.leak.pattern.test(body)) {
    failures.push(
      `${block.file} — كتلة «${block.id}» تسرّبت إليها ${block.leak.what}.\n` +
        `      السبب: الحدّ لم يُغلق، فما بعد الكتلة صار داخلها.`,
    )
    continue
  }

  for (const need of block.must) {
    checks++
    if (!need.pattern.test(body)) {
      failures.push(
        `${block.file} — كتلة «${block.id}» ناقصة: ${need.what}\n` +
          `      السبب: بيان الوصول يُقال كاملًا في موضع واحد — نصفه في مكان ونصفه في آخر ليس بيانًا (AGENTS.md §0.1 · DEC-015).`,
      )
    }
  }
}

// ٥-ج) الصيغة المعتمدة وحدها — وحاضرة في قاموس التطبيق كما هي على الموقع.
const APPROVED_PREMIUM = [
  { file: 'src/i18n/dict/reveal.ts', pattern: /يشمل تحديثات قِمّة — بلا اشتراك شهري/u, what: 'نصّ Premium المعتمد (عربي)' },
  { file: 'src/i18n/dict/reveal.ts', pattern: /Includes Qimmah updates — no monthly subscription/u, what: 'نصّ Premium المعتمد (إنجليزي)' },
  { file: CANONICAL_LEGAL, pattern: /يشمل تحديثات قِمّة — بلا اشتراك شهري/u, what: 'نفس الصيغة على الشروط القانونية (عربي)' },
  { file: CANONICAL_LEGAL, pattern: /includes Qimmah updates — no monthly subscription/iu, what: 'نفس الصيغة على الشروط القانونية (إنجليزي)' },
]
for (const a of APPROVED_PREMIUM) {
  checks++
  if (!a.pattern.test(readFileSync(a.file, 'utf8'))) {
    failures.push(
      `${a.file} — الصيغة المعتمدة مفقودة: ${a.what}\n` +
        `      السبب: §0.1 يعتمد صيغة واحدة لا غير، والتطبيق والموقع يقولانها بنفس اللفظ.`,
    )
  }
}

// ٥-د) تأكيد مضادّ (§4.2) — قائمة المنع لم تصر قاعدة عمياء.
// النصّ **الصحيح** يحمل «اشتراك شهري» و«subscription» و«free» — ولو كان المنع
// بالكلمة المفتاحية لأسقط الصياغة المعتمدة نفسها. فيُهاجَم المنع بها:
const APPROVED_SENTENCES = [
  'يشمل تحديثات قِمّة — بلا اشتراك شهري',
  'Includes Qimmah updates — no monthly subscription',
  'قِمّة Premium عملية شراء واحدة، وليست اشتراكًا شهريًا ولا تجديدًا تلقائيًا.',
  'Qimmah Premium is a one-time purchase — not a monthly subscription and not an auto-renewing plan.',
  'مجانًا بلا حساب وبلا دفع: إعداد ملفك الشخصي، وتوليد خطتك، ومعاينة الخطة كاملةً، وإنشاء الحساب.',
  'Free, with no account and no payment: setting up your profile, generating your plan, previewing the full plan, and creating an account.',
]
for (const sentence of APPROVED_SENTENCES) {
  for (const rule of STALE_COMMERCIAL) {
    for (const pattern of rule.patterns) {
      checks++
      const hit = sentence.match(pattern)
      if (hit) {
        failures.push(
          `التأكيد المضادّ سقط — ${rule.id} يمنع الصياغة المعتمدة نفسها.\n` +
            `      الجملة: «${sentence}»\n      المطابَق: «${hit[0]}»\n` +
            `      السبب: المنع يصف **جملة بعينها** لا كلمة مفتاحية (§4.2). قاعدة تُسقِط النصّ الصحيح قاعدة رخوة.`,
        )
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`\n❌ إثبات صدق الموقع فشل — ${failures.length} مخالفة من ${checks} فحصًا:\n`)
  for (const f of failures) console.error(`   • ${f}\n`)
  console.error(
    '   المرجع: docs/site/SITE-COPY-ALIGNMENT.md · AGENTS.md §0.1 · DEC-015 (01-DECISIONS.md) · 05-CLAIMS.md\n',
  )
  process.exit(1)
}

console.log(
  `✅ إثبات صدق الموقع: ${checks} فحصًا على ${htmlFiles.length} صفحات و${COMMERCIAL_SURFACES.length} أسطح تجارية ` +
    `(${ACCESS_BLOCKS.length} كتلة «وصول ودفع») — لا تصريح غير صحيح، ولا بريد قديم، ولا ادّعاء تجاري بائت.`,
)
