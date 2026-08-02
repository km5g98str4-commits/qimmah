/**
 * نيّة فتح موضعية لمعالج التخصيص — [CTO-65] البند ٨.
 *
 * زرّ «تعديل» في بطاقة المكمّلات والأدوية كان يفتح المعالج من أوّله (`onNavigate('setup')`)
 * فيصل المستخدم إلى خطوة الأساسيات لا إلى ما ضغط عليه. الميزة مبنيّة (`StepWellness`)،
 * والخلل توجيه لا غياب — فالحلّ توصيل الزرّ بوجهته لا إزالته.
 *
 * تُكتب النيّة في `sessionStorage` قبل التنقّل، ويقرأها `CustomizationCenter` مرّة واحدة
 * عند التركيب ثم يمسحها فورًا، فلا تعلق على فتحات لاحقة. نفس نمط
 * `qimmah:quick-log-intent` القائم — لا آلية توجيه جديدة.
 */
export const SETUP_FOCUS_KEY = 'qimmah:setup-focus'

/** الخطوات التي يجوز القفز إليها مباشرةً. مفتاح العنوان لا رقم الخطوة. */
export type SetupFocus = 'wellness'

/** يسجّل نيّة الفتح على خطوة بعينها. آمن في بيئة بلا نافذة أو بتخزين محجوب. */
export function requestSetupFocus(focus: SetupFocus): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SETUP_FOCUS_KEY, focus)
  } catch {
    /* تخزين محجوب — يُفتح المعالج من أوّله كما كان، بلا كسر. */
  }
}
