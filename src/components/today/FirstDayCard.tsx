import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import { formatNumeralsIn } from '@/lib/numberFormat'
import type { TodayCard } from '@/lib/todayV2Model'

/**
 * اليوم الأول — [R4-UX-FIRSTDAY].
 *
 * ═══ السؤال الذي كانت الشاشة تتركه بلا جواب ═══
 * القادم الجديد كان يفتح الرئيسية فيجد بطاقة إعداد تقول «لنضبط يومك أولًا»،
 * ثم بطاقات فيها ماء وخطوات ونبض أسبوع — **أرقامٌ قبل أن يعرف ما تعنيه**، ولا
 * سطر يقول له ما المطلوب منه اليوم. فيقرأ الشاشة لوحةَ قياس لم يشترك فيها.
 *
 * ═══ ما تجيبه هذه البطاقة، بهذا الترتيب ═══
 *   ① **وش متوقّع منّي اليوم؟** جملة واحدة: بداية صغيرة تكفي (§6: لا ضغط).
 *   ② **وش أسوي أول شي؟** أبواب اليوم من `model.cards` — نفس المصدر الذي
 *      تستعمله بقيّة الشاشة، فلا قائمة ثانية تشيخ على حدة.
 *   ③ **وش تعني الأرقام؟** يُقال **قبل** أن يظهر أول رقم لا بعده: القوس مستهلَك،
 *      والرقم في المنتصف باقٍ، والأهداف تقديرية مبنيّة على بياناته.
 *
 * تختفي عند **أول** إشارة في اليوم (كوب ماء يكفي) — لأنها تشرح البداية، ومن
 * بدأ لا يحتاج شرحها. القرار في `TodayV2` عبر `blankSlate`.
 */
export function FirstDayCard({ lang, cards, onOpenCard, minor = false }: { lang: Lang; cards: readonly TodayCard[]; onOpenCard: (card: TodayCard) => void; minor?: boolean }) {
  const ar = lang !== 'en'
  const d = todayHomeStrings[lang]
  const loc = (text: string) => formatNumeralsIn(text, lang)

  return (
    <section aria-labelledby="today-first-day-title" data-testid="today-first-day" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
      <h2 id="today-first-day-title" className="text-lg font-black leading-tight">{d.firstDayTitle}</h2>
      <p className="mt-1.5 text-base leading-relaxed text-ink-700">{d.firstDayExpect}</p>

      <p className="mt-3 text-sm font-bold text-ink-500">{d.firstDayPickOne}</p>
      <ul className="mt-2 space-y-2">
        {cards.map((card) => (
          <li key={card.label}>
            <button
              type="button"
              onClick={() => onOpenCard(card)}
              className="v2-pressable tap-target flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-line bg-page px-3.5 py-2.5 text-start"
            >
              <Icon name={card.icon} className="h-4 w-4 shrink-0 text-ink-500" />
              <span className="min-w-0 flex-1 text-base font-bold leading-snug">{loc(card.label)}</span>
              <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4 shrink-0 text-[color:var(--c-primary)]" />
            </button>
          </li>
        ))}
      </ul>

      {/* ③ معنى الأرقام — سطر واحد هادئ، لا كتلة تعليمية تُتخطّى بالنظر. */}
      <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-500">{minor ? d.firstDayNumbersMinor : d.firstDayNumbers}</p>
    </section>
  )
}
