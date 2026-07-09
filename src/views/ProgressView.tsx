import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { WeeklyMuscleMap } from '@/components/WeeklyMuscleMap'
import { StepCounterCard } from '@/components/StepCounterCard'
import { muscleLabel } from '@/lib/muscles'
import { getExercise } from '@/data/exercises'
import { loadLogs, latestLog, trendFor } from '@/lib/measurementLog'
import { musclesThisWeek, recentVolumes, topPRs, workoutCounts } from '@/lib/progressStats'
import { weeklyAdherenceStreak } from '@/lib/streaks'
import { useCustomization } from '@/lib/customizationContext'
import { loadReminderPrefs, saveReminderPrefs, type ReminderPrefs } from '@/lib/reminderPrefs'
import { remindersSupported, requestReminderPermission, reminderPermissionStatus, syncWorkoutReminder, type ReminderPermission } from '@/lib/reminders'
import { track } from '@/lib/analytics'
import { getStrings } from '@/config/strings'
import { progressScreenStrings } from '@/i18n/dict/progressScreen'
import type { Lang } from '@/lib/appPreferences'

interface ProgressViewProps {
  lang: Lang
}

/** تبويب التقدّم — بطاقات الوزن والحجم والـPRs والعضلات والسلسلة + خطوات يدوية وتذكير (موبايل أولًا). */
export function ProgressView({ lang }: ProgressViewProps) {
  const t = getStrings(lang).progress
  const tw = getStrings(lang).workout
  const d = progressScreenStrings[lang]
  const { customization } = useCustomization()
  const daysPerWeek = customization.workoutPlan.days.length || 3

  const stats = useMemo(() => {
    const logs = loadLogs()
    const latest = latestLog(logs)
    const weight = latest?.values?.weightKg
    return {
      weight: weight !== undefined && weight !== '' ? String(weight) : null,
      weightTrend: trendFor(logs, 'weightKg'),
      volumes: recentVolumes(8),
      prs: topPRs(5),
      muscles: musclesThisWeek(),
      weekly: weeklyAdherenceStreak(daysPerWeek),
      counts: workoutCounts(),
    }
  }, [daysPerWeek])

  const hasWorkouts = stats.counts.total > 0
  const maxVol = Math.max(1, ...stats.volumes.map((v) => v.volume))

  return (
    <div className="overflow-x-hidden px-4 py-4">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
          <Icon name="BarChart3" className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-black text-ink-900">{t.tabTitle}</h1>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          {/* الوزن */}
          <Card icon="Scale" title={t.cardWeight}>
            {stats.weight ? (
              <p className="text-2xl font-black text-ink-900">
                {stats.weight}<span className="text-xs font-bold text-ink-400"> {d.weightUnit}</span>
                {stats.weightTrend && (
                  <Icon
                    name={stats.weightTrend === 'up' ? 'TrendingUp' : stats.weightTrend === 'down' ? 'TrendingDown' : 'Minus'}
                    className="ms-1 inline h-4 w-4 text-primary-c"
                  />
                )}
              </p>
            ) : (
              <Empty text={t.noWeight} />
            )}
          </Card>

          {/* سلسلة الالتزام الأسبوعي */}
          <Card icon="Flame" title={tw.weeklyStreakTitle}>
            <p className="text-2xl font-black text-ink-900">
              {stats.weekly.streakWeeks}<span className="text-xs font-bold text-ink-400"> {tw.weeksUnit}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {tw.weeklyDonePrefix} {stats.weekly.thisWeekCount} {tw.of} {stats.weekly.daysPerWeek} {tw.weeklyWorkoutsWord}
            </p>
          </Card>
        </div>

        {/* حجم التمرين */}
        <Card icon="BarChart3" title={t.cardVolume} className="mt-3">
          {hasWorkouts && stats.volumes.length > 0 ? (
            <div className="mt-1 flex h-20 items-end gap-1.5">
              {stats.volumes.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${v.volume}`}>
                  <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(6, (v.volume / maxVol) * 100)}%` }} />
                </div>
              ))}
            </div>
          ) : (
            <Empty text={t.noWorkouts} />
          )}
          {hasWorkouts && (
            <p className="mt-2 text-[11px] text-ink-400">{stats.counts.thisWeek} {d.thisWeekWord} · {stats.counts.total} {d.totalWord}</p>
          )}
        </Card>

        {/* أفضل الأوزان */}
        <Card icon="Trophy" title={t.cardPRs} className="mt-3">
          {stats.prs.length > 0 ? (
            <ul className="mt-1 space-y-2">
              {stats.prs.map((pr) => (
                <li key={pr.exerciseId} className="flex items-center justify-between gap-2">
                  {/* اسم التمرين بلغة الواجهة (P10.1) — الإنجليزي من المكتبة والعربي احتياطًا */}
                  <span className="min-w-0 truncate text-sm text-ink-900">
                    {lang === 'en' ? getExercise(pr.exerciseId)?.nameEn || pr.nameAr : pr.nameAr}
                  </span>
                  <span className="shrink-0 rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-black text-primary-c">{pr.weight} {d.prWeightUnit}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={t.noPRs} />
          )}
        </Card>

        {/* العضلات هذا الأسبوع */}
        <Card icon="Dumbbell" title={t.cardMuscles} className="mt-3">
          {stats.muscles.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {stats.muscles.map((m) => (
                <span key={m.muscle} className="rounded-full bg-beige px-3 py-1 text-xs font-bold text-ink-700">
                  {/* اسم العضلة من القاموس المشترك حسب اللغة الحالية (P10.1) */}
                  {muscleLabel(m.muscle, lang)} · {m.count}
                </span>
              ))}
            </div>
          ) : (
            <Empty text={t.noWorkouts} />
          )}
        </Card>

        {/* خريطة العضلات الأسبوعية — تُضيء ما درّبته هذا الأسبوع */}
        <WeeklyMuscleMap className="mt-3" lang={lang} />

        {/* عدّاد الخطوات اليدوي + الهدف اليومي (إدخال يدوي فقط — لا مزامنة صحّية) */}
        <StepCounterCard className="mt-3" lang={lang} />

        {/* التذكيرات */}
        <ReminderCard lang={lang} />
      </div>
    </div>
  )
}

