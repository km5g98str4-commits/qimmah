// إثبات اكتمال المحتوى الإنجليزي (P14).
//
// يحرس أمرين لا يكشفهما typecheck:
//   1. **لا حرف عربي داخل أي قيمة إنجليزية.** حقل اسمه `*En` يحمل عربية = تسرّب صامت
//      يظهر للمستخدم الإنجليزي ولا يوقفه شيء.
//   2. **التكافؤ**: لكل نص عربي نصّه الإنجليزي، وبنفس الأعداد، وبنفس الحدود
//      (طول متن الدرس ٦٠–١٠٠ كلمة) — كي لا ينحرف الطقمان مع الوقت.
//
// وكذلك يثبت أن توسيع الواجهات بمعامل `lang` **متوافق للخلف**: الاستدعاء بلا
// معامل يُرجع العربية نفسها حرفيًا كما قبل التغيير.
import { REST_TIPS } from '@/data/coaching/restTips'
import { LESSONS } from '@/data/coaching/lessons'
import { pickRestTip, restTipText } from '@/lib/coaching/restTips'
import { localizeLesson, selectNextLesson } from '@/lib/coaching/lessonRotation'
import { STORE_DEFS, storeLabel } from '@/lib/portability/registry'
import { portabilityMessage, portabilityError, portabilityErrorText, invalidShapeError } from '@/lib/portability/errors'
import { exportShareTitle } from '@/lib/portability/exporter'
import {
  getTechniqueTips,
  getCommonMistakes,
  getSafetyNotes,
  getVideoLabel,
  guidanceFor,
  muscleName,
  exerciseGuidance,
} from '@/lib/exerciseGuidance'
import type { Exercise, MovementPattern, Muscle } from '@/types/workout'
import { exercises } from '@/data/exercises'

let pass = 0
const fails: string[] = []
const check = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fails.push(`${label}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`) }
}

// نطاقات العربية + الأرقام الهندية/الفارسية + علامات الترقيم العربية + محارف الاتجاه.
// تُكتب بترميز \u لا بمحارف حرفية: بعضها محارف اتجاه غير مرئية يرفضها ESLint
// (no-irregular-whitespace) ولا يمكن قراءتها في المصدر.
const ARABIC = new RegExp(
  '[\\u0600-\\u06FF\\u0750-\\u077F\\u0870-\\u089F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF\\u200E\\u200F]',
)
const firstArabic = (s: string): string => {
  const m = ARABIC.exec(s)
  return m ? `U+${m[0].codePointAt(0)!.toString(16).toUpperCase()} «${m[0]}»` : ''
}
/** يجمع كل تسرّب عربي في مجموعة نصوص إنجليزية. */
function leaks(pairs: { where: string; text: string }[]): string[] {
  return pairs.filter((p) => ARABIC.test(p.text)).map((p) => `${p.where}: ${firstArabic(p.text)}`)
}
const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length

console.log('════════ إثبات المحتوى الإنجليزي — قِمّة ════════')

// ───────────────────────────────────────────── ① نصائح الراحة
console.log('\n① نصائح الراحة (restTips)')
{
  check('٢٥ نصيحة', REST_TIPS.length === 25, `${REST_TIPS.length}`)
  check('كل نصيحة لها نص إنجليزي غير فارغ', REST_TIPS.every((t) => t.textEn.trim().length > 0))
  const l = leaks(REST_TIPS.map((t) => ({ where: `restTip ${t.id}`, text: t.textEn })))
  check('لا حرف عربي في أي textEn', l.length === 0, l.slice(0, 3).join(' | '))
  check('لا علامة تعجّب (نبرة هادئة)', REST_TIPS.every((t) => !t.textEn.includes('!')))
  check('معرّفات فريدة', new Set(REST_TIPS.map((t) => t.id)).size === REST_TIPS.length)
  // توافق للخلف: بلا معامل = عربي كما كان
  const tip = REST_TIPS[0]
  check('restTipText بلا lang يُرجع العربية', restTipText(tip) === tip.textAr)
  check("restTipText('en') يُرجع الإنجليزية", restTipText(tip, 'en') === tip.textEn)
  const picked = pickRestTip('chest', 42, [])
  const pickedEn = pickRestTip('chest', 42, [], 'en')
  check('pickRestTip يُبقي textAr على الكائن (توافق للخلف)', picked?.textAr === picked?.text)
  check('pickRestTip لا يتغيّر اختياره باختلاف اللغة', picked?.id === pickedEn?.id)
  check("pickRestTip('en') يحلّ text إلى الإنجليزية", pickedEn?.text === pickedEn?.textEn)
}

