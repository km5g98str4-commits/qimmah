import type { CSSProperties } from 'react'
import { getIcon } from '@/lib/icons'

interface IconProps {
  name: string
  className?: string
  strokeWidth?: number
  /** أنماط سطرية اختيارية (مثل لون العلامة السيمانتي عبر currentColor). */
  style?: CSSProperties
}

/** يعرض أيقونة بالاسم من خريطة الأيقونات. */
export function Icon({ name, className, strokeWidth = 2, style }: IconProps) {
  const Cmp = getIcon(name)
  return <Cmp className={className} strokeWidth={strokeWidth} style={style} />
}
