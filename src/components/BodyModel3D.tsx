import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { MuscleCoverageGrid } from './MuscleMap'
import { cn } from '@/lib/cn'
import { muscleGroupLabel, muscleGroups, muscleMap } from '@/data/muscleGroups'
import { computeWeeklyCoverage, weeklyTargetFor } from '@/lib/muscleCoverage'
import { loadSessions } from '@/lib/workoutSessions'
import { useCustomization } from '@/lib/customizationContext'
import { buildBodySpec, type BodyQuality } from '@/data/bodyModel3d'
import { buildBodyMesh, type BodyMesh } from '@/lib/body3d/mesh'
import { advanceGlide, GLIDE_EPSILON, pointerVelocity } from '@/lib/body3d/motion'
import { BodyRenderer, rasterScaleFor, type Palette, type RGB } from '@/lib/body3d/render'
import type { Lang } from '@/lib/appPreferences'
import type { MuscleCoverage, MuscleId } from '@/types/muscles'

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
const PRESETS: { key: string; ar: string; en: string; yaw: number }[] = [
  { key: 'front', ar: 'أمامي', en: 'Front', yaw: 0 },
  { key: 'left', ar: 'جانب', en: 'Side', yaw: Math.PI / 2 },
  { key: 'back', ar: 'خلفي', en: 'Back', yaw: Math.PI },
  { key: 'right', ar: 'جانب آخر', en: 'Other side', yaw: -Math.PI / 2 },
]

