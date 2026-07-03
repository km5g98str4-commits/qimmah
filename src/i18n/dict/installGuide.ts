// قاموس «ثبّت التطبيق» (P12) — نصوص دعوة التثبيت + دليل الخطوات، بالعربية والإنجليزية.
// كل النصوص هنا (لا hardcoding داخل المكوّن) لتسهيل التخصيص والترجمة.

import type { Lang } from '@/lib/appPreferences'

export interface InstallGuideStrings {
  // — دعوة التثبيت (الشريط السفلي القابل للإغلاق) —
  /** عنوان الشريط. */
  promptTitle: string
  /** وصف قصير على أندرويد/كروم (زر تثبيت أصلي متاح). */
  promptBody: string
  /** تلميح قصير على آيفون/سفاري (لا زر أصلي). */
  promptIosHint: string
  /** نص زر التثبيت الأصلي. */
  installBtn: string
  /** تسمية زر الإغلاق (aria). */
  dismiss: string

  // — قسم الإعدادات «ثبّت التطبيق» —
  /** عنوان القسم. */
  sectionTitle: string
  /** مقدّمة توضّح فائدة التثبيت. */
  sectionIntro: string
  /** شارة «جهازك الحالي» على المنصّة المكتشفة. */
  currentDeviceBadge: string
  /** عنوان خطوات آيفون. */
  iosTitle: string
  /** خطوات آيفون (Safari). */
  iosSteps: string[]
  /** عنوان خطوات أندرويد. */
  androidTitle: string
  /** خطوات أندرويد (Chrome / Edge). */
  androidSteps: string[]
  /** وصف زر المشاركة بالكلمات (بلا صور خارجية). */
  shareIconNote: string
}

const ar: InstallGuideStrings = {
  promptTitle: 'ثبّت قِمّة على جهازك',
  promptBody: 'أضِفه لشاشتك الرئيسية ليعمل كتطبيق كامل — أسرع وبلا شريط المتصفح.',
  promptIosHint: 'من Safari: زر المشاركة ثم «أضف إلى الشاشة الرئيسية».',
  installBtn: 'ثبّت التطبيق',
  dismiss: 'إغلاق',

  sectionTitle: 'ثبّت التطبيق',
  sectionIntro:
    'أضِف قِمّة إلى شاشتك الرئيسية ليفتح كتطبيق مستقل بملء الشاشة — بلا شريط المتصفح، ووصول أسرع في كل مرّة.',
  currentDeviceBadge: 'جهازك الحالي',
  iosTitle: 'آيفون / آيباد (Safari)',
  iosSteps: [
    'افتح قِمّة داخل متصفح Safari.',
    'اضغط زر المشاركة في شريط الأدوات (مربّع يخرج منه سهم متّجه للأعلى ↑).',
    'مرّر لأسفل واختر «أضف إلى الشاشة الرئيسية».',
    'اضغط «إضافة» — ستظهر أيقونة قِمّة على شاشتك الرئيسية.',
  ],
  androidTitle: 'أندرويد (Chrome / Edge)',
  androidSteps: [
    'افتح قِمّة داخل متصفح Chrome أو Edge.',
    'اضغط قائمة المتصفح (⋮) أعلى الشاشة.',
    'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».',
    'أكّد التثبيت — ستفتح قِمّة كتطبيق مستقل.',
  ],
  shareIconNote: 'زر المشاركة يظهر كمربّع يخرج منه سهم متّجه للأعلى.',
}

const en: InstallGuideStrings = {
  promptTitle: 'Install Qimmah on your device',
  promptBody: 'Add it to your home screen to run as a full app — faster, no browser bar.',
  promptIosHint: 'In Safari: tap Share, then "Add to Home Screen".',
  installBtn: 'Install app',
  dismiss: 'Dismiss',

  sectionTitle: 'Install app',
  sectionIntro:
    'Add Qimmah to your home screen to open as a standalone full-screen app — no browser bar, and faster access every time.',
  currentDeviceBadge: 'Your device',
  iosTitle: 'iPhone / iPad (Safari)',
  iosSteps: [
    'Open Qimmah in the Safari browser.',
    'Tap the Share button in the toolbar (a square with an arrow pointing up ↑).',
    'Scroll down and choose "Add to Home Screen".',
    'Tap "Add" — the Qimmah icon appears on your home screen.',
  ],
  androidTitle: 'Android (Chrome / Edge)',
  androidSteps: [
    'Open Qimmah in the Chrome or Edge browser.',
    'Tap the browser menu (⋮) at the top.',
    'Choose "Install app" or "Add to Home screen".',
    'Confirm — Qimmah opens as a standalone app.',
  ],
  shareIconNote: 'The Share button looks like a square with an arrow pointing up.',
}

export const installGuideStrings: Record<Lang, InstallGuideStrings> = { ar, en }
