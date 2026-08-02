# أساس HealthKit الواسع (P9) — `claude/healthkit-foundation-v1`

طبقة قراءة صحية/لياقية واسعة من تطبيق «صحة» — **قراءة فقط، بلا سجلّات سريرية،
بطلب تفويض واحد مجمّع** بعد شاشة فائدة صريحة (قرار المالك).

## القرارات الحاكمة

| القرار | التفصيل |
|---|---|
| طلب واحد مجمّع | `requestAllHealthAccess()` يمرّر كل المقاييس المدعومة في نداء `requestAuthorization` واحد → ورقة iOS واحدة. يُستدعى **فقط** من فعل مستخدم صريح بعد شاشة الفائدة — أبدًا عند الإقلاع (برهان). |
| قراءة فقط | قائمة الكتابة `toShare` في السويفت `[]` حرفيًا، و`HEALTH_WRITE_TYPES = []` في الكتالوج. قِمّة لا يُنشئ أي بيانات صحية اليوم؛ أي إضافة كتابة تتطلّب قرار مالك موثّقًا. لا `NSHealthUpdateUsageDescription` في Info.plist. |
| لا سجلّات سريرية | لا `HKClinicalType` إطلاقًا — المقاييس أدناه حصرية. |
| صدق الرفض | iOS يخفي رفض قراءة نوع ما؛ النتيجة الفارغة تعني «لا بيانات **أو** مرفوض». حالة المقياس المعروضة إحدى ثلاث فقط: `not-connected` / `has-data` / `unknown-or-denied` — **لا توجد حالة `denied`** في أي واجهة. |
| بديل يدوي | الإدخال اليدوي لكل مقياس يبقى في متجره الأصلي (خطوات/قياسات/…) ولا يتأثر بأي اتصال أو فصل. |
| فصل لكل مقياس | `disconnectMetric(m)` يطهّر كل عيّنات المقياس المستوردة + مرساته من `qimmah:health:samples:v1` (نمط التطهير الموسوم بالمصدر) — اليدوي لا يُمسّ. |
| تاريخ محدود | استعلامات مرسّاة (anchored) مقسّمة صفحات؛ النافذة الافتراضية ٩٠ يومًا (حد أقصى ٣٦٥). |
| خصوصية | لا قيمة صحية تمرّ إلى `track()` — حارس grep في البرهان يمنع النداء والاستيراد بالاتجاهين. **بيانات الصحة لا تُستخدم في إعلانات ولا تُشارك مع أي طرف** (App Review Guideline 27.3 — لا استخدام إعلاني لبيانات HealthKit). متجر العيّنات محلي، لا يُصدَّر ولا يُزامَن. |

## الأنواع المقروءة (27 مقياسًا — القائمة الكاملة)

| المجموعة | المقاييس (وحدة الأساس) |
|---|---|
| قياسات الجسم | height (م) · bodyMass (كجم) · bodyFatPercentage (كسر) · leanBodyMass (كجم) |
| النشاط | steps · distanceWalkingRunning (م) · flightsClimbed · activeEnergyBurned (سعرة) · basalEnergyBurned (سعرة) · appleExerciseTime (د) · appleStandTime (د) · workouts |
| القلب | heartRate · restingHeartRate · walkingHeartRateAverage (نبضة/د) · heartRateVariabilitySDNN (مللي ثانية) · vo2Max (مل/كجم/د) · heartRateRecoveryOneMinute† |
| النوم | sleepAnalysis بمراحله (inBed/asleep/awake/core/deep/rem) |
| العلامات الحيوية | respiratoryRate (نفس/د) · oxygenSaturation (كسر) · appleSleepingWristTemperature† (°م) |
| التغذية (ما سجّلته تطبيقات أخرى) | dietaryWater (مل) · dietaryEnergyConsumed (سعرة) · dietaryProtein/Carbohydrates/FatTotal (غ) |

† متاح من iOS 16 فقط — `supportedMetrics()` في الجسر يرشّح تلقائيًا، فلا يُطلب نوع
غير موجود على الجهاز.

**أنواع الكتابة: لا شيء.** (جدول فارغ عمدًا — انظر «القرارات الحاكمة».)

## نص الغرض (Purpose string) — الأساس المنطقي ثنائي اللغة

`NSHealthShareUsageDescription` حُدّث ليغطي المجموعة الموسّعة بصدق:

- **بالعربية:** يذكر المجموعات كلها (النشاط، قياسات الجسم، القلب، النوم ومراحله،
  العلامات الحيوية، التغذية)، ويقرّ صراحة: قراءة فقط، لا مشاركة، لا إعلانات،
  الفصل يحذف المستورد، اليدوي متاح دائمًا.
- **In English:** Qimmah reads Health data (activity, body measurements, heart,
  sleep, vitals, nutrition) after one clear consent request, to honestly show
  progress inside the app only. Read-only; never shared; never used for ads;
  disconnecting a metric deletes its imported data; manual entry always works.

الجملتان معًا في نفس المفتاح (نمط مفتاح الكاميرا الحالي) — لا ادعاء بميزة غير
منفَّذة ولا إخفاء لنوع مقروء.

## البنية

```
ios/App/App/HealthKitStepsPlugin.swift  الجسر: supportedMetrics · requestAuthorization(مجمّع)
                                        getQuantitySamples/getSleepSamples/getWorkouts (مرسّاة/صفحات)
src/lib/health/metrics.ts               كتالوج المقاييس: وحدات الأساس/العرض، ثنائي اللغة، write=[]
src/lib/health/normalize.ts             تطبيع + ختم اليوم + حفظ المصدر + إزالة تكرار (UUID ثم مفتاح مركّب)
src/lib/health/store.ts                 متجر العيّنات qimmah:health:samples:v1 + مراسي + تطهير لكل مقياس
src/lib/health/connect.ts               الطلب المجمّع + المزامنة + الحالة الصادقة + عقد شاشة الإعدادات
src/lib/healthKit.ts                    الجسر القديم (خطوات/وزن/نبض لحظي) — يبقى كما هو للتوافق
```

