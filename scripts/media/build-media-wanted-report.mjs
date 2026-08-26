#!/usr/bin/env node
/**
 * تقرير «الوسائط المطلوبة» — [مهمة الصقل §4]
 *
 * قرار المؤسس: **إيقاف توليد الرسوم** والتحوّل إلى وسائط تمارين حقيقية
 * مرخّصة. هذا التقرير هو أداة الاستيراد القادمة: كل تمرين لا يملك تصويرًا
 * فوتوغرافيًا حقيقيًا لحركته، بالحقول التي يحتاجها من سيرخّص الوسائط
 * (الاسم · المعرّف · العضلة · المعدّات) — مولَّدًا من بيان الإنتاج الحيّ
 * لا من قائمة يدوية تشيخ.
 *
 * الفئات الثلاث المطلوبة، مرتّبة بأولوية الاستبدال:
 *   ① illustration — رسم حركة داخلي (بديل صادق مؤقّت، ليس تصويرًا)
 *   ② diagram      — رسم جهاز داخلي (بطاقة جهاز بلا لقطة جهاز مرخّصة)
 *   ③ near-variant — لقطة حقيقية لكن لتنويعة قريبة لا للتمرين بعينه
 *                     (موثَّقة في exerciseMedia.ts؛ تُحسَّن لا تُستعجل)
 *
 * التشغيل:  node scripts/media/build-media-wanted-report.mjs
 * المخرج:   docs/content/MEDIA-IMPORT-WANTED.md + .csv (للجداول)
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// حمّل الكتالوج والبيان الحيَّين عبر esbuild (ملفات TS).
const tmp = mkdtempSync(join(tmpdir(), 'media-wanted-'))
const entry = join(tmp, 'entry.ts')
writeFileSync(entry, `
export { exercises } from '@/data/exercises'
export { EXERCISE_PRODUCTION_MANIFEST } from '@/data/exerciseProductionManifest.generated'
`)
await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(tmp, 'out.mjs'),
  alias: { '@': resolve(ROOT, 'src') },
  logLevel: 'silent',
})
const { exercises, EXERCISE_PRODUCTION_MANIFEST } = await import(join(tmp, 'out.mjs'))

// التنويعات القريبة الموثَّقة: لقطة حقيقية لحركة مجاورة لا مطابقة.
// المصدر: مراجعة exerciseMedia.ts في مسح المنتج — تبقى مقبولة مؤقتًا
// لأنها من نفس عائلة الحركة، وتدخل التقرير كي تُستبدل عند توفّر ترخيص.
const NEAR_VARIANTS = {
  'cable-hammer-curl': 'الصورة الحالية: مرجحة كيبل على مسند (preacher) — القبضة والمسند يختلفان',
  'neutral-grip-pulldown': 'الصورة الحالية: سحب علوي واسع — القبضة تختلف',
}

const rows = []
for (const ex of exercises) {
  const entry = EXERCISE_PRODUCTION_MANIFEST[ex.id]
  if (!entry) continue
  const kind = entry.image?.kind ?? 'none'
  let category = null
  let note = ''
  if (kind === 'illustration') { category = 'illustration'; note = 'رسم حركة داخلي — يلزم تصوير حقيقي' }
  else if (kind === 'diagram') { category = 'diagram'; note = 'رسم جهاز داخلي — تلزم لقطة جهاز مرخّصة' }
  else if (NEAR_VARIANTS[ex.id]) { category = 'near-variant'; note = NEAR_VARIANTS[ex.id] }
  else if (entry.imageStatus !== 'APPROVED') { category = 'missing'; note = 'بلا أي أصل بصري' }
  if (!category) continue
  rows.push({
    id: ex.id,
    nameAr: ex.nameAr,
    nameEn: ex.nameEn,
    muscle: ex.primaryMuscle,
    equipment: (ex.equipment ?? []).join(' + ') || '—',
    category,
    note,
  })
}

const ORDER = { missing: 0, illustration: 1, diagram: 2, 'near-variant': 3 }
rows.sort((a, b) => (ORDER[a.category] - ORDER[b.category]) || a.id.localeCompare(b.id))
const byCat = (c) => rows.filter((r) => r.category === c)

const md = `# الوسائط المطلوبة — قائمة استيراد التصوير المرخّص

> ⚙️ مولَّد آليًا من بيان الإنتاج الحيّ — لإعادة التوليد:
> \`node scripts/media/build-media-wanted-report.mjs\`
>
> **قرار المؤسس [مهمة الصقل §4]:** إيقاف توليد الرسوم الداخلية والتحوّل إلى
> وسائط حقيقية مرخّصة. الرسوم القائمة تبقى **بديلًا صادقًا مؤقتًا** (تقول عن
> نفسها إنها رسم) حتى يصل بديلها المرخّص من هذه القائمة.

| الفئة | العدد | المطلوب |
|---|---|---|
| رسم حركة داخلي | ${byCat('illustration').length} | تصوير حقيقي للحركة (بداية/نهاية أو مقطع) |
| رسم جهاز داخلي | ${byCat('diagram').length} | لقطة جهاز مرخّصة قابلة لإعادة التوزيع |
| تنويعة قريبة | ${byCat('near-variant').length} | لقطة مطابقة للتمرين بعينه |
| بلا أصل إطلاقًا | ${byCat('missing').length} | — |
| **المجموع** | **${rows.length}** من ${exercises.length} | |

${['illustration', 'diagram', 'near-variant', 'missing'].map((cat) => {
  const list = byCat(cat)
  if (!list.length) return ''
  const title = { illustration: 'رسم حركة داخلي', diagram: 'رسم جهاز داخلي', 'near-variant': 'تنويعة قريبة', missing: 'بلا أصل' }[cat]
  return `\n## ${title} (${list.length})\n\n| المعرّف | الاسم | Name | العضلة | المعدّات |\n|---|---|---|---|---|\n${list.map((r) => `| \`${r.id}\` | ${r.nameAr} | ${r.nameEn} | ${r.muscle} | ${r.equipment} |`).join('\n')}\n`
}).join('')}
## شروط الاستيراد (تذكير — لا تتغيّر)

- كل أصل جديد يمرّ بسجلّ الحقوق (\`media-rights-proof\`) بحكم CLEARLY-LICENSED
  أو IN-HOUSE — لا UNKNOWN أبدًا (docs/content/MEDIA-RIGHTS.md).
- بطاقات الأجهزة لا تقبل صورة وزن حرّ «تشبهها» — الرفض الصادق قبل الصورة الخاطئة.
- لا وسائط WorkoutX — قرار مؤسس مقفل (حُذفت لعلامتها المائية).
`

writeFileSync(resolve(ROOT, 'docs/content/MEDIA-IMPORT-WANTED.md'), md)
const csv = ['id,name_ar,name_en,muscle,equipment,category,note',
  ...rows.map((r) => [r.id, r.nameAr, r.nameEn, r.muscle, r.equipment, r.category, r.note]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
writeFileSync(resolve(ROOT, 'docs/content/MEDIA-IMPORT-WANTED.csv'), csv)
console.log(`✅ ${rows.length} تمرينًا في قائمة الاستيراد → docs/content/MEDIA-IMPORT-WANTED.{md,csv}`)
console.log(`   رسم حركة ${byCat('illustration').length} · رسم جهاز ${byCat('diagram').length} · تنويعة ${byCat('near-variant').length} · بلا أصل ${byCat('missing').length}`)
