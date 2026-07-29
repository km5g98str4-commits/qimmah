# تغطية المزامنة الفعلية — خريطة كاملة بعد P12 (موجة sync-coverage)

**الحالة:** المزامنة **مطفأة افتراضيًا** (`VITE_SYNC_ENABLED === 'true'` حصريًا)، ومحروسة بـ: مستخدم موثَّق مطابق لجلسة المزامنة + ليست جلسة استعادة + **ليست حالة تبنٍّ معلّق**. local-first: كل شيء يعمل دون إنترنت. المشغّلات: online / عودة الواجهة / appStateChange + بعد الترطيب.

**البرهان:** `npm run test:sync` (38) + `npm run test:sync-coverage` (56) — ضمن `test:gate`.

**السحابة (P14):** الجداول الأربعة الجديدة أدناه صار لها بيت فعلي في
`supabase/migrations/` مع RLS مالك-فقط وقيود شواهد القبر — وبرهان
`npm run test:db-schema` يوقف أي انحراف بين هذا الجدول والقاعدة. التفاصيل:
`docs/data/SUPABASE-P14-SCHEMA.md`. التفعيل ما زال قرار مالك منفصلًا.

## ما تتم مزامنته (13 جدولًا)

| الجدول | المخزن المحلي | المفتاح | الدقّة | طابع LWW | tombstone |
|---|---|---|---|---|---|
| `profiles` (data.onboarding) | `qimmah:onboarding:profile:v1` | user_id | صف واحد | `_meta.updatedAt` | — |
| `profiles` (data.settings) **P12** | `qimmah:customization:v1` (شريحة الحساب فقط) | user_id | صف واحد | `settingsUpdatedAt` | — |
| `workout_sessions` | historyStore | user_id,local_id | جلسة | `finishedAt`/`startedAt` | — |
| `exercise_history` | historyStore | user_id,exercise_id | تمرين | `lastCompletedAt` | — |
| `measurement_logs` | historyStore | user_id,local_id | قياس | `updatedAt` (القديم: `date`) | **نعم P12** |
| `daily_logs` (مجاميع يوميات+تغذية+ماء+مكملات+أدوية) | historyStore | user_id,date | شريحة/يوم | `updatedAt` لكل شريحة | — |
| `step_logs` | stepCounter | user_id,date | يوم | طابور | — (المستورَد الصحي لا يُرفع أصلًا) |
| `achievements` / `custom_plans` / `todos` | مخازنها | user_id | صف واحد | طابور (server-wins موثّق) | — |
| `nutrition_ledger` **P12** | `qimmah:nutritionHistory:v1` | user_id,date | يوم دفتر (قيوده كاملة) | أقصى (`addedAt`\|`updatedAt`) بين القيود | **نعم** |
| `recovery_logs` **P12** | `qimmah:recovery-log:v2` | user_id,date | فحص/يوم | `updatedAt` | — (لا مسار حذف في المخزن) |
| `workout_schedule` **P12** | `qimmah:workoutCalendar:v1` | user_id (صف واحد) | الجدول كاملًا | `updatedAt` الجدول | **نعم** (مسح الجدول) |
| `plan_templates` **P12** | `qimmah:planTemplates:v1` | user_id,local_id | قالب | `updatedAt` القالب | **نعم** |

**الحسم (كل الجداول):** LWW فعلي لكل سجل عبر `resolveLww` — المعلّق بطابور الرفع محلي أحدث بالتعريف؛ السحابي يفوز فقط بطابع أحدث تمامًا؛ التساوي/غياب الدليل ⇒ المحلي يبقى؛ **لا حذف صامت** — كل تراكب يُسجَّل `[qimmah-sync-conflict]` (metadata فقط، لا حمولات).

**المجاميع لم تتغيّر:** `daily_logs` يبقى كما هو حزمة المجاميع القانونية — صف `nutrition_ledger` يحمل التفصيل فقط، لا ازدواج مصدر.

## إعدادات الحساب (P12) — ما الذي يتبع الحساب؟

شريحة `AccountSettings` (customization.ts) هي **المُزامَن فقط** من التخصيص: identity (userName/mainGoal/userType)، إظهار الأقسام، profile، targets+targetsMeta، خطط التغذية/العافية/الالتزام/القياس. **تبقى على الجهاز:** brandName/tagline وألوان القالب، صفوف قالب v1 التسويقية، وworkoutPlan (مزامنتها عبر `custom_plans` — لا ازدواج مصدر)، وكل تفضيلات الجهاز العامة.

## خصوصية الصحة (مُنفَّذة ومُختبَرة)

- قياسات `source:'health'` (استيراد Apple Health): **لا تُرفع أبدًا** — مستبعدة من `saveMeasurementLog` وenqueueSnapshot، وحذفها لا يرفع قبرًا (لم تُرفع أصلًا). مصدر حقيقتها منصّتها.
- أيام خطوات `healthkit`/`google-fit`: مستبعدة من رفع `step_logs` (اليدوي و`external` يُزامنان).
- سجلّ التعافي: إشارات النبض/HRV داخله مدخلات قرار مشتقّة (current/baseline) لا عيّنات خام؛ عيّنات HealthKit الخام (store P9) وحالة الربط (`qimmah:healthkit:v1`) لا تُرفع إطلاقًا.

