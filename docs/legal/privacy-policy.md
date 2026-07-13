# سياسة الخصوصية — قِمّة / Privacy Policy — Qimmah

> **مسودة للمراجعة من المالك والمستشار القانوني — ليست استشارة قانونية.** كل بند مبني على سلوك التطبيق
> الفعلي في الشيفرة (`integration/wave2`). المواضع المعلّمة **[OWNER-ENTITY]** أو **[يُؤكَّد من المالك]**
> تحتاج قرارًا تجاريًا/قانونيًا قبل النشر.
>
> **Draft for owner + legal review — not legal advice.** Every clause reflects the app’s actual behaviour
> in code. Fields marked **[OWNER-ENTITY]** / **[OWNER-TO-CONFIRM]** need a business/legal decision first.

آخر تحديث / Last updated: [DATE] · المالك / Controller: **[OWNER-ENTITY]** · التواصل / Contact: **support@qimmah.app**

---

## العربية (الأساسية)

### 1. من نحن ومبدأنا
قِمّة تطبيق لياقة عربي (تمارين، تغذية، قياسات، تقدّم). **مبدأ التطبيق «المحلي أولًا»:** بياناتك تُحفظ على جهازك
أولًا، والمزامنة السحابية اختيارية وتعمل فقط عند تسجيل الدخول بحساب. بلا حساب، تبقى بياناتك على جهازك.

### 2. ما الذي نجمعه ولماذا
**أ) بيانات الحساب:** البريد الإلكتروني وكلمة المرور واسم العرض (اختياري) — لتسجيل الدخول والمزامنة. تُدار كلمة
المرور بشكل آمن عبر مزوّد المصادقة (Supabase) ولا نطّلع عليها.

**ب) ملفك وبياناتك الجسدية:** الاسم، العمر، الجنس، الطول، الوزن، الوزن المستهدف، مستوى الخبرة، والهدف
(تنشيف/محافظة/تضخيم) — لبناء خطتك وحساب احتياجك من السعرات.

**ج) بيانات الصحة واللياقة:** جلسات التمرين (التمارين والأوزان والتكرارات)، الأرقام القياسية، القياسات الجسدية
(الوزن، الخصر، نسبة الدهون)، الأدوية والمكمّلات التي تتابعها، والإصابات التي تُدخلها — لتتبّع تقدّمك وتخصيص خطتك.

**د) تسجيلات على الجهاز فقط (لا تُرفع للسحابة):** سجلّ التغذية والسعرات، الماء، الخطوات (تُدخَل يدويًا — **لا
نقرأ Apple Health**)، والإنجازات. هذه تبقى على جهازك ولا تُرسل لخوادمنا.

**هـ) الكاميرا:** تُستخدم **فقط** لمسح باركود المنتجات الغذائية. تُعالَج الصورة على الجهاز لقراءة الرمز، ولا
تُخزَّن ولا تُرسَل صور.

**و) تشخيص اختياري:** التطبيق **لا يجمع** بيانات استخدام افتراضيًا. عند تفعيله من قِبل المالك فقط، تُرسل أحداث
مجهولة (أعداد وأحداث بلا أي معرّف: لا بريد، لا اسم، لا رقم باركود) بمعرّف عشوائي غير مرتبط بحسابك، وبموافقتك.

### 3. ما لا نفعله
- **لا إعلانات، ولا تتبّع عبر التطبيقات أو المواقع**، ولا بيع لبياناتك.
- **لا نستخدم أي أدوات تتبّع من طرف ثالث** (لا Google/Meta/غيرها) — تحقّق من ذلك في قائمة اعتماديات التطبيق.
- **لا نطلب موقعك أو جهات اتصالك أو صورك.**

