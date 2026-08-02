# BRANCH_AUDIT.md — عملية «النرد الثابت» [CTO-60]

> حصر واستعادة ودمج مؤجَّل لكل فروع تطبيق قِمّة.
> تاريخ التنفيذ: **2026-08-02** · المنفِّذ: Claude Code · الحالة: **مكتمل — بانتظار [CTO-61]**
> **لم يُدمج شيء في الجذع في هذه الجلسة. كل الإجراءات إضافية فقط.**

---

## 0. الملخص التنفيذي

| المقياس | العدد |
|---|---|
| المستودع الرئيسي (الجذع) | `/Users/ziyad/qimmah-deploy` — الفرع **`main`** |
| رأس الجذع المعتمد في كل الحسابات | `origin/main` = `658d088` |
| مراجع الفروع المحصورة (محلي + بعيد) | **416** |
| أسماء فروع مميّزة | **294** |
| إيداعات فريدة على رؤوس الفروع | **291** |
| منها مدمجة بالكامل في الجذع | **205** (297 مرجعًا) |
| منها غير مدمجة | **86** (119 مرجعًا · 88 اسم فرع) |
| مستودعات شقيقة مفحوصة (نسخ مستقلة) | **37** |
| أشجار عمل (worktrees) مفحوصة | **117** |
| stashes محصورة | **2** (واحد في الجذع، وواحد كان محبوسًا في نسخة شقيقة) |
| إيداعات معلّقة (dangling) | **20** (16 في المستودع الرئيسي + 4 في `gym-os-template`) |
| **إيداعات كانت مفقودة كليًا من المستودع الرئيسي** | **10** |
| **فروع إنقاذ أُنشئت** | **20** (`rescue/*`) |
| مرشحون للدمج (بعد استبعاد المتجاوَز والفارغ) | **31** |

**أهم اكتشاف:** ستة إيداعات و‑أربعة معلّقات كانت موجودة **فقط** داخل نسخ شقيقة على القرص، غير موجودة في المستودع الرئيسي ولا على GitHub — أبرزها فرع `codex/structure-uiux-v1` (٦ إيداعات، ٥٥ ملفًا، +١١٧٧ سطرًا) الذي **لم يُدفع إلى الأصل قط**. كلها استُعيدت الآن.

---

## 1. المرحلة 1 — شبكة الأمان ✅

### 1.1 فرع الجذع

فرع الجذع الرئيسي هو **`main`**.

- `origin/HEAD` → `refs/remotes/origin/main` (مؤكَّد من الأصل).
- الجذع المحلي `main` كان متأخرًا **٢٠٥ إيداعات** خلف `origin/main` (ولم يتقدّم عليه بأي إيداع — سلف نظيف).
- لذلك اعتُمد **`origin/main`** مرجعًا للجذع في كل حسابات «غير مدمج» و«تعارضات» في هذا التقرير. هذا الاختيار مقصود: القياس على `main` المحلي كان سيُظهر ٢٠٥ إيداعات مدمجة أصلًا على أنها «غير مدمجة».

### 1.2 النسخة الاحتياطية

```
git bundle create ../qimmah-backup-20260802.bundle --all
```

- المسار: `/Users/ziyad/qimmah-backup-20260802.bundle`
- الحجم: **138 ميجابايت**
- التحقق: `git bundle verify` → **`The bundle records a complete history.`**

### 1.3 الوسوم

| الوسم | يشير إلى | المعنى |
|---|---|---|
| `backup/pre-nard-20260802` | `907b333` (وسم مُعلَّق على `origin/main` = `6354ed0`) | رأس الجذع البعيد لحظة بدء العملية |
| `backup/pre-nard-20260802-local-main` | `d3078bf` (على `main` = `b0a7e3f`) | رأس الجذع المحلي لحظة بدء العملية |
| `backup/pre-nard-20260802-postfetch` | `fb4edfa` (على `origin/main` = `658d088`) | رأس الجذع بعد الجلب — **الأساس المستخدم في كل حسابات هذا التقرير** |

### 1.4 الجلب

الأمر الوارد في التكليف `git fetch --all --prune-tags=false` **غير صالح نحويًا في git** — الراية `--prune-tags` لا تقبل قيمة (`error: option 'prune-tags' takes no value`). نُفِّذ المكافئ الذي يحقق نفس المقصد حرفيًا (اجلب كل شيء، لا تقلّم شيئًا):

```
git fetch --all --no-prune --tags
```

نتيجة الجلب: تقدّم `origin/main` من `6354ed0` إلى `658d088`، ووصل فرعان جديدان (`claude/revert-website-design-jsbldt`, `e/plan-preview-host`)، وتحدّث فرعان. **لم يُقلَّم أي مرجع.**

---

## 2. المرحلة 2 — الحصر الشامل

### 2.1 نطاق البحث

لم يُكتفَ بالفروع الظاهرة. فُحص:

1. `refs/heads` و`refs/remotes` في المستودع الرئيسي — 416 مرجعًا.
2. **117 شجرة عمل** (worktrees) وسجلّات `HEAD` الخاصة بكل واحدة.
3. **37 نسخة مستقلة** من المستودع على القرص (`qimmah-*`, `gym-os-template`) — كل واحدة لها `.git` خاص بها. اكتُشفت هنا الأعمال المفقودة.
4. كل سجلّات `reflog`: `.git/logs/HEAD` + `.git/logs/refs/**` + `.git/worktrees/*/logs/**` (1344 سطرًا، 65 اسم فرع مميّز).
5. `git fsck --lost-found --dangling` على المستودع الرئيسي وعلى النسخ الشقيقة الكبرى.

### 2.2 نتيجة فحص reflog

استُخرجت كل أسماء الفروع المذكورة في كل السجلات (`checkout: moving from X to Y`، `merge X:`) وقورنت بالمراجع الحيّة:

> **كل اسم فرع ظهر يومًا في سجلّات المستودع الرئيسي ما زال له مرجع حيّ (محلي أو بعيد). لا فرع واحد ضاع من reflog.**

الضياع الفعلي لم يكن في reflog — كان في **نسخ شقيقة على القرص لم تُدفع أبدًا**.

### 2.3 خريطة الحارات

الحارات مستنتجة من بادئة اسم الفرع حيث توجد (`a/`, `b/`, `c/`, `e/`, `g/`, `h/`, `i/`)، ومن محتوى الإيداعات والملفات المتأثرة فيما عدا ذلك.