// ───────────────────────────────────────────── ② الدروس
console.log('\n② الدروس (lessons)')
{
  check('٤٠ درسًا', LESSONS.length === 40, `${LESSONS.length}`)
  const missing = LESSONS.filter((l) => !l.titleEn?.trim() || !l.bodyEn?.trim() || !l.takeawayEn?.trim())
  check('كل درس له عنوان ومتن وخلاصة بالإنجليزية', missing.length === 0, missing.map((l) => l.id).join(','))
  const l = leaks(
    LESSONS.flatMap((x) => [
      { where: `${x.id}.titleEn`, text: x.titleEn },
      { where: `${x.id}.bodyEn`, text: x.bodyEn },
      { where: `${x.id}.takeawayEn`, text: x.takeawayEn },
    ]),
  )
  check('لا حرف عربي في أي حقل إنجليزي', l.length === 0, l.slice(0, 3).join(' | '))
  const wc = LESSONS.map((x) => ({ id: x.id, n: words(x.bodyEn) }))
  const out = wc.filter((x) => x.n < 60 || x.n > 100)
  check(
    'كل متن إنجليزي بين ٦٠ و١٠٠ كلمة (نفس حدّ العربية)',
    out.length === 0,
    out.map((x) => `${x.id}=${x.n}`).join(', '),
  )
  check('لا تعجّب في العناوين/الخلاصات', LESSONS.every((x) => !x.titleEn.includes('!') && !x.takeawayEn.includes('!')))
  // ادّعاءات محظورة (نفس روح فحص العربية القائم)
  const claimBans = [/\bcure\b/i, /\bheal(s|ing)?\b/i, /\bguarantee/i, /\bmiracle\b/i, /\bdetox\b/i, /\bburn fat fast\b/i]
  const claims = LESSONS.filter((x) => claimBans.some((b) => b.test(`${x.titleEn} ${x.bodyEn} ${x.takeawayEn}`)))
  check('لا ادّعاءات طبية أو وعود نتائج بالإنجليزية', claims.length === 0, claims.map((x) => x.id).join(','))
  // توافق للخلف
  const one = LESSONS[0]
  const ar = localizeLesson(one)
  check('localizeLesson بلا lang = العربية', ar.title === one.titleAr && ar.body === one.bodyAr && ar.takeaway === one.takeawayAr)
  const en = localizeLesson(one, 'en')
  check("localizeLesson('en') = الإنجليزية", en.title === one.titleEn && en.body === one.bodyEn && en.takeaway === one.takeawayEn)
  check('الحقول الأصلية *Ar باقية على الكائن', en.titleAr === one.titleAr && en.bodyAr === one.bodyAr)
  const a = selectNextLesson([], 7)
  const b = selectNextLesson([], 7, 'en')
  check('selectNextLesson لا يتغيّر اختياره باختلاف اللغة', a.lesson.id === b.lesson.id)
}

