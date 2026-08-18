/**
 * الاسم الصالح للتحيّة — **أو لا شيء**.
 *
 * `authContext.userDisplayName` يُرجع البريد كبديل حين لا يوجد اسم
 * (`authContext.tsx:128-133` — `return name || user.email || null`). وهذا صحيح
 * في ترويسة تقنية، وكارثيّ في تحيّة أو صورة رمزية: «يا ziyad@example.com، هذي
 * نقطة البداية» أسوأ من تحيّة بلا اسم، و«ZI» ليست أحرف اسم أحد.
 *
 * كانت الحراسة موجودة في موضع واحد (`SetupView`) وغائبة عن الآخر
 * (`profileV2Model:168-169`)، فرأى المستخدم المسجَّل بريده الكامل اسمًا معروضًا
 * في تبويب «حسابي». نسختان من نفس القرار تعني أن إحداهما ستشيخ — فصارتا واحدة.
 */
export function greetableName(displayName: string | null | undefined): string | null {
  if (!displayName) return null
  const trimmed = displayName.trim()
  // أي بريد إلكتروني يحمل `@`؛ ولا اسم بشري يحمله. الفحص كافٍ وحاسم.
  if (!trimmed || trimmed.includes('@')) return null
  return trimmed
}

/**
 * أوّل اسم صالح من مرشّحين بالترتيب — الاسم الذي كتبه المستخدم بنفسه أولًا،
 * ثم ما يعرفه حسابه. `null` جواب مشروع: تحيّة بلا اسم لا اسم مخترع.
 */
export function firstGreetableName(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    const name = greetableName(candidate)
    if (name) return name
  }
  return null
}
