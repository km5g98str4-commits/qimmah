# App Store — Description (AR primary + EN)

> **Voice:** Warm Modern Standard Arabic — واثقة، محفّزة، بلا عاميّة (لا «وش/الحين/تبي») وبلا مبالغة أو حشو رموز.
> Grounded in `docs/design/DESIGN-DECISIONS.md:19` (Arabic tone) + `src/design-system/v2/labels.ts` (approved copy).
> **Every feature claim below exists in code today** — file:line traced in the right-hand notes. Nothing aspirational.
> Length target: Apple Description max **4000 chars** — see `07-second-pass.md` for the verified/dated limit.

---

## AR — Primary (App Store: Arabic – Saudi Arabia)

**قِمّة — تمرينك وتغذيتك وتقدّمك في نظام واحد، بالعربية.**

درّب بوضوح. تقدّم بثقة.

قِمّة تجمع رحلة لياقتك في مكان واحد مصمَّم للعربية أولًا: خطة تمرين تُبنى على هدفك، تتبّع تغذية واقعي، وقياس تقدّم صادق — بخطوات قصيرة وواضحة، بلا تشتيت.

**ابدأ بخطة تناسبك**
أجب عن أسئلة قصيرة — هدفك (تنشيف/محافظة/تضخيم)، أيام تمرينك ومدّتها، مكانك ومعدّاتك، وأي إصابة تتجنّبها — فتُبنى خطتك تلقائيًا وأنت ترى ملخّصها يتكوّن أمامك.

**يومك في مسار واحد**
شاشة «اليوم» تعرض خطوتك التالية ومسارًا من أربع حلقات (تمرين · تغذية · حركة · تعافٍ) يوضّح ما أنجزته وما تبقّى، مع اقتراحات فعلية تبدأ بفعل واضح.

**وضع تمرين مركّز**
شغّل جلستك في شاشة داكنة مخصّصة للتمرين: عدّل الوزن والتكرارات بلمسة، أكمل كل مجموعة، وتابع مؤقّت راحة يبقى صحيحًا حتى لو أغلقت التطبيق. تنتهي الجلسة بملخّص واضح: الدقائق، المجموعات، والحجم الكلي.

**تغذية بلا تعقيد**
سجّل وجباتك وماءك، وتابع البروتين والكربوهيدرات والدهون مقابل أهدافك في حلقات بسيطة. ابحث عن الطعام بالاسم، أو امسح الباركود لجلب القيم من قاعدة Open Food Facts، مع فلتر «عالي البروتين» عند الحاجة.

**تقدّم صادق**
تابع اتجاه وزنك ومقاساتك، وسلّم قوّتك لكل تمرين، وزخم تدريبك عبر الأسابيع. حين تنقص البيانات نقولها بصراحة بدل اختلاق أرقام.

**ملفّك التدريبي**
عدد تمارينك، أيام تتابعك، وأرقامك القياسية في مكان واحد، مع خريطة التزام لعشرة أسابيع، وروابط سريعة للقياسات والإعدادات والخصوصية.

**خصوصيتك أولًا**
بلا إعلانات، وبلا تتبّع، وبلا بيع بيانات. بياناتك اليومية تبقى على جهازك افتراضيًا؛ والحساب اختياري لمزامنة آمنة عند الرغبة، ويمكنك حذف حسابك وبياناتك في أي وقت.
(مرجع سياسة الخصوصية والملصقات: `docs/legal/privacy-policy.md`, `docs/legal/app-privacy-labels.md`.)

قِمّة تعمل بالعربية والإنجليزية مع دعم كامل للاتجاه من اليمين لليسار.

قِمّة+ (قريبًا): مزايا إضافية اختيارية دون أن يفقد الإصدار المجاني قيمته.

---

## EN — Secondary (App Store: English)

**Qimmah — your training, nutrition, and progress in one Arabic-first system.**

Train with clarity. Progress with confidence.

Qimmah brings your fitness journey into one place built Arabic-first: a plan shaped by your goal, realistic nutrition tracking, and honest progress — in short, clear steps, without the noise.

**Start with a plan that fits you**
Answer a few short questions — goal (cut/maintain/bulk), training days and length, place and equipment, and any injury to avoid — and your plan is built automatically while you watch its summary form.

**Your day in one path**
The Today screen shows your next step and a four-ring path (train · nutrition · move · recover) that makes clear what's done and what's left, with verb-first suggestions.

**A focused workout mode**
Run your session on a dedicated dark screen: adjust weight and reps in a tap, complete each set, and follow a rest timer that stays correct even if you leave the app. Sessions end with a clear summary: minutes, sets, and total volume.

**Nutrition without the friction**
Log meals and water, and track protein, carbs, and fat against your targets in simple rings. Search food by name, or scan a barcode to pull values from Open Food Facts, with a high-protein filter when you need it.

**Honest progress**
Follow your weight and measurement trends, a per-lift strength ladder, and your training momentum over weeks. When data is missing, we say so instead of inventing numbers.

**Your training profile**
Workouts, day streak, and personal records in one place, with a ten-week commitment map and quick links to measurements, settings, and privacy.

**Privacy first**
No ads, no tracking, no data selling. Your day-to-day data stays on your device by default; an account is optional for secure sync, and you can delete your account and data anytime.
(See `docs/legal/privacy-policy.md`, `docs/legal/app-privacy-labels.md`.)

Qimmah works in Arabic and English with full right-to-left support.

Qimmah+ (coming soon): optional extra features, without taking value away from the free version.

---

## Feature → code trace (reviewer aid; not shipped copy)

| Claim | File:line |
|---|---|
| Goal/days/length/place/equipment/injury onboarding → auto plan | `src/views/OnboardingV2.tsx:97-104,204-367` |
| "summary forms as you choose" (live plan summary) | `src/views/OnboardingV2.tsx:278-290` |
| Today: next-step hero + 4-ring path + nudges | `src/views/TodayV2.tsx:58-118,133-186` |
| Dark focus workout, set editor, rest timer survives background | `src/views/WorkoutV2.tsx:32-43,296-318,351-355` |
| Session summary: minutes/sets/volume, saved on device | `src/views/WorkoutV2.tsx:457-466` |
| Nutrition: macro+water rings, meal logging | `src/views/NutritionV2.tsx:139-201` |
| Barcode → Open Food Facts + high-protein filter + search | `src/views/NutritionV2.tsx:330-359`; `src/features/barcode/ScanFoodPanel.tsx:75-96`; `src/features/barcode/openFoodFacts.ts:6,84-95` |
| Progress: weight trend, strength ladder, momentum, honest hedging | `src/views/ProgressV2.tsx:56,80-108,175-286` |
| Profile: stats, program card, 10-week heatmap | `src/views/ProfileV2.tsx:60-134` |
| No ads / no tracking / device-first / optional sync / delete account | `docs/legal/app-privacy-labels.md` §A,§C; `src/lib/authContext.tsx:244-257,374-401` |
| AR/EN + RTL | `src/design-system/v2/labels.ts` (ar/en records); app `dir="rtl"` |
| Qimmah+ quiet line (no paywall/banner) | `src/views/ProfileV2.tsx:83-91` |
