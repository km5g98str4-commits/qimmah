# باني الجدول اليدوي (P6) — العقد المكتوب

**الوحدتان:** `src/features/customPlan/builder.ts` (المحرّك — منطق فقط، بلا واجهة) و`src/features/customPlan/templates.ts` (تخزين القوالب المسمّاة) · **المفتاح الجديد:** `qimmah:planTemplates:v1` (مسجّل في `userDataKeys.ts`، يُمسح عند تبديل الحساب، مُصدَّر عبر سجلّ النقل، **غير مزامَن** — انظر عقد المزامنة أدناه) · **الإثبات:** `npm run test:plan-builder` (٦٢ فحصًا).

## المبدأ

دوال **نقيّة** فوق `WorkoutPlan` (النوع القائم في `src/types/workout.ts`): كل عملية تُرجع نسخة جديدة + نتيجة مُصنَّفة — لا تعديل في المكان، ولا كتابة تخزين خفية. الاستثناءان الوحيدان المكتوبان صراحةً:

1. **القوالب المسمّاة** (`templates.ts`) تُقرأ/تُكتب تحت `qimmah:planTemplates:v1` (سجلّ واحد مفتاحه معرّف المالك، `'guest'` للضيف — نمط `customPlan/storage` نفسه).
2. **ترقيع تقويم P4** (`applyCalendarDayRemoval`) يكتب عبر `saveWeeklySchedule` (يمرّ على حارس الاستشفاء دائمًا).

الحفظ الفعلي للخطة يبقى شأن `saveCustomPlan` القائم (P2.5) — الباني لا يستبدله.

## نتائج مُصنَّفة (كل الأخطاء والتحذيرات ثنائية اللغة ar/en)

```ts
type PlanResult =
  | { status: 'ok'; plan: WorkoutPlan }
  | { status: 'rejected'; errors: BuilderError[] }
// BuilderError.code:
// 'day-not-found' | 'exercise-not-in-library' | 'plan-exercise-not-found'
// | 'invalid-name' | 'invalid-prescription' | 'index-out-of-range'
// | 'max-days' | 'max-exercises' | 'week-duplicate-overflow' | 'same-day'
// | 'template-not-found' | 'max-templates' | 'empty-template'
```

## سطح الـAPI

```ts
// — الإنشاء والإضافة —
createManualPlan(name?: { ar?; en? }): WorkoutPlan          // templateId:'custom'، أيام فارغة
addDay(plan, type: DayType, label?: { ar?; en? }): PlanResult
// DayType: push|pull|legs|upper|lower|chest|back|shoulders|arms|full_body|core|custom
// DAY_TYPE_LABELS يعطي التسمية الافتراضية ثنائية اللغة؛ label يتجاوزها.
addExerciseFromLibrary(plan, dayId, exerciseId, { sets?, reps?, restSec? }?): PlanResult
// يرفض معرّفًا خارج مكتبة data/exercises؛ الوصفة فوق افتراضيات createPlanExercise.
// حدود: sets 1–10 · reps نصّ غير فارغ · rest 0–600ث · MAX_PLAN_DAYS=7 · MAX_EXERCISES_PER_DAY=15

// — الترتيب والنقل —
reorderExercise(plan, dayId, from, to): PlanResult           // داخل اليوم؛ order يُعاد ترقيمه
moveExerciseToDay(plan, fromDayId, rowId, toDayId, toIndex?): PlanResult

// — النسخ —
duplicateDay(plan, dayId): PlanResult        // نسخة تُلحق بالنهاية (معرّفات صفوف جديدة)
copyDayAs(plan, sourceDayId, targetDayId): PlanResult
// «علوي → يوم آخر»: تمارين الهدف تُستبدل؛ معرّف الهدف واسمه يبقيان (فلا ينكسر التقويم)
duplicateWeek(plan): PlanResult              // A/B: ٣ أيام → ٦؛ يُرفض إن تجاوز ٧

// — الحذف الآمن —
removeDay(plan, dayId): RemoveDayResult
// { status:'ok', plan, removedIndex, calendarPatch } — نقيّ؛ لا يلمس التخزين.
applyCalendarDayRemoval(patch): ApplyCalendarPatchResult
// يُستدعى **فقط** بعد حفظ الخطة المعدَّلة خطةً فعّالة (saveCustomPlan) — مسودّة لا تمسّ التقويم.
// تخصيص أسبوع == الفهرس المحذوف → 'rest' (يُبلَّغ في clearedWeekdays)؛
// الفهارس الأعلى تنزاح ١-؛ overrides تُعامل بنفس القاعدة؛ الحفظ عبر الحارس.
removeExercise(plan, dayId, rowId): PlanResult
cleanSubstitutionMap(subs: Record<rowId, exerciseId>, plan): Record<string, string>
// خريطة الاستبدال (شاشة 31) حالة جلسة في الواجهة — تستدعي هذا بعد أي حذف/نقل.
planReferenceViolations(plan): string[]      // فحص شامل للاختبارات/الاستيراد

// — القوالب المسمّاة (لكل مالك) —
saveTemplate(userId, { ar, en? }, plan): TemplateResult   // يرفض اسمًا فارغًا/خطة بلا تمارين؛ MAX_TEMPLATES=20
listTemplates(userId): PlanTemplate[]                      // مطبَّعة؛ التالف يُسقط بصمت
applyTemplate(userId, templateId): PlanResult              // نسخة عميقة — لا يكتب؛ الحفظ عبر saveCustomPlan
deleteTemplate(userId, templateId): boolean

// — المحقّقات (تحذيرات لا موانع — لا تمنع أبدًا) —
estimateSessionMinutes(day): number   // نفس heuristic النماذج: ٩ د/تمرين، تقريب ٥، أدنى ٢٠
validatePlan(plan, { level?, targetSessionMinutes? }?): PlanWarning[]
// PlanWarning.code: 'session-too-long' | 'empty-day' | 'low-muscle-volume' | 'high-muscle-volume'
// الحجم الأسبوعي بقاعدة muscleCoverage: أساسية ١٫٠ × مجموعات، ثانوية ٠٫٥؛ إفراط > ١٫٢٥ × الأقصى.
```

