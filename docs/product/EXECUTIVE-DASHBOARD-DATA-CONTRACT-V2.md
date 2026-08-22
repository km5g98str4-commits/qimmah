# عقد بيانات المركز التنفيذي — V2

**البرنامج:** `QIMMAH-SOVEREIGN-PHASE-II-001`

**النطاق:** Executive / Founder Dashboard

**السند:** `main@cc60adfc0da0f893b101230269d4847d33490429`

**الحالة:** عقد معماري فقط؛ لا توصيل حيّ ولا ادعاء جاهزية إنتاجية.

هذا هو مصدر الحقيقة المقترح لعقد واجهة المركز التنفيذي. يحدد ما يجب أن يثبته
المضيف، ومزوّد البيانات، والخادم قبل أن تظهر قيمة واحدة. لا ينسخ ميثاق المشروع،
ولا يمنح صلاحية، ولا يثبت وجود endpoint أو بيانات في بيئة منشورة.

## 1. مبادئ لا تقبل الاختصار

1. تسجيل الدخول لا يعني صلاحية إدارية.
2. قرار الواجهة طبقة حجب وتجربة استخدام، وليس مصدر التفويض النهائي.
3. كل قراءة حيّة يعيد الخادم تفويضها من JWT موثّق؛ لا يثق بدور أرسله المتصفح.
4. لا `service_role` ولا تجاوز RLS ولا وصول مباشر مميّز من المتصفح.
5. الغياب لا يتحول إلى صفر، والبيانات الجزئية لا تُعرض كبيانات كاملة.
6. كل قيمة تحمل تعريفًا ونافذة ومصدرًا ولحظة قياس وجودة وتغطية.
7. بيانات الصحة وقيم القياسات الفردية خارج الملخص التنفيذي.
8. لا عنصر تحكم ظاهرًا بلا فعل حقيقي ومصرّح ومتاح.
9. لا تُعاد تسمية سلسلة زمنية لتوهم أنها مقياس آخر.
10. التوصيل الحيّ يبقى `EXTERNALLY_BLOCKED` حتى تقبل الاعتماديات المسماة.

## 2. حدّ الهوية وقرار الوصول

### 2.1 وصلة Supabase الصحيحة

ادعاءات التطبيق توجد على المستخدم داخل الجلسة، لا على كائن الجلسة الأعلى. لذلك
يدخل محلل الدور كائنًا مُطبّعًا من `session.user` أو قيمة `user` التي يوفّرها
`useAuth()`؛ تمرير `session` مباشرةً غير صحيح.

```ts
interface AdminClaimSubject {
  readonly subjectId: string
  readonly appMetadata: Readonly<Record<string, unknown>>
  readonly userMetadata: Readonly<Record<string, unknown>>
}

function claimSubjectFromSession(
  session: { user: { id: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> } } | null,
): AdminClaimSubject | null
```

قيمة الدور تُقرأ من `session.user.app_metadata` فقط. وجود القيمة في
`session.user.user_metadata` لا يمنح صلاحية؛ هذا مخزن يستطيع المستخدم التأثير فيه.

### 2.2 `AdminAccessDecision`

سياسة قبول `founder` و/أو `admin` اعتماد مفتوح `ADM-001`. إلى أن يُحسم، لا
يُستنتج البديل ويظل القرار مغلقًا.

```ts
type AdminRole = 'founder' | 'admin'

type AdminAccessDecision =
  | {
      readonly state: 'loading'
      readonly reason: 'auth-loading' | 'role-policy-loading'
    }
  | {
      readonly state: 'denied'
      readonly reason:
        | 'no-session'
        | 'missing-server-claim'
        | 'unaccepted-server-claim'
        | 'self-asserted-claim'
        | 'role-policy-unresolved'
    }
  | {
      readonly state: 'allowed'
      readonly subjectId: string
      readonly role: AdminRole
      readonly source: 'verified-app-metadata'
      readonly decidedAt: string
    }
```

قواعد الحسم:

