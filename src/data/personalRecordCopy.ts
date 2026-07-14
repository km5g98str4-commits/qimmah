import type { Lang } from '@/lib/appPreferences'

export function personalRecordCopy(lang: Lang) {
  const ar = lang !== 'en'
  return {
    title: ar ? 'الأرقام القياسية' : 'Personal records',
    empty: ar ? 'أول وزن يثبت خط البداية. عندما تتجاوزه سيظهر رقمك القياسي هنا.' : 'Your first load sets the baseline. Beat it to see a record here.',
    improvement: (kg: number) => ar ? `تحسّن ${kg} كجم` : `${kg} kg improvement`,
    previous: (kg: number) => ar ? `السابق ${kg} كجم` : `Previous ${kg} kg`,
  }
}
