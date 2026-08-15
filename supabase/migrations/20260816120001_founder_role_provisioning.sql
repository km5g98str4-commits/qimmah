-- ============================================================================
-- 20260816120001 — [OVERNIGHT-ADMIN] تزويد دور المؤسس (`qimmah_role`)
-- ============================================================================
-- الحلقة المفقودة بين حارس الواجهة (`src/admin/auth/adminRole.ts`) والخادم:
-- الحارس يقرأ `app_metadata.qimmah_role` ويرفض كل ما عداه، **ولا شيء في
-- المستودع كان يُصدر هذا الادّعاء**. فكل مستخدم — بما فيهم المؤسس — كان يُمنع.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- أربعة مبادئ يفرضها هذا الملف بنيويًا:
--
--  ① **الدور يُكتب في `raw_app_meta_data` وحده.**
--     `raw_user_meta_data` يكتبه صاحب الحساب بنفسه عبر `auth.updateUser` — وهو
--     المسار الذي يخزّن فيه `authContext.tsx` اسم العرض. فكتابة الدور هناك
--     تعني حرفيًا أن **كل مستخدم يرقّي نفسه**. هذا الملف لا يلمس ذلك الحقل
--     إطلاقًا، ودالة القراءة أدناه لا تنظر إليه ولو حمل القيمة الصحيحة.
--
--  ② **المنح فعل `service_role` حصرًا.**
--     لا `anon` ولا `authenticated` ولا `public` تملك EXECUTE على دوال المنح.
--     ولا يوجد مسار واحد — سياسة، دالة، أو trigger — يسمح لمستخدم بأن يمنح
--     نفسه أو غيره. المنع هو الافتراض، والاستثناء الوحيد مفتاح الخادم.
--
--  ③ **القائمة البيضاء واحدة: `founder`.**
--     أي قيمة أخرى تُرفض باستثناء مسمّى، فلا تُكتب قيمة مجهولة تصير لاحقًا
--     «دورًا غير معروف» في الواجهة بلا أن يعرف أحد من كتبها.
--
--  ④ **الأثر يُكتب داخل نفس الحقل، لا في جدول جديد.**
--     `qimmah_role_set_at` و`qimmah_role_set_by` و`qimmah_role_reason` تُكتب
--     بجانب الدور. جدول تدقيق مستقلّ كان سيضيف سطح RLS جديدًا يجب حراسته،
--     مقابل معلومة تعيش أصلًا مع الصفّ الذي تصفه.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة. الـrunbook في
--    `docs/execution/qimmah-sovereign-overnight/ADMIN-DELIVERY.md`.
--
-- ملاحظة تنفيذية: كل الدوال `language plpgsql` عمدًا. جسم plpgsql يُفحَص نحويًا
-- عند الإنشاء ولا تُحلّ أسماء أعمدته، فتُنشأ الدالة على صندوق الإثبات الرملي
-- (الذي يحمل `auth.users` مصغّرًا) بلا فشل — ويبقى السلوك الحقيقي مُختبَرًا
-- بـ`test:admin-db` الذي يبني الأعمدة الناقصة قبل النداء.
-- ============================================================================

-- ── ١) قراءة الدور — من مصدر الخادم وحده ───────────────────────────────────
/**
 * دور الحساب كما يراه الخادم. `null` = لا دور.
 *
 * **لا يقرأ `raw_user_meta_data` إطلاقًا.** هذا ليس سهوًا يُصلَح لاحقًا بل هو
 * الشرط الذي يجعل الدالة ذات معنى، ويحرسه `test:admin-db` بفحص مسمّى يكتب
 * ادّعاءً مزوّرًا في `raw_user_meta_data` ويتأكّد أنه لا يمنح شيئًا.
 */
