import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { medicationName, supplementName } from '@/lib/wellnessPlan'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

/** قسم «المكملات والأدوية» في الرئيسية — مع تنويه طبي وحالة فارغة. */
export function WellnessSection({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const wp = customization.wellnessPlan
  const t = getStrings(lang).wellness

  const hasItems = wp.supplements.length > 0 || wp.medications.length > 0
  if (!wp.enabled || !hasItems) {
    return (
      <section id="wellness" className="section">
        <div className="container-page">
          <SectionHeading eyebrow={t.title} icon="Pill" title={t.title} description={t.desc} />
          <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
            <p className="text-sm text-ink-500">{t.empty}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="wellness" className="section">
      <div className="container-page">
        <SectionHeading eyebrow={t.title} icon="Pill" title={t.title} description={t.desc} />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* المكملات */}
          <div className="card overflow-hidden">
            <div className="border-b border-line p-5">
              <p className="text-sm font-bold text-ink-900">{t.supplementsTab}</p>
            </div>
            {wp.supplements.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-400">—</p>
            ) : (
              <ul className="divide-y divide-line">
                {wp.supplements.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">{supplementName(s, lang)}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {[s.amount, s.timing, s.frequency].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <Icon name="Pill" className="h-4 w-4 shrink-0 text-primary-c" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* الأدوية */}
          <div className="card overflow-hidden">
            <div className="border-b border-line p-5">
              <p className="text-sm font-bold text-ink-900">{t.medicationsTab}</p>
            </div>
            {wp.medications.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-400">—</p>
            ) : (
              <ul className="divide-y divide-line">
                {wp.medications.map((m) => (
                  <li key={m.id} className="p-4">
                    <p className="text-sm font-bold text-ink-900">{medicationName(m, lang)}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {[m.dose, m.timing, m.frequency].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {m.doctorNote && <p className="mt-0.5 text-[11px] text-ink-400">{t.doctorNote}: {m.doctorNote}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* تنويه طبي */}
        <p className="mt-6 flex items-start gap-2 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4 text-xs leading-relaxed text-ink-700">
          <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
          {t.medSafety}
        </p>
      </div>
    </section>
  )
}