function Card({ icon, title, children, className = '' }: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="mb-1 flex items-center gap-2">
        <Icon name={icon} className="h-4 w-4 text-primary-c" />
        <p className="text-xs font-bold text-ink-500">{title}</p>
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="mt-1 text-xs leading-relaxed text-ink-400">{text}</p>
}

/**
 * بطاقة تذكير التمرين — على iOS فقط تجدول تنبيهًا محليًا يوميًا في الوقت المختار.
 * على الويب/Android المفتاح **معطّل** ويظهر نص صادق (يعمل في تطبيق iOS) — لا يُفعَّل
 * تفضيل ولا يُطلق حدث لأنّه لا يستطيع الإشعار فعليًا. الإذن يُطلب فقط عند التفعيل
 * الصريح؛ الرفض يُبقي المفتاح مطفأ مع تلميح واضح.
 *
 * صدق حالة التفعيل: «مفعّل» مُشتق من التفضيل **وإذن iOS الحالي معًا** — فإن عطّل المستخدم
 * الإشعارات من إعدادات iOS بعد التفعيل يظهر المفتاح مطفأً (لا ادّعاء تذكير فعّال) مع
 * تلميح لإعادة التفعيل. قفل صلب (ref) يمنع النقر المزدوج قبل تحديث حالة React.
 */
