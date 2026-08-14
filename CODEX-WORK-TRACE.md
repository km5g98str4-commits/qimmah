# CODEX-WORK-TRACE — التتبّع الجنائي لعمل Codex Web Sovereign

**الأمر:** `[QIM-CODEX-WORK-TRACE-001]` · **التاريخ:** 2026-08-14 · **الوكيل:** Claude (`claude-opus-5`)
**النطاق:** تتبّع وقراءة فقط. **لم يُعدَّل أي product code، ولم يُنفَّذ أي merge/rebase/cherry-pick.**

> **قاعدة هذا المستند (البند ١١ من الأمر): Git هو المرجع.**
> كل صفٍّ أدناه مستخرَج من `git log/show/diff/ls-remote` ومن المصدر الفعلي، لا من `STATE.md`.
> وحيث اختلفت الوثيقة عن Git، سُجِّل الاختلاف في §11 بدل أن يُصحَّح صامتًا.

---

## 0. ملاحظة منهجية أولى — لماذا كاد هذا التتبّع يفشل

النسخة المحلية عند بدء الجلسة كانت **clone ضحلًا** (`.git/shallow` بطُعمين، 63 التزامًا فقط، أقدمها 2026-08-02).
`git log --all | grep -i 'codex\|PKG'` عليها أعطى **صفر نتائج** — أي أن التقرير كان سيُكتب «لا وجود لسلسلة Codex».

```
.git/shallow           → b7d93c1, d642178
git rev-list --all     → 63
git fetch --unshallow  → git rev-list --all → 1021
```

**بعد فكّ الضحالة ظهرت السلسلة كاملة و٦ فروع Codex.** يُسجَّل هذا لأنه ليس تفصيلًا إجرائيًا:
**غياب الدليل في مستودع ضحل ليس دليل غياب** — وأي وكيل قادم يبدأ من حاوية جديدة سيقع في نفس الفخّ.

---

## 1. سلسلة الالتزامات الكاملة (البند ١)

**خطّية تمامًا، بلا merge ولا rebase**، من الجذع الحالي إلى آخر رأس.

| # | SHA | التاريخ (author) | المالك | العنوان |
|---:|---|---|---|---|
| — | `cc60adf` | 2026-08-11 12:33 +0300 | المؤسس | `merge: [QIM-WEB-RELEASE-002]` — **رأس `main` الحالي، نقطة التفرّع** |
| 1 | `a09d7b3` | 2026-08-11 13:06 +0000 | Claude | FOUNDER-UX-003 الحزمة ١ — قاع الشاشة يستقبل النقر |
| 2 | `bceb9b6` | 2026-08-11 13:36 +0000 | Claude | FOUNDER-UX-003 الحزمة ٢ — بوّابة المعاينة |
| 3 | `eccd047` | 2026-08-11 16:33 +0000 | Claude | FOUNDER-UX-004 الحزمة ٣ — التسليم كشف قيمة |
| 4 | `c2fd987` | 2026-08-11 17:09 +0000 | Claude | FOUNDER-UX-004 الحزمة ٤ — موثوقية التغذية |
| 5 | `6f87ee9` | 2026-08-11 22:08 +0000 | Claude | FOUNDER-UX-005 الحزمة ٥ — مصدر واحد ليوم التمرين |
| 6 | `af5274b` | 2026-08-12 00:11 +0000 | Claude | FOUNDER-UX-006 الحزمة ٦ — التنقّل والتاريخ عقد · **BASELINE المعلَن** |
| 7 | `f78676e` | 2026-08-13 22:11 +0300 | **Codex** | `[PKG-0][green]` establish launch truth baseline |
| 8 | `8b29ca3` | 2026-08-13 22:46 +0300 | **Codex** | `[PKG-1][green]` harden preview survival and diagnostics |
| 9 | `28c725e` | 2026-08-14 01:53 +0300 | **Codex** | `[PKG-2][green]` complete meaningful first-user funnel |
| 10 | `678a38d` | 2026-08-14 10:33 +0300 | **Codex** | `[PKG-3][green]` harden live nutrition truth |
| 11 | `df5e55b` | 2026-08-14 11:06 +0300 | **Codex** | `[PKG-4][green]` harden today workout loop |
| 12 | `7478507` | 2026-08-14 11:48 +0300 | **Codex** | `[PKG-5][green]` complete progress measurements |
| 13 | `f49ae01` | 2026-08-14 12:42 +0300 | **Codex** | `[PKG-6][green]` harden exercise library detail |
| 14 | `1bcf7a9` | 2026-08-14 14:08 +0300 | **Codex** | `[PKG-7][green]` restore secure data and numeral policy · **⚠ أساس Phase II** |
| 15 | `e8f3bb6` | 2026-08-14 21:13 +0300 | **Codex** | `[PKG-8][green]` converge Profile truth and navigation context · **آخر checkpoint لـCodex** |
| 16 | `9f88e43` | 2026-08-14 21:07 +0000 | **Claude** | `[PKG-9][green]` Quick Log, dirty-state boot, production-artifact safety · **بداية التعافي** |
| 17 | `d83add2` | 2026-08-14 21:38 +0000 | **Claude** | `docs(sovereign): final gate from 9f88e43` · **الرأس النهائي** |

**الإجمالي من `af5274b` إلى `d83add2`:** ١١١ ملفًا · **+7,046 / −1,527**
منها: `src/` ٥٦ ملفًا (+2,360/−1,121) · `scripts/` ٥٠ ملفًا (+3,464/−402) · `docs/` ٣ ملفات (+1,200).

### 1.1 كيف حُدِّدت الملكية (Codex أم Claude) — بالدليل لا بالادّعاء

الملكية **ليست** مأخوذة من نصّ الالتزام. مصدرها شاهدان مستقلّان:

1. **هوية author/committer.** `PKG-0…PKG-8` كلها `Ziyad <km5g98str4-commits@users.noreply.github.com>` (هوية آلة Codex).
   `PKG-9` و`d83add2` كلاهما `Claude <noreply@anthropic.com>`.
2. **زمن إنشاء الحاوية.** هذه الحاوية أُنشئت `2026-08-14 19:39 UTC`. و`PKG-8` أُودع `18:13 UTC` — **قبل وجودها**؛
   بينما `PKG-9` (`21:07 UTC`) و`d83add2` (`21:38 UTC`) بعدها.

⚠ **درجة الدليل:** الشاهد الأول **حقيقة مؤكدة** من كائنات Git. الشاهد الثاني **استنتاج** — طوابع Git يحدّدها الكاتب.
والشاهدان يتفقان، فحدّ الملكية `PKG-8 | PKG-9` **مؤكَّد بدرجة عالية**، لا مجزوم به رياضيًا.

---

## 2. جدول الباقات التفصيلي (البند ٢)

**حالة الدفع لكل الصفوف:** ✅ **PUSHED** — كل التزام في السلسلة سلفٌ مباشر لرأسي `origin/codex/qimmah-web-sovereign-001`
و`origin/claude/web-sovereign-final-recovery-o8alub`، وكلاهما عند `d83add2` (مُتحقَّق بـ`git ls-remote --heads origin`).

---

