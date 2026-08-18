// جسر القواميس لوحدة الرحلات.
//
// لماذا ملف مستقل ولا يوسّع scripts/e2e/lib/app-copy.mjs:
//   app-copy.mjs يستهلكه e2e-onboarding.mjs الجاري، و§1.4 من الميثاق يمنع الحارة
//   من تعديل ملف مشترك تعتمد عليه حارة أخرى. التوسيع هنا صفر تصادم؛ والنمط نفسه
//   (حزم esbuild لنقطة دخول TS ثم استيرادها) متّبع حرفيًا كما في الملف الأصلي.
//
// القاعدة الحاكمة: **صفر نصّ واجهة مكتوب هنا.** كل ما تنطق به الرحلة يأتي من
// مصدر الحقيقة الذي يرسم منه المكوّن. نصّ تغيّر في القاموس يجب أن يُحدّث الرحلة
// تلقائيًا، لا أن يكسرها بخطأ مضلّل يبدو عطلًا في المنتج.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

const ENTRY = `
export { V2_ONBOARDING, V2_GOAL_MODEL, V2_TAB_LABELS } from '@/design-system/v2/labels'
export { onboardingIntentStrings, goalWordingFor } from '@/i18n/dict/onboardingIntent'
export { bodyStepStrings } from '@/i18n/dict/bodyStep'
export { trainingHistoryStrings } from '@/i18n/dict/trainingHistory'
export { onboardingLifestyleStrings } from '@/i18n/dict/onboardingLifestyle'
export { neatChoices, dietPatternChoices } from '@/data/planBuilder'
export { profileChoiceStrings } from '@/i18n/dict/profileChoices'
export { policyCopy } from '@/data/policyCopy'
export { DATA_KEYS } from '@/lib/userDataKeys'
export { getStrings } from '@/config/strings'
`

let cached = null

export async function loadJourneyCopy() {
  if (cached) return cached
  const dir = mkdtempSync(join(tmpdir(), 'journey-copy-'))
  const entryFile = join(dir, 'entry.ts')
  writeFileSync(entryFile, ENTRY)

  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(ROOT, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
    logLevel: 'error',
  })

  const outFile = join(dir, 'journey-copy.mjs')
  writeFileSync(outFile, result.outputFiles[0].text)
  const mod = await import(pathToFileURL(outFile).href)

  cached = {
    /** نصوص الإعداد لكل لغة. */
    onboarding: (lang) => mod.V2_ONBOARDING[lang],
    /** النية والمستوى وصياغة الأهداف. */
    intent: (lang) => mod.onboardingIntentStrings[lang],
    /** صياغة الأهداف حسب المستوى — نفس الدالة التي يستدعيها المكوّن. */
    goalWording: (lang, level) => mod.goalWordingFor(lang, level),
    /** نصوص خطوة الجسد. */
    body: (lang) => mod.bodyStepStrings[lang],
    /** تاريخ التدريب والسياق اليومي — من نفس قواميس الواجهة. */
    history: (lang) => mod.trainingHistoryStrings[lang],
    lifestyle: (lang) => mod.onboardingLifestyleStrings[lang],
    neatChoices: mod.neatChoices,
    dietPatternChoices: mod.dietPatternChoices,
    /** تسميات الشريط السفلي — مصدر الحقيقة الذي تحرسه بوابة السياسة. */
    tab: (key, lang) => mod.V2_TAB_LABELS[key][lang],
    /** خيارات الملف — منها تنويه القاصر. */
    profileChoices: (lang) => mod.profileChoiceStrings[lang],
    /** نصّ إقرار البيانات الصحية. */
    policy: (lang) => mod.policyCopy[lang],
    dataKeys: mod.DATA_KEYS,
    /** نصوص `config/strings` — منها سطر «البدء بلا حساب» على الترحيب. */
    strings: (lang) => mod.getStrings(lang),
  }
  return cached
}

/**
 * يتأكّد أن مصطلحًا ما زال موجودًا في ملف مصدر بعينه.
 *
 * تستخدمه التأكيدات السلبية: نفيُ ظهور مصطلح لا معنى له إن كان المصطلح غير
 * موجود في المنتج أصلًا — يمرّ الفحص مجّانًا ويعطي طمأنينة كاذبة (§4.2:
 * «مرور غير مستحقّ ليس نجاحًا»). فنُسقط الحارس باسمه بدل أن يمرّ فارغًا.
 */
export function assertTermExistsInSource(term, sourceRelPath) {
  const file = resolve(ROOT, sourceRelPath)
  const text = readFileSync(file, 'utf8')
  if (!text.includes(term)) {
    throw new Error(
      `المصطلح «${term}» لم يعد موجودًا في ${sourceRelPath} — ` +
        'التأكيد السلبي عليه صار بلا معنى. راجع الحارس بدل تركه يمرّ فارغًا.',
    )
  }
  return term
}
