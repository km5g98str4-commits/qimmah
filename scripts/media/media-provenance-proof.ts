// إثبات نَسَب وسائط التمارين — [FOUNDER-QA] P0.
//
// السؤال الذي يجيب عنه: **هل يعرف التطبيق، برمجيًا، أنّ ما يعرضه رسمٌ لا صورة؟**
// وهل لكل أصل مشحون صفٌّ في سجلّ الحقوق يحمل ترخيصًا **ونوعًا**؟
//
// خلفية الشكوى: التزام «صورة لكل تمرين — ١٨١/١٨١ بنمط داخلي موحّد» جعل الرقم ١٨١
// يبدو تغطية فوتوغرافية كاملة، بينما ٦٢ منها رسوم متجهية داخلية. الرقم لم يكذب،
// لكنه لم يقل نوعه. هذا الحارس يجعل النوع **حقلًا مقيسًا** لا استنتاجًا من المسار.
//
// ما يُثبَت (كل فحص باسمه، والفشل يذكر الاسم):
//   PROVENANCE_ROW_MISSING   أصل مشحون بلا صفّ حقوق
//   ROW_FIELDS_INCOMPLETE    صفّ بلا ترخيص أو بنوع/حالة خارج المفردات
//   PHOTO_WITHOUT_SOURCE     صفّ موسوم REAL_PHOTO بلا منبع طرف ثالث (أو بايتاته متجهية)
//   UNRESOLVED_ASSET_SHIPPED أصل حقوقه غير مثبتة يصل شاشة المستخدم
//   KIND_MISMATCH            نوع البيان في مانيفست الإنتاج يخالف سجلّ الحقوق
//   UI_PROVENANCE_NULL       مدخل APPROVED بلا مصدر/ترخيص في المانيفست الذي يقرأه التطبيق
//   ALLOWLIST_STALE          مُعرَّف في قائمة الاستثناء لم يعد يحتاجها
//   REPORT_COUNT_DRIFT       أرقام التقرير تخالف المقيس
//
// التشغيل: npm run test:media-provenance
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { exercises } from '@/data/exercises'
import {
  EXERCISE_PRODUCTION_MANIFEST,
  type ExerciseProductionEntry,
} from '@/data/exerciseProductionManifest.generated'

declare const __OUT_DIR__: string
const ROOT = __OUT_DIR__

