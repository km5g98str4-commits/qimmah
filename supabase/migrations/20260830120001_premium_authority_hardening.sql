-- ════════════════════════════════════════════════════════════════════════════
-- [COMMERCE-W1-HARDENING] سلطة Premium — عطلان مقيسان على الأرض، لا مراجعةُ نصّ
-- ════════════════════════════════════════════════════════════════════════════
-- forward-only: لا هجرة سابقة تُحرَّر، ولا بيانات تُحذف.
--
-- ① [P0 · إيراد] صكّ شراء واحد يمنح Premium دائمًا **بلا حدّ** بإعادة تدوير
--    البريد — والمؤسس لا يرى شيئًا.
--
--    مُقاس على عنقود حقيقي بكل الهجرات (failed=0):
--      credential BL9X4PR95KJ6TWS3
--      u1 يستردّ                       ⇒ premiumActive
--      update auth.users set email=…   (العنوان يتحرّر)
--      u2 يسجّل العنوان ويستردّ نفسه   ⇒ premiumActive
--      منح Premium دائمة حيّة          = ٢
--      عدّاد الصكّ                      = 1/1
--      founder_purchase_batches        = issued 1 · redeemed 1 · unredeemed 0
--    فالازدواج **غير مرئيّ في كل قراءات المؤسس**، ويتكرّر بلا حدّ.
--
--    السبب: فرعا الشراء (إعادة المحاولة في `redeem_core`، وفرع
--    `claim_pending_grants`) يتعرّفان على «صاحب الشراء» **ببصمة البريد** لا
--    بالحساب. وهذا **مقصود وصحيح** — به ينجو الشراء من حذف الحساب (PDPL يمحو
--    صفّ المنحة، فيسترجعه صاحبه بعد التسجيل). لكنّ الربط بالبريد وحده يجعل
--    **من يملك العنوان لاحقًا** يملك الشراء.
--
--    فالثابت الصحيح ليس «لا ربط بالبريد» بل:
--        **شراءٌ واحد ⇒ منحة Premium حيّة واحدة على الأكثر، في كل لحظة.**
--    وهو يُبقي المسار المشروع كما هو (بعد الحذف لا صفّ حيّ ⇒ الاسترجاع يعمل)،
--    ويسدّ إعادة التدوير (الصفّ الأول ما زال حيًّا ⇒ الثاني مرفوض).
--
--    ويُنفَّذ **بنيويًّا لا بفحصٍ مشروط**: `if exists` يتسابق (اتصالان لا يريان
--    أحدهما الآخر)، والفهرس الفريد يفرضه المحرّك.
--
-- ② [P1 · صدق الحالة] «Premium لا تُخفَّض» كانت **تُدَّعى ولا تُقاس تحت التزامن**.
--    `start_trial` وفرع الكود الموقوت يقرآن الحالة ثم يكتبان، و`do update`
--    فيهما **بلا `where`** — فمنحةُ Premium تُلحق بينهما تُدهَس:
--      before: trial|trial                     A: premiumActive · B: specialAccessActive
--      after : special|code|expires=+14d       my_entitlement ⇒ specialAccessActive
--    ووقع بلا أي تلاعب: ١ من ٣٠ جولة على اتصالين مستقلّين.
--    والأسوأ أثرًا فرع التجربة: بعد ٧٢ ساعة يقرأ المشتري `trialExpired` ويُقفل
--    عليه — وهو مالكُ Premium دائمة.
--
--    والعلاج **مانعٌ عند الجدول لا عند كل كاتب**: كاتبٌ واحد يُنسى يعيد العطل،
--    وهذه الهجرة نفسها تضيف كتّابًا. فالحارس مُشغِّل `before update` يرفض أي
--    هبوط عن Premium حيّة **مهما كان الكاتب** — حاضرًا كان أو قادمًا.
-- ════════════════════════════════════════════════════════════════════════════

-- ── ① ربط المنحة بشرائها + الفريد البنيوي ──────────────────────────────────
alter table public.entitlements
  add column if not exists purchase_ledger_id uuid references public.purchase_ledger(id);

comment on column public.entitlements.purchase_ledger_id is
  'الشراء الذي وُلدت منه هذه المنحة. الفهرس الفريد أدناه يجعل الشراء الواحد منحةً حيّة واحدة — سدُّ إعادة تدوير البريد.';

-- سدّ استباقي لأي صفّ قائم: يربط كل منحة شراء بسجلّها عبر بصمة البريد.
-- (لا شيء في الإنتاج اليوم — الهجرة APPLY_PENDING — لكن السدّ يجعلها آمنة
--  على أي قاعدة سبقتها، ولا يعتمد على فراغها.)
update public.entitlements e
   set purchase_ledger_id = p.id
  from public.purchase_ledger p
 where e.purchase_ledger_id is null
   and e.entitlement_type = 'premium'
   and p.email_hash in (select ih.email_hash from private.identity_hashes(e.email) ih);

