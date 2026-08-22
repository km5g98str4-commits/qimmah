// ═══════════════════════════════════════════════════════════════════════════
//  لوحة الجواب — [SOVEREIGN-COACH-002].
//
//  ═══ الفصل بصريّ لأنه بنيويّ أصلًا ═══
//  `COACH_LINE_KIND` في المحرّك يعطي كل سطر نوعه (محسوب · اقتراح · ملاحظة).
//  هنا **يُجمَّع بالنوع لا بالترتيب**: كتلة واحدة لكل نوع، بعنوان معلَن من
//  القاموس (`strings.kinds`) وأيقونة ولون. فلا يستطيع اقتراحٌ أن يجاور رقمًا
//  محسوبًا فيُقرآن سواءً — والقارئ يعرف قبل أن يقرأ السطر أهو رقم خرج من
//  بياناته أم رأي المرشد فيها.
//
//  ═══ المصدر تحت السطر لا في تذييل الصفحة ═══
//  كل سطر يحمل أسماء مصادره، **وأسماء ما أقرّ بجهله**. الجهل المُعلَن جزء من
//  الجواب: «ما سجّلت تعافيك اليوم» يظهر ومعه مصدره كي يعرف المستخدم أين يسجّل.
//
//  المكوّن **لا يحسب شيئًا**: يأخذ `RenderedAnswer` جاهزًا من `renderCoachAnswer`
//  (وهو وحده من يستدعي حارس الإسناد) ويرسمه. لا نصّ صلب فيه ولا رقم.
// ═══════════════════════════════════════════════════════════════════════════

import { Icon } from '@/components/Icon'
import type { CoachLineKind, CoachStrings, RenderedAnswer, RenderedLine } from '@/lib/coach'

/** ترتيب الكتل: المحسوب أولًا، ثم الاقتراح، ثم الملاحظة. */
const KIND_ORDER: readonly CoachLineKind[] = ['fact', 'suggestion', 'note']

const KIND_STYLE: Readonly<Record<CoachLineKind, { icon: string; color: string; border: string }>> = {
  fact: { icon: 'Calculator', color: 'var(--v2-blue-text)', border: 'var(--v2-blue-text)' },
  suggestion: { icon: 'Lightbulb', color: 'var(--v2-ember-text)', border: 'var(--v2-ember-text)' },
  note: { icon: 'Info', color: 'var(--v2-ink-muted)', border: 'var(--v2-border)' },
}

interface CoachAnswerPanelProps {
  strings: CoachStrings
  answer: RenderedAnswer
  /** فتح صفحة تمرين حقيقي — المعرّف نفسه مُسنَد في المحرّك. */
  onOpenExercise: (exerciseId: string) => void
}

function SourceChips({ strings, line }: { strings: CoachStrings; line: RenderedLine }) {
  if (line.sources.length === 0 && line.unknownSources.length === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {line.sources.map((id) => (
        <li
          key={`s-${id}`}
          className="rounded-full border border-line bg-beige px-2.5 py-1 text-[11px] font-bold leading-tight text-ink-500"
        >
          {strings.sourceLabel}: {strings.sources[id]}
        </li>
      ))}
      {line.unknownSources.map((id) => (
        <li
          key={`u-${id}`}
          className="rounded-full border border-dashed px-2.5 py-1 text-[11px] font-bold leading-tight"
          style={{ borderColor: 'var(--v2-amber)', color: 'var(--v2-amber)' }}
        >
          {strings.unknownLabel}: {strings.sources[id]}
        </li>
      ))}
    </ul>
  )
}

export function CoachAnswerPanel({ strings, answer, onOpenExercise }: CoachAnswerPanelProps) {
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    lines: answer.lines.filter((l) => l.kind === kind),
  })).filter((g) => g.lines.length > 0)

  return (
    <div className="space-y-4">
      {groups.map(({ kind, lines }) => {
        const style = KIND_STYLE[kind]
        return (
          <section key={kind} aria-labelledby={`coach-kind-${kind}`} className="space-y-2">
            <h3
              id={`coach-kind-${kind}`}
              className="flex items-center gap-1.5 text-xs font-black"
              style={{ color: style.color }}
            >
              <Icon name={style.icon} className="h-4 w-4" />
              {strings.kinds[kind]}
            </h3>
            <ul className="space-y-2">
              {lines.map((line, i) => {
                // ثابت محلّي لا `line.exerciseId!`: التضييق يبقى داخل المُغلَق،
                // ولا تُكتب علامة تعجّب تُخفي احتمالًا حقيقيًا.
                const exerciseId = line.exerciseId
                return (
                <li
                  key={`${line.key}-${i}`}
                  className="rounded-2xl border border-line bg-surface p-3.5 shadow-card"
                  style={{ borderInlineStartWidth: '3px', borderInlineStartColor: style.border }}
                >
                  <p className="text-base leading-relaxed text-ink-900">{line.text}</p>
                  <SourceChips strings={strings} line={line} />
                  {exerciseId && (
                    <button
                      type="button"
                      onClick={() => onOpenExercise(exerciseId)}
                      className="v2-pressable mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold underline underline-offset-4"
                      style={{ color: 'var(--v2-blue-text)' }}
                    >
                      <Icon name="Dumbbell" className="h-4 w-4" />
                      {strings.openExercise}
                    </button>
                  )}
                </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