export const MEDIA_KINDS = ['REAL_PHOTO', 'IN_HOUSE_ILLUSTRATION', 'IN_HOUSE_DIAGRAM'] as const
export const RIGHTS_STATUSES = ['VERIFIED', 'UNRESOLVED'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export interface ProvenanceRow {
  id: string
  localPath: string
  upstreamUrl: string | null
  sourceId: string | null
  sourceRepo: string | null
  evidenceUrl: string | null
  license: string | null
  verdict: string
  mediaKind: string
  rightsStatus: string
  magicMime: string
  sha256: string
}

/** نوع الأصل المتوقَّع من `image.kind` في مانيفست الإنتاج. */
const KIND_FOR_PRODUCTION: Record<string, MediaKind> = {
  stills: 'REAL_PHOTO',
  diagram: 'IN_HOUSE_DIAGRAM',
  illustration: 'IN_HOUSE_ILLUSTRATION',
  // بطاقة حركة داخلية — رسم لا فوتوغرافيا، فتُصنَّف مع الرسوم لا مع اللقطات.
  card: 'IN_HOUSE_ILLUSTRATION',
}

// ─────────────────────────────────────────────────────────────────────────────
// قائمة استثناء معلَنة ومحروسة (§4.2)
//
// مانيفست الإنتاج — وهو ما يقرأه التطبيق — يُسقط المصدر والترخيص إلى null لبطاقات
// الأجهزة، لأن مولّده يشتقّهما من طبقة الصور القرصية التي لا تعرف الرسوم الداخلية.
// سلسلة الحقوق **موجودة كاملة** في scripts/media/provenance-manifest.json، لكن
// التطبيق لا يراها. هذا نقص واجهة موثَّق، لا ثغرة حقوق.
//
// القائمة **لا تنمو**: مُعرَّف جديد بلا نَسَب في الواجهة يسقط بـUI_PROVENANCE_NULL،
// ومُعرَّف فيها لم يعد يحتاجها يسقط بـALLOWLIST_STALE. الإصلاح النهائي سطران في
// scripts/exercise/build-exercise-production-manifest.ts (خارج حارة هذا الإثبات) —
// انظر docs/media/EXERCISE-MEDIA-STATUS.md §الإصلاح المطلوب.
// ─────────────────────────────────────────────────────────────────────────────
export const UI_PROVENANCE_NULL_ALLOWLIST: readonly string[] = [
  // فارغة. [CARDS-INTAKE] كتب نَسَب المخطّط والبطاقة صراحةً في مولّد مانيفست الإنتاج،
  // فلم يبقَ سجلّ APPROVED واحد بلا مصدر وترخيص يراهما التطبيق. الدَّين مسدَّد.
  // القائمة **لا تنمو**: أي مُعرَّف جديد بلا نَسَب يسقط بـUI_PROVENANCE_NULL.
]

export interface Inputs {
  production: Record<string, ExerciseProductionEntry>
  rows: ProvenanceRow[]
  allowlist: readonly string[]
  reportText: string | null
}

export interface Counts {
  catalogTotal: number
  realPhoto: number
  verifiedLicense: number
  fallback: number
  unresolved: number
  missing: number
}

/** الأرقام الأربعة على مستوى **التمرين** — لأن المؤسس يسأل عن ١٨١ تمرينًا لا ٣٠٥ ملفًا. */
export function measure(inputs: Inputs): Counts {
  const byPath = new Map(inputs.rows.map((r) => [r.localPath, r]))
  const entries = Object.values(inputs.production)
  let realPhoto = 0
  let verifiedLicense = 0
  let fallback = 0
  let unresolved = 0
  let missing = 0
  for (const e of entries) {
    if (e.imageStatus !== 'APPROVED' || !e.image) {
      missing++
      continue
    }
    const paths = [e.image.start, e.image.end].filter((p): p is string => Boolean(p))
    const rows = paths.map((p) => byPath.get(p)).filter((r): r is ProvenanceRow => Boolean(r))
    const allVerified = rows.length === paths.length && rows.every((r) => r.rightsStatus === 'VERIFIED')
    if (allVerified) verifiedLicense++
    else unresolved++
    if (rows.length && rows.every((r) => r.mediaKind === 'REAL_PHOTO')) realPhoto++
    else fallback++
  }
  return {
    catalogTotal: entries.length,
    realPhoto,
    verifiedLicense,
    fallback,
    unresolved,
    missing,
  }
}

/** كل الانتهاكات، كل واحد مسبوق باسم فحصه. قائمة فارغة = بوابة خضراء. */
export function violations(inputs: Inputs): string[] {
  const out: string[] = []
  const byPath = new Map(inputs.rows.map((r) => [r.localPath, r]))

  for (const row of inputs.rows) {
    if (!row.license || !String(row.license).trim()) {
      out.push(`ROW_FIELDS_INCOMPLETE ${row.id}: license is empty`)
    }
    if (!(MEDIA_KINDS as readonly string[]).includes(row.mediaKind)) {
      out.push(`ROW_FIELDS_INCOMPLETE ${row.id}: mediaKind="${row.mediaKind}" outside vocabulary`)
    }
    if (!(RIGHTS_STATUSES as readonly string[]).includes(row.rightsStatus)) {
      out.push(`ROW_FIELDS_INCOMPLETE ${row.id}: rightsStatus="${row.rightsStatus}" outside vocabulary`)
    }
    if (row.mediaKind === 'REAL_PHOTO') {
      if (!row.upstreamUrl || !row.sourceRepo || !row.evidenceUrl) {
        out.push(`PHOTO_WITHOUT_SOURCE ${row.id}: labelled REAL_PHOTO with no third-party upstream/repo/evidence`)
      }
      if (row.magicMime === 'image/svg+xml') {
        out.push(`PHOTO_WITHOUT_SOURCE ${row.id}: labelled REAL_PHOTO but the bytes are a vector drawing`)
      }
    }
  }

  for (const entry of Object.values(inputs.production)) {
    if (entry.imageStatus !== 'APPROVED') continue
    if (!entry.image || !entry.image.start) {
      out.push(`PROVENANCE_ROW_MISSING ${entry.exerciseId}: APPROVED with no image path`)
      continue
    }
    const paths = [entry.image.start, entry.image.end].filter((p): p is string => Boolean(p))
    const expected = KIND_FOR_PRODUCTION[entry.image.kind]
    for (const path of paths) {
      const row = byPath.get(path)
      if (!row) {
        out.push(`PROVENANCE_ROW_MISSING ${entry.exerciseId}: shipped asset "${path}" has no provenance row`)
        continue
      }
      if (row.rightsStatus === 'UNRESOLVED') {
        out.push(`UNRESOLVED_ASSET_SHIPPED ${entry.exerciseId}: "${path}" rights are unresolved yet the entry is APPROVED`)
      }
      if (expected && row.mediaKind !== expected) {
        out.push(
          `KIND_MISMATCH ${entry.exerciseId}: production kind="${entry.image.kind}" expects ${expected}, registry says ${row.mediaKind}`,
        )
      }
    }
    const hasUiProvenance = Boolean(entry.imageSource) && Boolean(entry.imageLicense)
    if (!hasUiProvenance && !inputs.allowlist.includes(entry.exerciseId)) {
      out.push(
        `UI_PROVENANCE_NULL ${entry.exerciseId}: APPROVED entry carries null imageSource/imageLicense and is not on the declared allowlist`,
      )
    }
    if (hasUiProvenance && inputs.allowlist.includes(entry.exerciseId)) {
      out.push(`ALLOWLIST_STALE ${entry.exerciseId}: now carries UI provenance — remove it from the allowlist`)
    }
  }

  if (inputs.reportText !== null) {
    const counts = measure(inputs)
    const expectations: [string, number][] = [
      ['REAL_PHOTO_COUNT', counts.realPhoto],
      ['VERIFIED_LICENSE_COUNT', counts.verifiedLicense],
      ['FALLBACK_COUNT', counts.fallback],
      ['UNRESOLVED_COUNT', counts.unresolved],
    ]
    for (const [label, value] of expectations) {
      // ليس «هل يحتوي النصّ الرقم الصحيح» — بل «هل كل ذكرٍ لهذا العدّاد يقول الرقم
      // الصحيح». الأولى تُرضى بلصق السطر في أي مكان مع بقاء رقم بائت فوقه.
      const seen = [...inputs.reportText.matchAll(new RegExp(`${label}\\s*=\\s*(\\d+)`, 'g'))].map((m) => Number(m[1]))
      if (seen.length === 0) {
        out.push(`REPORT_COUNT_DRIFT docs/media/EXERCISE-MEDIA-STATUS.md: "${label}" is not published at all`)
        continue
      }
      const wrong = seen.filter((n) => n !== value)
      if (wrong.length) {
        out.push(
          `REPORT_COUNT_DRIFT docs/media/EXERCISE-MEDIA-STATUS.md: "${label}" published as ${[...new Set(wrong)].join('/')}, measured ${value}`,
        )
      }
    }
  }
  return out
}

// ── تشغيل حقيقي ───────────────────────────────────────────────────────────────

const registryPath = resolve(ROOT, 'scripts/media/provenance-manifest.json')
const reportPath = resolve(ROOT, 'docs/media/EXERCISE-MEDIA-STATUS.md')
const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as { entries: ProvenanceRow[] }
const reportText = existsSync(reportPath) ? readFileSync(reportPath, 'utf8') : null

if (reportText === null) {
  throw new Error('REPORT_MISSING docs/media/EXERCISE-MEDIA-STATUS.md is absent — the counts have nowhere honest to live')
}

const live: Inputs = {
  production: EXERCISE_PRODUCTION_MANIFEST,
  rows: registry.entries,
  allowlist: UI_PROVENANCE_NULL_ALLOWLIST,
  reportText,
}

const found = violations(live)
if (found.length) {
  for (const v of found.slice(0, 40)) console.error(`  ✗ ${v}`)
  throw new Error(`MEDIA_PROVENANCE_PROOF_FAILED violations=${found.length}`)
}

const counts = measure(live)
if (counts.catalogTotal !== exercises.length) {
  throw new Error(
    `CATALOG_DRIFT production manifest has ${counts.catalogTotal} entries, catalog has ${exercises.length}`,
  )
}

// ── تأكيدات مضادّة: كل حارس أعلاه يجب أن **يسقط باسمه** حين تعود العلّة ──────────
// «سقوط غير مسمّى ليس إثباتًا» (§4.2): كل محاكاة تتحقّق من بادئة الاسم، لا من مجرّد الفشل.

const counter: [string, string, () => string[]][] = []
const clone = (): ProvenanceRow[] => registry.entries.map((r) => ({ ...r }))
const firstPhoto = () => clone().find((r) => r.mediaKind === 'REAL_PHOTO')!
const firstVector = () => clone().find((r) => r.mediaKind !== 'REAL_PHOTO')!

counter.push([
  'unsourced asset added to a shipped entry',
  'PROVENANCE_ROW_MISSING',
  () => {
    const rows = clone().filter((r) => r.localPath !== '/exercise-images/barbell-bench-press/0.jpg')
    return violations({ ...live, rows })
  },
])

counter.push([
  'in-house vector relabelled as a photograph',
  'PHOTO_WITHOUT_SOURCE',
  () => {
    const rows = clone()
    const target = rows.find((r) => r.id === firstVector().id)!
    target.mediaKind = 'REAL_PHOTO'
    return violations({ ...live, rows })
  },
])

counter.push([
  'a shipped asset whose rights cannot be established',
  'UNRESOLVED_ASSET_SHIPPED',
  () => {
    const rows = clone()
    rows.find((r) => r.id === firstPhoto().id)!.rightsStatus = 'UNRESOLVED'
    return violations({ ...live, rows })
  },
])

counter.push([
  'a provenance row stripped of its license',
  'ROW_FIELDS_INCOMPLETE',
  () => {
    const rows = clone()
    rows.find((r) => r.id === firstPhoto().id)!.license = ''
    return violations({ ...live, rows })
  },
])

counter.push([
  // كانت المحاكاة تقلّص قائمة الاستثناء بـslice(1). وبعد تفريغها صارت slice(1) = []
  // فلا تُنتج خرقًا، **فتمرّ المحاكاة بلا استحقاق** (§4.2). فتُهاجَم البيانات نفسها:
  // سجلّ APPROVED يُجرَّد من مصدره يجب أن يسقط، والقائمة فارغة لا تستره.
  'an APPROVED entry stripped of its UI provenance, with no allowlist to hide behind',
  'UI_PROVENANCE_NULL',
  () => {
    const production = structuredClone(live.production)
    const victim = Object.values(production).find((e) => e.imageStatus === 'APPROVED')!
    victim.imageSource = null
    victim.imageLicense = null
    return violations({ ...live, production })
  },
])

counter.push([
  'an allowlist entry that no longer needs the exception',
  'ALLOWLIST_STALE',
  () => violations({ ...live, allowlist: [...UI_PROVENANCE_NULL_ALLOWLIST, 'barbell-bench-press'] }),
])

counter.push([
  'a photo labelled by path shape instead of by source',
  'KIND_MISMATCH',
  () => {
    const rows = clone()
    // الالتفاف الواقعي: تبديل النوع في السجلّ دون لمس المسار — من يستنتج النوع من
    // امتداد الملف يمرّ، ومن يقرأ الحقل يسقط. الحارس يقرأ الحقل.
    for (const r of rows) if (r.mediaKind === 'IN_HOUSE_DIAGRAM') r.mediaKind = 'IN_HOUSE_ILLUSTRATION'
    return violations({ ...live, rows })
  },
])

counter.push([
  'a report whose published counts drifted from the measurement',
  'REPORT_COUNT_DRIFT',
  () => violations({ ...live, reportText: reportText.replace(/REAL_PHOTO_COUNT = \d+/, 'REAL_PHOTO_COUNT = 181') }),
])

counter.push([
  'a stale count left elsewhere while the correct line is pasted in',
  'REPORT_COUNT_DRIFT',
  // الالتفاف على «هل يحتوي النصّ الرقم الصحيح»: أبقِ السطر الصحيح وأضف بائتًا بجانبه.
  () => violations({ ...live, reportText: `${reportText}\n\nREAL_PHOTO_COUNT = 181\n` }),
])

counter.push([
  'a report that simply stops publishing one of the four counts',
  'REPORT_COUNT_DRIFT',
  () => violations({ ...live, reportText: reportText.replace(/UNRESOLVED_COUNT\s*=\s*\d+/g, 'UNRESOLVED_COUNT: n/a') }),
])

let counterPassed = 0
for (const [name, expectedCheck, run] of counter) {
  let result: string[]
  try {
    result = run()
  } catch (error) {
    throw new Error(
      `COUNTER_ASSERTION_UNNAMED "${name}" threw ${(error as Error).name} instead of failing by a named check: ${(error as Error).message}`,
    )
  }
  const named = result.filter((v) => v.startsWith(expectedCheck))
  if (named.length === 0) {
    throw new Error(
      `COUNTER_ASSERTION_DID_NOT_FIRE "${name}" produced no ${expectedCheck} violation (guard is toothless). Got: ${result.slice(0, 3).join(' | ') || '<none>'}`,
    )
  }
  counterPassed++
}

console.log('MEDIA_PROVENANCE_PROOF_OK')
console.log(
  `  registry rows=${registry.entries.length} REAL_PHOTO=${registry.entries.filter((r) => r.mediaKind === 'REAL_PHOTO').length} ` +
    `IN_HOUSE_ILLUSTRATION=${registry.entries.filter((r) => r.mediaKind === 'IN_HOUSE_ILLUSTRATION').length} ` +
    `IN_HOUSE_DIAGRAM=${registry.entries.filter((r) => r.mediaKind === 'IN_HOUSE_DIAGRAM').length}`,
)
console.log(
  `  exercises=${counts.catalogTotal} REAL_PHOTO_COUNT=${counts.realPhoto} VERIFIED_LICENSE_COUNT=${counts.verifiedLicense} ` +
    `FALLBACK_COUNT=${counts.fallback} UNRESOLVED_COUNT=${counts.unresolved} NO_IMAGE=${counts.missing}`,
)
console.log(`  checks=${violations(live).length === 0 ? 'all green' : 'FAILED'} counter_assertions=${counterPassed}/${counter.length}`)
console.log(`  ui_provenance_null_allowlist=${UI_PROVENANCE_NULL_ALLOWLIST.length} (declared, guarded, must shrink to 0)`)
