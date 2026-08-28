// مفردات نوع الوسائط وحالة الحقوق — مصدر واحد يستهلكه ختّامُ السجلّ وحارسُه معًا.
//
// وُضعت في وحدة مستقلّة عمدًا: media-rights-proof.mjs سكربت ينفّذ نفسه عند
// الاستيراد (يشغّل خادمًا ويهضم ٣٠٥ أصول)، فاستيراد ثابتٍ منه يعني تشغيله.
//
// المفردات:
//   REAL_PHOTO             لقطة فوتوغرافية لشخص حقيقي، مصدرها طرف ثالث موثَّق.
//   IN_HOUSE_ILLUSTRATION  رسم حركة متجهي أصلي من مولّدنا — ليس صورة.
//   IN_HOUSE_DIAGRAM       مخطّط جهاز متجهي أصلي من مولّدنا — ليس صورة.
//
//   VERIFIED    ترخيص معلن + دليل قابل للفتح + (للخارجي) منبع ومستودع.
//   UNRESOLVED  لا يمكن إثبات الحقوق ⇒ الأصل **لا يُشحن**. الصفّ إعلان نقص لا إذن عرض.
//
// ⚠️ حدّ صادق: REAL_PHOTO تصف شكل الأصل (فوتوغرافيا لا رسمًا). لا تدّعي أننا نملك
// إذن المصوّر أو إقرار العارض — الترخيص المعلن هو ترخيص المستودع المصدر وحده.

export const MEDIA_KINDS = Object.freeze(['REAL_PHOTO', 'IN_HOUSE_ILLUSTRATION', 'IN_HOUSE_DIAGRAM'])
export const RIGHTS_STATUSES = Object.freeze(['VERIFIED', 'UNRESOLVED'])

/** أنواع لا تُعرض للمستخدم كصورة حقيقية — بديل معلَن لا فوتوغرافيا. */
export const FALLBACK_KINDS = Object.freeze(['IN_HOUSE_ILLUSTRATION', 'IN_HOUSE_DIAGRAM'])

/**
 * حالة الحقوق تُشتقّ من الدليل ولا تُكتب يدويًا: بلا ترخيص أو بلا دليل ⇒ UNRESOLVED.
 * هذا هو الفرق بين «راجعناه» و«افترضناه».
 */
export function deriveRightsStatus(entry) {
  if (!entry || !entry.license || !String(entry.license).trim()) return 'UNRESOLVED'
  if (!entry.evidenceUrl || !String(entry.evidenceUrl).trim()) return 'UNRESOLVED'
  if (entry.verdict === 'CLEARLY-LICENSED') {
    // مصدر خارجي: لا بدّ من رابط المنبع ومستودعه — وإلا فالسلسلة مقطوعة.
    return entry.upstreamUrl && entry.sourceRepo ? 'VERIFIED' : 'UNRESOLVED'
  }
  if (entry.verdict === 'IN-HOUSE') return 'VERIFIED'
  return 'UNRESOLVED'
}