### PKG-0 · `f78676e3abfe877248ef9126427ee52d6f65a894` · Codex · 2026-08-13 22:11 +0300
- **الملفات:** ٣ · **+347 / −0** · كلها في `docs/execution/qimmah-web-sovereign/`
- **الهدف:** تثبيت خطّ الأساس — سجلّ الحالة والأعطال وقرارات المؤسس المستقلّة.
- **الأعطال:** لا شيء يُغلق. **يفتح** BUG-001…BUG-005 وEXTERNAL-001/002.
- **الاختبارات:** لا شيء. بوابات الأساس فقط (`npm ci`/typecheck/lint/build/test:gate).
- **الدليل:** `npm audit` = 3 HIGH متعدّية (→ BUG-003)؛ البوابة الكاملة خضراء بعد إذن الاستماع المحلّي.
- **النوع:** **DOCS ONLY** — لا contract ولا implementation.

### PKG-1 · `8b29ca3b1e9aebba0b046109ea7552754f28a9db` · Codex · 2026-08-13 22:46 +0300
- **الملفات:** ٢٠ · **+546 / −419**
- **الهدف:** بقاء المعاينة وتشخيصها — توحيد ErrorBoundary وتوجيه مسار Progress لمالكه الصحيح.
- **الأعطال المغلقة:** BUG-001 (حارس Premium قبل الكاتب) · BUG-002 (مسار `#/progress` يعرض `ProgressView` القديم) · BUG-004 (ErrorBoundary الخاص بالإعداد يُكمل onboarding زورًا) · BUG-005 (لا مرجع دعم في الخطأ).
- **الاختبارات:** **جديد** `run-activation-ui-proof.mjs` (13) · `run-error-boundary-proof.mjs` (14). **مُقوّى** `run-access-gate-proof.mjs` 42→72 · `e2e/preview-gate.mjs` →34 · `e2e/install-overlap.mjs` →200.
- **الدليل:** `test:access-gate` 72/72 · `test:progress-v2` 11/11.
- **النوع:** **CONTRACT CHANGE** — `ProgressView.tsx` من ٢٢٦ سطرًا إلى **٢٢ سطرًا** غلافًا فوق `ProgressV2` (تحوّل ملكية مسار)؛ وقاموس `errorBoundary.ts` يسحب نصوصًا من `config/strings.ts`.

### PKG-2 · `28c725e4e4869d454d6b007cc11a92222a059ac1` · Codex · 2026-08-14 01:53 +0300
- **الملفات:** ٣٨ · **+1,601 / −615** — **أكبر باقة في السلسلة**
- **الهدف:** قمع أول مستخدم ذو معنى — ١٨ سؤالًا لكلٍّ منها مستهلك مُثبت، عبر سبع شاشات بدل خمس.
- **الأعطال المغلقة:** BUG-006 (عدد أسئلة غير صادق) · BUG-007 (خفض العمر يُبقي هدفًا مقيَّدًا مختارًا بصريًا).
- **الاختبارات:** **جديد** `onboarding-questions-proof.ts` (97) · `e2e/lib/onboarding-driver.mjs` (سائق مشترك). **مُقوّى** `onboarding-intent` 70 · `onboarding-async` 40 (ترحيل v5→v6) · مصفوفة المتصفّح 36 حالة · الرحلات الثلاث التاريخية.
- **الدليل:** `test:e2e:onboarding` 20/20 · `plan-handoff` 98/98 · `navigation` 95/95. سقوط مسمّى واحد في `test:training-focus-gap` أُصلح ثم أُعيدت البوابة كاملة.
- **النوع:** **CONTRACT CHANGE — الأوسع أثرًا.** تغيّرت بنية `OnboardingProfile`: حُذف `trainingYears`/`pref`، وأُضيف `trainedBefore`/`totalMonths`/`lastTrained`/`consistency`/`neat`/`dietPattern`/`hasInjury`؛ و`LAST_INPUT_STEP` من ٤ إلى ٦؛ وسجلّ `ONBOARDING_QUESTION_IDS` صار العقد.

### PKG-3 · `678a38d01d2206ff02b245281d621fc37ed19658` · Codex · 2026-08-14 10:33 +0300
- **الملفات:** ١٣ · **+642 / −84**
- **الهدف:** صدق التغذية الحيّة — الكمية والمصدر يعبران الحفظ، ولا نجاح مُعلَن على كتابة فاشلة.
- **الأعطال المغلقة:** BUG-008 (المحوّل يُسقط الكمية والمصدر) · BUG-009 (نجاح مُعلَن بعد كتابة فاشلة) · BUG-010 (الحذف يلتفّ على سطح Premium) · BUG-011 (الحصص الكسرية تُضخَّم بحذف الفاصلة).
- **الاختبارات:** **جديد** `nutrition-live-proof.ts` (13). **مُقوّى** `access-gate` 72→77 · `e2e/nutrition-reliability` 91→106.
- **الدليل:** `test:nutrition-history` 61/61 · بناء 2,556 وحدة.
- **النوع:** **CONTRACT CHANGE** — `nutritionTracking.ts` (+97/−…) يحمل الكمية والمصدر في نموذج الحفظ.

### PKG-4 · `df5e55bebc31149484c3d06a9f59348b1697f9e1` · Codex · 2026-08-14 11:06 +0300
- **الملفات:** ١٠ · **+493 / −39**
- **الهدف:** حلقة تمرين اليوم — لا لقطة قابلة للاستئناف تُمسح قبل نجاح الكتابة الدائمة.
- **الأعطال المغلقة:** BUG-012 (مسح اللقطة قبل الإتمام الدائم) · BUG-013 («العودة لليوم» لا تعود لليوم).
- **الاختبارات:** **جديد** `e2e/workout-reliability.mjs` (31). **مُقوّى** `storage-honesty-proof.ts` →44 (+45/−2: حصّة اللقطة النشطة، بايتات آخر نسخة سليمة، ترتيب الإيداع، هجومان).
- **الدليل:** `test:workout-day-source` 19/19 · `test:today-v2` 48/48.
- **النوع:** **IMPLEMENTATION + تشديد عقد التخزين** على `activeWorkout.ts` (ترتيب الكتابة قبل المسح).
- **✔ شرط الميثاق:** `test:storage-honesty` بقي عابرًا وقُوّي — سلسلة صدق الحفظ لم تُمسّ سلبًا.

### PKG-5 · `7478507b7c46ee9b6018b1ef67c31ca40fbed6d2` · Codex · 2026-08-14 11:48 +0300
- **الملفات:** ٢٢ · **+872 / −68**
- **الهدف:** إتمام وعد القياسات — مسار حقيقي وسجلّ قابل للاستخدام.
- **الأعطال المغلقة:** BUG-014 (وعد القياسات بلا مسار) · BUG-015 (الحفظ/الحذف يعلن نجاحًا أو يلتفّ على Premium).
- **الاختبارات:** **جديد** `measurement-reliability-proof.ts` (11) · `e2e/progress-reliability.mjs` (25). **مُقوّى** `access-gate` →84 · `preview-gate` (+`#/measurements`) · `navigation-history` 95→96.
- **الدليل:** `sync-coverage` 56/56 · `asset-integrity` 35/35 (تطابق ١:١ بين المسارات وقوائم إعادة الكتابة).
- **النوع:** **CONTRACT CHANGE** — مسار `measurements` جديد في `appRoutes.ts` و`public/_redirects`؛ و`PAID_ACTIONS` +1.

### PKG-6 · `f49ae011450b9a0097e65b277d36bc7348ebd51f` · Codex · 2026-08-14 12:42 +0300
- **الملفات:** ١٢ · **+563 / −86**
- **الهدف:** تفصيل مكتبة التمارين — رابط عميق وعقد خروج مكتمل.
- **الأعطال المغلقة:** BUG-016 (كتالوج الأجهزة يلتفّ على عقد الرابط العميق) · BUG-017 (لا عقد modal/خروج من رابط مباشر).
- **الاختبارات:** **جديد** `exercise-library-proof.ts` (16) · `e2e/exercise-library-reliability.mjs` (32).
- **الدليل:** `test:catalog` 274/274 · `navigation` **96/96 بلا تغيير** (إعادة تحقّق لا تليين).
- **النوع:** **CONTRACT CHANGE** — `#/exercises/:exerciseId` عبر `resourceIdFromHash`؛ ومرشِّح نقي مُصدَّر من `exerciseLibrary.ts`.

