/**
 * محرّك المتصفح لاختبارات E2E — Chromium افتراضًا، وWebKit عند الطلب.
 *
 * لماذا وُجد هذا الملف: كانت كل سكربتات E2E تستورد `chromium` من `playwright`
 * مباشرةً، فلا سبيل لتشغيلها على محرّك آخر إلا بتعديل كل ملف. وسجّل الإطلاق
 * (`STATE.md`) أعلن أن التحقّق على Safari/WebKit **إجراء مطلوب قبل الإنتاج**
 * وأنه تعذّر لأن الحاوية التي نُفِّذ فيها العمل لا تحمل WebKit.
 *
 * والجمهور المستهدَف سعودي/خليجي على الجوال، حيث iOS Safari هو السائد — وعطل
 * BUG-024 نفسه كان **على شكل Safari** (تخزين محجوب). فبقاء كل الأدلّة على
 * Chromium وحده فجوة حقيقية لا شكلية.
 *
 * الاستعمال: `E2E_ENGINE=webkit npm run test:e2e:navigation`
 *
 * التصميم: نُصدِّر كائنًا باسم `chromium` عمدًا كي يبقى **كل موضع نداء كما هو**
 * (`chromium.launch({...})`)، فلا يتغيّر من السكربتات إلا سطر الاستيراد. وحين
 * يكون المحرّك غير Chromium نُسقط الخيارات الخاصة به (`args` مثل `--no-sandbox`
 * و`executablePath` الذي يشير إلى ثنائي Chromium) لأن WebKit يرفضها.
 */
import * as pw from 'playwright'

const NAME = (process.env.E2E_ENGINE || 'chromium').toLowerCase()
const SUPPORTED = ['chromium', 'webkit', 'firefox']

if (!SUPPORTED.includes(NAME)) {
  throw new Error(`E2E_ENGINE غير معروف: «${NAME}». المدعوم: ${SUPPORTED.join(' · ')}`)
}

/** اسم المحرّك الفعّال — تطبعه السكربتات في ترويسة نتائجها. */
export const engineName = NAME

function sanitize(opts = {}) {
  if (NAME === 'chromium') return opts
  const o = { ...opts }
  delete o.args
  delete o.executablePath
  return o
}

/**
 * واجهة متوافقة مع `chromium` من playwright، موجّهة للمحرّك المختار.
 * الاسم مقصود: يُبقي مواضع النداء القائمة بلا تعديل.
 */
export const chromium = {
  launch: (opts = {}) => pw[NAME].launch(sanitize(opts)),
  launchPersistentContext: (dir, opts = {}) => pw[NAME].launchPersistentContext(dir, sanitize(opts)),
}
