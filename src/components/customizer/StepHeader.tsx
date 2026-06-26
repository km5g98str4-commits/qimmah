import { Icon } from '@/components/Icon'

interface StepHeaderProps {
  icon: string
  title: string
  description?: string
}

/** ترويسة موحّدة لكل خطوة في المعالج. */
export function StepHeader({ icon, title, description }: StepHeaderProps) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-black text-ink-900 sm:text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
    </div>
  )
}
