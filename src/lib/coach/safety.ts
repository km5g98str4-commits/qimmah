// ═══════════════════════════════════════════════════════════════════════════
//  حارس مفردات المرشد — [SOVEREIGN-COACH-001].
//
//  ═══ حارسان مقترنان، لا مراجعة عين ═══
//  ① **لا ادّعاء طبي.** المرشد يتكلّم في ملاءمة التمرين وإرشاد التغذية فقط. ولأن
//     «لا تشخيص» قاعدةٌ تُنسى بعد ثلاث موجات، يمسح `findMedicalClaims` **كل
//     نصوص القاموس** — العربية والإنجليزية — على قائمة مفردات مغلقة. القاعدة
//     المختارة أصرم من اللازم عمدًا: **لا مفردة طبية أصلًا، ولو في تنويه نافٍ**.
//     فالتنويه «ليست نصيحة طبية» صحيح، لكن السماح به يفتح ثقب استثناء يتسع؛
//     والصياغة البديلة («وأي قرار صحّي مرجعه مختصّ») تؤدّي المعنى بلا فتحه.
//     ولذلك **لا قائمة استثناء هنا** — ولا حاجة لتأكيد مضادّ يحرسها (§4.2).
//
//  ② **لا ادّعاء تغيير.** المرشد **يقرأ ولا يكتب**: لا يعدّل خطة ولا جدولًا ولا
//     هدفًا. فجملة بصوت التطبيق تقول «عدّلنا خطتك» كذبة وظيفية لا زلّة نبرة.
//     والحارس **مقترن** لا `includes` متفرّقة (§4.2): يسقط النصّ حين يجتمع فيه
//     **فعل بصوت التطبيق** و**مفعول من عالم الخطة** — فبقاء أحدهما وحده
//     («تقدر تبدّله من ورقة التمرين») يمرّ بحقّ.
//
//  الملف نقيّ: لا React ولا تخزين ولا شبكة — يأخذ نصوصًا ويعيد مخالفات مسمّاة.
// ═══════════════════════════════════════════════════════════════════════════

/** رمز المخالفة — يُسمّى في المخرجات وفي الإثبات المضادّ. لا فشل بلا اسم. */
export type CopyViolationCode = 'medical-claim' | 'plan-change-claim'

export interface CopyViolation {
  code: CopyViolationCode
  /** مسار المفتاح داخل القاموس (`ar.lines.sub.notMedical`). */
  key: string
  /** المفردة أو الاقتران الذي أسقط النصّ — لا «فشل عام». */
  term: string
}

// ── التطبيع ─────────────────────────────────────────────────────────────────

/**
 * تطبيع خفيف للعربية: نزع التشكيل والتطويل، وتوحيد صور الألف والياء. يجعل
 * «أدوية» و«ادويه»‑المكتوبة‑بلا‑همزة سواءً أمام القائمة، فلا يفلت ادّعاء
 * بفارق همزة.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
}

const normalize = (text: string): string => normalizeArabic(text).toLowerCase()

// ── ① المفردات الطبية ───────────────────────────────────────────────────────

/**
 * قائمة مغلقة. كل مدخل **مسمّى** فيُطبع في المخالفة.
 * ملاحظات دقّة مقصودة:
 *   • `طبي(?!ع)` تستثني «طبيعي» — وهي كلمة مشروعة تمامًا في وصف الحركة.
 *   • `\bheal(s|ed|ing)?\b` بحدود كلمة، وإلا لأسقطت «health» و«healthy».
 *   • `\btreat` تلتقط treatment/treats ولا تلتقط retreat (الحدّ قبل t).
 */
const MEDICAL_TERMS: ReadonlyArray<{ term: string; pattern: RegExp }> = [
  { term: 'تشخيص', pattern: /تشخيص/ },
  { term: 'يشخص', pattern: /يشخص|شخصنا/ },
  { term: 'علاج', pattern: /علاج/ },
  { term: 'يعالج', pattern: /يعالج|نعالج/ },
  { term: 'شفاء', pattern: /شفاء|يشفي/ },
  { term: 'دواء', pattern: /دواء|ادوية|ادويه/ },
  { term: 'جرعة', pattern: /جرعة|جرعه/ },
  { term: 'مرض', pattern: /مرض/ },
  { term: 'أعراض', pattern: /اعراض/ },
  { term: 'التهاب', pattern: /التهاب/ },
  { term: 'طبي', pattern: /طبي(?!ع)/ },
  { term: 'diagnose', pattern: /\bdiagnos/ },
  { term: 'treat', pattern: /\btreat/ },
  { term: 'therapy', pattern: /\btherap/ },
  { term: 'cure', pattern: /\bcure/ },
  { term: 'heal', pattern: /\bheal(s|ed|ing)?\b/ },
  { term: 'prescribe', pattern: /\bprescri/ },
  { term: 'dose', pattern: /\bdosages?\b|\bdoses?\b/ },
  { term: 'disease', pattern: /\bdisease/ },
  { term: 'illness', pattern: /\billness/ },
  { term: 'symptom', pattern: /\bsymptom/ },
  { term: 'medical', pattern: /\bmedical/ },
  { term: 'clinical', pattern: /\bclinical/ },
  { term: 'patient', pattern: /\bpatient/ },
  { term: 'rehab', pattern: /\brehab/ },
]