function ReminderCard({ lang }: { lang: Lang }) {
  const t = getStrings(lang).progress
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => loadReminderPrefs())
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)
  // إذن iOS الحالي (null = لم يُفحَص). يُفحَص بلا مربّع (checkPermissions) عند الظهور/العودة.
  const [permission, setPermission] = useState<ReminderPermission | null>(null)
  // قفل تزامن صلب (ref) — يمنع دخول مسار الجدولة غير المتزامن مرّتين قبل تحديث حالة React.
  const lockRef = useRef(false)
  const supported = remindersSupported() // iOS فقط — الويب/Android لا يدعمان الجدولة

  // افحص الإذن عند الظهور وعند كل عودة — يلتقط تعطيل المستخدم للإشعارات من إعدادات iOS.
  useEffect(() => {
    if (!supported) return
    let alive = true
    const check = () => void reminderPermissionStatus().then((p) => { if (alive) setPermission(p) })
    check()
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [supported])

  // «مفعّل فعليًا» = التفضيل محفوظ **و** الإذن ممنوح. قبل معرفة الإذن نتبع التفضيل (بلا وميض)،
  // وبعده نعكس الحقيقة — فإن أُلغي الإذن يظهر المفتاح مطفأً بصدق.
  const permKnown = permission !== null
  const active = supported && prefs.trainingEnabled && (permKnown ? permission === 'granted' : true)
  // إذن أُلغي بعد تفعيل سابق — تلميح صادق لإعادة التفعيل من الإعدادات.
  const revoked = supported && prefs.trainingEnabled && permKnown && permission !== 'granted'

  const persist = (next: ReminderPrefs) => {
    setPrefs(next)
    saveReminderPrefs(next)
    void syncWorkoutReminder() // iOS-محروس داخليًا (إلغاء/إعادة جدولة)؛ لا شيء على الويب
  }

  const onToggle = async () => {
    // الويب/Android غير مدعوم؛ والقفل الصلب يمنع النقر المزدوج قبل تحديث حالة busy.
    if (!supported || lockRef.current) return
    lockRef.current = true
    setBusy(true)
    try {
      if (active) {
        // إيقاف تذكير مفعّل فعليًا.
        setDenied(false)
        persist({ ...prefs, trainingEnabled: false })
        return
      }
      // تفعيل (أو إعادة تفعيل بعد إلغاء الإذن): نطلب الإذن الآن فقط.
      const wasEnabled = prefs.trainingEnabled
      const perm = await requestReminderPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setDenied(true) // نُبقيه مطفأً ونعرض تلميحًا صادقًا — لا وعد كاذب
        return
      }
      setDenied(false)
      // حدث Phase 2 القائم — عند تفعيل جديد فقط (لا يتكرّر عند إعادة منح إذن لتفضيل مفعّل سابقًا).
      if (!wasEnabled) track('reminder_enabled', { kind: 'training' })
      persist({ ...prefs, trainingEnabled: true })
    } finally {
      lockRef.current = false
      setBusy(false)
    }
  }

  // النص الصادق: الويب يعمل في تطبيق iOS؛ iOS عند الرفض/إلغاء الإذن يرشد للإعدادات.
  const note = !supported ? t.reminderWebHint : denied || revoked ? t.reminderDeniedHint : null

  return (
    <div className="mt-3 card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name="CalendarDays" className="h-5 w-5" />
        </span>
        <p className="text-sm font-black text-ink-900">{t.remindersTitle}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="text-sm text-ink-700" htmlFor="reminder-enabled">{t.reminderEnabled}</label>
        <button
          id="reminder-enabled"
          type="button"
          role="switch"
          aria-checked={active}
          disabled={!supported || busy}
          onClick={() => void onToggle()}
          className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? 'bg-primary' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${active ? 'start-0.5' : 'end-0.5'}`} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="text-sm text-ink-700" htmlFor="reminder-time">{t.reminderTrainingTime}</label>
        <input
          id="reminder-time"
          type="time"
          value={prefs.trainingTime}
          disabled={!active || busy}
          onChange={(e) => persist({ ...prefs, trainingTime: e.target.value })}
          className="rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c disabled:opacity-40"
        />
      </div>

      {note && (
        <p className="mt-3 flex items-start gap-2 text-[11px] text-ink-400">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {note}
        </p>
      )}
    </div>
  )
}
