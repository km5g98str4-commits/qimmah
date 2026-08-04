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
    <header className="screen-header">
      <span className="screen-header__icon">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h1 className="screen-header__title">{title}</h1>
      {action}
    </header>
  )
}
