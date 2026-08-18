import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { InstallBanner } from './InstallBanner'
import { StateBlock } from './StateBlock'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { V2_QUICK_LOG, V2_TAB_LABELS } from '@/design-system/v2/labels'
import type { AppRoute } from '@/lib/appRoutes'
import type { AppBadge } from './AppNav'
import { playHaptic } from '@/lib/nativeFeedback'

export type MainTab = 'dashboard' | 'workout' | 'nutrition' | 'progress' | 'profile'

interface MobileShellProps {
  lang: Lang
  tab: MainTab
  badge: AppBadge
  onNavigate: (route: AppRoute) => void
  onOpenSettings: () => void
  onQuickLog: (target: QuickLogTarget) => void
  routineQuickLabel: string
  children: ReactNode
}

export type QuickLogTarget = 'meal' | 'water' | 'routine'

interface TabDef {
  id: MainTab
  route: AppRoute
  label: string
  icon: string
  /** v2 center action «تسجيل» — a raised quick-log button, not a plain tab. */
  action?: boolean
}

/** قشرة التطبيق على الجوال — هيدر مدمج أعلى + شريط تنقّل سفلي ثابت. */
export function MobileShell({ lang, tab, badge: _badge, onNavigate, onOpenSettings, onQuickLog, routineQuickLabel, children }: MobileShellProps) {
  const t = getStrings(lang)
  const ar = lang !== 'en'
  const online = useOnlineStatus()
  const lg = ar ? 'ar' : 'en'
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  // [CTO-82] إعادة التركيز بعد إغلاق لوح التسجيل — **بأثر على الحالة لا داخل
  // نداء الإغلاق**.
  //
  // كان الاسترجاع داخل `onClose` وحده، فسقط في حالتين مقيستين: (١) الاختيار
  // (`onSelect`) يغلق اللوح ولا يعيد التركيز إطلاقًا، (٢) وحتى مسار `onClose`
  // كان `requestAnimationFrame` واحدًا يسبق فكّ تركيب اللوح، فيضيع التركيز
  // ويستقرّ على `body`. مقيس: `document.activeElement` = BODY بعد الإغلاق
  // بالزرّ وبمفتاح Escape معًا.
  //
  // الأثر يراقب انتقال الحالة نفسه، فيغطّي كل مسارات الإغلاق بلا استثناء،
  // وإطارَان يضمنان أن اللوح فُكّ فعلًا قبل طلب التركيز.
  const wasQuickLogOpen = useRef(false)
  useEffect(() => {
    const justClosed = wasQuickLogOpen.current && !quickLogOpen
    wasQuickLogOpen.current = quickLogOpen
    // التركيز يُطلَب **مباشرةً** لا داخل `requestAnimationFrame`: الأثر يعمل بعد
    // أن يثبّت React إزالة اللوح من الـDOM، فالزرّ حاضر وقابل للتركيز الآن.
    // وrAF يُخنَق أو يتوقّف تمامًا حين تكون اللسان في الخلفية، فيضيع الاسترجاع
    // بلا أثر — وهو ما كان يحدث في القياس.
    if (justClosed) quickLogTriggerRef.current?.focus()
  }, [quickLogOpen])
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const scrollerRef = useRef<HTMLElement>(null)
  const previousTabRef = useRef<MainTab>(tab)
  const scrollPositionsRef = useRef<Partial<Record<MainTab, number>>>({})
  const quickLogTriggerRef = useRef<HTMLButtonElement>(null)

  // Immersive focus (fullscreen workout/summary): make the shell chrome inert so
  // assistive tech can't reach the header/nav behind the modal workout surface.
  const [immersive, setImmersive] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const onImmersive = (e: Event) => setImmersive(!!(e as CustomEvent).detail)
    window.addEventListener('qimmah:immersive', onImmersive)
    return () => window.removeEventListener('qimmah:immersive', onImmersive)
  }, [])
  useEffect(() => {
    for (const el of [headerRef.current, navRef.current]) {
      if (!el) continue
      el.inert = immersive
      if (immersive) el.setAttribute('aria-hidden', 'true')
      else el.removeAttribute('aria-hidden')
    }
  }, [immersive])

  /**
   * [QIM-WEB-FOUNDER-UX-003/حزمة ١] القشرة تُعلن **ارتفاع شريط التنقّل الحقيقي**
   * في `--qimmah-nav-h`، فتستطيع الأسطح العائمة أن ترتفع فوقه بدل أن تجلس عليه.
   *
   * لماذا مقيسًا لا رقمًا مكتوبًا: الارتفاع يتغيّر بمنطقة الأمان (iPhone بشريط
   * منزلي)، وبتكبير خط النظام، وزرّ «تسجيل» المرفوع (`-mt-5`). أي رقم ثابت يصير
   * كذبًا على جهاز ما — والكذب هنا يعني بطاقة تجلس على تبويب.
   *
   * الصفر حين يختفي الشريط (لوحة مفاتيح/انغماس) وحين تُفكَّك القشرة: الأسطح
   * العامّة (الهبوط/الدخول) لا شريط تحتها فلا ترث إزاحة لا معنى لها.
   */
  useEffect(() => {
    const root = document.documentElement
    const nav = navRef.current
    const publish = () => {
      const hidden = !nav || nav.hidden
      root.style.setProperty('--qimmah-nav-h', `${hidden ? 0 : nav.offsetHeight}px`)
    }
    publish()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null
    if (nav && ro) ro.observe(nav)
    window.addEventListener('resize', publish)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', publish)
      root.style.removeProperty('--qimmah-nav-h')
    }
  }, [keyboardOpen, immersive])

  // The app shell owns the viewport while mounted; public/auth surfaces keep
  // their normal document scrolling when the shell unmounts.
  useEffect(() => {
    document.documentElement.classList.add('qimmah-shell-mounted')
    document.body.classList.add('qimmah-shell-mounted')
    return () => {
      document.documentElement.classList.remove('qimmah-shell-mounted')
      document.body.classList.remove('qimmah-shell-mounted')
    }
  }, [])

  // Native tab controllers preserve each tab's scroll offset. Mirror that
  // behavior on the single inner scroller instead of resetting every switch.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const previous = previousTabRef.current
    if (previous !== tab) scrollPositionsRef.current[previous] = scroller.scrollTop
    previousTabRef.current = tab
    scroller.scrollTo({ top: scrollPositionsRef.current[tab] ?? 0, behavior: 'auto' })
  }, [tab])

  useEffect(() => {
    let disposed = false
    let removeShow: (() => Promise<void>) | undefined
    let removeHide: (() => Promise<void>) | undefined
    void import('@capacitor/keyboard').then(async ({ Keyboard }) => {
      const show = await Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true))
      const hide = await Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false))
      if (disposed) {
        await show.remove()
        await hide.remove()
        return
      }
      removeShow = show.remove
      removeHide = hide.remove
    }).catch(() => { /* Browser preview: no native keyboard bridge. */ })
    return () => {
      disposed = true
      void removeShow?.()
      void removeHide?.()
    }
  }, [])

  // v2.1 §03 — final tab labels (central V2_TAB_LABELS, lang-aware) + center «تسجيل» action, RTL order per the PDF.
  const tabs: TabDef[] = [
        { id: 'dashboard', route: 'dashboard', label: V2_TAB_LABELS.today[lg], icon: 'Home' },
        { id: 'workout', route: 'workout', label: V2_TAB_LABELS.workout[lg], icon: 'Dumbbell' },
        // Center action: quick-log → the nutrition logging surface (most-logged).
        { id: 'nutrition', route: 'nutrition', label: V2_TAB_LABELS.log[lg], icon: 'Plus', action: true },
        { id: 'nutrition', route: 'nutrition', label: V2_TAB_LABELS.nutrition[lg], icon: 'Salad' },
        { id: 'progress', route: 'progress', label: V2_TAB_LABELS.progress[lg], icon: 'BarChart3' },
      ]

  const pageTitle = useMemo(() => {
    if (tab === 'dashboard') return t.brand
    if (tab === 'workout') return V2_TAB_LABELS.workout[lg]
    if (tab === 'nutrition') return V2_TAB_LABELS.nutrition[lg]
    if (tab === 'progress') return V2_TAB_LABELS.progress[lg]
    return V2_TAB_LABELS.profile[lg]
  }, [lg, tab, t.brand])

  return (
    <div className="qimmah-app-shell h-[100dvh] overflow-hidden bg-page">
      {/* رابط تخطٍّ للمحتوى — أول عنصر قابل للتركيز؛ مخفي حتى التركيز بلوحة المفاتيح. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-glow"
        style={{ insetInlineStart: '0.5rem' }}
      >
        {ar ? 'تخطَّ إلى المحتوى' : 'Skip to content'}
      </a>
      <div className="app-container flex h-full min-h-0 flex-col border-x border-line/60">
        {/* هيدر مدمج */}
        {/* الهيدر يملك منطقة الأمان العلوية: مع تراكب شريط الحالة على iOS يمتد سطحه
            (bg-surface) خلف الساعة/الشبكة/البطارية فيصير امتدادًا بصريًا للهيدر بلا شريط
            منفصل. `relative` تجعل z-40 فعّالة (على عنصر static تُتجاهَل) فيبقى ترتيب
            الطبقات صريحًا: محتوى < هيدر(40) < شريط سفلي(50) < أسطح ملء الشاشة(60+).
            وفي وضع الانغماس (تمرين نشط/ملخّص) يُزال من التخطيط تمامًا — لا مجرّد inert —
            فلا يمكن لأي كروم قشرة أن يعلو سطح التمرين أو يقصّ رأسه. */}
        <header
          ref={headerRef}
          hidden={immersive}
          className="relative z-40 shrink-0 border-b border-line bg-surface"
          style={{ paddingTop: 'var(--safe-top)' }}
        >
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            {/* [R3-UX-A11Y] عنوان الصفحة `h1` **في كل تبويب بلا استثناء**.
                كان تبويب الرئيسية وحده يستبدل العنوان بـ`<button><span>` — فتفتح
                شجرةُ العناوين على الشاشة الأكثر زيارةً بلا `h1` إطلاقًا، بينما
                `TodayV2` يبني عليها ويتنازل إلى `h2` معلنًا أن «القشرة تملك h1
                الصفحة». وعدٌ لم يكن يُسلَّم.
                العلاج: يبقى العنوان `h1` ويُلبَس الزرّ **داخله** — الزرّ محتوى
                عباري (phrasing content) فالتركيب صحيح بنيويًّا، والاسم المحسوب
                للعنوان هو نصّ الزرّ نفسه. والأيقونة زينة معلَنة كذلك. */}
            <h1 className="min-w-0 text-lg font-black text-ink-900">
              {tab === 'dashboard' ? (
                <button type="button" onClick={() => onNavigate('dashboard')} className="tap-target flex items-center gap-2">
                  <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-glow">
                    <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                  <span className="text-base font-extrabold text-ink-900">{pageTitle}</span>
                </button>
              ) : (
                pageTitle
              )}
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { void playHaptic('selection'); onNavigate('profile') }}
                aria-label={ar ? 'ملفك التدريبي' : 'Your training profile'}
                aria-current={tab === 'profile' ? 'page' : undefined}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-full border transition-colors',
                  tab === 'profile' ? 'border-primary bg-primary-soft text-primary-c' : 'border-line bg-surface text-ink-500 hover:text-ink-900',
                )}
              >
                <Icon name="User" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* حالة الاتصال (شاشة 75) — بانر ثابت غير حاجب: العمل يستمر محليًا ويُزامَن لاحقًا. */}
        {!online && (
          <div className="app-container px-4 pt-2">
            <StateBlock
              variant="offline"
              compact
              testId="offline-banner"
              title={ar ? 'دون اتصال' : 'Offline'}
              body={ar ? 'تعمل محليًا — يُحفظ كل شيء ويُزامَن عند عودة الاتصال.' : 'Working locally — everything saves and syncs when you reconnect.'}
            />
          </div>
        )}

        {/* شريط تثبيت التطبيق — قابل للإغلاق، يظهر فقط عند الحاجة */}
        <InstallBanner lang={lang} onOpenSettings={onOpenSettings} />

        {/* المحتوى — هدف رابط التخطّي؛ حشوة سفلية واعية بمنطقة الأمان فلا يُحجب المحتوى خلف الشريط. */}
        <main
          ref={scrollerRef}
          id="main-content"
          tabIndex={-1}
          className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain focus:outline-none"
        >
          {children}
        </main>
        {/* شريط التنقّل السفلي في مسار القشرة، لا fixed فوق المحتوى. */}
        <nav
          ref={navRef}
          hidden={keyboardOpen || immersive}
          className="relative z-50 shrink-0 border-t border-line bg-surface"
          style={{ paddingBottom: 'var(--safe-bottom)' }}
          aria-label={ar ? 'التنقّل الرئيسي' : 'Primary navigation'}
        >
          <div className="grid grid-cols-5">
          {tabs.map((tb) => {
            if (tb.action) {
              // Center «تسجيل» — a raised quick-log action, visually distinct.
              return (
                <div key="log-action" className="flex items-start justify-center">
                  <button
                    ref={quickLogTriggerRef}
                    type="button"
                    onClick={() => { void playHaptic('selection'); setQuickLogOpen(true) }}
                    aria-label={tb.label}
                    className="tap-target -mt-5 flex flex-col items-center gap-1 text-[10px] font-bold text-primary-c"
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-glow ring-4 ring-surface">
                      <Icon name={tb.icon} className="h-6 w-6" strokeWidth={2.75} />
                    </span>
                    {tb.label}
                  </button>
                </div>
              )
            }
            const active = tb.id === tab
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => { void playHaptic('selection'); onNavigate(tb.route) }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tap-target flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors',
                  active ? 'text-primary-c' : 'text-ink-500 hover:text-ink-700',
                )}
              >
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl transition-colors',
                    active ? 'bg-primary-soft' : 'bg-transparent',
                  )}
                >
                  <Icon name={tb.icon} className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                {tb.label}
              </button>
            )
          })}
          </div>
        </nav>
      </div>

      {quickLogOpen && (
        <QuickLogSheet
          lang={lang}
          routineLabel={routineQuickLabel}
          onClose={() => setQuickLogOpen(false)}
          onSelect={(target) => {
            void playHaptic('selection')
            setQuickLogOpen(false)
            onQuickLog(target)
          }}
        />
      )}
    </div>
  )
}