## شواهد القبر (P12) — `TOMBSTONE_TABLES`

`measurement_logs` · `nutrition_ledger` · `workout_schedule` · `plan_templates`: الحذف = **upsert صف شاهد قبر** بحمولة ممسوحة (خصوصية — المحذوف لا يبقى مقروءًا سحابيًّا) و`deleted_at = updated_at` كطابع LWW، عبر `enqueueSyncDelete` → `tombstoneRow`. النتيجة: المحذوف لا يُبعث على جهاز آخر بمزامنة أقدم، وتعديل **أحدث** من القبر يهزمه (سباق حذف/تعديل مختبَر) ويعيد إحياء الصف عند رفعه (`deleted_at:null`). باقي الجداول على الحذف المباشر الموروث الموثّق.

## إصلاح سباق كتّاب profiles (P12 — كان H1 في docs/audit/CODE-NOTES-FULL.md)

كان لعمود `profiles.data.onboarding` ثلاثة كتّاب بشكلين مختلفين، أحدهم يتجاوز الطابور. الآن **مسار قانوني واحد**: `enqueueOnboardingProfileUpsert` (الشكل الكامل + `_meta.updatedAt`) يمرّ به الحفظ المحلي وenqueueSnapshot وبوابة الإكمال (onboardingSync). الكتابة المباشرة الوحيدة الباقية: بوابة الإكمال حين تكون المزامنة مطفأة — بنفس الشكل الكامل ومحروسة بألا تدهس onboarding سحابيًّا أحدث طابعًا. الترطيب يكتب **بلا إعادة ختم** (إعادة الختم بـ«الآن» تزوّر LWW للأجهزة الأخرى). رفع transport للـprofiles يقرأ-يدمج-يكتب عمود `data` فلا تمسح كتابةُ `settings` مفتاحَ `onboarding` ولا العكس.

## ما لا تتم مزامنته اليوم (مقصود وموثّق)

| المخزن | القرار |
|---|---|
| `qimmah:personalFoods:v1` | لا يُزامَن بعد — قيود الدفتر تحمل ماكروزها كاملة فالتاريخ يصل الأجهزة؛ كتالوج الأطعمة الشخصية مرشّح موجة لاحقة |
| `qimmah:nutrition:v2` (أصناف اليوم الحي) | لا يُزامَن مباشرة — يصل عبر `nutrition_ledger` (التفصيل) و`daily_logs` (المجاميع) |
| `recovery-log:v1` | تقاعد لصالح v2 — v2 هو المُزامَن |
| تفضيلات جهاز عامة (لغة/ثيم/هابتكس `qimmah:prefs`، uiMode، workoutHydration، plates/warmup، تذكيرات، stepGoal/stepSource، handedness) | تبقى على الجهاز — تفضيل جهاز لا حساب |
| `active-workout:v2` / `workout-summary:v2` | حالة جلسة حيّة على جهازها |

## ما لا ينبغي مزامنته أبدًا

رمز الجلسة (`supabase-auth`) · طوابير/نسخ/meta المزامنة نفسها · عيّنات HealthKit الخام وحالة الربط · كاش OFF والمنتجات (عام قابل لإعادة الجلب) · أعلام الواجهة/التثبيت · `lastUser`/`dataOwner`/سجل الهجرات (محاسبة جهاز) · **الحجر** (`quarantine:*` — بيانات غير منسوبة يحظر رفعها بالتعريف).

## عقد حالة الواجهة (Codex) — `getSyncUiState()` (P12)

```ts
interface SyncUiState {
  state: 'local' | 'syncing' | 'synced' | 'attention'
  pendingCount: number          // عمليات طابور الرفع لمالك الجلسة (0 للضيف/المعطَّل)
  lastSyncedAt: string | null   // null قبل أول نجاح فعلي — لا ادّعاء أبدًا
  reason?: 'sync-disabled' | 'signed-out' | 'never-synced'
         | 'adoption-pending' | 'repeated-failures' | 'retry-exhausted'
}
```

- **`synced` لا تُدّعى إلا** والطابور فارغ **و**آخر دفعة نجحت فعلًا (`lastResult==='success'`).
- **`attention`**: تبنٍّ معلّق، فشل متكرر (≥`SYNC_ATTENTION_ATTEMPTS`=3)، أو استنفاد المحاولات (≥`MAX_SYNC_ATTEMPTS`=8) — علاجه اليدوي `retryExhaustedSyncOperations(userId)` (يصفّر المجمّد ويعيد جدولته فورًا؛ `hasExhaustedSyncOperations` للاستعلام).
- **`syncing`**: flush/ترطيب جارٍ أو عمليات منتظرة. **`local`**: مطفأة/ضيف/لم تنجح مزامنة بعد — البيانات محلية موثوقة.

## إعادة المحاولة (متحقَّق منها)

Backoff أُسّي `1s·2^n` بسقف 5 دقائق؛ بعد `MAX_SYNC_ATTEMPTS = 8` تتجمّد العملية (`nextAttemptAt = MAX_SAFE_INTEGER`) — **تبقى بالطابور (لا فقدان)** ولا تلمس الشبكة حتى إجراء المستخدم اليدوي. الحالة تُطبع `attention/retry-exhausted`.
