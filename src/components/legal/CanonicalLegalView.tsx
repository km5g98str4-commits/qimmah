import { Icon } from '@/components/Icon'
import { StandaloneAppScreen } from '@/components/StandaloneAppScreen'
import type { Lang } from '@/lib/appPreferences'
import { getLegalDocument, legalLaunchConfig, legalUiCopy, type LegalDocumentKind } from '@/legal/canonicalLegalContent'

export function CanonicalLegalView({ kind, lang, onBack }: { kind: LegalDocumentKind; lang: Lang; onBack: () => void }) {
  const document = getLegalDocument(kind, lang)
  const ui = legalUiCopy[lang]
  return (
    <StandaloneAppScreen lang={lang} title={document.title} backLabel={ui.back} onBack={onBack}>
      <article data-testid={`legal-${kind}`}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name={kind === 'privacy' ? 'Lock' : 'FileText'} className="h-5 w-5" />
          </span>
        </div>
        {!legalLaunchConfig.ready && (
          <section role="alert" className="mt-5 rounded-2xl border border-danger/40 bg-danger/10 p-4" data-testid="legal-launch-blocked">
            <h2 className="text-sm font-black text-ink-900">{ui.blockedTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-700">{ui.blockedBody}</p>
            <code dir="ltr" className="mt-2 block overflow-x-auto text-[0.68rem] text-danger">{legalLaunchConfig.unresolved.join(', ')}</code>
          </section>
        )}
        <p className="mt-5 text-xs leading-relaxed text-ink-500">{document.summary}</p>
        {legalLaunchConfig.legalReviewId && <p className="mt-1 text-[0.68rem] text-ink-400">{ui.review}: {legalLaunchConfig.legalReviewId}</p>}
        <div className="mt-6 space-y-6">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-black text-ink-900">{section.heading}</h2>
              <div className="mt-2 space-y-3">
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-loose text-ink-700">{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </article>
    </StandaloneAppScreen>
  )
}