- الحالة الابتدائية `loading`، ولا يبدأ التطبيق من `allowed`.
- غياب الجلسة أو الادعاء أو سياسة الدور ينتج `denied`.
- لا قبول بالبريد، أو `localStorage`، أو `user_metadata`، أو متغير بناء.
- رسالة المنع العامة لا تكشف اسم الادعاء أو حالة تجهيز الدور أو بنية اللوحة.
- تفاصيل سبب المنع تُسجل في قناة تشغيلية آمنة ومجمعة إن وُجدت، لا في الصفحة ولا
  في console المتصفح.

### 2.3 التفويض مرتان، لا مرة

1. **Client gate:** يمنع الرسم والطلب المبكر ويحسن تجربة المستخدم.
2. **Server authorization:** يتحقق من JWT والادعاء والسياسة عند كل endpoint.

لا يمرر المتصفح `AdminAccessDecision` بوصفه إثباتًا للخادم. يرسل الطلب بجلسة
Supabase المعتادة، والخادم يبني قرارًا مستقلًا. فشل التحقق أو غياب السياسة أو
خطأ الشبكة يفشل مغلقًا بلا بيانات.

## 3. عقد المزوّد

واجهة التطبيق تعتمد على مزوّد مجرد؛ fixture provider منفصل صراحةً عن live
provider، ولا يوجد fallback من live إلى fixture.

```ts
interface AdminReadContext {
  readonly access: Extract<AdminAccessDecision, { state: 'allowed' }>
  readonly locale: 'ar' | 'en'
  readonly timeZone: 'Asia/Riyadh'
  readonly signal?: AbortSignal
}

interface ExecutiveDashboardProvider {
  readHome(context: AdminReadContext): Promise<DashboardLoadState<ExecutiveHome>>
  readUsers(context: AdminReadContext, query: AdminUserQuery): Promise<DashboardLoadState<AdminUserPage>>
  readUserDetail(
    context: AdminReadContext,
    userId: string,
  ): Promise<DashboardLoadState<AdminUserDetail>>
}
```

المزوّد لا يُستدعى ما لم يكن `access.state === 'allowed'`. ومع ذلك لا يغني هذا
عن تفويض الخادم. live provider غير موجود في هذه الموجة، وحالته
`EXTERNALLY_BLOCKED` لا `LIVE`.

## 4. حالات الحمولة العليا

هذه حالات الصفحة/القسم، وليست أسماء fixtures:

```ts
type DashboardLoadState<T> =
  | { readonly state: 'denied'; readonly reason: 'unauthorized' }
  | { readonly state: 'loading'; readonly startedAt: string }
  | { readonly state: 'empty'; readonly asOf: string; readonly sourceVersion: string }
  | {
      readonly state: 'partial'
      readonly data: T
      readonly asOf: string
      readonly missingSections: readonly string[]
      readonly quality: DataQuality
    }
  | {
      readonly state: 'error'
      readonly code: string
      readonly retryable: boolean
      readonly occurredAt: string
    }
  | {
      readonly state: 'ready'
      readonly data: T
      readonly asOf: string
      readonly quality: DataQuality
    }
```

- `denied`: لا تُنشأ تحته حمولة ولا placeholders تكشف بنية اللوحة.
- `loading`: مؤقت وله بداية؛ لا spinner أبدي.
- `empty`: استعلام موثوق نجح وأثبت عدم وجود سجلات ضمن النطاق.
- `partial`: جزء صالح وجزء غائب، مع أسماء الأجزاء والتغطية.
- `error`: لا يحمل قيمة قديمة متنكرة كحالية.
- `ready`: كل الحقول المطلوبة متاحة ضمن شروط الجودة المعلنة.

## 5. عقد المقياس والقيمة

### 5.1 التعريف

