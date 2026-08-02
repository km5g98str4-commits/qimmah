# دفتر التغذية المؤرَّخ + الجرامات (P7) — العقد المكتوب

**الوحدة:** `src/lib/nutritionHistory.ts` (+ خطّافان في `src/lib/nutritionV2Model.ts`: استدعاء `recordLedgerDay` داخل `persist`، ودالة `updateFoodInDay`) · **المفتاحان الجديدان:** `qimmah:nutritionHistory:v1` و`qimmah:personalFoods:v1` (مسجّلان في `userDataKeys.ts`، يُمسحان عند تبديل الحساب، مُصدَّران عبر سجلّ النقل بنمط `ownerMap`، **غير مزامَنين** — انظر عقد المزامنة أدناه) · **الإثبات:** `npm run test:nutrition-history` (٦١ فحصًا).

## المشكلة والحل

المتجر القانوني لليوم (`qimmah:nutrition:v2`) **يوم-فقط**: يومٌ جديد يكتب فوق أصناف الأمس، ولا يبقى من الماضي إلا مجاميع `historyStore.nutritionLogs` (سعرات/ماكروز بلا أصناف). P7 يضيف **دفترًا مؤرَّخًا لكل مالك** يُكتب من مسار الكاتب الواحد نفسه — `nutritionV2Model.persist` يستدعي `recordLedgerDay(day)` بعد كل كتابة (best-effort مثل مرآة المجاميع) — فيبقى تفصيل كل يوم (الصنف/الوجبة/الكمية/الماكروز) مقروءًا بعد انقضائه. **الترحيل اليومي لا يفقد تفصيلًا بعد الآن.**

## مبادئ صارمة (الصدق أولًا)

1. **لا تفصيل مُختلَق للماضي**: الدفتر يبدأ من لحظة تفعيل P7 (تهيئة `runMigration` بمعرّف `nutrition-history-init-v1` — تبذر **أصناف اليوم الحالي الموجودة فعلًا** فقط). الأيام الأقدم تبقى «مجاميع فقط» وتُوسم `{estimated: true}` في الإحصاءات.
2. **لا جرامات مُخترعة**: عنصر بلا `servingGrams` هو «حصص-فقط» — تحويله جرامات يعيد `null`، وإدخال جرامات له يُرفض (`serving-only-item`).
3. **كمية فارغة تُرفض** (`empty-quantity`) — لا قيمة افتراضية صامتة. جرامات + حصص معًا تُرفض (`ambiguous-quantity`).
4. **`getDayStamp` في كل حساب يوم** — الإثبات يعبر حدود اليوم بساعة مُزيَّفة.
5. **احتفاظ ~٩٠ يومًا** (`HISTORY_RETENTION_DAYS`): التفصيل الأقدم يُشذَّب عند الكتابة؛ المجاميع القانونية في `historyStore` تبقى كما هي.
6. **localStorage مدخل معادٍ**: التالف لا يرمي؛ القيد المشوّه يُسقط بصمت والسليم يُطبَّع.

## الشكل المخزَّن (Schema)

```ts
// qimmah:nutritionHistory:v1 — سجلّ واحد: معرّف المالك ('guest' للضيف) → تاريخ → قيود
Record<ownerId, Record<'YYYY-MM-DD', NutritionEntry[]>>

interface NutritionEntry {
  id: string
  foodId?: string            // مرجع عنصر مكتبة foodItems إن سُجّل منها (يتيح إعادة الحساب)
  nameAr: string
  nameEn?: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  quantity: { grams?: number; servings?: number }  // المدخل + المشتق حين يمكن التحويل
  unit: 'g' | 'serving'      // وحدة الإدخال الأصلية
  macros: { calories: number; protein: number; carbs?: number; fat?: number }
  addedAt: string            // ISO
}

// qimmah:personalFoods:v1 — سجلّ واحد: معرّف المالك → أطعمة يدوية محفوظة
Record<ownerId, PersonalFood[]>  // { id:'pf-N', nameAr, nameEn?, grams, calories, protein, carbs, fat, createdAt }
// MAX_PERSONAL_FOODS = 200
```

