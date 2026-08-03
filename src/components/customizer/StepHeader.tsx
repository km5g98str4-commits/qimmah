import { Icon } from '@/components/Icon'

interface StepHeaderProps {
  icon: string
  title: string
  description?: string
}

/**
 * ترويسة موحّدة لكل خطوة في المعالج.
 *
 * [CTO-71] البند ٧ — قرار الجودة [QA-44]: المعالج كان **بلا `<h1>` إطلاقًا**؛
 * كل خطوة تبدأ بـ`<h2>` فيبدأ تسلسل العناوين من المستوى الثاني، وقارئ الشاشة
 * لا يجد عنوانًا رئيسيًا للشاشة (خرق WCAG 1.3.1 / 2.4.6).
 *
 * الحلّ `<h1>`: المعالج يعرض **خطوة واحدة في كل مرّة** (`steps[step].Component`
 * في `CustomizationCenter.tsx:233`)، فعنوان الخطوة الظاهر هو عنوان الشاشة فعلًا
 * — لا عنوان قسم داخل صفحة. ولا تعدّد `h1` ممكن لأن ترويسة واحدة تُركَّب.
 * الحجم البصري لم يتغيّر (نفس أصناف Tailwind) — التغيير دلالي بحت.
 */
export function StepHeader({ icon, title, description }: StepHeaderProps) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-xl font-black text-ink-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
    </div>
  )
}
