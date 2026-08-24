-- ============================================================================
-- [COMMISSIONING §7] الطعام الناقص — حلقة تغذية راجعة لا جدول بيانات يدوي
-- ============================================================================
-- المطلوب: «المستخدم لا يجد منتجًا ⇒ يرسله ⇒ طابور مراجعة ⇒ المؤسس يعتمد ⇒
-- يصير قابلًا للبحث». واليوم لا يوجد **أي** مسار خادمي لهذا: لوحة المراجعة
-- في التطبيق محصورة بـ`import.meta.env.DEV`، وما يُرسله المستخدم لا يغادر جهازه.
--
-- ═══ ثلاثة مبادئ تحكم التصميم ═══
--
-- ① **البلاغ دليلٌ لا حقيقة.** ما يكتبه المستخدم من سعرات لا يدخل الكتالوج
--    بالاعتماد وحده. الحقل اسمه `evidence_*` بقصد، والاعتماد يسجّل **قرارًا**
--    ويشير إلى الصنف المنشور — ولا ينسخ أرقام المستخدم إلى مصدر الحقيقة.
--    (§5: لا بيانات وهمية في مسار إنتاجي · والتكليف: «لا تختلق قيمًا غذائية».)
--
-- ② **الباركود التجاري ليس معرّفًا داخليًّا.** التكليف صريح: لا يُخترع GTIN
--    لمنتج حقيقي. فالعمود يقبل `null` بحرّية، وإن وُجد **يُتحقّق من خانته**
--    في القاعدة — لا بثقة في العميل. ومعرّفات قِمّة الداخلية لا تدخل هنا أصلًا.
--
-- ③ **البلاغ لا يُحرَّر بعد إرساله.** لا `update` للمستخدم: سجلٌّ يُعاد كتابته
--    بعد المراجعة يفقد معناه كدليل. التصحيح يكون ببلاغ جديد.
-- ============================================================================

-- ── ١) خانة تحقّق GTIN في الخادم ────────────────────────────────────────────
/**
 * mod-10 كما في GS1. **ولماذا نسخة ثانية بجانب `validateBarcode.ts`؟**
 * لأن هذه الطبقة لا تثق بالعميل: الإدراج يمرّ بـRLS ويمكن أن يأتي من أي
 * عميل. فالتحقّق هنا سلطةُ خادم لا تكرار سياسة.
 *
 * وحتّى لا تتباعد النسختان صامتتين، يقارنهما `test:food-submissions` على
 * متّجه اختبار **واحد مشترك**، فأي انحراف يسقط بفحص مسمّى (§4.2).
 */
create or replace function private.gtin_check_digit_valid(p_code text)
returns boolean
language plpgsql
immutable
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
  'تحقّق GTIN-8/12/13/14 بخانة mod-10. سلطة خادم — لا تثق بتحقّق المتصفّح.';