مفاتيح التخزين: `qimmah:health:samples:v1` (عيّنات + مراسي) ·
`qimmah:health:connection:v1` (حالة الطلب/التفعيل/آخر مزامنة) ·
`qimmah:healthkit:v1` (الجسر القديم — لم يتغيّر).

## عقد Codex (شاشة الفائدة + شاشة الإعدادات — الشاشات ليست ضمن هذه الموجة)

```ts
import {
  requestAllHealthAccess,   // زرّ «ربط تطبيق صحة» في شاشة الفائدة — مرة واحدة
  hasRequestedHealthAccess, // هل عُرضت الورقة من قبل؟ (لإخفاء الزر)
  syncAllEnabled,           // تحديث آمن (لا يفتح ورقة) — عند فتح الشاشة/العودة
  syncMetric,               // تحديث مقياس واحد عند الطلب
  healthConnectionSummary,  // صفوف شاشة الإعدادات: MetricConnectionRow[]
  metricDataState,          // 'not-connected' | 'has-data' | 'unknown-or-denied'
  disconnectMetric,         // فصل + تطهير المستورد (اليدوي لا يُمسّ)
  reconnectMetric,          // إعادة تفعيل بعد الطلب — لا ورقة جديدة
} from '@/lib/health/connect'
import { samplesFor, storedSampleCounts } from '@/lib/health/store'
import { toDisplay, dailySeries } from '@/lib/health/normalize'
```

قواعد العرض الملزمة للشاشة:
1. `unknown-or-denied` تُعرض «لا بيانات متاحة — تأكد من أذونات صحة» — **ممنوع** «رفضت الوصول».
2. لكل مقياس بديل يدوي ظاهر دائمًا.
3. زر الطلب المجمّع يظهر بعد شاشة فائدة تشرح الاستخدام — لا طلب عند الإقلاع.

## البرهان والبوابات

- `npm run test:health-foundation` — **51 فحصًا**: الطلب المجمّع الواحد وترشيح
  iOS 16 · التطبيع/الوحدات/إزالة التكرار · المرساة والصفحات ونافذة ٩٠ يومًا ·
  صدق unknown-or-denied · تطهير الفصل لكل مقياس · قائمة كتابة فارغة (سويفت +
  كتالوج + plist) · حارس الخصوصية (grep بالاتجاهين).
- مُسجَّل في `test:gate` (إلحاق فقط).
- `npx cap sync ios` يمرّ. **ملاحظة صادقة:** بناء Xcode الكامل للسويفت لم يُنفَّذ
  في هذه البيئة (يتطلب توقيع/محاكي) — يُتحقق منه على جهاز المالك، مثل موجات
  الجسر السابقة.

---

## تحديث P14 (تقوية الطبقة الأصلية)

راجع `docs/audit/P14-NATIVE-HARDENING.md §1` للتفصيل. ما تغيّر في هذا العقد:

- **صدق الرفض صار مفروضًا في الجسر نفسه:** الجسر لم يكن يلتزم بالقاعدة — كان يعيد
  `"permission": "denied"` في ثلاثة مسارات (فشل الطلب المجمّع، وفشل استعلام الخطوات،
  وفشل قراءة أحدث عيّنة). كلها الآن `"unknown"`، و`HealthKitPermission` في TS أضافت
  `'unknown'` (و`'denied'` باقية للتوافق مع حالات مخزّنة قديمة فقط، ولا يُنتجها أي كود).
  البرهان يفرض **صفر** ورود لـ`"permission": "denied"` في السويفت.
- **النسخة المعروضة:** `nativeSettings.denied` كانت تقول «ما انعطى الإذن» — ادّعاء رفض
  لا يمكن للتطبيق معرفته. أُعيدت صياغتها باللغتين، وأُضيف مفتاح `unknown` بنفس المعنى.
- **حلقة الصفحات:** صفحة تقول `hasMore` بلا مرساة جديدة كانت تُعاد ٨ مرّات — الآن تتوقّف.
- **`hasMore`** يُحسب من عدد العيّنات المُعادة لا من عدد الصفوف بعد التحويل (كان يقتطع
  التاريخ بصمت).
- **سجل المفاتيح:** `qimmah:health:samples:v1` و`qimmah:health:connection:v1` لم تكونا
  مسجّلتين في `userDataKeys.ts` — سُجّلتا الآن (`user`, غير مُصدَّرة، غير مُزامَنة).
- **جديد — تشخيص بيانات وصفية فقط:** `src/lib/health/diagnostics.ts` +
  `healthDiagnosticsReport()` / `healthDiagnosticsText()` +
  `window.__QIMMAH_HEALTH_DIAG__`. لكل مقياس: `{requested, enabled, hasData, lastQueryMs,
  lastStatus, sampleCount, lastPages, unitUsed, source}` — **ولا قيمة صحية واحدة**
  (مفروض ببرهانين: grep + فحص تسلسل).
- **البرهان:** `npm run test:native-hardening` (٩٣ فحصًا) — مُسجَّل في `test:gate`.
- **بناء Xcode للمحاكي نجح** في P14 (Xcode 26.6)، فسويفت تُترجم فعلًا. الجهاز الحقيقي
  ما زال غير متحقَّق — `docs/audit/DEVICE-NOT-VERIFIED.md §①`.