| الرمز | الحارة | البادئة |
|---|---|---|
| A | إعداد (onboarding) | `a/` |
| B | حساب | `b/`, `claude/account-*`, `fix/signup-*` |
| C | تغذية | `c/`, `content/food-*`, `feature/*nutrition*` |
| E | تصميم | `e/`, `design/`, `claude/q15/q16` |
| F | لوحة مؤسس | `site/`, `docs/appstore*` |
| G | مزامنة | `g/`, `infra/supabase*`, `claude/p14-*` |
| H | تمارين | `h/`, `claude/q19/q20/q21`, `feature/*workout*` |
| I | اختبارات e2e | `i/`, `test/`, `claude/*e2e*`, `fix/release-qa-*` |
| — | خارج الحارات | حوكمة / تدقيق / توثيق (`chore/`, `audit/`, `research/`, `docs/`) |

---

## 3. جدول الحصر — الفروع غير المدمجة (86 إيداعًا فريدًا)

مرتّب تنازليًا بعدد الإيداعات غير المدمجة. `تعارض` = عدد ملفات التعارض الفعلية من `git merge-tree --write-tree` ضد `origin/main`.

### 3.1 مرشحون أساسيون — [قيّم غير مدمج]

| # | الفرع (والمرايا) | الحارة | آخر إيداع | غير مدمج | الحجم (ملف/+/−) | تعارض | ملخص المحتوى |
|---|---|---|---|---|---|---|---|
| 1 | `import/codex-p0-batch1` + origin | A·C·H | 2026-08-01 | 11 | 35 / +726 / −65 | **2** | حزمة P0 من codex: دخول الضيف محليًا، حدود الحساب الصادقة، أيام الراحة، لهجة بيضاء، إرشاد التمرين اختياري + ٨ سكربتات إثبات |
| 2 | `origin/e/plan-preview-host` | E | 2026-08-01 | 7 | 24 / +2525 / −4 | **1** (`package.json`) | **قمّة سلسلة الخطة**: معاينة الخطة + «لماذا هذه خطتك؟» + طبقة التعليل + المحاور المحايدة + حارس القاصر. يبتلع ٤ فروع أدناه |
| 3 | `docs/beta-ops` + origin | — | 2026-07-16 | 7 | 5 / +502 | **0** | حزمة تشغيل البيتا: خطة أسبوعين TestFlight، دليل المختبِر، عدّة التجنيد، تقويم رسائل ١٤ يومًا، سلّم شدّة الملاحظات |
| 4 | `chore/training-focus-verdict` + origin | — | 2026-08-01 | 5 | 10 / +417 / −105 | **0** | حوكمة CTO-56/57/58: فحص الأساسات، تسمية الجذع الأحمر، حكم مخطّط `trainingFocus`، حذف مجلد `.probe` المأذون |
| 5 | `origin/claude/account-creation-bracket-error-rzxfv0` | B | 2026-07-31 | 4 | 6 / +514 / −2 | **1** (`src/App.tsx`) | إبقاء الخطة بعد تحويل الضيف إلى حساب + تبنّي الإعداد محليًا + إثبات أن تبويب التمرين لا يصل لطريق مسدود |
| 6 | `i/journey-advanced` + origin | I | 2026-08-01 | 4 | 36 / +742 / −67 | **0** | رحلة e2e الثالثة (المتقدّم) + ختم الأرض + أداة تشخيص الحراسة + تصحيحان في رحلة ط‑١ |
| 7 | `claude/q15-ios-shell-visual-fix` + origin | E | 2026-07-26 | 4 | 26 / +217 / −39 | **0** | قشرة iOS: شريط الحالة امتداد للتطبيق، منع قصّ المحتوى، منطقة الأمان، إخفاء خط التمرير + لقطات قبل/بعد |
| 8 | `h/workout-session-resume` | H | 2026-08-01 | 2 | 8 / +783 / −13 | **2** | استئناف الجلسة بسؤال لا بقفزة صامتة + شرط «الإعداد مكتمل» يقرأ الخطة المحفوظة |
| 9 | `e/settings-clarity-r2` + origin | E | 2026-08-01 | 3 | 11 / +474 / −232 | **1** | إعادة تنظيم الإعدادات لـ v3 + استعادة تسلسل العناوين (h1→h2→h3) |
| 10 | `e/calc-adopt` | E | 2026-07-31 | 2 | 14 / +1843 / −197 | **1** | إعادة بناء شارح الحسابات + قاموس `eCalc` (1201 سطرًا) + حالات فارغة/خطأ |
| 11 | `e/steps-adopt` | E·H | 2026-07-31 | 2 | 17 / +632 / −2 | **2** | صفحة خطوات مستقلة + نموذج `eStepsModel` + إثباتات (ممتلئ/فارغ/خطأ × ar/en) |
| 12 | `origin/claude/h1-session-resume` | H | 2026-07-31 | 1 | 6 / +537 / −6 | **1** | استئناف تمرين غير منتهٍ بعد إعادة التحميل أو قتل التطبيق |
| 13 | `origin/claude/h2-active-session-test-gaps` | I·H | 2026-08-01 | 1 | 1 / +41 / −1 | **0** | سدّ أربع فجوات إثبات في الجلسة النشطة، إحداها تأكيد أجوف |
| 14 | `g/account-isolation` + origin | G·B | 2026-07-31 | 1 | 1 / +75 | **0** | شروط قبول عزل الحسابات + تأكيدات مضادّة |
| 15 | `claude/p14-supabase-schema-rls` + origin | G | 2026-07-26 | 1 | 15 / +1386 / −9 | **2** | مخطّط Supabase وسياسات RLS كاملة للجداول الأربعة الباقية + ٥ هجرات (بلا تفعيل مزامنة) |
| 16 | `claude/p14-ios-native-hardening` + origin | G·H | 2026-07-26 | 1 | 23 / +2502 / −45 | **2** | تقوية الطبقة الأصلية: HealthKit، الباركود، إشعار الراحة، الإقلاع البارد |
| 17 | `claude/p14-english-content-completion` + origin | E | 2026-07-26 | 1 | 15 / +1087 / −134 | **1** (`package.json`) | إكمال الإنجليزية: `restTips`، الدروس، النقل، إرشاد التمارين |
| 18 | `claude/p14-e2e-release-gate` + origin | I | 2026-07-26 | 1 | 7 / +450 / −30 | **5** | بوابة إصدار واحدة + إزالة تكرار النصوص من E2E |
| 19 | `claude/q16-today-greeting-contrast` + origin | E | 2026-07-26 | 1 | 13 / +839 / −13 | **2** | بطاقة اليوم بتوكن دلالي + ترحيب بالاسم + عبارة يومية |
| 20 | `claude/q18-health-discoverability` + origin | G | 2026-07-26 | 1 | 28 / +997 / −2 | **3** | جعل ربط Apple Health قابلًا للاكتشاف |
| 21 | `claude/q19-workout-layout-order` + origin | H | 2026-07-26 | 1 | 12 / +510 / −27 | **1** (`package.json`) | بنية شاشة التمرين (هرم بصري بلا قصّ) + ترتيب صريح لتمارين كل يوم |
| 22 | `claude/q20-exercise-media-quality` | H | 2026-07-26 | 1 | 21 / +1051 / −128 | **1** (`package.json`) | إعادة بناء تجربة وسائط التمارين: جرد، حالات صادقة، حارس |
| 23 | `claude/q21-muscle-map-replacement` | H | 2026-07-26 | 1 | 17 / +1270 / −4 | **2** | إزالة مجسّم العضلات من الإنتاج واستبداله بخريطة نظيفة |
| 24 | `claude/p14-body3d-engine-audit` + origin | H | 2026-07-26 | 1 | 8 / +737 | — | تدقيق تقني لمحرّك المجسّم 3D + إصلاحات مؤكَّدة + إثبات |
| 25 | `origin/fix/release-qa-offline-a11y` | I | 2026-07-17 | 1 | 16 / +2025 / −16 | **0** | معالجة QEA‑003/004/005/006 + اختبارات ارتداد: جلسة دون اتصال، مصفوفة XSS، مسح WCAG AA، رابط التخطي |
| 26 | `origin/content/food-r2-gcc-eatingout` | C | 2026-07-16 | 1 | 5 / +297 / −4 | **4** | جولة ٢: ٦٠ صنف أكل خارجي خليجي/سعودي + توسيع البوابة |
| 27 | `fix/signup-numerals-dialect` + origin | B | 2026-07-25 | 1 | 4 / +86 / −5 | **2** | التعرّف على الأرقام العربية/الفارسية في كلمة مرور التسجيل |
| 28 | `site/brand-email-update` + origin | F | 2026-07-25 | 1 | 6 / +16 / −13 | **3** | علامة Ascent المعقودة الرسمية + توحيد بريد الدعم |
| 29 | `fix/brand-mark-swap` | F | 2026-07-31 | 1 | 1 / +2 / −2 | **0** | صفحة الصحافة تعرض `og-image` لا أيقونة التطبيق |
| 30 | `origin/feat/v11-experience` | H | 2026-07-17 | 2 | 9 / +491 / −8 | — | لوحة الصالة الحيّة (`LiveGymDashboard`) + مقاييس التمرين الحيّة + ٤ إصلاحات مراجعة |
| 31 | `origin/claude/p12-install-guide` | F | 2026-07-03 | 1 | 7 / +636 / −8 | — | دليل تثبيت PWA: مطالبة قابلة للصرف + خطوات في الإعدادات + إصلاح 404 |

