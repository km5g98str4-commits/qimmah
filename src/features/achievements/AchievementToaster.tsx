import { useEffect } from 'react'
import { Icon } from '@/components/Icon'
import { useCelebrations } from './useAchievements'
import type { Celebration } from './engine'

/**
 * الـ toaster العام للاحتفالات — يعرض أوسمة جديدة وأرقامًا قياسية واحدًا تلو الآخر.
 * يُركّب مرّة واحدة في جذر التطبيق فوق كل الشاشات.
 */
export function AchievementToaster() {
  const { queue, dismiss } = useCelebrations()
  const current = queue[0]
  if (!current) return null
  // مفتاح فريد يُعيد تركيب البطاقة لكل احتفال (يعيد ضبط مؤقّت الإخفاء والحركة).
  return <CelebrationCard key={current.key} celebration={current} onClose={() => dismiss(current.key)} />
}

function CelebrationCard({ celebration, onClose }: { celebration: Celebration; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, celebration.kind === 'pr' ? 5500 : 6500)
    return () => clearTimeout(t)
  }, [onClose, celebration.kind])

  const isMedal = celebration.kind === 'medal'
  const eyebrow = isMedal ? 'فتحت وسام جديد' : 'إنجاز'
  const title = isMedal ? `🏅 ${celebration.title}` : celebration.title
  const body = isMedal ? celebration.description : celebration.body

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="card pointer-events-auto flex w-full max-w-md items-start gap-3 border-gold-500/40 bg-gradient-to-br from-surface to-gold-500/10 p-4 shadow-glow animate-pop-in"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-500/15 text-2xl">
          <span aria-hidden="true">{celebration.emoji}</span>
        </span>
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-gold-500">
            <Icon name="PartyPopper" className="h-3.5 w-3.5" />
            {eyebrow}
          </span>
          <p className="mt-1 text-sm font-black text-ink-900">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{body}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-beige hover:text-ink-700"
        >
          <Icon name="X" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
