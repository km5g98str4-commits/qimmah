import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { AccessCard } from '@/components/AccessCard'
import { DataManagementPanel } from '@/components/DataManagementPanel'
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
import { requestSetupFocus } from '@/lib/setupFocus'
import { takeQuickLogIntent } from '@/lib/quickLogIntent'
import { medicationName, supplementName } from '@/lib/wellnessPlan'
import { useWellnessToday } from '@/lib/wellnessTracking'
import { formatNumber } from '@/lib/numberFormat'
import { settingsPreferencesStrings } from '@/i18n/dict/settingsPreferences'
import { profileScreenStrings } from '@/i18n/dict/profileScreen'

interface ProfileV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

type Screen = 'home' | 'privacy' | 'settings' | 'notifications' | 'data-settings' | 'data-privacy' | 'routine'

const PROFILE_RETURN_SCREEN_STATE = 'qimmahProfileReturnScreen'

function takeProfileReturnScreen(): 'settings' | 'privacy' | null {
  const state = window.history.state
  if (!state || typeof state !== 'object') return null
  const returnScreen = (state as Record<string, unknown>)[PROFILE_RETURN_SCREEN_STATE]
  if (returnScreen !== 'settings' && returnScreen !== 'privacy') return null
  const rest = { ...state } as Record<string, unknown>
  delete rest[PROFILE_RETURN_SCREEN_STATE]
  window.history.replaceState(rest, '')
  return returnScreen
}

function rememberProfileReturnScreen(returnScreen: 'settings' | 'privacy'): void {
  const state = window.history.state
  const current = state && typeof state === 'object' ? state as Record<string, unknown> : {}
  window.history.replaceState({ ...current, [PROFILE_RETURN_SCREEN_STATE]: returnScreen }, '')
}

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
  const profileCopy = profileScreenStrings[lang]
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
    const returnScreen = takeProfileReturnScreen()
    if (returnScreen) setScreen(returnScreen)

    const openRoutine = (event: Event) => {
      if ((event as CustomEvent).detail === 'routine') setScreen('routine')
    }
    // القراءة تمرّ بالمالك المحروس: الوصول الخام كان يرمي أثناء التركيب حين
    // يُحجب التخزين، فينهار مسار «ملفك» كلّه إلى حدّ الخطأ بدل أن يفتح عاديًا.
    if (takeQuickLogIntent(['routine'])) setScreen('routine')
    window.addEventListener('qimmah:quick-log', openRoutine)
    return () => window.removeEventListener('qimmah:quick-log', openRoutine)
  }, [])

  const uid = auth.user?.id ?? null
  const openCanonicalSettings = (returnScreen: 'settings' | 'privacy') => {
    rememberProfileReturnScreen(returnScreen)
    onNavigate('settings')
  }
  if (screen === 'data-settings') return <DataScreen lang={lang} uid={uid} recoveryActive={auth.recoveryActive} onBack={() => setScreen('settings')} />
  if (screen === 'data-privacy') return <DataScreen lang={lang} uid={uid} recoveryActive={auth.recoveryActive} onBack={() => setScreen('privacy')} />
  if (screen === 'privacy') return <Privacy lang={lang} model={model} onBack={() => setScreen('home')} onManageAccount={() => openCanonicalSettings('privacy')} onData={() => setScreen('data-privacy')} />
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
        // [CTO-65] البند ٨: كان يفتح المعالج من أوّله فيصل المستخدم لخطوة الأساسيات
        // لا للمكمّلات. النيّة تُسجَّل قبل التنقّل فيفتح المعالج على خطوة الروتين.
        onEdit={() => {
          requestSetupFocus('wellness')
          onNavigate('setup')
        }}
      />
    )
  }
  if (screen === 'settings') return <Settings lang={lang} model={model} onBack={() => setScreen('home')} onCanonicalSettings={() => openCanonicalSettings('settings')} onPrivacy={() => setScreen('privacy')} onNotifications={() => setScreen('notifications')} onData={() => setScreen('data-settings')} />

  const numerals = (n: number) => formatNumber(n, lang)

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <div className="space-y-4">
        {/* بطاقة الهوية — الاسم + شارة الهدف */}
        <section className="card flex items-center gap-4 p-5">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-black text-primary-c">{model.user.initials}</span>
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
        <section aria-label={profileCopy.summaryAria} className="grid grid-cols-3 gap-3">
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
          <Row icon="Scale" label={t('القياسات', 'Measurements')} onClick={() => onNavigate('measurements')} />
          <Row icon="Pill" label={t('الأدوية والمكمّلات', 'Supplements & meds')} onClick={() => setScreen('routine')} />
          <Row icon="Settings" label={t('الإعدادات والخصوصية', 'Settings & privacy')} onClick={() => setScreen('settings')} />
        </section>

        {/* ═══ [PREMIUM-UX-W2] بطاقة الوصول — المدخل الأوّليّ الظاهر للتفعيل ═══
            كان هنا سطر Premium **ثابت** يقول «احصل على Premium» **حتى لمن
            يملكه أصلًا** — لأنه لا يقرأ الاستحقاق. صار بطاقةً تتبع حالة الخادم:
            Premium يُعرض «مفعّل» لا «اشترِ»، والوصول الموقوت لا يُسمّى Premium
            مشترى، والتجربة عدّادها، ومدخل الكود ظاهر في كل حالة غير المفعّلة.
            السلطة كلّها للخادم (`useAccessSummary`)، ومدخل الكود يفتح البوّابة
            المحصَّنة نفسها — لا مسار تفعيل ثانٍ. */}
        <AccessCard lang={lang} />
      </div>
    </div>
  )
}

