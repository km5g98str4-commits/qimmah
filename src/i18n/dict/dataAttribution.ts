import type { Lang } from '@/lib/appPreferences'

/**
 * نسب مصدر بيانات المنتجات المعبّأة — **التزام رخصة، لا تزيين**.
 *
 * رخصة ODbL توجب النسب عند التوزيع العلني، وشحن بيانات مشتقّة من Open Food Facts
 * داخل التطبيق **هو** توزيع علني. لوحة المسح كانت تعرض نسبها منذ البدء؛ وحين صار
 * الكتالوج الكبير يغذّي **نتائج البحث** أيضًا، صار النسب واجبًا هناك كذلك.
 *
 * والشرط المقابل مهمّ بالقدر نفسه: لا يظهر هذا النصّ على الأصناف المحلية
 * المنسَّقة، وإلا نسبنا بيانات قِمّة إلى مصدر لم تأتِ منه — نسبٌ كاذب في الاتجاه
 * المعاكس. ولذلك يرتبط الإظهار بوجود سجل مشتقّ من OFF فعلًا (`off:`).
 *
 * النصّ معتمد حرفيًا من `docs/execution/qimmah-postweb/food/DEPENDENCIES.md` (D-2).
 * النبرة فصحى مخفّفة لأنها كتلة نسبٍ قانونية معلَنة، لا صوت واجهة (§6).
 */
export interface DataAttributionStrings {
  /** يظهر تحت نتائج البحث حين تتضمّن سجلات مشتقّة من OFF. */
  packagedFood: string
}

export const dataAttributionStrings: Record<Lang, DataAttributionStrings> = {
  ar: { packagedFood: 'بيانات المنتجات المعبّأة من Open Food Facts، متاحة برخصة ODbL.' },
  en: { packagedFood: 'Packaged product data from Open Food Facts, available under the ODbL licence.' },
}
