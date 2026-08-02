// جسر القواميس المركزية لاختبارات E2E.
//
// المشكلة التي يحلّها: كانت سكربتات E2E تكرّر نصوص الواجهة العربية حرفيًا
// («التالي»، «وين وكيف تتمرّن؟»، «اعتمد خطتي» …) ومفاتيح التخزين
// («qimmah:supabase-auth:v1» …). أي تعديل على النصّ في المصدر كان يكسر
// الاختبار بخطأ مضلّل — يبدو عطلًا في المنتج وهو مجرّد نصّ تغيّر.
//
// الآن: تُستورد النصوص والمفاتيح من مصادر الحقيقة نفسها التي يستخدمها التطبيق:
//   • src/design-system/v2/labels.ts   → نصوص الإعداد (V2_ONBOARDING) ونموذج الأهداف
//   • src/data/policyCopy.ts           → نصّ إقرار البيانات الصحية
//   • src/lib/userDataKeys.ts          → سجلّ مفاتيح التخزين (DATA_KEYS)
//
// الطريقة: حزم esbuild لنقطة دخول TS واحدة ثم استيرادها — نفس النمط المتّبع
// في بقيّة سكربتات الإثبات في هذا المستودع.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** نقطة دخول مؤقّتة تُعيد تصدير ما تحتاجه الاختبارات فقط. */
const ENTRY = `
export { V2_ONBOARDING, V2_GOAL_MODEL } from '@/design-system/v2/labels'
export { onboardingIntentStrings } from '@/i18n/dict/onboardingIntent'
export { policyCopy } from '@/data/policyCopy'
export { DATA_KEYS } from '@/lib/userDataKeys'
`

/**
 * نقطة دخول ثانية — **منطق** تدفّق الإعداد وقواميس خطواته.
 *
 * منفصلة عن `ENTRY` عن قصد: تلك يستهلكها أربعة سكربتات، فتوسيعها يوسّع سطح
 * تصادمها. هذه يستهلكها اختبار الـOnboarding وحده.
 */
const FLOW_ENTRY = `
export { bodyStepStrings } from '@/i18n/dict/bodyStep'
export { onboardingIntentStrings, goalWordingFor } from '@/i18n/dict/onboardingIntent'
export { LAST_INPUT_STEP, validateStep, inRange, AGE_RANGE, HEIGHT_RANGE, WEIGHT_RANGE } from '@/lib/onboardingV2Flow'
`

/** يحزم نقطة دخول TS مؤقّتة ويُعيد الوحدة المستوردة. */
async function bundleEntry(source) {
  const dir = mkdtempSync(join(tmpdir(), 'e2e-copy-'))
  const entryFile = join(dir, 'entry.ts')
  writeFileSync(entryFile, source)

  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(ROOT, 'src') },
    // القواميس بيانات خالصة، لكن الحزم قد تجرّ وحدات تقرأ import.meta.env.
    define: {
      'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
    },
    logLevel: 'error',
  })

  const outFile = join(dir, 'app-copy.mjs')
  writeFileSync(outFile, result.outputFiles[0].text)
  return import(pathToFileURL(outFile).href)
}

let cached = null

/** يحمّل القواميس المركزية مرّة واحدة لكل عملية. */
export async function loadAppCopy() {
  if (cached) return cached

  const mod = await bundleEntry(ENTRY)

  const ar = mod.V2_ONBOARDING.ar
  cached = {
    /** نصوص شاشة الإعداد (العربية) — مصدر الحقيقة نفسه الذي يعرضه المكوّن. */
    onboarding: ar,
    /** نموذج الأهداف: تنشيف / محافظة / تضخيم. */
    goals: mod.V2_GOAL_MODEL,
    /** صياغة النية والمستوى والأهداف التابعة للمستوى. */
    intent: mod.onboardingIntentStrings.ar,
    /** نصوص السياسة (إقرار البيانات الصحية). */
    policy: mod.policyCopy.ar,
    /** سجلّ مفاتيح التخزين كاملًا. */
    dataKeys: mod.DATA_KEYS,
  }
  return cached
}

let cachedFlow = null