// ───────────────────────────────────────────── ③ نقل البيانات
console.log('\n③ نقل البيانات (portability)')
{
  check('لكل متجر تسمية إنجليزية', STORE_DEFS.every((d) => d.labelEn?.trim().length > 0))
  const l = leaks(STORE_DEFS.map((d) => ({ where: `store ${d.id}.labelEn`, text: d.labelEn })))
  check('لا حرف عربي في أي labelEn', l.length === 0, l.slice(0, 3).join(' | '))
  check('التسميات الإنجليزية فريدة', new Set(STORE_DEFS.map((d) => d.labelEn)).size === STORE_DEFS.length)
  check('storeLabel بلا lang = العربية', STORE_DEFS.every((d) => storeLabel(d) === d.labelAr))
  check("storeLabel('en') = الإنجليزية", STORE_DEFS.every((d) => storeLabel(d, 'en') === d.labelEn))

  // كل رسالة خطأ لها نصّان، والإنجليزي بلا عربية
  const CODES = [
    'RECOVERY_OR_NO_ACCOUNT', 'ACCOUNT_CHANGED', 'FILE_TOO_LARGE', 'NOT_JSON', 'TOO_DEEP',
    'UNKNOWN_FORMAT', 'NOT_A_QIMMAH_BACKUP', 'UNSUPPORTED_VERSION', 'INVALID_STORES', 'UNSAFE_KEYS',
    'UNSAFE_STORE_ID', 'UNKNOWN_STORE_IN_BACKUP', 'UNKNOWN_STORE', 'NEWER_VERSION', 'INVALID_SHAPE',
    'VERIFY_FAILED', 'READBACK_FAILED', 'IMPORT_FAILED', 'UNDO_WRONG_OWNER',
  ] as const
  const enMsgs = CODES.map((c) => ({ where: `error ${c}`, text: portabilityMessage(c, 'en', ['X', 'Y']) }))
  const el = leaks(enMsgs)
  check('لا حرف عربي في أي رسالة خطأ إنجليزية', el.length === 0, el.slice(0, 3).join(' | '))
  check('كل رسالة إنجليزية غير فارغة', enMsgs.every((m) => m.text.trim().length > 0))
  check('كل رسالة عربية غير فارغة', CODES.every((c) => portabilityMessage(c, 'ar', ['X', 'Y']).trim().length > 0))
  // لا أرقام هندية في الإنجليزية (الحدّ ٢٥ ميغابايت ← 25 MB)
  check('الحدّ يُكتب بأرقام لاتينية في الإنجليزية', /25 MB/.test(portabilityMessage('FILE_TOO_LARGE', 'en')))
  // الاستيفاء يعمل في اللغتين
  check('{0} يُستبدل في اللغتين', portabilityMessage('UNKNOWN_STORE', 'en', ['todo']).includes('todo') && portabilityMessage('UNKNOWN_STORE', 'ar', ['todo']).includes('todo'))

  // توافق للخلف: err.message يبقى عربيًا كما كان
  const err = portabilityError('NOT_JSON')
  check('PortabilityError.message يبقى عربيًا (توافق للخلف)', err.message === portabilityMessage('NOT_JSON', 'ar'))
  check('portabilityErrorText بلا lang = العربية', portabilityErrorText(err) === err.message)
  check("portabilityErrorText('en') = الإنجليزية", portabilityErrorText(err, 'en') === portabilityMessage('NOT_JSON', 'en'))
  check('خطأ بلا code يسقط إلى رسالته', portabilityErrorText(new Error('boom'), 'en') === 'boom')

  // رفض الشكل: العربية تبقى نفس جملة المتجر، والإنجليزية من نفس الكائن
  const shapeErrs = STORE_DEFS.map((d) => {
    const r = d.validate(Symbol('never-valid') as unknown)
    return { id: d.id, r }
  }).filter((x) => x.r !== true) as { id: string; r: { ar: string; en: string } }[]
  check('كل متجر يرفض قيمة غير صالحة بسببٍ بلغتين', shapeErrs.length === STORE_DEFS.length, `${shapeErrs.length}/${STORE_DEFS.length}`)
  const sl = leaks(shapeErrs.map((x) => ({ where: `validate ${x.id}.en`, text: x.r.en })))
  check('لا حرف عربي في أي سبب رفض إنجليزي', sl.length === 0, sl.slice(0, 3).join(' | '))
  if (shapeErrs.length > 0) {
    const e = invalidShapeError(shapeErrs[0].r, 'X')
    check('invalidShapeError: العربية = جملة المتجر نفسها', e.message === shapeErrs[0].r.ar)
    check('invalidShapeError: الإنجليزية = جملة المتجر الإنجليزية', portabilityErrorText(e, 'en') === shapeErrs[0].r.en)
  }

  check('عنوان المشاركة بلا lang = العربية', exportShareTitle().length > 0 && ARABIC.test(exportShareTitle()))
  check("عنوان المشاركة 'en' بلا عربية", !ARABIC.test(exportShareTitle('en')))
}