### PKG-7 · `1bcf7a99c657558f982154696b907efbd3d78ac5` · Codex · 2026-08-14 14:08 +0300 — ⚠ **أساس Phase II**
- **الملفات:** ١٧ · **+436 / −162**
- **الهدف:** استعادة مسار البيانات الآمن في الإعدادات، وسياسة أرقام واحدة.
- **الأعطال المغلقة:** BUG-018 (مستورد JSON يدوي غير مُتحقَّق أُعيد إدخاله) · BUG-019 (قدرات الإعدادات وعرض الأرقام ملتبسة).
- **الاختبارات:** **جديد** `settings-preferences-proof.ts` (17) · `e2e/settings-reliability.mjs` (14). **مُقوّى** `e2e/progress-reliability.mjs` (يطلب `٨١٫٥` ويرفض `81.5`).
- **الدليل:** `settings-import-security` 34/34 على اللوحة الحيّة المستعادة · `nutrition` 106/106 · `workout` 31/31 بعد توحيد الأرقام.
- **النوع:** **CONTRACT CHANGE** — `src/lib/numberFormat.ts` حدّ عرض واحد؛ و`DataManagementPanel` المالك القانوني الوحيد للاستيراد/التصدير.

### PKG-8 · `e8f3bb64569f8732e444dddd6acbd4b9be35c6be` · Codex · 2026-08-14 21:13 +0300 — **آخر checkpoint لـCodex**
- **الملفات:** ١٦ · **+550 / −235**
- **الهدف:** تقارب «ملفك» — مالك بيانات واحد، وحقيقة حساب/ضيف، وسياق عودة محفوظ.
- **الأعطال المغلقة:** BUG-020 (Profile يفرّع مالك نقل البيانات المُحصَّن) · BUG-021 (خلط حذف الحساب بإدارة بيانات الضيف) · BUG-022 (تكرار عنوان المسار وأهداف لمس <44px) · BUG-023 (إثبات Profile يقبل عملية غريبة على منفذه الثابت).
- **الاختبارات:** **جديد** `profile-reliability-proof.ts` (22) · `e2e/profile-reliability.mjs` (27). **مُعدَّل** `run-delete-account-proof.mjs` (فحص تعليق ← فحص ربط حيّ) · `run-momentum-proof.mjs` و`run-wave5-cross-system-smoke.mjs` (h1←h2).
- **الدليل:** هجوم منفذ 5328 بخادم غريب ⇒ **رفض مسمّى** لا قبول للأصل الغريب؛ سقوط مسمّى في `test:delete-account` كشف إثباتًا بائتًا فشُدّ.
- **النوع:** **CONTRACT CHANGE — كاسر.** حُذف الحقل `settings` من `ProfileV2Model`، و`deleteAccountAvailable` صار `auth.signedIn` بدل `true`. (تفصيله في `CONTRACT-CHANGES-SINCE-PKG7.md`.)

### PKG-9 · `9f88e43bf6c79c228337d83d30d58467db3a04d8` · **Claude** · 2026-08-14 21:07 +0000
- **الملفات:** ١٤ · **+1,096 / −38**
- **الهدف:** تقارب التسجيل السريع، والإقلاع على حالة تالفة، وسلامة أصل الإنتاج.
- **الأعطال المغلقة:** BUG-024 (مسار Quick Log يرمي حين يُحجب التخزين — **عطل بشكل Safari**) · BUG-025 («ماء» نيّة مُعلَنة بلا مستهلك) · BUG-026 (نيّة معلّقة تخطف زيارة لاحقة) · BUG-027 (إثبات Profile يطبع نجاحًا ثم يعلّق للأبد — خطر CI) · BUG-028 (علم onboarding تالف يُقرأ إكمالًا).
- **الاختبارات:** **جديد** `quick-log-reliability-proof.ts` (27، داخل البوابة) · `e2e/dirty-state-recovery.mjs` (47) · `production-bundle-safety-proof.mjs` (9).
- **الدليل:** **أحمر قبل أخضر بفحوص مسمّاة** — ٦ إخفاقات مسمّاة عند `e8f3bb6` قبل الإصلاح، منها تنفيذ التعبيرين الحيّين من `App.tsx:388` و`ProfileV2.tsx:84` وكلاهما يرمي `SecurityError` تحت تخزين محجوب.
- **النوع:** **CONTRACT CHANGE** — `src/lib/quickLogIntent.ts` مالك وحيد لمفتاح `qimmah:quick-log-intent`؛ و`loadOnboarding` من `!!parsed.completed` إلى `state.completed === true`.

### d83add2 · **Claude** · 2026-08-14 21:38 +0000
- **الملفات:** ٢ · **+119 / −0** — `STATE.md` و`BUGS.md` فقط.
- **الهدف:** تسجيل البوابة النهائية من `9f88e43`، وأحكام الإطلاق الأربعة، وحاصر المصادقة.
- **النوع:** **DOCS ONLY.**

---

## 3. تصنيف التغييرات إلى فئات (البند ٣)

الوسم: **■** الفئة الرئيسة للباقة · **□** مسّ ثانوي.

| الفئة | FUX 1–6 | P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Routing | ■(6) | | □ | | | | ■ | ■ | | ■ | □ |
| Onboarding | ■(3) | | □ | ■ | | | | | | | □ |
| Profile | | | | | | | □ | | | ■ | □ |
| Preview / Premium gating | ■(2) | | ■ | | □ | | □ | | | | |
| Auth | □(6) | | | | | | | | | □ | |
| Nutrition | ■(4) | | | | ■ | | | | □ | | ■ |
| Workout / Today | ■(5) | | | | | ■ | | | □ | | |
| Progress | | | ■ | | | | ■ | | □ | | |
| Measurements | | | | | | | ■ | | | | |
| Exercises | | | | | | | | ■ | | | |
| Settings | | | | | | | | | ■ | □ | |
| Quick Log | | | | | □ | | | | | | ■ |
| Storage | □(2) | | | | ■ | ■ | □ | | □ | | ■ |
| Error handling | | | ■ | | | | | | | | □ |
| i18n / RTL | | | □ | ■ | □ | □ | ■ | □ | ■ | □ | |
| Mobile | ■(1) | | | | | | | | | □ | |
| Accessibility | □(1) | | | | | | | □ | | ■ | |
| Build / tooling | □ | | □ | | | | | | | | ■ |
| Tests only | | | | | | | | | | | |
| Docs only | | ■ | | | | | | | | | |

**قراءة الجدول:** لا توجد باقة **Tests only** واحدة — كل باقة تحمل إصلاح منتج **ومعه** إثباته، وهو التزام
بـ§4 من الميثاق («كل إصلاح سلوك حرج يضيف سكربت إثبات ويُربط في `test:gate`»). والباقتان الوحيدتان
**Docs only** هما طرفا السلسلة: `PKG-0` و`d83add2`.

---

## 4. الجدول الموحّد: PKG → SHA → owner → scope → files → tests → behavioral effect (البند ٤)

