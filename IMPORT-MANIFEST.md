# حزمة إعادة الدمج — `import/codex-p0-batch1`

هذا السجل يصف إعادة تطبيق الالتزامات العشرة من نسخة Qimmah-App على رأس
`origin/design/v21-promotion` في فرع معزول. لا يحتوي هذا الملف على أي سر أو قيمة
من قيم Supabase.

## نطاق المصدر والحدود

- المرجع الذي جرى جلبه: `origin/design/v21-promotion`.
- ناتج الجلب: `e1ab6c69fb2146fcbcbcb92e64662f40afcbf6ae`، وهو نفس رأس الأساس
  المعلن في الطلب، وليس رأسًا أحدث. لذلك لم أستبدله بالفرع المحلي الآخر
  `design/v21-promotion` (رأسه `cc96d842`) ولم ألمس أي فرع أصلي.
- رأس فرع التكامل قبل هذا الملف: `0aa3d59ae3d263cc797f993718d54ae35c74f174`.
- الفرع الوحيد الناتج: `import/codex-p0-batch1`.
- الالتزامات العشرة أدناه أُعيد تطبيقها بالترتيب؛ أضيف هذا الملف بعد ذلك كسجل
  استيراد مستقل.

## سجل الالتزامات

| # | الالتزام الأصلي | الالتزام بعد التطبيق | التغيير والملفات | إثبات/بوابة | ما سقط ولماذا |
|---:|---|---|---|---|---|
| 1 | `9173f2afa0b084319027b88403f957aa4e7ba078` | `bc9c45d203aefbfb97cd8a74d294687430d1ede6` | ترتيب فجوات المنتج؛ `docs/product/BACKLOG.md` | توثيق backlog + `test:gate` | تحديث `PROJECT_PROGRESS.md` سقط لأن الجذع يحذف الملف |
| 2 | `5468d39831338b34b1757ce950b4d398b36cf4ae` | `c5184101e9c586d568b7311b6baf77756081a1f5` | تدقيق الحالة الحالية؛ `docs/audit/CURRENT-STATE-AUDIT.md` | توثيق التدقيق + `test:gate` | تحديث `PROJECT_PROGRESS.md` سقط لنفس سبب حذف الجذع |
| 3 | `d53bf6a666e8b6b928ad940d379b0da9025722a` | `ed08e8c8237161c575a5947380e8358af151d703` | فتح onboarding المحلي للضيف؛ `src/App.tsx`, `src/views/StartView.tsx`, `src/views/StartViewV2.tsx`, `scripts/run-guest-entry-proof.mjs`, `package.json` | `test:guest-entry` — 7/7 | تحديث `PROJECT_PROGRESS.md` سقط؛ كود الضيف بقي كاملًا |
| 4 | `105ddaf272e58cf54d9382b8d14b4819249c996a` | `740c6b9b17f569041aab142b17e3e7d5d4db4231` | حالة الحساب المطلوبة؛ `src/App.tsx`, `src/config/strings.ts`, `src/lib/appRoutes.ts`, `src/views/AccountRequiredView.tsx`, `scripts/run-account-required-proof.mjs`, `package.json` | `test:account-required` — 5/5 | تحديث `PROJECT_PROGRESS.md` سقط؛ نصوص/حارس الحساب بقيت |
| 5 | `bc4042b1d3cb1ab7f13ec8957e02a92854f0dbef` | `f311e0b6c0dba37732456df533f6a5522072e363` | عقد onboarding e2e؛ `scripts/e2e-onboarding.mjs`, `scripts/e2e/lib/app-copy.mjs`, `scripts/run-onboarding-e2e-contract-proof.mjs`, `package.json` | `test:onboarding-e2e-contract` — 6/6 | تحديث `PROJECT_PROGRESS.md` سقط |
| 6 | `676ab309a3d3b2ab9d54e2f0070bf74355ab53ab` | `5c90f36631f42d44e52041812c2c9111c5615acc` | عرض أيام الراحة بصدق؛ `src/config/strings.ts`, `src/views/WorkoutV2.tsx`, `scripts/run-workout-rest-state-proof.mjs`, `package.json` | `test:workout-rest-state` — 4/4 | تحديث `PROJECT_PROGRESS.md` سقط |
| 7 | `9a8998ebc5c137db2a4290b006a2ba84e17b5cfd` | `83018d13b25d6bcd3da2a1361bb5f3709adbaab4` | جعل إرشادات التمرين اختيارية بصدق؛ `src/components/ExerciseDetail.tsx`, `src/data/exercises.ts`, `src/i18n/dict/library.ts`, `src/lib/exerciseGuidance.ts`, `src/types/workout.ts`, `scripts/english-content-proof.ts`, `scripts/run-guidance-honesty-proof.mjs`, `package.json` | `test:guidance-honesty` + `test:english-content` | تحديث `PROJECT_PROGRESS.md` سقط |
| 8 | `e6c538e969e67376d5793eebc972ef73117ca7d6` | `c9d516fd81692ce976889aff9208210b2e2e930b` | توثيق فجوة ترحيل training focus؛ `docs/product/TRAINING-FOCUS-GAP.md`, `scripts/run-training-focus-gap-proof.mjs`, `package.json` | `test:training-focus-gap` | تحديث `PROJECT_PROGRESS.md` سقط |
| 9 | `82822cd0ea628af00e215409c379ff3da7eee334` | `7a32dc4bccd45eb4a2b8ac73c57e2e0ec6a7b25c` | مواءمة النبرة باللهجة السعودية البيضاء؛ `src/config/strings.ts`, `src/i18n/dict/bodyStep.ts`, `src/i18n/dict/onboardingIntent.ts`, `scripts/run-tone-debt-proof.mjs`, `package.json` | `test:tone-debt` | تحديث `PROJECT_PROGRESS.md` سقط |
| 10 | `096011e1be21963cd48c738d64f07ff249d089a9` | `0aa3d59ae3d263cc797f993718d54ae35c74f174` | متابعات P0 للتمرين والتغذية؛ `src/lib/workoutV2Persist.ts`, `src/views/NutritionV2.tsx`, `src/views/WorkoutV2.tsx`, `scripts/fixforward-proof.ts`, `scripts/run-rpe-level-proof.mjs`, `scripts/run-saved-meals-proof.mjs`, `docs/product/P0-FOLLOWUPS-STATUS.md`, `package.json` | `test:rpe-level` + `test:saved-meals` + `test:fixforward` | تحديث `PROJECT_PROGRESS.md` سقط |

