import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { ScreenHeader } from '@/components/ScreenHeader'
import { cn } from '@/lib/cn'
import type { Lang, ThemePref, ThemeSchedule } from '@/lib/appPreferences'
import { getTheme, setTheme, getThemeSchedule, enableSunsetSchedule, disableSunsetSchedule } from '@/lib/appPreferences'
import { requestGeolocation } from '@/lib/geolocation'
import { SCHEDULE_CITIES } from '@/data/scheduleCities'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { buildProfileV2Model, COMMITMENT_WEEKS, type CommitmentWeek, type ProfileV2Model } from '@/lib/profileV2Model'
import { NotificationsSettingsV2 } from './NotificationsSettingsV2'
import { NativeSettingsPanel } from '@/components/NativeSettingsPanel'
import { NATIVE_SETTINGS_COPY } from '@/data/nativeSettings'
import { V2_ROUTINE_TRACKER } from '@/design-system/v2/labels'
import { medicationName, supplementName } from '@/lib/wellnessPlan'
import { useWellnessToday } from '@/lib/wellnessTracking'
import {
  buildExportBundle,
  deliverBundle,
  parseImportFile,
  applyImport,
  hasUndo,
  undoImport,
  readFileText,
  PortabilityError,
  portabilityErrorText,
  type ImportPreview,
} from '@/lib/portability'

interface ProfileV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

type Screen = 'home' | 'privacy' | 'settings' | 'notifications' | 'data' | 'routine'

/**
 * Profile v2 — «ملفك التدريبي» — Qimmah v2.1 (§06). ProfileView
 * branches here under isDesignV2). An earned training identity, not a settings
 * drawer: real stats, a program card, and a commitment heatmap wired to the
 * actual stores. Qimmah+ is ONE quiet line at the base — no filled block, no
 * banner, no modal, no fake scarcity. Destructive + account actions route to the
 * EXISTING safe Settings flow; they are never reimplemented or weakened here.
 */
