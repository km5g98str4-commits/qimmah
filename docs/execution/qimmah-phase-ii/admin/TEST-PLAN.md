# خطة اختبار المركز التنفيذي — Phase II

**السند:** `main@cc60adfc0da0f893b101230269d4847d33490429`

**الحالة:** خطة قبول مستقبلية؛ لا تدعي وجود tests أو route أو live provider الآن.

**المراجع:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) ·
[`EXECUTIVE-DASHBOARD-DATA-CONTRACT-V2.md`](../../../product/EXECUTIVE-DASHBOARD-DATA-CONTRACT-V2.md)

## 1. هدف الخطة

إثبات أن اللوحة:

- تمنع غير المصرح قبل الرسم والطلب.
- لا تثق بالعميل بدل الخادم.
- تعرض الأرقام الصادقة وحالات الغياب والجودة.
- لا تسرّب بيانات أو أسرارًا.
- تجيب عن الأسئلة التنفيذية من شاشة واحدة.
- تعمل بالعربية والإنجليزية، RTL/LTR، وعبر desktop/iPad/iPhone.
- تظل قابلة للاستخدام بلوحة المفاتيح وقارئ الشاشة واللمس.

## 2. مستويات التحقق

| Level | Scope | Required evidence |
|---|---|---|
| Contract/static | الأنواع والregistry والfield allowlists | typecheck + named assertions + negative mutations |
| Unit | role policy، filters، sorting، pagination، series adapters، quality | deterministic tests بلا شبكة |
| Component | حالات الأقسام والcontrols والتفصيل | DOM interaction tests، لا string includes وحدها |
| Browser | layout، focus، RTL، responsive، console، axe | Playwright على متصفح فعلي |
| Provider contract | fixture/live separation، abort، race، stale/partial | provider conformance suite |
| Server integration | JWT role، endpoint auth، RLS، field minimization | staging tests ومراجعة security |
| Release/CI | full gate + browser jobs + artifact scan | green run على SHA المرشح |

كل استثناء أو hardening يرافقه counter-test يسقط بفحص مسمى عند محاكاة الالتفاف.

## 3. مصفوفة الوصول والـfail-closed

| Case | Input | Expected UI decision | Provider call | Server expectation |
|---|---|---|---|---|
| Auth loading | auth unresolved | loading | zero | no request |
| No session | `session=null` | denied generic | zero | no request |
| Ordinary user | no accepted app claim | denied generic | zero | endpoint would return 403 |
| Self-asserted role | role only in `user_metadata` | denied | zero | 403 |
| Unknown role | unaccepted `app_metadata` value | denied | zero | 403 |
| Policy unresolved | founder/admin decision absent | denied | zero | 403 |
| Accepted role | accepted server claim after `ADM-001` | allowed | one | endpoint revalidates JWT |
| Expired session | stale client decision | error/denied after response | one max | 401/403, no payload |
| Forged request body role | client sends `role=founder` | irrelevant | one | ignored + 403 |

تأكيدات إلزامية:

1. تمرير `session` الأعلى إلى claim resolver يفشل type contract؛ تمرير
   `session.user` ينجح.
2. `user_metadata.qimmah_role` لا يفتح اللوحة حتى لو ساوى الدور المعتمد.
3. صفحة denied لا تحتوي metric names أو source names أو provisioning details.
4. provider spy يثبت صفر نداءات في denied/loading.
5. endpoint يعيد authorization مستقلة ولا يقرأ `AdminAccessDecision` من الطلب.

## 4. حالات الحمولة الست

| State | Setup | Required rendering | Forbidden rendering |
|---|---|---|---|
| denied | access denied | رسالة عامة وخطوة آمنة | shell، KPIs، أسماء مصادر، بيانات |
| loading | request pending | skeleton/status معلن ووقت بداية | أرقام سابقة غير موسومة، spinner أبدي |
| empty | authoritative zero response | empty copy + asOf/source | unavailable أو صفر مخترع من فشل |
| partial | section failure/coverage gap | المتاح + missing sections + quality | إخفاء الجزء الناقص |
| error | request failure | code عام + retry إن كان حقيقيًا | payload قديمة تبدو fresh |
| ready | complete response | كل الأقسام المطلوبة + freshness | placeholders أو missing caveats |