### 3.2 تقارير فقط — [قيّم غير مدمج] (صفر تعارض، صفر مخاطرة)

| الفرع | آخر إيداع | غير مدمج | الحجم | تعارض | المحتوى |
|---|---|---|---|---|---|
| `audit/code-notes-full` + origin | 2026-07-24 | 1 | 2 / +787 | **0** | ملاحظات كود ملفًا بملف + خريطة إعادة الهيكلة |
| `audit/v3-fidelity-full` + origin | 2026-07-21 | 1 | 9 / +138 | **0** | تقرير مطابقة المعيار مقابل التطبيق |
| `audit/v3-inventory` + origin | 2026-07-19 | 1 | 1 / +242 | **0** | جرد V3 صادق مقابل المعيار |
| `audit/app-structure-deep` + origin | 2026-07-22 | 2 | 1 / +246 | **0** | تدقيق بنية التطبيق العميق + حكم HIG مستقل |
| `chore/repo-ledger` + origin | 2026-07-18 | 1 | 1 / +194 | **0** | دفتر المستودع: أحكام الفروع + مسح الأعمال العالقة |
| `research/product-ideas` + origin | 2026-07-24 | 1 | 1 / +387 | **0** | بحث سوق + بنك ٣٤ فكرة (عربي، موثّق) |
| `chore/v3-baseline` + origin | 2026-07-19 | 2 | 5 / +525 | **0** | ترسيخ معيار التصميم v3.0 + خط أساس المرحلة صفر |

### 3.3 [متجاوَز — حلّت محله نسخة أحدث]