-- ── ٢) الطابور ─────────────────────────────────────────────────────────────
create table if not exists public.food_submissions (
  id                  uuid primary key default gen_random_uuid(),
  submitted_by        uuid not null references auth.users (id) on delete cascade,
  submitted_at        timestamptz not null default now(),

  product_name        text not null check (btrim(product_name) <> '' and char_length(product_name) <= 160),
  brand               text check (brand is null or char_length(brand) <= 120),
  -- باركود **حقيقي أو لا شيء**. لا معرّف داخلي هنا إطلاقًا.
  barcode             text check (barcode is null or private.gtin_check_digit_valid(barcode)),
  serving_desc        text check (serving_desc is null or char_length(serving_desc) <= 120),

  -- دليل المستخدم — لا حقيقة الكتالوج. الأسماء تقول ذلك صراحةً.
  evidence_kcal       numeric(8,2) check (evidence_kcal is null or (evidence_kcal >= 0 and evidence_kcal <= 10000)),
  evidence_protein_g  numeric(7,2) check (evidence_protein_g is null or (evidence_protein_g >= 0 and evidence_protein_g <= 1000)),
  evidence_carbs_g    numeric(7,2) check (evidence_carbs_g is null or (evidence_carbs_g >= 0 and evidence_carbs_g <= 1000)),
  evidence_fat_g      numeric(7,2) check (evidence_fat_g is null or (evidence_fat_g >= 0 and evidence_fat_g <= 1000)),
  evidence_note       text check (evidence_note is null or char_length(evidence_note) <= 500),
  lang                text not null default 'ar' check (lang in ('ar', 'en')),

  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected', 'needs_info')),
  reviewed_by         uuid references auth.users (id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text check (review_note is null or char_length(review_note) <= 500),
  -- الصنف المنشور الذي أغلق هذا البلاغ. **مرجع لا نسخ**: لا تُنقل أرقام
  -- المستخدم إلى الكتالوج، بل يُشار إلى ما نشرناه نحن بعد التحقّق.
  published_food_id   text check (published_food_id is null or char_length(published_food_id) <= 120),

  -- الاعتماد قرارٌ يستحق أثرًا: لا حالة نهائية بلا مراجِع ووقت.
  constraint food_submissions_reviewed_together
    check ((status = 'pending') = (reviewed_at is null)),
  constraint food_submissions_reviewer_present
    check (reviewed_at is null or reviewed_by is not null)
);

create index if not exists food_submissions_status_idx
  on public.food_submissions (status, submitted_at desc);
create index if not exists food_submissions_owner_idx
  on public.food_submissions (submitted_by, submitted_at desc);
create unique index if not exists food_submissions_open_barcode_idx
  on public.food_submissions (barcode) where barcode is not null and status = 'pending';

alter table public.food_submissions enable row level security;

-- صاحب البلاغ يقرأ بلاغه ويُنشئه. **ولا `update` ولا `delete`**: الدليل لا يُحرَّر.
drop policy if exists food_submissions_insert_own on public.food_submissions;
create policy food_submissions_insert_own on public.food_submissions
  for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'pending' and reviewed_at is null);

drop policy if exists food_submissions_select_own on public.food_submissions;
create policy food_submissions_select_own on public.food_submissions
  for select to authenticated
  using (submitted_by = auth.uid());

revoke update, delete on public.food_submissions from anon, authenticated;
revoke all on public.food_submissions from anon;

comment on table public.food_submissions is
  'بلاغات الطعام الناقص. حقول evidence_* دليلُ مستخدم لا حقيقة كتالوج.';

-- ── ٣) الإرسال — بحدٍّ يوميّ يعمل فعلًا ─────────────────────────────────────
/**
 * الحدّ هنا **يعمل بلا حيلة**: البلاغ الناجح يُثبَّت، فعدّ النجاحات هو
 * بالضبط ما نريد تحديده. (بخلاف استهلاك الأكواد حيث الفشل هو ما يُعدّ،
 * وقد لزمته بنية أخرى — انظر `20260824120001`.)
 */