اختبار race: طلب A يبدأ، ثم B؛ وصول A بعد B لا يستبدل B. اختبار abort: مغادرة
السطح تلغي الطلب ولا تحدث state بعد unmount.

## 5. صدق المقاييس والعقود

لكل KPI اختبار registry يثبت وجود:

- `name`
- `definition`
- `requiredSource`
- `aggregation`
- `timeWindow`
- `timeZone`
- `privacyClass`
- `requiredRole`
- `refreshCadence`
- `backendOwner`
- `frontendUnavailableState`

ولكل قيمة ready:

- `asOf`
- `freshness`
- `sourceVersion`
- `quality.status`
- coverage numerator/denominator حيث يلزم
- caveats

اختبارات مضادة:

- `unavailable ?? 0` أو أي تحويل مماثل يسقط باسم `absence-is-not-zero`.
- stale value بلا وسم يسقط باسم `stale-is-not-current`.
- partial بلا missing sections يسقط باسم `partial-names-its-gaps`.
- product activity بلا consent coverage يسقط باسم `activity-declares-coverage`.
- `newToday` المحسوب rolling 24h بدل يوم الرياض يسقط باسم
  `today-is-riyadh-calendar-day`.
- inactive proxy المعنون churn يسقط باسم `proxy-is-not-churn`.
- meals count بلا تعريف meal version يسقط باسم `meal-definition-required`.

## 6. الرسوم

اختبارات adapter والrender:

1. growth chart يقبل `UserGrowthSeries` وحده.
2. active chart يقبل `SignedInSeries` أو product series المسمى صراحةً.
3. workout chart يرفض active series بفحص `workout-series-identity`.
4. retention يرفض line series ويتطلب `RetentionCohortMatrix`.
5. nutrition chart يرفض workout series.
6. كل chart يعرض unit/window/asOf/quality.
7. unavailable chart لا يرسم محورًا فارغًا يوحي بصفر.
8. الرسم له data table أو summary مكافئ لقارئ الشاشة.
9. ترتيب الزمن صحيح في RTL وLTR بلا قلب النص والأرقام.

## 7. طابور الانتباه

لكل signal يلزم: source/sourceVersion/owner/window/threshold/asOf/freshness/quality.

السيناريوهات:

- `detected`: يظهر السبب والخطوة التالية ولا يكشف payload.
- `clear`: لا يظهر إلا إذا نجح الفحص وكان المصدر fresh.
- `unmonitorable`: يظهر العمى والمالك، ولا يتحول إلى clear.
- `error`: يظهر فشل القياس منفصلًا عن عدم وجود alert.
- ترتيب critical ثم warning ثم info ثابت ومختبر.
- إشارات food ingest/exercise media/launch blockers لا تدعي العمل قبل مصادرها.

## 8. جدول المستخدمين والتفصيل

### 8.1 بيانات مسموحة

اختبار schema/serialization يرفض أي حقل غير مصرح. يجب أن يثبت:

- safe id، display name، masked email فقط.
- status، entitlement، activation، created/last-active/days-inactive.
- onboarding state وملخصات workouts/nutrition/measurement.
- language/platform عند توفرهما فقط.
- لا raw email، ولا device fingerprint، ولا weight/body values، ولا injuries،
  medications، supplements، allergies، food names.

### 8.2 تفاعل

- search بالاسم/safe id/masked email.
- sorting لكل عمود مدعوم، مع stable ordering وnull policy معلنة.
- filters: premium/free/pending/new today/inactive7d/inactive30d/onboarding/highly active.
- filter بلا مصدر لا يظهر كعامل، أو يظهر explanation غير تفاعلي؛ لا disabled
  button يعتمد على `title`.
