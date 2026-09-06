// مولّد تقرير حالة وسائط التمارين → docs/media/EXERCISE-MEDIA-STATUS.md
//
// يقيس ولا يجمّل: كل رقم في التقرير مشتقّ لحظة التوليد من
//   • src/data/exerciseProductionManifest.generated.ts (ما يقرأه التطبيق فعلًا)
//   • scripts/media/provenance-manifest.json (سجلّ الحقوق مع النوع والحالة)
//   • src/data/workoutTemplates*.ts (كم قالبًا جاهزًا يعرض هذا التمرين — إشارة الأولوية)
// وحارسه npm run test:media-provenance يسقط إن انحرف رقم منشور عن المقيس.
//
// التشغيل: npm run build:media-status
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { exercises } from '@/data/exercises'
import { EXERCISE_PRODUCTION_MANIFEST } from '@/data/exerciseProductionManifest.generated'

declare const __OUT_DIR__: string
const ROOT = __OUT_DIR__

interface Row {
  id: string
  localPath: string
  mediaKind: string
  rightsStatus: string
  license: string | null
  sourceId: string | null
  upstreamUrl: string | null
  evidenceUrl: string | null
}

const registry = JSON.parse(
  readFileSync(resolve(ROOT, 'scripts/media/provenance-manifest.json'), 'utf8'),
) as { entries: Row[]; reviewedAt: string }
const byPath = new Map(registry.entries.map((r) => [r.localPath, r]))

// إشارة الأولوية: عدد مرّات ورود مُعرّف التمرين في القوالب الجاهزة — تمرين يظهر في
// خمسة قوالب يعرض بديله على خمسة أضعاف المستخدمين. إشارة مقيسة لا رأي.
// ملفات القوالب تُقرأ بتسامح: بعضها قد يهبط في موجة أخرى، وغيابه يخفض إشارة الترتيب
// ولا يُسقط التقرير. الغائب يُذكر في التقرير نفسه حتى لا يُقرأ ترتيبٌ ناقص على أنه كامل.
const TEMPLATE_FILES = ['src/data/workoutTemplates.ts', 'src/data/workoutTemplatesBuiltIn.ts']
const templatesRead: string[] = []
const templatesAbsent: string[] = []
const templateSource = TEMPLATE_FILES.map((p) => {
  try {
    const text = readFileSync(resolve(ROOT, p), 'utf8')
    templatesRead.push(p)
    return text
  } catch {
    templatesAbsent.push(p)
    return ''
  }
}).join('\n')
const templateHits = (id: string) => templateSource.split(`'${id}'`).length - 1

// مسح نقطة-زمن لمكتبة المؤسس الخارجية — خارج المستودع، فلا يُعاد قياسه في CI.
interface Survey {
  surveyedAt: string
  path: string
  pipeline: { nature: string; evidence: string[]; satisfiesRealPhotography: boolean; note: string }
  counts: Record<string, number>
  method: string
}
const survey = JSON.parse(
  readFileSync(resolve(ROOT, 'scripts/media/external-library-survey.json'), 'utf8'),
) as Survey

const KIND_LABEL: Record<string, string> = {
  REAL_PHOTO: 'صورة حقيقية',
  IN_HOUSE_ILLUSTRATION: 'رسم حركة داخلي',
  IN_HOUSE_DIAGRAM: 'مخطّط جهاز داخلي',
  NONE: 'لا وسائط',
}

interface Line {
  id: string
  nameAr: string
  nameEn: string
  equipment: string
  kind: string
  paths: string[]
  license: string
  source: string
  rights: string
  uiProvenance: boolean
  hits: number
}

const nameById = new Map(exercises.map((e) => [e.id, e]))
const lines: Line[] = []

