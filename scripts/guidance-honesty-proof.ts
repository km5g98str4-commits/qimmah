// إثبات صدق الإرشاد — ثنائي اللغة، فوق الكتالوج كاملًا (١٨١ تمرينًا).
//
// ما الذي تغيّر ولماذا:
// كانت النسخة السابقة من هذا الإثبات أربع مطابقات نصّية على المصدر، وأقواها كانت
// تُثبّت السطر `if (getExercise(exercise.id)) return []` بوصفه **عقدًا**. وذلك
// السطر هو نفسه العطل: يُفرغ الإرشاد الإنجليزي على ١٨١/١٨١ فيقرأ المستخدم
// «English guidance for this exercise is not available yet» في كل تمرين، بينما
// الجانب العربي المقابل **ليس تأليفًا خاصًا** بل نصّ جدول نمط الحركة نفسه.
// فالإثبات كان يحرس فراغًا ويسمّيه أمانة.
//
// العقد الجديد أقوى لا أضعف — ثلاثة حدود لا يجوز كسر أيّها:
//   ① **تغطية**: الأقسام الأربعة (كيف تؤديه · نصائح · أخطاء · أمان) غير فارغة
//      في اللغتين لكل تمرين من الـ١٨١. لا رسالة «غير متاح» على أي سطح.
//   ② **تكافؤ العمق**: لكل تمرين، عدد عناصر كل قسم متساوٍ بين العربية والإنجليزية.
//      لغةٌ تُملأ ونظيرتها تُفرَّغ من نفس المستوى = فشل مسمّى.
//   ③ **صدق المنشأ**: لا لغة تدّعي خصوصية تمرين لا تملكها. «نصائح تقنية» مستوى
//      نمط حركي في اللغتين معًا؛ و«كيف تؤديه/الأخطاء/الأمان» مؤلَّفة لكل تمرين
//      في اللغتين معًا (getCue). تأليف في لغة واحدة دون نظيرتها = فشل مسمّى.
//
// ولكل حدّ **محاكاة التفاف** تسقط بفحص مسمّى (§4.2)، لا بـTypeError.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { exercises, getExercise } from '@/data/exercises'
import { getTechniqueTips, getCommonMistakes, getSafetyNotes, guidanceFor } from '@/lib/exerciseGuidance'
import { getCue, hasCue } from '@/lib/coaching'
import type { Exercise } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'

const root = process.env.QIMMAH_ROOT ?? process.cwd()
const read = (f: string): string => readFileSync(resolve(root, f), 'utf8')

let pass = 0
const fails: string[] = []
const check = (label: string, ok: boolean, detail = ''): boolean => {
  if (ok) { pass++; console.log(`  ✓ ${label}`) }
  else { fails.push(`${label}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`) }
  return ok
}
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/

/** ما تعرضه بطاقة «عن التمرين» فعلًا — نفس ترتيب ExerciseDetail بالحرف. */
interface Rendered { howTo: string[]; tips: string[]; mistakes: string[]; safety: string }
function rendered(ex: Exercise, lang: Lang): Rendered {
  const g = guidanceFor(ex, lang)
  const cue = getCue(ex.id, lang)
  return {
    howTo: cue.steps.length ? cue.steps : g.howTo,
    tips: g.tips,
    mistakes: cue.mistakes.length ? cue.mistakes : g.mistakes,
    safety: cue.safety.length ? cue.safety : g.safety,
  }
}

console.log('════════ إثبات صدق الإرشاد — قِمّة ════════')
console.log(`الكتالوج: ${exercises.length} تمرينًا\n`)