function QuickLogSheet({ lang, routineLabel, onClose, onSelect }: { lang: Lang; routineLabel: string; onClose: () => void; onSelect: (target: QuickLogTarget) => void }) {
  const ar = lang !== 'en'
  const copy = V2_QUICK_LOG[ar ? 'ar' : 'en']
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="presentation">
      <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-log-title"
        className="quick-log-sheet app-container relative rounded-t-[2rem] border border-b-0 border-line bg-surface px-5 pb-5 pt-3 shadow-elevated"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 1.25rem)' }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <div className="mt-2 flex items-center justify-between">
          <h2 id="quick-log-title" className="text-base font-black text-ink-900">{copy.title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-beige text-ink-700" aria-label={copy.close}>
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-auto mt-1 grid max-w-xs grid-cols-3 items-end gap-3 pb-1 pt-7">
          <QuickLogAction icon="Droplets" label={copy.water} onClick={() => onSelect('water')} />
          <QuickLogAction featured icon="Utensils" label={copy.meal} onClick={() => onSelect('meal')} />
          <QuickLogAction icon="Pill" label={routineLabel || copy.routineEmpty} onClick={() => onSelect('routine')} />
        </div>
      </section>
    </div>
  )
}

function QuickLogAction({ icon, label, featured = false, onClick }: { icon: string; label: string; featured?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('quick-log-action flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-[1.35rem] px-2 text-center font-black transition-transform active:scale-95', featured ? '-translate-y-5 bg-primary text-white shadow-glow' : 'bg-beige text-ink-900')}>
      <Icon name={icon} className={featured ? 'h-7 w-7' : 'h-6 w-6'} strokeWidth={2.4} />
      <span className="text-xs leading-tight">{label}</span>
    </button>
  )
}
