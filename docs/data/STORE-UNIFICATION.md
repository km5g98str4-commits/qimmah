# توحيد مخازن الحالة (Prompt 2) — مصدر حقيقة واحد

**الفرع:** `claude/canonical-stores-v1` (من a53f5a1). **العقد الموحّد:** getSnapshot (`getNutritionDaySnapshot` — لقطة مستقرة لـ`useSyncExternalStore`) · subscribe (`subscribeNutritionDay`) · mutate (`addFoodToDay/addWaterToDay/removeFoodFromDay` — كلها تُشعر المشتركين) · migrate (`runMigration` الموحّد) · export (عبر registry النقل، بلا تغيير).

## قبل / بعد
| المعلومة | قبل (كتّاب/مفاتيح) | بعد |
|---|---|---|
| ماء اليوم | كاتبان (nutritionTracking v1 + nutritionV2Model) × ٤ مفاتيح | **كاتب واحد** (`addWaterToDay`) → `nutrition:v2` + mirror واحد لـ`waterLogs` |
| أصناف اليوم | مفتاحان (v1 log + v2 foods) | **`nutrition:v2` فقط** (v1 هاجَر وحُذف مفتاحه) |
| doneMeals | v1 + mirror | **historyStore.nutritionLogs فقط** |
| القياسات | مصدر واحد أصلًا (مؤكَّد بالاختبار: لا تكرار معرّفات، قارئان متطابقان) | كما هو |
| العافية/الالتزامات/اليوم | مسار واحد أصلًا (كلٌّ يعكس لـhistoryStore) | كما هو |
| tick/bump | الواجهة تلقّت لا-إشعار من الطبقة | **الطبقة تنشر اشتراكات** — `NutritionV2.tsx` tick يصير حذفه آمنًا (شأن Codex) |

## كتّاب v1 المحذوفون
`nutritionTracking.setState` (الكاتب المزدوج) + `saveNutritionToday` — **أُزيلا**؛ الملف صار محوّلًا بنفس الواجهة العامة (مستهلكوه: achievements/dataPortability — بلا تغيير عقد).

## الهجرة
`nutrition-unify-v1-to-v2` عبر `runMigration`: تنسخ يوم v1 الحالي إلى v2 **فقط إن كان v2 فارغًا لليوم** (v2 أحدث لا يُداس) → verify → حذف مفتاح v1 بعد الإثبات → سجل `qimmah:migrations:v1` يمنع الإعادة (مُثبت: إعادة بذر v1 بعد الهجرة تُتجاهل).

## مفاتيح ستُحذف في إصدار لاحق (موثَّق — لا يُحذف الآن)
| المفتاح | الحالة | متى |
|---|---|---|
| `qimmah:nutritionToday:v1` | يُحذف تلقائيًا بالهجرة على كل جهاز | منجز ذاتيًا |
| `qimmah:activeSession:v1:*` | كاتب ميت (لا مستدعي) — القارئ الوحيد registry النقل | بعد إزالة تعريفه من registry (إصدار +1) |
| `qimmah:workoutSessions:v1` · `qimmah:exerciseHistory:v1` · `qimmah:measurementLogs:v1` | توائم legacy تغذّي `ensureMigrated` | إصدار +1 بعد التأكد من اكتمال الهجرة ميدانيًا |
| قراءة `readLegacyNutritionDay` + الثوابت | تعيش فقط لخدمة الهجرة | تُحذف مع إزالة الهجرة (إصدار +2) |

## عقود لم تُمسّ (تخص الواجهة — Codex)
`useNutritionToday` نفس التوقيع؛ `NutritionV2.tsx` tick/bump لم يُلمس (يمكن استبداله بـ`useSyncExternalStore(subscribeNutritionDay, getNutritionDaySnapshot)`) — موثَّق هنا وتوقفت عنده كما تقضي حدود المهمة.