## التعارضات والقرارات

حدث تعارض واحد متكرر في كل الالتزامات العشرة: كل التزام يعدّل
`PROJECT_PROGRESS.md` بينما رأس الجذع يحذف الملف. حُلّ كل تعارض بقرار جراحي
`git rm PROJECT_PROGRESS.md` ثم متابعة cherry-pick، فبقي حذف الجذع ولم تُسقط
أي ملفات كود أو أدلة اختبار أخرى.

لم يحدث تعارض في `package.json` أو `src/config/strings.ts` أو `src/App.tsx`.
اندماجت تغييرات `package.json` تلقائيًا باتحاد scripts؛ عدد scripts في الناتج
108، ونجحت البوابة الكاملة. لا توجد أقسام مكررة أو إسقاطات صامتة في هذه الملفات.

## التحقق

- `npm ci`: نجح — أُضيفت 361 حزمة ودُقّقت 362 حزمة (تحذير npm audit: ثغرة عالية
  واحدة في شجرة الاعتماديات، بلا فشل تثبيت).
- `npm run test:gate`: exit 0؛ آخر إثباتين: `test:guest-entry` (7/7) و
  `test:site-truth` (79 فحصًا على 6 صفحات).
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run build`: exit 0 (`vite build` نجح).
- `git diff --check`: exit 0.

لا شيء من التغييرات غير الملتزمة في نسخة Qimmah-App (بما فيها إعدادات auth
المحلية) دخل هذه الحزمة؛ المصدر هو الالتزامات العشرة المحددة أعلاه فقط.