create or replace function public.submit_missing_food(
  p_product_name text,
  p_brand        text default null,
  p_barcode      text default null,
  p_serving_desc text default null,
  p_kcal         numeric default null,
  p_protein_g    numeric default null,
  p_carbs_g      numeric default null,
  p_fat_g        numeric default null,
  p_note         text default null,
  p_lang         text default 'ar'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today_count int;
  bc  text := nullif(btrim(coalesce(p_barcode, '')), '');
  new_id uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;

  if coalesce(btrim(p_product_name), '') = '' then
    return jsonb_build_object('outcome', 'invalid', 'reason', 'name_required');
  end if;

  -- باركود مكتوب لكنه غير صالح: يُقال صراحةً، ولا يُبتلع ولا يُخزَّن مشوَّهًا.
  if bc is not null and not private.gtin_check_digit_valid(bc) then
    return jsonb_build_object('outcome', 'invalid', 'reason', 'barcode_checksum');
  end if;

  select count(*) into today_count
    from public.food_submissions f
   where f.submitted_by = uid and f.submitted_at > now() - interval '24 hours';
  if today_count >= 20 then
    return jsonb_build_object('outcome', 'rate_limited', 'reason', 'daily_limit');
  end if;

  -- بلاغٌ مفتوح بنفس الباركود: ليس خطأ المستخدم، ولا يستحقّ صفًّا ثانيًا.
  if bc is not null and exists (
      select 1 from public.food_submissions f
       where f.barcode = bc and f.status = 'pending') then
    return jsonb_build_object('outcome', 'already_queued', 'reason', 'barcode_pending');
  end if;

  insert into public.food_submissions (
    submitted_by, product_name, brand, barcode, serving_desc,
    evidence_kcal, evidence_protein_g, evidence_carbs_g, evidence_fat_g,
    evidence_note, lang)
  values (uid, btrim(p_product_name), nullif(btrim(coalesce(p_brand, '')), ''), bc,
          nullif(btrim(coalesce(p_serving_desc, '')), ''),
          p_kcal, p_protein_g, p_carbs_g, p_fat_g,
          nullif(btrim(coalesce(p_note, '')), ''), coalesce(p_lang, 'ar'))
  returning id into new_id;

  return jsonb_build_object('outcome', 'queued', 'id', new_id);
end;
$$;

revoke all on function public.submit_missing_food(text, text, text, text, numeric, numeric, numeric, numeric, text, text) from public, anon;
grant execute on function public.submit_missing_food(text, text, text, text, numeric, numeric, numeric, numeric, text, text) to authenticated;

-- ── ٤) الطابور كما يراه المؤسس ─────────────────────────────────────────────
create or replace function public.founder_food_submissions(p_status text default 'pending', p_limit int default 50)
returns table (
  id                 uuid,
  submitted_at       timestamptz,
  submitter_ref      text,
  product_name       text,
  brand              text,
  barcode            text,
  serving_desc       text,
  evidence_kcal      numeric,
  evidence_protein_g numeric,
  evidence_carbs_g   numeric,
  evidence_fat_g     numeric,
  evidence_note      text,
  status             text,
  reviewed_at        timestamptz,
  reviewer_ref       text,
  review_note        text,
  published_food_id  text,
  total_rows         bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 50), 200));
  st  text := nullif(btrim(coalesce(p_status, '')), '');
begin
  perform private.require_admin();
  return query
    with filtered as (
      select f.* from public.food_submissions f
       where st is null or st = 'all' or f.status = st
    )
    select f.id, f.submitted_at,
           -- مرجعٌ لا هوية: يكفي لربط بلاغات نفس الشخص، ولا يكشف بريده.
           left(f.submitted_by::text, 8),
           f.product_name, f.brand, f.barcode, f.serving_desc,
           f.evidence_kcal, f.evidence_protein_g, f.evidence_carbs_g, f.evidence_fat_g,
           f.evidence_note, f.status, f.reviewed_at,
           case when f.reviewed_by is null then null else left(f.reviewed_by::text, 8) end,
           f.review_note, f.published_food_id,
           (select count(*) from filtered)
      from filtered f
     order by f.submitted_at desc
     limit lim;
end;
$$;

-- ── ٥) قرار المراجعة — للمؤسس وحده ─────────────────────────────────────────
/**
 * يسجّل **قرارًا**، ولا ينسخ أرقام المستخدم إلى أي كتالوج. و`p_published_food_id`
 * يُملأ حين يكون الصنف قد نُشر فعلًا بعد تحقّق بشري — فيصير للبلاغ أثرٌ يُتتبَّع:
 * «متى صار قابلًا للبحث، وبأي معرّف».
 */
create or replace function public.founder_review_food_submission(
  p_id uuid,
  p_decision text,
  p_note text default null,
  p_published_food_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  perform private.require_founder();
  if p_decision not in ('approved', 'rejected', 'needs_info') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if coalesce(btrim(coalesce(p_note, '')), '') = '' and p_decision <> 'approved' then
    -- الرفض بلا سبب يصير لغزًا بعد شهر — نفس قاعدة بقيّة أفعال المؤسس.
    raise exception 'review_note_required' using errcode = '22023';
  end if;

  update public.food_submissions f
     set status = p_decision,
         reviewed_by = uid,
         reviewed_at = now(),
         review_note = nullif(btrim(coalesce(p_note, '')), ''),
         published_food_id = nullif(btrim(coalesce(p_published_food_id, '')), '')
   where f.id = p_id;

  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('outcome', 'reviewed', 'decision', p_decision);
end;
$$;

revoke all on function public.founder_food_submissions(text, int) from public, anon;
revoke all on function public.founder_review_food_submission(uuid, text, text, text) from public, anon;
grant execute on function public.founder_food_submissions(text, int) to authenticated;
grant execute on function public.founder_review_food_submission(uuid, text, text, text) to authenticated;