| الفرع | تجاوزه | السبب |
|---|---|---|
| `e/plan-rationale` + origin | `origin/e/plan-preview-host` | سلف مباشر في نفس السلسلة (٣ من ٧ إيداعات) |
| `e/plan-preview` + origin | `origin/e/plan-preview-host` | سلف مباشر (٤ من ٧) |
| `e/plan-why` + origin | `origin/e/plan-preview-host` | سلف مباشر (٥ من ٧) |
| `e/plan-honest-axes` + origin | `origin/e/plan-preview-host` | سلف مباشر (٦ من ٧) |
| `e/personalization-guardrail` (محلي) | `origin/e/personalization-guardrail` | نسخة أقدم بإيداعين مقابل ٤ |
| `e/personalization-guardrail-r2` + origin | `origin/e/personalization-guardrail` | إعادة إنشاء بنفس المحتوى، أقل إيداعات |
| `e/settings-adopt` · `origin/e/settings-clarity` | `e/settings-clarity-r2` | ثلاث نسخ من نفس التغيير (١١ ملفًا متطابقة)؛ الأحدث `-r2` |
| `feature/p25-steps-health` · `origin/backup/claude-p25-3d-20260725` | `fix/audit-cleanup-wave` | ٦ من ٧ إيداعات مضمّنة فيه |
| `fix/design-fidelity` | `origin/fix/design-fidelity-v21` | سلف مباشر |
| `origin/audit/design-fidelity` | `origin/fix/design-fidelity-v21` · `origin/fix/founder-qa-round1` | سلف مباشر |
| `origin/claude/p31-muscle-lib-8w7upl` | `origin/integration/phase3.1` | مدموج فيه |
| `origin/design/v21-slice0-1` | `origin/design/v21-slice2` | سلف مباشر |
| `origin/hotfix/replace-bad-muscle-map` | `origin/feature/mobile-qa-product-polish` | سلف مباشر |
| `origin/fix/foundation-auth-app-shell` | `origin/feature/mobile-app-shell-design` | سلف مباشر |
| `origin/fix/nutrition-inputs-validation` | `origin/feature/nutrition-progress-health-mobile` | سلف مباشر |
| `origin/fix/bodybuilding-ui-muscle-coverage` | `origin/feature/workout-library-exercise-detail` | سلف مباشر |
| `origin/feature/v2-training-plan-engine` | `origin/research/v2-exercise-data-audit` | سلف مباشر |
| `origin/feature/v2-nutrition-live-engine` | `origin/research/v2-user-testing-script` | سلف مباشر |
| `origin/feature/v2-product-cleanup-settings` | `origin/research/v2-post-merge-bug-hunt` | سلف مباشر |
| `origin/fix/product-foundation-auth-bb-ui` · `origin/feature/mobile-plan-builder` · `origin/fix/workout-history-dashboard-binding` · `origin/feature/v2-workout-persistence-streak` · `origin/feature/v2-food-database-foundation` · `origin/integration/food-database-v2` · `origin/research/v2-*` · `origin/feature/phase2-exercises` · `origin/feature/phase1-training-engine` · `origin/feature/mobile-app-shell-design` · `origin/feature/workout-library-exercise-detail` · `origin/feature/nutrition-progress-health-mobile` · `origin/feature/mobile-qa-product-polish` · `origin/fix/qa-hardening-release-readiness` · `origin/design/v21-slice2` · `origin/integration/phase3.1` | التوحيد الكبير السابق (يونيو–يوليو) | حقبة ما قبل التوحيد؛ التطبيق أُعيد بناؤه فوقها (`V2` → `V2.1` → `V3`). محتواها إمّا ذاب في الجذع أو أُبطل بإعادة الهيكلة. **لا يُنصح بدمجها** |
| `origin/hotfix/p12-field-fixes-r2` · `origin/wip/p12-phase-d` · `feature/p25-exercise-gifs` | حقبة P12/P2.5 | نقاط حفظ وكيل قديمة |
| `origin/codex/v21-completion` | `merge/release-rc-into-trunk` وما بعده | تسليم v2.1 الكامل — ٢٣ ملف تعارض، والجذع تجاوز v2.1 إلى v3 |

### 3.4 [فارغ أو تجريبي]

| الفرع | السبب |
|---|---|
| `origin/claude/off-integration-saudi-seed-fgzgc0` | إيداعا دمج بفارق **صفر ملفات** — دمج فارغ |
| `origin/feature/phase2-exercises` | ملفَّا توثيق فقط (`DECISIONS.md`, `FOLLOW_UPS.md`) بـ+34 سطرًا |
| `origin/research/v2-product-qa-checklist` · `origin/research/v2-nutrition-data-audit` | تقارير حقبة V2 — تجاوزتها تدقيقات v3 |
| `merge/release-rc-into-trunk` + origin | إيداع دمج ضخم (173 ملفًا، +16715) لكنه **قواعد دمج متعددة** مع الجذع؛ محتواه دخل الجذع عبر مسار آخر. تعارض واحد (`package.json`) لكن قيمته الصافية ≈ صفر |

### 3.5 الفروع المدمجة بالكامل — [مدمج بالكامل]

**206 اسم فرع** رؤوسها أسلاف مباشرة لـ`origin/main` (صفر إيداع غير مدمج). أمثلة بارزة:
`a/age-13-alignment`, `a/e2e-onboarding-realign`, `a/onboarding-intent`, `b/signup-completion`, `c/saudi-foods`, `chore/charter`, `chore/lane-map`, `chore/trunk-governance`, `claude/recovery-engine-v1`, `claude/secure-account-ops-v1`, `claude/sync-coverage-v1`, `claude/workout-session-engine-v1`, `content/dialect-copy-v1`, `content/food-db-quality`, `design/v21-*` (٨ فروع), `e/calc-explainer`, `e/design-progress`, `e/steps-page`, `feat/apple-health`, `feat/recovery`, `feat/notifications-engine`, `feat/observability`, `feature/p25-*`, `feature/phase1-*`, `fix/account-data-isolation`, `fix/minors-maintenance-only`, `g/sync-consent-gate`, `i/journey-guardian`, `infra/supabase-schema-rls`, `integration/phase1..10`, `integration/wave1..6`, `ios/native-hardening`, `legal/appstore-pack`, `merge/*` (١٤ فرعًا), `release/v1.2.0-rc`, `site/landing`, `site/launch-pack`, `test/e2e-journeys`, `ux/core-product-polish`, `ux/entry-onboarding-polish` …

> القائمة الكاملة قابلة للتوليد بـ:
> `git for-each-ref --format='%(refname:short)' refs/heads refs/remotes | while read r; do git merge-base --is-ancestor "$r" origin/main 2>/dev/null && echo "$r"; done`

---

## 4. المرحلة 3 — الإنقاذ

### 4.1 الـ stashes

| المصدر | المحتوى | الحكم | فرع الإنقاذ |
|---|---|---|---|
| `stash@{0}` في `qimmah-deploy` — `267a33c` «On integration/wave2: stray-review-artifacts» | صفر تغييرات متتبَّعة؛ ملفان غير متتبَّعين: `scripts/run-today-v2-model-proof.mjs` (مطابق للجذع تمامًا) و`scripts/today-v2-model-proof.ts` (مسوّدة **أقدم** — الجذع يحوي نسختها الأحدث بلهجة سعودية + اختبار `returnAfterBreak` المفقود منها) | **[متجاوَز]** — الجذع أحدث | `rescue/stash-today-v2-proof-draft` (حُفظ احتياطًا) |
| `stash` في `gym-os-template` — `ed929a1` «wip-ios-signing-artifacts (DEVELOPMENT_TEAM + Pa…)» | سطران في `ios/App/App.xcodeproj/project.pbxproj` — إعداد توقيع iOS | **[مُنقَذ من الضياع]** — كان محبوسًا في نسخة شقيقة | `rescue/stash-ios-signing-artifacts` |

> **الـ stashes الأصلية لم تُحذف.** `git stash list` ما زال يُظهر مدخلته في `qimmah-deploy`.

### 4.2 الإيداعات المعلّقة داخل المستودع الرئيسي (16)