-- الحزام: شراءٌ واحد ⇒ منحة Premium واحدة. الصفّ المحذوف (PDPL) يحرّر الشراء
-- لصاحبه — والصفّ الحيّ يمنع غيره. **لا استثناء للملغى**: شراءٌ استُهلك يبقى
-- مستهلَكًا، ورفعُ الحظر فعلُ مؤسس لا مسار خدمة ذاتية.
create unique index if not exists entitlements_one_live_premium_per_purchase
  on public.entitlements (purchase_ledger_id)
  where entitlement_type = 'premium' and purchase_ledger_id is not null;

-- ── ② مانع الهبوط عن Premium — عند الجدول، لكل كاتب ────────────────────────
create or replace function private.entitlements_block_premium_downgrade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Premium حيّة لا تُستبدل بأضعف منها. الإلغاء ليس هبوطًا (النوع يبقى premium
  -- ويُضبط revoked_at)، والحذف ليس هبوطًا (DELETE لا يمرّ هنا).
  if old.entitlement_type = 'premium'
     and old.revoked_at is null
     and new.entitlement_type is distinct from 'premium' then
    -- لا استثناء يُرفع: الكاتب المتسابق يظنّ أنه كتب، والحقيقة الحيّة
    -- (`my_entitlement`) تبقى premiumActive — والعميل يعيد قراءتها بعد كل
    -- استرداد. الرفض الصامت هنا **يحفظ المدفوع**؛ والاستثناء كان سيُسقط
    -- استردادًا مشروعًا لكود موقوت يملكه صاحب Premium أصلًا.
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists entitlements_block_premium_downgrade on public.entitlements;
create trigger entitlements_block_premium_downgrade
  before update on public.entitlements
  for each row execute function private.entitlements_block_premium_downgrade();

comment on function private.entitlements_block_premium_downgrade() is
  'يمنع هبوط منحة Premium حيّة إلى trial/special مهما كان الكاتب — سدُّ سباق القراءة-ثمّ-الكتابة في start_trial وفرع الكود الموقوت.';

-- ── ③ السلطة الواحدة تسجّل شراءها ──────────────────────────────────────────
-- الجسد منقول من 20260829120001 بزيادتين: ربط `purchase_ledger_id`، وتحويل
-- انتهاك الفريد إلى `invalid_code` — نفس رسالة المجهول، فلا يصير الردّ عرّافًا
-- يميّز «صكّ قائم لغيري» عن «صكّ لا وجود له».
create or replace function private.grant_premium_from_code(
  p_user_id uuid, p_email text, p_code_id uuid, p_label text,
  p_email_hash text, p_hash_version int
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ledger_id uuid;
begin
  insert into public.purchase_ledger (provider, provider_order_id, email_hash,
                                      hash_version, amount_minor, raw, recorded_by, source_event)
  values ('purchase_code', p_code_id::text, p_email_hash, p_hash_version, null,
          jsonb_build_object('code_id', p_code_id, 'label', p_label),
          'redeem:' || p_user_id::text, null)
  on conflict (provider, provider_order_id) do nothing
  returning id into ledger_id;

  if ledger_id is null then
    select id into ledger_id from public.purchase_ledger
     where provider = 'purchase_code' and provider_order_id = p_code_id::text;
  end if;

  begin
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry,
                                     purchase_ledger_id)
    values (p_user_id, p_email, 'premium', 'purchase_code', p_code_id, now(), null, true, ledger_id)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = 'purchase_code',
          activation_code_id = excluded.activation_code_id,
          activated_at = excluded.activated_at, expires_at = null, no_expiry = true,
          purchase_ledger_id = excluded.purchase_ledger_id;
  exception when unique_violation then
    -- الشراء له منحة حيّة على حسابٍ آخر: إعادة تدوير عنوان، لا إعادة محاولة.
    raise exception 'invalid_code' using errcode = '22023';
  end;
end;
$$;
revoke all on function private.grant_premium_from_code(uuid, text, uuid, text, text, int)
  from public, anon, authenticated;

comment on function private.grant_premium_from_code(uuid, text, uuid, text, text, int) is
  'الموضع الوحيد الذي يحوّل صكّ شراء إلى Premium: purchase_ledger ثم رفع المنحة مربوطةً بشرائها. شراءٌ واحد ⇒ منحة حيّة واحدة.';

-- ── ④ تحقّق ذاتيّ: الهجرة تفشل إن لم تُركَّب سدودها ────────────────────────
do $$
begin
  if to_regclass('public.entitlements_one_live_premium_per_purchase') is null then
    raise exception 'hardening incomplete: unique index missing';
  end if;
  if not exists (select 1 from pg_trigger
                  where tgname = 'entitlements_block_premium_downgrade'
                    and tgrelid = 'public.entitlements'::regclass) then
    raise exception 'hardening incomplete: downgrade trigger missing';
  end if;
  if (select prosrc from pg_proc where oid = 'private.grant_premium_from_code(uuid,text,uuid,text,text,int)'::regprocedure)
       not like '%purchase_ledger_id%' then
    raise exception 'hardening incomplete: grant does not bind its purchase';
  end if;
end $$;
