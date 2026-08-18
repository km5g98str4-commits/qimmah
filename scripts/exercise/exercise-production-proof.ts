// إثبات جاهزية مكتبة التمارين للإنتاج — البيانات الوصفية · المحتوى ثنائي اللغة · المانيفست الموحّد.
//
// كل تأكيد له اسم، وكل قاعدة قابلة للإزالة يحرسها **تأكيد مضادّ يسقط بفحص مسمّى** (الميثاق §4.2).
// المبدأ الحاكم: **لا مرجع يصل المستخدم بلا دليل** — لا صورة بلا حقوق، ولا فيديو بلا تحقّق.
// Run: npm run test:exercise-production
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { exercises, exerciseMap, LEGACY_EXERCISE_ID_MAP, isPlaceholderOnlyMedia } from '@/data/exercises'
import { EXERCISE_CUES } from '@/data/coaching/exerciseCues.generated'
import { EXERCISE_CUES_EN } from '@/data/coaching/exerciseCuesEn.generated'
import { getCue, hasCue } from '@/lib/coaching'
import { EXERCISE_VIDEO_REGISTRY } from '@/data/exerciseVideoRegistry'
import {
  EXERCISE_PRODUCTION_MANIFEST,
  PRODUCTION_CATALOG_TOTAL,
  PRODUCTION_IMAGE_GAP_IDS,
} from '@/data/exerciseProductionManifest.generated'
import { approvedImageFor, approvedVideoFor, hasApprovedVideo, videoEmbedUrl, productionEntryFor } from '@/lib/exerciseProductionMedia'

