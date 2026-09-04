-- ============================================================================
-- 20260806120003 — تحصين صلاحيات الجداول: أقلّ امتياز بدل المنح الافتراضي
-- ============================================================================
-- هجرة أمنية ضيّقة. **لا تمسّ أي سياسة RLS قائمة، ولا مخطّطًا، ولا بيانات.**
-- تعدّل الصلاحيات على مستوى الجدول (GRANT/REVOKE) وحدها.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- العلّة، مُثبَتة بالتنفيذ (`npm run test:privileges`، المرحلة أ):
--
--   Supabase يمنح `anon` و`authenticated` صلاحيات **كاملة** على جداول `public`
--   افتراضيًا. المستودع فعّل RLS على ٢٣ جدولًا وكتب سياسات مالك سليمة — لكنه
--   لم يسحب شيئًا من ذلك المنح. فبقي على **١٧ جدولًا**:
--       TRUNCATE · REFERENCES · TRIGGER
--
--   و**RLS لا تحرس TRUNCATE إطلاقًا**: هي صلاحية *جدول* لا *صفّ*، ولا سياسة
--   تراها. النتيجة المُقاسة: مستخدم مسجَّل **لا يرى** صفّ غيره (RLS تخفيه)،
--   ثم يمحوه بأمر واحد:
--       truncate public.workout_sessions;   -- قبل=١ صفّ، بعد=٠
--
--   أي أن كل بيانات كل المستخدمين — التمارين والقياسات والتغذية والملفات —
--   كانت قابلة للمحو الكامل من أي حساب.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- المبدأ المطبَّق هنا:
--
--   **لا يُعتمَد على RLS في حراسة عملية ليست على مستوى الصفّ.**
--   RLS تحرس SELECT/INSERT/UPDATE/DELETE صفًّا صفًّا. أمّا TRUNCATE و
--   REFERENCES و TRIGGER فتُحسم بصلاحية الجدول وحدها — فتُسحب صراحةً.
--
--   **`revoke all` ثم منح المطلوب فقط** — لا سحب انتقائي. القائمة الانتقائية
--   تحرس ما عدّدتَه فقط، وتترك ما لم يخطر ببالك (وTRUNCATE هو بالضبط ما لم
--   يخطر). العكس — سحب كل شيء ثم إعادة ما يلزم — يحرس المجهول أيضًا.
--
--   **لا منح جماعي.** ممنوع `grant ... on all tables in schema public`:
--   يعيد المشكلة بصيغة أخرى ويمنح الجداول القادمة بلا قرار. كل جدول يُسمّى،
--   وكل صلاحية مبرَّرة بفئته أدناه.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- الفئات الثلاث ومبرّر كلٍّ:
--
--   ① جداول المزامنة (١٧): العميل يكتب فيها مباشرةً عبر supabase-js، فيحتاج
--      `select, insert, update, delete`. RLS (سياسات المالك الأربع القائمة)
--      هي التي تحصر كل عملية في صفوف صاحبها — ولا تُمسّ هنا.
--
--   ② جداول الوصول المقروءة (٢): `entitlements` و`access_code_redemptions`.
--      `select` فقط؛ كل كتابة تمرّ بدالة SECURITY DEFINER. (حُصّنت أصلًا في
--      20260806120001 — تُذكر هنا لتكتمل المصفوفة ويصير الملف مرجعًا واحدًا.)
--
--   ③ الأكواد والسجلّات الدائمة (٤): لا صلاحية إطلاقًا لأي دور عميل.
--
--   وفي كل الفئات: `anon` **بلا أي صلاحية**. سياسات RLS كلّها `to authenticated`،
--   فالمنح لـanon كان بلا مستفيد أصلًا — ومع ذلك كان يحمل TRUNCATE.
--
--   `service_role` (مفتاح الخادم السرّي) يبقى كما هو: الإدارة والهجرات تحتاجه،
--   ولا يصل متصفّحًا أبدًا.
--
-- forward-only و idempotent: إعادة التشغيل تُقارب نفس الحالة بالضبط.
-- التراجع (إن لزم) = إعادة المنح يدويًا؛ لا تُبنى هنا لأن التراجع عن تحصين
-- أمني يجب أن يكون قرارًا واعيًا لا سطرًا جاهزًا.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- [PROD-DRIFT] الفعل صار **شاملًا للمخطّط** كتأكيده — والسبب عطلٌ مقيس لا تحسين
-- ═══════════════════════════════════════════════════════════════════════════
-- كانت هذه الهجرة تحصّن **قائمة مسمّاة** ثم تؤكّد **على المخطّط كلّه**. وذلك
-- تفاوتٌ بنيويّ: كل جدول خارج القائمة يبقى مكشوفًا، ثم يُسقِط التأكيدُ الهجرةَ
-- نفسها. فهي تفشل حيث تُحتاج بالضبط — على قاعدة فيها جدول لم تعرفه القائمة.
--
-- ولم يكن فرضًا: preflight الإنتاج (٤ سبتمبر ٢٠٢٦) قاس على
-- `ledlypcyrtnzvjvhykwz` ستّة جداول قديمة خارج القائمة —
-- `custom_foods` · `food_logs` · `progress_photos` · `weight_logs` ·
-- `workout_logs` · `workout_sets` — كلٌّ منها يمنح `anon` و`authenticated`
-- ‏`SELECT,INSERT,UPDATE,DELETE,REFERENCES,TRIGGER,TRUNCATE`. فكان التأكيدان
-- يسقطان والهجرةُ تُجهَض. وstaging لم يكشفها لأنه بُني نظيفًا من مجلّد الهجرات
-- وحده — **عطلٌ يعيش في الفرق بين البيئتين**، وهو ما وُجد الـpreflight له.
--
-- ═══ الثابت المطلوب — يُنفَّذ لا يُدَّعى ═══
--   ① `anon` لا يملك **شيئًا** على أي جدول في `public`. بلا استثناء.
--   ② `authenticated` لا يملك إلا ما تمنحه القائمة المسمّاة أدناه صراحةً.
--   ③ **الجدول المجهول يسقط إلى الصفر** — لا إلى ما ورثه من المنصّة. فالافتراض
--      «مغلق» لا «مفتوح»، والقائمة تمنح ولا تحرس.
--   ④ `service_role` (مفتاح الخادم) **لا يُمسّ**: السحب يسمّي دورَي العميل
--      وحدهما، فالإدارة والهجرات تبقى عاملة.
--
-- ولماذا لا استثناء للجداول الستّة: لا صفّ فيها (٠ مقيسًا)، ولا مستهلك لها في
-- الكود (أثرها الوحيد تعليق TODO وسطر وثيقة)، فلا سلطة عميل تُبرَّر لها. وأي
-- استثناء هنا كان سيُبقي `TRUNCATE` لـ`anon` على ستّة جداول **ليخضرّ فحص** —
-- وهو عين ما تمنعه هذه الهجرة. تُترك بيانات الجداول وبنيتها وRLS كما هي؛
-- **المسحوب صلاحيةُ العميل وحدها** (قرار المؤسس: لا حذف في هذا الإصدار).
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  -- ① المزامنة: CRUD كامل، وRLS تحصره في صفوف المالك.
  sync_tables text[] := array[
    'profiles', 'workout_sessions', 'exercise_history', 'measurement_logs',
    'daily_logs', 'nutrition_logs', 'water_logs', 'supplement_logs',
    'medication_logs', 'step_logs', 'achievements', 'custom_plans', 'todos',
    'nutrition_ledger', 'recovery_logs', 'workout_schedule', 'plan_templates'
  ];
  -- ② الوصول المقروء: SELECT فقط.
  read_only_tables text[] := array['entitlements', 'access_code_redemptions'];
  -- ③ غير مرئية لأي عميل — تُذكر توثيقًا، وحجبها من السحب الشامل لا منها.
  invisible_tables text[] := array[
    'access_codes', 'trial_ledger', 'purchase_ledger', 'code_redemption_ledger'
  ];