for (const entry of Object.values(EXERCISE_PRODUCTION_MANIFEST)) {
  const ex = nameById.get(entry.exerciseId)
  const paths = entry.image ? [entry.image.start, entry.image.end].filter((p): p is string => Boolean(p)) : []
  const rows = paths.map((p) => byPath.get(p)).filter((r): r is Row => Boolean(r))
  const kinds = new Set(rows.map((r) => r.mediaKind))
  const kind = entry.imageStatus !== 'APPROVED' || rows.length === 0 ? 'NONE' : [...kinds].join('+')
  // [MEDIA-IDENTITY-001] بلا أصل مشحون لا شيء يُثبَت: الحالة NONE تُعدّ فوق، ولا تُحسب «غير مثبتة الحقوق»
  // — وهو تعريف الإثبات نفسه (media-provenance-proof: rows.length === paths.length).
  const rights =
    rows.length === 0 ? 'VERIFIED' : rows.every((r) => r.rightsStatus === 'VERIFIED') ? 'VERIFIED' : 'UNRESOLVED'
  lines.push({
    id: entry.exerciseId,
    nameAr: ex ? ex.nameAr : '—',
    nameEn: ex ? ex.nameEn : '—',
    equipment: ex ? (ex.equipment ?? []).join('/') || '—' : '—',
    kind,
    paths,
    license: rows[0]?.license ?? '—',
    source: rows[0]?.sourceId ?? '—',
    rights,
    uiProvenance: Boolean(entry.imageSource) && Boolean(entry.imageLicense),
    hits: templateHits(entry.exerciseId),
  })
}

lines.sort((a, b) => a.id.localeCompare(b.id))

const realPhoto = lines.filter((l) => l.kind === 'REAL_PHOTO').length
const fallback = lines.filter((l) => l.kind === 'IN_HOUSE_ILLUSTRATION' || l.kind === 'IN_HOUSE_DIAGRAM').length
const none = lines.filter((l) => l.kind === 'NONE').length
const verified = lines.filter((l) => l.kind !== 'NONE' && l.rights === 'VERIFIED').length
const unresolved = lines.filter((l) => l.rights === 'UNRESOLVED').length
const uiNull = lines.filter((l) => l.kind !== 'NONE' && !l.uiProvenance)

// أصول يحملها المستودع ولا تصل شاشة: صفٌّ في سجلّ الحقوق لا يشير إليه أي مدخل APPROVED.
// ليست خطرًا — لكنها وزن يُحمل بلا مقابل، وذكرها أصدق من السكوت عنها.
const shipped = new Set<string>()
for (const e of Object.values(EXERCISE_PRODUCTION_MANIFEST)) {
  if (e.imageStatus !== 'APPROVED' || !e.image) continue
  shipped.add(e.image.start)
  if (e.image.end) shipped.add(e.image.end)
}
const orphans = registry.entries.filter((r) => !shipped.has(r.localPath))

const acquisition = lines
  .filter((l) => l.kind !== 'REAL_PHOTO')
  .sort((a, b) => b.hits - a.hits || a.id.localeCompare(b.id))

const esc = (s: string) => s.replace(/\|/g, '\\|')