| PKG | SHA | Owner | Scope | Files | +/− | Tests | Behavioral effect |
|---|---|---|---|---|---|---|---|
| FUX-1 | `a09d7b3` | Claude | Mobile · UI | 8 | +464/−63 | `bottom-overlay` جديد · `install-overlap` | قاع الشاشة صار قابلًا للنقر تحت لافتة التثبيت |
| FUX-2 | `bceb9b6` | Claude | Preview/Premium · Access | 43 | +1337/−19 | `access-gate` جديد · `preview-gate` جديد | طبقة `src/lib/access/**` كاملة: `PAID_ACTIONS` وحارس وحيد وسطح Premium واحد |
| FUX-3 | `eccd047` | Claude | Onboarding | 6 | +415/−38 | `e2e/plan-handoff` جديد | التسليم يعرض قيمة الخطة لا إشعار حفظ |
| FUX-4 | `c2fd987` | Claude | Nutrition | 5 | +366/−6 | `e2e/nutrition-reliability` جديد | التغذية لا تنهار ولا تُقذف على الجوال |
| FUX-5 | `6f87ee9` | Claude | Workout/Today | 8 | +342/−17 | `workout-day-source` جديد (19) | **مصدر واحد** ليوم التمرين بين اللوحة والتمرين |
| FUX-6 | `af5274b` | Claude | Routing · Auth | 11 | +496/−34 | `e2e/navigation-history` جديد (95) | المسارات والتاريخ عقد: تحديث/رجوع/404 محدّد |
| **0** | `f78676e` | Codex | Docs | 3 | +347/−0 | — | لا أثر سلوكي — تثبيت خطّ الأساس |
| **1** | `8b29ca3` | Codex | Preview · Errors · Progress | 20 | +546/−419 | +2 جديد، 4 مُقوّى | `#/progress` يعرض تجربة القياسات المُصانة؛ خطأ العرض لا يُكمل الإعداد زورًا |
| **2** | `28c725e` | Codex | Onboarding · i18n | 38 | +1601/−615 | +2 جديد، 6 مُقوّى | ٧ شاشات و**١٨ سؤالًا لكلٍّ مستهلك مُثبت**؛ «لم أتمرّن» إجابة كاملة |
| **3** | `678a38d` | Codex | Nutrition | 13 | +642/−84 | +1 جديد، 2 مُقوّى | الكمية والمصدر يعبران الحفظ؛ فشل الكتابة يُقال لا يُبتلع |
| **4** | `df5e55b` | Codex | Workout · Storage | 10 | +493/−39 | +1 جديد، 1 مُقوّى | الجلسة القابلة للاستئناف لا تُمسح قبل نجاح الحفظ الدائم |
| **5** | `7478507` | Codex | Measurements · Routing | 22 | +872/−68 | +2 جديد، 3 مُقوّى | مسار `#/measurements` حقيقي بإضافة/تعديل/حذف مُتحقَّق |
| **6** | `f49ae01` | Codex | Exercises · Routing | 12 | +563/−86 | +2 جديد | رابط عميق `#/exercises/:id` يصمد للتحديث والرجوع |
| **7** | `1bcf7a9` | Codex | Settings · i18n | 17 | +436/−162 | +2 جديد، 1 مُقوّى | مستورد واحد محصَّن؛ أرقام عربية في الواجهة العربية |
| **8** | `e8f3bb6` | Codex | Profile · A11y | 16 | +550/−235 | +2 جديد، 3 مُعدَّل | مالك بيانات واحد؛ حذف الحساب للمسجَّل فقط؛ `h1` واحد للمسار |
| **9** | `9f88e43` | **Claude** | Quick Log · Storage · Build | 14 | +1096/−38 | +3 جديد | التسجيل السريع يعمل تحت تخزين محجوب؛ الإقلاع يرفض علمًا تالفًا |
| — | `d83add2` | **Claude** | Docs | 2 | +119/−0 | — | لا أثر سلوكي — أحكام الإطلاق |

---

## 5. CANONICAL_AFTER_CODEX — المالك القانوني بعد Codex (البند ٦)

**تحقّق مستقل:** كل صفّ أدناه فُحص في مصدر `d83add2` نفسه، لا نُقل من الخريطة في `STATE.md`.
عمود **«Phase II يجب أن يتكيّف؟»** هو الحكم العملي.

| Concern | Canonical file | Canonical function/module | Obsolete / legacy | Phase II يتكيّف؟ |
|---|---|---|---|---|
| Routing/history | `src/lib/appRoutes.ts` | `ROUTES` (22 مسارًا) · `routeFromHash` · `resourceIdFromHash` · `MAIN_TABS` (5) | `notfound`/`accountRequired` داخليان لا يُكتبان في hash | **نعم — اللوحة التنفيذية** (E-2 يخطّط لإضافة `admin`) |
| Onboarding UI | `src/views/OnboardingV2.tsx` | حالة نقيّة في `src/lib/onboardingV2Flow.ts` | بنك `src/lib/personalization/**` مُنفَّذ ومُختبَر لكنه **ليس** الواجهة الحيّة | لا |
| Onboarding persistence | `src/lib/onboarding.ts` | ظرف + حارس مسودة v6 وترحيل v5 إضافي | — | لا (لكن `completed === true` عقد صارم الآن) |
| Profile-for-plan | `src/lib/planBuilderAnswers.ts` | يُجسَّر عبر `onboardingProfile.ts` | `PersonalizationProfile` التكيّفي **قراءة فقط** لهذا البرنامج | لا |
| Plan generation | `src/lib/planGenerator.ts` · `planRationale.ts` | — | منطق QAE **منطقة لا-مساس** | لا |
| Premium/access | `src/lib/access/paidActions.ts` · `guard.ts` · `entitlementStore.ts` · `provider.tsx` | `PAID_ACTIONS` (13 فعلًا) | فحوص الواجهة وحدها **غير كافية**؛ query/localStorage/عودة Salla **ليست سلطة** | **نعم — اللوحة التنفيذية** (حارس دور جديد يجب ألا يفرّع السلطة) |
| Guest Preview | `PremiumGate` مركزيًا + `ALWAYS_BROWSABLE` | حالة استحقاق `none` | `VITE_ENTITLEMENT_MODE=mock` **اختباري ومحصور بالجلسة** | لا |
| Workout day | `src/lib/workoutDaySource.ts` | — | المنطق الدوّار القديم **احتياطي مسمّى** عند غياب جدول | لا |
| Workout persistence | `activeWorkout.ts` · `finishWorkout.ts` · `historyStore.ts` | — | `activeSession.ts` متقاعد/ميت | لا |
| Nutrition | `src/views/NutritionView.tsx` · `nutritionV2Model.ts` · `nutritionHistory.ts` | — | **`NutritionV2.tsx` ليس غلاف المسار الحيّ — لا تفرّع تدفّقًا ثالثًا** | **نعم — حارة الطعام** (D-03/B-1) |
| Measurements/Progress | `measurementLog.ts` · `historyStore.ts` · `ProgressV2.tsx` (+`MeasurementsV2`) | — | `ProgressView.tsx` **غلاف نحيف ٢٢ سطرًا** (كان ٢٢٦) | لا |
| Exercises | `ExerciseLibraryView.tsx` · `ExerciseDetail.tsx` · `exerciseLibrary.ts` · `data/exercises.ts` | مرشِّح نقي مُصدَّر | الكتالوج **قراءة فقط**؛ الأجهزة والكتالوج يتشاركان مالك مسار واحدًا | **نعم — حارة التمارين** (C-1/C-2، D-04) |
| Auth | `authContext.tsx` · `LoginView.tsx` | مسارات `login/signup/forgot` مملوكة للمسار | لا أسرار محلية؛ Supabase **لا-مساس** | لا |
| Language | `src/i18n/LanguageContext.tsx` · `appPreferences.ts` | — | مساعدات ثنائية اللغة الصلبة **دَين تاريخي لا نمط جديد** | لا |
| **Number presentation** | `src/lib/numberFormat.ts` | `formatNumber` — حدّ عرض وحيد | السياسة **عرضية فقط**؛ المخزَّن يبقى رقمًا | **نعم — اللوحة التنفيذية** (كل رقم معروض) |
| Settings data transfer | `src/components/DataManagementPanel.tsx` فوق `src/lib/portability` | — | `FileReader` + `JSON.parse` يدوي **محظور ومحروس** | **نعم — حارة الطعام** (أي استيراد بيانات) |
| Profile shell/account truth | `ProfileV2.tsx` (عبر غلاف `ProfileView`) | `buildProfileV2Model` | **لا واجهة نقل بيانات ثانية**؛ `#/settings` القانونية تملك اللغة/الحساب/الجهاز | لا |
| **Quick Log intent** | `src/lib/quickLogIntent.ts` **(جديد في PKG-9)** | `requestQuickLogIntent` · `takeQuickLogIntent` · `clearQuickLogIntent` | **الوصول الخام لمفتاح `qimmah:quick-log-intent` محظور** — كان في ٣ مواضع | لا (ما لم تُضَف نيّة رابعة) |
| Error handling | `src/components/ErrorBoundary.tsx` | `ErrorBoundary` · `RouteErrorBoundary` + `i18n/dict/errorBoundary.ts` | نصوص مكرّرة في `config/strings.ts` عُزلت/حُذفت | لا |
| Local data registry | `src/lib/userDataKeys.ts` | — | **أي مفتاح نصّي غير مسجَّل هنا يحتاج تحقيقًا** | **نعم — كل حارة تخزّن** |

