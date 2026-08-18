/**
 * ⛔ CANONICAL-SURFACE-LOCK — هذا الملف **غير موجَّه** ولا يُشحن للمستخدم.
 *
 * المُستهلَك فعلًا هو المكوّن `src/components/plan/PlanPreview.tsx`.
 * هذا الغلاف خارج رسم الوحدات — مثبتًا من البناء (`npm run test:canonical-surface`).
 * لا تُصلح عطلًا هنا ولا تعتبره سلوك الإنتاج.
 */
import { EmptyState } from '@/components/EmptyState'
import { Skeleton, SkeletonCard } from '@/components/Skeleton'
import { StandaloneAppScreen } from '@/components/StandaloneAppScreen'
import { PlanPreview } from '@/components/plan/PlanPreview'
import { PlanWhyPanel } from '@/components/plan/PlanWhyPanel'
import { ePlanStrings } from '@/i18n/dict/ePlan'
import type { Lang } from '@/lib/appPreferences'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { PlanRationale } from '@/lib/planRationale'
import type { GoalType } from '@/types/profile'

export type PlanPreviewViewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | {
      status: 'filled'
      plan: GeneratedPlan
      goalType: GoalType
      rationale: PlanRationale
      notes?: readonly string[]
    }

interface PlanPreviewViewProps {
  lang: Lang
  state: PlanPreviewViewState
  onBack: () => void
  onRetry: () => void
  onEdit: () => void
  onSave: () => void
}

/**
 * الشاشة المضيفة لمعاينة الخطة قبل إنشاء الحساب.
 *
 * الشاشة عرضية فقط: لا تقرأ التخزين أو الحساب، ولا تولّد الخطة. نقطة التكامل
 * تمرّر الحالة والمخرجات الجاهزة، ثم تربط `onSave` بمسار إنشاء الحساب وحفظ
 * بيانات الضيف. بهذا يبقى قرار الملكية خارج حارة E ولا يصبح الزر وعدًا زائفًا.
 */
export function PlanPreviewView({
  lang,
  state,
  onBack,
  onRetry,
  onEdit,
  onSave,
}: PlanPreviewViewProps) {
  const d = ePlanStrings[lang]

  return (
    <StandaloneAppScreen lang={lang} title={d.screenTitle} backLabel={d.back} onBack={onBack}>
      {state.status === 'loading' && (
        <section aria-busy="true" aria-live="polite" className="space-y-4" data-testid="plan-preview-loading">
          <span className="sr-only">{d.loadingTitle}</span>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </div>
          <SkeletonCard />
          <p className="text-center text-sm text-ink-500">{d.loadingBody}</p>
        </section>
      )}

      {state.status === 'empty' && (
        <EmptyState
          icon="ClipboardList"
          title={d.emptyTitle}
          body={d.emptyBody}
          actionLabel={d.editAnswers}
          onAction={onEdit}
        />
      )}

      {state.status === 'error' && (
        <section
          role="alert"
          className="rounded-2xl border border-danger/30 bg-surface p-5"
          data-testid="plan-preview-error"
        >
          <h2 className="text-lg font-black text-ink-900">{d.errorTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{d.errorBody}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onRetry} className="btn-primary v2-pressable min-h-11 flex-1">
              {d.retry}
            </button>
            <button type="button" onClick={onEdit} className="btn-ghost v2-pressable min-h-11 flex-1">
              {d.editAnswers}
            </button>
          </div>
        </section>
      )}

      {state.status === 'filled' && (
        <div className="space-y-4" data-testid="plan-preview-filled">
          <PlanPreview
            lang={lang}
            plan={state.plan}
            goalType={state.goalType}
            notes={state.notes}
          />

          <details className="group rounded-2xl border border-line bg-surface">
            <summary className="v2-pressable min-h-11 cursor-pointer list-none px-5 py-4 text-sm font-black text-ink-900">
              {d.whySummary}
            </summary>
            <div className="border-t border-line py-4">
              <PlanWhyPanel lang={lang} rationale={state.rationale} />
            </div>
          </details>

          <section aria-label={d.savePlan} className="rounded-2xl border border-line bg-surface p-5 text-center">
            <button type="button" onClick={onSave} className="btn-primary v2-pressable min-h-11 w-full">
              {d.savePlan}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">{d.saveHint}</p>
            <button type="button" onClick={onEdit} className="v2-pressable mt-3 min-h-11 px-4 text-sm font-bold text-primary-c">
              {d.editAnswers}
            </button>
          </section>
        </div>
      )}
    </StandaloneAppScreen>
  )
}
