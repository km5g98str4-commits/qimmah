// ============================================================================
// حارس البيئة — [CTO-BACKEND-003] §5
// ============================================================================
// يقف بين أي أمر (هجرة · نشر طرفية · سكربت) وبين مشروع Supabase، ويرفض ما لم
// يكن الهدف **مُعلَنًا تجريبيًا بالمرجع**، لا بالاسم ولا بالنيّة.
//
// ─────────────────────────────────────────────────────────────────────────────
// لماذا لا يُوثَق باسم فيه "staging":
//
//   الاسم نصٌّ يكتبه إنسان متعب في الثالثة فجرًا. مشروع اسمه
//   `qimmah-staging-old` قد يكون هو الإنتاج بعد إعادة تسمية، ومشروع اسمه
//   `qimmah` قد يكون التجريبي. **المرجع (`project ref`) وحده معرّف ثابت**
//   لا يُعاد استخدامه ولا يُغيّره أحد بعد الإنشاء — فعليه وحده يُبنى القرار.
//   ويحرس هذا القرارَ فحصٌ يزرع اسمًا فيه "staging" ويثبت أنه **يُرفض** ما لم
//   يكن مرجعه مُعلَنًا.
//
// ─────────────────────────────────────────────────────────────────────────────
// مرحلتان، والفصل بينهما هو جوهر الأمر:
//
//   ① **دون اتصال** — قائمة منع الإنتاج ثم قائمة السماح ثم إعلان البيئة.
//      لا شبكة ولا قاعدة ولا اعتماد. أي رفض هنا يقع **قبل أن يلمس الكود
//      أي شيء حيّ** — وهذا بالضبط ما يطلبه §5: مرجع الإنتاج المزروع يُرفض
//      باسمه قبل أي وصول لقاعدة أو نشر.
//   ② **باتصال** — بعد نجاح ①: علامة مزروعة عمدًا في القاعدة الهدف تقول
//      «أنا تجريبي». تُدارك خطأ التهيئة الذي تنجو منه ①: مرجع صحيح في
//      قائمة السماح لكن أُشير به إلى قاعدة أخرى.
//
// ترتيب المنع قبل السماح مقصود: لو أُدرج مرجع الإنتاج في القائمتين خطأً،
// **المنع يفوز**. قائمة سماح مخترقة لا تكفي لفتح الإنتاج.
// ============================================================================
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

export const CONFIG_PATH = join(
  dirname(fileURLToPath(import.meta.url)), 'environment.json',
)

export const loadConfig = (p = CONFIG_PATH) => JSON.parse(readFileSync(p, 'utf8'))

/** أسباب الرفض — مُعرِّفات ثابتة يطابقها الإثبات، لا رسائل حرّة. */
export const REFUSAL = {
  REF_MISSING: 'ref_missing',
  PRODUCTION_DENIED: 'production_ref_denied',
  NO_ALLOWLIST: 'no_staging_allowlist',
  NOT_ALLOWLISTED: 'ref_not_allowlisted',
  ENV_NOT_DECLARED: 'env_not_declared',
  MARKER_UNREADABLE: 'staging_marker_unreadable',
  MARKER_MISMATCH: 'staging_marker_mismatch',
}

/**
 * يستخرج مرجع المشروع من رابط Supabase.
 * `https://abcdefghijklm.supabase.co` ⇒ `abcdefghijklm`
 * ويُرجع `null` لأي شكل آخر — **لا تخمين**، والمجهول يُرفض لاحقًا.
 */
export function refFromUrl(url) {
  const m = /^https:\/\/([a-z0-9]{16,32})\.supabase\.co\/?$/i.exec(String(url ?? '').trim())
  return m ? m[1].toLowerCase() : null
}

/**
 * المرحلة ① — **دون أي اتصال**.
 *
 * @returns {{ok: true, ref: string} | {ok: false, code: string, message: string}}
 */
