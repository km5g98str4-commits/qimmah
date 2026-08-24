import { warmupStrings } from '@/i18n/dict/warmup'
import type { Lang } from '@/lib/appPreferences'
import { cn } from '@/lib/cn'

/**
 * مؤشّر مراحل الجلسة — [WORKOUT-CONTINUITY-001] الإصلاح ٢.
 *
 * ═══ العطل الذي يغلقه ═══
 * كان هذا المؤشّر مرسومًا **داخل** `WarmupScreen` وحدها. فالمستخدم يرى
 * «إحماء ← التمارين ← الإنهاء» مرّة واحدة، ثم يضغط «ابدأ» فيختفي المسار كلّه.
 * قياس على جلسة أربعة تمارين كاملة: `[data-session-rail]` موجود على شاشة
 * الإحماء و**معدوم على كل شاشة بعدها** (٦ شاشات من ٧). فالجلسة تُقرأ شاشتين
 * منفصلتين لا مسارًا واحدًا — وهو حرفيًّا بلاغ المؤسس: «فتح تمرينًا عشوائيًّا
 * ونسي بقية التمرين».
 *
 * ═══ لماذا مكوّن واحد لا نسختان ═══
 * النسخة الثانية تشيخ: تتغيّر تسمية مرحلة في شاشة ولا تتغيّر في الأخرى فيصير
 * المؤشّر نفسه مصدر تقطّع. فالمكوّن واحد، والتسميات من **قاموس الإحماء نفسه**
 * (`warmupStrings.stage*`) — مصدر واحد لا يمكن لطرفيه أن يفترقا.
 */
export type SessionStage = 'warmup' | 'exercises' | 'finish'

const ORDER: readonly SessionStage[] = ['warmup', 'exercises', 'finish'] as const

interface SessionStageRailProps {
  lang: Lang
  /** المرحلة الجارية — تُبرَز، وما قبلها يُعلَّم منتهيًا. */
  stage: SessionStage
  className?: string
}

export function SessionStageRail({ lang, stage, className }: SessionStageRailProps) {
  const w = warmupStrings[lang] ?? warmupStrings.ar
  const labels = [w.stageWarmup, w.stageExercises, w.stageFinish]
  const idx = Math.max(0, ORDER.indexOf(stage))

  return (
    <ol
      data-session-rail={stage}
      aria-label={w.ariaStage(idx + 1, ORDER.length)}
      className={cn('flex items-center gap-1.5 text-[11px] font-black', className)}
    >
      {labels.map((label, i) => (
        <li key={ORDER[i]} className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            data-stage={ORDER[i]}
            aria-current={i === idx ? 'step' : undefined}
            className={cn(
              'min-w-0 flex-1 truncate rounded-full px-2.5 py-1.5 text-center',
              i === idx
                ? 'bg-primary text-white'
                : i < idx
                  ? 'bg-primary-soft text-primary-c'
                  : 'bg-surface text-ink-400',
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  )
}
