import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qimmah.mobile',
  appName: 'Qimmah',
  webDir: 'dist',
  ios: {
    // امتداد الـ WebView خلف المناطق الآمنة (النتوء/مؤشّر المنزل) حتى تعمل حواف env(safe-area-*)
    // في CSS. المحتوى يُبطَّن داخليًا عبر متغيّرات --safe-top/--safe-bottom (styles/index.css).
    contentInset: 'never',
    // خلفية الـ WebView داكنة (لون الصفحة) — تمنع أي وميض أبيض بين إخفاء شاشة الإقلاع وأول رسم.
    backgroundColor: '#101216',
  },
  plugins: {
    SplashScreen: {
      // لا إخفاء تلقائي: تُخفى برمجيًا من initNativeShell() بعد أول رسم لواجهة React
      // (شاشة الإقلاع الداكنة مرسومة تحتها) — فالتسليم أصلي→React يكون داكن→داكن بلا وميض أبيض.
      // (لا نضبط launchShowDuration لأنه يُتجاهَل عند launchAutoHide:false — الإخفاء يدويّ حصرًا.)
      launchAutoHide: false,
      backgroundColor: '#0F1115',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSplashResourceName: 'Splash',
      fadeOutDuration: 250,
    },
    StatusBar: {
      // تراكب فوق الـ WebView. بدونه يُقصّ إطار الـ WebView أسفل شريط الحالة، فتظهر منطقة
      // الساعة/الشبكة/البطارية شريطًا أسود منفصلًا (خلفية النافذة الأصلية) لا يطابق الهيدر،
      // ويصير env(safe-area-inset-top) = 0 فلا يملك أي عنصر ويب رسم تلك المنطقة.
      // مع التراكب: الـ WebView يمتد خلف الشريط، و--safe-top يعود بقيمته الحقيقية، وهيدر
      // القشرة (bg-surface + padding-top: var(--safe-top)) يرسمها بنفسه — امتداد بصري
      // طبيعي بلا خياطة. (أندرويد يُعاد ضبطه إلى «بلا تراكب» في initNativeShell.)
      overlaysWebView: true,
      // خلفية داكنة ⇒ نصّ فاتح (Style.Dark). تُحدَّث حيًّا مع سمة التطبيق في initNativeShell.
      style: 'DARK',
      backgroundColor: '#101216',
    },
    Keyboard: {
      // 'native': يُقلّص إطار الـ WebView إلى المساحة فوق لوحة المفاتيح عند ظهورها،
      // فتبقى الأزرار/الأشرطة السفلية الثابتة (تذييل الأسئلة، شريط التمرين، أزرار الحفظ)
      // مرئية فوقها ولا تُغطّي الحقل المركَّز. الحل على مستوى القشرة لكل حقول الإدخال دفعة واحدة.
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