---

## 6. الاختبارات التي أضافها/عدّلها Codex — مصنَّفة (البند ٧)

**٢٤ سكربتًا جديدًا · ٢٥ سكربتًا معدَّلًا** (من `git diff --name-status af5274b d83add2 -- scripts/`).

### 6.1 الجديد (٢٤)

| السكربت | PKG | التصنيف | داخل `test:gate`؟ |
|---|---|---|---|
| `run-activation-ui-proof.mjs` | 1 | contract · security | ✅ مباشرة |
| `run-error-boundary-proof.mjs` | 1 | contract · regression | ✅ مباشرة |
| `onboarding-questions-proof.ts` + runner | 2 | contract | ✅ مباشرة |
| `e2e/lib/onboarding-driver.mjs` | 2 | browser/e2e (بنية تحتية مشتركة) | — (مكتبة) |
| `nutrition-live-proof.ts` + runner | 3 | storage · regression | ✅ مباشرة |
| `e2e/workout-reliability.mjs` | 4 | browser/e2e · storage | ❌ |
| `measurement-reliability-proof.ts` + runner | 5 | storage · security | ✅ **عبر `test:progress-v2`** |
| `e2e/progress-reliability.mjs` | 5 | browser/e2e · mobile | ❌ |
| `exercise-library-proof.ts` + runner | 6 | contract · navigation | ✅ مباشرة |
| `e2e/exercise-library-reliability.mjs` | 6 | browser/e2e · navigation | ❌ |
| `settings-preferences-proof.ts` + runner | 7 | contract · security | ✅ مباشرة |
| `e2e/settings-reliability.mjs` | 7 | browser/e2e · mobile · i18n | ❌ |
| `profile-reliability-proof.ts` + runner | 8 | contract · security | ✅ **عبر `test:profile-wording`** |
| `e2e/profile-reliability.mjs` | 8 | browser/e2e · mobile · a11y | ❌ |
| `quick-log-reliability-proof.ts` + runner | 9 | storage · navigation · regression | ✅ مباشرة |
| `e2e/dirty-state-recovery.mjs` | 9 | browser/e2e · storage | ❌ |
| `production-bundle-safety-proof.mjs` | 9 | **security** (الأصل المبني) | ❌ |

**التوزيع:** regression 4 · contract 7 · security 5 · browser/e2e 8 · mobile 3 · storage 6 · navigation 3.
(الأعداد تتقاطع — سكربت واحد قد يحمل تصنيفين.)

### 6.2 المعدَّل (أبرزه)

| السكربت | PKG | طبيعة التعديل |
|---|---|---|
| `run-access-gate-proof.mjs` | 1,3,5 | 42→72→77→84: كل فعل مدفوع يُعدّ ويُربط بحارسه الحيّ |
| `e2e/preview-gate.mjs` | 1,5 | →34→35؛ +`#/measurements` صراحةً |
| `e2e/nutrition-reliability.mjs` | 3 | 91→106 |
| `e2e/navigation-history.mjs` | 5,6 | 95→96؛ ثم **96 بلا تغيير** إعادة تحقّق |
| `storage-honesty-proof.ts` | 4 | →44، +45/−2 |
| `e2e/install-overlap.mjs` | 1 | →200 عبر 320/360/375/390/430 × ar/en |
| الرحلات الثلاث + `onboarding-matrix-e2e.mjs` | 2 | إعادة كتابة للشاشات السبع (−125/+96 في المصفوفة) |
| `run-delete-account-proof.mjs` | 8 | فحص **تعليق** ← فحص **ربط حيّ** |
| `run-momentum-proof.mjs` · `run-wave5-cross-system-smoke.mjs` | 8 | `heading level 1` ← `level 2` |
| `run-p10-i18n-proof.mjs` · `run-p12-install-qa.mjs` | 5 | +`measurements` في قوائم المسارات |
| `body-fields-proof.ts` · `plan-number-consistency-proof.ts` | 2 | بنية `OnboardingProfile` الجديدة؛ `LAST_INPUT_STEP` 4→6 |
| `run-no-template-language-proof.mjs` | 1 | **نطاق الاستثناء وُسِّع — انظر RISK-1** |

---

## 7. مراجعة التغييرات على التأكيدات القاعدية (البند ٨)

**النتيجة العامة:** ادّعاء `FOUNDER-DECISIONS.md` أن «لا تأكيد أُزيل أو ضُعِّف» **صحيح في جوهره**
عبر السلسلة كلها — إلا في موضع واحد سمّاه المستند «stronger scope» وهو في الحقيقة **أوسع، لا أقوى**.

| # | التغيير | القديم | الجديد | الحكم |
|---|---|---|---|---|
| 1 | `run-delete-account-proof.mjs` | `profileModel.includes('routes to the delete-account row in SettingsView')` — **فحص نصّ تعليق** | ٤ فحوص مقترنة على الكود الحيّ: `deleteAccountAvailable:\s*auth\.signedIn` + الشرط في `ProfileV2` + ربط `onManageAccount` + `onNavigate('settings')` | **STRONGER** — انتقل من تعليق إلى سلوك |
| 2 | `run-momentum-proof.mjs` · `run-wave5-cross-system-smoke.mjs` | `heading 'التذكيرات' level 1` | `level 2` | **EQUIVALENT** — يتبع ملكية `h1` الواحد التي أرساها PKG-8؛ ما زال يشترط وجود العنوان بنصّه |
| 3 | `e2e/progress-reliability.mjs` (PKG-7) | العربية تقبل `81.5` اللاتينية | تشترط `٨١٫٥` **وترفض** `81.5`، وتكرّر بعد التحديث | **STRONGER** |
| 4 | `e2e/navigation-history.mjs` (PKG-6) | 96 تأكيدًا | **96 بلا تغيير**، أُعيد تشغيلها بعد تغيير الخروج من الرابط المباشر | **UNCHANGED, REVERIFIED** — سلوك مثالي |
| 5 | `e2e/settings-import-security.mjs` (PKG-7) | ٣٤ ناقلًا لكن **مفصولة عن الواجهة الحيّة** | **٣٤ نفسها** تُنفَّذ على اللوحة المستعادة | **STRONGER فعليًا** (نفس التأكيدات، سطح حقيقي) |
| 6 | `body-fields-proof.ts` | `LAST_INPUT_STEP === 4` | `LAST_INPUT_STEP === 6` | **EQUIVALENT** — يلاحق تغيير العقد في PKG-2 |
| 7 | **`run-no-template-language-proof.mjs`** | استثناء النسخ المشروع مربوط بـ**`src/config/strings.ts` وحده** | يُبحث عنه في **اتحاد كل `SURFACES`** (كل `src/i18n/dict/*.ts` + 3 ملفات config + خطوات المخصِّص) | ⚠ **WEAKER BINDING → RISK-1** |