## قرارات ثابتة (لا تكسرها الواجهة)

- **معرّفات حتمية بلا عشوائية**: أيام `custom-day-N` (أكبر لاحقة + ١)، صفوف `<dayId>-<exerciseId>-<order>` مع لاحقة تفرّد عند التصادم. `order` = الفهرس دائمًا.
- **التوافق الخلفي**: `WorkoutPlan.nameAr/nameEn` حقلان اختياريان جديدان — سجلات `customPlan` القديمة بلا اسم تبقى صالحة كما هي، **فلا هجرة مطلوبة** (مُثبَت في الإثبات ⑧). أي تغيير شكل مستقبلي غير متوافق يمرّ عبر `runMigration` من `dataOwnership`.
- **`removeDay` نقيّ والترقيع صريح**: الواجهة تقرّر متى تطبّق `calendarPatch` (بعد الحفظ الفعّال فقط). هذا يمنع مسودّة تحرير من تخريب تقويم الخطة الحالية.
- **المحقّقات لا تمنع**: تُرجع تحذيرات مُصنَّفة للعرض؛ الحفظ لا يُشترط بخلوّها.

## التصدير/الاستيراد (سجلّ النقل)

متجر جديد `planTemplates` في `src/lib/portability/registry.ts` (`kind:'ownerMap'`) — التصدير يلتقط قوالب المالك، والاستيراد يمرّ على allowlist المخطّط v1 نفسه (لا مفاتيح خام مجهولة). جولة كاملة تصدير → مسح → استيراد مُثبَتة (الإثبات ⑦).

## عقد مزامنة القوالب (موثّق **دون بنائه** — template-sync)

القوالب اليوم محلية فقط (`synced:false` في `userDataKeys`). حين تُبنى المزامنة:

- جدول مقترح `plan_templates`: `(user_id uuid, template_id text, name_ar text, name_en text?, plan jsonb, created_at timestamptz, updated_at timestamptz, primary key (user_id, template_id))` + RLS `user_id = auth.uid()`.
- الدفع عبر `syncQueue` القائم بنمط LWW على `updated_at` (نفس عقد `custom_plans`).
- التطبيع عند القراءة يبقى في العميل (`normalizeTemplate`) — الخادم لا يُوثَق شكله.

## عقد الواجهة (لـ Codex — الواجهة ليست ضمن P6)

1. شاشة الباني تعمل على **مسودّة** `WorkoutPlan` في حالة الواجهة؛ كل زر يستدعي دالة محرّك ويستبدل المسودّة عند `ok` ويعرض `errors[].messageAr` عند `rejected`.
2. الحفظ = `saveCustomPlan(userId, draft)` ثم — إن حُذفت أيام مقارنةً بالخطة الفعّالة السابقة — `applyCalendarDayRemoval(patch)` لكل حذف بترتيب وقوعه، ثم `cleanSubstitutionMap` لحالة الاستبدال الحيّة.
3. تحذيرات `validatePlan` تُعرض شارات/تنبيهات غير مانعة (لون تحذير، لا تعطيل زرّ الحفظ).
4. القوالب: زرّ «حفظ كقالب» → `saveTemplate`؛ قائمة القوالب → `listTemplates`؛ «استخدام» → `applyTemplate` ثم مسار الحفظ نفسه.

## حدود P6 المعروفة

- الحجم العضلي يُحسب بافتراض أداء كل أيام الخطة مرّة واحدة أسبوعيًّا (لا يقرأ تقويم P4 لتكرار الأيام).
- لا واجهة، ولا مزامنة قوالب (عقد موثّق أعلاه فقط).
- `cleanSubstitutionMap` يخدم حالة جلسة الواجهة فقط — لا مفتاح تخزين للاستبدال.
