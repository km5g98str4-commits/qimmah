# Stage-0 Baseline — انجراف القاعدة + مصير الهوت فكس

> تقرير جرد سجلّ git فقط. **صفر تعديل** كود/اختبار. أُنشئ على worktree `chore/v3-baseline`
> من `origin/design/v21-promotion`.

## القمة الفعلية للترقية
`origin/design/v21-promotion` = **`e2b27b3`** ("Add files via upload") — مطابق للمتوقّع، لا `f14cdeb`.

## (أ) انجراف القاعدة — `f14cdeb..e2b27b3`

commit **واحد فقط** نزل بعد القاعدة، ولا يمسّ كودًا:

| # | الهاش | العنوان | الملفات |
|---|-------|---------|---------|
| 1 | `e2b27b3` | Add files via upload | `docs/design/qimmah-v21.pdf` (Bin +590830) — لا كود |

**⇐ لا انجراف كود على فرعك.** الفرق الوحيد عن القاعدة هو رفع PDF معيار v2.1.

## (أ) مصير الهوت فكس native-feel — **حاضر جزئيًا**

سلسلة native-feel: `a9c9cdb → f14cdeb → 8175484 → bd81cba` (tip = `fix/native-feel`).
القاعدة `f14cdeb` **هي نفسها** commit native-feel، فالترقية ترث جزءًا منه:

| commit | التغيير | في الترقية (`e2b27b3`)؟ | الدليل الملموس |
|--------|---------|:---:|----------------|
| `a9c9cdb` | إزالة associated-domains entitlement | ✅ حاضر | `ios/App/App/App.entitlements` = HealthKit فقط، لا applinks |
| `f14cdeb` | قفل التكبير + لوحات أصلية + إزالة web-tells | ✅ حاضر | `index.html:7` `maximum-scale=1.0, user-scalable=no` |
| `8175484` | `overscroll-behavior: contain→none` + حقول رقمية ≥16px | ❌ **مفقود** | الترقية لا تزال `overscroll-behavior: contain` (`index.css:35,44`) |
| `bd81cba` | حقول نص ≥16px في Commitments/Wellness (قتل focus-zoom المتبقّي) | ❌ **مفقود** | `StepCommitments/StepWellness` لا تزال `text-sm` لا `text-base` |

**الحكم:** القفل الأساسي للتكبير (viewport) + إزالة associated-domains **حاضران**. لكن
تنقيحَي الـfocus-zoom المتبقّي **مفقودان** من الترقية — تحديدًا `git merge-base --is-ancestor`
يؤكّد أن `8175484` و`bd81cba` **ليسا سلفًا** لـ `e2b27b3`. الملفات المتأثّرة المفقودة:
`index.css` (overscroll none) + 5 حقول customizer (`StepNutrition`, `StepSmartCalculations`,
`StepWorkoutTemplate`, `StepCommitments`, `StepWellness`) بترقية `text-sm → text-base` لمنع
تكبير iOS عند التركيز داخل WKWebView.

## (أ) حالة fix/native-feel على origin
سليم ولم يُحذف: `git ls-remote origin fix/native-feel` = **`bd81cba…`**. أي دمج مستقبلي
لهذين التنقيحين متاح من هذا الفرع.

## (ب) إرساء المعيار v3.0 — **محجوب (بانتظار المالك)**
`docs/design/` يحوي فقط: `qimmah-v21.pdf`, `CLOUD-DESIGN-INVENTORY.md`,
`DESIGN-DECISIONS.md`, `DESIGN-SOURCE-OF-TRUTH.md`. **لا** `Qimmah-Design-Standard-v3_0.pdf`
ولا أي صور PNG (شجرة العمل نظيفة، لا untracked). الخطوة اليدوية ① لم تُنفَّذ بعد.

لم أُنشئ `README.md` يُعلن v3.0 مرجعًا رسميًا، ولم أختلق ملفات — كما نصّت المهمة: «إن غابت →
توقّف وبلّغ، لا تفترض». يُستكمَل هذا البند فور رفع المالك للملفات.