### ⚠ RISK-1 — توسيع نطاق استثناء «لغة القالب» (منخفض، لكنه يخالف §4.2)

- **الموضع:** `scripts/run-no-template-language-proof.mjs` — PKG-1 (`8b29ca3`).
- **ما حدث:** الفحص من نوع **وجود موجب** («النص المشروع ما زال موجودًا ولم يُمسح بالجملة»).
  توسيع كومة القش من ملف واحد إلى عشرات الملفات يجعل إرضاءه **أسهل**، لا أصعب.
- **المبرّر مشروع:** PKG-1 نقل نصوص ErrorBoundary من `config/strings.ts` إلى `i18n/dict/errorBoundary.ts`،
  فربط الاستثناء بالملف التاريخي صار خاطئًا. **الاتجاه صحيح، والتوصيف خاطئ.**
- **الانحراف:** الوثيقة تسمّيه «stronger scope»؛ وGit يقول إنه **محمول أضعف** (predicate أوسع).
- **التوصية (لا تُنفَّذ الآن — البند ١٥):** يُربط كل عبارة مشروعة **بسطحها المالك المسمّى**
  (مثال: «الصفحة غير موجودة» ⇒ قاموس 404 تحديدًا) بدل الاتحاد المفتوح.
- **حصر الأثر:** الفحص **المانع** (٩ عبارات محظورة) لم يُمسّ إطلاقًا وما زال يمشّط كل الأسطح.
  المتضرّر هو **حارس الاستثناء** فقط، وهو تحديدًا ما يوجبه §4.2.

### ⚠ RISK-2 — أقوى الضمانات الجديدة خارج كل بوابة آلية (متوسط)

هذه ليست مخالفة — لكنها **حقيقة يجب أن تُعرف قبل استئناف Phase II**.

| ما يُشغَّل آليًا | أين |
|---|---|
| `npm ci` · typecheck · lint · build · `check-perf-budget` · `test:food-db` · **`test:gate`** · **`test:e2e:onboarding`** | `.github/workflows/ci.yml` |
| نفسها + ٣ إثباتات متصفّح قديمة **غير مانعة** (`continue-on-error`) | `.github/workflows/nightly.yml` |

**النتيجة:** من الـ١٣ طقم متصفّح التي أنتجت «٧٦٥ تأكيدًا» في البوابة النهائية،
**واحد فقط (`test:e2e:onboarding`) يعمل في CI.** والباقي — ومنها:

- `test:bundle-safety` (٩/٩ — البند ٢٧ و٣٠ في سجلّ القبول: **لا بذرة اختبار في الأصل المشحون**)،
- `test:e2e:dirty-state` (٤٧/٤٧ — البند ٢٢ و٢٩: الإقلاع على تخزين تالف)،
- `test:e2e:profile` (٢٧/٢٧ — الحارس **الوحيد** لعقد `h1` الواحد بعد أن نزل الإثباتان الآخران إلى `h2`)

— **تشغيل يدوي في لحظة الفحص، لا ضمان قائم.** أي انحدار فيها لن يُكتشف بـ`git push`.

> هذا متّسق مع §4.0 من الميثاق (أطقم المتصفّح خارج البوابة عمدًا)، **لكن مقابله الملزم هو قراءة CI** —
> وCI لا يشغّلها أصلًا، فلا يوجد أحمر يُقرأ. الفجوة **بنيوية لا تشغيلية**.

---

## 8. الأعطال التاريخية المغلقة (البند ٩)

٢٨ عطلًا مسجّلًا؛ **٢٧ منها RESOLVED — VERIFIED**، و**واحد OPEN** (BUG-003).