```ts
type PrivacyClass = 'aggregate' | 'account' | 'product' | 'health-sensitive'
type MetricOwner = 'client' | 'backend' | 'product' | 'data'
type MetricAvailability =
  | 'AVAILABLE_NOW'
  | 'NEEDS_REVIEWED_BACKEND'
  | 'NEEDS_SOURCE_SYSTEM'
  | 'NEEDS_PRODUCT_DECISION'
  | 'IMPOSSIBLE_WITH_CURRENT_CONSENT'

interface MetricDefinition {
  readonly name: string
  readonly definition: string
  readonly requiredSource: string
  readonly aggregation: string
  readonly timeWindow: string
  readonly timeZone: 'Asia/Riyadh' | 'UTC'
  readonly privacyClass: PrivacyClass
  readonly requiredRole: AdminRole | 'resolved-admin-policy'
  readonly refreshCadence: string
  readonly backendOwner: string
  readonly frontendUnavailableState: MetricAvailability
}
```

### 5.2 القيمة والجودة

```ts
interface DataQuality {
  readonly status: 'complete' | 'partial' | 'stale' | 'unknown'
  readonly coverageNumerator: number | null
  readonly coverageDenominator: number | null
  readonly caveats: readonly string[]
}

type MetricDatum<T> =
  | {
      readonly state: 'ready'
      readonly value: T
      readonly asOf: string
      readonly freshness: 'fresh' | 'stale'
      readonly sourceVersion: string
      readonly quality: DataQuality
    }
  | {
      readonly state: 'unavailable'
      readonly reason: MetricAvailability
      readonly owner: MetricOwner
    }
  | { readonly state: 'loading'; readonly startedAt: string }
  | { readonly state: 'error'; readonly code: string; readonly retryable: boolean }
```

لا تستخدم الواجهة `?? 0`. القيمة القديمة تحمل `freshness: 'stale'` وتظهر كذلك.
إن كانت تغطية مقياس نشاط المستخدمين مقتصرة على الموافقين على المزامنة، يجب أن
يحمل البسط والمقام والنص المعروض هذا القيد؛ وإلا لا يُعرض المقياس.

## 6. سجل KPIs المقترح

الجدول التالي يحدد المقاييس المطلوبة ولا يثبت توفر مصادرها:

| Name | Definition | Required source | Aggregation | Time window | Privacy | Role | Owner | Unavailable state |
|---|---|---|---|---|---|---|---|---|
| `users.total` | عدد حسابات المصادقة القائمة | `auth.users` أو إسقاط reconciled مثبت | `count(*)` | لحظة القياس | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `users.newToday` | حسابات أُنشئت منذ منتصف ليل الرياض | مصدر الحسابات الموثوق | count | Riyadh calendar day | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `users.new7d` | حسابات جديدة | مصدر الحسابات الموثوق | count | rolling 7d | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `users.new30d` | حسابات جديدة | مصدر الحسابات الموثوق | count | rolling 30d | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `activity.signedInToday` | حسابات آخر دخولها ضمن اليوم | `auth.users.last_sign_in_at` | distinct users | Riyadh calendar day | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `activity.signedIn7d` | حسابات آخر دخولها خلال 7 أيام | `auth.users.last_sign_in_at` | distinct users | rolling 7d | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `activity.signedIn30d` | حسابات آخر دخولها خلال 30 يومًا | `auth.users.last_sign_in_at` | distinct users | rolling 30d | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `activity.inactive30d` | حسابات بلا دخول خلال 30 يومًا | `auth.users.last_sign_in_at` | count | rolling 30d | aggregate | resolved-admin-policy | Backend/Auth | NEEDS_REVIEWED_BACKEND |
| `entitlement.premiumActive` | استحقاقات Premium السارية | نظام استحقاق معتمد | count distinct account | as of now | aggregate | resolved-admin-policy | Backend/Commerce | NEEDS_SOURCE_SYSTEM |
| `entitlement.preview` | حسابات بلا استحقاق مدفوع | الحسابات + نظام الاستحقاق | reconciled difference | as of now | aggregate | resolved-admin-policy | Backend/Commerce | NEEDS_SOURCE_SYSTEM |
| `activation.redeemed` | عمليات تفعيل ناجحة | سجل تفعيل معتمد | count | selected window | aggregate | resolved-admin-policy | Backend/Commerce | NEEDS_SOURCE_SYSTEM |
| `activation.pending` | أكواد صالحة غير مستخدمة | سجل تفعيل معتمد | count | as of now | aggregate | resolved-admin-policy | Backend/Commerce | NEEDS_SOURCE_SYSTEM |
| `activation.failed` | محاولات مرفوضة مجمعة بلا كشف الكود | audit aggregate | count | rolling 24h | aggregate | resolved-admin-policy | Backend/Security | NEEDS_SOURCE_SYSTEM |
| `conversion.accountToPremium` | Premium active ÷ total accounts | مصدران reconciled | ratio | as of now | aggregate | resolved-admin-policy | Data/Commerce | NEEDS_SOURCE_SYSTEM |
| `product.activeToday` | حسابات لها حدث منتج موافَق عليه | consent-aware event source | distinct users | Riyadh calendar day | aggregate | resolved-admin-policy | Data/Product | IMPOSSIBLE_WITH_CURRENT_CONSENT |
| `product.active7d` | حسابات لها حدث منتج موافَق عليه | consent-aware event source | distinct users | rolling 7d | aggregate | resolved-admin-policy | Data/Product | IMPOSSIBLE_WITH_CURRENT_CONSENT |
| `product.active30d` | حسابات لها حدث منتج موافَق عليه | consent-aware event source | distinct users | rolling 30d | aggregate | resolved-admin-policy | Data/Product | IMPOSSIBLE_WITH_CURRENT_CONSENT |
| `workouts.completed7d` | جلسات مكتملة ظاهرة ضمن التغطية | workout source | count | rolling 7d | product | resolved-admin-policy | Data/Product | IMPOSSIBLE_WITH_CURRENT_CONSENT |
| `meals.logged7d` | وجبات وفق تعريف خادمي ثابت | nutrition event source | count | rolling 7d | product | resolved-admin-policy | Data/Product | IMPOSSIBLE_WITH_CURRENT_CONSENT |
| `measurements.events30d` | أحداث قياس، لا قيم القياس | measurement event source | count | rolling 30d | product | resolved-admin-policy | Data/Product | IMPOSSIBLE_WITH_CURRENT_CONSENT |
| `onboarding.completionRate` | مكتملون ÷ حسابات مؤهلة | completion signal مستقل عن sync | ratio | selected cohort | aggregate | resolved-admin-policy | Product/Data | NEEDS_PRODUCT_DECISION |

`signedIn*` لا يسمى «نشاط منتج»، و`inactive30d` وكيل خمول لا churn. تعريف
`meals.logged7d` يجب أن يثبت معنى الوجبة قبل تنفيذه.

## 7. عقد السلاسل والرسوم

```ts
interface MetricSeries {
  readonly metricName: string
  readonly definitionVersion: string
  readonly unit: 'accounts' | 'events' | 'ratio'
  readonly window: string
  readonly points: readonly { bucketStart: string; value: number }[]
  readonly asOf: string
  readonly quality: DataQuality
}
```

كل رسم يقبل `metricName` المتوقع ويمنع غيره. تحديدًا:

- `activity.signedInSeries` لا يغذي `workouts.completedSeries`.
- `activity.signedInSeries` لا يغذي `retention.cohorts`.
- retention cohort مصفوفة cohort/period، وليست line series معاد تسميتها.
- workout وnutrition لكل منهما series مستقل وتعريف مستقل.
- إن غاب المصدر، يظهر سبب الغياب ولا يظهر رسم فارغ يوحي بصفر.

## 8. عقد طابور الانتباه

```ts
interface AttentionSignal {
  readonly id: string
  readonly title: string
  readonly severity: 'critical' | 'warning' | 'info'
  readonly state: 'detected' | 'clear' | 'unmonitorable' | 'error'
  readonly definition: string
  readonly source: string
  readonly sourceVersion: string
  readonly owner: string
  readonly window: string
  readonly threshold: string
  readonly asOf: string | null
  readonly freshness: 'fresh' | 'stale' | 'unknown'
  readonly quality: DataQuality
  readonly nextStep: string
}
```