const doc = `# حالة وسائط التمارين — قياس لا تقدير

> مُولَّد آليًا: \`npm run build:media-status\` · حارسه \`npm run test:media-provenance\`.
> **لا تُحرّر الأرقام يدويًا** — الحارس يسقط إن خالف رقمٌ منشور المقيسَ (\`REPORT_COUNT_DRIFT\`).
> تاريخ مراجعة سجلّ الحقوق: ${registry.reviewedAt}

## ١. الأرقام الأربعة

\`\`\`
REAL_PHOTO_COUNT = ${realPhoto}
VERIFIED_LICENSE_COUNT = ${verified}
FALLBACK_COUNT = ${fallback}
UNRESOLVED_COUNT = ${unresolved}
\`\`\`

على مستوى **التمرين** (${lines.length} تمرينًا في الكتالوج):

| القيمة | العدد | ما تعنيه بالضبط |
|---|---:|---|
| \`REAL_PHOTO_COUNT\` | ${realPhoto} | تمارين تعرض **فوتوغرافيا لشخص حقيقي** يؤدّي الحركة. |
| \`FALLBACK_COUNT\` | ${fallback} | تمارين تعرض **رسمًا متجهيًا داخليًا** — ${lines.filter((l) => l.kind === 'IN_HOUSE_ILLUSTRATION').length} رسم حركة + ${lines.filter((l) => l.kind === 'IN_HOUSE_DIAGRAM').length} مخطّط جهاز. |
| \`VERIFIED_LICENSE_COUNT\` | ${verified} | تمارين كلّ أصولها المشحونة تحمل ترخيصًا معلنًا ودليلًا قابلًا للفتح. |
| \`UNRESOLVED_COUNT\` | ${unresolved} | تمارين تُعرض بأصل لا يمكن إثبات حقوقه. |
| بلا وسائط | ${none} | تمارين لا تعرض شيئًا (حالة فارغة صادقة). |

وعلى مستوى **الملف** (${registry.entries.length} أصلًا في سجلّ الحقوق):

| النوع | عدد الملفات |
|---|---:|
| \`REAL_PHOTO\` | ${registry.entries.filter((r) => r.mediaKind === 'REAL_PHOTO').length} |
| \`IN_HOUSE_ILLUSTRATION\` | ${registry.entries.filter((r) => r.mediaKind === 'IN_HOUSE_ILLUSTRATION').length} |
| \`IN_HOUSE_DIAGRAM\` | ${registry.entries.filter((r) => r.mediaKind === 'IN_HOUSE_DIAGRAM').length} |
| \`rightsStatus = VERIFIED\` | ${registry.entries.filter((r) => r.rightsStatus === 'VERIFIED').length} |
| \`rightsStatus = UNRESOLVED\` | ${registry.entries.filter((r) => r.rightsStatus === 'UNRESOLVED').length} |

### ما يقوله هذا عن الالتزام السابق

التزام \`39fd151\` أعلن «صورة لكل تمرين — ١٨١/١٨١ بنمط داخلي موحّد». **الرقم صحيح
والوصف صحيح**: ١٨١ تمرينًا تعرض شيئًا، و«بنمط داخلي موحّد» تصف الرسوم. لكن من يقرأ
«صورة لكل تمرين» يفهم فوتوغرافيا. الحقيقة المقيسة: **${realPhoto} فوتوغرافيا و${fallback} رسمًا**.

## ٢. سلّم المصادر المطلوب — وأين نقف منه

| الرتبة | المصدر المطلوب | ما لدينا اليوم |
|---|---|---|
| ١ | فوتوغرافيا حقيقية نظيفة الحقوق | ${realPhoto} تمرينًا من \`yuhonas/free-exercise-db\` (Unlicense معلن) |
| ٢ | أصول مصنّع رسمية بإذن إعادة استخدام | **صفر** — لا اتفاق مع أي مصنّع |
| ٣ | صور نظيفة الحقوق من مصدر معتبر | **صفر** |
| ٤ | رسم محايد كبديل معلَن | ${fallback} تمرينًا (رسوم داخلية نملك حقوقها كاملة) |

### تحفّظ حقوقي يجب أن يعرفه المؤسس

الرتبة ١ تستند إلى **ترخيص المستودع المُعلن** (\`Unlicense\` على \`yuhonas/free-exercise-db\`،
وجذره \`wrkout/exercises.json\`). **لا يوجد في المستودع إقرار عارض ولا منحة مصوّر** لأيٍّ من
الـ${registry.entries.filter((r) => r.mediaKind === 'REAL_PHOTO').length} لقطة. الوسم \`REAL_PHOTO\` يصف **شكل الأصل** (فوتوغرافيا لا رسمًا) ولا يدّعي
أكثر. إن كان الإطلاق التجاري يتطلّب سلسلة حقوق أقوى من «ترخيص مستودع»، فهذه مراجعة
قانونية مفتوحة — تُحسم بقرار مؤسس لا باجتهاد وكيل.

## ٣. نقص واجهة موثَّق — \`UI_PROVENANCE_NULL\`

سلسلة الحقوق كاملة في \`scripts/media/provenance-manifest.json\` لكل أصل مشحون.
غير أنّ **المانيفست الذي يقرأه التطبيق** (\`src/data/exerciseProductionManifest.generated.ts\`)
يحمل \`imageSource: null\` و\`imageLicense: null\` لـ**${uiNull.length}** بطاقة جهاز — فالتطبيق
لا يرى نَسَبها ولو كان موجودًا على القرص.

### الإصلاح المطلوب (خارج حارة هذا الإثبات)

في \`scripts/exercise/build-exercise-production-manifest.ts\` السطران ٩٦–١٠٠: فرع
\`image?.kind === 'illustration'\` يملأ المصدر والترخيص، وفرع \`'diagram'\` لا يفعل فيسقط
إلى \`img.source ?? null\`. يكفي أن يشمل الشرطُ \`'diagram'\` بقيمة
\`'qimmah-inhouse-schematic'\`، ثم \`npm run build:exercise-production-manifest\`.
بعده تُفرَّغ قائمة الاستثناء في \`scripts/media/media-provenance-proof.ts\` وتسقط
الاثنتان معًا بـ\`ALLOWLIST_STALE\` إن نُسي تفريغها.

القائمة محروسة: مُعرَّف سادس وعشرون بلا نَسَب يسقط بـ\`UI_PROVENANCE_NULL\`.

## ٤. أصول محمولة لا تصل شاشة (${orphans.length})

صفوف في سجلّ الحقوق لا يشير إليها أي مدخل \`APPROVED\`. لا خطر حقوقي فيها — لكنها
وزن يُشحن بلا مقابل، وذكرها أصدق من السكوت عنها. **لا تُحذف بيد وكيل**.

| الأصل | المسار | النوع |
|---|---|---|
${orphans.map((r) => `| \`${r.id}\` | \`${r.localPath}\` | ${KIND_LABEL[r.mediaKind] ?? r.mediaKind} |`).join('\n')}