// ───────────────────────────────── ① التغطية في اللغتين
console.log('① التغطية — لا قسم فارغ في أي لغة')
{
  const cover = (lang: Lang) => {
    const r = exercises.map((ex) => rendered(ex, lang))
    return {
      howTo: r.filter((x) => x.howTo.length > 0).length,
      tips: r.filter((x) => x.tips.length > 0).length,
      mistakes: r.filter((x) => x.mistakes.length > 0).length,
      safety: r.filter((x) => x.safety.trim().length > 0).length,
    }
  }
  const ar = cover('ar')
  const en = cover('en')
  const n = exercises.length
  console.log(`    عربي   : howTo ${ar.howTo}/${n} · tips ${ar.tips}/${n} · mistakes ${ar.mistakes}/${n} · safety ${ar.safety}/${n}`)
  console.log(`    إنجليزي: howTo ${en.howTo}/${n} · tips ${en.tips}/${n} · mistakes ${en.mistakes}/${n} · safety ${en.safety}/${n}`)
  check(`تغطية عربية كاملة في الأقسام الأربعة (${n}/${n})`, ar.howTo === n && ar.tips === n && ar.mistakes === n && ar.safety === n, JSON.stringify(ar))
  check(`تغطية إنجليزية كاملة في الأقسام الأربعة (${n}/${n})`, en.howTo === n && en.tips === n && en.mistakes === n && en.safety === n, JSON.stringify(en))
  const arabicInEn = exercises.flatMap((ex) => {
    const r = rendered(ex, 'en')
    return [...r.howTo, ...r.tips, ...r.mistakes, r.safety].filter((t) => ARABIC.test(t)).map(() => ex.id)
  })
  check('لا حرف عربي في أي نصّ إنجليزي معروض', arabicInEn.length === 0, arabicInEn.slice(0, 3).join(','))
}

// ───────────────────────────────── ② تكافؤ العمق
console.log('\n② تكافؤ العمق — عدد لعدد، تمرينًا تمرينًا')
{
  const uneven: string[] = []
  for (const ex of exercises) {
    const a = rendered(ex, 'ar')
    const e = rendered(ex, 'en')
    if (a.howTo.length !== e.howTo.length) uneven.push(`${ex.id}.howTo ${a.howTo.length}≠${e.howTo.length}`)
    if (a.tips.length !== e.tips.length) uneven.push(`${ex.id}.tips ${a.tips.length}≠${e.tips.length}`)
    if (a.mistakes.length !== e.mistakes.length) uneven.push(`${ex.id}.mistakes ${a.mistakes.length}≠${e.mistakes.length}`)
    if ((a.safety.trim().length > 0) !== (e.safety.trim().length > 0)) uneven.push(`${ex.id}.safety presence`)
  }
  check(`العمق متطابق في الأقسام الأربعة عبر ${exercises.length} تمرينًا`, uneven.length === 0, uneven.slice(0, 5).join(' | '))
}

// ───────────────────────────────── ③ صدق المنشأ
console.log('\n③ صدق المنشأ — لا ادّعاء خصوصية غير مملوكة')

/** true حين تكون نصائح التمرين نصّ جدول النمط لا تأليفًا خاصًا به. */
function tipsArePatternLevel(ex: Exercise, lang: Lang): boolean {
  const actual = getTechniqueTips(ex, lang)
  const stripped = { ...ex, techniqueTipsAr: [], techniqueTipsEn: undefined } as Exercise
  const pattern = getTechniqueTips(stripped, lang)
  return actual.length === pattern.length && actual.every((x, i) => x === pattern[i])
}

