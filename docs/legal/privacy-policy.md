# سياسة الخصوصية — قِمّة / Privacy Policy — Qimmah

> **مسودة للمراجعة من المالك والمستشار القانوني — ليست استشارة قانونية.** كل بند مبني على سلوك التطبيق
> الفعلي في الشيفرة (`codex/v21-completion`). المواضع المعلّمة **[يُؤكَّد من المالك]**
> تحتاج قرارًا تجاريًا/قانونيًا قبل النشر. قناة التواصل العامة: **support@qimmah.app**.
>
> **Draft for owner + legal review — not legal advice.** Every clause reflects the app’s actual behaviour
> in code. Fields marked **[OWNER-TO-CONFIRM]** need a business/legal decision first. Public contact: **support@qimmah.app**.

آخر تحديث / Last updated: 2026-07-14 · المالك / Controller: **تطبيق قِمّة — يمثله مالكه / Qimmah App — represented by its owner** · التواصل / Contact: **support@qimmah.app**

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

**د) تسجيلات يومية:** سجلّ التغذية والسعرات، الماء، الخطوات (تُدخَل يدويًا — **لا نقرأ Apple Health**)،
والإنجازات، والخطط المخصّصة، والمهام. تبقى محلية أولًا، وقد تُزامَن إلى حسابك عند تفعيل المزامنة.

**هـ) الكاميرا:** تُستخدم **فقط** لمسح باركود المنتجات الغذائية. تُعالَج الصورة على الجهاز لقراءة الرمز، ولا
تُخزَّن ولا تُرسَل صور.

**و) التنبيهات الاختيارية:** يمكنك تفعيل تنبيهات محلية للتمرين والراحة والماء والملخّص الأسبوعي والمكمّلات.
تُحفظ أوقاتها وفترة الهدوء على جهازك، ولا تُرسل إلى خادم. لا يطلب التطبيق إذن الإشعارات إلا عند تفعيلك لها،
ويستخدم نصًا عامًا على شاشة القفل دون أسماء أدوية أو مكمّلات أو تفاصيل صحية.

**ز) تشخيص اختياري:** التطبيق **لا يجمع** بيانات استخدام افتراضيًا. عند تفعيله من قِبل المالك فقط، تُرسل أحداث
مجهولة (أعداد وأحداث بلا أي معرّف: لا بريد، لا اسم، لا رقم باركود) بمعرّف عشوائي غير مرتبط بحسابك، وبموافقتك.

### 3. ما لا نفعله
- **لا إعلانات، ولا تتبّع عبر التطبيقات أو المواقع**، ولا بيع لبياناتك.
- **لا نستخدم أي أدوات تتبّع من طرف ثالث** (لا Google/Meta/غيرها) — تحقّق من ذلك في قائمة اعتماديات التطبيق.
- **لا نطلب موقعك أو جهات اتصالك أو صورك.**

### 4. ما الذي يغادر جهازك ولمن
| الوجهة | متى | ماذا يُرسَل |
|---|---|---|
| **Supabase** (خدمة الخادم) | عند تسجيل الدخول وتفعيل المزامنة | بيانات الحساب والملف والتمارين والقياسات والتغذية والماء والخطوات والإنجازات والخطط والمهام والأدوية/المكمّلات — مرتبطة بمعرّف حسابك |
| **Open Food Facts** | عند مسح/بحث باركود غذائي | رقم الباركود فقط (لمعرفة المنتج) — بلا أي بيانات عنك |
| **GitHub / jsDelivr** | عند عرض صورة توضيحية لتمرين | طلب تحميل صورة (يظهر عنوان IP لجهازك للمزوّد) — بلا بيانات عنك |
| **YouTube** | عند الضغط «شاهد الأداء» | يفتح رابط بحث خارجيًا في المتصفّح — لا تضمين ولا تتبّع داخل التطبيق |

### 5. بيانات الصحة
نتعامل مع بيانات صحتك ولياقتك (التمارين، القياسات، الأدوية/المكمّلات) بعناية: تبقى محلية على جهازك، وعند تسجيل
الدخول تُزامَن إلى حسابك الخاص فقط ومحميّة بصلاحيات على مستوى الصف (RLS) بحيث لا يصل إليها إلا أنت. **لا نبيعها
ولا نشاركها لأغراض تسويقية.**

### 6. المزامنة والاستضافة وموقع التخزين
عند تسجيل الدخول تُزامَن البيانات المذكورة في §4 إلى Supabase عبر اتصال مشفّر (HTTPS). تُخزَّن بياناتك على
بنية Supabase التحتية في **اليابان** (منطقة `ap-northeast-1` — طوكيو). هذا يعني نقل بياناتك عبر الحدود من
المملكة العربية السعودية إلى اليابان. تُحكَم هذه المعالجة تعاقديًّا عبر مُلحق معالجة البيانات (DPA) الخاص بـ
Supabase. لا ندّعي وجود «قرار كفاية» أو اعتماد رسمي لأي وجهة؛ ويبقى الاعتماد النهائي لآلية النقل عبر الحدود
بموجب نظام حماية البيانات الشخصية (PDPL) بيد المالك والمستشار القانوني قبل الإطلاق العام.

### 7. مدة الاحتفاظ
نحتفظ ببياناتك ما دام حسابك قائمًا. البيانات المحلية تبقى على جهازك حتى تحذفها أو تحذف التطبيق. عند حذف الحساب
تُمحى بياناتك من الخادم ومن الجهاز (انظر §8).