export function ProfileV2({ lang, onNavigate }: ProfileV2Props) {
  const { customization } = useCustomization()
  const auth = useAuth()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [screen, setScreen] = useState<Screen>('home')
  const wellnessToday = useWellnessToday()
  const model = useMemo(
    () => buildProfileV2Model(customization, { displayName: auth.displayName, email: auth.user?.email ?? null, signedIn: !!auth.user }, lang),
    [customization, auth.displayName, auth.user, lang],
  )

  useEffect(() => {
    // Internal sub-screens replace the profile body in place. Reset retained
    // page scroll so their heading and first action stay inside the viewport.
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }, [screen])

  useEffect(() => {
    const openRoutine = (event: Event) => {
      if ((event as CustomEvent).detail === 'routine') setScreen('routine')
    }
    const pending = window.sessionStorage.getItem('qimmah:quick-log-intent')
    if (pending === 'routine') {
      window.sessionStorage.removeItem('qimmah:quick-log-intent')
      setScreen('routine')
    }
    window.addEventListener('qimmah:quick-log', openRoutine)
    return () => window.removeEventListener('qimmah:quick-log', openRoutine)
  }, [])

  const uid = auth.user?.id ?? null
  if (screen === 'data') return <DataScreen lang={lang} uid={uid} recoveryActive={auth.recoveryActive} onBack={() => setScreen('settings')} />
  if (screen === 'privacy') return <Privacy lang={lang} model={model} onBack={() => setScreen('home')} onDelete={() => onNavigate('settings')} onData={() => setScreen('data')} />
  if (screen === 'notifications') {
    return <NotificationsSettingsV2 lang={lang} onBack={() => setScreen('settings')} />
  }
  if (screen === 'routine') {
    return (
      <RoutineScreen
        lang={lang}
        supplements={customization.wellnessPlan?.supplements ?? []}
        medications={customization.wellnessPlan?.medications ?? []}
        wellnessToday={wellnessToday}
        onBack={() => setScreen('home')}
        onEdit={() => onNavigate('setup')}
      />
    )
  }
  if (screen === 'settings') return <Settings lang={lang} model={model} onBack={() => setScreen('home')} onAccount={() => onNavigate('settings')} onPrivacy={() => setScreen('privacy')} onNotifications={() => setScreen('notifications')} onData={() => setScreen('data')} />

  const numerals = (n: number) => (ar ? n.toLocaleString('ar-EG') : String(n))

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <ScreenHeader icon="User" title={t('حسابي', 'Profile')} />

      <div className="space-y-4">
        {/* بطاقة الهوية — الاسم + شارة الهدف */}
        <section className="card flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-black text-primary-c">{model.user.initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-ink-900">{model.user.displayName}</p>
            {model.trainingIdentity.goalLabel && (
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-c">
                {t('الهدف', 'Goal')} · {model.trainingIdentity.goalLabel}
              </span>
            )}
          </div>
        </section>

        {/* ثلاث بطاقات أرقام — بيانات حقيقية فقط (تمرين · أيام متتالية · أرقام قياسية) */}
        <section className="grid grid-cols-3 gap-3">
          <Stat value={numerals(model.stats.workoutCount)} label={t('تمرين', 'Workouts')} />
          <Stat value={numerals(model.stats.streakDays)} label={t('أيام متتالية', 'Day streak')} />
          <Stat value={numerals(model.stats.prCount)} label={t('أرقام قياسية', 'PRs')} />
        </section>
        {!model.stats.hasData && (
          <p className="px-1 text-center text-[11px] text-ink-400">{t('نحتاج بيانات أكثر — أكمل تمرينك الأول.', 'We need more data — complete your first workout.')}</p>
        )}

        {/* بطاقة البرنامج */}
        <ProgramCard model={model} t={t} numerals={numerals} onOpen={() => onNavigate(model.program.onboarded ? 'workout' : 'setup')} />

        {/* خريطة الالتزام — «الالتزام · آخر ١٠ أسابيع» */}
        <CommitmentHeatmap model={model} lang={lang} t={t} numerals={numerals} />

        {/* روابط */}
        <section className="space-y-3">
          <Row icon="LayoutGrid" label={t('القياسات والصور', 'Measurements & photos')} onClick={() => onNavigate('progress')} />
          <Row icon="Pill" label={t('الأدوية والمكمّلات', 'Supplements & meds')} onClick={() => setScreen('routine')} />
          <Row icon="Settings" label={t('الإعدادات والخصوصية', 'Settings & privacy')} onClick={() => setScreen('settings')} />
        </section>

        {/* Qimmah+ — ONE quiet line at the base. No filled block, no paywall. */}
        {model.subscription.showQuietLine && (
          <p className="px-1 pt-1 text-center text-xs leading-relaxed text-ink-500">
            {model.subscription.text}
            {' — '}
            <button type="button" onClick={() => setScreen('settings')} className="inline-flex min-h-[44px] items-center font-bold text-ink-500 underline decoration-line underline-offset-2 transition-colors hover:text-ink-900">
              {model.subscription.cta}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

function ProgramCard({ model, t, numerals, onOpen }: { model: ProfileV2Model; t: (a: string, e: string) => string; numerals: (n: number) => string; onOpen: () => void }) {
  const { program } = model
  const sub = !program.onboarded
    ? t('أكمل الإعداد لبناء خطتك', 'Finish setup to build your plan')
    : program.daysPerWeek
      ? t(`الأسبوع ${numerals(program.weekOf)} من ${numerals(program.totalWeeks)} · ${numerals(program.daysPerWeek)} أيام/أسبوع`, `Week ${program.weekOf} of ${program.totalWeeks} · ${program.daysPerWeek} days/week`)
      : t(`الأسبوع ${numerals(program.weekOf)} من ${numerals(program.totalWeeks)}`, `Week ${program.weekOf} of ${program.totalWeeks}`)
  return (
    <button type="button" onClick={onOpen} className="card flex w-full items-center gap-3 p-5 text-start transition-colors hover:border-primary-soft">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c"><Icon name="Dumbbell" className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-ink-900">{program.title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{sub}</span>
      </span>
      <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
    </button>
  )
}

function CommitmentHeatmap({ model, lang, t, numerals }: { model: ProfileV2Model; lang: Lang; t: (a: string, e: string) => string; numerals: (n: number) => string }) {
  const ar = lang !== 'en'
  const active = model.commitment.weeks.filter((w) => w.count > 0).length
  const summary = model.commitment.hasData
    ? t(`تمرّنت في ${numerals(active)} من آخر ${numerals(COMMITMENT_WEEKS)} أسابيع`, `Trained in ${active} of the last ${COMMITMENT_WEEKS} weeks`)
    : t('لا تمارين مسجّلة بعد', 'No workouts logged yet')
  return (
    <section className="card p-5">
      <p className="flex items-center justify-between gap-2">
        <span className="text-base font-black text-ink-900">{t('الالتزام', 'Consistency')}</span>
        <span className="text-[11px] font-bold text-ink-400">{t(`آخر ${numerals(COMMITMENT_WEEKS)} أسابيع`, `Last ${COMMITMENT_WEEKS} weeks`)}</span>
      </p>
      <div className="mt-3 flex items-center gap-1.5" role="img" aria-label={summary}>
        {model.commitment.weeks.map((w, i) => (
          <span key={i} aria-hidden="true" className={cn('h-7 flex-1 rounded-md', HEAT[w.level])} />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-400" dir={ar ? 'rtl' : 'ltr'}>{summary}</p>
    </section>
  )
}

function RoutineScreen({
  lang,
  supplements,
  medications,
  wellnessToday,
  onBack,
  onEdit,
}: {
  lang: Lang
  supplements: NonNullable<ReturnType<typeof useCustomization>['customization']['wellnessPlan']>['supplements']
  medications: NonNullable<ReturnType<typeof useCustomization>['customization']['wellnessPlan']>['medications']
  wellnessToday: ReturnType<typeof useWellnessToday>
  onBack: () => void
  onEdit: () => void
}) {
  const ar = lang !== 'en'
  const copy = V2_ROUTINE_TRACKER[ar ? 'ar' : 'en']
  const empty = supplements.length + medications.length === 0
  return (
    <SubScreen title={copy.title} onBack={onBack} lang={lang}>
      {empty ? (
        <section className="card p-6 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="Pill" className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-sm font-black text-ink-900">{copy.emptyTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-400">{copy.emptyBody}</p>
          <button type="button" onClick={onEdit} className="btn-primary mt-4 w-full justify-center py-3">{copy.edit}</button>
        </section>
      ) : (
        <div className="space-y-5">
          {medications.length > 0 && (
            <RoutineGroup
              title={copy.medications}
              items={medications.map((item) => ({
                id: item.id,
                name: medicationName(item, lang),
                detail: item.timing || item.frequency || '',
                done: wellnessToday.isMedicationDone(item.id),
                onToggle: () => wellnessToday.toggleMedication(item.id),
              }))}
              doneLabel={copy.done}
              pendingLabel={copy.pending}
            />
          )}
          {supplements.length > 0 && (
            <RoutineGroup
              title={copy.supplements}
              items={supplements.map((item) => ({
                id: item.id,
                name: supplementName(item, lang),
                detail: item.timing || item.frequency || '',
                done: wellnessToday.isSupplementDone(item.id),
                onToggle: () => wellnessToday.toggleSupplement(item.id),
              }))}
              doneLabel={copy.done}
              pendingLabel={copy.pending}
            />
          )}
          <button type="button" onClick={onEdit} className="btn-ghost w-full justify-center py-3">
            <Icon name="Settings" className="h-4 w-4" />
            {copy.edit}
          </button>
        </div>
      )}
      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-ink-400">
        <Icon name="ShieldCheck" className="mt-0.5 h-4 w-4 shrink-0" />
        {copy.safety}
      </p>
    </SubScreen>
  )
}

function RoutineGroup({
  title,
  items,
  doneLabel,
  pendingLabel,
}: {
  title: string
  items: { id: string; name: string; detail: string; done: boolean; onToggle: () => void }[]
  doneLabel: string
  pendingLabel: string
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-black text-ink-900">{title}</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onToggle}
            aria-pressed={item.done}
            className={cn(
              'card flex min-h-[4.25rem] w-full items-center gap-3 px-4 py-3 text-start transition-colors',
              item.done ? 'border-primary-soft bg-primary-soft' : 'hover:border-primary-soft',
            )}
          >
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', item.done ? 'bg-primary text-white' : 'bg-primary-soft text-primary-c')}>
              <Icon name={item.done ? 'Check' : 'Pill'} className="h-4 w-4" strokeWidth={item.done ? 3 : 2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-900">{item.name}</span>
              {item.detail && <span className="mt-0.5 block text-[11px] text-ink-400">{item.detail}</span>}
            </span>
            <span className={cn('text-xs font-bold', item.done ? 'text-primary-c' : 'text-ink-400')}>
              {item.done ? doneLabel : pendingLabel}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ملاحظة: `primary` لون مبنيّ على var()، فاختصار `/opacity` في Tailwind يُخرجه
// شفافًا. نستخدم أدوات `opacity-*` على العنصر نفسه لتدرّج الشدّة بلون الهوية.
const HEAT: Record<CommitmentWeek['level'], string> = {
  0: 'bg-beige',
  1: 'bg-primary opacity-30',
  2: 'bg-primary opacity-60',
  3: 'bg-primary',
}

function Privacy({ lang, model, onBack, onDelete, onData }: { lang: Lang; model: ProfileV2Model; onBack: () => void; onDelete: () => void; onData: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <SubScreen title={t('الخصوصية والبيانات', 'Privacy & data')} onBack={onBack} lang={lang}>
      <section className="card p-5">
        <h2 className="text-base font-black text-ink-900">{t('بياناتك ملكك', 'Your data is yours')}</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-500">{t('نجمع الحد الأدنى فقط. كل التقديرات شفافة وقابلة للتعديل، ويمكنك تصدير أو حذف بياناتك في أي وقت.', 'We collect the minimum. Every estimate is transparent and editable, and you can export or delete your data anytime.')}</p>
      </section>
      <section className="mt-4 space-y-3">
        <InfoRow icon="BarChart3" title={t('تحليلات مجهولة', 'Anonymous analytics')} sub={t('لتحسين التطبيق فقط', 'To improve the app only')} state={model.privacy.analyticsAnonymousEnabled ? t('مفعّل', 'On') : t('مطفأ', 'Off')} />
        <InfoRow icon="Activity" title={t('مشاركة بيانات الصحة', 'Health sharing')} sub={t('غير مربوطة بعد', 'Not connected yet')} disabled />
        <InfoRow icon="Download" title={t('تصدير واستيراد بياناتي', 'Export & import my data')} sub={t('نسخة محلّية · بلا خادم', 'Local copy · no server')} onClick={onData} />
        <button type="button" onClick={onDelete} className="card flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:border-danger">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-danger"><Icon name="Trash2" className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-danger">{t('حذف الحساب نهائيًا', 'Delete account permanently')}</span><span className="block text-[11px] text-ink-400">{t('لا يمكن التراجع · يتطلب تأكيدًا', 'Irreversible · requires confirmation')}</span></span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>
      </section>
    </SubScreen>
  )
}

function Settings({ lang, model, onBack, onAccount, onPrivacy, onNotifications, onData }: { lang: Lang; model: ProfileV2Model; onBack: () => void; onAccount: () => void; onPrivacy: () => void; onNotifications: () => void; onData: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <SubScreen title={t('الإعدادات والخصوصية', 'Settings & privacy')} onBack={onBack} lang={lang}>
      <Group title={t('المظهر', 'Appearance')}>
        <ThemeControl lang={lang} />
      </Group>
      <Group title={t('عام', 'General')}>
        <InfoRow icon="Globe" title={t('اللغة', 'Language')} sub={model.settings.language} state="" />
        <InfoRow icon="Ruler" title={t('الوحدات', 'Units')} sub={model.settings.units} state="" />
        <InfoRow icon="Calculator" title={t('الأرقام', 'Numerals')} sub={model.settings.numerals} state="" />
      </Group>
      <Group title={t('الإشعارات', 'Notifications')}>
        <InfoRow icon="Bell" title={t('التذكيرات', 'Reminders')} sub={t('تمرين · تعافٍ · ماء · ملخّص', 'Workout · recovery · water · brief')} state="" onClick={onNotifications} />
      </Group>
      <Group title={NATIVE_SETTINGS_COPY[lang].group}>
        <div className="card px-4 py-4">
          <NativeSettingsPanel lang={lang} />
        </div>
      </Group>
      <Group title={t('الخصوصية والبيانات', 'Privacy & data')}>
        <InfoRow icon="ShieldCheck" title={t('الخصوصية والبيانات', 'Privacy & data')} sub={t('التحكم في بياناتك', 'Control your data')} onClick={onPrivacy} />
      </Group>
      <Group title={t('بياناتي', 'My data')}>
        <InfoRow icon="Database" title={t('تصدير واستيراد', 'Export & import')} sub={t('نسخة كاملة محلّية · بلا خادم', 'Full local copy · no server')} onClick={onData} />
      </Group>
      <Group title={t('الحساب', 'Account')}>
        <InfoRow icon="User" title={t('الملف والبيانات', 'Profile & data')} sub={model.user.email ?? (ar ? 'ضيف' : 'Guest')} onClick={onAccount} />
        <InfoRow icon="LogOut" title={t('تسجيل الخروج · حذف الحساب', 'Log out · delete account')} sub={t('من إعدادات الحساب', 'in account settings')} onClick={onAccount} />
      </Group>
    </SubScreen>
  )
}

/**
 * «بياناتي» — تصدير/استيراد نسخة كاملة محلّية (PDPL R-1). لا شبكة إطلاقًا.
 * التصدير: لمسة واحدة → مشاركة/تنزيل. الاستيراد: اختيار ملفّ → معاينة عدّ لكل متجر
 * → تأكيد صريح → تطبيق ذرّي معاد الترميز للمستخدم الحالي → تراجع بلمسة.
 * يُرفض الاستيراد أثناء جلسة استعادة كلمة المرور.
 */
function DataScreen({ lang, uid, recoveryActive, onBack }: { lang: Lang; uid: string | null; recoveryActive: boolean; onBack: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  type Phase = 'idle' | 'preview' | 'done' | 'error'
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [undoable, setUndoable] = useState(() => hasUndo(uid))
  const fileRef = useRef<HTMLInputElement>(null)

  const numerals = (n: number) => (ar ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US'))

  const onExport = async () => {
    setBusy(true); setError(null); setNote(null)
    try {
      const method = await deliverBundle(buildExportBundle(uid))
      if (method === 'unavailable') throw new PortabilityError(t('تعذّر حفظ النسخة.', 'Could not save the copy.'))
      setNote(method === 'download' ? t('تم تنزيل نسخة بياناتك على جهازك.', 'Your data was downloaded to your device.') : t('تمّت مشاركة نسخة بياناتك.', 'Your data copy was shared.'))
    } catch {
      setError(t('تعذّر إنشاء نسخة التصدير.', 'Could not create the export.'))
    } finally {
      setBusy(false)
    }
  }

  const onPick = () => fileRef.current?.click()
  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true); setError(null); setNote(null)
    try {
      const p = parseImportFile(await readFileText(file), uid)
      setPreview(p); setPhase('preview')
    } catch (e) {
      setError(e instanceof PortabilityError ? portabilityErrorText(e, lang) : t('ملفّ غير صالح.', 'Invalid file.'))
      setPhase('error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = '' // اسمح بإعادة اختيار نفس الملفّ
    }
  }

  const onConfirm = () => {
    if (!preview) return
    if (recoveryActive) { setError(t('لا يمكن الاستيراد أثناء استعادة كلمة المرور.', 'Import is disabled during password recovery.')); setPhase('error'); return }
    setBusy(true); setError(null)
    try {
      applyImport(preview.bundle, uid, preview.ownerId)
      setUndoable(true); setPhase('done'); setPreview(null)
    } catch (e) {
      setError(e instanceof PortabilityError ? portabilityErrorText(e, lang) : t('فشل الاستيراد — أُلغيت كل التغييرات.', 'Import failed — all changes were reverted.'))
      setPhase('error')
    } finally {
      setBusy(false)
    }
  }

  const onUndo = () => {
    if (undoImport(uid)) window.location.reload()
  }

  return (
    <SubScreen title={t('بياناتي', 'My data')} onBack={onBack} lang={lang}>
      {/* تنويه محلّي بالكامل — صادق وواضح */}
      <div className="card mb-4 flex items-start gap-3 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-ink-500"><Icon name="ShieldCheck" className="h-4 w-4" /></span>
        <p className="text-[11px] leading-relaxed text-ink-400">{t('كل شيء يتمّ على جهازك — لا يُرسَل أي شيء إلى أي خادم. النسخة ملفّ JSON تحفظه أو تشاركه كما تشاء.', 'Everything happens on your device — nothing is sent to any server. The backup is a JSON file you keep or share as you wish.')}</p>
      </div>

      {phase === 'preview' && preview ? (
        <section className="card p-5">
          <h2 className="text-base font-black text-ink-900">{t('معاينة الاستيراد', 'Import preview')}</h2>
          <p className="mt-1 text-[11px] text-ink-400">{t('ستحلّ هذه البيانات محلّ ما على جهازك الآن. يمكنك التراجع بعد الاستيراد.', 'This will replace what is on your device now. You can undo after importing.')}</p>
          <ul className="mt-4 divide-y divide-line">
            {preview.lines.filter((l) => l.count > 0).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-bold text-ink-900">{l.labelAr}</span>
                <span className="font-black tabular-nums text-ink-400">{numerals(l.count)}</span>
              </li>
            ))}
          </ul>
          {preview.unregisteredCount > 0 && <p className="mt-2 text-[0.7rem] text-ink-500">{t(`عناصر إضافية: ${numerals(preview.unregisteredCount)}`, `Extra items: ${preview.unregisteredCount}`)}</p>}
          <p className="mt-3 text-[0.7rem] text-ink-400">{t(`أُنشئت النسخة: ${preview.exportedAt.slice(0, 16).replace('T', ' ')}`, `Backed up: ${preview.exportedAt.slice(0, 16).replace('T', ' ')}`)}</p>
          {recoveryActive && <p className="mt-3 rounded-xl border border-line bg-beige/60 p-2.5 text-[0.7rem] font-bold text-ink-700">{t('الاستيراد معطّل أثناء استعادة كلمة المرور.', 'Import is disabled during password recovery.')}</p>}
          <div className="mt-4 flex gap-2.5">
            <button type="button" onClick={onConfirm} disabled={busy || recoveryActive} className="btn-primary flex-1 justify-center py-3 disabled:opacity-50">{t('تأكيد الاستيراد', 'Confirm import')}</button>
            <button type="button" onClick={() => { setPreview(null); setPhase('idle') }} className="btn-ghost flex-1 justify-center py-3">{t('إلغاء', 'Cancel')}</button>
          </div>
        </section>
      ) : phase === 'done' ? (
        <section role="status" className="card p-6 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-success"><Icon name="CheckCircle2" className="h-5 w-5" /></span>
          <h2 className="mt-3 text-sm font-black text-ink-900">{t('تمّ الاستيراد', 'Import complete')}</h2>
          <p className="mt-1 text-xs text-ink-400">{t('استُعيدت بياناتك على هذا الجهاز.', 'Your data was restored on this device.')}</p>
          <div className="mt-4 flex gap-2.5">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary flex-1 justify-center py-3">{t('عرض بياناتي', 'View my data')}</button>
            <button type="button" onClick={onUndo} className="btn-ghost flex-1 justify-center py-3">{t('تراجع', 'Undo')}</button>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {error && (
            <div role="alert" className="card flex items-start gap-3 border-danger p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-danger"><Icon name="AlertTriangle" className="h-4 w-4" /></span>
              <p className="text-sm font-bold text-danger">{error}</p>
            </div>
          )}
          {note && (
            <div role="status" className="card flex items-start gap-3 p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-success"><Icon name="CheckCircle2" className="h-4 w-4" /></span>
              <p className="text-sm font-bold text-ink-700">{note}</p>
            </div>
          )}

          <button type="button" onClick={onExport} disabled={busy} className="card flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:border-primary-soft disabled:opacity-60">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c"><Icon name="Download" className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-900">{t('تصدير بياناتي', 'Export my data')}</span><span className="block text-[11px] text-ink-400">{t('نسخة كاملة (JSON) — تُحفظ أو تُشارك', 'Full copy (JSON) — save or share')}</span></span>
            <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
          </button>

          <button type="button" onClick={onPick} disabled={busy || recoveryActive} className="card flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:border-primary-soft disabled:opacity-60">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name="Save" className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-900">{t('استيراد نسخة', 'Import a backup')}</span><span className="block text-[11px] text-ink-400">{t('اختر ملفّ JSON صدّرته من قِمّة', 'Choose a JSON file exported from Qimmah')}</span></span>
            <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-hidden="true" onChange={(e) => onFile(e.target.files?.[0])} />

          {undoable && (
            <button type="button" onClick={onUndo} className="card flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:border-primary-soft">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-ink-500"><Icon name="RotateCcw" className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-900">{t('تراجع عن آخر استيراد', 'Undo last import')}</span><span className="block text-[11px] text-ink-400">{t('يعيد بياناتك إلى ما قبل آخر استيراد', 'Restores your data to before the last import')}</span></span>
            </button>
          )}
        </section>
      )}
    </SubScreen>
  )
}

function SubScreen({ title, onBack, lang, children }: { title: string; onBack: () => void; lang: Lang; children: ReactNode }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <div>
        <div className="mb-4 flex items-center gap-2.5">
          <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-700 hover:bg-beige"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-black text-ink-900">{title}</h1>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

/**
 * Theme toggle — standard screen 66 (النظام · فاتح · داكن). Persists + applies
 * via data-theme immediately. If a workout is active the change is deferred
 * (setTheme returns false) and we say so — the theme never flips mid-set.
 */
function ThemeControl({ lang }: { lang: Lang }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [pref, setPref] = useState<ThemePref>(() => getTheme())
  const [deferred, setDeferred] = useState(false)
  const [schedule, setSchedule] = useState<ThemeSchedule>(() => getThemeSchedule())
  const [busy, setBusy] = useState(false)
  const [showCities, setShowCities] = useState(false)
  const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
    { value: 'system', label: t('النظام', 'System'), icon: 'Smartphone' },
    { value: 'light', label: t('فاتح', 'Light'), icon: 'Sun' },
    { value: 'dark', label: t('داكن', 'Dark'), icon: 'Moon' },
  ]
  const choose = (value: ThemePref) => {
    // Manual choice always wins — setTheme turns the schedule off.
    setPref(value)
    const applied = setTheme(value)
    setDeferred(!applied)
    setSchedule(getThemeSchedule())
    setShowCities(false)
  }
  const enableFromLocation = async () => {
    setBusy(true)
    try {
      // On-demand: the OS location prompt fires only here, after the benefit is shown.
      const coords = await requestGeolocation()
      if (coords) {
        const applied = enableSunsetSchedule({ lat: coords.lat, lon: coords.lon, cityLabel: t('موقعك', 'Your location') })
        setDeferred(!applied)
        setSchedule(getThemeSchedule())
        setShowCities(false)
      } else {
        // Denied/unavailable → always a manual fallback, never blocked.
        setShowCities(true)
      }
    } finally {
      setBusy(false)
    }
  }
  const chooseCity = (id: string) => {
    const c = SCHEDULE_CITIES.find((x) => x.id === id)
    if (!c) return
    const applied = enableSunsetSchedule({ lat: c.lat, lon: c.lon, cityLabel: ar ? c.nameAr : c.nameEn })
    setDeferred(!applied)
    setSchedule(getThemeSchedule())
    setShowCities(false)
  }
  const toggleSchedule = () => {
    if (schedule.enabled) {
      disableSunsetSchedule()
      setSchedule(getThemeSchedule())
      setShowCities(false)
    } else {
      void enableFromLocation()
    }
  }
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-ink-500"><Icon name="Sun" className="h-4 w-4" /></span>
        <span className="text-sm font-bold text-ink-900">{t('السمة', 'Theme')}</span>
      </div>
      <div role="radiogroup" aria-label={t('السمة', 'Theme')} className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const active = !schedule.enabled && pref === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(o.value)}
              className={cn(
                'press flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors',
                active ? 'border-primary bg-primary-soft text-primary-c' : 'border-line bg-page text-ink-500 hover:text-ink-900',
              )}
            >
              <Icon name={o.icon} className="h-4 w-4" />
              {o.label}
            </button>
          )
        })}
      </div>

      {/* Sunset schedule (screen 66) — optional, off by default. */}
      <div className="mt-3 border-t border-line pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900">{t('جدولة حسب الغروب', 'Schedule by sunset')}</p>
            <p className="mt-0.5 text-[0.7rem] leading-relaxed text-ink-500">{t('داكن تلقائيًا بعد الغروب، فاتح بعد الشروق — يتطلّب موقعك أو اختيار مدينة.', 'Dark after sunset, light after sunrise — needs your location or a chosen city.')}</p>
          </div>
          <button type="button" role="switch" aria-checked={schedule.enabled} aria-label={t('جدولة حسب الغروب', 'Schedule by sunset')} disabled={busy} onClick={toggleSchedule} className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50', schedule.enabled ? 'bg-primary' : 'bg-line')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', schedule.enabled ? 'start-0.5' : 'end-0.5')} />
          </button>
        </div>
        {schedule.enabled && schedule.cityLabel && (
          <p className="mt-2 flex items-center gap-1.5 text-[0.7rem] font-bold text-primary-c"><Icon name="Moon" className="h-3.5 w-3.5" />{t(`يتبع الغروب · ${schedule.cityLabel}`, `Following sunset · ${schedule.cityLabel}`)}</p>
        )}
        {showCities && !schedule.enabled && (
          <div className="mt-2">
            <p className="mb-1 text-[0.7rem] font-bold text-ink-500">{t('تعذّر تحديد موقعك — اختر مدينة:', 'Couldn’t get your location — pick a city:')}</p>
            <select aria-label={t('اختر مدينة', 'Pick a city')} defaultValue="" onChange={(e) => chooseCity(e.target.value)} className="w-full rounded-xl border border-line bg-page px-3 py-2 text-sm font-bold text-ink-900">
              <option value="" disabled>{t('اختر مدينة…', 'Choose a city…')}</option>
              {SCHEDULE_CITIES.map((c) => (
                <option key={c.id} value={c.id}>{ar ? c.nameAr : c.nameEn}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {deferred && (
        <p className="mt-2.5 text-[0.7rem] font-bold text-ink-500">{t('يُطبَّق بعد انتهاء تمرينك الحالي.', 'Applies after your current workout.')}</p>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-base font-black text-ink-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="card py-3 text-center"><p className="text-lg font-black tabular-nums text-ink-900">{value}</p><p className="mt-0.5 text-[10px] font-bold text-ink-400">{label}</p></div>
}
function Row({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card flex w-full items-center gap-3 p-5 text-start transition-colors hover:border-primary-soft">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-ink-500"><Icon name={icon} className="h-4 w-4" /></span>
      <span className="flex-1 text-sm font-bold text-ink-700">{label}</span>
      <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
    </button>
  )
}
function InfoRow({ icon, title, sub, state, disabled, subNote, onClick }: { icon: string; title: string; sub: string; state?: string; disabled?: boolean; subNote?: string; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={cn('card flex w-full items-center gap-3 px-4 py-3 text-start', disabled && 'opacity-70', onClick && 'transition-colors hover:border-primary-soft')}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-ink-500"><Icon name={icon} className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-900">{title}</span><span className="block text-[11px] text-ink-400">{subNote ?? sub}</span></span>
      {state != null && state !== '' && <span className="shrink-0 text-xs font-black text-ink-500">{state}</span>}
      {disabled && <span className="shrink-0 text-[0.65rem] font-bold text-ink-500">{subNote ? '' : sub}</span>}
    </Comp>
  )
}
