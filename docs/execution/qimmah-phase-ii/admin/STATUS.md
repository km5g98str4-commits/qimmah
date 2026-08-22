# حالة حارة المركز التنفيذي — Phase II

**الحارة:** Executive / Founder Dashboard architecture

**الفرع:** `e/phase-ii-executive-dashboard-002`

**السند:** `cc60adfc0da0f893b101230269d4847d33490429`

**الحالة:** `ARCHITECTURE_ONLY / LIVE_EXTERNALLY_BLOCKED`

## 1. ملخص تنفيذي

بدأت الحارة من `main@cc60adf` في worktree مستقل. هذه الموجة وثائق معمارية فقط:
لم تُعدّل `src/` أو route أو Backend/Supabase أو `package.json`، ولم تستهلك أو
تنسخ ملفات من فرع Dashboard أو Web بعيد.

النتيجة الحالية تحدد عقدًا V2 قابلًا للتنفيذ لاحقًا، وتغلق بالتصميم فجوات
الهوية، والتفويض، وحالات الصفحة، وصدق المقاييس، وتقليل البيانات، والشاشة
الواحدة، والوصولية والاختبارات. لا يوجد live provider أو admin route بعد.

## 2. نواتج هذه الموجة

| Artifact | Purpose | Status |
|---|---|---|
| `docs/product/EXECUTIVE-DASHBOARD-DATA-CONTRACT-V2.md` | عقد الهوية والمزوّد والحالات والمقاييس والمستخدم والتنبيهات | COMPLETE |
| `docs/execution/qimmah-phase-ii/admin/ARCHITECTURE.md` | حدود الثقة والمكونات وتدفق البيانات وUX/accessibility | COMPLETE |
| `docs/execution/qimmah-phase-ii/admin/TEST-PLAN.md` | مصفوفة التحقق من unit إلى browser/server/security | COMPLETE |
| `docs/execution/qimmah-phase-ii/admin/STATUS.md` | الحالة والاعتماديات والقرارات والمخاطر | COMPLETE |

## 3. ما حُسم في الوثائق

### حقيقة مؤكدة على هذا الفرع

- البداية هي `cc60adf`، لا HEAD من Web الجاري.
- لا implementation للوحة أُضيف في هذه الموجة.
- لا endpoint إداري ولا role policy أُنشئ هنا.
- ملفات التنفيذ المحجورة لم تُمس.

### تصميم معتمد للموجة، ينتظر التنفيذ

- claim seam هو `session.user`/`user`، لا `session` الأعلى.
- `AdminAccessDecision` fail-closed، وقرار العميل لا يغني عن تفويض الخادم.
- الحالات العليا: denied/loading/empty/partial/error/ready.
- كل metric يحتاج definition/source/window/asOf/freshness/quality/privacy/role/owner/unavailable.
- attention يحتاج provenance وthreshold وasOf وowner.
- series لا يعاد عنونتها بين active/workout/retention.
- home يجمع KPIs/alerts/trends/needs-attention/recent activity في سطح واحد.
- لا fake controls؛ control بلا handler أو capability لا يظهر.
- user payload مصغر، وقيم الصحة خارج العقد.
- responsive/accessibility تُثبت في متصفح فعلي.

### افتراض ممنوع تحويله إلى حقيقة

- لا نفترض أن `founder` وحده أو `founder` و`admin` هما السياسة الصحيحة.
- لا نفترض أن trigger إنشاء `profiles` backfill للحسابات التاريخية.
- لا نفترض أن `.env.example` يصف production.
- لا نفترض وجود نظام entitlement/activation أو event pipeline.
- لا نفترض اكتمال Web Sovereign أو اعتماد أي HEAD له.

## 4. لم يُفعل ولماذا

| Item | Why not | Next safe point |
|---|---|---|
| Admin route / host | يتقاطع مع Web Sovereign الجاري | بعد قبول `WS-001` |
| Live provider | لا endpoints مراجعة ولا سياسة دور | بعد `ADM-001..003` |
| Backend/RLS/schema | خارج نطاق الحارة وصلاحيتها | حارة Backend مستقلة |
| Entitlement/activation metrics | لا source system معتمد | بعد `ADM-005` |
| Product activity metrics | coverage/consent غير محسومين | بعد `ADM-006` |
| Onboarding completion KPI | الإشارة الحالية قد تعتمد على sync | بعد `ADM-007` |
| Browser proofs | لا implementation في هذه الموجة | أول موجة UI مستقلة |
| Writes/admin actions | Phase II read-first ولا capability مراجعة | خارج النطاق الحالي |

## 5. سجل الاعتماديات الحاكم

كل اعتماد له مالك وحالة ودليل قبول. لا يكفي commit message أو وجود ملف ليصبح
`ACCEPTED`.

