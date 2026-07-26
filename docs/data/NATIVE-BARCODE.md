# الباركود الأصلي (P8) — العقد المكتوب

**الوحدات:** `src/features/barcode/` (`nativeScanner.ts` · `webZxingEngine.ts` · `validateBarcode.ts` · `scanDiagnostics.ts` · `openFoodFacts.ts`) + `ios/App/App/BarcodeScanPlugin.swift`
**الإثبات:** `npm run test:barcode` (٦ فحوص خصوصية grep + ٢٤ فحص وحدة).

## المشكلة

الباركود لا يُقرأ على iPhone حقيقي: `BarcodeDetector` غير متاح داخل WKWebView، وقراءة zxing للإطار الكامل بدقة منخفضة وبلا تحكّم تركيز كانت تفشل عمليًا. الحل من مسارين:

1. **محرّك ويب محسّن** (`webZxingEngine.ts`) — يبقى الاحتياط في المتصفح/أثناء التطوير.
2. **مسار أصلي** (`BarcodeScanPlugin.swift`) — فكّ داخل iOS نفسه عبر `AVCaptureMetadataOutput`.

## قرار الاعتمادية: AVFoundation وليس `@capacitor-mlkit/barcode-scanning` (بالدليل)

| الدليل | النتيجة |
| --- | --- |
| مشروع iOS يُدار عبر SPM: `ios/App/CapApp-SPM/Package.swift` موجود، **لا يوجد `Podfile`** في `ios/App/` | أي إضافة CocoaPods-only تتطلّب إعادة هيكلة البناء |
| حزمة npm ‏`@capacitor-mlkit/barcode-scanning@8.1.0` (فُحص محتوى الـ tarball) تحتوي `CapacitorMlkitBarcodeScanning.podspec` فقط — **لا `Package.swift`** | الحزمة CocoaPods-only فعليًا |
| الـ podspec يعتمد `GoogleMLKit/BarcodeScanning ~> 8.0.0` — وجوجل لا تنشر MLKit عبر SPM | حتى تغليفها يدويًا بـ SPM غير ممكن |
| `AVCaptureMetadataOutput` أولي الطرف يدعم `.ean13/.ean8/.upce` منذ iOS القديم | يغطي باركود منتجات التجزئة كاملًا **بصفر اعتماديات** |

**الخلاصة:** إضافة Capacitor محلية صغيرة (`BarcodeScanPlugin.swift`، تُسجَّل في `QimmahBridgeViewController` مثل `HealthKitStepsPlugin`) على AVFoundation. لا حزم جديدة، `npx cap sync ios` يمرّ كما هو.

ملاحظة موثّقة: iOS يُبلغ **UPC-A كـ EAN-13 بصفر بادئ** (سلوك AVFoundation القياسي) — طبقة JS تتعامل معه كـ `ean_13` والبحث في OFF يعمل بالحالتين.

## سطح الـ API (المحرّك فقط — الواجهة شأن Codex)

