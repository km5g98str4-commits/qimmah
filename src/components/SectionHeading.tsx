import { Icon } from './Icon'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  icon?: string
  align?: 'start' | 'center'
}

/** ترويسة قسم موحّدة (eyebrow + عنوان + وصف). */
export function SectionHeading({
  eyebrow,
  title,
  description,
  icon = 'Sparkles',
  align = 'start',
}: SectionHeadingProps) {
  const alignment = align === 'center' ? 'items-center text-center mx-auto' : 'items-start text-start'
  return (
    <div className={`section-heading flex flex-col ${alignment} max-w-2xl`}>
      <span className="eyebrow">
        <Icon name={icon} className="h-3.5 w-3.5" />
        {eyebrow}
      </span>
      <h2 className="heading mt-5">{title}</h2>
      {description && <p className="subheading">{description}</p>}
    </div>
  )
}