### 4. ما الذي يغادر جهازك ولمن
| الوجهة | متى | ماذا يُرسَل |
|---|---|---|
| **Supabase** (خدمة الخادم) | عند تسجيل الدخول والمزامنة | بيانات الحساب والملف والتمارين والقياسات والسجلّات اليومية والأدوية/المكمّلات — مرتبطة بمعرّف حسابك |
| **Open Food Facts** | عند مسح/بحث باركود غذائي | رقم الباركود فقط (لمعرفة المنتج) — بلا أي بيانات عنك |
| **GitHub / jsDelivr** | عند عرض صورة توضيحية لتمرين | طلب تحميل صورة (يظهر عنوان IP لجهازك للمزوّد) — بلا بيانات عنك |
| **YouTube** | عند الضغط «شاهد الأداء» | يفتح رابط بحث خارجيًا في المتصفّح — لا تضمين ولا تتبّع داخل التطبيق |

### 5. بيانات الصحة
نتعامل مع بيانات صحتك ولياقتك (التمارين، القياسات، الأدوية/المكمّلات) بعناية: تبقى محلية على جهازك، وعند تسجيل
الدخول تُزامَن إلى حسابك الخاص فقط ومحميّة بصلاحيات على مستوى الصف (RLS) بحيث لا يصل إليها إلا أنت. **لا نبيعها
ولا نشاركها لأغراض تسويقية.**

### 6. المزامنة والاستضافة
عند تسجيل الدخول تُزامَن البيانات المذكورة في §4 إلى Supabase عبر اتصال مشفّر (HTTPS). موقع استضافة مشروع
Supabase: **[يُؤكَّد من المالك]** — إن كان خارج المملكة، يلزم بيان النقل عبر الحدود بموجب نظام حماية البيانات
الشخصية (PDPL).

### 7. مدة الاحتفاظ
نحتفظ ببياناتك ما دام حسابك قائمًا. البيانات المحلية تبقى على جهازك حتى تحذفها أو تحذف التطبيق. عند حذف الحساب
تُمحى بياناتك من الخادم ومن الجهاز (انظر §8).

### 8. حذف بياناتك
داخل التطبيق: «الإعدادات والخصوصية ← حذف الحساب نهائيًا». يؤدي ذلك إلى:
1. حذف حساب المصادقة الخاص بك من الخادم.
2. حذف صفوف بياناتك من جداول: `profiles`، `workout_sessions`، `exercise_history`، `measurement_logs`،
   `daily_logs`.
3. مسح كل بيانات قِمّة من جهازك (تبقى فقط تفضيلات غير شخصية كاللغة).
إن تعذّر حذف الحساب من الخادم، لا يُحذف أي شيء ولا يُدّعى نجاح — تُعيد المحاولة أو تتواصل معنا.

### 9. حقوقك (نظام حماية البيانات الشخصية — السعودية)
لك الحق في: **الوصول** إلى بياناتك، **تصحيحها**، **حذفها**، و**الاعتراض/تقييد** المعالجة. تمارس معظمها مباشرة داخل
التطبيق (تعديل الملف، حذف الحساب). لأي طلب إضافي راسلنا على **support@qimmah.app** وسنستجيب خلال المدة النظامية.

### 10. الأطفال والفئة العمرية
التطبيق موجّه للبالغين والمراهقين المهتمين باللياقة. الحد الأدنى للعمر المؤهّل للاستخدام: **[يُؤكَّد من المالك —
انظر ملاحظة الشروط §سنّ الأهلية]**. (ملاحظة فنية: حقل العمر في الإعداد يقبل حاليًا 12–90 سنة لأغراض حساب السعرات،
وليس بوابة أهلية.)

### 11. الأمان
اتصالات مشفّرة (HTTPS)، ومصادقة وصلاحيات صف (RLS) على الخادم. لا نخزّن أي مفاتيح سرية داخل التطبيق (المفاتيح
العامة فقط، المحميّة بـ RLS).

### 12. تغييرات هذه السياسة
قد نحدّث هذه السياسة؛ يُنشر التاريخ أعلاه، والتغييرات الجوهرية تُبلَّغ داخل التطبيق أو بالبريد.

