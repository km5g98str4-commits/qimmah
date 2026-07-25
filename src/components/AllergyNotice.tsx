import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'

// تنبيه الحساسيات الغذائية.
//
// لماذا وُجد: الإعداد يجمع حساسيات المستخدم (`foodPreferences.allergies`) لكن
// مولّد خطة الوجبات **لا يقرأها إطلاقًا** — لا في planGenerator ولا nutritionPlan.
// النتيجة: مستخدم أعلن حساسية من المكسّرات قد تُقترح له وجبة تحتوي مكسّرات.
//
// الفلترة الحقيقية تحتاج وسم كل عنصر غذائي بمسبّباته (مهمّة بيانات كبيرة موثّقة
// في خطة التسليم). حتى ذلك الحين: **لا نصمت**. نعرض للمستخدم ما أعلنه ونقول
// صراحةً إن الخطة غير مُفلترة — تحذير صادق خير من ثقة زائفة.

export function AllergyNotice({ className }: { className?: string }) {
  const profile = loadOnboardingProfile()
  const allergies = profile?.foodPreferences?.allergies ?? []
  if (!allergies.length) return null

  return (
    <div
      className={cn('rounded-xl border border-warning/40 bg-warning/10 p-3.5', className)}
      role="note"
    >
      <div className="flex items-start gap-2.5">
        <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="text-xs font-black text-ink-900">راجع مكوّنات وجباتك</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-700">
            سجّلت حساسية من: <span className="font-bold">{allergies.join('، ')}</span>. خطة الوجبات
            الحالية <span className="font-bold">لا تستبعدها تلقائيًا بعد</span> — تحقّق من مكوّنات أي
            وجبة قبل تنفيذها، وبدّلها إن لزم.
          </p>
        </div>
      </div>
    </div>
  )
}
