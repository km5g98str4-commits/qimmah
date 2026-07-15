# محرّك الإشعارات المحلية (Local Notifications)

نظام تذكيرات محلية كامل على الجهاز — بلا خادم، بلا Push، بلا بيانات مغادرة الجهاز.
مبني فوق `@capacitor/local-notifications@8.2.0` (مثبَّت ومُزامَن مسبقًا — لم تُضَف تبعية جديدة).

## البنية

```
src/lib/notifications/
  types.ts             أنواع خالصة (ReminderKind, NotificationPrefs, PlannedNotification…)
  copy.ts               نصوص الإشعارات (عربي فصيح، فعل أمر أولًا، PDF §02)
  prefs.ts               تخزين مملوك لكل حساب (qimmah:notifications:v1:<userId>)
  schedule.ts             رياضيات الجدولة الخالصة (بلا Capacitor) — قابلة للاختبار المباشر
  planWeek.ts              يقرأ الأسبوع الحقيقي من customization.routine (لا بيانات وهمية)
  supplementNames.ts        يقرأ أسماء المكمّلات/الأدوية الحقيقية من wellnessPlan
  engine.ts                الطبقة الأصلية الوحيدة (Capacitor.isNativePlatform + LocalNotifications)

src/views/NotificationsSettingsV2.tsx   شاشة الإعدادات (v2 Profile → الإعدادات → التذكيرات)
```

**الفصل المتعمَّد بين الخالص وغير الخالص:** `schedule.ts`/`prefs.ts`/`copy.ts` لا تستورد
Capacitor إطلاقًا — تُختبر مباشرة على Node (`scripts/notifications-proof.ts`) بلا محاكاة
منصّة أصلية. `engine.ts` وحده يلمس `@capacitor/local-notifications` (عبر dynamic import —
لا يدخل حزمة الويب).

## الأنواع الخمسة

| النوع | المصدر | التكرار |
|---|---|---|
| `workoutDay` | أيام التمرين الحقيقية من `customization.routine` (لا `src/data/routine.ts` — بيانات عرض ثابتة) | أسبوعي، لكل يوم تمرين |
| `restDay` | أيام الراحة من نفس الخطة (`type === 'rest'`) | أسبوعي، لكل يوم راحة |
| `water` | فتحات متكرّرة كل `cadenceHours` ساعة **داخل نافذة الهدوء** | يومي |
| `weeklyBrief` | يوم أسبوع واحد يختاره المستخدم | أسبوعي |
| `supplements` | تذكير يومي واحد؛ يذكر أسماء المكمّلات/الأدوية الحقيقية من `wellnessPlan` إن وُجدت | يومي |

لا مواعيد جرعة فردية لكل مكمّل/دواء — المشروع لا يخزّن مواعيد لكل عنصر (فقط أسماء)، فتذكير
واحد يوميًا يذكرها بالاسم بدل اختراع مواعيد غير موجودة.

## نطاقات المعرّفات (idempotent — لا تصادم مع `src/lib/reminders.ts`)

النظام القديم (`src/lib/reminders.ts`, تذكير تمرين واحد بسيط) يستخدم المعرّف `1001` ويبقى
كما هو — لم يُعدَّل. المحرّك الجديد يستخدم نطاقًا منفصلًا تمامًا:

| النوع | النطاق |
|---|---|
| `workoutDay` | 3100–3106 (معرّف لكل يوم أسبوع) |
| `restDay` | 3200–3206 |
| `water` | 3300–3311 (حتى 12 فتحة/يوم) |
| `weeklyBrief` | 3400 |
| `supplements` | 3500 |

`syncNotifications()` تُلغي **كل** معرّفات هذه النطاقات أولًا ثم تُعيد الجدولة من الصفر —
حتمي حقًا: لا تراكم، لا إشعارات يتيمة من تفضيل سابق أُطفئ.

## تدفّق الإذن

الإذن يُطلب **فقط** من نقرة صريحة على المفتاح الرئيسي في شاشة الإعدادات
(`NotificationsSettingsV2` → `onToggleMaster`). لا طلب إذن عند الإقلاع أو التنقّل إطلاقًا.
عند الرفض: `masterEnabled` يبقى `false` (لا وعد كاذب)، وتظهر ملاحظة صادقة توجّه لإعدادات
النظام لإعادة التفعيل.

## سلوك الويب