// ── ② ادّعاء تغيير الخطة (اقتران لا تفرّق) ──────────────────────────────────

/** أفعال **بصوت التطبيق** — «نحن فعلنا». الفعل الموجَّه للمستخدم ليس منها. */
const APP_ACTOR_PATTERNS: ReadonlyArray<{ term: string; pattern: RegExp }> = [
  { term: 'عدّلنا', pattern: /عدلنا/ },
  { term: 'غيّرنا', pattern: /غيرنا/ },
  { term: 'حدّثنا', pattern: /حدثنا/ },
  { term: 'بدّلنا', pattern: /بدلنا/ },
  { term: 'طبّقنا', pattern: /طبقنا/ },
  { term: 'صحّحنا', pattern: /صححنا/ },
  { term: 'we updated', pattern: /\bwe (updated|changed|applied|adjusted|swapped|modified|rewrote)\b/ },
  { term: 'has been updated', pattern: /\bhas been (updated|changed|applied|adjusted)\b/ },
  { term: 'plan updated', pattern: /\b(plan|schedule|target)s? (was|were|has been|have been)? ?(updated|changed)\b/ },
]

/** مفاعيل من عالم الخطة — ما لا يملك المرشد تغييره. */
const PLAN_OBJECT_PATTERNS: ReadonlyArray<{ term: string; pattern: RegExp }> = [
  { term: 'خطتك', pattern: /خطت/ },
  { term: 'جدولك', pattern: /جدول/ },
  { term: 'سعراتك', pattern: /سعرات/ },
  { term: 'plan', pattern: /\bplan\b/ },
  { term: 'schedule', pattern: /\bschedule\b/ },
  { term: 'calories', pattern: /\bcalorie/ },
  { term: 'targets', pattern: /\btargets?\b/ },
]

// ── المسح ───────────────────────────────────────────────────────────────────

/**
 * يفرد أي شجرة قاموس إلى أزواج (مسار المفتاح، النصّ). يتجاهل غير النصوص، فلا
 * ينهار على قيمة رقمية أو دالة — والانهيار ليس فحصًا (§4.2).
 */
export function collectCopyEntries(root: unknown, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = []
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      out.push([path, node])
      return
    }
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`))
      return
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k)
      }
    }
  }
  walk(root, prefix)
  return out
}

/** ① كل مفردة طبية في أي نصّ — مخالفة مسمّاة بمفتاحها ومفردتها. */
export function findMedicalClaims(entries: ReadonlyArray<readonly [string, string]>): CopyViolation[] {
  const out: CopyViolation[] = []
  for (const [key, text] of entries) {
    const hay = normalize(text)
    for (const { term, pattern } of MEDICAL_TERMS) {
      if (pattern.test(hay)) out.push({ code: 'medical-claim', key, term })
    }
  }
  return out
}

/** ② اجتماع «فعل بصوت التطبيق» مع «مفعول من عالم الخطة» في نصّ واحد. */
export function findPlanChangeClaims(entries: ReadonlyArray<readonly [string, string]>): CopyViolation[] {
  const out: CopyViolation[] = []
  for (const [key, text] of entries) {
    const hay = normalize(text)
    const actor = APP_ACTOR_PATTERNS.find((a) => a.pattern.test(hay))
    if (!actor) continue
    const object = PLAN_OBJECT_PATTERNS.find((o) => o.pattern.test(hay))
    if (!object) continue
    out.push({ code: 'plan-change-claim', key, term: `${actor.term} + ${object.term}` })
  }
  return out
}

/** المسحان معًا — نقطة الاستدعاء الوحيدة في الإثبات. */
export function scanCoachCopy(root: unknown): CopyViolation[] {
  const entries = collectCopyEntries(root)
  return [...findMedicalClaims(entries), ...findPlanChangeClaims(entries)]
}
