// قشرة النظام الأصلية (Capacitor) — شريط الحالة + إخفاء شاشة الإقلاع.
//
// نطاق: iOS/Android الأصلي فقط. على الويب: no-op تام. تفشل بهدوء إن غابت الإضافة،
// فلا تُسقط الويب أبدًا. لا تغيّر أي سلوك بصري على الويب.
//
// ⚠️ القيم هنا مؤقتة: تعكس الخلفية الداكنة الحالية (#101216 ≈ --c-page) بانتظار هوية
// Cloud Design المعتمدة. ليست قرار تصميم نهائيًا — لا لون علامة جديد، لا لوحة جديدة.

import { Capacitor } from '@capacitor/core'

/** لون خلفية شريط الحالة المؤقّت (أندرويد فقط) — نفس خلفية التطبيق الحالية. مؤقّت. */
const TEMP_STATUS_BAR_BG = '#101216'

/** إضاءة نسبية مبسّطة (0–255) لقناة RGB — عتبة القرار بين «سطح فاتح» و«داكن». */
function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * هل السطح الواقع **فعليًا** تحت شريط الحالة فاتح؟
 *
 * نأخذ عيّنة من أعلى الشاشة (elementFromPoint) ونصعد لأول خلفية غير شفافة، بدل
 * الاعتماد على سمة `data-theme` أو على متغيّر واحد:
 *   • السمة قد تغيب تمامًا (applyTheme تؤجَّل أثناء تمرين نشط) والصفحة تُرسم فاتحة.
 *   • أسطح ملء الشاشة (`v2-surface-dark`: التمرين النشط، الترحيب، الأسئلة) داكنة دائمًا
 *     مهما كانت سمة التطبيق — فلا يكفي لون سطح الهيدر وحده.
 * العيّنة تتبع البكسل المرسوم فتصحّ في الفاتح/الداكن/سمة الجهاز/جدولة الغروب والانغماس.
 */
function topSurfaceIsLight(): boolean {
  const el = document.elementFromPoint(Math.floor(window.innerWidth / 2), 2)
  for (let node: Element | null = el; node; node = node.parentElement) {
    const parsed = getComputedStyle(node).backgroundColor.match(/rgba?\(([^)]+)\)/)
    if (!parsed) continue
    const [r, g, b, a = 1] = parsed[1].split(',').map(Number)
    if (![r, g, b].every(Number.isFinite) || a < 0.5) continue // شفاف ⇒ تابع لأعلى
    return luminance(r, g, b) > 140
  }
  // لا خلفية صريحة: ارجع لسطح السمة الحالي.
  const ch = getComputedStyle(document.body).getPropertyValue('--c-surface').trim()
    .split(/[\s,/]+/).map(Number).filter(Number.isFinite)
  return ch.length < 3 || luminance(ch[0], ch[1], ch[2]) > 140
}

/**
 * يوائم لون أيقونات/نصّ شريط الحالة مع السطح تحته.
 * سطح فاتح ⇒ Style.Light (محتوى داكن)، سطح داكن ⇒ Style.Dark (محتوى فاتح).
 * ضروري مع التراكب: التطبيق نفسه يرسم منطقة الشريط، فلولا المواءمة لاختفت الساعة
 * والبطارية (أبيض فوق أبيض أو أسود فوق أسود).
 */
let lastLightSurface: boolean | null = null
async function syncStatusBarStyle(): Promise<void> {
  const light = topSurfaceIsLight()
  if (light === lastLightSurface) return // لا نداء للجسر بلا تغيّر فعلي
  lastLightSurface = light
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: light ? Style.Light : Style.Dark })
  } catch {
    lastLightSurface = null // أعد المحاولة عند التغيير التالي
  }
}

/**
 * يعيد المواءمة عند كل تغيّر بصري قد يبدّل السطح العلوي: تبديل السمة، وفتح/إغلاق
 * أسطح ملء الشاشة. نُجمّع النداءات في إطار واحد، ولا نلمس الجسر الأصلي إلا عند
 * تغيّر النتيجة فعلًا.
 */
function watchThemeForStatusBar(): void {
  let queued = false
  const schedule = () => {
    if (queued) return
    queued = true
    window.requestAnimationFrame(() => { queued = false; void syncStatusBarStyle() })
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  const root = document.getElementById('root')
  if (root) {
    new MutationObserver(schedule).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    })
  }
  window.addEventListener('qimmah:immersive', schedule)
}

/**
 * تُهيّئ قشرة النظام الأصلية مرّة واحدة عند الإقلاع. آمنة للاستدعاء على الويب (تعود فورًا).
 */
export async function initNativeShell(): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return

  // قفل القرص (pinch-zoom) داخل WKWebView: أحداث gesture* خاصة بـ WebKit ولا يكفيها
  // CSS/viewport وحدها لمنع القرص في التطبيق الأصلي. نُلغيها هنا (الأصلي فقط) — متصفّح
  // الويب لا يصل هذا الفرع فتبقى إمكانية التكبير للوصول محفوظة على الويب.
  // (النقر المزدوج مقفول أصلًا عبر touch-action: manipulation في CSS.)
  const preventGesture = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', preventGesture, { passive: false })
  document.addEventListener('gesturechange', preventGesture, { passive: false })
  document.addEventListener('gestureend', preventGesture, { passive: false })

  // شريط الحالة.
  //
  // iOS: تراكب فوق الـ WebView. بلا تراكب يُقصّ إطار الـ WebView أسفل الشريط فتظهر منطقة
  // الساعة/الشبكة/البطارية شريطًا أسود منفصلًا (خلفية النافذة الأصلية)، ويصير
  // env(safe-area-inset-top) = 0 فلا يستطيع أي عنصر ويب رسم تلك المنطقة. مع التراكب يمتد
  // الـ WebView خلف الشريط، و--safe-top يعود بقيمته الحقيقية، وهيدر القشرة يرسم المنطقة
  // بلونه نفسه — امتداد بصري طبيعي.
  //
  // أندرويد: يبقى بلا تراكب (env(safe-area-inset-top) = 0 هناك، فالتراكب يعني قصّ المحتوى)
  // مع لون خلفية للشريط — وهو مدعوم على أندرويد فقط.
  try {
    const { StatusBar } = await import('@capacitor/status-bar')
    const ios = Capacitor.getPlatform() === 'ios'
    await StatusBar.setOverlaysWebView({ overlay: ios })
    if (!ios) {
      // لون خلفية الشريط مدعوم على أندرويد فقط (iOS يتجاهله). قيمة مؤقتة.
      await StatusBar.setBackgroundColor({ color: TEMP_STATUS_BAR_BG })
    }
    await syncStatusBarStyle()
    watchThemeForStatusBar()
  } catch {
    /* إضافة شريط الحالة غير متاحة — تجاهل بهدوء (لا نُسقط التطبيق) */
  }

  // شاشة الإقلاع الأصلية: نُخفيها بعد جهوزية الحزمة لتفادي بقائها معلّقة.
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* إضافة شاشة الإقلاع غير متاحة — تجاهل بهدوء */
  }
}