```ts
// — الواجهة الموحّدة (nativeScanner.ts) —
scanOnce(options: ScanOnceOptions): Promise<{ value: string; format: string } | null>
// أصلي على iOS (يعرض واجهته بنفسه) / zxing على الويب (يتطلب options.video).
// لا يرمي أبدًا. الفروق الدقيقة عبر onOutcome:
//   'detected' | 'cancelled' | 'permission-denied' | 'no-camera' | 'error'
// onControls يستلم { setTorch(on):Promise<boolean>, cancel() } للمسارين.
// labels: { cancel, torch, hint } — من قاموس ثنائي اللغة عند المستدعي، لا نصوص مضمّنة.
isNativeScanPlatform(): boolean   // iOS داخل Capacitor فقط

// — الإدخال اليدوي (validateBarcode.ts) —
validateBarcode(raw): { ok:true, normalized, lookupCode, format } | { ok:false, reason }
// reason: 'empty' | 'non-digits' | 'length' | 'checksum'
// يقبل الأرقام العربية الشرقية (٠-٩/۰-۹) والمسافات والشرطات. UPC-E يُوسَّع إلى UPC-A للبحث.
// أسبقية موثّقة: كود 8 خانات صالح كـ EAN-8 وكـ UPC-E معًا ⇒ EAN-8 تفوز.
lookupManualBarcode(raw, deps?): Promise<LookupResult | { status:'invalid', reason }>
// تحقّق محلي كامل قبل أي شبكة — الإدخال غير الصالح لا يُرسل طلبًا أبدًا.

// — البحث (openFoodFacts.ts) —
lookupBarcode(barcode, deps?): Promise<
  { status:'found', product } | { status:'not-found' } | { status:'network-error' }>
// TTL: النجاح 7 أيام (OFF_TTL_FOUND_MS) · «غير موجود» 24 ساعة (OFF_TTL_NOT_FOUND_MS).
// فشل الشبكة لا يُخزَّن أبدًا؛ سجل قديم بلا fetchedAt = منتهي الصلاحية (هجرة آمنة، لا حذف).
// دون اتصال ومع سجل منتهي الصلاحية: يُعاد المنتج القديم بصدق بدل لا شيء.
```

## عقد Codex — ربط الواجهة (ممنوع عليّ لمس `src/views/*`)

1. **الاستبدال:** في لوحة المسح، استدعِ `scanOnce()` بدل تركيب `BarcodeCamera` مباشرة حين `isNativeScanPlatform()` — المسار الأصلي يعرض شاشته بنفسه (reticle + إلغاء + فلاش بتسميات اللوحة). على الويب مرّر `video` عنصر اللوحة كما هو.
2. **المسار اليدوي:** حقل إدخال دائم الظهور عند `not-found` / `network-error` / `permission-denied` / `no-camera` → `lookupManualBarcode(raw)`؛ حالة `invalid` تعرض سبب الرفض (`length`/`checksum`...) قبل أي شبكة، و`found` يسلّم `OffProduct` لنفس مسار إضافة الطعام؛ وعند `not-found` يبقى زر «أضِف الطعام يدويًا» (عقد `onManualAdd` القائم في `ScanFoodPanel`).
3. **لا تكتب في `qimmah:off:cache:v1` مباشرة** — `OFF_CACHE_KEY` مُصدَّر للقراءة/الاختبار فقط، والمفتاح مسجّل في `userDataKeys.ts` (device، غير مُصدَّر، غير مُزامَن).

## دليل اختبار الجهاز (device-only — لا يُثبت في CI)

1. ابنِ وزامن: `npm run build && npx cap sync ios`، ثم شغّل من Xcode على iPhone حقيقي.
2. امسح منتجًا حقيقيًا (EAN-13) — المتوقع: شاشة مسح أصلية، اهتزاز نجاح، ثم نتيجة OFF.
3. قارن المسارين من Safari Web Inspector على الجهاز:
   `window.__QIMMAH_SCAN_DIAG__.summary()` — سطر لكل محاولة: المحرّك (`native-avfoundation`/`zxing-web`)، المدة، الدقة، ROI، إطارات/FPS، الصيغة. **بيانات وصفية فقط** — لا قيمة الباركود ولا بكسلات (مفروض بالاختبار).
4. تحقّق من الفلاش (زر أصلي داخل الشاشة الأصلية) ومن الإلغاء ومن رفض الصلاحية (Settings → Privacy → Camera → off) — كلها تعيد `null` بحالة دقيقة دون تعليق.
5. UPC-A أمريكي: تأكد أن القيمة تصل بـ 13 خانة بصفر بادئ وأن OFF يجدها.

### مقارنة المسارين (تُملأ أرقامها من الجهاز)