create or replace function private.account_role(p_uid uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare r text;
begin
  if p_uid is null then
    return null;
  end if;
  select u.raw_app_meta_data ->> 'qimmah_role' into r
    from auth.users u
   where u.id = p_uid;
  return r;
end;
$$;

/**
 * هل **صاحب الجلسة الحالية** مؤسس؟ الافتراض `false` في كل مسار.
 *
 * ⚠️ **`coalesce` هنا ليست تزيينًا — بدونها البوّابة تفشل مفتوحة.**
 * حسابٌ بلا ادّعاء يجعل `account_role()` تعيد `NULL`، فيصير
 * `NULL = 'founder'` قيمتُه `NULL` لا `false`. وتُعيد الدالة `NULL`، فيصير
 * `if not private.is_founder()` في الحارس `not NULL` = `NULL` — **وشرطٌ قيمته
 * `NULL` لا يُنفَّذ**، فلا يُرفع الاستثناء ويمرّ الجميع.
 * كُشف هذا بإثبات منفَّذ (`test:admin-db`) لا بمراجعة نظر، ويحرسه الآن فحص
 * مسمّى يسحب الدور ثم يتأكّد أن الباب أُغلق **في نفس اللحظة**.
 */
create or replace function private.is_founder()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    return false;
  end if;
  return coalesce(private.account_role(uid) = 'founder', false);
end;
$$;

/**
 * الحارس المشترك: يرفع استثناء مسمّى بدل أن يعيد صفوفًا فارغة.
 *
 * الفرق جوهري: دالة تعيد **صفرًا** لغير المصرَّح له تُقرأ في اللوحة رقمًا
 * («لا مستخدمين») لا منعًا. والاستثناء المسمّى يصل الواجهة حالةَ خطأ فتعرض
 * «غير متاح» — وهو الصدق المطلوب في §5 من الميثاق.
 */
create or replace function private.require_founder()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- `is not true` لا `not (...)`: حزام ثانٍ ضدّ ثلاثية القيم. حتى لو عادت
  -- الدالة يومًا بـ`NULL`، يبقى الجواب منعًا. **الافتراض منع في الطبقتين.**
  if private.is_founder() is not true then
    raise exception 'founder_role_required' using errcode = '42501';
  end if;
end;
$$;

-- ── ٢) المنح والسحب — `service_role` حصرًا ─────────────────────────────────
/**
 * يمنح دورًا لحساب بالبريد. `service_role` فقط.
 * @param p_role القيمة الوحيدة المقبولة: 'founder'.
 */
create or replace function public.admin_set_role(p_email text, p_role text, p_reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid;
  n   text := lower(btrim(coalesce(p_email, '')));
begin
  if n = '' then
    raise exception 'admin_set_role: empty identity' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'admin_set_role: reason required' using errcode = '22023';
  end if;
  -- قائمة بيضاء صارمة — لا قيمة مجهولة تُكتب فتصير لغزًا بعد شهر.
  if p_role is distinct from 'founder' then
    raise exception 'admin_set_role: unknown role %', coalesce(p_role, '<null>') using errcode = '22023';
  end if;

  select u.id into uid from auth.users u where lower(u.email) = n;
  if uid is null then
    raise exception 'admin_set_role: no such account' using errcode = 'P0002';
  end if;

  update auth.users u
     set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
           'qimmah_role',        p_role,
           'qimmah_role_set_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'qimmah_role_set_by', 'service_role',
           'qimmah_role_reason', btrim(p_reason)
         )
   where u.id = uid;

  return uid;
end;
$$;

/** يسحب الدور. وسمُ السحب يبقى، فلا يختفي أثر من كان مؤسسًا. */
create or replace function public.admin_clear_role(p_email text, p_reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid;
  n   text := lower(btrim(coalesce(p_email, '')));
begin
  if n = '' then
    raise exception 'admin_clear_role: empty identity' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'admin_clear_role: reason required' using errcode = '22023';
  end if;

  select u.id into uid from auth.users u where lower(u.email) = n;
  if uid is null then
    raise exception 'admin_clear_role: no such account' using errcode = 'P0002';
  end if;

  update auth.users u
     set raw_app_meta_data = (coalesce(u.raw_app_meta_data, '{}'::jsonb) - 'qimmah_role') || jsonb_build_object(
           'qimmah_role_cleared_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'qimmah_role_reason',     btrim(p_reason)
         )
   where u.id = uid;

  return uid;
end;
$$;

-- ── ٣) الصلاحيات — المنع أولًا ثم استثناء واحد مسمّى ───────────────────────
-- `public` يُسمّى صراحةً: الدور الذي يشمل الجميع، وسحبه من anon/authenticated
-- وحدهما يترك الباب مفتوحًا لكل دور يُخترع لاحقًا (هجرة 20260809120003).
revoke all on function private.account_role(uuid)    from public, anon, authenticated;
revoke all on function private.is_founder()          from public, anon, authenticated;
revoke all on function private.require_founder()     from public, anon, authenticated;
revoke all on function public.admin_set_role(text,text,text)   from public, anon, authenticated;
revoke all on function public.admin_clear_role(text,text)      from public, anon, authenticated;
grant execute on function public.admin_set_role(text,text,text) to service_role;
grant execute on function public.admin_clear_role(text,text)    to service_role;

comment on function public.admin_set_role(text,text,text) is
  'يمنح qimmah_role في app_metadata. service_role حصرًا — لا مسار عميل واحد يصل إليها.';
comment on function private.is_founder() is
  'دور صاحب الجلسة من app_metadata وحده. لا ينظر إلى user_metadata مهما حمل.';