| Dependency | Owner | Status | Acceptance Evidence | Notes |
|---|---|---|---|---|
| `WS-001` — HEAD نهائي معتمد للـWeb Sovereign | Founder / Coordinator | BLOCKED | SHA معتمد صراحةً + CI أخضر مقروء كاملًا | بعده فقط يعاد ربط الحارة، بلا نسخ مبكر |
| `ADM-001` — قرار سياسة `founder/admin` | Founder / Security | OPEN | قرار مسمى يحدد الأدوار المقبولة واسم claim | قبل القرار كل role policy غير محسومة = deny |
| `ADM-002` — مصدر claim خادمي | Backend / Auth | EXTERNALLY_BLOCKED | JWT test يثبت `app_metadata` + negative self-assertion test | لا بريد أو `user_metadata` |
| `ADM-003` — endpoints قراءة إدارية | Backend / Security | EXTERNALLY_BLOCKED | typed API contract + server auth tests + RLS review | لا client service role |
| `ADM-004` — مصدر حسابات reconciled | Backend / Data | OPEN | مقارنة `auth.users`/`profiles` + backfill/deployment evidence | شرط total/new users |
| `ADM-005` — entitlement/activation system | Backend / Commerce | MISSING_SOURCE | schema/lifecycle/audit/endpoints معتمدة | شرط premium/preview/codes/conversion |
| `ADM-006` — consent-aware activity denominator | Founder / Product / Privacy | NEEDS_DECISION | قرار مقام وتغطية وموافقة + privacy review | شرط product active/workout/meal/measurement |
| `ADM-007` — onboarding completion signal | Founder / Product | NEEDS_DECISION | signal مستقل عن sync مع contract/test | شرط completion/stuck |
| `ADM-008` — production posture source | Release / Backend | OPEN | runtime deployment metadata موثقة | شرط build/sync/backend health |
| `ADM-009` — attention/recent activity sources | Backend / Data / Release | OPEN | provenance + thresholds + freshness لكل signal | تعرض unmonitorable حتى القبول |

## 6. قرارات مطلوبة

1. `ADM-001`: هل `founder` وحده، أم `founder` و`admin`، وما سياسة منح/سحب الدور؟
2. `ADM-006`: هل يوجد مسار نشاط منتج كامل يحترم المحلي-افتراضيًا والموافقة، أم
   تبقى هذه KPIs غير قابلة للعرض؟
3. `ADM-007`: هل يُنشأ completion signal لا ينقل محتوى onboarding ولا يعتمد على sync؟
4. ما مستوى التعريف الفردي المسموح في needs-attention، إن أُقر مصدره؟ التوصية:
   safe id + سبب تشغيلي فقط في الصفحة الأولى.

## 7. المخاطر الحالية

| Risk | Impact | Mitigation in V2 | Residual blocker |
|---|---|---|---|
| الثقة بقرار الدور في العميل | تسريب بيانات إدارية | server re-authorization إلزامي | `ADM-001..003` |
| تمرير `session` بدل `session.user` | منع المؤسس أو قراءة seam خاطئة | seam موثق ومختبر في الخطة | implementation لاحق |
| الصفر بدل الغياب | قرار تنفيذي خاطئ | typed top-level/metric states | provider implementation |
| series معاد تسميتها | chart مضلل | metric identity/version لكل chart | source-specific series |
| انحياز sync/consent | أرقام نشاط ناقصة | quality/coverage + unavailable | `ADM-006` |
| تسريب health/account data | ضرر خصوصية | minimized types + drill-down | endpoint field allowlist |
| SSR previews بدل browser proof | عيوب mobile/a11y خفية | browser matrix إلزامية | UI wave |
| controls بلا handler | وعود كاذبة | absent-unless-capable rule | host integration |

## 8. بوابة الموجة التالية

يجوز بدء موجة UI مستقلة على fixtures من هذا العقد إذا بقيت بلا route وبلا live
provider. لا يجوز بدء integration إلا بعد:

- قبول `WS-001`.
- إعادة فحص HEAD المعتمد ومواضع App/auth/routes.
- حسم أو إبقاء `ADM-001` fail-closed بوضوح.
- إثبات أن لا ملفات مشتركة مع موجة جارية.

## 9. تعريف الاكتمال

هذه الموجة مكتملة عندما:

- توجد الوثائق الأربع ويشير بعضها إلى بعض بلا تناقض.
- تستخدم كل الاعتماديات جدول الأعمدة الخمسة المعتمد.
- لا تدعي أي وثيقة `LIVE` أو backend readiness.
- يمر `git diff --check`.
- يبقى diff محصورًا في الوثائق الأربع.

المنتج نفسه لا يصبح مكتملًا بإكمال هذه الموجة؛ الناتج هو أساس معماري قابل
للمراجعة والتنفيذ بعد فك الاعتماديات.
