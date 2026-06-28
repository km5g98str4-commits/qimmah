import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { LineChart } from './LineChart'
import { MuscleChips } from './MuscleChips'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getExercise, targetMuscleAr } from '@/data/exercises'
import { guidanceFor } from '@/lib/exerciseGuidance'
import { exerciseStats } from '@/lib/exerciseStats'
import { getRecord } from '@/lib/exerciseHistory'
import { muscleLabelAr } from '@/data/muscleGroups'

type DetailTab = 'about' | 'history' | 'charts' | 'records'

interface ExerciseDetailProps {
  lang: Lang
  exerciseId: string
  onClose: () => void
  /** اختياري — إضافة التمرين لخطة المستخدم. */
  onAddToPlan?: (exerciseId: string) => void
}

const TABS: { id: DetailTab; label: string; icon: string }[] = [
  { id: 'about', label: 'عن التمرين', icon: 'HelpCircle' },
  { id: 'history', label: 'التاريخ', icon: 'CalendarDays' },
  { id: 'charts', label: 'الرسوم', icon: 'BarChart3' },
  { id: 'records', label: 'الأرقام', icon: 'Trophy' },
]

/** بطاقة تفاصيل تمرين — Sheet/Modal بأربعة تبويبات (عن/التاريخ/الرسوم/الأرقام). */
export function ExerciseDetail({ lang, exerciseId, onClose, onAddToPlan }: ExerciseDetailProps) {
  const ex = getExercise(exerciseId)
  const [tab, setTab] = useState<DetailTab>('about')
  const stats = useMemo(() => exerciseStats(exerciseId), [exerciseId])
  const rec = useMemo(() => getRecord(exerciseId), [exerciseId])

  if (!ex) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl bg-page shadow-card sm:rounded-3xl">
        {/* رأس بطاقة مع صورة بديلة داكنة فاخرة */}
        <div className="relative shrink-0 overflow-hidden rounded-t-3xl">
          <ExerciseHero ex={ex} />
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink-900/40 text-white backdrop-blur hover:bg-ink-900/60"
          >
            <Icon name="X" className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4">
            {/* الاسم الإنجليزي أولًا، العربي تحته، ثم العضلة الهدف بالعربية */}
            <h2 className="text-xl font-black text-white drop-shadow">{ex.nameEn}</h2>
            <p className="mt-0.5 text-sm font-bold text-white/90 drop-shadow">{ex.nameAr}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-white/80">
              <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">{targetMuscleAr(ex)}</span>
              <span>{ex.equipment.join(' · ')} · {levelAr(ex.level)}</span>
            </p>
          </div>
        </div>

        {/* تبويبات */}
        <div className="flex shrink-0 gap-1 border-b border-line bg-surface px-2 pt-2">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-t-xl px-2 py-2.5 text-xs font-bold transition-colors',
                tab === tb.id ? 'bg-page text-primary-c' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              <Icon name={tb.icon} className="h-4 w-4 shrink-0" />
              <span className="truncate">{tb.label}</span>
            </button>
          ))}
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'about' && <AboutTab ex={ex} lang={lang} onAddToPlan={onAddToPlan} />}
          {tab === 'history' && <HistoryTab stats={stats} lastWeight={rec?.lastWeight} bestWeight={rec?.bestWeight} lastReps={rec?.lastReps} />}
          {tab === 'charts' && <ChartsTab stats={stats} />}
          {tab === 'records' && <RecordsTab stats={stats} />}
        </div>
      </div>
    </div>
  )
}

/** صورة بديلة فاخرة (لا صور خارجية) — تدرّج داكن + أيقونة + رقائق العضلات. */
function ExerciseHero({ ex }: { ex: NonNullable<ReturnType<typeof getExercise>> }) {
  return (
    <div className="relative h-40 w-full bg-gradient-to-br from-ink-900 via-ink-700 to-ink-900">
      <div className="absolute inset-0 opacity-20 bg-grid-faint" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/90 text-white shadow-glow">
          <Icon name="Dumbbell" className="h-8 w-8" strokeWidth={2.5} />
        </span>
      </div>
      <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
        {ex.primaryMusclesDetailed.slice(0, 3).map((m) => (
          <span key={m} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            {muscleLabelAr(m)}
          </span>
        ))}
      </div>
    </div>
  )
}