- pagination تحفظ query، والvirtualization لا تفقد focus أو row identity.
- 5,000 صف لا يرسمها DOM كاملة ولا يفسد العدد.
- زر open لا يظهر بلا handler/route حقيقي.
- فتح التفصيل ينقل focus للعنوان؛ الرجوع يعيده للصف السابق.
- recent workouts وactivation وlast active تظهر إن كانت في العقد ومتاحة.

## 9. الشاشة الواحدة وغياب fake controls

Browser assertion على الصفحة الرئيسية يثبت وجود ما يلي دون فتح subpage:

- KPI strip.
- alerts/attention.
- trends المتاحة أو unavailable blocks.
- users needing attention أو حالتها غير القابلة للمراقبة.
- recent operational activity أو unavailable block.

اختبارات controls:

- `onRefresh`/capability غائبة ⇒ لا refresh button.
- user detail route/handler غائب ⇒ لا open button.
- لا grant/revoke/delete/force logout/resend activation controls.
- roadmap items عناصر نصية وليست buttons/links بلا وجهة.
- أي retry ظاهر يستدعي handler حقيقيًا مرة واحدة ويعلن الحالة.

## 10. مصفوفة Browser وRTL والوصولية

### 10.1 المشاهد الإلزامية

كل من العربية والإنجليزية على:

- Desktop: `1440×900` و`1280×800`.
- iPad quick view: `820×1180`.
- iPhone quick view: `390×844`.

الحالات: denied/admin fixture/empty/loading/partial/error/large users، إضافة إلى
تفاعلات filter/search/sort/open/back/refresh حين تكون القدرات موجودة.

### 10.2 Assertions

- `html[dir=rtl]` للعربية و`ltr` للإنجليزية.
- لا horizontal page overflow عند 390 و820.
- user quick view لا يعتمد على table `min-width:720px` وحده.
- كل touch target >=44×44 CSS px.
- focus order منطقي وfocus indicator ظاهر.
- tab pattern يعمل بالأسهم/Home/End إن استُخدم.
- back/forward icons تتبع الاتجاه.
- live regions تعلن loading/partial/error/refresh بلا ازدواج.
- form labels وtable headers وlandmarks وعناوين الرسوم صحيحة.
- automated axe: صفر critical/serious violations.
- contrast AA يُفحص للثيمين وفي disabled/unavailable/error states.
- zoom 200% وإعادة تدفق النص لا تخفي controls أو القيم.
- screenshots/visual diff للثيمين واللغتين والعروض، مع مراجعة بشرية مسماة.

SSR markup proof وحده لا يحقق هذه البوابة لأنه لا يشغّل layout أو focus أو
accessibility tree كما يفعل المتصفح.

## 11. الخصوصية والأمان

### 11.1 فحص المصدر والحزمة

- لا `service_role` أو privileged key في `src` أو `dist` أو source maps.
- لا admin endpoint يقبل role/subject من body بوصفه تفويضًا.
- لا direct DB admin reads من browser.
- fixture domains/ids لا تظهر في production bundle إن لم يكن fixture mode صريحًا.
- لا fallback تلقائي من live error إلى fixture data.

### 11.2 Console/network

Browser test يلتقط console وrequests في النجاح والفشل ويمنع:

- raw email/user id.
- JWT/access/refresh token.
- activation codes.
- health/product payload.
- stack أو error message خادمية حساسة في UI.

### 11.3 Server acceptance

- anonymous/ordinary/forged/expired tokens ⇒ 401/403 بلا body بيانات.
- accepted role بعد `ADM-001` ⇒ أقل response لازم.
- RLS/function review يثبت عدم التوسع خارج allowlist.
- enumeration resistance على user detail.
- rate limits وaudit للقراءات الحساسة حسب مراجعة Security.

## 12. Provider conformance

نفس suite تعمل على fixture provider وlive provider contract adapter:

