import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { FlatMuscleBody } from './FlatMuscleBody'
import { cn } from '@/lib/cn'
import { muscleGroups, muscleLabelAr, muscleMap } from '@/data/muscleGroups'
import { computeWeeklyCoverage, weeklyTargetFor } from '@/lib/muscleCoverage'
import { loadSessions } from '@/lib/workoutSessions'
import { useCustomization } from '@/lib/customizationContext'
import { buildBodySpec, type BodyQuality } from '@/data/bodyModel3d'
import { buildBodyMesh, type BodyMesh } from '@/lib/body3d/mesh'
import { BodyRenderer, type Palette, type RGB } from '@/lib/body3d/render'
import type { MuscleCoverage, MuscleId } from '@/types/muscles'
import type { Lang } from '@/lib/appPreferences'
import { bodyModelStrings, type BodyModelStrings } from '@/i18n/dict/bodyModel'

// ============================================================================
// المجسّم البشري ثلاثي الأبعاد — «شوف عضلاتك».
//
// جسم عضلي كامل (بلا عظام) يُبنى ويُرسم في المتصفّح بلا أي مكتبة خارجية.
// اسحب لتدويره ٣٦٠°: ترى الصدر والبطن من الأمام، اللاتس والترابيس والألوية من
// الخلف، والدالية والسمانة من الجانب. كل عضلة درّبتها هذا الأسبوع تُضيء بلون
// العلامة بشدّة تتناسب مع حجم تدريبها؛ وغير المُدرّبة تبقى محايدة بلا لوم.
// اضغط على أي عضلة لتفاصيلها. وضع «مسطّح» متاح كبديل خفيف على الأجهزة الضعيفة.
// ============================================================================

/** زوايا جاهزة — الدوران حول المحور الرأسي بالراديان. */
const PRESETS: { key: string; yaw: number }[] = [
  { key: 'front', yaw: 0 },
  { key: 'left', yaw: Math.PI / 2 },
  { key: 'back', yaw: Math.PI },
  { key: 'right', yaw: -Math.PI / 2 },
]

/** تسمية الزاوية الجاهزة من القاموس (المفتاح ثابت، النص مترجَم). */
function presetLabel(key: string, t: BodyModelStrings): string {
  if (key === 'front') return t.angleFront
  if (key === 'back') return t.angleBack
  if (key === 'left') return t.angleSide
  return t.angleSideOther
}

const MAX_PITCH = 0.42
const IDLE_SPIN_MS = 5200
const SELECT_PULSE_S = 1.6
/** بكسلات المخزن لكل بكسل CSS — 2× يعطي حوافًا ناعمة على كل الشاشات. */
const RASTER_SCALE = 2
/** دقّة أخفّ أثناء السحب كي تبقى الحركة ٦٠ إطارًا على الأجهزة المتوسطة. */
const RASTER_SCALE_DRAG = 1.35

/** يحوّل لونًا نصيًا (hex أو rgb) إلى مكوّناته. */
function parseColor(input: string, fallback: RGB): RGB {
  const s = input.trim()
  if (s.startsWith('#')) {
    const hex = s.slice(1)
    const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
    if (full.length >= 6) {
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16),
      }
    }
  }
  const m = s.match(/(-?\d+(?:\.\d+)?)/g)
  if (m && m.length >= 3) return { r: +m[0], g: +m[1], b: +m[2] }
  return fallback
}

const BRAND_FALLBACK: RGB = { r: 242, g: 106, b: 33 }

/** لوحة ألوان المجسّم — تُشتقّ من متغيّرات الهوية وقت التشغيل. */
function readPalette(el: HTMLElement | null): Palette {
  const brand = el
    ? parseColor(getComputedStyle(el).getPropertyValue('--c-primary') || '', BRAND_FALLBACK)
    : BRAND_FALLBACK
  return {
    skin: { r: 226, g: 208, b: 184 },
    muscle: { r: 205, g: 178, b: 145 },
    heat: brand,
    garment: { r: 52, g: 62, b: 76 },
    shadow: 'rgba(0,0,0,0.42)',
    select: '#ffffff',
  }
}

/** شدّة الإضاءة لعضلة: 0 إن لم تُدرَّب، وإلا 0.32 → 1 حسب التغطية. */
function heatValue(c: MuscleCoverage | undefined): number {
  if (!c || c.sets <= 0) return 0
  return Math.min(1, 0.32 + c.intensity * 0.68)
}

