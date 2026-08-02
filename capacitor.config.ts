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
      // لا تراكب فوق الـ WebView — لا محتوى تحت النتوء؛ منطقة الشريط منفصلة.
      overlaysWebView: false,
      // خلفية داكنة ⇒ نصّ فاتح (Style.Dark) يناسب شاشة الترحيب الداكنة وأسطح التطبيق.
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