| الإيداع | التاريخ | المحتوى | الحكم | فرع الإنقاذ |
|---|---|---|---|---|
| `b435340` | 2026-07-20 | دمج «تعافٍ v1.1» — `RecoveryView.tsx` (234 سطرًا) + `recovery.ts` + WorkoutV2 (+384) | **[متجاوَز]** — الجذع يحوي محرّك تعافٍ v2 (`020166f`) + تعافي P14 الأصلي (`70651c6`) | `rescue/recovery-v11-merge` |
| `3c23129` | 2026-07-20 | نسخة ثانية أصغر من نفس الدمج | **[متجاوَز]** | `rescue/recovery-v11-merge-alt` |
| `59c92be` | 2026-06-30 | «P2.5: 20 صنف مطاعم سعودية» + `bodyAnatomy.ts` (335) + `stepCounter` — +1724 سطرًا | **[مُنقَذ من الضياع]** | `rescue/p25-saudi-restaurant-foods` |
| `15439bd` | 2026-07-13 | إفصاح منطقة تخزين البيانات — `ap-northeast-1` (اليابان) في سياسة الخصوصية و`DATA-INVENTORY` | **[متجاوَز جزئيًا]** — الجذع يحوي `ap-northeast-1` فعلًا، لكن `public/legal/privacy.html` مفقود منه | `rescue/legal-data-region-japan` |
| `fe43a00` | 2026-07-16 | تلميع دخول/إعداد: `LoginView`, `OnboardingV2`, `ResetPasswordView` | **[مُنقَذ من الضياع]** | `rescue/ux-entry-onboarding-polish` |
| `cfd1ca5` | 2026-07-16 | `MobileShell.tsx` +12 سطرًا | **[مُنقَذ من الضياع]** | `rescue/ux-core-mobileshell-wip` |
| `7b12979` = `fb65300` | 2026-07-30 | `NutritionV2.tsx` +14 (شجرتان متطابقتان — نسخة مكرّرة) | **[مُنقَذ من الضياع]** | `rescue/saudi-foods-nutritionv2-wip` |
| `6f10f8d` | 2026-07-26 | خطّ أساس أداء Q20 — الملفات المتتبَّعة **مطابقة تمامًا** لفرع `claude/q20-exercise-media-quality`؛ يتفرّد بنسخة مختلفة من `docs/content/EXERCISE-MEDIA-COVERAGE.md` | **[متجاوَز]** إلا الوثيقة | `rescue/q20-media-perf-baseline` |
| `a05f4a1` | 2026-07-28 | حالة ما قبل الحذف لفرع `fix/audit-cleanup-wave` (٣٤ ملفًا حذفها الفرع لاحقًا) | **[متجاوَز]** — الفرع أحدث | `rescue/audit-cleanup-wave-wip` |
| `b04c594` | 2026-07-26 | إصلاحات Q15 — **١٨ ملفًا مطابقة تمامًا** لفرع `claude/q15-ios-shell-visual-fix` | **[متجاوَز]** — لا يتفرّد بشيء | لا حاجة |
| `079af93` · `733e710` · `344ff6f` | 2026-07-30 | WIP على `c/saudi-foods` — **كل ملفاتها مطابقة للجذع حرفيًا** | **[فارغ]** | لا حاجة |
| `51fb278` | 2026-08-01 | WIP على `a/e2e-onboarding-realign` — **كل ملفاته مطابقة للجذع** | **[فارغ]** | لا حاجة |
| `e38fdeb` | 2026-07-29 | سطر واحد في `package-lock.json` | **[فارغ أو تجريبي]** | لا حاجة |

### 4.3 أعمال كانت مفقودة كليًا من المستودع الرئيسي (10 إيداعات)

هذه هي الحصيلة الحقيقية للعملية. عشرة إيداعات **لم تكن موجودة في `qimmah-deploy` ولا على GitHub** — كانت محبوسة داخل نسخ مستقلة على القرص. جُلبت جميعًا (`git fetch`) وصار لكل منها فرع إنقاذ.

| الإيداع | المصدر | التاريخ | غير مدمج | الحجم | فرع الإنقاذ | الأهمية |
|---|---|---|---|---|---|---|
| `680152b` | `gym-os-template` → فرع محلي `codex/structure-uiux-v1` — **لا وجود له على الأصل إطلاقًا** | 2026-07-25 | **6** | 55 / +1177 / −735 | `rescue/codex-structure-uiux-v1` | **الأعلى.** إعادة بناء بنية التطبيق الجوّال + تلميع التدفقات الأساسية + إبقاء الصفحات القانونية داخل التطبيق + تكافؤ اللغة + أسطح تمرير أصلية |
| `2a00857` | `gym-os-template` → `codex/qimmah-rc-integration` متقدّم **٩ إيداعات** غير مدفوعة عن نظيره البعيد | 2026-07-26 | **9** | 108 / +4885 / −208 | `rescue/codex-qimmah-rc-integration` | **عالية.** كومة مدمجة تضمّ Q15+Q16+Q18+Q19+Q20+Q21 — بديل عن دمج ٦ فروع منفردة |
| `1d75857` | `gym-os-template` → `integration/p12` متقدّم إيداعًا واحدًا | 2026-07-03 | 1 | 33 / +33 / −1 | `rescue/p12-gif-assets` | متوسطة — أصول GIF لـP12 |
| `af080a0` | `qimmah-merge` → `hotfix/replace-bad-muscle-map` | 2026-06-27 | 2 | 12 / +279 / −211 | `rescue/mobile-qa-routes-polish` | منخفضة — حقبة يونيو |
| `06c1a98` | `qimmah-p25-a1` → `integration/phase2.5` | 2026-06-30 | 1 | 3 / +1580 / −100 | `rescue/integration-phase25-merge` | متوسطة — دمج P2.5 A1: هدفان + خيار التقسيم + أسئلة التغذية |
| `ed929a1` | `gym-os-template` → stash | 2026-07-12 | 3 | 1 / +2 | `rescue/stash-ios-signing-artifacts` | منخفضة — إعداد توقيع iOS |
| `4824de9` | `gym-os-template` → معلّق | 2026-07-09 | 2 | 2 / +27 / −1 | `rescue/p12-assets-schema-wip` | منخفضة — `P12_ASSETS.md` + `machineImages.ts` |
| `3ab6de9` | `gym-os-template` → معلّق | 2026-07-05 | 2 | 2 / +27 / −1 | `rescue/p12-machine-images-wip` | منخفضة — فرق مطابق لسابقه (شجرة مختلفة) |
| `9f74c11` | `gym-os-template` → معلّق | 2026-07-04 | 2 | 1 / +10 / −1 | `rescue/p12-machine-gifs-wip` | منخفضة — `P12_ASSETS.md` |
| `33c8aaa` | `gym-os-template` → معلّق | 2026-06-27 | 2 | 4 / +153 / −62 | `rescue/workout-history-binding-wip` | منخفضة — حقبة يونيو |