let passed = 0
function check(label: string, condition: unknown): void {
  assert.ok(condition, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

const CATALOG = exercises.length

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n① الكتالوج — لا تكرار ولا يتيم')
check(`الكتالوج القانوني ${CATALOG} تمرينًا`, CATALOG === 181)
check('كل المعرّفات فريدة', new Set(exercises.map((e) => e.id)).size === CATALOG)
check('لا اسم عربي مكرّر', new Set(exercises.map((e) => e.nameAr)).size === CATALOG)
check('لا اسم إنجليزي مكرّر', new Set(exercises.map((e) => e.nameEn)).size === CATALOG)
check('كل تمرين له اسم عربي وإنجليزي غير فارغ', exercises.every((e) => e.nameAr.trim() && e.nameEn.trim()))
check('كل تمرين له معدّة واحدة على الأقل', exercises.every((e) => e.equipment.length > 0))
check(
  'كل بديل مذكور يشير إلى تمرين موجود',
  exercises.every((e) => e.alternatives.every((a) => Boolean(exerciseMap[a] || LEGACY_EXERCISE_ID_MAP[a]))),
)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n② المحتوى ثنائي اللغة — العربية والإنجليزية بنفس الشكل')
check(`إرشاد عربي لكل تمرين (${CATALOG})`, exercises.every((e) => Boolean(EXERCISE_CUES[e.id])))
check(`إرشاد إنجليزي لكل تمرين (${CATALOG})`, exercises.every((e) => Boolean(EXERCISE_CUES_EN[e.id])))
check('لا إرشاد عربي يتيم (بلا تمرين)', Object.keys(EXERCISE_CUES).every((id) => Boolean(exerciseMap[id])))
check('لا إرشاد إنجليزي يتيم (بلا تمرين)', Object.keys(EXERCISE_CUES_EN).every((id) => Boolean(exerciseMap[id])))
check(
  'خطوات التنفيذ بين ٣ و٧ في اللغتين',
  exercises.every((e) => {
    const ar = EXERCISE_CUES[e.id].steps.length
    const en = EXERCISE_CUES_EN[e.id].steps.length
    return ar >= 3 && ar <= 7 && en >= 3 && en <= 7
  }),
)
check(
  'عدد الخطوات متطابق بين اللغتين لكل تمرين',
  exercises.every((e) => EXERCISE_CUES[e.id].steps.length === EXERCISE_CUES_EN[e.id].steps.length),
)
check(
  'الأخطاء الشائعة بين ٢ و٥ في اللغتين',
  exercises.every((e) => {
    const ar = EXERCISE_CUES[e.id].mistakes.length
    const en = EXERCISE_CUES_EN[e.id].mistakes.length
    return ar >= 2 && ar <= 5 && en >= 2 && en <= 5
  }),
)
check('ملاحظة سلامة واحدة غير فارغة في اللغتين', exercises.every((e) => Boolean(EXERCISE_CUES[e.id].safety) && Boolean(EXERCISE_CUES_EN[e.id].safety)))
check(
  'تنبيه العمود/الركبة متطابق بين اللغتين (لا تنبيه يضيع في الترجمة)',
  exercises.every((e) => Boolean(EXERCISE_CUES[e.id].spineCaution) === Boolean(EXERCISE_CUES_EN[e.id].spineCaution)),
)
check(
  'الإنجليزية إنجليزية فعلًا — لا حرف عربي في أي خطوة إنجليزية',
  exercises.every((e) => !/[؀-ۿ]/.test(EXERCISE_CUES_EN[e.id].steps.join(' '))),
)
check(
  'العربية عربية فعلًا — كل خطوة عربية تحمل حروفًا عربية',
  exercises.every((e) => EXERCISE_CUES[e.id].steps.every((s) => /[؀-ۿ]/.test(s))),
)
check('getCue الافتراضي يبقى عربيًا (توافق خلفي لكل نداء قائم)', /[؀-ۿ]/.test(getCue('barbell-bench-press').steps[0]))
check('getCue بالإنجليزية يعيد المحتوى الإنجليزي المؤلَّف', !/[؀-ۿ]/.test(getCue('barbell-bench-press', 'en').steps[0]))
check('hasCue يميّز اللغتين', hasCue('barbell-bench-press', 'en') && hasCue('barbell-bench-press', 'ar'))
check('معرّف مجهول يسقط للبديل الأمين لا لمحتوى مخترَع', getCue('qimmah-no-such-exercise', 'en').steps.length > 0 && !hasCue('qimmah-no-such-exercise', 'en'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n③ المانيفست الموحّد — تغطية كاملة بلا يتامى')
check(`المانيفست يغطّي الكتالوج كاملًا (${CATALOG})`, Object.keys(EXERCISE_PRODUCTION_MANIFEST).length === CATALOG)
check('كل تمرين له مدخل في المانيفست', exercises.every((e) => Boolean(EXERCISE_PRODUCTION_MANIFEST[e.id])))
check('لا مدخل يتيم في المانيفست', Object.keys(EXERCISE_PRODUCTION_MANIFEST).every((id) => Boolean(exerciseMap[id])))
check('العدّاد المعلن يطابق الكتالوج', PRODUCTION_CATALOG_TOTAL === CATALOG)
check('كل مدخل يحمل معرّفه الصحيح', exercises.every((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].exerciseId === e.id))
check('كل مدخل يحمل تاريخ مراجعة', exercises.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(EXERCISE_PRODUCTION_MANIFEST[e.id].reviewedAt)))

const VALID_STATUS = new Set(['APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'MISSING'])
check(
  'كل حالة صورة وفيديو من المفردات المعتمدة',
  exercises.every((e) => {
    const m = EXERCISE_PRODUCTION_MANIFEST[e.id]
    return VALID_STATUS.has(m.imageStatus) && VALID_STATUS.has(m.videoStatus)
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n④ الصور — لا أصل معتمد بلا حقوق، ولا حالة متفائلة')
const approvedImages = exercises.filter((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].imageStatus === 'APPROVED')
check('كل صورة معتمدة لها أصل فعلي', approvedImages.every((e) => Boolean(EXERCISE_PRODUCTION_MANIFEST[e.id].image)))
check(
  'كل صورة معتمدة مسارها عام يبدأ بـ/',
  approvedImages.every((e) => (EXERCISE_PRODUCTION_MANIFEST[e.id].image?.start ?? '').startsWith('/')),
)
check(
  'كل لقطة فوتوغرافية معتمدة تحمل ترخيصًا صريحًا',
  approvedImages
    .filter((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].image?.kind === 'stills')
    .every((e) => Boolean(EXERCISE_PRODUCTION_MANIFEST[e.id].imageLicense)),
)
check(
  'كل رسم داخلي معتمد مسارُه رسم متجهي (لا صورة فوتوغرافية تدّعي أنها جهاز)',
  approvedImages
    .filter((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].image?.kind === 'diagram')
    .every((e) => (EXERCISE_PRODUCTION_MANIFEST[e.id].image?.start ?? '').endsWith('.svg')),
)
check(
  'كل مدخل بلا صورة حالته MISSING صراحةً (لا حالة معتمدة بلا أصل)',
  exercises.every((e) => {
    const m = EXERCISE_PRODUCTION_MANIFEST[e.id]
    return m.image !== null || m.imageStatus === 'MISSING'
  }),
)
check(
  'قائمة الفجوة تطابق مجموع الناقص فعليًا',
  PRODUCTION_IMAGE_GAP_IDS.length === exercises.filter((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].imageStatus === 'MISSING').length,
)
check('كل معرّف في قائمة الفجوة معرّف قانوني', PRODUCTION_IMAGE_GAP_IDS.every((id) => Boolean(exerciseMap[id])))
check(
  'بطاقة الجهاز المحجوزة لا تُمنح لقطة وزن حرّ أبدًا',
  exercises
    .filter((e) => isPlaceholderOnlyMedia(e.id))
    .every((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].image?.kind !== 'stills'),
)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑤ الفيديو — لا مرجع بلا تحقّق، ولا مرجع غير معتمد يصل المستخدم')
check(`سجلّ الفيديو يغطّي الكتالوج كاملًا (${CATALOG})`, Object.keys(EXERCISE_VIDEO_REGISTRY).length === CATALOG)
check('لا مرجع فيديو يتيم', Object.keys(EXERCISE_VIDEO_REGISTRY).every((id) => Boolean(exerciseMap[id])))

const withVideoId = exercises.filter((e) => EXERCISE_VIDEO_REGISTRY[e.id].youtubeVideoId)
check(
  'كل معرّف فيديو يطابق شكل يوتيوب (١١ محرفًا)',
  withVideoId.every((e) => /^[A-Za-z0-9_-]{11}$/.test(EXERCISE_VIDEO_REGISTRY[e.id].youtubeVideoId ?? '')),
)
check(
  'كل مرجع فيديو يحمل عنوانًا مُتحقَّقًا وتاريخ تحقّق — لا معرّف بلا دليل',
  withVideoId.every((e) => {
    const v = EXERCISE_VIDEO_REGISTRY[e.id]
    return Boolean(v.videoTitle) && /^\d{4}-\d{2}-\d{2}$/.test(v.verifiedAt ?? '')
  }),
)
check(
  'الرابط القانوني مشتقّ من المعرّف نفسه (لا رابط يشير لغير فيديوه)',
  withVideoId.every((e) => {
    const v = EXERCISE_VIDEO_REGISTRY[e.id]
    return v.canonicalUrl === `https://www.youtube.com/watch?v=${v.youtubeVideoId}`
  }),
)
check(
  'كل مرجع معتمد له معرّف فعلي وثقة مطابقة عالية أو متوسطة',
  exercises
    .filter((e) => EXERCISE_VIDEO_REGISTRY[e.id].status === 'APPROVED')
    .every((e) => {
      const v = EXERCISE_VIDEO_REGISTRY[e.id]
      return Boolean(v.youtubeVideoId) && (v.matchConfidence === 'high' || v.matchConfidence === 'medium')
    }),
)
check(
  'لا مرجع بلا معرّف يُصنَّف معتمدًا',
  exercises.filter((e) => !EXERCISE_VIDEO_REGISTRY[e.id].youtubeVideoId).every((e) => EXERCISE_VIDEO_REGISTRY[e.id].status !== 'APPROVED'),
)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑥ طبقة القراءة — الحالة غير المعتمدة لا تعبر إلى الواجهة')
const notApproved = exercises.filter((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].videoStatus !== 'APPROVED')
check('كل تمرين غير معتمد الفيديو يعيد null للواجهة', notApproved.every((e) => approvedVideoFor(e.id) === null))
check('كل تمرين غير معتمد الفيديو بلا رابط تضمين', notApproved.every((e) => videoEmbedUrl(e.id) === null))
check(
  'كل تمرين غير معتمد الصورة يعيد null للواجهة',
  exercises.filter((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].imageStatus !== 'APPROVED').every((e) => approvedImageFor(e.id) === null),
)
check('كل صورة معتمدة تعبر فعلًا إلى الواجهة', approvedImages.every((e) => approvedImageFor(e.id) !== null))
check('معرّف مجهول لا يكسر طبقة القراءة', productionEntryFor('qimmah-no-such-exercise') === null && approvedImageFor('qimmah-no-such-exercise') === null)
check(
  'المعرّف القديم يُحلّ إلى مدخله القانوني',
  Object.keys(LEGACY_EXERCISE_ID_MAP).every((legacy) => productionEntryFor(legacy) !== null),
)

const approvedVideos = exercises.filter((e) => EXERCISE_PRODUCTION_MANIFEST[e.id].videoStatus === 'APPROVED')
if (approvedVideos.length > 0) {
  const sample = approvedVideos[0]
  const url = videoEmbedUrl(sample.id) ?? ''
  check('رابط التضمين على نطاق youtube-nocookie (خصوصية)', url.startsWith('https://www.youtube-nocookie.com/embed/'))
  check('رابط التضمين بلا تشغيل تلقائي', !/autoplay=1/.test(url))
  check('كل مرجع معتمد يعبر إلى الواجهة', approvedVideos.every((e) => hasApprovedVideo(e.id)))
  check(
    'طبقة القراءة لا تُصدّر عنوان الفيديو (عناوين طرف ثالث ليست نصّ واجهة)',
    approvedVideos.every((e) => !Object.prototype.hasOwnProperty.call(approvedVideoFor(e.id) ?? {}, 'title')),
  )
} else {
  console.log('  · لا مرجع فيديو معتمد بعد — فحوص التضمين تُؤجَّل بصدق حتى يوجد أول مرجع.')
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⑦ حراسة بنيوية + تأكيدات مضادّة (§4.2)')
const selectorSource = readFileSync('src/lib/exerciseProductionMedia.ts', 'utf8')
const registryBuilder = readFileSync('scripts/exercise/build-video-registry.mjs', 'utf8')

function assertSelectorSurface(selector: string, builder: string): void {
  assert.match(selector, /videoStatus !== 'APPROVED'/, "video-gate: طبقة القراءة يجب أن تحجب كل ما ليس APPROVED")
  assert.match(selector, /imageStatus !== 'APPROVED'/, "image-gate: طبقة القراءة يجب أن تحجب كل صورة ليست APPROVED")
  assert.match(selector, /youtube-nocookie\.com/, 'privacy-embed: التضمين على نطاق nocookie')
  assert.doesNotMatch(selector, /autoplay=1/, 'no-autoplay: ممنوع التشغيل التلقائي')
  assert.match(builder, /no verifiedTitle — unverified ids must not ship/, 'anti-fabrication: بوابة المعرّف غير المُتحقَّق يجب أن تبقى')
  assert.match(builder, /process\.exit\(1\)/, 'build-fails-loud: التحقّق يُسقط البناء لا يُحذّر فقط')
}

assertSelectorSurface(selectorSource, registryBuilder)
check('طبقة القراءة وبوابة البناء محروستان بنيويًا', true)

assert.throws(
  () => assertSelectorSurface(selectorSource.replaceAll("videoStatus !== 'APPROVED'", "videoStatus === 'REJECTED'"), registryBuilder),
  /video-gate/,
)
check('محاكاة قلب بوابة الفيديو تسقط بفحص مسمّى', true)

// ملاحظة: المحاكاة تستبدل **كل** ورود النصّ لا أوّله — أول صياغة استبدلت الورود الأول
// (وهو داخل تعليق) فبقي سطر الكود سليمًا ومرّت المحاكاة بلا سقوط. محاكاة لا تسقط ليست محاكاة.
assert.throws(
  () => assertSelectorSurface(selectorSource.replaceAll('youtube-nocookie.com', 'youtube.com'), registryBuilder),
  /privacy-embed/,
)
check('محاكاة إسقاط نطاق nocookie تسقط بفحص مسمّى', true)

assert.throws(
  () => assertSelectorSurface(selectorSource.replaceAll('playsinline=1', 'autoplay=1'), registryBuilder),
  /no-autoplay/,
)
check('محاكاة إدخال التشغيل التلقائي تسقط بفحص مسمّى', true)

assert.throws(
  () => assertSelectorSurface(selectorSource, registryBuilder.replaceAll('no verifiedTitle — unverified ids must not ship', 'ok')),
  /anti-fabrication/,
)
check('محاكاة نزع بوابة منع الاختلاق تسقط بفحص مسمّى', true)

assert.throws(
  () => assertSelectorSurface(selectorSource.replaceAll("imageStatus !== 'APPROVED'", "imageStatus === 'REJECTED'"), registryBuilder),
  /image-gate/,
)
check('محاكاة قلب بوابة الصورة تسقط بفحص مسمّى', true)

assert.throws(
  () => assertSelectorSurface(selectorSource, registryBuilder.replaceAll('process.exit(1)', 'console.warn("skip")')),
  /build-fails-loud/,
)
check('محاكاة تحويل فشل البناء إلى تحذير تسقط بفحص مسمّى', true)

// التأكيد المضادّ لقاعدة المحتوى: لغة مزروعة في الجهة الخطأ يجب أن تُكشف.
function assertLanguagePurity(enSteps: string[]): void {
  assert.ok(!/[؀-ۿ]/.test(enSteps.join(' ')), 'en-purity: الخطوات الإنجليزية يجب ألّا تحمل حرفًا عربيًا')
}
assertLanguagePurity(EXERCISE_CUES_EN['barbell-bench-press'].steps)
check('نقاء اللغة الإنجليزية محروس', true)
assert.throws(() => assertLanguagePurity(['Set your grip', 'ثبّت كتفيك']), /en-purity/)
check('محاكاة تسريب العربية للإنجليزية تسقط بفحص مسمّى', true)

// التأكيد المضادّ لبوابة الحقوق: لقطة معتمدة بلا ترخيص يجب أن تُكشف.
function assertLicensed(entries: { kind: string; license: string | null }[]): void {
  const bad = entries.filter((x) => x.kind === 'stills' && !x.license)
  assert.equal(bad.length, 0, 'rights-gate: كل لقطة فوتوغرافية معتمدة يجب أن تحمل ترخيصًا')
}
assertLicensed(
  approvedImages.map((e) => ({
    kind: EXERCISE_PRODUCTION_MANIFEST[e.id].image?.kind ?? '',
    license: EXERCISE_PRODUCTION_MANIFEST[e.id].imageLicense,
  })),
)
check('بوابة الحقوق محروسة', true)
assert.throws(() => assertLicensed([{ kind: 'stills', license: null }]), /rights-gate/)
check('محاكاة لقطة بلا ترخيص تسقط بفحص مسمّى', true)

console.log(`\n✅ جاهزية مكتبة التمارين: ${passed} فحصًا، 0 فشل.`)
