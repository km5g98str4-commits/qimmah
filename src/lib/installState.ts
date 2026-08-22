// حالة دعوة تثبيت التطبيق — علم الإغلاق + كشف iOS/Safari + **قرار العرض الخالص**.
// يبني فوق أدوات pwa.ts (التقاط beforeinstallprompt، standalone) بلا تكرار.

/** مفتاح الإغلاق الدائم القديم (P12) — يُقرأ للترحيل ولا يُكتب بعد اليوم. */
export const INSTALL_PROMPT_DISMISSED_KEY = 'qimmah:installPromptDismissed:v1'

/** مفتاح التأجيل الحالي: ختم زمني بالمللي ثانية لآخر إغلاق. */
export const INSTALL_INVITE_SNOOZED_AT_KEY = 'qimmah:installInviteSnoozedAt:v2'

/**
 * مدّة التأجيل بعد الإغلاق — [R4-UX-INSTALL].
 *
 * كان الإغلاق **أبديًا** (`'1'` بلا زمن). وهو خطأ في الاتجاهين: من أغلقها في
 * يومه الأول لأنه يجرّب لا يراها أبدًا بعد أن صار مستخدمًا يوميًّا، ومن أغلقها
 * وقصده «مو الحين» عوقب بقرار لم يقصده. ثلاثون يومًا: طويلة كفايةً ألّا تكون
 * مضايقة، وقصيرة كفايةً أن تعود لمن استقرّ على المنتج.
 */
export const INSTALL_SNOOZE_DAYS = 30
const DAY_MS = 86_400_000

function readSnoozedAt(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(INSTALL_INVITE_SNOOZED_AT_KEY)
    if (raw) {
      const value = Number(raw)
      return Number.isFinite(value) && value > 0 ? value : null
    }
    // ترحيل صامت للعلم القديم: من أغلقها سابقًا يُعامَل كأنه أغلقها **الآن**،
    // فلا تقفز الدعوة في وجهه لحظة الترقية ولا تختفي عنه إلى الأبد.
    if (window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === '1') {
      const now = Date.now()
      try {
        window.localStorage.setItem(INSTALL_INVITE_SNOOZED_AT_KEY, String(now))
      } catch {
        // تخزين محجوب — يبقى القرار للجلسة وحدها.
      }
      return now
    }
    return null
  } catch {
    return null
  }
}

/** يثبّت تأجيل الدعوة من الآن. */
export function snoozeInstallInvite(now = Date.now()): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(INSTALL_INVITE_SNOOZED_AT_KEY, String(now))
  } catch {
    // تخزين غير متاح — نُغلق للجلسة فقط (تتكفّل به حالة المكوّن).
  }
}

/** هل الدعوة مؤجَّلة الآن؟ (يشمل ترحيل العلم الدائم القديم) */
export function isInstallInviteSnoozed(now = Date.now()): boolean {
  const at = readSnoozedAt()
  return at !== null && now - at < INSTALL_SNOOZE_DAYS * DAY_MS
}

/** توافق خلفي — `InstallPrompt.tsx` غير المركَّب ما زال يستدعيها. */
export function isInstallPromptDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return isInstallInviteSnoozed()
}

/** توافق خلفي — إغلاق قديم صار تأجيلًا. */
export function dismissInstallPrompt(): void {
  snoozeInstallInvite()
}

/**
 * هل الجهاز iOS يعمل داخل Safari (لا يدعم beforeinstallprompt — يحتاج تلميح «أضف للشاشة الرئيسية»)؟
 * الكشف: iphone/ipad/ipod في UA (أو آيباد متنكّر كـ Mac باللمس)، واستبعاد متصفحات آيفون الأخرى
 * (Chrome/Firefox/Edge/Opera على iOS تحمل CriOS/FxiOS/EdgiOS/OPiOS في الـ UA).
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  const iPadOS = ua.includes('Macintosh') && (navigator.maxTouchPoints ?? 0) > 1
  if (!iOSDevice && !iPadOS) return false
  // متصفحات غير Safari على iOS (كلها WebKit لكنها لا تُظهر «أضف للشاشة الرئيسية» بنفس المسار).
  const nonSafari = /crios|fxios|edgios|opios|mercury/i.test(ua)
  return !nonSafari
}

/**
 * ما الذي تعرضه دعوة التثبيت الآن — قرار **خالص** قابل للفحص بلا متصفّح.
 *
 * ═══ القاعدة الحاكمة: زرٌّ لا يفعل شيئًا أسوأ من لا زرّ ═══
 *   • `'native-prompt'` — الحدث ملتقَط الآن ⇒ زرّ يفتح مربّع المتصفّح فعلًا.
 *   • `'ios-steps'`     — سفاري آيفون: لا مربّع أصلي على iOS إطلاقًا، فالصادق
 *     خطواتٌ مكتوبة (زر المشاركة ← «أضف إلى الشاشة الرئيسية») لا زرّ تثبيت.
 *   • `'browser-menu'`  — الحدث **أُطلق ثم استُهلك** (فتح المستخدم المربّع وأغلقه،
 *     أو رفض). المتصفّح لا يعيد إطلاقه في هذه الجلسة، فزرّ «ثبّت» هنا زرٌّ ميّت.
 *     نقول له مسار القائمة بدل أن نعده بمربّع لن يظهر.
 *   • `'hidden'`        — مثبَّت · داخل الغلاف الأصلي · مؤجَّل · أو متصفّح لا
 *     يدعم التثبيت أصلًا (فايرفوكس سطح المكتب، كروم آيفون…). **الصمت هو الصدق**:
 *     دعوة بلا مسار تنفيذ هي وعدٌ لا يُنفَّذ.
 */
export type InstallInviteKind = 'hidden' | 'native-prompt' | 'ios-steps' | 'browser-menu'

export interface InstallInviteInput {
  /** داخل غلاف Capacitor — التطبيق مثبَّت أصلًا. */
  native: boolean
  /** يعمل من الشاشة الرئيسية (standalone) — مثبَّت. */
  standalone: boolean
  /** حدث beforeinstallprompt ملتقَط **الآن** وجاهز للإطلاق. */
  canPrompt: boolean
  /** أُطلق الحدث في هذه الجلسة ولو استُهلك بعدها. */
  promptFired: boolean
  /** سفاري على iOS/iPadOS. */
  iosSafari: boolean
  /** أُغلقت الدعوة ضمن نافذة التأجيل. */
  snoozed: boolean
}

export function installInviteKind(input: InstallInviteInput): InstallInviteKind {
  if (input.native || input.standalone) return 'hidden'
  if (input.snoozed) return 'hidden'
  if (input.canPrompt) return 'native-prompt'
  if (input.iosSafari) return 'ios-steps'
  if (input.promptFired) return 'browser-menu'
  return 'hidden'
}