**آلية الاستعادة:** أُنشئت مراجع مؤقتة `refs/nard-import/*` داخل النسخ المصدر (إجراء إضافي بحت)، ثم جُلبت إلى المستودع الرئيسي تحت مساحة `refs/nard/*` (71 مرجعًا محفوظًا كسجلّ للنسخ الشقيقة)، ثم ثُبّتت الأهم منها كفروع `rescue/*`.

### 4.4 قائمة فروع الإنقاذ الكاملة (20)

```
rescue/audit-cleanup-wave-wip          a05f4a1  2026-07-28
rescue/codex-qimmah-rc-integration     2a00857  2026-07-26   ★
rescue/codex-structure-uiux-v1         680152b  2026-07-25   ★★
rescue/integration-phase25-merge       06c1a98  2026-06-30
rescue/legal-data-region-japan         15439bd  2026-07-13
rescue/mobile-qa-routes-polish         af080a0  2026-06-27
rescue/p12-assets-schema-wip           4824de9  2026-07-09
rescue/p12-gif-assets                  1d75857  2026-07-03
rescue/p12-machine-gifs-wip            9f74c11  2026-07-04
rescue/p12-machine-images-wip          3ab6de9  2026-07-05
rescue/p25-saudi-restaurant-foods      59c92be  2026-06-30
rescue/q20-media-perf-baseline         6f10f8d  2026-07-26
rescue/recovery-v11-merge              b435340  2026-07-20
rescue/recovery-v11-merge-alt          3c23129  2026-07-20
rescue/saudi-foods-nutritionv2-wip     7b12979  2026-07-30
rescue/stash-ios-signing-artifacts     ed929a1  2026-07-12
rescue/stash-today-v2-proof-draft      267a33c  2026-07-13
rescue/ux-core-mobileshell-wip         cfd1ca5  2026-07-16
rescue/ux-entry-onboarding-polish      fe43a00  2026-07-16
rescue/workout-history-binding-wip     33c8aaa  2026-06-27
```

---

## 5. أعمال ضائعة استُعيدت

| # | العمل | كان مفقودًا في | استُعيد إلى |
|---|---|---|---|
| 1 | **إعادة بناء بنية التطبيق الجوّال + تكافؤ اللغة** — ٦ إيداعات، ٥٥ ملفًا، لم تُدفع إلى GitHub قط | فرع محلي في `gym-os-template` فقط | `rescue/codex-structure-uiux-v1` |
| 2 | **كومة Q15→Q21 المدمجة** — ٩ إيداعات غير مدفوعة | `gym-os-template` | `rescue/codex-qimmah-rc-integration` |
| 3 | ٢٠ صنف مطاعم سعودية + `bodyAnatomy` + عدّاد الخطوات (+1724) | إيداع معلّق بلا مرجع | `rescue/p25-saudi-restaurant-foods` |
| 4 | دمج P2.5 A1 (هدفان + خيار التقسيم + أسئلة التغذية) | `qimmah-p25-a1` | `rescue/integration-phase25-merge` |
| 5 | تلميع دخول/إعداد/استعادة كلمة المرور | إيداع معلّق | `rescue/ux-entry-onboarding-polish` |
| 6 | أصول GIF لـP12 (٣٣ ملفًا) | `gym-os-template` | `rescue/p12-gif-assets` |
| 7 | إفصاح منطقة التخزين اليابانية في `public/legal/privacy.html` | إيداع معلّق | `rescue/legal-data-region-japan` |
| 8 | إعداد توقيع iOS (`DEVELOPMENT_TEAM`) | stash في نسخة شقيقة | `rescue/stash-ios-signing-artifacts` |
| 9 | تلميع مسارات QA الجوّال | `qimmah-merge` | `rescue/mobile-qa-routes-polish` |
| 10 | نقاط حفظ P12 (`P12_ASSETS`, `machineImages`) وربط سجلّ التمرين | معلّقات في `gym-os-template` | `rescue/p12-*`, `rescue/workout-history-binding-wip` |
| 11 | WIP على `NutritionV2` و`MobileShell` | معلّقات | `rescue/saudi-foods-nutritionv2-wip`, `rescue/ux-core-mobileshell-wip` |
| 12 | محرّك التعافي v1.1 (نسختان) | معلّقان | `rescue/recovery-v11-merge{,-alt}` |

## 6. أعمال لم يمكن استعادتها

**لا شيء.**

- كل اسم فرع ظهر في أي `reflog` له مرجع حيّ.
- كل إيداع معلّق كُشف بـ`fsck` أُسند إلى فرع `rescue/*` أو ثبت أن محتواه مطابق للجذع حرفيًا.
- كل نسخة شقيقة (37) وكل شجرة عمل (117) فُحصت، وكل إيداع فيها إمّا موجود أصلًا في المستودع الرئيسي أو جُلب إليه.
- الـ stashes الاثنتان محفوظتان.

القيد الوحيد المعروف: `git fsck` لا يكشف الكائنات التي كنسها `git gc` قبل هذه الجلسة. لا دليل على وقوع ذلك (لا فجوات في reflog، ولا أسماء فروع بلا مرجع)، لكن لا يمكن إثبات نفيه بأثر رجعي.

---

## 7. قائمة الدمج المقترحة — مرتّبة بالأولوية

> جميع التعارضات أدناه **مقيسة فعليًا** بـ`git merge-tree --write-tree origin/main <الفرع>` — ليست تقديرًا.
> لم يُنشأ فرع `integration/dry-run` لأن `merge-tree` أعطى النتيجة نفسها دون لمس شجرة العمل أو الجذع.

### الموجة 1 — صفر تعارض · قيمة عالية · مخاطرة معدومة (10 عناصر)

ادمجها بأي ترتيب؛ لا تتقاطع.