{
  // «كيف تؤديه/الأخطاء/الأمان»: مؤلَّفة لكل تمرين في اللغتين معًا (getCue).
  const cueGap = exercises.filter((ex) => !hasCue(ex.id, 'ar') || !hasCue(ex.id, 'en')).map((ex) => ex.id)
  check(
    `«كيف تؤديه/الأخطاء/الأمان» مؤلَّفة لكل تمرين في اللغتين (${exercises.length}/${exercises.length})`,
    cueGap.length === 0,
    cueGap.slice(0, 5).join(','),
  )

  // «نصائح تقنية»: مستوى نمط حركي — والمنشأ نفسه في اللغتين، تمرينًا تمرينًا.
  const split = exercises.filter((ex) => tipsArePatternLevel(ex, 'ar') !== tipsArePatternLevel(ex, 'en')).map((ex) => ex.id)
  check(
    'منشأ «نصائح تقنية» واحد في اللغتين (جدول النمط في كليهما، أو تأليف في كليهما)',
    split.length === 0,
    split.slice(0, 5).join(','),
  )
  const patternAr = exercises.filter((ex) => tipsArePatternLevel(ex, 'ar')).length
  const patternEn = exercises.filter((ex) => tipsArePatternLevel(ex, 'en')).length
  console.log(`    «نصائح تقنية» على مستوى النمط: عربي ${patternAr}/${exercises.length} · إنجليزي ${patternEn}/${exercises.length}`)
  check(
    'العدد المُعلَن في التوثيق مُقاس لا مُدَّعى (نمط حركي في اللغتين لكل الكتالوج)',
    patternAr === exercises.length && patternEn === exercises.length,
    `ar=${patternAr} en=${patternEn}`,
  )
}

// ───────────────────────────────── ④ ربط الإثبات بالمصدر
// المحاكاة أعلاه تعيد إنتاج تعبيرات ExerciseDetail. لو تغيّرت هناك ولم تتغيّر هنا،
// صار الإثبات يقيس شيئًا لا يُرسَم. فنستخرج الكتلة **بحدّيها**، ونجرّدها من
// التعليقات، ثم نطابق كل إسناد **مرّة واحدة بحرفه** — لا `includes` متفرّقة يرضيها
// سطر معلَّق أو إسناد ثانٍ مدسوس.
console.log('\n④ الربط البنيوي بالمصدر (ExerciseDetail)')
const DETAIL = 'src/components/ExerciseDetail.tsx'
const EXPECTED: Record<string, string> = {
  howTo: 'cue.steps.length ? cue.steps : g.howTo',
  tips: 'g.tips',
  mistakes: 'cue.mistakes.length ? cue.mistakes : g.mistakes',
  safety: 'cue.safety.length ? cue.safety : g.safety',
}

function resolutionBlock(src: string): string | null {
  const start = src.indexOf('const cue = getCue(ex.id, lang)')
  if (start < 0) return null
  const end = src.indexOf('return (', start)
  if (end < 0) return null
  return src.slice(start, end)
}
/** كل إسناد `const <اسم> = …` داخل الكتلة بعد تجريد التعليقات، بترتيب وروده. */
function assignments(block: string): Map<string, string[]> {
  const code = block
    .split('\n')
    .filter((l) => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    })
    .join('\n')
  const out = new Map<string, string[]>()
  for (const m of code.matchAll(/^\s*const (\w+)(?::[^=]+)? = (.+?)\s*$/gm)) {
    const list = out.get(m[1]) ?? []
    list.push(m[2])
    out.set(m[1], list)
  }
  return out
}
/** أسماء الحقول التي لا يطابق إسنادها المتوقَّع، أو تكرّر، أو غاب. */
function mismatched(block: string): string[] {
  const a = assignments(block)
  return Object.entries(EXPECTED)
    .filter(([name, rhs]) => {
      const got = a.get(name)
      return !got || got.length !== 1 || got[0] !== rhs
    })
    .map(([name]) => `${name}=${JSON.stringify(a.get(name))}`)
}

{
  const src = read(DETAIL)
  const block = resolutionBlock(src)
  if (check('كتلة حسم الإرشاد موجودة بحدّيها في ExerciseDetail', block !== null) && block) {
    const bad = mismatched(block)
    check('كل إسناد يطابق المحاكاة مرّة واحدة بحرفه', bad.length === 0, bad.join(' | '))
  }
  check('الواجهة تمرّر اللغة إلى guidanceFor', /guidanceFor\(ex, lang\)/.test(src))
  check(
    'شبكة «غير متاح» باقية كأمان أخير في اللغتين',
    /guidanceUnavailable/.test(src) && /guidanceUnavailable:/.test(read('src/i18n/dict/library.ts')),
  )
}

