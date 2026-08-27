-- ============================================================================
-- [STAGING-ADVISOR] مصالحة نتائج مستشار الأمان الحيّ — ثلاثة بنود لا غير
-- ============================================================================
-- المصدر: تشغيل Security Advisor على qimmah-staging بعد بلوغها ٣٩ هجرة.
-- النطاق محصور عمدًا في البنود الثلاثة المسمّاة، ولا يلمس المنح المقصودة
-- (start_trial · my_entitlement · claim_pending_grants · founder_*) بحرف —
-- «لا سحب شامل» شرطُ التكليف، والتأكيد المضادّ أدناه يحرسه (§4.2).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ① `private.gtin_check_digit_valid` — search_path متحوّل (mutable).
--
--    أحمر: الدالّة الوحيدة في المخطّط بلا `set search_path` — إذ هي immutable
--    عادية لا SECURITY DEFINER، فلم يلتقطها عرف «كل definer مثبَّت المسار».
--    وهي تُنفَّذ داخل قيد CHECK على `food_submissions.barcode`، أي **بمسار
--    بحث المستدعي** وقت الإدراج — والدوال المضمّنة فيها (btrim · substr ·
--    char_length) تُحلّ عبر مسار البحث كسائر الأسماء.
--
--    أخضر: إعادة تعريف **كاملة الجسد حرفيًّا** (عقد test:migration-order:
--    الجسد الحيّ يطابق آخر ملف يعرّفه نصًّا) والزيادة الوحيدة سطر
--    `set search_path = ''`. لا تغيّر دلاليًّا: `pg_catalog` يُبحث ضمنيًّا
--    دائمًا، فتبقى الدوال المضمّنة تُحلّ منه بعينه — والمقفول هو إمكانية
--    تقديم مخطّط دخيل عليه في مسار المستدعي.
--
-- ② + ③ `handle_new_user()` و`entitlements_touch_updated_at()` — منفَّذتان
--    لِـanon/authenticated وهما مساعدتا trigger لا غير.
--
--    أحمر: أُنشئتا (20260713120006 · 20260806120001) **قبل** قطع وراثة
--    الامتيازات الافتراضية (20260806120003)، فورثتا منحة EXECUTE الاسمية
--    لأدوار العميل من افتراضيات المنصّة وبقيت. وكنس 20260809120003 نزع
--    PUBLIC (grantee 0) وحده — لا الصفوف الاسمية. الخطر نظريّ اليوم
--    («trigger functions can only be called as triggers») لكن رأس
--    20260809120003 نفسه يقرّر: أقلّ امتياز لا يتّكل على هذا القيد وحده —
--    وكلتاهما SECURITY DEFINER، وهو بالضبط صنف الدوال الذي يستحق الحسم.
--
--    أخضر: سحب EXECUTE الاسمي من أدوار العميل. إطلاق الـtriggers **لا يتأثر**:
--    صلاحية EXECUTE تُفحص عند `create trigger` بهوية مالك الجدول لا عند كل
--    DML بهوية المستخدم — المبدأ مقرَّر ومُثبَت سلوكيًّا في 20260809120003
--    (فحوص اللمس والمزامنة في test:privileges).
--
-- idempotent · forward-only · لا هجرة تُعاد كتابتها (§2 و§4.1).
-- ============================================================================

-- ── ① تثبيت مسار البحث — الجسد منقول حرفيًّا من 20260824120003 ──────────────
create or replace function private.gtin_check_digit_valid(p_code text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  s   text := btrim(coalesce(p_code, ''));
  n   int;
  i   int;
  d   int;
  mult int;
  total int := 0;
begin
  if s !~ '^[0-9]+$' then return false; end if;
  n := char_length(s);
  if n not in (8, 12, 13, 14) then return false; end if;
  -- من اليمين: الخانة الأخيرة هي خانة التحقّق، وما قبلها يتناوب ٣ ثم ١.
  for i in 1 .. n - 1 loop
    d := substr(s, n - i, 1)::int;
    mult := case when i % 2 = 1 then 3 else 1 end;
    total := total + d * mult;
  end loop;
  return ((10 - (total % 10)) % 10) = substr(s, n, 1)::int;
end;
$$;

comment on function private.gtin_check_digit_valid(text) is
  'تحقّق GTIN-8/12/13/14 بخانة mod-10. سلطة خادم — لا تثق بتحقّق المتصفّح. [ADVISOR: search_path مثبَّت].';

-- ── ② + ③ مساعدتا الـtrigger تفقدان منحة أدوار العميل ───────────────────────
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.entitlements_touch_updated_at() from public, anon, authenticated;

-- ── تحقّق ذاتي (§4.2): الإصلاح وقع، والمقصود لم يُمسّ ───────────────────────
do $$
begin
  -- (أ) مسار البحث صار مثبَّتًا فعلًا — لا اكتفاءً بأن البيان مرّ.
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname = 'gtin_check_digit_valid'
       and p.proconfig is not null
       and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
  ) then
    raise exception 'advisor-fix incomplete: gtin_check_digit_valid search_path still mutable';
  end if;

  -- (ب) مساعدتا الـtrigger لم تعودا قابلتين للنداء من أدوار العميل.
  if has_function_privilege('anon', 'public.handle_new_user()', 'execute')
     or has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
     or has_function_privilege('anon', 'public.entitlements_touch_updated_at()', 'execute')
     or has_function_privilege('authenticated', 'public.entitlements_touch_updated_at()', 'execute') then
    raise exception 'advisor-fix incomplete: trigger helpers still executable by client roles';
  end if;

  -- (جـ) **التأكيد المضادّ — لم يصر السحبُ قاعدة**: المنح المقصودة حيّة.
  --      سقوط أيٍّ منها يعني أن الهجرة تجاوزت تكليفها، فتفشل صاخبةً.
  --      **فحص الوجود أولًا**: بيئات الإثبات المضادّ تبني تاريخًا مبتورًا بلا
  --      بعض هذه الدوالّ، فالتأكيد يقيس ما هو موجود ولا ينهار على دالّةٍ غائبة
  --      (has_function_privilege يرمي على توقيعٍ لا وجود له).
  if (to_regprocedure('public.start_trial()') is not null
        and not has_function_privilege('authenticated', 'public.start_trial()', 'execute'))
     or (to_regprocedure('public.my_entitlement()') is not null
        and not has_function_privilege('authenticated', 'public.my_entitlement()', 'execute'))
     or (to_regprocedure('public.claim_pending_grants()') is not null
        and not has_function_privilege('authenticated', 'public.claim_pending_grants()', 'execute'))
     or (to_regprocedure('public.redeem_access_code_v2(text)') is not null
        and not has_function_privilege('authenticated', 'public.redeem_access_code_v2(text)', 'execute'))
     or (to_regprocedure('public.founder_executive_snapshot()') is not null
        and not has_function_privilege('authenticated', 'public.founder_executive_snapshot()', 'execute')) then
    raise exception 'advisor-fix overreach: an intentional authenticated grant was lost';
  end if;
end;
$$;