## ٥. قائمة الاقتناء بالأولوية — أين تحتاج فوتوغرافيا حقيقية أولًا

مرتّبة بعدد مرّات ظهور التمرين في القوالب الجاهزة — أي بعدد المستخدمين الذين سيرون
البديل. \`0\` يعني أنه لا يظهر في قالب جاهز ويصل عبر الاختيار اليدوي. التعادل يُفكّ أبجديًا.

مصادر الإشارة المقروءة: ${templatesRead.map((p) => `\`${p}\``).join(' · ') || '**لا شيء**'}.${
  templatesAbsent.length
    ? `\n> ⚠️ **ترتيب ناقص:** ${templatesAbsent.map((p) => `\`${p}\``).join(' · ')} غير موجود وقت التوليد، فأرقام العمود الأخير أقلّ من الحقيقة. أعِد التوليد بعد هبوطه.`
    : ''
}

| # | التمرين | الاسم الإنجليزي | المعدّات | النوع الحالي | ظهور في القوالب |
|---:|---|---|---|---|---:|
${acquisition.map((l, i) => `| ${i + 1} | ${esc(l.nameAr)} | ${esc(l.nameEn)} | ${esc(l.equipment)} | ${KIND_LABEL[l.kind] ?? l.kind} | ${l.hits} |`).join('\n')}

## ٦. مكتبة المؤسس الخارجية — الكلفة الحقيقية للاستيراد

مسح نقطة-زمن (${survey.surveyedAt}) لـ\`${survey.path}\`.
**قُرئت \`manifests/production_queue.json\` و\`PRODUCTION_STANDARD.md\` فقط — لم يُنسخ ملف ثنائي واحد.**
هذا المسح خارج المستودع، فلا يُعاد قياسه في CI؛ رقمه يشيخ ويُعاد قياسه يدويًا.

### أولًا وقبل أي رقم: هذه مكتبة **توليد ذكاء اصطناعي**، لا فوتوغرافيا

${survey.pipeline.evidence.map((e) => `- ${e}`).join('\n')}

${survey.pipeline.note}

**أي استيراد منها يهبط في الرتبة ٤ من سلّم المصادر (رسم/توليد محايد كبديل معلَن)،
لا الرتبة ١.** وسمها الصحيح عند الاستيراد يكون نوعًا ثالثًا معلنًا (مثل
\`AI_GENERATED\`) — لا \`REAL_PHOTO\` بحال. وسمها \`REAL_PHOTO\` هو بعينه الكذب الذي
يمنعه \`PHOTO_WITHOUT_SOURCE\`.

### ثانيًا: ما الجاهز فعلًا

| القياس | العدد | من ١٨١ |
|---|---:|---|
| صفوف في طابور الإنتاج | ${survey.counts.queueRows} | — |
| \`status = approved\` | ${survey.counts.statusApproved} | ${survey.counts.queueRows} |
| \`status = generated_pending_qa\` | ${survey.counts.statusGeneratedPendingQa} | ${survey.counts.queueRows} |
| \`status = queued\` (لم يُولَّد بعد) | ${survey.counts.statusQueued} | ${survey.counts.queueRows} |
| صفوف لها ملفات صور على القرص | ${survey.counts.rowsWithImageFilesOnDisk} | ${survey.counts.queueRows} |
| صفوف بلا مسار صورة إطلاقًا | ${survey.counts.rowsWithNoImagePathAtAll} | ${survey.counts.queueRows} |

### ثالثًا: كم منها ينطبق على كتالوجنا

المكتبة مبنية على مصنّف مختلف (\`Saudi_Practical_Exercise_Database_550\`) — أسماؤها
ليست أسماء كتالوجنا.

| القياس | العدد |
|---|---:|
| تطابق باسم إنجليزي **حرفي** | ${survey.counts.mapsToCatalogByExactEnglishName} |
| تطابق يتجاهل ترتيب الكلمات | ${survey.counts.mapsToCatalogByWordOrderInsensitiveName} |
| مُعرّفات كتالوج مختلفة يمكن بلوغها | ${survey.counts.distinctCatalogIdsReachable} |
| صفوف **لها ملفات** وتنطبق على الكتالوج | ${survey.counts.rowsWithFilesThatMapToCatalog} |
| صفوف **معتمدة** وتنطبق على الكتالوج | ${survey.counts.approvedRowsThatMapToCatalog} |

طريقة القياس: ${survey.method}

### الخلاصة بالأرقام

- **اليوم**، ما يمكن استيراده بلا عمل يدوي: **${survey.counts.approvedRowsThatMapToCatalog} تمارين** (معتمدة + تنطبق على مُعرّف كتالوج).
- **بعد مراجعة الجودة** للـ${survey.counts.statusGeneratedPendingQa} المعلّقة: يرتفع السقف إلى **${survey.counts.rowsWithFilesThatMapToCatalog} تمرينًا**.
- **الباقي ${survey.counts.statusQueued} صفًّا لم يُولَّد بعد** — الكلفة توليد ومراجعة، لا استيراد.
- وأيًّا كان العدد، يبقى **${survey.counts.queueRows - survey.counts.mapsToCatalogByWordOrderInsensitiveName} صفًّا** يحتاج **جدول ربط أسماء يُكتب بيد** قبل أن يعرف الكودُ لأي تمرين هو.

## ٧. الجدول الكامل — ${lines.length} تمرينًا

| المُعرّف | الاسم | النوع | المصدر | الترخيص | الحقوق | نَسَب مرئي للتطبيق |
|---|---|---|---|---|---|---|
${lines
  .map(
    (l) =>
      `| \`${l.id}\` | ${esc(l.nameAr)} | ${KIND_LABEL[l.kind] ?? l.kind} | ${esc(l.source)} | ${esc(l.license)} | ${l.rights} | ${l.uiProvenance ? 'نعم' : 'لا'} |`,
  )
  .join('\n')}
`

mkdirSync(resolve(ROOT, 'docs/media'), { recursive: true })
writeFileSync(resolve(ROOT, 'docs/media/EXERCISE-MEDIA-STATUS.md'), doc)
console.log(`wrote docs/media/EXERCISE-MEDIA-STATUS.md — ${lines.length} exercises, ${registry.entries.length} assets`)
console.log(
  `REAL_PHOTO_COUNT=${realPhoto} VERIFIED_LICENSE_COUNT=${verified} FALLBACK_COUNT=${fallback} UNRESOLVED_COUNT=${unresolved} NO_IMAGE=${none}`,
)
