import { useRef } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface StartViewProps {
  lang: Lang
  hasStartedSetup: boolean
  onStartSetup: () => void
  onSeeDemo: () => void
  onImportFile: (file: File) => void
  onChangeLang: (lang: Lang) => void
}

/** شاشة البداية — أول ما يفتح المستخدم التطبيق (إعداد غير مكتمل). */
export function StartView({
  lang,
  hasStartedSetup,
  onStartSetup,
  onSeeDemo,
  onImportFile,
  onChangeLang,
}: StartViewProps) {
  const t = getStrings(lang)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-60" />

      <div className="relative w-full max-w-md">
        {/* اللغة */}
        <div className="mb-8 flex justify-center gap-2">
          {(['ar', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onChangeLang(l)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-bold transition-colors',
                lang === l
                  ? 'border-primary-soft bg-primary text-white'
                  : 'border-line bg-surface text-ink-700 hover:bg-beige',
              )}
            >
              {l === 'ar' ? t.lang.ar : t.lang.en}
            </button>
          ))}
        </div>

        {/* الهوية */}
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-8 w-8" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-3xl font-black text-ink-900">{t.brand}</h1>
          <p className="mt-1 text-sm font-bold text-primary-c">{t.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">{t.start.intro}</p>
        </div>

        {/* الأزرار */}
        <div className="mt-9 space-y-3">
          <button type="button" onClick={onStartSetup} className="btn-primary w-full py-4 text-base">
            <Icon name="Sparkles" className="h-5 w-5" />
            {hasStartedSetup ? t.start.continueSetup : t.start.startSetup}
          </button>
          <button type="button" onClick={onSeeDemo} className="btn-ghost w-full py-4 text-base">
            <Icon name="Globe" className="h-5 w-5" />
            {t.start.seeDemo}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-ghost w-full py-4 text-base"
          >
            <Icon name="TrendingUp" className="h-5 w-5" />
            {t.start.importPrevious}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ''
            }}
          />
        </div>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <Icon name="ShieldCheck" className="h-3.5 w-3.5" />
          {t.start.note}
        </p>
      </div>
    </div>
  )
}
