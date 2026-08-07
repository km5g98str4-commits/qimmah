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
  -- ③ غير مرئية لأي عميل.
  invisible_tables text[] := array[
    'access_codes', 'trial_ledger', 'purchase_ledger', 'code_redemption_ledger'
  ];
begin
  -- ① ────────────────────────────────────────────────────────────────────
  foreach t in array sync_tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      raise exception 'hardening: expected table public.% is missing', t;
    end if;
    execute format('revoke all on public.%I from anon, authenticated;', t);
    -- يُعاد المطلوب وحده — لا TRUNCATE ولا REFERENCES ولا TRIGGER.
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
  end loop;

  -- ② ────────────────────────────────────────────────────────────────────
  foreach t in array read_only_tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      raise exception 'hardening: expected table public.% is missing', t;
    end if;
    execute format('revoke all on public.%I from anon, authenticated;', t);
    execute format('grant select on public.%I to authenticated;', t);
  end loop;

  -- ③ ────────────────────────────────────────────────────────────────────
  foreach t in array invisible_tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      raise exception 'hardening: expected table public.% is missing', t;
    end if;
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;
end;
$$;

-- ── الحارس: كل جدول قادم يجب أن يُصنَّف، لا أن يُمنح بالوراثة ───────────────
-- الامتيازات الافتراضية للمخطّط هي منبع الثغرة: كل جدول جديد كان يُمنح كاملًا
-- لأدوار العميل تلقائيًا. تُلغى هنا، فيصير المنح قرارًا صريحًا لا وراثة صامتة.
-- (لا أثر رجعيًا على الجداول القائمة — لذلك سُحبت أعلاه واحدًا واحدًا.)
alter default privileges in schema public revoke all on tables from anon, authenticated;

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
end;
$$;
