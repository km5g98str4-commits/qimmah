// Development-only visual proof harness (Q20). Renders the REAL ExerciseMedia
// component inside the same container the app uses (WorkoutV2 DetailScreen:
// aspect-video, rounded, bordered — exercise name BELOW the frame), so the
// screenshots show production markup rather than a mock.
// Never referenced by the production build.
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from '@/i18n'
import { StaticCustomizationProvider } from '@/lib/customizationContext'
import { getDefaultCustomization } from '@/lib/customization'
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { getExercise } from '@/data/exercises'
import type { Lang } from '@/lib/appPreferences'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const params = new URLSearchParams(location.search)
const lang = (params.get('lang') ?? 'ar') as Lang
const ar = lang !== 'en'

document.documentElement.dataset.design = 'v2'
document.documentElement.lang = ar ? 'ar' : 'en'
document.documentElement.dir = ar ? 'rtl' : 'ltr'

/** الحالات الثلاث التي يجب أن تُوثَّق — تمرين مختلف لكل حالة. */
const CASES: { id: string; caption: string; captionEn: string }[] = [
  { id: 'leg-press-machine', caption: 'تسلسل: بداية ← نهاية', captionEn: 'Sequence: start → end' },
  { id: 'shoulder-press-machine', caption: 'رسم جهاز داخلي', captionEn: 'In-house machine diagram' },
  { id: 'chest-press-machine', caption: 'الحالة الصادقة', captionEn: 'Honest pending state' },
]

export function Card({ id, caption }: { id: string; caption: string }) {
  const ex = getExercise(id)
  const name = ex ? (ar ? ex.nameAr : ex.nameEn) : id
  return (
    <section className="mb-6">
      <p className="v2-text-blue mb-1.5 text-[11px] font-black uppercase tracking-wider">{caption}</p>
      {/* نفس الغلاف المستعمل في WorkoutV2 DetailScreen */}
      <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-surface">
        <ExerciseMedia exerciseId={id} lang={lang} heightClass="h-full" hideChips />
      </div>
      {/* الاسم أسفل الإطار — لا يتداخل مع الرسم إطلاقًا */}
      <h2 className="mt-3 text-xl font-black text-ink-900">{name}</h2>
      <p className="mt-0.5 text-xs font-bold text-ink-500">
        <code>{id}</code>
      </p>
    </section>
  )
}

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <StaticCustomizationProvider value={getDefaultCustomization()}>
      <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-screen bg-page px-5 py-6 text-ink-900">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-5 text-2xl font-black">{ar ? 'حالات وسائط التمرين' : 'Exercise media states'}</h1>
          {CASES.map((c) => (
            <Card key={c.id} id={c.id} caption={ar ? c.caption : c.captionEn} />
          ))}
        </div>
      </div>
    </StaticCustomizationProvider>
  </LanguageProvider>,
)
