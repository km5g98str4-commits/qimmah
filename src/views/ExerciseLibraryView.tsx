import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseDetail } from '@/components/ExerciseDetail'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { exercises, targetMuscleAr } from '@/data/exercises'
import type { Muscle } from '@/types/workout'

interface ExerciseLibraryViewProps {
  lang: Lang
}

const MUSCLE_FILTERS: { value: Muscle | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'chest', label: 'صدر' },
  { value: 'back', label: 'ظهر' },
  { value: 'shoulders', label: 'أكتاف' },
  { value: 'biceps', label: 'بايسبس' },
  { value: 'triceps', label: 'ترايسبس' },
  { value: 'quads', label: 'أرجل' },
  { value: 'hamstrings', label: 'خلفي الفخذ' },
  { value: 'glutes', label: 'جلوتس' },
  { value: 'calves', label: 'سمانة' },
  { value: 'core', label: 'كور' },
  { value: 'cardio', label: 'كارديو' },
]

const EQUIP_LABEL: Record<string, string> = {
  barbell: 'بار',
  dumbbell: 'دمبل',
  machine: 'جهاز',
  cable: 'كيبل',
  bodyweight: 'وزن الجسم',
  bench: 'مقعد',
  kettlebell: 'كيتل بل',
  smith: 'سميث',
  'ez-bar': 'إيزي بار',
}

function equipAr(eq: string): string {
  return EQUIP_LABEL[eq] ?? eq
}

/** عرض مكتبة التمارين — بحث + فلاتر + ترتيب أبجدي + فتح تفاصيل التمرين. */
export function ExerciseLibraryView({ lang }: ExerciseLibraryViewProps) {
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  const [equip, setEquip] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  // قائمة المعدّات الفريدة من البيانات
  const equipList = useMemo(() => {
    const set = new Set<string>()
    exercises.forEach((e) => e.equipment.forEach((x) => set.add(x)))
    return ['all', ...Array.from(set).sort()]
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return exercises
      .filter((e) => {
        if (muscle !== 'all' && e.primaryMuscle !== muscle) return false
        if (equip !== 'all' && !e.equipment.includes(equip)) return false
        if (query && !`${e.nameAr} ${e.nameEn}`.toLowerCase().includes(query)) return false
        return true
      })
      .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'))
  }, [q, muscle, equip])

  return (
    <div className="px-4 py-4">
      <div>
        {/* ترويسة */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="eyebrow">
              <Icon name="Boxes" className="h-3.5 w-3.5" />
              المكتبة
            </span>
            <h1 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">مكتبة التمارين</h1>
            <p className="mt-1 text-sm text-ink-500">{exercises.length} تمرين بشرح ومجموعات مستهدفة.</p>
          </div>
          <button
            type="button"
            disabled
            title="قريبًا"
            className="btn-ghost shrink-0 cursor-not-allowed px-3 py-2.5 text-xs opacity-60"
          >
            <Icon name="Plus" className="h-4 w-4" />
            <span className="hidden sm:inline">تمرين جديد</span>
          </button>
        </div>

        {/* بحث */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Icon name="Search" className="h-4 w-4 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم التمرين بالعربي أو الإنجليزي…"
            className="w-full bg-transparent py-3 text-sm text-ink-900 focus:outline-none"
            aria-label="بحث"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="مسح البحث" className="text-ink-400 hover:text-ink-900">
              <Icon name="X" className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* فلاتر */}
        <div className="mt-3 space-y-2">
          <FilterRow icon="Target" label="العضلة">
            {MUSCLE_FILTERS.map((o) => (
              <Chip key={o.value} active={muscle === o.value} onClick={() => setMuscle(o.value)}>{o.label}</Chip>
            ))}
          </FilterRow>
          <FilterRow icon="SlidersHorizontal" label="المعدّات">
            {equipList.map((eq) => (
              <Chip key={eq} active={equip === eq} onClick={() => setEquip(eq)}>
                {eq === 'all' ? 'الكل' : equipAr(eq)}
              </Chip>
            ))}
          </FilterRow>
        </div>

        <p className="mt-4 text-xs font-bold text-ink-400">{filtered.length} نتيجة · مرتّبة أبجديًا</p>

        {/* القائمة */}
        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
            <Icon name="Search" className="mx-auto h-7 w-7 text-ink-400" />
            <p className="mt-2 text-sm text-ink-500">ما فيه نتائج مطابقة — جرّب كلمة أو فلتر مختلف.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(e.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-card transition-shadow hover:shadow-soft"
                >
                  <ExerciseThumb />
                  <div className="min-w-0 flex-1">
                    {/* الاسم الإنجليزي أولًا، العربي تحته، ثم العضلة الهدف بالعربية */}
                    <p className="truncate text-sm font-bold text-ink-900">{e.nameEn}</p>
                    <p className="truncate text-[11px] text-ink-500">{e.nameAr}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                      <span className="rounded-full bg-primary-soft px-1.5 py-0.5 font-bold text-primary-c">{targetMuscleAr(e)}</span>
                      <span className="truncate">{e.equipment.map(equipAr).join(' · ')}</span>
                    </p>
                  </div>
                  <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openId && <ExerciseDetail lang={lang} exerciseId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/** صورة بديلة مصغّرة فاخرة (لا صور خارجية). */
function ExerciseThumb() {
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-ink-900 to-ink-700 text-white">
      <Icon name="Dumbbell" className="h-5 w-5" />
    </span>
  )
}

function FilterRow({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink-400">
        <Icon name={icon} className="h-3.5 w-3.5" />
        {label}
      </span>
      <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
        active ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700 hover:bg-beige',
      )}
    >
      {children}
    </button>
  )
}
