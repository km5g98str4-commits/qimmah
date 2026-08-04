# أمان الحساب واستعادته — التدقيق والعقود (Prompt 3)

**الفرع:** `claude/secure-account-ops-v1` (من af4b399). لا UI مُسّت — العقود الخادمية موثّقة للتنفيذ الإداري لاحقًا.

## ١) تدقيق التدفقات الحالية (بالأدلة)
| التدفق | الحالة | الدليل |
|---|---|---|
| signup/login | ✅ `signInWithPassword`/`signUp` عبر HTTPS؛ الجلسة في `qimmah:supabase-auth:v1` (persistSession + autoRefresh) — **مستثناة من التصدير/المزامنة** (registry allowlist، مُثبت في اختبارات النقل 49+34) | `supabaseClient.ts:80-84` |
| email verification | ✅ بوابة `email_confirmed_at` قبل الدخول للتطبيق (VerifyEmailView في التدفق) | App flow |
| password recovery | ✅ `resetPasswordForEmail` بـ`redirectTo → #/reset`؛ الرابط يُقبل implicit **وPKCE** (`exchangeCodeForSession`)؛ حدث `PASSWORD_RECOVERY` يرفع `recoveryActive` الذي **يجمّد المزامنة والاستيراد والجدولة** (مُثبت: reset-recovery 33 فحصًا + sync/portability) | `authContext.tsx:297-325`، `deepLinkRecovery.ts:48` |
| PKCE/deep links iOS | ✅ URL scheme `com.qimmah.mobile` + AppDelegate proxy + معالجة الرمز في `deepLinkRecovery` (اختُبر على الجهاز في موجة v1.1) | `Info.plist`، `deepLinkRecovery.ts` |
| signOut | ✅ مسح صريح للبيانات (wipe) ثم `supabase.auth.signOut()` | `authContext.tsx:253-264` |
| حذف الحساب | ✅ تأكيد بكلمة + لا مسح محلي إلا بعد تأكيد الخادم | `SettingsView.tsx:66-88` (موجة سابقة) |

**توصية مسجَّلة (لا تُنفَّذ بلا اختبار جهاز):** ضبط `flowType: 'pkce'` صراحةً في عميل Supabase — اليوم يعمل المساران؛ التصريح يقفل implicit نهائيًا. يتطلب تحقق روابط البريد على iOS قبل القلب.

## ٢) العقد الخادمي (Admin API — server-side فقط، ليس في العميل)
كل إجراء أدناه: **service_role على خادم فقط** (Edge Function/لوحة Supabase)، خلف مصادقة مشغّل + **قيد Audit Log قبل التنفيذ**. العميل لا يحمل أي مسار admin.

| # | الإجراء | الواجهة | القيد |
|---|---|---|---|
| A1 | إرسال إعادة تعيين | `auth.admin.generateLink({type:'recovery'})` أو `resetPasswordForEmail` | لا يُنشأ رابط يدويًا ولا يُرسل خارج بريد المستخدم المسجَّل |
| A2 | إنهاء جلسات المستخدم | `auth.admin.signOut(userId, 'global')` | فوري عند الاشتباه؛ يبطل refresh tokens كلها |
| A3 | تعطيل/حظر | `auth.admin.updateUserById(id,{ban_duration})` | مدة صريحة + سبب في السجل |
| A4 | تغيير بريد إداري | `auth.admin.updateUserById(id,{email})` بعد تحقق هوية موثَّق | لا يتم أبدًا بطلب محادثة فقط |
| A5 | حذف حساب إداري | `auth.admin.deleteUser` | بعد A2 + تصدير قانوني إن طُلب |

**مخطط Audit Log (جدول `admin_audit_log`، RLS: قراءة للمشغّلين فقط):**
`id · at · operator_id · action(A1..A5) · target_user_id · reason · request_source · result` — **لا يحوي أبدًا**: كلمات مرور، توكنات، OTP، محتوى بيانات صحية.

## ٣) المحظورات (مفروضة آليًا في `test:secure-ops`)
- لا plaintext password تخزينًا أو عرضًا أو تسجيلًا (المالك والأدمن سواء — Supabase يخزّن bcrypt فقط).
- لا `service_role` في `src/` أو `VITE_*`.
- لا تسجيل password/OTP/access_token/refresh_token في console.
- لا backdoor/impersonation: لا يوجد أي مسار في العميل يقبل توكن مستخدم آخر.

## ٤) إجراءات الدعم والطوارئ (كتيّب المشغّل)
1. «نسيت كلمة المرور» → المستخدم نفسه من الشاشة، أو A1. **لا تُطلب كلمة المرور هاتفيًا أبدًا.**
2. اشتباه اختراق → A2 (إنهاء الجلسات) ثم A1 (إعادة تعيين) ثم مراجعة السجل.
3. حساب مسيء → A3 بمدة وسبب.
4. فقد البريد → تحقق هوية خارجي موثَّق ثم A4.
5. كل إجراء يُسجَّل قبل تنفيذه؛ سجل بلا قيد = حادثة.

## ٥) الاختبارات
- روابط الاستعادة: **test:reset-recovery = 33 ✓** (رابط صالح/مشوّه/منتهٍ + تثبيت الشاشة + حجب التصدير والجدولة أثناءها).
- الجلسة المنتهية: `autoRefreshToken` يجدّد؛ فشل التجديد ⇒ `onAuthStateChange` يخفض الجلسة ⇒ حارس الدخول يعيد للـstart (مسار قائم).
- الحساب المعطَّل: الخادم يرفض refresh/login (سلوك Supabase) ⇒ نفس مسار الجلسة المنتهية محليًا — **اختبار جهاز/تكامل مع مشروع Supabase حقيقي مطلوب لاحقًا** (لا يُختبر offline بصدق).
- بوابة recovery في المزامنة: مُثبتة runtime في `test:secure-ops`.