| | ويب (zxing محسّن) | أصلي (AVFoundation) |
| --- | --- | --- |
| الفكّ | canvas مقصوص ROI ‏(90%×55%) + إطار كامل كل 4 دورات، حلقة 90ms، سقف 1440px | داخل النظام، `rectOfInterest` ‏(86%×32%) |
| الدقة | ‏1080p ideal + focus continuous/zoom حين تتاح | ‏`hd1920x1080` + `autoFocusRangeRestriction = .near` |
| الخصوصية | الإطارات لا تغادر الجهاز (grep مفروض) | الإطارات لا تصل JS أصلًا — القيمة النصية فقط تعبر الجسر |
| المتوقع على iPhone | أفضل من السابق، غير مضمون | القراءة القياسية للنظام — المرجع |

## الخصوصية (مفروضة بـ `test:barcode`)

- لا `fetch/XHR/WebSocket/sendBeacon` في ميزة الباركود خارج `openFoodFacts.ts`.
- لا `toDataURL/toBlob/getImageData/FormData` — لا تسلسل لأي إطار كاميرا.
- طلب OFF ‏GET خالص يحمل رقم الباركود فقط (`encodeURIComponent(barcode)`) — لا body.
- الإضافة الأصلية بلا أي شبكة (`URLSession/URLRequest` صفر ورود).
- التشخيص لا يلمس canvas/بكسلات، سعته آخر 20 محاولة، ولا يسجّل قيمة الباركود إطلاقًا.

## الترخيص

بيانات المنتجات من **Open Food Facts** (ODbL — الاستخدام التجاري مسموح مع نسب المصدر). لا مفاتيح API.

---

## تحديث P14 (تقوية الطبقة الأصلية)

راجع `docs/audit/P14-NATIVE-HARDENING.md §2`. قرار AVFoundation **أُعيد التحقّق منه وما
زال صحيحًا** (`CapApp-SPM/Package.swift` موجود، لا `Podfile` في `ios/App/`، ولا
`@capacitor-mlkit/*` في الاعتماديات؛ بناء Xcode حلّ ٦ إضافات عبر SPM حصرًا).

ما أُصلح:

- **شاشة سوداء عالقة عند غياب الكاميرا:** كانت الشاشة تُعرض ثم تحاول إغلاق نفسها أثناء
  حركة العرض (UIKit يتجاهل ذلك). الآن يُفحص توفّر الكاميرا **قبل** العرض، وأي نتيجة طرفية
  تقع قبل اكتمال العرض تُعاد من `viewDidAppear`.
- **الفلاش كان يُترك دون إطفاء صريح** — التفكيك الآن يُطفئه أولًا.
- **تفكيك حتمي لجلسة الالتقاط:** تصفير المفوَّض، إزالة المراقب، وإزالة المدخلات/المخارج —
  الجهاز يُحرَّر عند إغلاق الماسح لا عند تحرير الكائن.
- **التشخيص كان يخبّئ رفض الصلاحية تحت `error`** — `ScanOutcome` أضافت
  `'permission-denied' | 'no-camera'`، والمحرّكان يسجّلان الحالة الدقيقة.
- **حقول التشخيص الجديدة:** `path: 'native' | 'web'` و`torch: boolean` (مع
  `recordTorch()`، والإضافة الأصلية تُرجع `torchUsed` في كل نتيجة). قائمة السماح المضبوطة
  في `barcode-proof.ts` **وُسّعت لا خُفّفت**.
- **هدف اللمس:** أزرار الإلغاء/الفلاش كانت تعتمد على `contentEdgeInsets` (مهجورة من
  iOS 15 وتُتجاهل مع `UIButtonConfiguration`) للحشو الأفقي، وبقيد ارتفاع ٤٤ فقط — أُضيف
  قيد عرض ≥٤٤ لكليهما.

سطر التشخيص صار:
`#3 native(native-avfoundation) detected dur=1840ms res=1920x1080 roi=86%x32% frames=0 fps=— symbology=ean_13 torch=off`