begin
  -- ═══ عقد الوجود: قائمةٌ تسمّي جدولًا غائبًا خطأُ عقدٍ لا حالةَ قاعدة ═══
  foreach t in array sync_tables || read_only_tables || invisible_tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      raise exception 'hardening: expected table public.% is missing', t;
    end if;
  end loop;

  -- ═══ ① السحب **الشامل**: كل جدول أساسي في `public`، معروفًا كان أو مجهولًا ═══
  -- هنا صار الفعل بحجم التأكيد. الجدول الذي لم يخطر ببال أحد يفقد كل صلاحية
  -- عميل — فلا يبقى مكشوفًا ولا يُسقِط الهجرة.
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by c.relname
  loop
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;

  -- ═══ ② ثم يُعاد المطلوب وحده — والقائمة تمنح فقط، ولا تحرس ═══
  foreach t in array sync_tables loop
    -- لا TRUNCATE ولا REFERENCES ولا TRIGGER — CRUD صرفًا، وRLS تحصره بالصفّ.
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
  end loop;

  foreach t in array read_only_tables loop
    execute format('grant select on public.%I to authenticated;', t);
  end loop;

  -- ③ لا سطر لـ`invisible_tables`: صفرُها ناتجُ السحب الشامل لا منحةٌ مضادّة.
  --    و`anon` لا يُمنح في أي فرع أعلاه — إطلاقًا.