export function preflightOffline({ targetRef, targetUrl, env = {}, config = loadConfig() }) {
  const ref = String(targetRef ?? refFromUrl(targetUrl) ?? '').trim().toLowerCase()
  if (!ref) {
    return refuse(REFUSAL.REF_MISSING, 'لا مرجع مشروع: مرّر targetRef أو targetUrl صالحًا.')
  }

  const prod = (config.productionRefs ?? []).map((r) => String(r).trim().toLowerCase())
  // المنع أولًا وقبل كل شيء — ولو كان المرجع في قائمة السماح أيضًا.
  if (prod.includes(ref)) {
    return refuse(REFUSAL.PRODUCTION_DENIED,
      `المرجع ${ref} مسجَّل مشروعَ إنتاج. حزمة staging لا تقبله بأي حال.`)
  }

  const allow = (config.stagingAllowedRefs ?? []).map((r) => String(r).trim().toLowerCase())
  if (allow.length === 0) {
    return refuse(REFUSAL.NO_ALLOWLIST,
      'قائمة مشاريع staging فارغة. أضف المرجع في scripts/staging/environment.json أولًا.')
  }
  if (!allow.includes(ref)) {
    return refuse(REFUSAL.NOT_ALLOWLISTED,
      `المرجع ${ref} غير مُعلَن تجريبيًا. الاسم لا يكفي — المرجع وحده يُقرَّر به.`)
  }

  const declared = String(env.QIMMAH_TARGET_ENV ?? '').trim().toLowerCase()
  if (declared !== String(config.requiredEnvDeclaration ?? 'staging')) {
    return refuse(REFUSAL.ENV_NOT_DECLARED,
      `QIMMAH_TARGET_ENV يجب أن تساوي "${config.requiredEnvDeclaration}" صراحةً. القيمة الحالية: "${declared || '(غائبة)'}".`)
  }

  return { ok: true, ref }
}

function refuse(code, message) {
  return { ok: false, code, message }
}

/**
 * المرحلة ② — بعد نجاح ① فقط.
 *
 * `connect` دالة تُحقَن: تأخذ المرجع وتُرجع `{ query(sql) }`. حقنها ليس ترفًا
 * اختباريًا — هو ما يجعل «لم يُلمَس شيء حيّ عند الرفض» **قابلًا للإثبات**
 * بدل أن يكون ادّعاءً: الإثبات يمرّر موصولًا يَعُدّ نداءاته، ويؤكّد أنه صفر.
 */
export async function preflightFull({ targetRef, targetUrl, env = {}, config = loadConfig(), connect }) {
  const phase1 = preflightOffline({ targetRef, targetUrl, env, config })
  if (!phase1.ok) return { ...phase1, phase: 1, touchedTarget: false }

  if (typeof connect !== 'function') {
    return { ok: true, ref: phase1.ref, phase: 1, touchedTarget: false, markerChecked: false }
  }

  let value
  try {
    const conn = await connect(phase1.ref)
    const r = await conn.query(
      `select env from ${config.markerSchema}.${config.markerTable} limit 1`)
    value = r?.rows?.[0]?.env
  } catch (e) {
    return {
      ...refuse(REFUSAL.MARKER_UNREADABLE,
        `تعذّرت قراءة علامة البيئة (${config.markerSchema}.${config.markerTable}): ${String(e.message || e).split('\n')[0]}`),
      phase: 2, touchedTarget: true,
    }
  }

  if (String(value ?? '').trim().toLowerCase() !== String(config.markerExpectedValue).toLowerCase()) {
    return {
      ...refuse(REFUSAL.MARKER_MISMATCH,
        `علامة البيئة تقول "${value ?? '(فارغة)'}" لا "${config.markerExpectedValue}".`),
      phase: 2, touchedTarget: true,
    }
  }

  return { ok: true, ref: phase1.ref, phase: 2, touchedTarget: true, markerChecked: true }
}

// ── تشغيل مباشر: بوّابة لأي أمر لاحق ────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = preflightOffline({
    targetRef: process.env.SUPABASE_PROJECT_REF,
    targetUrl: process.env.SUPABASE_URL,
    env: process.env,
  })
  if (!r.ok) {
    console.error(`\n⛔ رُفض قبل أي اتصال — [${r.code}]\n   ${r.message}\n`)
    process.exit(1)
  }
  console.log(`\n✅ المرحلة ① اجتازت للمرجع ${r.ref} (لم يُلمس شيء حيّ بعد).\n`)
}