export function BodyModel3D({ lang, className }: { lang: Lang; className?: string }) {
  const s = bodyModelStrings[lang]
  const { customization } = useCustomization()
  const gender = customization.profile.gender
  const level = customization.profile.trainingLevel

  const [mode, setMode] = useState<'3d' | 'flat'>('3d')
  const [selected, setSelected] = useState<MuscleId | null>(null)
  const [angleLabel, setAngleLabel] = useState(() => bodyModelStrings[lang].angleFront)
  const [ready, setReady] = useState(false)
  /** تلميح السحب يظهر حتى أول تفاعل فقط. */
  const [showHint, setShowHint] = useState(true)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<BodyRenderer | null>(null)
  const rafRef = useRef(0)
  const selectedRef = useRef<MuscleId | null>(null)
  const paletteRef = useRef<Palette>(readPalette(null))

  /** حالة الحركة — في ref كي لا يعيد السحب بناء المكوّن. */
  const anim = useRef({
    yaw: 0,
    pitch: -0.05,
    vyaw: 0,
    targetYaw: null as number | null,
    dragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    travelled: 0,
    pulse: 0,
    idleUntil: 0,
    lastT: 0,
    scale: RASTER_SCALE,
  })

  // --- التغطية الأسبوعية ---
  const coverage = useMemo(() => {
    return computeWeeklyCoverage({
      sessions: loadSessions(),
      plan: customization.workoutPlan,
      level,
    }).weeklyCoverage
  }, [customization.workoutPlan, level])

  const heat = useMemo(() => {
    const out: Partial<Record<MuscleId, number>> = {}
    for (const g of muscleGroups) out[g.id] = heatValue(coverage[g.id])
    return out
  }, [coverage])
  const heatRef = useRef(heat)
  heatRef.current = heat

  const trainedCount = muscleGroups.filter((m) => (coverage[m.id]?.sets ?? 0) > 0).length

  // --- جودة الرسم: تُخفَّض على الأجهزة ضعيفة النوى ---
  const quality: BodyQuality = useMemo(() => {
    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4
    return cores <= 4 ? 'low' : 'high'
  }, [])

  // --- بناء الشبكة (مرّة لكل جنس/جودة) ---
  const mesh: BodyMesh = useMemo(() => buildBodyMesh(buildBodySpec(gender, quality)), [gender, quality])

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  /** يرسم إطارًا واحدًا بالحالة الحالية. */
  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    if (!canvas || !renderer) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    const a = anim.current
    // أثناء الحركة نرسم بدقّة أقل ثم نعود للدقّة الكاملة عند الاستقرار.
    const moving = a.dragging || a.targetYaw !== null || Math.abs(a.vyaw) > 0.0006
    const s = moving ? RASTER_SCALE_DRAG : RASTER_SCALE
    a.scale = s
    if (canvas.width !== Math.round(w * s) || canvas.height !== Math.round(h * s)) {
      canvas.width = Math.round(w * s)
      canvas.height = Math.round(h * s)
    }
    renderer.render(ctx, {
      yaw: a.yaw,
      pitch: a.pitch,
      width: w,
      height: h,
      scale: s,
      heat: heatRef.current,
      selected: selectedRef.current,
      pulse: a.pulse > 0 ? Math.sin((a.pulse / SELECT_PULSE_S) * Math.PI) : 0,
      palette: paletteRef.current,
    })
  }, [])

  /** يطلب إطارًا جديدًا (مع الحركة الفيزيائية). */
  const tick = useCallback(
    (t: number) => {
      rafRef.current = 0
      const a = anim.current
      const dt = a.lastT ? Math.min(0.05, (t - a.lastT) / 1000) : 0.016
      a.lastT = t
      let animating = false

      // دوران تلقائي تعريفي عند أول ظهور — يتوقّف فور لمس المستخدم.
      if (!a.dragging && a.targetYaw === null && t < a.idleUntil && !reducedMotion) {
        a.yaw += dt * 0.55
        animating = true
      }

      // انزلاق بعد رفع الإصبع.
      if (!a.dragging && a.targetYaw === null && Math.abs(a.vyaw) > 0.0006) {
        a.yaw += a.vyaw
        a.vyaw *= Math.pow(0.02, dt)
        animating = true
      }

      // انتقال ناعم إلى زاوية جاهزة.
      if (a.targetYaw !== null) {
        const diff = a.targetYaw - a.yaw
        if (Math.abs(diff) < 0.004) {
          a.yaw = a.targetYaw
          a.targetYaw = null
        } else {
          a.yaw += diff * Math.min(1, dt * 9)
          animating = true
        }
      }

      if (a.pulse > 0) {
        a.pulse = Math.max(0, a.pulse - dt)
        animating = true
      }

      paint()
      if (animating || a.dragging) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        a.lastT = 0
      }
    },
    [paint, reducedMotion],
  )

  const requestFrame = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  // --- تهيئة الراسم عند تغيّر الشبكة ---
  useEffect(() => {
    if (mode !== '3d') return
    paletteRef.current = readPalette(wrapRef.current)
    if (rendererRef.current) rendererRef.current.setMesh(mesh)
    else rendererRef.current = new BodyRenderer(mesh)
    setReady(true)
    anim.current.idleUntil = performance.now() + IDLE_SPIN_MS
    anim.current.lastT = 0
    // رسم فوري لا ينتظر إطار الرسوم (يضمن ظهور المجسّم حتى لو كانت الصفحة مخفيّة).
    paint()
    requestFrame()
  }, [mesh, mode, paint, requestFrame])

  // --- إعادة الرسم عند تغيّر التغطية أو التحديد ---
  useEffect(() => {
    selectedRef.current = selected
    if (mode === '3d') requestFrame()
  }, [selected, heat, mode, requestFrame])

  // --- إعادة الرسم عند تغيّر المقاس ---
  useEffect(() => {
    if (mode !== '3d') return
    const el = canvasRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => requestFrame())
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode, requestFrame])

  // --- إيقاف الحلقة عند التفكيك ---
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    },
    [],
  )

  /** يحدّث تسمية الزاوية المعروضة. */
  const syncAngleLabel = useCallback(() => {
    const a = anim.current
    const deg = (((a.yaw * 180) / Math.PI) % 360 + 360) % 360
    const label =
      deg < 45 || deg >= 315 ? s.angleFront : deg < 135 ? s.angleSide : deg < 225 ? s.angleBack : s.angleSideOther
    setAngleLabel((cur: string) => (cur === label ? cur : label))
  }, [s])

  // --- التفاعل بالسحب ---
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current
    setShowHint(false)
    a.dragging = true
    a.pointerId = e.pointerId
    a.lastX = e.clientX
    a.lastY = e.clientY
    a.travelled = 0
    a.vyaw = 0
    a.targetYaw = null
    a.idleUntil = 0
    e.currentTarget.setPointerCapture(e.pointerId)
    requestFrame()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current
    if (!a.dragging || e.pointerId !== a.pointerId) return
    const dx = e.clientX - a.lastX
    const dy = e.clientY - a.lastY
    a.lastX = e.clientX
    a.lastY = e.clientY
    a.travelled += Math.abs(dx) + Math.abs(dy)
    a.yaw += dx * 0.011
    a.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, a.pitch + dy * 0.006))
    a.vyaw = dx * 0.011
    requestFrame()
  }

  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current
    if (!a.dragging || e.pointerId !== a.pointerId) return
    a.dragging = false
    a.pointerId = -1
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)

    // نقرة قصيرة = اختيار عضلة، لا دوران.
    if (a.travelled < 8) {
      const rect = e.currentTarget.getBoundingClientRect()
      const hit =
        rendererRef.current?.pick(e.clientX - rect.left, e.clientY - rect.top, a.scale) ?? null
      setSelected((cur) => (cur === hit ? null : hit))
      if (hit) a.pulse = SELECT_PULSE_S
      a.vyaw = 0
    }
    syncAngleLabel()
    requestFrame()
  }

  /** يدير المجسّم إلى زاوية جاهزة عبر أقصر مسار. */
  const goTo = (yaw: number) => {
    const a = anim.current
    setShowHint(false)
    a.idleUntil = 0
    a.vyaw = 0
    const twoPi = Math.PI * 2
    let diff = (((yaw - a.yaw) % twoPi) + twoPi) % twoPi
    if (diff > Math.PI) diff -= twoPi
    a.targetYaw = a.yaw + diff
    const preset = PRESETS.find((p) => p.yaw === yaw)
    setAngleLabel(preset ? presetLabel(preset.key, s) : angleLabel)
    requestFrame()
  }

  /** تدوير بلوحة المفاتيح — بديل الوصول للسحب. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const a = anim.current
    const step = Math.PI / 12
    if (e.key === 'ArrowLeft') a.targetYaw = (a.targetYaw ?? a.yaw) - step
    else if (e.key === 'ArrowRight') a.targetYaw = (a.targetYaw ?? a.yaw) + step
    else if (e.key === 'ArrowUp') a.pitch = Math.max(-MAX_PITCH, a.pitch - 0.08)
    else if (e.key === 'ArrowDown') a.pitch = Math.min(MAX_PITCH, a.pitch + 0.08)
    else if (e.key === 'Escape') setSelected(null)
    else return
    e.preventDefault()
    a.idleUntil = 0
    syncAngleLabel()
    requestFrame()
  }

  // --- النصوص ---
  const sel = selected ? coverage[selected] : undefined
  const selTarget = selected ? weeklyTargetFor(selected, level) : 0
  const genderLabel = gender === 'female' ? s.genderFemale : gender === 'male' ? s.genderMale : s.genderNeutral
  const caption = selected
    ? sel && sel.sets > 0
      ? s.muscleWithSets(muscleLabelAr(selected), sel.sets, selTarget)
      : s.muscleNoSets(muscleLabelAr(selected))
    : trainedCount > 0
      ? s.activatedSummary(trainedCount, muscleGroups.length)
      : s.emptyHint

  return (
    <div ref={wrapRef} className={cn('card p-5', className)}>
      {/* العنوان + مبدّل العرض */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Dumbbell" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-ink-900">{s.cardTitle}</p>
            <p className="text-[11px] font-bold text-ink-400">{s.cardSubtitle(genderLabel, mode === '3d' ? angleLabel : null)}</p>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-line bg-page p-1">
          {(['3d', 'flat'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setSelected(null)
              }}
              aria-pressed={mode === m}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                mode === m ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {m === '3d' ? s.modeSolid : s.modeFlat}
            </button>
          ))}
        </div>
      </div>

      {mode === 'flat' ? (
        <FlatMuscleBody lang={lang} coverage={coverage} gender={gender} selected={selected} onSelect={setSelected} />
      ) : (
        <>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="mx-auto block h-[340px] w-full max-w-[300px] cursor-grab touch-none select-none rounded-xl outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary"
              role="img"
              tabIndex={0}
              aria-label={`مجسّم عضلات ثلاثي الأبعاد لجسم ${genderLabel}، العرض ${angleLabel}. فعّلت ${trainedCount} من ${muscleGroups.length} عضلة هذا الأسبوع. استخدم الأسهم للتدوير.`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown}
            />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center text-xs font-bold text-ink-400">
                {s.building}
              </div>
            )}
            {showHint && (
              <p
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1 flex justify-center"
              >
                <span className="rounded-full bg-page/80 px-2.5 py-1 text-[10px] font-bold text-ink-400">
                  {s.dragHint}
                </span>
              </p>
            )}
          </div>

          {/* زوايا جاهزة */}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => goTo(p.yaw)}
                className="min-h-[32px] rounded-full border border-line bg-page px-3 py-1 text-[11px] font-bold text-ink-500 transition-colors hover:text-ink-900"
              >
                {presetLabel(p.key, s)}
              </button>
            ))}
          </div>
        </>
      )}

      {/* التعليق / تفاصيل العضلة المختارة */}
      <p className="mt-2 text-center text-xs font-bold text-ink-700">{caption}</p>

      {selected && sel && (
        <div className="mt-3 rounded-xl border border-line bg-page p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-ink-900">{muscleLabelAr(selected)}</p>
            <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-[11px] font-black text-primary-c">
              {muscleMap[selected]?.size === 'large' ? s.muscleLarge : s.muscleSmall}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(Math.min(1, sel.intensity) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            {sel.sets > 0
              ? s.setsDetail(sel.sets, selTarget, sel.exercises)
              : s.untouchedHint}
          </p>
        </div>
      )}

      {/* وسيلة الإيضاح */}
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-line pt-3 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded-full"
            style={{ background: 'linear-gradient(90deg, rgba(242,106,33,0.35), var(--c-primary))' }}
          />
          {s.legendTrained}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#CDB291', border: '1px solid rgba(0,0,0,0.2)' }}
          />
          {s.legendUntrained}
        </span>
      </div>
    </div>
  )
}