| # | الفرع | سبب الدمج | الحجم | تعارض |
|---|---|---|---|---|
| 1 | `docs/beta-ops` | حزمة تشغيل بيتا كاملة — توثيق بحت، لا كود | 5 / +502 | 0 |
| 2 | `audit/code-notes-full` | خريطة إعادة الهيكلة — مرجع للموجات القادمة | 2 / +787 | 0 |
| 3 | `audit/v3-fidelity-full` | تقرير مطابقة v3 | 9 / +138 | 0 |
| 4 | `audit/v3-inventory` | جرد V3 صادق | 1 / +242 | 0 |
| 5 | `audit/app-structure-deep` | تدقيق البنية + حكم HIG | 1 / +246 | 0 |
| 6 | `chore/repo-ledger` | دفتر أحكام الفروع | 1 / +194 | 0 |
| 7 | `research/product-ideas` | بنك ٣٤ فكرة موثّق | 1 / +387 | 0 |
| 8 | `chore/v3-baseline` | ترسيخ معيار التصميم v3.0 كمرجع رسمي | 5 / +525 | 0 |
| 9 | `chore/training-focus-verdict` | حوكمة CTO‑56/57/58 + أحكام معلّقة | 10 / +417 / −105 | 0 |
| 10 | `fix/brand-mark-swap` | إصلاح سطرين في صفحة الصحافة | 1 / +2 | 0 |

### الموجة 2 — صفر تعارض · كود واختبارات (5 عناصر)

| # | الفرع | سبب الدمج | الحجم | تعارض |
|---|---|---|---|---|
| 11 | `g/account-isolation` | شروط قبول عزل الحسابات — أمان بيانات | 1 / +75 | 0 |
| 12 | `origin/claude/h2-active-session-test-gaps` | يسدّ تأكيدًا أجوف في الاختبارات | 1 / +41 | 0 |
| 13 | `i/journey-advanced` | رحلة e2e ثالثة + ختم الأرض | 36 / +742 / −67 | 0 |
| 14 | `origin/fix/release-qa-offline-a11y` | QEA‑003→006 + WCAG AA + مصفوفة XSS — **أكبر مكسب جودة بصفر تعارض** | 16 / +2025 | 0 |
| 15 | `claude/q15-ios-shell-visual-fix` | قشرة iOS: شريط الحالة، منطقة الأمان، منع القصّ | 26 / +217 / −39 | 0 |

### الموجة 3 — تعارض `package.json` فقط (حلّ ميكانيكي)

`package.json` مملوك للمنسّق بحسب §1.4/2 من الميثاق؛ التعارض دائمًا سطر سكربت `test:*` واحد. **رتّب هذه الموجة تسلسليًا** وحلّ `package.json` مرة واحدة في كل خطوة.

| # | الفرع | سبب الدمج | الحجم | تعارض |
|---|---|---|---|---|
| 16 | `origin/e/plan-preview-host` | **قمّة سلسلة الخطة** — يبتلع `e/plan-rationale`+`e/plan-preview`+`e/plan-why`+`e/plan-honest-axes`. ادمجه وحده وتجاهل الأربعة | 24 / +2525 | 1 |
| 17 | `claude/p14-english-content-completion` | إكمال الإنجليزية — يفكّ حظر الإطلاق الدولي | 15 / +1087 / −134 | 1 |
| 18 | `claude/q19-workout-layout-order` | بنية شاشة التمرين + ترتيب صريح | 12 / +510 / −27 | 1 |
| 19 | `claude/q20-exercise-media-quality` | وسائط التمارين: جرد + حالات صادقة + حارس | 21 / +1051 / −128 | 1 |

### الموجة 4 — تعارضات كود حقيقية (2–3 ملفات) · تحتاج مراجعة

**ترتيب إلزامي** — الملفات المتنازعة متداخلة:

| # | الفرع | ملفات التعارض | سبب الدمج | الحجم |
|---|---|---|---|---|
| 20 | `origin/claude/h1-session-resume` | `src/i18n/dict/workoutScreen.ts` | استئناف تمرين غير منتهٍ — **ادمجه قبل ٢١** | 6 / +537 |
| 21 | `h/workout-session-resume` | `src/lib/workoutV2Model.ts`, `src/views/WorkoutV2.tsx` | استئناف بسؤال لا بقفزة صامتة — يبني على ٢٠ | 8 / +783 |
| 22 | `origin/claude/account-creation-bracket-error-rzxfv0` | `src/App.tsx` | إبقاء الخطة بعد إنشاء الحساب — **عطل مستخدم حقيقي** | 6 / +514 |
| 23 | `e/settings-clarity-r2` | `src/views/SettingsView.tsx` | إعادة تنظيم الإعدادات + تسلسل عناوين a11y — **قبل ٢٤** | 11 / +474 / −232 |
| 24 | `claude/q18-health-discoverability` | `package.json`, `src/App.tsx`, `src/views/SettingsView.tsx` | اكتشاف ربط Apple Health — يلمس نفس ملفات ٢٢ و٢٣ | 28 / +997 |
| 25 | `e/calc-adopt` | `src/views/ProgressV2.tsx` | شارح الحسابات — **قبل ٢٦** (نفس الملف) | 14 / +1843 / −197 |
| 26 | `e/steps-adopt` | `package.json`, `src/views/ProgressV2.tsx` | صفحة الخطوات المستقلة | 17 / +632 |
| 27 | `claude/q16-today-greeting-contrast` | `package.json`, `src/views/TodayV2.tsx` | بطاقة اليوم + ترحيب بالاسم | 13 / +839 |
| 28 | `claude/q21-muscle-map-replacement` | `package.json`, `src/views/ProgressV2.tsx` | إزالة مجسّم العضلات — **بعد ٢٥ و٢٦** | 17 / +1270 |
| 29 | `fix/signup-numerals-dialect` | `package.json`, `scripts/password-policy-proof.ts` | أرقام عربية/فارسية في كلمة المرور | 4 / +86 |
| 30 | `site/brand-email-update` | `site/privacy.html`, `site/support.html`, `site/terms.html` | علامة Ascent + توحيد بريد الدعم | 6 / +16 / −13 |
| 31 | `import/codex-p0-batch1` | `scripts/e2e-onboarding.mjs`, `src/views/NutritionV2.tsx` | حزمة P0 (١١ إيداعًا) — **آخر الموجة**، يلمس أوسع مساحة | 35 / +726 |

### الموجة 5 — البنية التحتية (تعارضان لكل واحد)

| # | الفرع | ملفات التعارض | ملاحظة |
|---|---|---|---|
| 32 | `claude/p14-supabase-schema-rls` | `docs/data/SUPABASE-P14-SCHEMA.md`, `package.json` | ٥ هجرات قاعدة بيانات — **يتطلب بوابة موافقة منفصلة قبل التطبيق على قاعدة حيّة** |
| 33 | `claude/p14-ios-native-hardening` | `docs/audit/DEVICE-NOT-VERIFIED.md`, `package.json` | HealthKit/باركود/إشعار راحة — يتقاطع مع ٢٤ |
| 34 | `claude/p14-e2e-release-gate` | ٥ ملفات (`scripts/e2e/*`) | يتقاطع مع ١٣ و٣١ — **ادمجه بعدهما** |
| 35 | `origin/content/food-r2-gcc-eatingout` | ٤ ملفات (`src/data/foodItems.ts` وغيره) | ٦٠ صنف خليجي — يتقاطع مع `rescue/p25-saudi-restaurant-foods` |

