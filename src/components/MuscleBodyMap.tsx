import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { ALL_MUSCLE_IDS } from '@/data/muscleGroups'
import { MAP_VIEWBOX, regionPaths, regionsFor, SILHOUETTE } from '@/data/muscleMapRegions'
import { buildRegionModels, summarize, type RegionModel } from '@/lib/muscleMapModel'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { loadSessions } from '@/lib/workoutSessions'
import { useCustomization } from '@/lib/customizationContext'
import { progressScreenStrings } from '@/i18n/dict/progressScreen'
import type { Lang } from '@/lib/appPreferences'
import type { MuscleStatus, MuscleView } from '@/types/muscles'

// ============================================================================
// خريطة العضلات — مخطّط أمامي/خلفي مسطّح.
//
// حلّ محلّ المجسّم الإجرائي: هذا **مخطّط للبيانات** لا محاكاة جسم. الأشكال
// دوائر ومستطيلات مستديرة (data/muscleMapRegions) — بلا عظام ولا ملامح ولا
// ادّعاء بأنه نموذج طبي. الأولوية للرقم: كم مجموعة، وأي حالة، وما التفصيل.
//
// مصدر الحقيقة: computeWeeklyCoverage — بلا أي حساب موازٍ هنا.
// الأداء: SVG ثابت بلا canvas ولا حلقة رسوم ولا مؤقّتات؛ إعادة الرسم فقط عند
// تغيّر البيانات أو الاختيار. يحترم prefers-reduced-motion عبر motion-reduce.
// ============================================================================

/** ألوان الحالة — نفس مقياس بطاقات التغطية كي تبقى اللغة البصرية واحدة. */
const STATUS_COLOR: Record<MuscleStatus, string> = {
  trained: '#1F9D57',
  ready: '#3E9E6B',
  recovering: '#E0941F',
  fresh: '#F26A21',
  undertrained: '#D6553A',
}

/** شفافية لون الهوية حسب درجة الإبراز (0 = غير مدرَّبة). */
const HEAT_ALPHA = [0, 0.28, 0.48, 0.7, 0.92] as const

// العضلة غير المدرَّبة **ليست** بيضاء: الأبيض على خلفية فاتحة يقرأ كثقب في
// الجسم لا كعضلة محايدة. نستخدم درجة أغمق قليلًا من الهيكل — تُرى كمنطقة،
// وتبقى محايدة تمامًا فلا يشعر المستخدم باللوم على ما لم يدرّبه.
const NEUTRAL_FILL = 'color-mix(in srgb, rgb(var(--c-ink-500)) 16%, rgb(var(--c-beige)))'
/** لون الهيكل — أهدأ من المناطق كي يبقى الجسم إطارًا لا محتوى. */
const SILHOUETTE_FILL = 'color-mix(in srgb, rgb(var(--c-ink-500)) 7%, rgb(var(--c-beige)))'

interface MuscleBodyMapProps {
  lang: Lang
  className?: string
}

export function MuscleBodyMap({ lang, className }: MuscleBodyMapProps) {
  const d = progressScreenStrings[lang]
  const { customization } = useCustomization()
  const level = customization.profile.trainingLevel
  const [selected, setSelected] = useState<string | null>(null)

  const coverage = useMemo(
    () =>
      computeWeeklyCoverage({
        sessions: loadSessions(),
        plan: customization.workoutPlan,
        level,
      }).weeklyCoverage,
    [customization.workoutPlan, level],
  )

  const front = useMemo(() => buildRegionModels('front', coverage, level, lang), [coverage, level, lang])
  const back = useMemo(() => buildRegionModels('back', coverage, level, lang), [coverage, level, lang])
  const stats = useMemo(() => summarize(coverage, ALL_MUSCLE_IDS), [coverage])

  const selectedModel = useMemo(
    () => [...front, ...back].find((r) => r.id === selected) ?? null,
    [front, back, selected],
  )

  const empty = stats.totalSets <= 0

  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-ink-900">{d.mapTitle}</h2>
          <p className="mt-0.5 text-xs font-bold text-ink-500">
            {empty
              ? d.emptyCaption
              : `${d.activatedPrefix} ${stats.trained} ${d.activatedMiddle} ${stats.total} ${d.activatedSuffix}`}
          </p>
        </div>
        {!empty && (
          <span className="shrink-0 rounded-full bg-beige px-2.5 py-1 text-[11px] font-black text-ink-700 tabular-nums">
            {stats.totalSets} {d.setsWord}
          </span>
        )}
      </div>

      {/* الجهتان جنبًا إلى جنب — لا مبدّل: كل التوزيع مقروء بنظرة واحدة. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <BodyPanel
          view="front"
          label={d.viewFront}
          regions={front}
          selected={selected}
          onSelect={setSelected}
          lang={lang}
          setsWord={d.setsWord}
        />
        <BodyPanel
          view="back"
          label={d.viewBack}
          regions={back}
          selected={selected}
          onSelect={setSelected}
          lang={lang}
          setsWord={d.setsWord}
        />
      </div>

      {/* التفاصيل عند الضغط */}
      {selectedModel ? (
        <RegionDetail model={selectedModel} lang={lang} onClose={() => setSelected(null)} />
      ) : (
        !empty && <p className="mt-3 text-center text-[11px] font-bold text-ink-400">{d.mapTapHint}</p>
      )}

      {/* وسيلة الإيضاح */}
      <div className="mt-3 flex items-center justify-center gap-4 border-t border-line pt-3 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded-full"
            style={{
              background: `linear-gradient(90deg, color-mix(in srgb, var(--c-primary) 28%, transparent), var(--c-primary))`,
            }}
            aria-hidden
          />
          {d.legendTrained}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-beige ring-1 ring-line" aria-hidden />
          {d.legendUntrained}
        </span>
      </div>
    </section>
  )
}

