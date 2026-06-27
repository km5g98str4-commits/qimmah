import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'

interface TermsViewProps {
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

/** صفحة الشروط — توضّح حدود الاستخدام والمسؤولية وأن التطبيق ليس نصيحة طبية. */
export function TermsView({ onBack }: TermsViewProps) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Icon name="FileText" className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-black text-ink-900">شروط الاستخدام</h1>
          </div>
          <button type="button" onClick={onBack} className="btn-ghost px-4 py-2 text-xs">
            <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
            رجوع
          </button>
        </div>
      </header>

      <main className="container-page py-10">
        <p className="mb-8 rounded-xl border border-gold-200/60 bg-gold-200/20 p-4 text-sm font-bold text-ink-900">
          قِمّة أداة لتنظيم رياضتك وتغذيتك ومتابعتك — وليست بديلًا عن أي مختص. باستخدامك للتطبيق فأنت توافق على ما يلي.
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          <Block icon="AlertTriangle" title="ليست نصيحة طبية">
            <p>المحتوى داخل قِمّة لأغراض التنظيم والتثقيف العام فقط، ولا يُعدّ تشخيصًا أو علاجًا أو نصيحة طبية.</p>
          </Block>

          <Block icon="Users" title="لا يغني عن المختص">
            <p>قِمّة ليس بديلًا عن الطبيب أو أخصائي التغذية أو المدرّب. استشر المختص قبل أي تغيير كبير في تمارينك أو تغذيتك أو أدويتك.</p>
          </Block>

          <Block icon="Dumbbell" title="مخاطر التمرين">
            <p>التمارين الرياضية قد تنطوي على خطر إصابة. أدِّ الحركات بتقنية صحيحة وأوزان مناسبة لمستواك، وتوقّف عند أي ألم.</p>
            <p>إذا كانت لديك إصابة أو حالة صحية، استشر مختصًا قبل البدء.</p>
          </Block>

          <Block icon="Pill" title="تنبيه الأدوية والمكملات">
            <p>قِمّة يساعدك على تتبّع المكملات والأدوية فقط، ولا يوصي بجرعات علاجية.</p>
            <p>لا تبدأ أو توقف أو تغيّر جرعة أي دواء بدون استشارة الطبيب أو الصيدلي. الجرعات التي تُدخلها هي ما وصفه لك المختص.</p>
          </Block>

          <Block icon="Salad" title="تقديرات التغذية">
            <p>القيم الغذائية في التطبيق تقديرية وقد تختلف حسب المنتج وطريقة التحضير والكمية.</p>
            <p>استخدمها كدليل تقريبي لا كقياس دقيق.</p>
          </Block>

          <Block icon="ShieldCheck" title="مسؤولية المستخدم">
            <p>أنت مسؤول عن قراراتك المبنية على استخدام التطبيق، وعن صحّة البيانات التي تُدخلها.</p>
            <p>نقدّم التطبيق «كما هو» دون ضمان نتائج محدّدة، ولا نتحمّل مسؤولية أي ضرر ناتج عن سوء الاستخدام.</p>
          </Block>
        </div>

        <p className="mt-8 text-xs text-ink-400">
          قد نحدّث هذه الشروط من وقت لآخر. استمرارك في استخدام التطبيق يعني موافقتك على النسخة المحدّثة.
        </p>
      </main>

      <Footer />
    </div>
  )
}