`Capacitor.isNativePlatform() === false` → كل دوال `engine.ts` تعود فورًا بلا أثر. شاشة
الإعدادات تُعرض بصدق: كل المفاتيح معطّلة + ملاحظة «متاح على التطبيق».

## عقود السلوك

- **تسجيل الخروج/الحذف/المسح يُلغي كل شيء ويمسح التفضيلات:** `resetQimmah.ts` يستدعي
  `cancelAllNotifications()` (بالإضافة لـ `cancelAllReminders()` القديم). `wipeUserData()`
  يمسح مفتاح `qimmah:notifications:v1:<userId>` تلقائيًا (بادئة `qimmah:` غير مدرجة في
  `GLOBAL_SAFE_KEYS`). خروج فعلي (`App.tsx`, uid حقيقي → null) يستدعي `cancelAllNotifications()`
  صراحةً — `syncNotifications` لا يعمل بلا uid فيُبقي الجدول القديم بدون هذا المسار.
- **تبديل الحساب يعيد الجدولة من تفضيلات الحساب الجديد:** أثر React في `App.tsx` يراقب
  `uid` ويستدعي `syncNotifications(uid, loadNotificationPrefs(uid))` عند كل تغيّر — تُلغي كل
  شيء أولًا (`engine.ts`) فتُنظَّف بقايا الحساب السابق تلقائيًا حتى بلا تسجيل خروج صريح.
- **جلسة الاستعادة لا تُجدوِل أبدًا:** كل من أثر المزامنة وأثر الخروج في `App.tsx` يتحقّقان
  من `auth.recoveryActive` ويتوقّفان مبكرًا أثناءها — جلسة `PASSWORD_RECOVERY` المؤقتة ليست
  حسابًا مستقرًا يستحق جدولة.

## التشغيل والاختبار

```bash
node scripts/run-notifications-proof.mjs
```

**للقائد:** أضف هذا السطر إلى `package.json` → `scripts` يدويًا (لم أُعدِّل `package.json`
بنفسي وفق التعليمات):

```json
"test:notifications": "node scripts/run-notifications-proof.mjs",
```

يغطّي الإثبات (45 فحصًا): رياضيات نافذة الهدوء (عادية + ملتفّة عبر منتصف الليل)، فتحات
الماء (معدّل × نافذة + حدّ أقصى)، بناء خطة كاملة من أسبوع حقيقي، إعادة الجدولة الحتمية
(idempotent — معرّفات متطابقة عبر استدعاءين، لا تصادم)، حساب الحدوث القادم (`nextOccurrence`
— التفاف أسبوعي ويومي، اليوم نفسه مقابل الأسبوع القادم)، عزل الملاك (حسابان متزامنان لا
يتداخلان)، المسح يُلغي كل شيء (wipe-cancels-all)، رفض الإذن = عدم تفعيل حقيقي، وتطهير بيانات
محفوظة تالفة/ناقصة (sanitize).

**ملاحظة بيئة:** الإثبات يغطّي الطبقة الخالصة (`schedule.ts`/`prefs.ts`/`copy.ts`) فقط —
`engine.ts` يلمس `@capacitor/local-notifications` فعليًا ولا يمكن اختباره على Node/CI بلا
جهاز أو Simulator حقيقي. التحقّق الفعلي من الجدولة/الإطلاق يتطلّب Simulator أو جهاز iOS —
انظر قسم «التحقّق على المحاكي» في تقرير التسليم.

## قرارات مُتَّخذة (تستحق مراجعة لاحقًا)

- **دمج مستقبلي محتمل مع `src/lib/reminders.ts`:** النظامان يتعايشان الآن بمعرّفات منفصلة.
  دمجهما (نقل `workoutDay` القديم البسيط إلى المحرّك الجديد) خارج نطاق هذه المهمة — يتطلّب
  قرار مالك (ترحيل تفضيلات مستخدمين حاليين من `qimmah:reminders:v1` غير المملوك لكل حساب).
- **لا Android:** كل الفحص هنا لـ iOS (نفس قيد `src/lib/reminders.ts` — Android يُراجَع لاحقًا).
  `engine.ts` نفسه لا يفرض قيد iOS صراحةً (يستخدم `Capacitor.isNativePlatform()` عمومًا كما
  طلبت المهمة)، لكن لم يُختبَر على Android فعليًا.
