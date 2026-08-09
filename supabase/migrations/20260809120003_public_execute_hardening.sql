-- ============================================================================
-- 20260809120003 — إغلاق EXECUTE عبر PUBLIC: الموجود يُكنَس والقادم لا يرث
-- ============================================================================
-- تكملة 20260806120003 التي قطعت وراثة أدوار العميل (anon/authenticated) عن
-- الجداول والدوال — لكنها لم تمسّ **PUBLIC**، وهو دور آخر مختلف:
--
--   Postgres يمنح كل دالة جديدة `EXECUTE` لـPUBLIC **بافتراض مدمج في النواة**،
--   لا عبر default privileges قابلة للفحص. وPUBLIC يشمل كل الأدوار — بما فيها
--   anon وauthenticated وكل دور يُخترع لاحقًا. فـ`revoke from anon, authenticated`
--   وحده لا يغلق شيئًا ما دام PUBLIC مفتوحًا، ودالة SECURITY DEFINER إدارية
--   تُضاف يومًا بلا revoke صريح تولد قابلة للنداء من **أي** دور.
--
-- دوال الوصول القائمة سليمة أصلًا (كل revoke فيها يسمّي public صراحةً — أُثبت
-- جردًا قبل هذه الهجرة، فلا يُعاد كتابتها §2). المكشوف المتبقّي كان:
--   • دوال الـtrigger (set_updated_at · set_updated_at_lww · handle_new_user ·
--     entitlements_touch_updated_at) — غير قابلة للنداء المباشر أصلًا
--     («trigger functions can only be called as triggers»)، لكن أقلّ امتياز
--     لا يتّكل على هذا القيد وحده.
--   • **الافتراضي المدمج نفسه** — الثغرة الحقيقية: كل دالة قادمة ترث PUBLIC.
--
-- ملاحظة أمان على الكنس: سحب PUBLIC لا يمسّ المنح الاسمية (authenticated على
-- دوال الخدمة الذاتية، service_role على الإدارة) — تلك صفوف ACL مستقلّة.
-- وإطلاق الـtriggers لا يتأثر: صلاحية EXECUTE تُفحص عند create trigger لا عند
-- كل تنفيذ DML — ويثبتها سلوكيًا مرور فحوص اللمس والمزامنة في test:privileges.
--
-- forward-only و idempotent بالكامل.
-- ============================================================================

-- ── ١) القادم لا يرث: قطع الافتراضي المدمج ─────────────────────────────────
-- **الصيغة العامة بلا `in schema` مقصودة ومُلزِمة**: افتراضيات المخطّط تُضاف
-- فوق العامة ولا تنقص منها، فصيغة `in schema ... revoke` لا تنزع الافتراضي
-- المدمج شيئًا — أُثبت بالتنفيذ: الدالة التجريبية بقيت مكشوفة لـPUBLIC تحتها.
-- العامة وحدها تنزعه، وتسري على كل دالة يُنشئها دور الهجرات في أي مخطّط.
alter default privileges revoke all on functions from public;

-- ── ٢) كنس الموجود: كل دالة في public/private تفقد منحة PUBLIC ─────────────
-- ديناميكي كدالة الحذف (20260713120007): ما يوجد اليوم أو أضيف قبل إعادة
-- التشغيل يُكنَس كله — لا قائمة أسماء تشيخ.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
  loop
    execute format('revoke all on function %s from public;', r.sig);
  end loop;
end;
$$;

-- ── ٣) تحقّق ذاتي: الهجرة تفشل صاخبةً إن بقي منفذ ──────────────────────────
-- proacl الفارغ يعني «الافتراضي المدمج» أي PUBLIC EXECUTE — لذلك يُفكّ
-- بـacldefault لا يُعامَل نظيفًا. وبقاء منحة واحدة يوقف الهجرة باسم الدالة.
do $$
declare leftover text;
begin
  select string_agg(fn, ', ') into leftover from (
    select n.nspname||'.'||p.proname as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace,
    lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where n.nspname in ('public', 'private')
      and a.grantee = 0  -- grantee 0 = PUBLIC
      and a.privilege_type = 'EXECUTE'
  ) x;
  if leftover is not null then
    raise exception 'public-execute hardening incomplete — PUBLIC can still execute: %', leftover;
  end if;
end;
$$;