### الموجة 6 — الأعمال المُنقَذة (قرار مؤسس مطلوب)

| # | الفرع | تعارض | التوصية |
|---|---|---|---|
| 36 | `rescue/codex-structure-uiux-v1` | **15** | **راجعه يدويًا أولًا.** ٦ إيداعات لم تُدفع قط؛ قد يكون بعضها ذاب في الجذع عبر مسار آخر. القيمة عالية لكن المخاطرة كذلك |
| 37 | `rescue/codex-qimmah-rc-integration` | **5** | **لا تدمجه مع الموجة 3/4.** يكرّر Q15+Q16+Q18+Q19+Q20+Q21 بإيداعات مختلفة (تحقّقتُ: ليس سلفًا لأي منها، و`patch-id` مختلف). **اختر مسارًا واحدًا**: إمّا الفروع المنفردة (١٥، ١٨، ١٩، ٢٤، ٢٧، ٢٨) — وهو **الموصى به** لأنها مبنية على الجذع وتعارضاتها أقل — أو هذه الكومة بدلًا منها جميعًا |
| 38 | `rescue/integration-phase25-merge` | **0** | نظيف تمامًا. لكنه من حقبة 2026-06-30؛ تحقّق من بقاء قيمته قبل الدمج |
| 39 | `rescue/p12-gif-assets` | 1 | أصول GIF — قيمة مباشرة إن كانت الوسائط ما زالت مستخدمة |
| 40 | `rescue/legal-data-region-japan` | 2 | **افحصه قانونيًا**: الجذع يذكر `ap-northeast-1` لكن `public/legal/privacy.html` غائب عنه |
| 41 | `rescue/ux-entry-onboarding-polish` | 1 | ٣ ملفات — منخفض المخاطرة |
| 42 | `rescue/p25-saudi-restaurant-foods` | **5** | يتعارض مع حذف `WeeklyMuscleMap.tsx` في الجذع. **استخرج بيانات `foodItems` فقط**، لا تدمج الفرع كاملًا |
| 43 | `rescue/mobile-qa-routes-polish` · `rescue/workout-history-binding-wip` | 12 · — | حقبة يونيو، ما قبل التوحيد. **لا يُنصح بالدمج** — احتفظ بها كسجلّ |
| 44 | `rescue/recovery-v11-merge{,-alt}` · `rescue/q20-media-perf-baseline` · `rescue/audit-cleanup-wave-wip` · `rescue/saudi-foods-nutritionv2-wip` · `rescue/ux-core-mobileshell-wip` · `rescue/p12-*-wip` · `rescue/stash-*` | متفاوت | **متجاوَزة أو مجهرية.** احتفظ بها كسجلّ، لا تدمجها |

### ما لا يُدمج إطلاقًا

- **`fix/audit-cleanup-wave`** — **٤٨ ملف تعارض**، منها `modify/delete` على `netlify.toml` و`add/add` على مكوّنات كاملة. يحذف ١٧ ملفًا من `src/sections/` حذفها الجذع أصلًا بمسار مختلف. **الخطر يفوق العائد بفارق كبير.**
- **`origin/codex/v21-completion`** — ٢٣ ملف تعارض، والجذع تجاوز v2.1 إلى v3.
- **`merge/release-rc-into-trunk`** — ١٧٣ ملفًا لكن بقواعد دمج متعددة؛ محتواه دخل الجذع بمسار آخر.
- **كل فروع الحقبة الأولى** (يونيو–أوائل يوليو، §3.3) — التطبيق أُعيد بناؤه فوقها.
- **كل الفروع المتجاوَزة في §3.3** — دمجها يعيد إدخال كود قديم.

---

## 8. الأرقام الختامية

| | العدد |
|---|---|
| **إجمالي الفروع المحصورة** (أسماء مميّزة) | **294** |
| — منها مدمجة بالكامل | 206 |
| — منها غير مدمجة | 88 |
| **إجمالي المراجع المحصورة** | 416 + 71 مستوردًا من النسخ الشقيقة = **487** |
| **الإيداعات الفريدة المحصورة** | 291 (+10 مستعادة) = **301** |
| **الأعمال المُنقَذة** (فروع `rescue/*`) | **20** |
| — منها استُعيدت من ضياع فعلي | **10 إيداعات** من نسخ شقيقة + **9** من معلّقات المستودع الرئيسي |
| **المرشحون للدمج** | **31** (الموجات 1–5) |
| — بصفر تعارض | **15** |
| — بتعارض `package.json` فقط | **4** |
| — بتعارضات كود حقيقية | **12** |
| **بانتظار قرار المؤسس** (المُنقَذة) | **9** |
| **موصى بعدم دمجها** | **48** فرعًا متجاوَزًا/فارغًا + 3 عالية الخطر |
| stashes محفوظة (لم تُحذف) | 2 |
| فروع حُذفت | **0** |
| عمليات `push --force` | **0** |
| إعادة كتابة تاريخ | **0** |
| دمج في الجذع | **0** |

---

## 9. سجلّ الامتثال للقواعد الحاكمة

| القاعدة | الحالة | الدليل |
|---|---|---|
| ممنوع حذف أي فرع | ✅ | 0 عمليات حذف؛ عدد الفروع ارتفع من 151 إلى 171 محليًا |
| ممنوع `push --force` | ✅ | لم يُنفَّذ أي `push` إطلاقًا |
| ممنوع إعادة كتابة التاريخ | ✅ | لا `rebase`/`filter-branch`/`reset --hard` |
| ممنوع حذف stash | ✅ | `git stash list` سليم |
| إجراءات إضافية فقط | ✅ | 3 وسوم + 20 فرع `rescue/*` + 71 مرجع `refs/nard/*` + 5 مراجع `refs/nard-import/*` في `gym-os-template` + هذا الملف |
| ممنوع الدمج في الجذع | ✅ | `origin/main` = `658d088` دون تغيير؛ كل فحص تعارض تمّ بـ`merge-tree` في الذاكرة |

---

*انتهى التقرير. بانتظار [CTO-61] بقائمة الدمج الموقّعة من المؤسس.*