const MAX_PITCH = 0.42
const IDLE_SPIN_MS = 5200
const SELECT_PULSE_S = 1.6
/** نسبة دقّة السحب إلى دقّة الاستقرار — حركة أخفّ ثم عودة للحدّة عند الثبات. */
const DRAG_SCALE_RATIO = 0.7
/** نصف قطر التسامح للنقر بالبكسل المنطقي. */
const PICK_RADIUS_CSS = 4

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
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const gender = customization.profile.gender
  const level = customization.profile.trainingLevel

  const [mode, setMode] = useState<'3d' | 'flat'>('3d')
  const [selected, setSelected] = useState<MuscleId | null>(null)
  const [angleLabel, setAngleLabel] = useState(() => t('أمامي', 'Front'))
  const [ready, setReady] = useState(false)
  /** تلميح السحب يظهر حتى أول تفاعل فقط. */
  const [showHint, setShowHint] = useState(true)
  /** هل البطاقة داخل إطار العرض؟ المجسّم يقع أسفل الطيّة في «التقدّم». */
  const [visible, setVisible] = useState(false)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<BodyRenderer | null>(null)
  const rafRef = useRef(0)
  const selectedRef = useRef<MuscleId | null>(null)
  const paletteRef = useRef<Palette>(readPalette(null))
  const visibleRef = useRef(false)
  visibleRef.current = visible

  /** كثافة بكسل الجهاز — تحدّد التكبير الداخلي بدل ثابت مكتوب يدويًا. */
  const [dpr, setDpr] = useState(() =>
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  )
  const idleScale = rasterScaleFor(dpr)
  const dragScale = Math.max(1, idleScale * DRAG_SCALE_RATIO)
  const scalesRef = useRef({ idle: idleScale, drag: dragScale })
  scalesRef.current = { idle: idleScale, drag: dragScale }

  /** حالة الحركة — في ref كي لا يعيد السحب بناء المكوّن. */
  const anim = useRef({
    yaw: 0,
    pitch: -0.05,
    /** سرعة الانزلاق بوحدة راديان لكل إطار مرجعي ٦٠هرتز (انظر body3d/motion). */
    vyaw: 0,
    targetYaw: null as number | null,
    dragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    lastMoveT: 0,
    travelled: 0,
    pulse: 0,
    idleUntil: 0,
    introShown: false,
    lastT: 0,
    scale: idleScale,
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

  // --- بناء الشبكة: خارج مسار الرسم ---
  // بناء الشبكة يستغرق عشرات الميلي‌ثانية (وأضعافها على الجوال). كان يجري داخل
  // useMemo أثناء العرض فيوقف الخيط الرئيسي قبل أن تُرسم البطاقة، فلا تظهر حالة
  // «نبني المجسّم…» أصلًا. الآن يُبنى بعد أول ظهور فعلي للبطاقة على الشاشة.
  const [mesh, setMesh] = useState<BodyMesh | null>(null)

  useEffect(() => {
    if (mode !== '3d' || !visible) return
    let cancelled = false
    const id = window.setTimeout(() => {
      if (!cancelled) setMesh(buildBodyMesh(buildBodySpec(gender, quality)))
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [gender, quality, mode, visible])

  // --- تفضيل تقليل الحركة — متفاعل مع تغيّر الإعداد، لا لقطة عند التركيب ---
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // --- كثافة البكسل قد تتغيّر (تكبير المتصفّح أو نقل النافذة بين شاشتين) ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setDpr(window.devicePixelRatio || 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
    const moving = a.dragging || a.targetYaw !== null || Math.abs(a.vyaw) > GLIDE_EPSILON
    const s = moving ? scalesRef.current.drag : scalesRef.current.idle
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

      // البطاقة خارج الشاشة: نوقف الحلقة تمامًا. requestAnimationFrame يُخنق
      // عند إخفاء التبويب فقط، أمّا التمرير بعيدًا فيُبقيها تعمل بكامل معدّلها.
      if (!visibleRef.current) {
        a.lastT = 0
        return
      }

      // دوران تلقائي تعريفي عند أول ظهور — يتوقّف فور لمس المستخدم.
      if (!a.dragging && a.targetYaw === null && t < a.idleUntil && !reducedMotionRef.current) {
        a.yaw += dt * 0.55
        animating = true
      }

      // انزلاق بعد رفع الإصبع — تكامل مستقلّ عن معدّل الإطارات (body3d/motion).
      if (!a.dragging && a.targetYaw === null && a.vyaw !== 0) {
        const step = advanceGlide(a.vyaw, dt)
        a.yaw += step.dYaw
        a.vyaw = step.moving ? step.velocity : 0
        if (step.moving) animating = true
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
    [paint],
  )

  const requestFrame = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  /** يوقف حلقة الرسم فورًا (تبديل الوضع، الخروج من الشاشة، التفكيك). */
  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    anim.current.lastT = 0
  }, [])

  // --- رصد ظهور البطاقة على الشاشة ---
  // المجسّم يقع أسفل الطيّة في «التقدّم»: بلا هذا الرصد كان يبني شبكته ويدور
  // تعريفيًا ٥٫٢ ثوانٍ بستّين إطارًا في الثانية قبل أن يصل إليه المستخدم أصلًا.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting)
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // --- تهيئة الراسم عند جهوز الشبكة ---
  useEffect(() => {
    if (mode !== '3d' || !mesh) return
    paletteRef.current = readPalette(wrapRef.current)
    if (rendererRef.current) rendererRef.current.setMesh(mesh)
    else rendererRef.current = new BodyRenderer(mesh)
    setReady(true)
    const a = anim.current
    // الدوران التعريفي يبدأ عند أوّل ظهور فعلي، لا عند التركيب — كي يراه المستخدم.
    if (!a.introShown) {
      a.introShown = true
      a.idleUntil = performance.now() + IDLE_SPIN_MS
    }
    a.lastT = 0
    paint()
    requestFrame()
  }, [mesh, mode, paint, requestFrame])

  // --- إعادة الرسم عند تغيّر التغطية أو التحديد ---
  useEffect(() => {
    selectedRef.current = selected
    if (mode === '3d') requestFrame()
  }, [selected, heat, mode, requestFrame])

  // --- إعادة الرسم عند تغيّر المقاس أو كثافة البكسل ---
  useEffect(() => {
    if (mode !== '3d') return
    const el = canvasRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => requestFrame())
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode, requestFrame])

  useEffect(() => {
    if (mode === '3d') requestFrame()
  }, [dpr, mode, requestFrame])

  // --- لوحة الألوان تتبع السمة الحيّة (<html data-theme>) ---
  useEffect(() => {
    if (mode !== '3d' || typeof MutationObserver === 'undefined') return
    const root = document.documentElement
    const mo = new MutationObserver(() => {
      paletteRef.current = readPalette(wrapRef.current)
      rendererRef.current?.invalidateColors()
      requestFrame()
    })
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    return () => mo.disconnect()
  }, [mode, requestFrame])

  // --- إيقاف الحلقة عند مغادرة وضع المجسّم أو الخروج من الشاشة أو التفكيك ---
  useEffect(() => {
    if (mode !== '3d' || !visible) {
      stopLoop()
      return
    }
    requestFrame()
  }, [mode, visible, stopLoop, requestFrame])

  useEffect(() => stopLoop, [stopLoop])

  /** يحدّث تسمية الزاوية المعروضة. */
  const syncAngleLabel = useCallback(() => {
    const a = anim.current
    const deg = (((a.yaw * 180) / Math.PI) % 360 + 360) % 360
    const label = deg < 45 || deg >= 315
      ? ar ? 'أمامي' : 'Front'
      : deg < 135
        ? ar ? 'جانب' : 'Side'
        : deg < 225
          ? ar ? 'خلفي' : 'Back'
          : ar ? 'جانب آخر' : 'Other side'
    setAngleLabel((cur) => (cur === label ? cur : label))
  }, [ar])

  // --- التفاعل بالسحب ---
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current
    setShowHint(false)
    a.dragging = true
    a.pointerId = e.pointerId
    a.lastX = e.clientX
    a.lastY = e.clientY
    a.lastMoveT = 0
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
    const dYaw = dx * 0.011
    a.yaw += dYaw
    a.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, a.pitch + dy * 0.006))
    // السرعة تُشتقّ من الزمن بين حدثين لا من إزاحة الحدث وحدها، وإلّا ضعُفت
    // قوّة القذف إلى النصف على الأجهزة التي ترسل أحداث مؤشّر بـ١٢٠هرتز.
    const dtMs = a.lastMoveT ? e.timeStamp - a.lastMoveT : 0
    a.lastMoveT = e.timeStamp
    a.vyaw = pointerVelocity(dYaw, dtMs)
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
        rendererRef.current?.pick(
          e.clientX - rect.left,
          e.clientY - rect.top,
          a.scale,
          PICK_RADIUS_CSS,
        ) ?? null
      setSelected((cur) => (cur === hit ? null : hit))
      // النبضة زينة متحرّكة — تُلغى مع «تقليل الحركة»، ويبقى التحديد ظاهرًا ثابتًا.
      if (hit && !reducedMotionRef.current) a.pulse = SELECT_PULSE_S
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
    setAngleLabel(preset ? preset[lang] : angleLabel)
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
  const genderLabel = gender === 'female' ? t('أنثى', 'Female') : gender === 'male' ? t('ذكر', 'Male') : t('محايد', 'Neutral')
  const selectedLabel = selected ? muscleGroupLabel(selected, lang) : ''
  const caption = selected
    ? sel && sel.sets > 0
      ? t(`${selectedLabel} · ${sel.sets} من ${selTarget} مجموعة هذا الأسبوع`, `${selectedLabel} · ${sel.sets} of ${selTarget} sets this week`)
      : t(`${selectedLabel} · ما سجّلت لها شيء بعد`, `${selectedLabel} · Nothing logged yet`)
    : trainedCount > 0
      ? t(`فعّلت ${trainedCount} من ${muscleGroups.length} عضلة هذا الأسبوع 💪`, `${trainedCount} of ${muscleGroups.length} muscles active this week 💪`)
      : t('ابدأ تمرينك وبتشوف عضلاتك تتلوّن هنا.', 'Start training and your active muscles will light up here.')

  return (
    <div ref={wrapRef} className={cn('card p-5', className)}>
      {/* [CTO-009/WP-5] العنوان ومبدّل العرض كانا في صفّ واحد: على ٣٢٠بكسل
          ينكسر «مجسّم عضلاتك» سطرين ويزاحم المبدّل، ويهبط السطر الثانوي
          («هذا الأسبوع · ذكر · أمامي») على سطرين أيضًا. صارا صفّين — العنوان
          يأخذ عرضه كاملًا، والمبدّل تحته بمحاذاة النهاية — فلا كسر ولا تزاحم
          في أي عرض. */}
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Dumbbell" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-ink-900">{t('مجسّم عضلاتك', 'Your muscle model')}</p>
            <p className="truncate text-[11px] font-bold text-ink-400">
              {t('هذا الأسبوع', 'This week')} · {genderLabel}
              {mode === '3d' ? ` · ${angleLabel}` : ''}
            </p>
          </div>
        </div>
        <div className="inline-flex self-end rounded-full border border-line bg-page p-1 sm:self-auto">
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
                // [CTO-82] ≥44بكسل: كانت ٢٥ — أصغر هدف لمس في الشاشة.
                'inline-flex min-h-[44px] items-center rounded-full px-3.5 text-[11px] font-bold transition-colors',
                mode === m ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {m === '3d' ? t('مجسّم', '3D') : t('مسطّح', 'Simple')}
            </button>
          ))}
        </div>
      </div>

      {mode === 'flat' ? (
        <MuscleCoverageGrid coverage={coverage} level={level} lang={lang} />
      ) : (
        <>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="mx-auto block h-[340px] w-full max-w-[300px] cursor-grab touch-none select-none rounded-xl outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary"
              role="img"
              tabIndex={0}
              aria-label={t(`مجسّم عضلات ثلاثي الأبعاد لجسم ${genderLabel}، العرض ${angleLabel}. فعّلت ${trainedCount} من ${muscleGroups.length} عضلة هذا الأسبوع. استخدم الأسهم للتدوير.`, `3D muscle model for a ${genderLabel} body, ${angleLabel} view. ${trainedCount} of ${muscleGroups.length} muscles active this week. Use arrow keys to rotate.`)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown}
            />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center text-xs font-bold text-ink-400">
                {t('نبني المجسّم…', 'Building model…')}
              </div>
            )}
            {showHint && (
              <p
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1 flex justify-center"
              >
                <span className="rounded-full bg-page/80 px-2.5 py-1 text-[10px] font-bold text-ink-400">
                  {t('اسحب لتدوير الجسم ٣٦٠°', 'Drag to rotate 360°')}
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
                className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-page px-3.5 text-[11px] font-bold text-ink-500 transition-colors hover:text-ink-900"
              >
                {p[lang]}
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
            <p className="text-sm font-black text-ink-900">{selectedLabel}</p>
            <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-[11px] font-black text-primary-c">
              {muscleMap[selected]?.size === 'large' ? t('عضلة كبيرة', 'Large muscle') : t('عضلة صغيرة', 'Small muscle')}
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
              ? t(`${sel.sets} مجموعة من ${selTarget} مستهدفة · ${sel.exercises} تمرين مختلف`, `${sel.sets} of ${selTarget} target sets · ${sel.exercises} exercises`)
              : t('ما لمستها هذا الأسبوع — أضف لها تمرينًا في خطتك.', 'Not trained this week — add an exercise for it to your plan.')}
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
          {t('درّبتها (الأغمق أكثر)', 'Trained (darker means more)')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#CDB291', border: '1px solid rgba(0,0,0,0.2)' }}
          />
          {t('لم تُدرَّب', 'Not trained')}
        </span>
      </div>
    </div>
  )
}
