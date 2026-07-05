import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'

interface VerifyEmailViewProps {
  lang: Lang
  /** يُستدعى بعد تسجيل الخروج (رجوع لشاشة الحساب). */
  onSignedOut: () => void
}

/**
 * بوّابة تأكيد البريد (P0 — دفاع عميق): تُعرَض بدل التطبيق عندما يكون هناك حساب مسجّل ببريد
 * لم يُؤكَّد بعد (emailVerified=false). لا وصول كامل قبل التأكيد — إعادة إرسال + متابعة + خروج.
 * (تفعيل «Confirm email» على الخادم من لوحة Supabase قرار زياد؛ هذا الحارس يعمل فور تفعيله.)
 */
export function VerifyEmailView({ lang, onSignedOut }: VerifyEmailViewProps) {
  const auth = useAuth()
  const en = lang === 'en'
  const email = auth.user?.email ?? ''
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const resend = async () => {
    if (!email) return
    setBusy(true)
    setNote(null)
    const r = await auth.resendConfirmation(email)
    setBusy(false)
    setNote(r.ok ? (en ? 'Sent — check your inbox.' : 'أرسلناه — تحقّق من بريدك.') : r.error ?? null)
  }

  const recheck = async () => {
    setBusy(true)
    await auth.refreshUser()
    setBusy(false)
    if (!auth.emailVerified) setNote(en ? 'Not confirmed yet — open the link first.' : 'ما تأكّد بعد — افتح الرابط أولًا.')
  }

  const signOut = async () => {
    await auth.signOut()
    onSignedOut()
  }

  return (
    <div dir={en ? 'ltr' : 'rtl'} className="flex min-h-screen flex-col items-center justify-center bg-page px-6 py-12 text-center">
      <div className="mx-auto w-full max-w-md">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary-c">
          <Icon name="Mail" className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-black text-ink-900">{en ? 'Confirm your email' : 'أكّد بريدك الإلكتروني'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          {en ? 'We sent a confirmation link to' : 'أرسلنا رابط تأكيد إلى'} <span className="font-bold text-ink-900">{email}</span>.{' '}
          {en ? 'Open it, then continue.' : 'افتحه ثم تابع.'}
        </p>
        {note && <p className="mt-4 text-xs font-medium text-primary-c">{note}</p>}
        <div className="mt-8 flex flex-col gap-3">
          <button type="button" onClick={recheck} disabled={busy} className="btn-primary w-full justify-center py-3 disabled:opacity-50">
            {en ? "I've confirmed — continue" : 'تأكّدت — تابع'}
          </button>
          <button type="button" onClick={resend} disabled={busy || !email} className="btn-ghost w-full justify-center py-3 disabled:opacity-50">
            {en ? 'Resend link' : 'إعادة إرسال الرابط'}
          </button>
          <button type="button" onClick={signOut} className="mt-1 text-xs font-bold text-ink-400 hover:text-ink-900">
            {en ? 'Sign out' : 'تسجيل الخروج'}
          </button>
        </div>
      </div>
    </div>
  )
}