interface BodyPanelProps {
  view: MuscleView
  label: string
  regions: RegionModel[]
  selected: string | null
  onSelect: (id: string | null) => void
  lang: Lang
  setsWord: string
}

function BodyPanel({ view, label, regions, selected, onSelect, lang, setsWord }: BodyPanelProps) {
  const d = progressScreenStrings[lang]
  const trained = regions.filter((r) => r.sets > 0).length

  return (
    <div className="rounded-xl border border-line bg-page p-2">
      <p className="mb-1 text-center text-[11px] font-black text-ink-500">{label}</p>
      <svg
        viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
        className="mx-auto block h-auto w-full max-w-[150px]"
        role="img"
        aria-label={`${d.mapImgAriaPrefix} — ${label}: ${trained} ${d.mapImgAriaSuffix}`}
      >
        {/* الهيكل المحايد */}
        <g fill={SILHOUETTE_FILL} stroke="rgb(var(--c-line))" strokeWidth={0.9}>
          {SILHOUETTE.map((p, i) => (
            <path key={i} d={p} />
          ))}
        </g>

        {/* المناطق */}
        {regionsFor(view).map((region) => {
          const model = regions.find((r) => r.id === region.id)
          if (!model) return null
          const isSel = selected === region.id
          const alpha = HEAT_ALPHA[model.heat]
          const title = `${model.label} · ${model.sets}/${model.target} ${setsWord}`
          return (
            <g
              key={region.id}
              role="button"
              tabIndex={0}
              aria-label={title}
              aria-pressed={isSel}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(isSel ? null : region.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(isSel ? null : region.id)
                }
              }}
            >
              <title>{title}</title>
              {regionPaths(region).map((p, i) => (
                <path
                  key={i}
                  d={p}
                  fill={
                    alpha > 0
                      ? `color-mix(in srgb, var(--c-primary) ${Math.round(alpha * 100)}%, ${NEUTRAL_FILL})`
                      : NEUTRAL_FILL
                  }
                  stroke={isSel ? 'rgb(var(--c-ink-900))' : 'transparent'}
                  strokeWidth={isSel ? 1.8 : 0}
                  className="transition-[fill,stroke] duration-200 motion-reduce:transition-none"
                />
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function RegionDetail({ model, lang, onClose }: { model: RegionModel; lang: Lang; onClose: () => void }) {
  const d = progressScreenStrings[lang]
  const statusLabel = {
    trained: d.statusTrained,
    ready: d.statusReady,
    recovering: d.statusRecovering,
    fresh: d.statusFresh,
    undertrained: d.statusUndertrained,
  }[model.status]
  const color = STATUS_COLOR[model.status]
  const pct = model.target > 0 ? Math.min(100, Math.round((model.sets / model.target) * 100)) : 0

  return (
    <div className="mt-3 rounded-xl border border-line bg-page p-3" data-testid="muscle-region-detail">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-ink-900">{model.label}</p>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-black"
            style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}40` }}
          >
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close details' : 'إغلاق التفاصيل'}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:text-ink-900"
          >
            <Icon name="X" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between text-xs">
        <span className="font-bold text-ink-700">
          <span className="text-lg font-black text-ink-900 tabular-nums">{model.sets}</span>
          <span className="text-ink-400"> / {model.target} {d.setsWord}</span>
        </span>
        <span className="font-black tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-beige">
        <div
          className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {model.breakdown.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {model.breakdown.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-700 tabular-nums"
            >
              {b.label} {b.sets}/{b.target}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
