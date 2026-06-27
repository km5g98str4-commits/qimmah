import { useRef } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface StartViewProps {
  lang: Lang
  onLogin: () => void
  onGuest: () => void
  onSeeDemo: () => void
  onImportFile: (file: File) => void
}

const HIGHLIGHTS = [
  { icon: 'Dumbbell', label: 'تقسيمة تمرين وأوزان' },
  { icon: 'Salad', label: 'سعرات وبروتين' },
  { icon: 'Ruler', label: 'قياسات وتقدّم' },
]

/** شاشة البداية العامة — مدخل المنتج: تسجيل دخول / ضيف / نموذج. */
export function StartView({ lang, onLogin, onGuest, onSeeDemo, onImportFile }: StartViewProps) {
  const t = getStrings(lang)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-900 px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-[0.07]" />

      <div className="relative w-full max-w-md">
        {/* الهوية والوضعية */}
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-8 w-8" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-3xl font-black text-white">{t.brand}</h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-primary-c">{t.start.welcome}</p>
          <p className="mt-4 text-base font-bold leading-relaxed text-white/90">{t.start.intro}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{t.start.positioning}</p>
        </div>

        {/* مزايا سريعة */}
        <div className="mt-7 grid grid-cols-3 gap-2.5">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.label}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
            >
              <Icon name={h.icon} className="mx-auto h-5 w-5 text-primary-c" />
              <p className="mt-2 text-[11px] font-bold leading-tight text-white/80">{h.label}</p>
            </div>
          ))}
        </div>

        {/* الأزرار */}
        <div className="mt-8 space-y-3">
          <button type="button" onClick={onLogin} className="btn-primary w-full py-4 text-base">
            <Icon name="LogIn" className="h-5 w-5" />
            {t.start.login}
          </button>
          <button
            type="button"
            onClick={onGuest}
            className="btn w-full border border-white/15 bg-white/10 py-4 text-base text-white hover:bg-white/15"
          >
            <Icon name="Smartphone" className="h-5 w-5" />
            {t.start.guest}
          </button>
          <button
            type="button"
            onClick={onSeeDemo}
            className="inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-white/70 transition-colors hover:text-white"
          >
            <Icon name="Sparkles" className="h-4 w-4" />
            {t.start.seeDemo}
          </button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/45">
          <Icon name="ShieldCheck" className="h-3.5 w-3.5" />
          {t.start.note}
        </p>

        {/* استيراد نسخة سابقة — ثانوي */}
        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/50 transition-colors hover:text-white"
          >
            <Icon name="Download" className="h-3.5 w-3.5" />
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
      </div>
    </div>
  )
}
