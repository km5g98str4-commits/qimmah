import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'
import { resetQimmah } from '@/lib/resetQimmah'
import { cn } from '@/lib/cn'

interface DeleteAccountDialogProps {
  lang: Lang
  onClose: () => void
  /** «تواصل معنا» في حالة الفشل — يفتح صفحة التواصل. */
  onContact: () => void
}

type Phase = 'confirm' | 'working' | 'failed' | 'done'

/**
 * حذف الحساب داخل التطبيق — [CTO-65] البند ١ · متطلَّب App Store 5.1.1(v).
 *
 * **توصيل لا بناء:** `auth.deleteAccount()` كانت منفَّذة في `authContext` وتُستدعى من صفر
 * شاشة، والنصوص الاثنا عشر جاهزة في `strings.ts:550-562` منذ البداية. الناقص كان الواجهة.
 *
 * ⚠️ **عقد `e2e-auth` يفرض هذه المعرّفات حرفيًا** (`scripts/e2e-auth/run.mjs:303-315`) —
 * لا تُعَد صياغتها ولا تُضَف نصوص داخل الأزرار (الاسم المتاح يجب أن يطابق `exact`):
 *   • زرّ الفتح  : اسم متاح **«حذف الحساب»** بالضبط  ⇒ الوصف خارج الزرّ لا داخله
 *   • حقل التأكيد: `id="delete-confirm"`
 *   • زرّ التنفيذ: اسم يطابق `/حذف حسابي نهائيًا/`
 *   • زرّ الإلغاء: اسم متاح **«إلغاء»** بالضبط، ويُخفي `#delete-confirm`
 *
 * **عقد الصدق (§5 · ٢-٣ من دستور الجودة):** المسح المحلي وإعادة التحميل لا يقعان إلا بعد
 * `ok === true`. عند `ok === false` يبقى المستخدم مسجَّلًا وبياناته كاملة — لأن
 * `deleteAccount` نفسها لا تحذف صفًّا واحدًا ولا تُنهي الجلسة إن فشل حذف مستخدم المصادقة،
 * فادّعاء النجاح هنا كان سيكذب على المستخدم ويترك حسابه قائمًا وهو يظنّه محذوفًا.
 */
export function DeleteAccountDialog({ lang, onClose, onContact }: DeleteAccountDialogProps) {
  const t = getStrings(lang).auth
  const auth = useAuth()
  const ar = lang !== 'en'
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState<Phase>('confirm')
  const [failReason, setFailReason] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  // التأكيد المكتوب: مطابقة بلا حساسية لحالة الأحرف ولا مسافات طرفية — المقصود هو القصد
  // لا الإملاء الحرفي. الكلمة من القاموس («حذف» / «DELETE») فتتبع اللغة.
  const matches = typed.trim().toLocaleLowerCase() === t.deleteConfirmWord.toLocaleLowerCase()
  const busy = phase === 'working' || phase === 'done'
  const canConfirm = matches && phase === 'confirm'

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Esc يغلق — إلا أثناء التنفيذ، فالعملية لا تُقطع في منتصفها.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const run = async () => {
    if (!canConfirm) return
    setPhase('working')
    setFailReason(undefined)
    const result = await auth.deleteAccount()
    if (!result.ok) {
      // فشل صادق: لا مسح محلي، لا خروج، لا إعادة تحميل، لا ادّعاء نجاح.
      setFailReason(result.error)
      setPhase('failed')
      return
    }
    // نجاح مؤكَّد فقط: نظّف الجهاز ثم أعد التحميل نظيفًا إلى شاشة الحساب.
    setPhase('done')
    await resetQimmah()
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-body"
        className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-card sm:rounded-3xl"
        style={{ paddingBottom: 'max(1.25rem, var(--safe-bottom))' }}
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-danger/10 text-danger">
          <Icon name="Trash2" className="h-5 w-5" strokeWidth={2.5} />
        </span>

        {phase === 'failed' ? (
          <>
            <h2 id="delete-account-title" className="mt-4 text-lg font-black text-ink-900">
              {t.deleteConfirmTitle}
            </h2>
            {/* الفشل يُعلَن ولا يُبتلع: النصّ يقول إن العملية لم تكتمل، والبيانات باقية. */}
            <p id="delete-account-body" role="alert" className="mt-2 text-sm leading-relaxed text-ink-900">
              {t.deleteFailed}{' '}
              <button
                type="button"
                onClick={onContact}
                className="font-bold text-danger underline underline-offset-2"
              >
                {t.deleteContactCta}
              </button>
            </p>
            {failReason && (
              <p className="mt-2 break-words text-xs leading-relaxed text-ink-500">{failReason}</p>
            )}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => {
                  setPhase('confirm')
                  setTyped('')
                }}
                className="btn w-full justify-center bg-danger py-3 text-white sm:flex-1"
              >
                {t.deleteRetry}
              </button>
              <button type="button" onClick={onClose} className="btn-ghost w-full justify-center py-3 sm:flex-1">
                {t.cancel}
              </button>
            </div>
          </>
        ) : phase === 'done' ? (
          <>
            <h2 id="delete-account-title" className="mt-4 text-lg font-black text-ink-900">
              {t.deleting}
            </h2>
            <p id="delete-account-body" className="mt-2 text-sm leading-relaxed text-ink-500">
              {t.deleteAccountDesc}
            </p>
          </>
        ) : (
          <>
            <h2 id="delete-account-title" className="mt-4 text-lg font-black text-ink-900">
              {t.deleteConfirmTitle}
            </h2>
            <p id="delete-account-body" className="mt-2 text-sm leading-relaxed text-ink-700">
              {t.deleteConfirmBody}
            </p>

            <label htmlFor="delete-confirm" className="mt-4 block text-sm font-bold text-ink-900">
              {t.deleteConfirmHint}
            </label>
            <input
              ref={inputRef}
              id="delete-confirm"
              type="text"
              value={typed}
              disabled={busy}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 min-h-[44px] w-full rounded-xl border border-line bg-beige px-4 py-3 text-base text-ink-900 focus:border-danger focus:outline-none"
            />

            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              {/* aria-disabled لا disabled: النقر بلا كلمة تأكيد لا يفعل شيئًا صامتًا،
                  والزرّ يبقى مقروءًا للقارئ الشاشي. الخفوت في الخلفية لا في النصّ. */}
              <button
                type="button"
                onClick={run}
                aria-disabled={!canConfirm}
                className={cn(
                  'btn w-full justify-center py-3 text-white sm:flex-1',
                  canConfirm ? 'bg-danger' : 'bg-danger/40',
                )}
              >
                {phase === 'working' ? t.deleting : t.deleteConfirmCta}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="btn-ghost w-full justify-center py-3 sm:flex-1"
              >
                {t.cancel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