### 8. حذف بياناتك
داخل التطبيق: «الإعدادات والخصوصية ← حذف الحساب نهائيًا». يؤدي ذلك إلى:
1. حذف حساب المصادقة الخاص بك من الخادم.
2. حذف صفوفك من جميع جداول بيانات المستخدم في قاعدة قِمّة قبل حذف حساب المصادقة.
3. مسح كل بيانات قِمّة من جهازك (تبقى فقط تفضيلات غير شخصية كاللغة).
إن تعذّر حذف الحساب من الخادم، لا يُحذف أي شيء ولا يُدّعى نجاح — تُعيد المحاولة أو تتواصل معنا.

### 9. حقوقك (نظام حماية البيانات الشخصية — السعودية)
لك الحق في: **الوصول** إلى بياناتك، **تصحيحها**، **حذفها**، و**الاعتراض/تقييد** المعالجة. يمكنك تنزيل نسخة JSON
من البيانات المتاحة على جهازك عبر «الملف الشخصي ← الإعدادات والخصوصية ← الخصوصية والبيانات». ويمكنك تعديل ملفك
أو حذف حسابك داخل التطبيق. لأي طلب إضافي راسلنا على **support@qimmah.app** وسنستجيب خلال المدة النظامية.

### 10. الأطفال والفئة العمرية
التطبيق موجّه للبالغين والمراهقين المهتمين باللياقة. الحد الأدنى للعمر المؤهّل للاستخدام: **12 سنة**، ويجب
تأكيد ذلك صراحةً عند إنشاء الحساب. لا يوجد مسار موافقة وليّ أمر في هذه النسخة.

### 11. الأمان
اتصالات مشفّرة (HTTPS)، ومصادقة وصلاحيات صف (RLS) على الخادم. لا نخزّن أي مفاتيح سرية داخل التطبيق (المفاتيح
العامة فقط، المحميّة بـ RLS).

### 12. تغييرات هذه السياسة
قد نحدّث هذه السياسة؛ يُنشر التاريخ أعلاه، والتغييرات الجوهرية تُبلَّغ داخل التطبيق أو بالبريد.

### 13. التواصل
**تطبيق قِمّة — يمثله مالكه** — **support@qimmah.app**

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
**d) Daily logs:** nutrition/calorie logs, water, steps (entered manually — **we do not read Apple Health**),
achievements, custom plans, and tasks are local-first and may sync to your account when sync is enabled.
**e) Camera:** used **only** to scan food barcodes. Frames are decoded on-device; no images are stored or sent.
**f) Optional notifications:** you can enable local workout/rest, water, weekly-summary, and supplement reminders.
Times and quiet hours remain on your device and are not sent to a server. Permission is requested only when you
enable reminders, and lock-screen copy is generic—never medication/supplement names or health details.
**g) Optional diagnostics:** the app collects **no** usage data by default. Only if enabled by the owner,
anonymous events (counts/enums with **no** email, name, or barcode value) are sent under a random identifier
unlinked to your account, with your consent.

### 3. What we don’t do
- **No ads, no cross-app/cross-site tracking, no selling your data.**
- **No third-party tracking SDKs** (no Google/Meta/etc.) — verifiable in our dependency list.
- **We do not request your location, contacts, or photos.**

### 4. What leaves your device, to whom
| Destination | When | What is sent |
|---|---|---|
| **Supabase** | Sign-in & enabled sync | Account, profile, workouts, measurements, nutrition, water, steps, achievements, plans, tasks, meds/supplements — linked to your account id |
| **Open Food Facts** | You scan/search a food barcode | The barcode number only — nothing about you |
| **GitHub / jsDelivr** | Viewing an exercise demo image | An image GET request (your IP is visible to the CDN) — nothing about you |
| **YouTube** | You tap “watch form” | Opens an external search URL in your browser — no in-app embed or tracking |

### 5. Health data
We treat your health & fitness data with care: it stays local, and when signed in it syncs only to your own
account, protected by row-level security so only you can access it. **We never sell or share it for marketing.**

### 6. Sync, hosting & storage location
When signed in, the data in §4 syncs to Supabase over an encrypted (HTTPS) connection. Your data is stored on
Supabase infrastructure in **Japan** (region `ap-northeast-1`, Tokyo). This means your data is transferred across
borders from Saudi Arabia to Japan. This processing is safeguarded contractually through Supabase's Data
Processing Addendum (DPA). We claim no adequacy decision or formal approval for any destination; final sign-off on
the cross-border transfer mechanism under the Saudi Personal Data Protection Law (PDPL) rests with the owner and
legal counsel before public launch.

### 7. Retention
We keep your data while your account exists. Local data stays on your device until you delete it or the app.
Deleting your account erases your data from the server and device (see §8).

### 8. Deleting your data
In-app: **Settings & privacy → Delete account permanently**, which: (1) deletes your auth account on the server;
(2) deletes your rows from all Qimmah user-data tables before deleting the auth account;
(3) wipes all Qimmah data from your device (only non-personal preferences like language remain). If server
deletion fails, nothing is deleted and no success is claimed — retry or contact us.

### 9. Your rights (Saudi PDPL)
You have the right to **access**, **correct**, **delete**, and **object to/restrict** processing. You can export
a JSON copy of the data available on your device from **Profile → Settings & privacy → Privacy & data**. You can
also edit your profile or delete your account in-app. For anything else, email **support@qimmah.app**.

### 10. Children & age
Minimum eligible age: **12 years**. Account creation requires an explicit 12+ confirmation. This version does
not provide a parental-consent flow.

### 11. Security
Encrypted (HTTPS) connections; server-side auth and row-level security. No secret keys are embedded in the app
(only public keys, protected by RLS).

### 12. Changes
We may update this policy; the date above is published and material changes are notified in-app or by email.

### 13. Contact
**Qimmah App — represented by its owner** — **support@qimmah.app**
