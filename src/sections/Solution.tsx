import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { sectionCopy } from '@/config/content'
import { product } from '@/config/product'

/** قسم الحل — يقدّم قِمّة كنظام تشغيل واحد يجمع الأدوات المتفرقة. */
const pillars = [
  { icon: 'Globe', label: 'عربي أولاً' },
  { icon: 'Layers', label: 'متكامل' },
  { icon: 'Sparkles', label: 'فاخر' },
  { icon: 'Palette', label: 'قابل للتخصيص' },
]

export function Solution() {
  return (
    <section id="solution" className="section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand" />
      <div className="container-page relative">
        <div className="mx-auto flex flex-col items-center text-center">
          <SectionHeading {...sectionCopy.solution} align="center" />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {pillars.map((p) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-bold text-brand-200"
              >
                <Icon name={p.icon} className="h-4 w-4" />
                {p.label}
              </span>
            ))}
          </div>

          <p className="mt-8 max-w-xl text-sm text-slate-500">
            بالأسفل معاينة حيّة لما يقدّمه {product.name} — تصفّح اللوحة وكل قسم كما سيراه المستخدم.
          </p>
          <a href="#dashboard" className="btn-primary mt-6 text-base">
            شاهد المعاينة
            <Icon name="ArrowLeft" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
