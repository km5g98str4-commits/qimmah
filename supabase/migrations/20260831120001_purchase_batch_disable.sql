-- ═══════════════════════════════════════════════════════════════════════════
-- [WAVE3-SALLA-PREP] إطفاء دفعة صكوك الشراء — وسدّ فجوة تدقيق الإطفاء المفرد
--
-- ═══ لماذا هذه الهجرة شرطٌ قبل رفع أي دفعة حقيقية إلى سلة ═══
-- ملفّ التصدير هو النصوص الخام كلّها في ملفّ واحد. تسرُّبه (مشاركة خاطئة،
-- جهاز مخترق، بريد غالط) يعني ٥٠٠ صكّ مكشوف — والاستجابة الوحيدة اليوم إطفاءٌ
-- صكًّا صكًّا: خمسمئة عملية يدوية في منتصف حادثة. هذه الهجرة تجعل الاستجابة
-- نداءً واحدًا ذرّيًّا.
--
-- ═══ الثوابت الحاكمة (نصّ اعتماد المؤسس — Wave 3 Part A/C) ═══
--   ١) يطال **غير المستردّ فقط** — بنفس مسند «غير مستردّ» في
--      `founder_purchase_batches` حرفيًّا، فالزرّ والعدّاد لا يفترقان أبدًا.
--   ٢) Premium الممنوح لمشترٍ شرعي **لا يُمسّ**: `private.derive_state` تقرأ
--      صفّ المنحة وحده ولا تعود إلى `access_codes` إطلاقًا — فالإطفاء بنيويًّا
--      عاجز عن سحب منحة. (ولسحب حسابٍ بعينه: `founder_revoke_access` القائمة.)
--   ٣) للمؤسس وحده (`require_founder`)، والدعم قارئ لا كاتب.
--   ٤) **اتجاه واحد**: لا `p_enabled`، ولا دالّة تمكين دفعيّ — تمكينُ دفعةٍ
--      مخترقة من متصفّحٍ هو بذاته أداة منحٍ جماعي، فيبقى خارج المتصفّح عمدًا
--      كما بقي `admin_grant_premium` (قرار 20260822120002 نفسه).
--
-- ═══ ولماذا لا يشمل «المنتهي غير المستردّ» ═══
-- مسند العدّاد يفصل الأقسام فصلًا تامًّا، والمنتهي قسمٌ ثالث يرفضه
-- `redeem_core` بفحص `expires_at` بنيويًّا — إطفاؤه لا يضيف أمانًا، وضمُّه
-- كان سيجعل `disabled_count` أكبر من رقم «غير مستردّ» الذي يراه المؤسس لحظة
-- الضغط، فيُقرأ الفارق عطلًا.
--
-- ═══ التزامن — لماذا يكفي READ COMMITTED ═══
-- `redeem_core` يقفل صفّ الصكّ بـ`for update`، وUPDATE الدفعة يقفل كل صفّ
-- يمسّه. أيّهما سبق حَجَب الآخر، وعند فكّ الحجب يُعاد تقييم المسند على الصفّ
-- الطازج (EvalPlanQual):
--   • الاسترداد سبق ⇒ العدّاد ارتفع ⇒ مسند الدفعة يُسقط الصفّ ⇒ المنحة تبقى.
--   • الإطفاء سبق ⇒ الاسترداد يقرأ `enabled=false` ⇒ `invalid_code` ولا منحة.
-- لا حالة هجينة في الاتجاهين — ويقيسها `attack-purchase-race` على عنقود حقيقي.
--
-- ═══ فجوة التدقيق المسدودة (Part B) ═══
-- `founder_set_code_enabled` كانت **تشترط** `p_reason` ثم **ترميه**: تكتب
-- `enabled/updated_by/updated_at` فقط، وسطر `created_reason = c.created_reason`
-- إسنادٌ ذاتيّ بلا أثر. فمؤسسٌ يطفئ صكًّا في حادثة لا يستطيع غدًا أن يجيب
-- «لماذا؟». تُسدّ بثلاثة أعمدة على الصفّ نفسه — وهو نمط التدقيق القائم في هذا
-- المخطط (`entitlements.revoked_reason` · `revocation_ledger`)، لا نظام تدقيق
-- عامّ لا يحتاجه سطحٌ بهذا الحجم.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ① أعمدة التدقيق — مَن ومتى ولماذا، على الصفّ المُطفأ نفسه ──────────────
alter table public.access_codes add column if not exists disabled_reason text;
alter table public.access_codes add column if not exists disabled_at timestamptz;
alter table public.access_codes add column if not exists disabled_by text;

comment on column public.access_codes.disabled_reason is
  'سبب آخر إطفاء — يُكتب مع كل إطفاء (مفرد أو دفعيّ) ويُمحى عند إعادة التمكين المفرد كي لا يبقى سببٌ بائت على صفّ حيّ.';
comment on column public.access_codes.disabled_at is 'لحظة آخر إطفاء بساعة القاعدة.';
comment on column public.access_codes.disabled_by is 'فاعل آخر إطفاء بصيغة founder:<uuid> — من require_founder لا من مدخل عميل.';

