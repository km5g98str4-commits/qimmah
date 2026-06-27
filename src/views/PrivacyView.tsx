import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'

interface PrivacyViewProps {
  onBack: () => void
}

function Block({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary-c">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-black text-ink-900">{title}</h2>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </div>
  )
}

/** صفحة الخصوصية — توضّح كيف تُخزَّن بيانات المستخدم وتُدار. */
export function PrivacyView({ onBack }: PrivacyViewProps) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Icon name="ShieldCheck" className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-black text-ink-900">سياسة الخصوصية</h1>
          </div>
          <button type="button" onClick={onBack} className="btn-ghost px-4 py-2 text-xs">
            <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
            رجوع
          </button>
        </div>
      </header>

      <main className="container-page py-10">
        <p className="mb-8 rounded-xl border border-primary-soft bg-primary-soft p-4 text-sm font-bold text-ink-900">
          خصوصيتك أولوية. قِمّة مصمّم ليعمل بأقل قدر من البيانات، ومعظم بياناتك تبقى على جهازك.
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          <Block icon="Smartphone" title="ما الذي نخزّنه ووضع الضيف">
            <p>افتراضيًا يعمل قِمّة في «وضع محلي/ضيف»: تُحفظ بياناتك (ملفك، خطتك، تمارينك، تغذيتك، مكملاتك وأدويتك، قياساتك، التزاماتك) داخل متصفّحك على جهازك فقط (localStorage).</p>
            <p>لا نطلب تسجيل دخول للبدء، ولا تُرسَل هذه البيانات إلى أي خادم في الوضع المحلي.</p>
          </Block>

          <Block icon="Boxes" title="الوضع السحابي (إن فُعّل)">
            <p>إذا فُعّلت المزامنة السحابية مستقبلًا، تُخزَّن نسخة من بياناتك في حسابك لمزامنتها بين أجهزتك.</p>
            <p>يبقى التفعيل اختياريًا، وتقدر الاكتفاء بالوضع المحلي.</p>
          </Block>

          <Block icon="Download" title="التصدير والاستيراد">
            <p>تقدر تصدّر بياناتك كملف على جهازك في أي وقت، وتستوردها لاحقًا أو على جهاز آخر.</p>
            <p>ملف التصدير ملكك أنت — تتحكّم به وتحفظه أينما تريد.</p>
          </Block>

          <Block icon="Trash2" title="الحذف وإعادة التعيين">
            <p>تقدر تحذف بياناتك أو تعيد ضبط التطبيق بالكامل من الإعدادات؛ يؤدي ذلك إلى مسح ما هو محفوظ على جهازك.</p>
            <p>مسح بيانات المتصفح يدويًا يحذف بياناتك المحلية أيضًا.</p>
          </Block>

          <Block icon="Ruler" title="القياسات وصور التقدّم">
            <p>القياسات (وزن، محيطات) تُخزَّن محليًا مثل بقية بياناتك.</p>
            <p>إن أُضيفت صور التقدّم مستقبلًا، فستبقى على جهازك ولن تُرفع دون إذنك الصريح.</p>
          </Block>

          <Block icon="Globe" title="روابط الطرف الثالث (يوتيوب وغيره)">
            <p>تحتوي شروحات التمارين على روابط لمنصّات خارجية مثل يوتيوب. عند فتحها تنطبق سياسات تلك المنصّات، ولا نتحكّم نحن بها.</p>
            <p>بعض الروابط عبارة عن «بحث يوتيوب موثوق» وليست بالضرورة فيديو رسميًا.</p>
          </Block>

          <Block icon="Lock" title="لا نبيع بياناتك">
            <p>لا نبيع بياناتك ولا نتاجر بها مع أي جهة. هدف التطبيق مساعدتك على تنظيم رحلتك فقط.</p>
          </Block>

          <Block icon="AlertTriangle" title="حساسية البيانات الصحية">
            <p>قد تتضمّن بياناتك معلومات صحية حسّاسة (أدوية، حالات، قياسات). تعامل معها بحذر، وتجنّب مشاركة ملف التصدير مع من لا تثق به.</p>
            <p>قِمّة أداة تتبّع وتنظيم، وليست جهة رعاية صحية.</p>
          </Block>
        </div>

        <p className="mt-8 text-xs text-ink-400">
          قد نحدّث هذه السياسة عند إضافة ميزات جديدة. استمرارك في استخدام التطبيق يعني موافقتك على النسخة المحدّثة.
        </p>
      </main>

      <Footer />
    </div>
  )
}
