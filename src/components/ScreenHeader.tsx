import { Icon } from '@/components/Icon'

interface ScreenHeaderProps {
  /** اسم الأيقونة من `src/lib/icons.ts`. */
  icon: string
  /** عنوان التبويب. */
  title: string
  /** عنصر اختياري في نهاية السطر (زر أو شارة). */
  action?: React.ReactNode
}

/**
 * ترويسة الشاشة بالهوية الكلاسيكية: مربّع أيقونة بلون الهوية + عنوان.
 * مصدر واحد للترويسة عبر تبويبات التمرين والتغذية والتقدّم وحسابي، حتى تبقى
 * الشاشات الأربع متطابقة الإيقاع كما كانت قبل موجة v2.
 */
export function ScreenHeader({ icon, title, action }: ScreenHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h1 className="min-w-0 flex-1 truncate text-lg font-black text-ink-900">{title}</h1>
      {action}
    </div>
  )
}
