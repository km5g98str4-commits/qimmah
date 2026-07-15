// يقرأ أسماء المكمّلات/الأدوية الحقيقية للمستخدم من خطته المحفوظة (wellnessPlan) — لعرضها
// في نص تذكير المكمّلات فقط؛ لا مواعيد جرعة فردية مخزَّنة في المشروع (السجلّ الحالي أسماء
// فقط)، فتذكير واحد يوميًا يذكر الأسماء بدل مواعيد لكل عنصر غير موجودة أصلًا.

import { hasSavedCustomization, loadCustomization } from '@/lib/customization'
import { getSupplement } from '@/data/supplementLibrary'
import { getMedication } from '@/data/medications'

/** أسماء المكمّلات والأدوية العربية من خطة المستخدم الحقيقية، أو مصفوفة فارغة إن لا خطة/لا عناصر. */
export function readSupplementNames(): string[] {
  if (!hasSavedCustomization()) return []
  const wp = loadCustomization().wellnessPlan
  // customNameAr أولًا (عنصر مخصّص أدخله المستخدم يدويًا)، وإلا اسم المكتبة عبر المعرّف.
  const suppNames = (wp?.supplements ?? [])
    .map((s) => s.customNameAr?.trim() || getSupplement(s.supplementId || s.id)?.nameAr)
    .filter((n): n is string => Boolean(n))
  const medNames = (wp?.medications ?? [])
    .map((m) => m.customNameAr?.trim() || getMedication(m.medicationId || m.id)?.nameAr)
    .filter((n): n is string => Boolean(n))
  return [...suppNames, ...medNames]
}