`LoggedFood` (المتجر الحيّ) اكتسب حقولًا اختيارية متوافقة خلفيًّا: `foodId? / grams? / servings? / unit?` — سجلّات أقدم بلا كمية تبقى صالحة كما هي (لا هجرة شكل).

## سطح الـAPI

```ts
// — القراءة —
getDayEntries(date): NutritionEntry[]        // يوم بلا تفصيل ⇒ [] (لا اختلاق من المجاميع)
loadLedgerDays(userId): Record<date, NutritionEntry[]>   // لسجلّ النقل (معرّف صريح، null = ضيف)

// — التحويل جرامات ↔ حصص (قيم العنصر لحصة واحدة؛ جراماتها servingGrams) —
gramsForServings(food, servings): number | null   // null = حصص-فقط (لا اختراع)
servingsForGrams(food, grams): number | null
resolveFoodQuantity(food, { grams? | servings? }): QuantityResolution
// ok ⇒ { unit, quantity, macros, gramsPerServing: number|null } — كسور 0.25/0.5/1.5/عشري كلها مقبولة
// rejected ⇒ empty-quantity | ambiguous-quantity | invalid-quantity | serving-only-item

// — التعديل وإعادة الحساب الصادقة —
editEntry(id, { quantity }): EntryResult
// قيد بمرجع مكتبة ⇒ الحساب من بيانات العنصر (resolveFoodQuantity)
// قيد يدوي/بلا مرجع ⇒ قياس نسبي على كميته الحالية بنفس البُعد فقط؛ لا أساس ⇒ رفض quantity-unknown
// قيد اليوم ⇒ عبر المتجر الحيّ (updateFoodInDay — الكاتب الواحد يحدّث الدفتر والمجاميع معًا)
// قيد ماضٍ ⇒ الدفتر + مجاميع يومه القانونية (saveNutritionLog)
removeEntry(id): { status:'ok', date } | rejected     // نفس تقسيم اليوم/الماضي
copyMealToToday(date, slot): { status:'ok', copied } | rejected('nothing-to-copy')
// عبر addFoodToDay — معرّفات جديدة، نفس الأصناف والكميات والماكروز

// — الطعام اليدوي + الأطعمة الشخصية —
createManualFood({ nameAr, nameEn?, grams, calories, protein, carbs, fat, meal? }, { saveToPersonal? })
// يسجّل لليوم عبر addFoodToDay **ويحفظ في الأطعمة الشخصية افتراضيًا** (saveToPersonal:false = تعطيل لمرة)
// رفض invalid-manual-food: اسم فارغ / جرامات ≤ 0 / ماكرو سالب أو غير منتهٍ
listPersonalFoods(userId?): PersonalFood[]   // بلا وسيط = المالك الحالي
deletePersonalFood(id): boolean

// — الإحصاء الأسبوعي الصادق —
getWeeklyNutritionStats(endDate?): DayNutritionStat[]   // ٧ أيام، الأقدم أولًا
// source: 'entries' (تفصيل فعلي) | 'totals' (مجاميع قديمة، estimated:true) | 'none' (أصفار)
```

كل الأخطاء `HistoryError` ثنائية اللغة (`messageAr` / `messageEn`).

## قرارات ثابتة (لا تكسرها الواجهة)

- **الكاتب الواحد**: يوم الدفتر الحالي يُكتب **حصريًّا** من `nutritionV2Model.persist`. الواجهة لا تكتب مفتاح الدفتر مباشرة أبدًا؛ تعديل/حذف قيد اليوم يمرّ عبر `editEntry`/`removeEntry` (اللذين يمرّان بالمتجر الحيّ) — فيبقى المتجر الحيّ والدفتر والمجاميع القانونية متطابقين دائمًا.
- **دورة الاستيراد محسوبة**: `nutritionV2Model` يستورد `recordLedgerDay` و`nutritionHistory` يستورد دوال المتجر الحيّ — كل الاستدعاءات داخل الدوال (وقت التشغيل)، لا في مستوى الوحدة.
- **المجاميع القانونية تبقى المصدر المزامَن**: `historyStore.nutritionLogs` (عبر `daily_logs`) لم يتغيّر عقدها — الدفتر طبقة تفصيل محلية فوقها.
- **التهيئة init فقط**: `runMigration('nutrition-history-init-v1')` idempotent (سجلّ `qimmah:migrations:v1`) — لا تُعاد، ولا تُنشئ ماضيًا.