`unmonitorable` لا يطوى في `clear`. لا يحمل signal بريدًا أو payload أو كود
تفعيل. إشارات food ingest وexercise media وlaunch blockers تحتاج مصادر إنتاجية
مراجعة قبل أن تصبح `detected` أو `clear`.

## 9. عقد المستخدم المصغّر

### 9.1 القائمة

```ts
interface AdminUserListItem {
  readonly safeId: string
  readonly displayName: string | null
  readonly emailMasked: string | null
  readonly accountStatus: 'active' | 'disabled' | 'unknown'
  readonly entitlement: 'premium' | 'preview' | 'unknown'
  readonly activationState: 'redeemed' | 'pending' | 'failed' | 'not-applicable' | 'unknown'
  readonly createdAt: string
  readonly lastActiveAt: string | null
  readonly daysInactive: number | null
  readonly onboardingComplete: boolean | null
  readonly workoutsCountWindow: MetricDatum<number>
  readonly lastWorkoutAt: MetricDatum<string | null>
  readonly nutritionActivity: MetricDatum<number>
  readonly measurementActivity: MetricDatum<number>
  readonly language: 'ar' | 'en' | 'unknown'
  readonly platform: 'web' | 'ios' | 'unknown'
}
```

- لا بريد كامل في حمولة القائمة.
- `device` لا يعني fingerprint؛ لا يُعرض إلا تصنيف منصة موجود أصلًا ومصرح به.
- لا وزن ولا قياس جسم ولا طعام ولا إصابة ولا دواء في القائمة.
- الحقول غير المتاحة تبقى `MetricDatum.unavailable` أو `null` المعرّف، لا قيمة
  مصطنعة.

### 9.2 التفصيل المتعمد

تفصيل المستخدم طلب مستقل بعد فعل واضح، ويعيد فقط: الحساب، الاستحقاق، التفعيل،
ملخص onboarding، ملخص الخطة، أحدث جلسات التمرين بأقل حقول لازمة، أعداد نشاط
التغذية والقياس، آخر نشاط، وسياق دعم مجمع إن وُجد. قيم الصحة والتغذية التفصيلية
تبقى خارج هذا العقد حتى قرار خصوصية وصلاحية مستقل.

## 10. عقد الشاشة الواحدة

الصفحة الرئيسية نفسها، بلا تنقل عميق، تحتوي بالترتيب:

1. حالة المصدر و`asOf` والتنبيهات الحرجة.
2. KPI strip.
3. الاتجاهات الصادقة المتاحة.
4. مستخدمون يحتاجون انتباهًا، بأقل بيانات.
5. نشاط تشغيلي حديث مجمع.
6. وصول مباشر إلى قائمة المستخدمين والتفصيل دون إخفاء الجواب التنفيذي خلف خمس طبقات.

زر refresh لا يظهر إن لم يوجد handler فعلي. زر فتح المستخدم لا يظهر إن لم يوجد
route/handler فعلي. الأفعال غير المتاحة تُذكر بوصفها خارطة طريق نصية، لا عناصر
تفاعلية معطلة أو أزرارًا لا تعمل.

## 11. مصدر الحقيقة: مؤكد، مشروط، ومفقود

- `auth.users` هو المرشح المرجعي للحسابات، لكنه يحتاج endpoint إداريًا مراجعًا.
- trigger إنشاء `profiles` يضمن الحسابات الجديدة بعد نشره فقط؛ لا يثبت backfill
  ولا مساواة تاريخية ولا نشر migration على البيئة الحية.
- `.env.example` لا يثبت قيمة production. حالة sync/build تُقرأ من runtime أو
  deployment metadata موثوق.
- لا نفترض وجود نظام استحقاق أو تفعيل أو سجل أخطاء من أسماء UI.
- بيانات النشاط المحلي لا تمثل كل المستخدمين ما لم يوجد أساس موافقة وتغطية صالح.

## 12. الاعتماديات

