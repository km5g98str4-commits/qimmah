import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { LineChart } from './LineChart'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { libraryStrings, type LibraryStrings } from '@/i18n/dict/library'
import { detailedMuscleLabel, exerciseName, getExercise } from '@/data/exercises'
import { muscleLabel } from '@/lib/muscles'
import type { MuscleId } from '@/types/muscles'
import { guidanceFor } from '@/lib/exerciseGuidance'
import { getCue } from '@/lib/coaching'
import { exerciseStats } from '@/lib/exerciseStats'
import { getRecord } from '@/lib/exerciseHistory'
import { ExerciseMedia } from './ExerciseMedia'

type DetailTab = 'about' | 'history' | 'charts' | 'records'

interface ExerciseDetailProps {
  lang: Lang
  exerciseId: string
  onClose: () => void
  /** اختياري — إضافة التمرين لخطة المستخدم. */
  onAddToPlan?: (exerciseId: string) => void
}

const TABS: { id: DetailTab; labelKey: keyof LibraryStrings; icon: string }[] = [
  { id: 'about', labelKey: 'tabAbout', icon: 'HelpCircle' },
  { id: 'history', labelKey: 'tabHistory', icon: 'CalendarDays' },
  { id: 'charts', labelKey: 'tabCharts', icon: 'BarChart3' },
  { id: 'records', labelKey: 'tabRecords', icon: 'Trophy' },
]

/** بطاقة تفاصيل تمرين — Sheet/Modal بأربعة تبويبات (عن/التاريخ/الرسوم/الأرقام). */
export function ExerciseDetail({ lang, exerciseId, onClose, onAddToPlan }: ExerciseDetailProps) {
  const d = libraryStrings[lang]
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
          <ExerciseHero ex={ex} lang={lang} />
          <button
            type="button"
            onClick={onClose}
            aria-label={d.close}
            className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink-900/40 text-white backdrop-blur hover:bg-ink-900/60"
          >
            <Icon name="X" className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4">
            {/* الاسم العربي أساسي، الإنجليزي سطر ثانوي أصغر (موحّد عبر الواجهة) */}
            <h2 className="text-xl font-black text-white drop-shadow">
              {exerciseName(ex, lang)}
            </h2>
            {lang !== 'en' && ex.nameEn && ex.nameEn !== ex.nameAr && (
              <p className="mt-0.5 text-sm font-bold text-white/80 drop-shadow">{ex.nameEn}</p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-white/80">
              <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">{muscleLabel(ex.primaryMuscle, lang)}</span>
              <span>{ex.equipment.join(' · ')} · {levelLabel(ex.level, d)}</span>
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
              <span className="truncate">{d[tb.labelKey]}</span>
            </button>
          ))}
        </div>

        {/* المحتوى */}
        <div className="app-scroll flex-1 overflow-y-auto p-4">
          {tab === 'about' && <AboutTab ex={ex} d={d} lang={lang} onAddToPlan={onAddToPlan} />}
          {tab === 'history' && <HistoryTab stats={stats} d={d} lastWeight={rec?.lastWeight} bestWeight={rec?.bestWeight} lastReps={rec?.lastReps} />}
          {tab === 'charts' && <ChartsTab stats={stats} d={d} />}
          {tab === 'records' && <RecordsTab stats={stats} d={d} />}
        </div>
      </div>
    </div>
  )
}

/** رأس بطاقة التمرين — صورة حقيقية (مع تلاشٍ متبادل) عند توفّر مطابقة، وإلا بديل فاخر. */
function ExerciseHero({ ex, lang }: { ex: NonNullable<ReturnType<typeof getExercise>>; lang: Lang }) {
  return <ExerciseMedia exerciseId={ex.id} lang={lang} muscles={ex.primaryMusclesDetailed} heightClass="h-40" />
}

function AboutTab({ ex, d, lang, onAddToPlan }: { ex: NonNullable<ReturnType<typeof getExercise>>; d: LibraryStrings; lang: Lang; onAddToPlan?: (id: string) => void }) {
  const g = guidanceFor(ex, lang)
  const cue = getCue(ex.id)
  const howTo = lang !== 'en' ? cue.steps : g.howTo
  const tips = g.tips
  const mistakes = lang !== 'en' ? cue.mistakes : g.mistakes
  const safety = lang !== 'en' ? cue.safety : g.safety
  return (
    <div className="space-y-5">
      {/* العضلات المستهدفة — رقائق بلغة الواجهة الحالية (قاموس العضلات المشترك) */}
      <Block title={d.targetMuscles} icon="Target">
        <p className="mb-2 text-[11px] font-bold text-ink-500">{d.primary}</p>
        <LocalizedChips ids={ex.primaryMusclesDetailed} lang={lang} kind="primary" />
        {ex.secondaryMusclesDetailed.length > 0 && (
          <>
            <p className="mb-2 mt-3 text-[11px] font-bold text-ink-500">{d.secondary}</p>
            <LocalizedChips ids={ex.secondaryMusclesDetailed} lang={lang} kind="secondary" />
          </>
        )}
      </Block>

      {/* كيف تؤديه — إرشاد قِمّة المكتوب لكل تمرين (عربي)؛ للإنجليزية يبقى الإرشاد العام. */}
      <Block title={lang !== 'en' ? 'كيف تؤديه' : d.howToPerform} icon="CheckCircle2">
        {howTo.length > 0 ? <ol className="space-y-1.5">
          {howTo.map((h, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-700">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-black text-primary-c">{i + 1}</span>
              {h}
            </li>
          ))}
        </ol> : <p className="text-sm leading-relaxed text-ink-500">{d.guidanceUnavailable}</p>}
      </Block>

      {/* نصائح تقنية (عام، ثنائي اللغة) */}
      <Block title={d.techniqueTips} icon="Sparkles">
        {tips.length > 0 ? <BulletList items={tips} dotClassName="bg-success" /> : <p className="text-sm leading-relaxed text-ink-500">{d.guidanceUnavailable}</p>}
      </Block>

      {/* أخطاء شائعة */}
      <Block title={d.commonMistakes} icon="AlertTriangle">
        {mistakes.length > 0 ? <BulletList items={mistakes} dotClassName="bg-danger" /> : <p className="text-sm leading-relaxed text-ink-500">{d.guidanceUnavailable}</p>}
      </Block>

      {/* سلامة — تمارين تحميل العمود/الركبة توجّه صراحةً لاستشارة مختص. */}
      <p className="flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
        <Icon name="ShieldCheck" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        {safety || d.guidanceUnavailable}
      </p>

      {/* أزرار — زر يوتيوب فقط عند توفّر رابط (لا فيديو مُضمّن ولا صور خارجية) */}
      <div className="flex flex-wrap gap-2">
        {ex.videoUrl && (
          <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost px-4 py-2.5 text-sm">
            <Icon name="Play" className="h-4 w-4" />
            {d.watchOnYouTube}
          </a>
        )}
        {onAddToPlan && (
          <button type="button" onClick={() => onAddToPlan(ex.id)} className="btn-primary px-4 py-2.5 text-sm">
            <Icon name="Plus" className="h-4 w-4" />
            {d.addToMyPlan}
          </button>
        )}
      </div>
    </div>
  )
}