### 13. التواصل
**[OWNER-ENTITY]** — **support@qimmah.app**

---

## English

### 1. Who we are & our principle
Qimmah is an Arabic-first fitness app (workouts, nutrition, measurements, progress). It is **local-first**:
your data is stored on your device first; cloud sync is optional and runs only when you sign in. Without an
account, your data stays on your device.

### 2. What we collect and why
**a) Account:** email, password, optional display name — for sign-in and sync. Passwords are managed securely
by our auth provider (Supabase); we never see them.
**b) Profile & body metrics:** name, age, gender, height, weight, target weight, experience, goal
(cut/maintain/bulk) — to build your plan and calorie targets.
**c) Health & fitness:** workout sessions (exercises, weights, reps), personal records, body measurements
(weight, waist, body-fat %), the supplements/medications you track, and injuries you enter — to track progress
and tailor your plan.
**d) On-device only (never uploaded):** nutrition/calorie logs, water, steps (entered manually — **we do not
read Apple Health**), and achievements. These stay on your device.
**e) Camera:** used **only** to scan food barcodes. Frames are decoded on-device; no images are stored or sent.
**f) Optional diagnostics:** the app collects **no** usage data by default. Only if enabled by the owner,
anonymous events (counts/enums with **no** email, name, or barcode value) are sent under a random identifier
unlinked to your account, with your consent.

### 3. What we don’t do
- **No ads, no cross-app/cross-site tracking, no selling your data.**
- **No third-party tracking SDKs** (no Google/Meta/etc.) — verifiable in our dependency list.
- **We do not request your location, contacts, or photos.**

### 4. What leaves your device, to whom
| Destination | When | What is sent |
|---|---|---|
| **Supabase** | Sign-in & sync | Account, profile, workouts, measurements, daily logs, meds/supplements — linked to your account id |
| **Open Food Facts** | You scan/search a food barcode | The barcode number only — nothing about you |
| **GitHub / jsDelivr** | Viewing an exercise demo image | An image GET request (your IP is visible to the CDN) — nothing about you |
| **YouTube** | You tap “watch form” | Opens an external search URL in your browser — no in-app embed or tracking |

### 5. Health data
We treat your health & fitness data with care: it stays local, and when signed in it syncs only to your own
account, protected by row-level security so only you can access it. **We never sell or share it for marketing.**

### 6. Sync & hosting
When signed in, the data in §4 syncs to Supabase over an encrypted (HTTPS) connection. Supabase project hosting
region: **[OWNER-TO-CONFIRM]** — if outside Saudi Arabia, a cross-border transfer notice is required under PDPL.

### 7. Retention
We keep your data while your account exists. Local data stays on your device until you delete it or the app.
Deleting your account erases your data from the server and device (see §8).

### 8. Deleting your data
In-app: **Settings & privacy → Delete account permanently**, which: (1) deletes your auth account on the server;
(2) deletes your rows from `profiles`, `workout_sessions`, `exercise_history`, `measurement_logs`, `daily_logs`;
(3) wipes all Qimmah data from your device (only non-personal preferences like language remain). If server
deletion fails, nothing is deleted and no success is claimed — retry or contact us.

### 9. Your rights (Saudi PDPL)
You have the right to **access**, **correct**, **delete**, and **object to/restrict** processing. Most are
exercised directly in-app (edit profile, delete account). For anything else, email **support@qimmah.app**.

### 10. Children & age
Minimum eligible age: **[OWNER-TO-CONFIRM — see Terms “Eligibility age”]**. (Technical note: the setup age field
currently accepts 12–90 for calorie math; it is not an eligibility gate.)

### 11. Security
Encrypted (HTTPS) connections; server-side auth and row-level security. No secret keys are embedded in the app
(only public keys, protected by RLS).

### 12. Changes
We may update this policy; the date above is published and material changes are notified in-app or by email.

### 13. Contact
**[OWNER-ENTITY]** — **support@qimmah.app**
