import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { useAuth } from '@/lib/authContext'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { exportHistory, importHistory, type HistorySnapshot } from '@/lib/historyStore'
import { loadPreferences, savePreferences, type AppPreferences } from '@/lib/appPreferences'
import { fullSync, getSyncStatus, markPendingSync, syncLocalToCloud } from '@/lib/syncService'

const EXPORT_VERSION = 2

interface QimmahExport {
  version: number
  exportedAt: string
  customization: Customization
  history: HistorySnapshot
  preferences: AppPreferences
}

/** بطاقة صدق التخزين + حساب سحابي + تصدير/استيراد النسخة الكاملة. */
export function StorageCard() {
  const { customization, applyCustomization } = useCustomization()
  const auth = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const configured = isSupabaseConfigured()

  // — صدق التخزين: ثلاث حالات —
  const storageCopy = !configured
    ? {
        title: 'بياناتك محفوظة على هذا الجهاز فقط.',
        body: 'المزامنة السحابية غير مفعّلة في هذه النسخة.',
      }
    : auth.user
      ? {
          title: 'بياناتك محفوظة على هذا الجهاز وعلى حسابك السحابي.',
          body: 'يمكنك فتح قِمّة من أي جهاز بعد تسجيل الدخول.',
        }
      : {
          title: 'أنت تستخدم قِمّة بدون حساب. بياناتك محفوظة على هذا الجهاز فقط.',
          body: 'سجّل الدخول لحفظ بياناتك على السحابة والوصول إليها من أي جهاز.',
        }

  // — تصدير/استيراد —
  const onExport = () => {
    const payload: QimmahExport = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      customization,
      history: exportHistory(),
      preferences: loadPreferences(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qimmah-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<QimmahExport> & Partial<Customization>
        if (!window.confirm('سيستبدل الاستيراد خطّتك وسجلّك الحالي بمحتوى الملف. هل تريد المتابعة؟')) return

        const base = getDefaultCustomization()
        // يدعم الصيغة الجديدة (v2) والقديمة (customization مباشرة).
        const cust = (parsed.customization ?? (parsed as Partial<Customization>)) as Partial<Customization>
        applyCustomization({
          ...base,
          ...cust,
          profile: { ...base.profile, ...(cust.profile ?? {}) },
          targets: { ...base.targets, ...(cust.targets ?? {}) },
        })

        if (parsed.history) importHistory(parsed.history)
        if (parsed.preferences) savePreferences({ ...loadPreferences(), ...parsed.preferences })

        markPendingSync()
        window.alert('تم استيراد نسختك بنجاح.')
      } catch {
        window.alert('تعذّرت قراءة الملف. تأكّد أنّه نسخة قِمّة صحيحة.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <section id="storage" className="section">
      <div className="container-page space-y-4">
        {/* صدق التخزين + تصدير/استيراد */}
        <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="ShieldCheck" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-900">{storageCopy.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{storageCopy.body}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onExport} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="TrendingDown" className="h-4 w-4" />
              تصدير نسختي
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="TrendingUp" className="h-4 w-4" />
              استيراد نسخة
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* بطاقة الحساب السحابي — تظهر فقط عند ضبط Supabase */}
        {configured && <AccountCard />}
      </div>
    </section>
  )
}

/** بطاقة الحساب السحابي (تسجيل دخول/إنشاء حساب/خروج + مزامنة). */
function AccountCard() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const status = getSyncStatus(Boolean(auth.user))

  const onSignIn = async () => {
    setBusy(true)
    setMsg(null)
    const r = await auth.signIn(email, password)
    setBusy(false)
    if (!r.ok) setMsg(r.error ?? 'تعذّر تسجيل الدخول.')
    else {
      setMsg(null)
      setPassword('')
      setSyncMsg('جارٍ المزامنة…')
      const s = await fullSync()
      setSyncMsg(s.message)
    }
  }

  const onSignUp = async () => {
    setBusy(true)
    setMsg(null)
    const r = await auth.signUp(email, password)
    setBusy(false)
    if (!r.ok) setMsg(r.error ?? 'تعذّر إنشاء الحساب.')
    else if (r.needsConfirmation) setMsg('أنشئنا حسابك. تحقّق من بريدك لتأكيد الحساب ثم سجّل الدخول.')
    else {
      setMsg(null)
      setPassword('')
      setSyncMsg('جارٍ رفع بياناتك…')
      const s = await syncLocalToCloud()
      setSyncMsg(s.message)
    }
  }

  const onSignOut = async () => {
    await auth.signOut()
    setSyncMsg(null)
    setMsg(null)
  }

  const onSyncNow = async () => {
    setBusy(true)
    setSyncMsg('جارٍ المزامنة…')
    const s = await syncLocalToCloud()
    setBusy(false)
    setSyncMsg(s.message)
  }

  const input =
    'w-full rounded-lg border border-line bg-beige px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none'

  if (auth.loading) {
    return <div className="card p-6 text-sm text-ink-500">جارٍ التحقّق من الحساب…</div>
  }

  // — مسجّل الدخول —
  if (auth.user) {
    return (
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="CheckCircle2" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-900">{auth.user.email}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{syncMsg ?? status.message}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onSyncNow}
            disabled={busy}
            className="btn-ghost px-3 py-2 text-xs disabled:opacity-50"
          >
            <Icon name="RotateCcw" className="h-4 w-4" />
            مزامنة الآن
          </button>
          <button type="button" onClick={onSignOut} className="btn-ghost px-3 py-2 text-xs">
            <Icon name="X" className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    )
  }

  // — ضيف: نموذج تسجيل دخول/إنشاء حساب —
  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name="ShieldCheck" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink-900">تسجيل الدخول لحفظ بياناتك على السحابة</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
            اختياري — يمكنك الاستمرار كضيف وبياناتك تبقى على هذا الجهاز.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={input}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={input}
          type="password"
          autoComplete="current-password"
          placeholder="كلمة المرور (6 أحرف على الأقل)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {msg && <p className="text-xs leading-relaxed text-gold-600">{msg}</p>}
      {syncMsg && <p className="text-xs leading-relaxed text-primary-c">{syncMsg}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSignIn}
          disabled={busy || !email || !password}
          className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={onSignUp}
          disabled={busy || !email || !password}
          className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-50"
        >
          إنشاء حساب جديد
        </button>
      </div>
    </div>
  )
}