-- ── ② سدّ الفجوة الحيّة: الإطفاء المفرد يحفظ سببه ─────────────────────────
-- الشكل الراجع يبقى متوافقًا ({id, enabled})؛ الإضافة إضافة لا استبدال.
create or replace function public.founder_set_code_enabled(
  p_code_id uuid, p_enabled boolean, p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor text;
  row_after record;
begin
  perform private.require_founder();

  if p_code_id is null then
    raise exception 'founder_set_code_enabled: code id required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_set_code_enabled: reason required' using errcode = '22023';
  end if;

  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  update public.access_codes c
     set enabled = coalesce(p_enabled, false),
         updated_by = actor,
         updated_at = now(),
         -- الإطفاء يُدوَّن؛ وإعادة التمكين تمحو أثر إطفاءٍ لم يعد قائمًا —
         -- سببٌ بائت على صفّ حيّ يُقرأ حالةً وهو تاريخ.
         disabled_reason = case when coalesce(p_enabled, false) then null else btrim(p_reason) end,
         disabled_at     = case when coalesce(p_enabled, false) then null else now() end,
         disabled_by     = case when coalesce(p_enabled, false) then null else actor end
   where c.id = p_code_id
  returning c.id, c.enabled into row_after;

  if not found then
    raise exception 'founder_set_code_enabled: no such code' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', row_after.id, 'enabled', row_after.enabled);
end;
$$;

-- ── ③ إطفاء الدفعة — اتجاه واحد، غير المستردّ فقط، عدّ صادق ────────────────
create or replace function public.founder_disable_purchase_batch(
  p_label text, p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor text;
  n int;
  batch_exists boolean;
begin
  perform private.require_founder();

  if coalesce(btrim(p_label), '') = '' then
    raise exception 'founder_disable_purchase_batch: label required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_disable_purchase_batch: reason required' using errcode = '22023';
  end if;

  -- وسمٌ لا دفعة له خطأ مسمّى لا «صفر» — الصفر جوابُ دفعةٍ استُهلكت، لا جوابُ
  -- خطأ إملائي في منتصف حادثة.
  select exists (
    select 1 from public.access_codes
     where grant_purpose = 'purchase' and label = btrim(p_label)
  ) into batch_exists;
  if not batch_exists then
    raise exception 'founder_disable_purchase_batch: no such batch' using errcode = 'P0002';
  end if;

  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  -- المسند = «غير مستردّ» في `founder_purchase_batches` **حرفيًّا**:
  --   redemption_count < max_redemptions AND enabled AND (لا انتهاء أو لم يحن)
  -- فالرقم الراجع هو نفسه الرقم الذي كان معروضًا في عمود «غير مستردّ».
  update public.access_codes c
     set enabled = false,
         updated_by = actor,
         updated_at = now(),
         disabled_reason = btrim(p_reason),
         disabled_at = now(),
         disabled_by = actor
   where c.grant_purpose = 'purchase'
     and c.label = btrim(p_label)
     and c.redemption_count < c.max_redemptions
     and c.enabled
     and (c.expires_at is null or c.expires_at > now());
  get diagnostics n = row_count;

  return jsonb_build_object('label', btrim(p_label), 'disabled_count', n, 'disabled_at', now());
end;
$$;

comment on function public.founder_disable_purchase_batch(text, text) is
  'مِفتاح إطفاء الدفعة — اتجاه واحد (يسحب ولا يمنح)، غير المستردّ فقط، وPremium الممنوح لا يُمسّ بنيويًّا. لا نظير تمكينٍ دفعيّ عمدًا.';

revoke all on function public.founder_disable_purchase_batch(text, text) from public, anon;
grant execute on function public.founder_disable_purchase_batch(text, text) to authenticated;

-- ── ④ تحقّق ذاتيّ — الهجرة تفشل إن رخُصت سدودها ────────────────────────────
do $$
declare
  src text;
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'access_codes'
                    and column_name = 'disabled_reason') then
    raise exception 'wave3 incomplete: disabled_reason column missing';
  end if;

  src := (select prosrc from pg_proc where oid = 'public.founder_set_code_enabled(uuid,boolean,text)'::regprocedure);
  if src not like '%disabled_reason%' then
    raise exception 'wave3 incomplete: single-code disable still discards its reason';
  end if;

  -- ⚠️ لا فحص `prosrc LIKE '%require_founder%'` هنا **عمدًا**: بيئة التأكيد
  -- المضادّ في `test:admin-db` تنزع سطور البوّابة من كل الهجرات لتثبت أن
  -- المنع كان منها — وفحصٌ نصّي هنا يُفجّر تلك البيئة المقصودة. البوّابة
  -- مُثبتة **سلوكيًّا** في ثلاثة أطقم: `purchase-credential` ⑩ (الدعم يُردّ
  -- باسمه) · `admin-db` (كل فعل require_founder + محاكاة عبث) · `admin-codes`.
  src := (select prosrc from pg_proc where oid = 'public.founder_disable_purchase_batch(text,text)'::regprocedure);
  if src not like '%redemption_count < c.max_redemptions%' then
    raise exception 'wave3 incomplete: batch disable predicate does not exclude redeemed rows';
  end if;
  if src like '%enabled = true%' then
    raise exception 'wave3 incomplete: batch function must never enable';
  end if;

  -- ⚔️ الاتجاه الواحد بنيويًّا: لا دالّة عامّة تحمل «تمكين دفعة» بأي اسم.
  if exists (
    select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.proname ~ '(enable|activate).*(batch|bulk)|(batch|bulk).*(enable|activate)'
  ) then
    raise exception 'wave3 violation: a public mass-enable primitive exists';
  end if;
end $$;