| BUG | Root cause | Fix | Proof | Regression test |
|---|---|---|---|---|
| 001 | سياسة على مستوى الكاتب بلا حارس واجهة على سطحين متأخّرين | كلا المعالجَين ينادي الحارس المركزي قبل الكاتب | `access-gate` 72/72 | `run-access-gate-proof.mjs` |
| 002 | تنفيذان للواجهة انحرفا؛ غلاف المسار لم يُوجَّه للمالك المُصان | `ProgressView` صار غلافًا نحيفًا فوق `ProgressV2` | `progress-v2` 11/11 | `test:progress-v2` |
| **003** | تحذيرات npm متعدّية في سلسلة البناء/التطوير | **لا شيء — قرار مؤسس 003: لا `npm audit fix` بلا موجة مصرّح بها** | `npm audit --json` = 3 HIGH / 0 CRITICAL | — |
| 004 | ErrorBoundary خاص بالإعداد يعلن الإكمال بعد فشل عرض | الإعداد يعيد استخدام `RouteErrorBoundary` القانوني | `error-boundary` 14 | `test:error-boundary` |
| 005 | لا مرجع دعم في مسار الخطأ | مرجع `QW-*` مولَّد محليًا غير حسّاس | نفس الإثبات | `test:error-boundary` |
| 006 | عدد الأسئلة المُعلَن لا يقابله مستهلك | ١٨ سؤالًا لكلٍّ أثر مُثبت + سجلّ `ONBOARDING_QUESTION_IDS` | `onboarding-questions` 97/97 | `test:onboarding-questions` |
| 007 | حالة شرطية بائتة بعد خفض العمر | الهدف المقيَّد يُمسح فور التغيير | `onboarding-intent` 70/70 + رحلة القاصر | `test:onboarding-intent` |
| 008 | محوّل التغذية الحيّ يُسقط الكمية والمصدر | حمل الكمية والمصدر في نموذج الحفظ | `nutrition-live` 13/13 | `test:nutrition-live` |
| 009 | نجاح مُعلَن قبل تأكيد الكتابة | فحص `WriteResult` قبل أي إعلان | نفس الإثبات | `test:nutrition-live` |
| 010 | الحذف يلتفّ على سطح Preview المتماسك | الحذف يمرّ بالحارس المركزي | `access-gate` 77/77 | `run-access-gate-proof.mjs` |
| 011 | حذف الفاصلة العشرية يضخّم الحصص | إدخال كسري صحيح | `nutrition-live` 13/13 | `test:nutrition-live` |
| 012 | مسح اللقطة قبل نجاح الكتابة الدائمة | ترتيب: تأكيد ← كتابة ← فحص ← عند الفشل استرجاع | `storage-honesty` 44/44 | `test:storage-honesty` |
| 013 | زرّ «العودة لليوم» لا ينتقل | ربط بالتنقّل الفعلي | `e2e:workout` 31/31 | `test:e2e:workout` ❌خارج البوابة |
| 014 | وعد القياسات بلا مسار قابل للوصول | مسار `#/measurements` حقيقي بسجلّ | `e2e:progress` 25/25 | `test:e2e:progress` ❌خارج البوابة |
| 015 | الحفظ/الحذف يعلن نجاحًا أو يتخطّى Premium | كتّاب محروسون + إعلان صادق | `measurement-reliability` 11/11 | ✅ عبر `test:progress-v2` |
| 016 | كتالوج الأجهزة يلتفّ على عقد الرابط العميق | مالك مسار واحد للكتالوج والأجهزة | `e2e:exercises` 32/32 | `test:exercise-library` (البنيوي ✅) |
| 017 | لا عقد modal/خروج من رابط مباشر | دورة لوحة مفاتيح كاملة + خروج آمن للمسار | `e2e:exercises` 32/32 | كما أعلاه |
| 018 | مستورد JSON يدوي غير مُتحقَّق أُعيد إدخاله | توجيه إلى `DataManagementPanel` فوق `portability` | `settings-import-security` 34/34 | `test:settings-preferences` ✅ |
| 019 | قدرات وأرقام ملتبسة في الإعدادات | حدّ `formatNumber` واحد + صفوف صادقة غير تفاعلية | `settings-preferences` 17/17 | `test:settings-preferences` |
| 020 | Profile يفرّع مالك نقل البيانات المحصَّن | مدخلا البيانات يمرّان بالمالك القانوني | `profile-reliability` 22/22 | ✅ عبر `test:profile-wording` |
| 021 | خلط حذف الحساب بإدارة بيانات الضيف | `deleteAccountAvailable = auth.signedIn` | نفس الإثبات + `delete-account` 28/28 | `test:delete-account` ✅ |
| 022 | عنوان مسار مكرّر وأهداف لمس <44px | `MobileShell` يملك `h1` وحيدًا؛ رفع الأهداف | `e2e:profile` 27/27 | ❌ خارج البوابة (RISK-2) |
| 023 | الإثبات يقبل عملية غريبة على منفذه الثابت | رفض مسمّى إن لم يكن المعاينة المملوكة | هجوم منفذ 5328 ⇒ فشل مسمّى | `e2e/profile-reliability.mjs` |
| **024** | الوصول إلى `sessionStorage` **نفسه** يرمي تحت تخزين محجوب (Safari) | `quickLogIntent.ts` يحرس كل وصول بـ`try/catch` | ٦ إخفاقات مسمّاة عند `e8f3bb6` قبل الإصلاح | `test:quick-log` ✅ |
| 025 | «ماء» نيّة معلَنة بلا مستهلك | تركيز على لوحة الماء (لا كتابة نيابة عن المستخدم) | `quick-log` 27/27 | `test:quick-log` |
| 026 | نيّة تبقى بعد تحويل الحارس فتخطف زيارة لاحقة | النيّة تُكتب **بعد** حسم المقصد؛ والقراءة مستهلِكة ومحصورة بالمالك | نفس الإثبات | `test:quick-log` |
| 027 | إثبات Profile يطبع نجاحًا ثم يعلّق للأبد | إنهاء صريح | `e2e:profile` **ينتهي** الآن | ❌ خارج البوابة |
| **028** | `!!parsed.completed` يُكره القمامة إلى إكمال | `state.completed === true` | `{"completed":"yes-please"}` بلغ `#/dashboard` قبل الإصلاح | `test:e2e:dirty-state` ❌خارج البوابة |

> **BUG-024 و BUG-028 هما أخطر ما في السلسلة:** الأول **يقتل زرًّا كاملًا على Safari** — وهو متصفّح الجمهور المستهدف؛
> والثاني **يُدخل مستخدمًا بلا ملف ولا خطة إلى اللوحة بصمت**، وهو أخطر من الانهيار لأنه لا يُرى.

---

## 9. البنود غير المحسومة (البند ١٠)

| المعرّف | الحالة | البند | لماذا |
|---|---|---|---|
| **BUG-003** | `CONTAINED` | ٣ تحذيرات عالية متعدّية في سلسلة البناء/التطوير | محصور بقرار مؤسس 003: لا مسار تشغيل في المتصفّح؛ يحتاج موجة اعتماديات مصرَّحًا بها |
| **EXTERNAL-001** | `EXTERNALLY_BLOCKED` | لا رابط Salla خاص بالمنتج — الجذر فقط `https://salla.sa/Qimmahsa` | لم يُسلَّم رابط مُعتمد؛ **والتخمين ممنوع صراحةً** |
| **EXTERNAL-002** | `EXTERNALLY_BLOCKED` | `redeemActivationCode` يُعيد `offline` في الإنتاج | لا خلفية تفعيل مُراجَعة على هذا الأساس |
| **EXTERNAL-003** | `EXTERNALLY_BLOCKED` | دورة حياة الحساب الحيّة لم تُثبَت على خادم حقيقي | `test:e2e:auth` يحتاج Docker؛ و`delete_own_account` لم يُثبت نشره على مشروع Supabase الإنتاجي |
| **WEBKIT** | `OPEN` | **لا دليل Safari/WebKit لأي نتيجة في هذا البرنامج** | WebKit غير قابل للإطلاق في الحاوية؛ وكل الـ٧٦٥ تأكيدًا **Chromium 141 حصرًا** |
| **Layer 4** | `INTENTIONALLY_CUT` | تدقيق أهداف اللمس لكل الموقع | نُفِّذ منه المسمّى (قاع/تنقّل/Premium/Profile)؛ والباقي خارج نطاق البرنامج |
| **Layer 6** | `INTENTIONALLY_CUT` | الأداء | مؤجَّل بقرار البرنامج |
| **BUG-013/014/022/027/028 guards** | `OPEN` (جديد في هذا التتبّع) | حرّاسها خارج CI وخارج `test:gate` | RISK-2 أعلاه |
| **RISK-1** | `OPEN` (جديد في هذا التتبّع) | حارس استثناء «لغة القالب» وُسِّع | §7 أعلاه |
| **DUP-1 / DUP-2** | `OPEN` (جديد في هذا التتبّع) | تنفيذان متوازيان لسلامة الأصل وللحالة التالفة | `PHASE-II-IMPACT-MATRIX.md` §3 |

> **WEBKIT ليس فجوة محايدة.** BUG-024 عطل **بشكل Safari** (تخزين محجوب) أُثبت إصلاحه على مستوى الوحدة فقط.
> الجمهور سعودي/خليجي على الجوال، حيث iOS Safari مهيمن — فهذا **أهم بند مفتوح تقنيًا** في السلسلة.

---

## 10. WIP الضائع وما أعاد Claude بناءه (البند ١٢)

**ادّعاء `STATE.md`:** ستة ملفات كانت WIP عند انقطاع Codex؛ أربعة نجت في PKG-8 واثنان ضاعا.

**التحقّق المستقل من Git — والنتيجة: الادّعاء صحيح تمامًا.**

```
git log --all --diff-filter=A -- '*navigation-quick-log*'   → (فارغ)
git log --all --name-only | grep -i 'quick-log'
    → scripts/quick-log-reliability-proof.ts
      scripts/run-quick-log-reliability-proof.mjs
      src/lib/quickLogIntent.ts        (كلها من PKG-9، لا من WIP)
```