- كل الطرق تعيد واحدة من الحالات الست.
- timestamps ISO صالحة و`asOf` غير مستقبلي.
- sourceVersion غير فارغ.
- partial يسمي missing sections.
- empty لا ينتج من catch/fallback.
- error codes allowlisted ولا تحمل رسالة خادم خام.
- pagination total/page/pageSize متسقة.
- unknown fields تُرفض أو تُزال عند boundary الموثق.
- request cancellation/race behavior متطابق.

live provider suite لا يبدأ قبل قبول `ADM-003`.

## 13. بوابات التنفيذ والـCI المستقبلية

هذه أسماء قدرات مطلوبة وليست scripts موجودة الآن:

1. Typecheck/lint/build.
2. Contract + auth denial mutation suite.
3. Metric honesty + chart identity suite.
4. Provider conformance suite.
5. DOM component interaction suite.
6. Browser matrix/axe/console leak suite.
7. Staging endpoint authorization/RLS suite.
8. Bundle secret/fixture scan.

قبل أي هبوط: `npm ci` ثم البوابات المحلية كاملة، ثم قراءة CI الأخيرة. لا يُعلن
النجاح من exit code فقط؛ تُقرأ assertion counts والمحاكاة المضادة، ولا تُخفى خطوة
browser خلف SSR proof.

## 14. معايير القبول

لا تصبح اللوحة `LIVE_READY` حتى تجتمع:

- `ADM-001..004` مقبولة.
- كل حالة وصول وحمولة مختبرة.
- one-screen home يمر في العروض الأربع واللغتين.
- browser accessibility/RTL/mobile خضراء.
- server authorization/RLS وbundle leak scans خضراء.
- metrics المتاحة فقط لها مصادر وتغطية وfreshness مثبتة.
- المقاييس المحجوبة تظهر unavailable ولا تتحول إلى أصفار.
- لا fake controls أو بيانات حساسة في console/network.
- CI كامل أخضر على SHA نفسه.

المقاييس التي تعتمد على `ADM-005..009` يمكن أن تبقى unavailable دون أن تمنع
قشرة صادقة، لكنها لا يجوز أن تظهر ready قبل قبول اعتمادها.

## 15. الاعتماديات

| Dependency | Owner | Status | Acceptance Evidence | Notes |
|---|---|---|---|---|
| `WS-001` — approved Web HEAD for host tests | Founder / Coordinator | BLOCKED | SHA approved + full green CI | route E2E waits for it |
| `ADM-001` — role policy | Founder / Security | OPEN | named founder/admin decision | access matrix uses deny meanwhile |
| `ADM-002` — server-issued claim | Backend / Auth | EXTERNALLY_BLOCKED | signed JWT fixtures + negative tests | required for allowed case |
| `ADM-003` — reviewed endpoints | Backend / Security | EXTERNALLY_BLOCKED | API/auth/RLS acceptance suite | required for live provider tests |
| `ADM-004` — account reconciliation | Backend / Data | OPEN | staging reconciliation report | required for authoritative empty/total |
| `ADM-005` — commerce source | Backend / Commerce | MISSING_SOURCE | schema + lifecycle + audit fixtures | related KPIs remain unavailable |
| `ADM-006` — consent-aware activity basis | Founder / Product / Privacy | NEEDS_DECISION | accepted coverage/consent contract | related metrics remain unavailable |
| `ADM-007` — onboarding completion signal | Founder / Product | NEEDS_DECISION | independent signal test | completion remains unavailable |
| `ADM-008` — runtime posture | Release / Backend | OPEN | deployment metadata fixture/endpoint | runtime cards remain unavailable |
| `ADM-009` — operational signal sources | Backend / Data / Release | OPEN | signal contracts + test fixtures | attention/recent activity partial |

## 16. دليل هذه الموجة

هذه الوثيقة خطة فقط. دليل الموجة الحالية يقتصر على اتساق الوثائق، حصر الفرق في
أربعة ملفات، ومرور `git diff --check`. أي نتائج unit/browser/server مستقبلية
تُسجل بأوامرها وSHAها الفعلي، لا تُستبق هنا.