// ───────────────────────────────────────────── ④ إرشاد التمارين
console.log('\n④ إرشاد التمارين (exerciseGuidance)')
{
  const PATTERNS: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'lunge', 'isolation', 'carry', 'core', 'cardio', 'mobility']
  const MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'hamstrings', 'quads', 'calves', 'core', 'cardio']
  const fake = (p: MovementPattern): Exercise =>
    ({ id: `probe-${p}`, movementPattern: p, primaryMuscle: 'chest', videoSource: 'youtube_search' } as unknown as Exercise)

  const enPairs: { where: string; text: string }[] = []
  for (const p of PATTERNS) {
    const ex = fake(p)
    const tips = getTechniqueTips(ex, 'en')
    const mis = getCommonMistakes(ex, 'en')
    const saf = getSafetyNotes(ex, 'en')
    const g = guidanceFor(ex, 'en')
    // التكافؤ في الأعداد مع العربية
    check(`«${p}»: عدد نقاط التكنيك متطابق`, tips.length === getTechniqueTips(ex).length)
    check(`«${p}»: عدد الأخطاء متطابق`, mis.length === getCommonMistakes(ex).length)
    check(`«${p}»: عدد تنبيهات الأمان متطابق`, saf.length === getSafetyNotes(ex).length)
    const gAr = guidanceFor(ex)
    check(`«${p}»: بطاقة «عن التمرين» متطابقة الأعداد`, g.howTo.length === gAr.howTo.length && g.tips.length === gAr.tips.length && g.mistakes.length === gAr.mistakes.length)
    tips.forEach((t, i) => enPairs.push({ where: `technique.${p}[${i}]`, text: t }))
    mis.forEach((t, i) => enPairs.push({ where: `mistakes.${p}[${i}]`, text: t }))
    saf.forEach((t, i) => enPairs.push({ where: `safety.${p}[${i}]`, text: t }))
    g.howTo.forEach((t, i) => enPairs.push({ where: `guidance.${p}.howTo[${i}]`, text: t }))
    g.tips.forEach((t, i) => enPairs.push({ where: `guidance.${p}.tips[${i}]`, text: t }))
    g.mistakes.forEach((t, i) => enPairs.push({ where: `guidance.${p}.mistakes[${i}]`, text: t }))
    enPairs.push({ where: `guidance.${p}.safety`, text: g.safety })
  }
  for (const src of ['official', 'custom', 'trusted', 'trusted_video', 'youtube_search'] as const) {
    const ex = { ...fake('push'), videoSource: src } as Exercise
    enPairs.push({ where: `videoLabel.${src}`, text: getVideoLabel(ex, 'en') })
  }
  for (const m of MUSCLES) enPairs.push({ where: `muscleName.${m}`, text: muscleName(m, 'en') })
  for (const p of PATTERNS) {
    const g = exerciseGuidance(`probe-${p}`, 'en')
    g.tips.forEach((t, i) => enPairs.push({ where: `exerciseGuidance.${p}.tips[${i}]`, text: t }))
    g.mistakes.forEach((t, i) => enPairs.push({ where: `exerciseGuidance.${p}.mistakes[${i}]`, text: t }))
  }

  const gl = leaks(enPairs)
  check(`لا حرف عربي عبر ${enPairs.length} نصًّا إنجليزيًا`, gl.length === 0, gl.slice(0, 5).join(' | '))
  check('كل النصوص الإنجليزية غير فارغة', enPairs.every((p) => p.text.trim().length > 0))

  // توافق للخلف: بلا lang = عربي بالضبط
  const ex = fake('push')
  check('getTechniqueTips بلا lang عربية', getTechniqueTips(ex).every((t) => ARABIC.test(t)))
  check('getCommonMistakes بلا lang عربية', getCommonMistakes(ex).every((t) => ARABIC.test(t)))
  check('getSafetyNotes بلا lang عربية', getSafetyNotes(ex).every((t) => ARABIC.test(t)))
  check('getVideoLabel بلا lang عربية', ARABIC.test(getVideoLabel(ex)))
  check('muscleName بلا lang عربية', MUSCLES.every((m) => ARABIC.test(muscleName(m))))
  check('guidanceFor بلا lang عربية', ARABIC.test(guidanceFor(ex).safety))
  // تنبيه استشارة المختص موجود في اللغتين (قاعدة «لا ادّعاءات طبية»)
  check('تنبيه استشارة المختص يظهر بالعربية', getSafetyNotes(ex).some((t) => t.includes('استشر مختصًا')))
  check('تنبيه استشارة المختص يظهر بالإنجليزية', getSafetyNotes(ex, 'en').some((t) => /qualified professional/i.test(t)))
  // ── الكتالوج كاملًا: تكافؤ لا فراغ ───────────────────────────────────────────
  //
  // كان هنا تأكيد واحد يقول: «التمرين الحقيقي بلا إنجليزي مؤلف لا يتلقى ترجمة
  // مخترعة» ويثبته بأن الأقسام الأربعة **فارغة** بالإنجليزية. وكان يمرّ بصدق —
  // لكنه يحرس عطلًا: قياسٌ على الـ١٨١ يُظهر أن العربية المقابلة ليست تأليفًا خاصًا
  // بل نصّ جدول نمط الحركة نفسه، فالفراغ الإنجليزي لم يكن امتناعًا عن الترجمة بل
  // حرمانًا من محتوى **مؤلَّف إنجليزيًا وموجود**. أُبدل بثلاثة تأكيدات أقوى تحرس
  // المقصد الأصلي (لا اختراع) دون أن تحرس الفراغ.
  const CATALOG = exercises
  const emptyEn = CATALOG.filter((ex) => {
    const g = guidanceFor(ex, 'en')
    return g.howTo.length === 0 || g.tips.length === 0 || g.mistakes.length === 0 || g.safety.trim().length === 0
  }).map((ex) => ex.id)
  check(`لا تمرين كتالوج بقسم إنجليزي فارغ (${CATALOG.length}/${CATALOG.length})`, emptyEn.length === 0, emptyEn.slice(0, 5).join(','))

  const unevenDepth = CATALOG.filter((ex) => {
    const a = guidanceFor(ex, 'ar')
    const e = guidanceFor(ex, 'en')
    return a.howTo.length !== e.howTo.length || a.tips.length !== e.tips.length || a.mistakes.length !== e.mistakes.length
  }).map((ex) => ex.id)
  check('عمق الإرشاد الإنجليزي = عمق العربي لكل تمرين كتالوج', unevenDepth.length === 0, unevenDepth.slice(0, 5).join(','))

  // «لا ترجمة مخترعة» بصيغتها الصحيحة: الإنجليزي المعروض نصّ إنجليزي مؤلَّف —
  // إمّا حقل التمرين الإنجليزي، وإمّا جدول النمط الإنجليزي. لا شيء ثالث.
  const invented = CATALOG.filter((ex) => {
    const en = guidanceFor(ex, 'en')
    const stripped = { ...ex, techniqueTipsEn: undefined, commonMistakesEn: undefined, safetyNotesEn: undefined } as Exercise
    const patternTips = getTechniqueTips(stripped, 'en')
    const authoredTips = ex.techniqueTipsEn ?? []
    const fromPattern = en.tips.length === patternTips.length && en.tips.every((t, i) => t === patternTips[i])
    const fromAuthored = en.tips.length === authoredTips.length && en.tips.every((t, i) => t === authoredTips[i])
    return !fromPattern && !fromAuthored
  }).map((ex) => ex.id)
  check('كل نصيحة إنجليزية معروضة مصدرها جدول النمط الإنجليزي أو حقل التمرين — لا نصّ ثالث', invented.length === 0, invented.slice(0, 5).join(','))
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات المحتوى الإنجليزي: ${pass} نجح · ${fails.length} فشل`)
if (fails.length > 0) {
  console.log('\nالإخفاقات:')
  fails.forEach((f) => console.log('  • ' + f))
  process.exit(1)
}