| الملف | المصير | الدليل |
|---|---|---|
| `scripts/profile-reliability-proof.ts` | ✅ **نجا** — مُودَع في PKG-8 | موجود في `e8f3bb6` |
| `scripts/run-profile-reliability-proof.mjs` | ✅ **نجا** | موجود في `e8f3bb6` |
| `scripts/e2e/profile-reliability.mjs` | ✅ **نجا** | موجود في `e8f3bb6` |
| `src/views/ProfileV2.tsx` | ✅ **نجا** | مُعدَّل في `e8f3bb6` (−235 سطرًا) |
| `scripts/e2e/navigation-quick-log.mjs` | ❌ **ضاع نهائيًا** | **غير موجود في أي التزام على أي ref** |
| `scripts/run-navigation-quick-log-*.mjs` | ❌ **ضاع نهائيًا** | كما أعلاه |

**ما فعله Claude:** لم يستعِد الملفين — **أعاد اشتقاق العيوب من المصدر الحيّ** بدل الثقة بمذكّرة التسليم،
فأنتج `quick-log-reliability-proof.ts` (٢٧ فحصًا) و`e2e/dirty-state-recovery.mjs` (٤٧) و`production-bundle-safety-proof.mjs` (٩).

> **الحكم:** إعادة الاشتقاق **أنتجت أكثر مما ضاع** — BUG-025 و026 و028 لم تكن مذكورة في مذكّرة التسليم أصلًا،
> وBUG-028 تحديدًا (`{"completed":"yes-please"}` يفتح اللوحة) اكتُشف **لأن** الإثبات بُني من جديد لا استُعيد.
> وحالة `git status` كانت **نظيفة** عند الرأس المستعاد — فلا WIP آخر ضاع بصمت.

---

## 11. الانحرافات: الوثائق مقابل Git (البند ١١)

| # | الانحراف | Git يقول | الحالة |
|---|---|---|---|
| **DIV-1** | `STATE.md §Recovery checkpoint`: `LAST_COMMITTED_GREEN: PKG-7` وPKG-8 «staged WIP» | PKG-8 **مُودَع ومدفوع** عند `e8f3bb6` | **مُصحَّح ذاتيًا** — المذكّرة كُتبت قبل الإيداع ثم أُودعت **داخل** نفس الالتزام، فهي بائتة بخطوة واحدة بالضبط. حُفظت حرفيًا كتاريخ، وصحّحها تحديث PKG-9. **سلوك سليم — لا مخالفة.** |
| **DIV-2** | `docs/execution/qimmah-postweb/HEAD-DEPENDENCIES.md`: «آخر checkpoint مرصود = `1bcf7a9` = PKG-7» و«ما تبقّى: Layer 3 (Profile)» | PKG-8 (Layer 3 Profile) **منجَز**، وPKG-9 منجَز، والبرنامج **أعلن بوابته النهائية** عند `9f88e43` | ⚠ **انحراف حيّ** — سجلّ تبعيات المنسّق **متأخّر ٣ التزامات**. يجب تحديثه قبل فتح البوابة. |
| **DIV-3** | `FOUNDER-DECISIONS.md` يصف تغيير `run-no-template-language-proof.mjs` بـ«stronger scope» | المحمول صار **أوسع = أضعف ربطًا** | ⚠ **RISK-1** — التوصيف خاطئ والاتجاه صحيح |
| **DIV-4** | `STATE.md`: «Latest pushed checkpoint: **PKG-8**» | `git ls-remote` الآن: **`d83add2`** على **رأسين** | **ليس خطأ** — عبارة لحظة كتابة، تجاوزها PKG-9 وd83add2 |
| **DIV-5** | `CLAUDE.md §11 «الحالة الجارية»`: ترتيب Sprint 1، PR #10/#12/#13، «موجة السدّ بعد `q17`» | لا شيء من ذلك في هذه السلسلة؛ الحالة تسبق برنامج Web Sovereign كليًا | ⚠ **دستور المشروع بائت** في بنده الوحيد المتغيّر. يستحق موجة تحديث مسمّاة (خارج نطاق هذا الأمر). |
| **DIV-6** | `STATE.md` يعدّ `test:e2e:*` ضمن «البوابة النهائية» | CI يشغّل **`test:e2e:onboarding` فقط** | **ليس تناقضًا** — البوابة النهائية تشغيل يدوي مُعلَن. لكنه **يوجب RISK-2** |

**لا انحراف واحد وجدته يقلب حقيقة تقنية معلنة.** أخطرها DIV-2 لأنه **يوجّه قرارًا قادمًا** (لحظة الهبوط)،
وDIV-3 لأنه **يخفي رخاوة حارس** خلف وصف يطمئن.

---

## 12. الرأس القانوني النهائي (البند ١٣)

| البند | القيمة |
|---|---|
| **Full SHA** | `d83add22e904819c7d7fdc27890c757cd5dbaa5c` |
| **Remote** | `origin` → `https://github.com/km5g98str4-commits/qimmah` |
| **Branches (كلاهما عند نفس الـSHA)** | `codex/qimmah-web-sovereign-001` · `claude/web-sovereign-final-recovery-o8alub` |
| **Parent chain** | `cc60adf` → 6 التزامات FOUNDER-UX → `af5274b` (baseline) → PKG-0…PKG-9 → `d83add2` — **١٧ التزامًا، خطّية، بلا merge** |
| **Merge-base مع `main`** | `cc60adf` — أي أن `main` **سلف كامل**، و`main..HEAD` = 17، و`HEAD..main` = **0** |
| **Clean?** | ✅ شجرة العمل نظيفة عند الفحص |
| **Pushed?** | ✅ **مدفوع بالكامل** — `git ls-remote --heads origin` يعيد `d83add2…` للفرعين حرفيًا |
| **آخر checkpoint لـCodex** | `e8f3bb6` (PKG-8) |
| **أول التزام لـClaude في التعافي** | `9f88e43` (PKG-9) |

**أحكام الإطلاق المعلنة عند `9f88e43`:** A (Free Preview) = **GO** · B (Authenticated Free) = **NO-GO** ·
C (Paid/Premium) = **NO-GO** · D (Release Candidate) = **NO-GO**.

---

## 13. الخلاصة الملزمة

```
CODEX_TRACE_COMPLETE          = YES
PHASE_II_BASELINE_UNDERSTOOD  = YES
SAFE_TO_RESUME_PHASE_II       = YES (بشرطين مسمّيين)
```

**الشرطان — كلاهما إجرائي، ولا يحتاج كود:**

1. **تحديث `HEAD-DEPENDENCIES.md`** من PKG-7 إلى `d83add2` (DIV-2). سجلّ التبعيات هو ما يقود لحظة
   الهبوط، وهو الآن متأخّر ٣ التزامات ويصف Layer 3 على أنه «متبقٍّ» وقد أُنجز.
2. **اعتماد المؤسس لخطّة حسم الازدواج** DUP-1/DUP-2 (تنفيذان لسلامة الأصل وللحالة التالفة) —
   وهو قرار ملكية لا اجتهاد وكيل (§7 من الميثاق).

**ولماذا `YES` رغم ذلك:** الأثر التقني على Phase II **صغير ومحصور بالقياس لا بالتقدير** —
الحارات الخمس **إضافية بالكامل**، ولا واحدة منها تلمس أيًّا من الملفات التسعة التي تغيّرت بعد PKG-7.
التفصيل الكامل في `PHASE-II-IMPACT-MATRIX.md`.

---

**لم يُنفَّذ أي migration ولا rebase (البند ١٥).** هذا المستند وأخواه **قراءة وتسجيل فقط**.

*المصاحبان:* [`CONTRACT-CHANGES-SINCE-PKG7.md`](./CONTRACT-CHANGES-SINCE-PKG7.md) · [`PHASE-II-IMPACT-MATRIX.md`](./PHASE-II-IMPACT-MATRIX.md)