function AboutTab({ ex, lang, onAddToPlan }: { ex: NonNullable<ReturnType<typeof getExercise>>; lang: Lang; onAddToPlan?: (id: string) => void }) {
  const g = guidanceFor(ex)
  return (
    <div className="space-y-5">
      {/* العضلات المستهدفة */}
      <Block title="العضلات المستهدفة" icon="Target">
        <p className="mb-2 text-[11px] font-bold text-ink-500">أساسية</p>
        <MuscleChips primary={ex.primaryMusclesDetailed} />
        {ex.secondaryMusclesDetailed.length > 0 && (
          <>
            <p className="mb-2 mt-3 text-[11px] font-bold text-ink-500">ثانوية</p>
            <MuscleChips primary={[]} secondary={ex.secondaryMusclesDetailed} />
          </>
        )}
      </Block>

      {/* خطوات الأداء */}
      <Block title="طريقة الأداء" icon="CheckCircle2">
        <ol className="space-y-1.5">
          {g.howTo.map((h, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-700">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-black text-primary-c">{i + 1}</span>
              {h}
            </li>
          ))}
        </ol>
      </Block>

      {/* نصائح تقنية */}
      <Block title="نصائح تقنية" icon="Sparkles">
        <BulletList items={g.tips} dot="#3E9E6B" />
      </Block>

      {/* أخطاء شائعة */}
      <Block title="أخطاء شائعة" icon="AlertTriangle">
        <BulletList items={g.mistakes} dot="#D6553A" />
      </Block>

      {/* سلامة */}
      <p className="flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
        <Icon name="ShieldCheck" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        {g.safety}
      </p>

      {/* أزرار — زر يوتيوب فقط عند توفّر رابط (لا فيديو مُضمّن ولا صور خارجية) */}
      <div className="flex flex-wrap gap-2">
        {ex.videoUrl && (
          <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost px-4 py-2.5 text-sm">
            <Icon name="Play" className="h-4 w-4" />
            {lang === 'en' ? 'Watch on YouTube' : 'شاهد على يوتيوب'}
          </a>
        )}
        {onAddToPlan && (
          <button type="button" onClick={() => onAddToPlan(ex.id)} className="btn-primary px-4 py-2.5 text-sm">
            <Icon name="Plus" className="h-4 w-4" />
            {lang === 'en' ? 'Add to my plan' : 'أضف لخطتي'}
          </button>
        )}
      </div>
    </div>
  )
}

function HistoryTab({
  stats,
  lastWeight,
  bestWeight,
  lastReps,
}: {
  stats: ReturnType<typeof exerciseStats>
  lastWeight?: string
  bestWeight?: string
  lastReps?: string
}) {
  if (stats.totalSessions === 0) {
    return <EmptyHint text="ما فيه سجلّ لهذا التمرين بعد. سجّل تمرينك وبيظهر هنا." />
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="آخر وزن" value={lastWeight ? `${lastWeight}` : '—'} />
        <MiniStat label="أفضل وزن" value={bestWeight ? `${bestWeight}` : '—'} />
        <MiniStat label="آخر تكرارات" value={lastReps ? `${lastReps}` : '—'} />
      </div>
      <ul className="space-y-2">
        {stats.history.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{r.dayName || 'تمرين'}</p>
              <p className="text-[11px] text-ink-400">{r.date}</p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-sm font-black text-ink-900">{r.topWeight || '—'} كجم × {r.topReps || '—'}</p>
              <p className="text-[11px] text-ink-400">{r.sets} مجموعة · حجم {r.volume}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartsTab({ stats }: { stats: ReturnType<typeof exerciseStats> }) {
  if (stats.totalSessions === 0) {
    return <EmptyHint text="بعد ما تسجّل تمارين، بتشوف هنا تطوّر الوزن والحجم وتقدير الـ 1RM." />
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="أعلى 1RM تقديري" value={stats.records.bestOneRepMax ? `${stats.records.bestOneRepMax}` : '—'} />
        <MiniStat label="أفضل حجم" value={stats.records.bestVolume ? `${stats.records.bestVolume}` : '—'} />
        <MiniStat label="عدد الجلسات" value={`${stats.totalSessions}`} />
      </div>

      {stats.weightTrend.length >= 2 ? (
        <div className="card p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <Icon name="TrendingUp" className="h-4 w-4 text-primary-c" />
            تطوّر وزن أعلى مجموعة
          </p>
          <LineChart data={stats.weightTrend} />
          <div className="mt-2 flex justify-between text-[11px] text-ink-400">
            <span>{stats.weightTrend[0].label}</span>
            <span>{stats.weightTrend[stats.weightTrend.length - 1].label}</span>
          </div>
        </div>
      ) : (
        <EmptyHint text="تحتاج جلستين على الأقل لعرض رسم التطوّر." />
      )}
    </div>
  )
}

function RecordsTab({ stats }: { stats: ReturnType<typeof exerciseStats> }) {
  const r = stats.records
  const empty = !r.bestWeight && !r.bestReps && !r.bestVolume && !r.bestOneRepMax
  if (empty) return <EmptyHint text="لا أرقام قياسية بعد — كل جلسة تقربك من رقم جديد." />
  return (
    <div className="grid grid-cols-2 gap-3">
      <RecordCard icon="Scale" label="أفضل وزن" value={r.bestWeight ? `${r.bestWeight} كجم` : '—'} />
      <RecordCard icon="RotateCcw" label="أعلى تكرارات" value={r.bestReps ? `${r.bestReps}` : '—'} />
      <RecordCard icon="BarChart3" label="أفضل حجم (وزن×تكرار)" value={r.bestVolume ? `${r.bestVolume}` : '—'} />
      <RecordCard icon="Trophy" label="أعلى 1RM تقديري" value={r.bestOneRepMax ? `${r.bestOneRepMax} كجم` : '—'} />
    </div>
  )
}

// — عناصر مساعدة —

function Block({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-black text-ink-900">
        <Icon name={icon} className="h-4 w-4 text-primary-c" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function BulletList({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
          {it}
        </li>
      ))}
    </ul>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-center">
      <p className="text-base font-black text-ink-900">{value}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-ink-400">{label}</p>
    </div>
  )
}

function RecordCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-ink-400">{label}</p>
        <p className="text-lg font-black text-ink-900">{value}</p>
      </div>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <Icon name="Activity" className="h-7 w-7 text-ink-400" />
      <p className="max-w-xs text-sm text-ink-500">{text}</p>
    </div>
  )
}

function levelAr(level: string): string {
  return level === 'beginner' ? 'مبتدئ' : level === 'advanced' ? 'متقدّم' : 'متوسط'
}