function HistoryTab({
  stats,
  d,
  lastWeight,
  bestWeight,
  lastReps,
}: {
  stats: ReturnType<typeof exerciseStats>
  d: LibraryStrings
  lastWeight?: string
  bestWeight?: string
  lastReps?: string
}) {
  if (stats.totalSessions === 0) {
    return <EmptyHint text={d.historyEmpty} />
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label={d.lastWeight} value={lastWeight ? `${lastWeight}` : '—'} />
        <MiniStat label={d.bestWeight} value={bestWeight ? `${bestWeight}` : '—'} />
        <MiniStat label={d.lastReps} value={lastReps ? `${lastReps}` : '—'} />
      </div>
      <ul className="space-y-2">
        {stats.history.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{r.dayName || d.workout}</p>
              <p className="text-[11px] text-ink-400">{r.date}</p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-sm font-black text-ink-900">{r.topWeight || '—'} {d.kg} × {r.topReps || '—'}</p>
              <p className="text-[11px] text-ink-400">{r.sets} {d.setUnit} · {d.volumeLabel} {r.volume}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartsTab({ stats, d }: { stats: ReturnType<typeof exerciseStats>; d: LibraryStrings }) {
  if (stats.totalSessions === 0) {
    return <EmptyHint text={d.chartsEmpty} />
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label={d.bestOneRepMax} value={stats.records.bestOneRepMax ? `${stats.records.bestOneRepMax}` : '—'} />
        <MiniStat label={d.bestVolume} value={stats.records.bestVolume ? `${stats.records.bestVolume}` : '—'} />
        <MiniStat label={d.sessionsCount} value={`${stats.totalSessions}`} />
      </div>

      {stats.weightTrend.length >= 2 ? (
        <div className="card p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <Icon name="TrendingUp" className="h-4 w-4 text-primary-c" />
            {d.topSetWeightTrend}
          </p>
          <LineChart data={stats.weightTrend} />
          <div className="mt-2 flex justify-between text-[11px] text-ink-400">
            <span>{stats.weightTrend[0].label}</span>
            <span>{stats.weightTrend[stats.weightTrend.length - 1].label}</span>
          </div>
        </div>
      ) : (
        <EmptyHint text={d.needTwoSessions} />
      )}
    </div>
  )
}

function RecordsTab({ stats, d }: { stats: ReturnType<typeof exerciseStats>; d: LibraryStrings }) {
  const r = stats.records
  const empty = !r.bestWeight && !r.bestReps && !r.bestVolume && !r.bestOneRepMax
  if (empty) return <EmptyHint text={d.recordsEmpty} />
  return (
    <div className="grid grid-cols-2 gap-3">
      <RecordCard icon="Scale" label={d.recBestWeight} value={r.bestWeight ? `${r.bestWeight} ${d.kg}` : '—'} />
      <RecordCard icon="RotateCcw" label={d.recBestReps} value={r.bestReps ? `${r.bestReps}` : '—'} />
      <RecordCard icon="BarChart3" label={d.recBestVolume} value={r.bestVolume ? `${r.bestVolume}` : '—'} />
      <RecordCard icon="Trophy" label={d.recBestOneRepMax} value={r.bestOneRepMax ? `${r.bestOneRepMax} ${d.kg}` : '—'} />
    </div>
  )
}

// — عناصر مساعدة —

/** رقائق عضلات بلغة الواجهة — نفس مظهر MuscleChips لكن بأسماء محلولة حسب اللغة. */
function LocalizedChips({ ids, lang, kind }: { ids: MuscleId[]; lang: Lang; kind: 'primary' | 'secondary' }) {
  if (!ids.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((m) => (
        <span
          key={m}
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px]',
            kind === 'primary'
              ? 'bg-primary-soft font-bold text-primary-c'
              : 'border border-line bg-surface font-medium text-ink-500',
          )}
        >
          {detailedMuscleLabel(m, lang)}
        </span>
      ))}
    </div>
  )
}

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

function BulletList({ items, dotClassName }: { items: string[]; dotClassName: 'bg-success' | 'bg-danger' }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} />
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

function levelLabel(level: string, d: LibraryStrings): string {
  return level === 'beginner' ? d.levelBeginner : level === 'advanced' ? d.levelAdvanced : d.levelIntermediate
}
