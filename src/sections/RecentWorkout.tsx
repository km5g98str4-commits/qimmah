import { Icon } from '@/components/Icon'
import { SectionHeading } from '@/components/SectionHeading'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { lastSession } from '@/lib/workoutSessions'

/** قسم «آخر تمرين» — ملخّص مختصر لآخر جلسة محفوظة. */
export function RecentWorkout({ lang }: { lang: Lang }) {
  const t = getStrings(lang).workout
  const session = lastSession()
  if (!session) return null

  const completed = session.exercises.filter((e) => e.completed).length
  const total = session.exercises.length
  const hard = session.exercises.filter((e) => e.difficulty === 'hard').length

  return (
    <section id="recent-workout" className="section bg-beige">
      <div className="container-page">
        <SectionHeading eyebrow={t.recentTitle} icon="CheckCircle2" title={t.recentTitle} />

        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          <Stat icon="CalendarDays" label="التاريخ" value={session.date} />
          <Stat icon="Dumbbell" label="اليوم" value={session.workoutDayName} />
          <Stat icon="CheckCircle2" label="تمارين مكتملة" value={`${completed}/${total}`} />
          <Stat icon="Flame" label="تمارين صعبة" value={`${hard}`} />
        </div>
      </div>
    </section>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs text-ink-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-ink-900">{value}</p>
    </div>
  )
}
