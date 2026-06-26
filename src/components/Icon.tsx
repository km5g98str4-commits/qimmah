import { getIcon } from '@/lib/icons'

interface IconProps {
  name: string
  className?: string
  strokeWidth?: number
}

/** يعرض أيقونة بالاسم من خريطة الأيقونات. */
export function Icon({ name, className, strokeWidth = 2 }: IconProps) {
  const Cmp = getIcon(name)
  return <Cmp className={className} strokeWidth={strokeWidth} />
}
