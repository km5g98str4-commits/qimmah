-- ═══════════════════════════════════════════════════════════════════════════
-- [OVERNIGHT-5] تصحيحان في سلامة التجارة — كلاهما اكتُشف بمهاجمة المخطّط.
--
-- هجرة **تصحيحية مستقلّة** لا تعديلٌ في مكانها: لو كانت الهجرات الأصلية قد
-- طُبِّقت على قاعدة حيّة، فالتعديل في مكانه لا يعمل أبدًا. المستقلّة تعمل في
-- الحالتين، وتترك أثرًا مقروءًا لسببها.
--
-- ① F-1 · P1 — خطأ عابر أثناء المنح كان **يحرق البصمة فيضيع طلب مدفوع**.
-- ② F-2 · P1 — `claim_pending_grants` لم تكن تشترط بريدًا مؤكَّدًا، بينما
--    `start_trial` تشترطه — وعدم التماثل على المنحة **الأثمن**.
--
-- الدالّتان تُعاد كتابتهما بالكامل (`create or replace`) لأن Postgres لا يقبل
-- ترقيع جسم دالّة. وما عدا الكتلتين المشروحتين أعلاه منقول حرفيًّا.
-- ═══════════════════════════════════════════════════════════════════════════

-- ① F-1 ─────────────────────────────────────────────────────────────────────
create or replace function public.salla_ingest_event(
  p_fingerprint    text,
  p_event_name     text,
  p_order_id       text,
  p_email          text,
  p_amount_minor   int,
  p_currency       text,
  p_status_slug    text,
  p_should_grant   boolean,
  p_reason         text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ver          int;
  h            text;
  grant_result text;
begin
  if coalesce(btrim(p_fingerprint), '') = '' then
    raise exception 'ingest_fingerprint_missing' using errcode = '22023';
  end if;

  if exists (select 1 from public.salla_webhook_events
              where event_fingerprint = p_fingerprint) then
    return 'duplicate';
  end if;

  if p_email is not null and btrim(p_email) <> '' then
    ver := private.active_pepper_version();
    h   := private.hash_identity(p_email, ver);
  end if;

  if not p_should_grant then
    -- التصنيف من قائمة القيد المغلقة، والسبب نصّ حرّ. وخلطهما يكسر القيد.
    --   `ignored`  = ليس لنا أو لم يُدفع بعد — لا شيء يُفعل.
    --   `rejected` = طلبٌ **مدفوع** يخالف السياسة — يستحق عين إنسان.
    insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
      email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
    values (p_fingerprint, p_event_name, btrim(p_order_id), h, ver, p_status_slug,
            p_amount_minor, p_currency,
            case when p_reason in ('unsupported_event', 'unpaid_or_incomplete')
                 then 'ignored' else 'rejected' end,
            p_reason)
    on conflict (event_fingerprint) do nothing;
    return case when p_reason in ('unsupported_event', 'unpaid_or_incomplete')
                then 'ignored' else 'rejected' end;
  end if;

  begin
    grant_result := public.admin_grant_premium(
      p_email, 'salla', p_order_id, p_amount_minor, null,
      'webhook:salla', p_fingerprint);
  exception
    -- ── العابر يُعاد رميه، ولا يُكتب له سطر ببصمة ─────────────────────────
    -- `when others` كان يبتلع فشل التسلسل والجمود ومهلة القفل أيضًا، فيكتب
    -- سطر تدقيق **يحمل البصمة** ويعيد `rejected` ⇒ HTTP 200 ⇒ سلة تتوقّف عن
    -- إعادة الإرسال، ومحاولاتها الثلاث تصطدم كلّها بالبصمة فتُقرأ `duplicate`.
    -- النتيجة: **طلب مدفوع يضيع بلا أثر ولا مسار استرجاع** — وهو بالضبط ما
    -- ادّعت هذه الدالّة أنها تمنعه.
    -- فالعابر يُرفَع كما هو: لا سطر تدقيق، والدالّة الطرفية تعيد 5xx، وسلة
    -- تعيد المحاولة — والمحاولة التالية تجد البصمة نظيفة.
    when sqlstate '40001'   -- serialization_failure
      or sqlstate '40P01'   -- deadlock_detected
      or sqlstate '55P03'   -- lock_not_available
      or sqlstate '57014'   -- query_canceled
      or sqlstate '08006'   -- connection_failure
      or sqlstate '53300'   -- too_many_connections
      or sqlstate '53200'   -- out_of_memory
    then
      raise;
    -- ── الدائم وحده يُسجَّل مرفوضًا: قرار نهائي يستحق عين إنسان ───────────
    when others then
      insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
        email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
      values (p_fingerprint, p_event_name, btrim(p_order_id), h, ver, p_status_slug,
              p_amount_minor, p_currency, 'rejected', sqlerrm)
      on conflict (event_fingerprint) do nothing;
      return 'rejected';
  end;

  insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
    email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
  values (p_fingerprint, p_event_name, btrim(p_order_id), h, ver, p_status_slug,
          p_amount_minor, p_currency, 'processed', grant_result)
  on conflict (event_fingerprint) do nothing;

  return 'processed';
end;
$$;


-- ② F-2 ─────────────────────────────────────────────────────────────────────
create or replace function public.claim_pending_grants()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  conf timestamptz;
  cur record;
  rec record;
  purchase_provider text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  -- التحقّق من البريد **شرط للمِنحة**، لا للتجربة وحدها.
  -- كانت `start_trial` تشترط `email_confirmed_at`، وهذه لا تشترطه — بينما هي
  -- تمنح ما هو **أثمن**: Premium دائم مسجَّل على عنوان بريد. فمن يسجّل بعنوان
  -- غيره ولم يؤكّده كان يستلم شراء صاحبه. عدم التماثل هنا هو الثغرة نفسها.
  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  select p.provider into purchase_provider from private.identity_hashes(em) ih
    join public.purchase_ledger p on p.email_hash = ih.email_hash
   order by p.granted_at desc, p.id desc
   limit 1;
  if purchase_provider is not null then
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activated_at, expires_at, no_expiry)
    values (uid, em, 'premium', purchase_provider, now(), null, true)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = purchase_provider, activated_at = now(),
          expires_at = null, no_expiry = true, activation_code_id = null
      where public.entitlements.entitlement_type <> 'premium'
         or public.entitlements.source <> purchase_provider;
    return 'premiumActive';
  end if;

  select l.code_id, l.redeemed_at,
         l.redeemed_at + make_interval(days => ac.duration_days) as original_expiry
    into rec
    from public.code_redemption_ledger l
    join public.access_codes ac on ac.id = l.code_id
   where l.email_hash in (select ih.email_hash from private.identity_hashes(em) ih)
     and ac.enabled
     and l.redeemed_at + make_interval(days => ac.duration_days) > now()
   order by original_expiry desc
   limit 1;
  select * into cur from public.entitlements where user_id = uid;
  if rec.code_id is not null then
    if found and (private.grant_rank(cur.entitlement_type) > 2
                  or (cur.expires_at is not null and cur.expires_at >= rec.original_expiry)
                  or cur.no_expiry) then
      return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
    end if;
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry)
    values (uid, em, 'special', 'code', rec.code_id, rec.redeemed_at, rec.original_expiry, false)
    on conflict (user_id) do update
      set entitlement_type = 'special', source = 'code', activation_code_id = rec.code_id,
          activated_at = rec.redeemed_at, expires_at = rec.original_expiry, no_expiry = false;
    insert into public.access_code_redemptions (code_id, user_id)
    values (rec.code_id, uid)
    on conflict (code_id, user_id) do nothing;
    return 'specialAccessActive';
  end if;
  if found then
    return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
  end if;
  return 'noAccess';
end;
$$;