function ProgramCard({ model, t, numerals, onOpen }: { model: ProfileV2Model; t: (a: string, e: string) => string; numerals: (n: number) => string; onOpen: () => void }) {
  const { program } = model
  const sub = !program.onboarded
    ? t('أكمل الإعداد لبناء خطتك', 'Finish setup to build your plan')
    : program.daysPerWeek
      ? t(`الأسبوع ${numerals(program.weekOf)} من ${numerals(program.totalWeeks)} · ${numerals(program.daysPerWeek)} أيام/أسبوع`, `Week ${numerals(program.weekOf)} of ${numerals(program.totalWeeks)} · ${numerals(program.daysPerWeek)} days/week`)
      : t(`الأسبوع ${numerals(program.weekOf)} من ${numerals(program.totalWeeks)}`, `Week ${numerals(program.weekOf)} of ${numerals(program.totalWeeks)}`)
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
    ? t(`تمرّنت في ${numerals(active)} من آخر ${numerals(COMMITMENT_WEEKS)} أسابيع`, `Trained in ${numerals(active)} of the last ${numerals(COMMITMENT_WEEKS)} weeks`)
    : t('لا تمارين مسجّلة بعد', 'No workouts logged yet')
  return (
    <section className="card p-5">
      <p className="flex items-center justify-between gap-2">
        <span className="text-base font-black text-ink-900">{t('الالتزام', 'Consistency')}</span>
        <span className="text-[11px] font-bold text-ink-400">{t(`آخر ${numerals(COMMITMENT_WEEKS)} أسابيع`, `Last ${numerals(COMMITMENT_WEEKS)} weeks`)}</span>
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

function Privacy({ lang, model, onBack, onManageAccount, onData }: { lang: Lang; model: ProfileV2Model; onBack: () => void; onManageAccount: () => void; onData: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const copy = profileScreenStrings[lang]
  return (
    <SubScreen title={t('الخصوصية والبيانات', 'Privacy & data')} onBack={onBack} lang={lang}>
      <section className="card p-5">
        <h2 className="text-base font-black text-ink-900">{t('بياناتك ملكك', 'Your data is yours')}</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-500">{t('نجمع الحد الأدنى فقط. كل التقديرات شفافة وقابلة للتعديل، ويمكنك تصدير أو حذف بياناتك في أي وقت.', 'We collect the minimum. Every estimate is transparent and editable, and you can export or delete your data anytime.')}</p>
      </section>
      <section className="mt-4 space-y-3">
        {/* [CTO-71] البند ١ — الصفّ كان يقول «تحليلات مجهولة · مفعّل» وطبقة الإرسال
            حُذفت. الصياغة الآن تصف الواقع البنيوي: أحداث استخدام تبقى على الجهاز. */}
        <InfoRow icon="BarChart3" title={t('أحداث الاستخدام', 'Usage events')} sub={t('تبقى على جهازك ولا تُرسَل', 'Stay on your device, never sent')} state={model.privacy.usageEventsLocalOnly ? t('محلي', 'Local') : t('مطفأ', 'Off')} />
        <InfoRow icon="Activity" title={t('مشاركة بيانات الصحة', 'Health sharing')} sub={t('غير مربوطة بعد', 'Not connected yet')} disabled />
        <InfoRow testId="profile-privacy-data-entry" icon="Download" title={t('تصدير واستيراد بياناتي', 'Export & import my data')} sub={t('نسخة محلّية · بلا خادم', 'Local copy · no server')} onClick={onData} />
        <button type="button" data-testid="profile-account-data-action" onClick={onManageAccount} className="card flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:border-danger">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-danger"><Icon name="Trash2" className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-danger">{model.user.signedIn ? t('حذف الحساب نهائيًا', 'Delete account permanently') : copy.deviceDataTitle}</span>
            <span className="block text-[11px] text-ink-400">{model.user.signedIn ? t('لا يمكن التراجع · يتطلب تأكيدًا', 'Irreversible · requires confirmation') : copy.deviceDataNote}</span>
          </span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>
      </section>
    </SubScreen>
  )
}

function Settings({ lang, model, onBack, onCanonicalSettings, onPrivacy, onNotifications, onData }: { lang: Lang; model: ProfileV2Model; onBack: () => void; onCanonicalSettings: () => void; onPrivacy: () => void; onNotifications: () => void; onData: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const preferenceCopy = settingsPreferencesStrings[lang]
  const profileCopy = profileScreenStrings[lang]
  return (
    <SubScreen title={t('الإعدادات والخصوصية', 'Settings & privacy')} onBack={onBack} lang={lang}>
      <Group title={t('المظهر', 'Appearance')}>
        <ThemeControl lang={lang} />
      </Group>
      <Group title={t('عام', 'General')}>
        <InfoRow testId="profile-canonical-settings" icon="Globe" title={preferenceCopy.groupTitle} sub={profileCopy.settingsPreferencesNote} onClick={onCanonicalSettings} />
      </Group>
      <Group title={t('الإشعارات', 'Notifications')}>
        <InfoRow testId="profile-reminders-entry" icon="Bell" title={t('التذكيرات', 'Reminders')} sub={t('تمرين · تعافٍ · ماء · ملخّص', 'Workout · recovery · water · brief')} state="" onClick={onNotifications} />
      </Group>
      <Group title={NATIVE_SETTINGS_COPY[lang].group}>
        <div className="card px-4 py-4">
          <NativeSettingsPanel lang={lang} />
        </div>
      </Group>
      <Group title={t('الخصوصية والبيانات', 'Privacy & data')}>
        <InfoRow testId="profile-privacy-entry" icon="ShieldCheck" title={t('الخصوصية والبيانات', 'Privacy & data')} sub={t('التحكم في بياناتك', 'Control your data')} onClick={onPrivacy} />
      </Group>
      <Group title={t('بياناتي', 'My data')}>
        <InfoRow testId="profile-data-entry" icon="Database" title={t('تصدير واستيراد', 'Export & import')} sub={t('نسخة كاملة محلّية · بلا خادم', 'Full local copy · no server')} onClick={onData} />
      </Group>
      {model.user.signedIn && (
        <Group title={t('الحساب', 'Account')}>
          <InfoRow icon="User" title={t('الملف والبيانات', 'Profile & data')} sub={model.user.email ?? ''} onClick={onCanonicalSettings} />
          <InfoRow icon="LogOut" title={t('تسجيل الخروج · حذف الحساب', 'Log out · delete account')} sub={t('من إعدادات الحساب', 'in account settings')} onClick={onCanonicalSettings} />
        </Group>
      )}
    </SubScreen>
  )
}

/** «بياناتي» يعيد استخدام مالك النقل القانوني نفسه في Settings، بلا واجهة ثانية تنجرف عنه. */
function DataScreen({ lang, uid, recoveryActive, onBack }: { lang: Lang; uid: string | null; recoveryActive: boolean; onBack: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <SubScreen title={t('بياناتي', 'My data')} onBack={onBack} lang={lang}>
      <section className="card p-5">
        <DataManagementPanel lang={lang} uid={uid} recoveryActive={recoveryActive} />
      </section>
    </SubScreen>
  )
}

function SubScreen({ title, onBack, lang, children }: { title: string; onBack: () => void; lang: Lang; children: ReactNode }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <div>
        <div className="mb-4 flex items-center gap-2.5">
          <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-700 hover:bg-beige"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h2 className="min-w-0 flex-1 truncate text-lg font-black text-ink-900">{title}</h2>
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
          <button type="button" role="switch" aria-checked={schedule.enabled} aria-label={t('جدولة حسب الغروب', 'Schedule by sunset')} disabled={busy} onClick={toggleSchedule} className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center disabled:opacity-50">
            <span aria-hidden="true" className={cn('relative block h-6 w-11 rounded-full transition-colors', schedule.enabled ? 'bg-primary' : 'bg-line')}>
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', schedule.enabled ? 'start-0.5' : 'end-0.5')} />
            </span>
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
function InfoRow({ icon, title, sub, state, disabled, subNote, testId, onClick }: { icon: string; title: string; sub: string; state?: string; disabled?: boolean; subNote?: string; testId?: string; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp type={onClick ? 'button' : undefined} data-testid={testId} onClick={onClick} className={cn('card flex w-full items-center gap-3 px-4 py-3 text-start', disabled && 'opacity-70', onClick && 'transition-colors hover:border-primary-soft')}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-ink-500"><Icon name={icon} className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-900">{title}</span><span className="block text-[11px] text-ink-400">{subNote ?? sub}</span></span>
      {state != null && state !== '' && <span className="shrink-0 text-xs font-black text-ink-500">{state}</span>}
      {disabled && <span className="shrink-0 text-[0.65rem] font-bold text-ink-500">{subNote ? '' : sub}</span>}
      {onClick && <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />}
    </Comp>
  )
}