/**
 * يحمّل تدفّق الإعداد: **المنطق** (ترتيب الخطوات وحدود القيم) وقواميس خطواته.
 *
 * لماذا المنطق لا النصّ وحده؟ ترتيب خطوات الإعداد تبدّل مرّتين خلال يومين
 * (بيانات الجسم ثم النية)، وصياغة الأهداف صارت تابعة للمستوى — فأي هيكل يثبّت
 * الترتيب أو الوسم عنده يصير بائتًا عند أوّل إعادة صياغة. باشتقاق الاثنين من
 * `validateStep` والقواميس، يتبع الهيكلُ التدفّقَ بدل أن يتخلّف عنه.
 */
export async function loadOnboardingFlow() {
  if (cachedFlow) return cachedFlow

  const mod = await bundleEntry(FLOW_ENTRY)

  cachedFlow = {
    /** نصوص خطوة بيانات الجسم (العربية). */
    body: mod.bodyStepStrings.ar,
    /** نصوص خطوة النية والمستوى (العربية). */
    intent: mod.onboardingIntentStrings.ar,
    /** صياغة الأهداف الواعية بالمستوى — دالّة لا جدول ثابت. */
    goalWordingFor: mod.goalWordingFor,
    /** آخر خطوة إدخال قبل شاشة «خطتك جاهزة». */
    lastInputStep: mod.LAST_INPUT_STEP,
    /** تحقّق الخطوة الواحدة — منه يُشتقّ ترتيب الخطوات. */
    validateStep: mod.validateStep,
    /** النطاقات الفسيولوجية — بها نتحقّق أن بيانات الاختبار ما زالت مقبولة. */
    ranges: { age: mod.AGE_RANGE, height: mod.HEIGHT_RANGE, weight: mod.WEIGHT_RANGE },
    inRange: mod.inRange,
  }
  return cachedFlow
}

/**
 * يُعيد مفتاح تخزين من السجلّ المركزي، ويرمي إن لم يعد موجودًا.
 * الرمي مقصود: مفتاح اختفى من السجلّ يعني أن الاختبار يفحص شيئًا لم يعد موجودًا.
 */
export function requireKey(dataKeys, key) {
  const found = dataKeys.find((d) => d.key === key)
  if (!found) {
    throw new Error(`مفتاح غير مسجّل في src/lib/userDataKeys.ts: ${key}`)
  }
  return found.key
}

/**
 * عكس requireKey: يتأكّد أن المفتاح **ليس** في السجلّ.
 * تستخدمه حالات الهجوم التي تحقن «متجرًا مجهولًا» — لو سُجِّل هذا المفتاح يومًا
 * لتوقّف كونه مجهولًا وفقدت الحالة معناها، فنُسقط الاختبار بدل أن يمرّ زائفًا.
 */
export function assertUnregistered(dataKeys, key) {
  if (dataKeys.some((d) => d.key === key)) {
    throw new Error(`المفتاح «${key}» صار مسجّلًا — لم يعد صالحًا كحالة «متجر مجهول»`)
  }
  return key
}

/**
 * أعلام التطوير (DEV flags) ليست مفاتيح بيانات ولا تُسجَّل في userDataKeys،
 * وهي معرَّفة داخل المكوّن نفسه بلا ثابت مُصدَّر. لذلك تبقى مكتوبة هنا لكن
 * **موثّقة بالمصدر**: نتحقّق أن العَلَم ما زال موجودًا في الملفّ الذي يقرأه،
 * فإن أُعيدت تسميته يسقط الاختبار بخطأ واضح بدل أن يمرّ وهو لا يفعل شيئًا.
 */
export function assertDevFlag(flag, sourceRelPath) {
  const file = resolve(ROOT, sourceRelPath)
  const text = readFileSync(file, 'utf8')
  if (!text.includes(flag)) {
    throw new Error(`عَلَم التطوير «${flag}» لم يعد موجودًا في ${sourceRelPath} — حدّث الاختبار`)
  }
  return flag
}

/** يختار عنوان خيار من قائمة (أهداف/أماكن/تفضيلات) بقيمته لا بنصّه. */
export function labelOf(list, value) {
  const found = list.find((x) => x.value === value)
  if (!found) {
    throw new Error(`قيمة غير موجودة في القاموس المركزي: ${value}`)
  }
  return found.label
}