## عقد مزامنة الدفتر (موثّق **دون بنائه**)

الدفتر والأطعمة الشخصية اليوم محليان فقط (`synced:false`). مجاميع الأيام تُزامَن أصلًا عبر `daily_logs` القائم — لا ازدواج. حين تُبنى مزامنة التفصيل:

- جدول مقترح `nutrition_entries`: `(user_id uuid, entry_id text, day date, food_id text?, name_ar text, name_en text?, meal text, grams numeric?, servings numeric?, unit text, calories int, protein numeric, carbs numeric?, fat numeric?, added_at timestamptz, primary key (user_id, entry_id))` + RLS `user_id = auth.uid()`.
- الدفع عبر `syncQueue` القائم بنمط LWW على مستوى القيد (لا مستوى اليوم — تعديل قيد واحد لا يسحق يومًا كاملًا من جهاز آخر).
- جدول مقترح `personal_foods`: `(user_id uuid, food_id text, name_ar text, name_en text?, grams numeric, calories int, protein numeric, carbs numeric, fat numeric, created_at timestamptz, primary key (user_id, food_id))` + RLS.
- التطبيع عند القراءة يبقى في العميل (`normalizeEntry` / `normalizePersonalFood`) — الخادم لا يُوثَق شكله.

## عقد الواجهة (لـ Codex — الواجهة ليست ضمن P7)

1. **شاشة سجلّ الأيام**: قائمة تواريخ من `getWeeklyNutritionStats` (أو نطاق أوسع عبر `getDayEntries` لكل تاريخ) — يوم `source:'entries'` يفتح تفصيله؛ يوم `estimated:true` يُعرض «مجاميع فقط» بشارة تقديري **بلا** قائمة أصناف مُختلَقة؛ `none` يوم فارغ.
2. **تفصيل يوم ماضٍ**: `getDayEntries(date)` مجمّعة بالوجبة؛ زر «انسخ الوجبة لليوم» → `copyMealToToday(date, slot)` وعرض `errors[].messageAr` عند الرفض.
3. **محرّر كمية**: حقلا جرامات/حصص مرتبطان عبر `gramsForServings`/`servingsForGrams` حين `gramsPerServing !== null`؛ عنصر حصص-فقط يُظهر حقل الحصص وحده (لا حقل جرامات معطّلًا بقيمة مُخترعة). الحفظ → `editEntry(id, { quantity })` — بُعد واحد فقط في الطلب.
4. **إضافة من المكتبة**: `resolveFoodQuantity(item, input)` ثم `addFoodToDay({ ...macros, foodId, grams, servings, unit })` — مرّر `foodId` والكمية دائمًا كي يبقى القيد قابلًا لإعادة الحساب.
5. **طعام يدوي**: نموذج (اسم/جرامات/ماكروز) → `createManualFood` — يُحفظ شخصيًّا افتراضيًا؛ مفتاح تبديل «احفظ في أطعمتي» يمرّر `saveToPersonal:false` عند إيقافه. قائمة «أطعمتي» → `listPersonalFoods()` + `deletePersonalFood`.
6. **الرسائل ثنائية اللغة**: اعرض `messageAr` في العربية و`messageEn` في الإنجليزية — لا نصوص أخطاء مكتوبة في الواجهة.

## حدود P7 المعروفة

- الدفتر يبدأ من التفعيل — لا استرجاع تفصيل لأيام ما قبله (قرار صدق، لا نقص).
- تفصيل أقدم من ~٩٠ يومًا يُشذَّب (المجاميع تبقى بلا حدّ عبر `historyStore`).
- لا واجهة، ولا مزامنة تفصيل (عقد موثّق أعلاه فقط).
- المنتجات الممسوحة بالباركود خارج مكتبة `foodItems` — قيودها تُعدَّل نسبيًّا (بلا `foodId`).
