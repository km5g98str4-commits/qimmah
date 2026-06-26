import { useState } from 'react'
import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { faqItems } from '@/data/faq'
import { sectionCopy } from '@/config/content'

/** قسم الأسئلة الشائعة — أكورديون بسيط قابل للطي. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="section">
      <div className="container-page">
        <div className="flex justify-center">
          <SectionHeading {...sectionCopy.faq} align="center" />
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {faqItems.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.question} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-start"
                >
                  <span className="text-sm font-bold text-white sm:text-base">{item.question}</span>
                  <span
                    className={[
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-brand-300 transition-colors',
                      isOpen ? 'bg-brand-500/15' : 'bg-white/[0.03]',
                    ].join(' ')}
                  >
                    <Icon name={isOpen ? 'Minus' : 'Plus'} className="h-4 w-4" />
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{item.answer}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
