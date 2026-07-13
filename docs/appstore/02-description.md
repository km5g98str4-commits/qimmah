# App Store — Description (AR primary + EN)

> Every claim below traces to code (file cited in `07-second-pass-verification.md`). Nothing
> aspirational. Tone: warm MSA per PDF §02 — no وش/الحين/تبي, no hype, no emoji-stacking.
> Length: well under the ~4000-char field limit (limit not doc-cited by Apple → see TO-CONFIRM).

---

## العربية (الأساسية)

**درّب بوضوح. تقدّم بثقة.**

قِمّة يجمع تمرينك وتغذيتك وقياساتك وتقدّمك في تطبيق عربي واحد يعمل على جهازك أولًا. خطتك تُبنى من
إعدادك أنت — هدفك، جسمك، جدولك — بخطوات واضحة وأرقام صادقة، لا وعود مبالغ فيها.

**تمارينك**
خطة تُبنى تلقائيًا من إعدادك، ووضع تمرين مباشر يسجّل الأوزان والتكرارات مع مؤقّت راحة ورصد أرقامك
القياسية. اختر من مكتبة تمارين مصوّرة، أو ابنِ خطتك بنفسك، وتابع تغطية عضلاتك أسبوعيًا. تحتاج نسخة
الأجهزة؟ بدّلها بضغطة.

**تغذيتك**
أهداف سعرات وماكروز محسوبة من ملفك، وتسجيل وجبات سريع من قاعدة أطعمة واسعة تشمل أكلات سعودية
تقليدية. امسح باركود المنتج بالكاميرا ليُضاف لسجلّك، وتابع ماءك اليومي.

**تقدّمك**
سجّل وزنك وقياساتك وشاهد اتجاهك في رسم بياني واضح. تابع تطوّر قوتك وأرقامك القياسية، واجمع الأوسمة
والسلاسل التي تعكس التزامك.

**حركتك وعافيتك**
سجّل خطواتك اليومية نحو هدفك، وتابع مكمّلاتك وأدويتك في مكان واحد (للمتابعة فقط، لا نصيحة طبية).
فعّل تذكير التمرين المحلي على iPhone لتبقى على المسار.

**يومك**
شاشة «اليوم» تعرض خطوتك التالية ومسار يومك في لمحة، مع قائمة مهامك اليومية.

**خصوصيتك أولًا**
بلا إعلانات، وبلا تتبّع. بياناتك «محلية أولًا» تُحفظ على جهازك؛ والمزامنة السحابية اختيارية وتعمل فقط
عند تسجيل الدخول بحساب. يمكنك حذف حسابك وكل بياناتك من داخل التطبيق في أي وقت.

قِمّة عربي أولًا، مع دعم الإنجليزية.

قِمّة+ (لاحقًا): خطط وتحليلات أعمق — والأساسيات تبقى مجانية.

---

## English (secondary)

**Train with clarity. Progress with confidence.**

Qimmah brings your training, nutrition, measurements, and progress into one Arabic-first app that
lives on your device. Your plan is built from your own setup — goal, body, schedule — in clear
steps with honest numbers, not overblown promises.

**Your training**
A plan generated from your setup, plus a live workout mode that logs weights and reps with a rest
timer and personal-record tracking. Pick from an illustrated exercise library, or build your own
plan, and watch your weekly muscle coverage. Need the machines version? Switch in a tap.

**Your nutrition**
Calorie and macro targets calculated from your profile, and fast meal logging from a large food
database that includes traditional Saudi dishes. Scan a product barcode with the camera to add it
to your log, and track your daily water.

**Your progress**
Log your weight and measurements and see your trend on a clear chart. Follow your strength gains
and personal records, and earn the medals and streaks that reflect your consistency.

**Movement & wellness**
Log your daily steps toward your goal, and keep supplements and medications in one place (tracking
only — not medical advice). Turn on a local workout reminder on iPhone to stay on track.

**Your day**
The “Today” screen shows your next step and your day’s track at a glance, with a daily to-do list.

**Privacy first**
No ads, no tracking. Your data is local-first on your device; cloud sync is optional and only runs
when you sign in. You can delete your account and all your data from inside the app anytime.

Qimmah is Arabic-first, with English support.

Qimmah+ (later): deeper plans and insights — the essentials stay free.

---

## Claim → code map (truthfulness gate)

| Claim | File | Guard against overclaim |
|---|---|---|
| Plan generated from setup | `src/lib/planGenerator.ts` | rule-based, "no AI/server" — copy says "built from your setup", not "AI" |
| Live workout mode + rest timer + PRs | `src/components/WorkoutMode.tsx`, `finishWorkout.ts` | — |
| Exercise library / build-your-own / machines | `src/data/exercises.ts`, `features/customPlan/*`, `data/machineCatalog.ts` | — |
| Weekly muscle coverage | `src/lib/muscleCoverage.ts`, `MuscleMap.tsx` | — |
| Calorie/macro targets | `src/lib/nutritionPlan.ts`, `calculators.ts` | — |
| Saudi foods in DB | `src/data/saudiFoods.ts` (~130) | "includes traditional Saudi dishes" — accurate |
| Barcode scan (camera) | `src/features/barcode/BarcodeCamera.tsx`, `openFoodFacts.ts` | camera used **only** for barcode |
| Water tracking | `src/lib/nutritionTracking.ts` | — |
| Weight/measurements + chart | `src/lib/measurementLog.ts`, `LineChart.tsx` | — |
| Strength/PRs, medals, streaks | `exerciseStats.ts`, `features/achievements/*`, `streaks.ts` | — |
| Steps (manual) | `src/lib/stepCounter.ts` | **manual entry** — copy never says HealthKit/auto |
| Supplements/medications (tracking only) | `data/supplements.ts`, `data/medications.ts` | disclaimer "not medical advice" kept |
| Local reminder (iOS) | `src/lib/reminders.ts` | copy scopes it to iPhone; no web push claim |
| Today + to-do | `TodayV2.tsx`, `features/todo/*` | — |
| No ads/tracking, local-first, optional sync | `analytics/providers/noop.ts`, `syncService.ts`; legal pack `docs/legal/app-privacy-labels.md` §A, `privacy-policy.md` §1 | — |
| In-app account deletion | `authContext.tsx`, RPC `delete_own_account` | — |
| Arabic-first + English support | `product.ts`, `config/strings.ts` (en) | "with English support", **not** "fully bilingual" |
| Qimmah+ one line, essentials free | `profileV2Model.ts` (`subscription.enabled:false`) | **no IAP/paywall** implied |

**Deliberately NOT claimed:** Apple Health/HealthKit, automatic step counting, any subscription/premium
tier for purchase, background web notifications, "fully offline install", "fully bilingual".
