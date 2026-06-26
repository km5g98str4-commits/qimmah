// خريطة الأيقونات — تربط أسماء الأيقونات في ملفات data بمكوّنات lucide.
// إضافة أيقونة جديدة: استوردها هنا وأضفها للخريطة.

import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Droplets,
  Dumbbell,
  Flame,
  Maximize,
  Menu,
  Moon,
  Percent,
  Pill,
  Ruler,
  Salad,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import type { IconComponent } from '@/types'

export const icons: Record<string, IconComponent> = {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Droplets,
  Dumbbell,
  Flame,
  Maximize,
  Menu,
  Moon,
  Percent,
  Pill,
  Ruler,
  Salad,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
}

export function getIcon(name: string): IconComponent {
  return icons[name] ?? Sparkles
}
