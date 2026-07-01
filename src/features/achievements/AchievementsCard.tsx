import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { CATEGORY_LABELS, type AchievementCategory } from '@/data/achievements'
import { useAchievements } from './useAchievements'
import type { AchievementProgress } from './engine'

/**
 * بطاقة الأوسمة على الرئيسية — تحفيزية لا مزدحمة.
 * تعرض: عدد المفتوح، شريط أوسمتك المفتوحة، وأقرب وسام للفتح مع تقدّمه.
 * الشبكة الكاملة على بُعد نقرة واحدة (تحترم روح «البسيط بالافتراض»).
 */
export function AchievementsCard() {
  const { earned, upcoming, earnedCount, total } = useAchievements()
  const [showAll, setShowAll] = useState(false)
  const next = upcoming[0]

  return (
    <section className="card overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">
          <Icon name="Trophy" className="h-3.5 w-3.5" />
          أوسمتك
        </span>
        <span className="text-xs font-black text-gold-500">
          {earnedCount} / {total}
        </span>
      </div>

      {earnedCount > 0 ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {earned.slice(0, 8).map((a) => (
              <span
                key={a.def.id}
                title={a.def.title}
                className="grid h-10 w-10 place-items-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-xl"
              >
                <span aria-hidden="true">{a.def.emoji}</span>
                <span className="sr-only">{a.def.title}</span>
              </span>
            ))}
            {earnedCount > 8 && (
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-page text-xs font-black text-ink-500">
                +{earnedCount - 8}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-500">وسام مفتوح — استمر يزيدون.</p>
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-line bg-page p-4 text-center">
          <p className="text-2xl" aria-hidden="true">
            🏅
          </p>
          <p className="mt-1 text-sm font-bold text-ink-900">أول وسام على بُعد تمرين واحد</p>
          <p className="mt-0.5 text-xs text-ink-500">خلّص تمرينك أو سجّل وجبتك وتبدأ تجمع أوسمتك.</p>
        </div>
      )}

      {next && (
        <div className="mt-4 rounded-xl border border-line bg-page p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg opacity-60" aria-hidden="true">
              {next.def.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink-900">القادم: {next.def.title}</p>
              <p className="truncate text-[11px] text-ink-400">{next.def.description}</p>
            </div>
            <span className="shrink-0 text-[11px] font-black text-ink-500">
              {Math.min(next.current, next.threshold)}/{next.threshold}
            </span>
          </div>
          <ProgressBar current={next.current} target={next.threshold} color="bg-gold-500" className="mt-2 h-1.5" />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-page py-2.5 text-sm font-bold text-ink-700 transition-colors hover:border-gold-500/40 hover:text-gold-500"
      >
        <Icon name="LayoutGrid" className="h-4 w-4" />
        كل الأوسمة
      </button>

      {showAll && <AchievementsSheet earned={earned} upcoming={upcoming} onClose={() => setShowAll(false)} />}
    </section>
  )
}

/** ورقة كامل الأوسمة (grid) — مفتوحة بارزة، ومقفلة معتّمة مع تقدّمها. */
function AchievementsSheet({
  earned,
  upcoming,
  onClose,
}: {
  earned: AchievementProgress[]
  upcoming: AchievementProgress[]
  onClose: () => void
}) {
  const all = [...earned, ...upcoming]
  const categories = Object.keys(CATEGORY_LABELS) as AchievementCategory[]

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-page/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <div>
          <span className="eyebrow">
            <Icon name="Trophy" className="h-3.5 w-3.5" />
            أوسمتك
          </span>
          <h2 className="mt-1 text-lg font-black text-ink-900">
            {earned.length} / {all.length} وسام مفتوح
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-700 hover:bg-beige"
        >
          <Icon name="X" className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-lg space-y-6">
          {categories.map((cat) => {
            const items = all.filter((a) => a.def.category === cat)
            if (items.length === 0) return null
            return (
              <section key={cat}>
                <h3 className="mb-2 text-sm font-black text-ink-700">{CATEGORY_LABELS[cat]}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {items.map((a) => (
                    <MedalTile key={a.def.id} item={a} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MedalTile({ item }: { item: AchievementProgress }) {
  const { def, unlocked, current, threshold } = item
  return (
    <div
      className={
        unlocked
          ? 'rounded-2xl border border-gold-500/40 bg-gold-500/10 p-3 text-center'
          : 'rounded-2xl border border-line bg-surface p-3 text-center'
      }
    >
      <div className={`text-3xl ${unlocked ? '' : 'opacity-30 grayscale'}`} aria-hidden="true">
        {unlocked ? def.emoji : '🔒'}
      </div>
      <p className={`mt-1.5 text-xs font-bold ${unlocked ? 'text-ink-900' : 'text-ink-500'}`}>{def.title}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-ink-400">{def.description}</p>
      {unlocked ? (
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-black text-gold-500">
          <Icon name="CheckCircle2" className="h-3 w-3" />
          مفتوح
        </p>
      ) : (
        <div className="mt-1.5">
          <ProgressBar current={current} target={threshold} color="bg-ink-400" className="h-1" />
          <p className="mt-1 text-[10px] font-bold text-ink-400">
            {Math.min(current, threshold)}/{threshold}
          </p>
        </div>
      )}
    </div>
  )
}
