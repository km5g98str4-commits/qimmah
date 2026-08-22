// أدوات PWA: التقاط حدث تثبيت التطبيق + صلاحية التنبيهات.
// صادق بلا وعود زائفة: لا Push في الخلفية (لا Backend)، والتنبيهات محدودة في متصفح آيفون.

import { Capacitor } from '@capacitor/core'

/**
 * هل نعمل داخل غلاف native (Capacitor على iOS/Android)؟
 * حينها التطبيق «مثبّت» أصلًا بحُكم كونه تطبيقًا من المتجر — فأي دعوة تثبيت PWA
 * («ثبّت قِمّة على جهازك») لا معنى لها بل قد تُرفض في مراجعة App Store.
 * مصدر حقيقة واحد يعتمد عليه كل واجهات التثبيت (البانر + الدعوة + إعدادات الجهاز).
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** حدث beforeinstallprompt (غير معرّف في TS القياسي). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
/**
 * هل أطلق المتصفّح `beforeinstallprompt` في هذه الجلسة **ولو استُهلك بعدها**؟
 *
 * التمييز ليس تفصيلًا: `deferredPrompt === null` تجمع حالتين مختلفتين تمامًا —
 * «متصفّح لا يدعم التثبيت أصلًا» و«دعمه وفتح المستخدم المربّع ثم أغلقه». الأولى
 * يجب أن تصمت، والثانية يجب أن تقول مسار قائمة المتصفّح؛ فلا مربّع ثانٍ في هذه
 * الجلسة. بلا هذا العلم تصير الحالتان زرَّ «ثبّت» واحدًا، وأحدهما ميّت.
 */
let promptFired = false
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((fn) => fn())
}

// يُلتقط الحدث مبكرًا (عند تحميل الوحدة) لأن المتصفح يطلقه مرّة واحدة فقط.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // نمنع الشريط الافتراضي لنعرض زرّنا المخصّص وقت ما نشاء.
    deferredPrompt = e as BeforeInstallPromptEvent
    promptFired = true
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

/** اشتراك في تغيّر حالة التثبيت (يُعيد دالة إلغاء). */
export function onInstallStateChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** هل التطبيق يعمل مثبّتًا (standalone) على الشاشة الرئيسية؟ */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // داخل الغلاف الأصلي (Capacitor) التطبيق مثبّت فعلًا → عامله كـ standalone دائمًا.
  if (isNativePlatform()) return true
  // iOS يستخدم navigator.standalone؛ البقية display-mode: standalone.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** هل الجهاز iOS/iPadOS (لا يدعم beforeinstallprompt — يحتاج تعليمات يدوية)؟ */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ يتنكّر كـ Mac؛ نكشفه عبر اللمس.
  const iPadOS = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOS
}

/** هل يمكن إطلاق مربّع تثبيت أصلي الآن (Android/Chrome/Edge)؟ لا شيء داخل الغلاف الأصلي. */
export function canPromptInstall(): boolean {
  return !isNativePlatform() && deferredPrompt !== null
}

/**
 * هل أطلق المتصفّح حدث التثبيت في هذه الجلسة؟ (يبقى `true` بعد استهلاك المربّع)
 * تستعمله دعوة التثبيت لتفرّق بين «لا مسار تثبيت هنا» و«المسار قائم لكن المربّع
 * لا يُعاد فتحه» — انظر `installInviteKind`.
 */
export function installPromptFired(): boolean {
  return !isNativePlatform() && promptFired
}

/**
 * نتيجة محاولة التثبيت **بثلاث حالات لا اثنتين**.
 *
 * `promptInstall` تُرجع `false` لثلاثة أسباب مختلفة (لا مربّع · رفض المستخدم ·
 * عطل)، فتعجز الواجهة عن قول الصدق: «ما ظهر لك مربّع؟» تختلف عن «أغلقت المربّع».
 */
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export async function promptInstallOutcome(): Promise<InstallOutcome> {
  if (!deferredPrompt) return 'unavailable'
  try {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    notify()
    return outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch {
    // المربّع لم يُفتح (سياسة تفاعل، حدث بائت) — لا نزعم رفضًا لم يقع.
    deferredPrompt = null
    notify()
    return 'unavailable'
  }
}

/** يُطلق مربّع تثبيت المتصفح الأصلي؛ يُعيد true إذا قبل المستخدم. */
export async function promptInstall(): Promise<boolean> {
  return (await promptInstallOutcome()) === 'accepted'
}

// —— التنبيهات ——

/** هل واجهة Notification مدعومة في هذا المتصفح؟ (متصفح آيفون غالبًا لا يدعمها إلا مثبّتًا) */
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function notificationPermission(): NotifPermission {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission as NotifPermission
}

/**
 * يطلب إذن التنبيهات ويُظهر تنبيه تأكيد واحدًا عند القبول (إثبات ملموس بلا وعود خلفية).
 * يُعيد الحالة النهائية.
 */
export async function requestNotifications(confirmBody: string): Promise<NotifPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      try {
        new Notification('قِمّة', { body: confirmBody, icon: '/icon-192.png' })
      } catch {
        // بعض المتصفحات تتطلّب Service Worker لإظهار التنبيه — تجاهُل آمن.
      }
    }
    return result as NotifPermission
  } catch {
    return notificationPermission()
  }
}