هذا الجدول هو صيغة الاعتمادية الإلزامية؛ تبقى الحالة داخل الوصف غير مقبولة حتى
يكتمل العمل المتبقي ويُرفق دليله الفعلي في سجل التنفيذ.

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
|---|---|---|---|---|
| `WS-001` | `BLOCKED`: اعتماد المؤسس للرأس النهائي وقراءة CI الكاملة. | SHA نهائي مقبول صراحةً للـWeb Sovereign. | إعادة ربط حارة `e/*` بالرأس المقبول وفق runbook التقارب. | إعادة فحص host/auth/routes ثم تنفيذ اختبارات التكامل فقط؛ لا نسخ أو ربط قبله. |
| `ADM-001` | `OPEN`: قرار Founder/Security لسياسة قبول `founder` و`admin`. | لا شيء؛ قرار ملكية وأمان مستقل عن تنفيذ Web. | `AdminAccessPolicy` في host بعد إعادة الربط. | تثبيت الأدوار واسم claim وسياسة منحه/سحبه ثم اختبارات deny/allow. |
| `ADM-002` | `EXTERNALLY_BLOCKED`: claim خادمي لا يستطيع المستخدم تزويره. | عقد auth/session النهائي وموقع claim المقبولان في Web. | محول `session.user` وطبقة server authorization. | إصدار claim، fixtures JWT، واختبار رفض `user_metadata` والبريد. |
| `ADM-003` | `EXTERNALLY_BLOCKED`: endpoints قراءة إدارية مراجعة أمنيًا. | عقد host/router/auth النهائي الذي سيستهلك endpoints. | `LiveAdminProvider` وحدود API بعد rebind. | API contract، تحقق JWT/role، مراجعة RLS، allowlist، وaudit evidence. |
| `ADM-004` | `OPEN`: مصدر حسابات reconciled موثوق. | مخطط الحساب/profile النهائي وعلاقة auth بالمزامنة في Web. | مزود KPIs وقائمة المستخدمين. | تقرير reconciliation وcount/backfill ثم إثبات authoritative empty/totals. |
| `ADM-005` | `MISSING_SOURCE`: نظام الاستحقاق والتفعيل غير مثبت. | العقد النهائي لمسار entitlement/activation في Web، إن كان ضمنه. | KPIs التجارة وحالات المستخدم. | اعتماد schema/lifecycle/audit/endpoints؛ تبقى القيم unavailable حتى ذلك. |
| `ADM-006` | `NEEDS_DECISION`: أساس نشاط يحترم المحلي-افتراضيًا والموافقة. | عقد sync/consent النهائي للـWeb Sovereign. | KPIs النشاط والتمارين/الوجبات/القياسات. | اعتماد المقام والتغطية والخصوصية ثم بناء مصدر consent-aware. |
| `ADM-007` | `NEEDS_DECISION`: إشارة إكمال onboarding مستقلة عن sync. | عقد وحالة onboarding النهائية في Web. | KPI الإكمال وطابور التعثر. | تعريف signal وكتابته واختباره دون تسريب محتوى الملف. |
| `ADM-008` | `OPEN`: مصدر runtime deployment posture موثوق. | عقد build/runtime/env النهائي للـWeb. | بطاقات build/sync/backend في الصفحة الرئيسية. | توصيل metadata من البيئة الفعلية واختبار freshness؛ لا استنتاج من template. |
| `ADM-009` | `OPEN`: مصادر attention/recent activity المسماة. | مصادر الأحداث والحالات النهائية التي يعتمدها Web. | attention queue وrecent operational activity. | عقد كل signal مع provenance/threshold/asOf/owner واختبارات detected/clear/unmonitorable. |

## 13. ما لا يثبته هذا العقد

- لا يثبت جاهزية live dashboard.
- لا يثبت نشر migration أو endpoint أو claim.
- لا يختار بين `founder` و`admin`.
- لا يصرح بأي كتابة إدارية.
- لا يصل route ولا يستورد مكوّنًا ولا يعدل `package.json`.
- لا يستهلك أي ملف من فرع Dashboard أو Web بعيد.
