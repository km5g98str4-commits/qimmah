-- ============================================================================
-- 20260822120003 — [ADMIN-R4] تفصيل التجارة في اللقطة التنفيذية
-- ============================================================================
-- تعيد تعريف `public.founder_executive_snapshot()` وحدها — **`create or replace`
-- بنفس التوقيع**، فلا صلاحيات تتغيّر ولا مستدعٍ يتأثّر، والهجرة قابلة لإعادة
-- التشغيل كسابقاتها.
--
-- ما يُضاف ثلاثة أعداد لها **مصدر حقيقي قائم**:
--   • `webhookProcessed` / `webhookPending` — حالة أحداث سلة، وكانت اللوحة
--     تعرض الفاشل وحده فيُقرأ الصمت عمّا سواه «كل شيء تمام».
--   • `grantsManual` — المنح اليدوية، وهي المسار الذي يُسكّ من مفتاح الخادم؛
--     عرضها **قراءةً** واجب ما دام سكّها لا يخرج من متصفّح.
--
-- وما **لا يُضاف** مُسمّى في جسم الدالة نفسها: `webhookRetried`. لا عمود
-- محاولات في `salla_webhook_events`، والحدث المُعاد يُصنَّف `duplicate` — وهو
-- ليس إعادة محاولة. البند يبقى في السجلّ «غير مقيس» بدل أن يُملأ برقم اسمه
-- خاطئ.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة.
--    الترتيب والأوامر في `docs/execution/qimmah-sovereign-closure/MIGRATIONS-APPLY-PENDING.md`.
--
-- ⛔ **يجب أن تُطبَّق بعد `20260816120003`** — تلك تُنشئ الدالة، وهذه تستبدلها.
--    التطبيق بالعكس يعيد النسخة القديمة فوق الجديدة بصمت.
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
  perform private.require_founder();

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

-- الصلاحيات لا تتغيّر: `create or replace` بنفس التوقيع يحفظ ACL الدالة. تُعاد
-- هنا **صراحةً** كي تصحّ الهجرة حتى لو طُبِّقت على قاعدة لم تُطبَّق عليها سابقتها
-- بترتيب صحيح — البيان المكرّر أرخص من افتراض غير مفحوص.
revoke all on function public.founder_executive_snapshot() from public, anon;
grant execute on function public.founder_executive_snapshot() to authenticated;

comment on function public.founder_executive_snapshot() is
  'تجميعات المركز التنفيذي + حالة webhook والمنح اليدوية. قراءة فقط، والبوّابة داخل الدالة.';