// ───────────────────────────────── ⑤ محاكاة الالتفاف (counter-proofs)
console.log('\n⑤ محاكاة الالتفاف — كل حدّ يسقط بفحص مسمّى')
{
  const counter: { name: string; caught: boolean; how: string }[] = []

  // (أ) إعادة الحارس القديم: مُحلّل إنجليزي يُفرغ كل معرّف كتالوج.
  const emptied = exercises.filter((ex) => {
    const arDepth = rendered(ex, 'ar').tips.length
    const enDepth = getExercise(ex.id) ? 0 : rendered(ex, 'en').tips.length
    return arDepth !== enDepth
  }).length
  counter.push({
    name: 'إعادة الحارس `if (getExercise(id)) return []`',
    caught: emptied === exercises.length,
    how: `«تكافؤ العمق» يسقط على ${emptied}/${exercises.length} تمرينًا`,
  })

  // (ب) ادّعاء خصوصية إنجليزية بلا نظير عربي.
  const overclaim = { ...exercises[0], techniqueTipsEn: ['A cue authored for this exercise only.'] } as Exercise
  counter.push({
    name: 'نصائح إنجليزية مؤلَّفة لتمرين بلا نظير عربي',
    caught: tipsArePatternLevel(overclaim, 'ar') !== tipsArePatternLevel(overclaim, 'en'),
    how: '«منشأ واحد في اللغتين» يسقط باسمه',
  })

  // (ج) تعديل تعبير الحسم في المصدر دون تحديث المحاكاة.
  const mutated = resolutionBlock(read(DETAIL).replace('const tips = g.tips', 'const tips: string[] = []'))
  counter.push({
    name: 'تعديل تعبير الحسم في ExerciseDetail بلا تحديث الإثبات',
    caught: mutated !== null && mismatched(mutated).some((x) => x.startsWith('tips=')),
    how: '«كل إسناد يطابق المحاكاة» يسقط باسم الحقل',
  })

  // (د) التفاف: تعليق التعبير الحقيقي وإبقاء نصّه داخل الكتلة ليُرضي `includes`.
  const smuggled = resolutionBlock(
    read(DETAIL).replace(
      'const mistakes = cue.mistakes.length ? cue.mistakes : g.mistakes',
      'const mistakes: string[] = []\n  // const mistakes = cue.mistakes.length ? cue.mistakes : g.mistakes',
    ),
  )
  counter.push({
    name: 'تعليق التعبير الحقيقي وإبقاء نصّه داخل الكتلة',
    caught: smuggled !== null && mismatched(smuggled).some((x) => x.startsWith('mistakes=')),
    how: 'التجريد من التعليقات يمنع إرضاء الفحص بسطر ميت',
  })

  // (هـ) التفاف: إسناد ثانٍ مدسوس بعد الإسناد الصحيح.
  const doubled = resolutionBlock(
    read(DETAIL).replace('const tips = g.tips', 'const tips = g.tips\n  const safety = ' + "''"),
  )
  counter.push({
    name: 'إسناد ثانٍ مدسوس لنفس الحقل داخل الكتلة',
    caught: doubled !== null && mismatched(doubled).some((x) => x.startsWith('safety=')),
    how: 'شرط «مرّة واحدة» يسقط باسم الحقل',
  })

  for (const c of counter) check(`محاكاة: ${c.name} → ${c.how}`, c.caught)
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} صدق الإرشاد: ${pass} نجح · ${fails.length} فشل`)
if (fails.length > 0) {
  console.log('\nالإخفاقات:')
  fails.forEach((f) => console.log('  • ' + f))
  process.exit(1)
}