end;
$$;

-- ── الحارس: كل جدول قادم يجب أن يُصنَّف، لا أن يُمنح بالوراثة ───────────────
-- الامتيازات الافتراضية للمخطّط هي منبع الثغرة: كل جدول جديد كان يُمنح كاملًا
-- لأدوار العميل تلقائيًا. تُلغى هنا، فيصير المنح قرارًا صريحًا لا وراثة صامتة.
-- (لا أثر رجعيًا على الجداول القائمة — لذلك سُحبت أعلاه واحدًا واحدًا.)
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ونفس الوراثة قائمة على **الدوال**: كل دالة جديدة في `public` كانت تُمنح
-- EXECUTE لـanon و authenticated تلقائيًا. أُثبت بالتنفيذ: دالة أُنشئت بعد
-- تحصين الجداول جاءت مفتوحة للدورين. الخطر ليس نظريًا — دالة `security definer`
-- إدارية تُضاف يومًا بلا `revoke` صريح تصير قابلة للنداء من زائر غير مسجَّل،
-- وهي بعينها آلية التصعيد التي يغلقها هذا الملف على مستوى الجداول.
-- بعد هذا السطر يصير كشف أي دالة قرارًا صريحًا (fail-closed): الدوال الأربع
-- المخصّصة للعميل مُنِحت صراحةً في 20260806120002، وما عداها مغلق.
-- (لا أثر رجعيًا: الدوال القائمة تحتفظ بمنحها المادّي.)
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- ── تحقّق ذاتي: الهجرة تفشل صاخبةً إن بقي أثر للثغرة ───────────────────────
-- لا تكتفي بالتنفيذ بل تتحقّق من أثرها. بقاء صلاحية محظورة واحدة يوقف الهجرة
-- بدل أن يمرّ التحصين ناقصًا ويُظنّ تامًّا.
-- الفحص بقائمة **مسموح** لا بقائمة ممنوع: أي صلاحية خارج CRUD توقف الهجرة.
-- قائمة الممنوع تحرس ما عدّدتَه فقط — وهي بعينها العادة التي أنتجت الثغرة.
-- والمقلوبة تلتقط أيضًا ما لم يُخترَع بعد (مثل MAINTAIN في إصدارات أحدث).
do $$
declare leftover text;
begin
  select string_agg(format('%s.%s=%s', table_name, grantee, privilege_type), ', ')
    into leftover
    from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee in ('anon', 'authenticated')
     and privilege_type not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if leftover is not null then
    raise exception 'hardening incomplete — client roles still hold: %', leftover;
  end if;

  -- وanon لا يملك شيئًا إطلاقًا، ولو من فئة CRUD.
  select string_agg(format('%s=%s', table_name, privilege_type), ', ')
    into leftover
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon';
  if leftover is not null then
    raise exception 'hardening incomplete — anon still holds: %', leftover;
  end if;

  -- ═══ [PROD-DRIFT] الثابت موجبًا: كل جدول **خارج** القائمة يساوي صفرًا ═══
  -- التأكيدان أعلاه ينفيان (لا صلاحية محظورة · لا anon). وهذا يُثبت الوجه
  -- الموجب: أن الجدول الذي لا تعرفه القائمة **سقط إلى الصفر فعلًا** ولم يبقَ
  -- على وراثته. بدونه يمرّ CRUD موروثٌ لـ`authenticated` على جدولٍ مجهول
  -- صامتًا — فهو ينفي نجاحًا غير مستحقّ لا يلتقطه النفيان (§4.2).
  select string_agg(format('%s=%s', table_name, privilege_type), ', ')
    into leftover
    from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee = 'authenticated'
     and table_name not in (
       'profiles', 'workout_sessions', 'exercise_history', 'measurement_logs',
       'daily_logs', 'nutrition_logs', 'water_logs', 'supplement_logs',
       'medication_logs', 'step_logs', 'achievements', 'custom_plans', 'todos',
       'nutrition_ledger', 'recovery_logs', 'workout_schedule', 'plan_templates',
       'entitlements', 'access_code_redemptions'
     );
  if leftover is not null then
    raise exception 'hardening incomplete — unlisted table still grants authenticated: %', leftover;
  end if;
end;
$$;
