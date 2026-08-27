-- ============================================================================
-- [ADMIN-CONV] «من دخل اليوم؟» — مفتاح واحد جديد في لقطة اللوحة
-- ============================================================================
-- اللقطة تجيب «سجّلوا دخول ٧ أيام / ٣٠ يومًا» ولا تجيب **اليوم** — وهو أول
-- سؤال يسأله مؤسس يفتح لوحته صباحًا. والمصدر موجود في الدالة نفسها أصلًا:
-- `riyadh_start` محسوبة لعدّ «حسابات اليوم»، و`auth.users.last_sign_in_at`
-- مقروء لعدّ الأسبوع. فالإضافة مفتاح واحد يقرن الاثنين.
--
-- ⚠️ **ولا عدّاد محذوفين هنا عمدًا**: حذف الحساب يمحو صفّه من `auth.users`
-- و`profiles` معًا، فلا مصدر يُعدّ منه — واختراع رقم من فرق لقطات هو بالضبط
-- «رقم لا نعرف من أين جاء». بناء سجلّ حذف بلا PII قرار مؤسس مرفوع في
-- `docs/product/ADMIN-DASHBOARD-DECISIONS.md`.
--
-- ═══ لماذا الجسد منسوخ كاملًا لا مرقوعًا ═══
-- نفس عقد المستودع (رأس `20260824120002` يشرحه): `test:migration-order` يشترط
-- أن يطابق جسمُ كل دالّة حيّة **آخر ملفٍ يعرّفها نصًّا**. فالملف الأخير يحمل
-- النسخة النهائية كاملة، واختصارها رقعةً ديناميكية يجعل الحيّ لا يطابق أي ملف.
--
-- ⇐ منقولة حرفيًّا من `20260824120002_founder_operations_reads.sql`، والزيادة
--    الوحيدة مفتاح `signedInToday` في كتلة `activity`.
-- ============================================================================

create or replace function public.founder_executive_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  out_json     jsonb;
  riyadh_start timestamptz;
  total_users  bigint;
begin
  perform private.require_admin();

  -- منتصف ليل الرياض: الحسابات «اليوم» تُقاس بيوم المستخدم لا بـUTC.
  riyadh_start := date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh';

  select count(*) into total_users from public.profiles;

  select jsonb_build_object(
    'as_of', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),

    -- ── الحسابات: المقام كامل بحكم مُشغّل handle_new_user ──
    'users', jsonb_build_object(
      'total',    total_users,
      'newToday', (select count(*) from public.profiles p where p.created_at >= riyadh_start),
      'new7d',    (select count(*) from public.profiles p where p.created_at >= now() - interval '7 days'),
      'new30d',   (select count(*) from public.profiles p where p.created_at >= now() - interval '30 days'),
      'verified', (select count(*) from auth.users u where u.email_confirmed_at is not null),
      'growthSeries', coalesce((
        select jsonb_agg(jsonb_build_object('date', d.day, 'value', d.n) order by d.day)
          from (
            select to_char(date_trunc('day', p.created_at at time zone 'Asia/Riyadh'), 'YYYY-MM-DD') as day,
                   count(*) as n
              from public.profiles p
             where p.created_at >= now() - interval '90 days'
             group by 1
          ) d
      ), '[]'::jsonb)
    ),

    -- ── الدخول: من جدول المصادقة. «سجّلوا دخول» لا «نشطون» (الجلسة تُجدَّد) ──
    'activity', jsonb_build_object(
      -- [ADMIN-CONV] «اليوم» بيوم الرياض نفسه الذي تُعدّ به الحسابات الجديدة —
      -- مقياسان بنافذتين مختلفتين في شاشة واحدة يقرآن تناقضًا وهميًّا.
      'signedInToday', (select count(*) from auth.users u where u.last_sign_in_at >= riyadh_start),
      'signedIn7d',  (select count(*) from auth.users u where u.last_sign_in_at >= now() - interval '7 days'),
      'signedIn30d', (select count(*) from auth.users u where u.last_sign_in_at >= now() - interval '30 days'),
      'dormant30d',  (select count(*) from auth.users u
                       where u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 days')
    ),

    -- ── الاستحقاق: الحالة تُشتقّ بوقت القاعدة، ولا تُقرأ من عمود مخزَّن ──
    'entitlement', jsonb_build_object(
      'premiumActive', (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'premiumActive'),
      'trialActive',   (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'trialActive'),
      'trialExpired',  (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'trialExpired'),
      -- المعاينة = حساب بلا أي استحقاق فعّال. يُشتقّ من المقام الكامل.
      'previewOnly',   greatest(total_users - (
                         select count(*) from public.entitlements e
                          where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                                in ('premiumActive','trialActive','specialAccessActive')), 0),
      'revokedActive', (select count(*) from public.revocation_ledger r where r.lifted_at is null)
    ),

    -- ── التجارة: أوامر سلة والأكواد ──
    'commerce', jsonb_build_object(
      'ordersSeen',   (select count(distinct s.provider_order_id) from public.salla_webhook_events s
                        where s.provider_order_id is not null),
      'ordersPaid',   (select count(*) from public.purchase_ledger l),
      'ordersFailed', (select count(*) from public.salla_webhook_events s
                        where s.classification in ('failed','rejected')),
      'codesIssued',  (select count(*) from public.access_codes c),
      'codesRedeemed',(select count(*) from public.code_redemption_ledger g),
      'codesUnused',  (select count(*) from public.access_codes c
                        where c.enabled and c.redemption_count = 0
                          and (c.expires_at is null or c.expires_at > now())),
      -- ── [ADMIN-R4] حالة الـwebhook والمنح اليدوية ──
      'webhookProcessed', (select count(*) from public.salla_webhook_events s
                            where s.classification = 'processed'),
      'webhookPending',   (select count(*) from public.salla_webhook_events s
                            where s.classification in ('received','verified')),
      'grantsManual',     (select count(*) from public.entitlements e where e.source = 'manual')
      -- ⚠️ **`webhookRetried` غير موجود هنا عمدًا**: لا عمود محاولات في الجدول.
      --    الحدث المُعاد يصل ببصمة مطابقة فيُصنَّف `duplicate` — وذلك ليس
      --    «إعادة محاولة». إخراج عدد التكرارات باسم «أُعيدت محاولتها» كذبٌ
      --    بالتسمية، والواجهة تُبقيه «غير مقيس» ولا تراه صفرًا.
    )
  ) into out_json;

  return out_json;
end;
$$;

-- الصلاحيات تُعاد **صراحةً** مع كل إعادة تعريف (عرف 20260822120003): البيان
-- المكرّر أرخص من افتراض غير مفحوص عن قاعدةٍ لم تُطبَّق عليها السوابق بترتيبها.
revoke all on function public.founder_executive_snapshot() from public, anon;
grant execute on function public.founder_executive_snapshot() to authenticated;
