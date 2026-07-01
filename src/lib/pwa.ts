// أدوات PWA: التقاط حدث تثبيت التطبيق + صلاحية التنبيهات.
// صادق بلا وعود زائفة: لا Push في الخلفية (لا Backend)، والتنبيهات محدودة في متصفح آيفون.

/** حدث beforeinstallprompt (غير معرّف في TS القياسي). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((fn) => fn())
}

// يُلتقط الحدث مبكرًا (عند تحميل الوحدة) لأن المتصفح يطلقه مرّة واحدة فقط.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // نمنع الشريط الافتراضي لنعرض زرّنا المخصّص وقت ما نشاء.
    deferredPrompt = e as BeforeInstallPromptEvent
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

/** هل يمكن إطلاق مربّع تثبيت أصلي الآن (Android/Chrome/Edge)؟ */
export function canPromptInstall(): boolean {
  return deferredPrompt !== null
}

/** يُطلق مربّع تثبيت المتصفح الأصلي؛ يُعيد true إذا قبل المستخدم. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  try {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    notify()
    return outcome === 'accepted'
  } catch {
    return false
  }
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
