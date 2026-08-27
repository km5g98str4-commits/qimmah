-- ============================================================================
-- [ADMIN-CONV] الطلبات المعلّقة — النصف الثاني من طابور التسليم
-- ============================================================================
-- `founder_failed_orders` أجابت «ما الذي فشل؟»، وبقي «ما الذي **علِق**؟» بلا
-- قائمة: حدثٌ وصل (`received`) أو تحقّق توقيعه (`verified`) ثم لم يبلغ
-- `processed` — وهو أخطر تشغيليًّا من الفاشل، لأن الفاشل أعلن نفسه والمعلّق
-- صامت. عدّاده موجود في اللقطة (`webhookPending`)، ورقمٌ بلا أسماء غير قابل
-- للفعل: من «معلّقان» لا طريق إلى العميلين.
--
-- نفس عقد `founder_failed_orders` حرفيًّا — نفس الأعمدة ونفس التقنيع
-- (ثمانية رموز من التجزئة، لا بريد) — والفرق الوحيد شرط التصنيف.
-- ============================================================================

create or replace function public.founder_pending_orders(p_limit int default 50)
returns table (
  provider_order_id text,
  classification    text,
  reason            text,
  received_at       timestamptz,
  amount_minor      int,
  currency          text,
  identity_ref      text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select s.provider_order_id,
           s.classification,
           s.reason,
           s.received_at,
           s.amount_minor,
           s.currency,
           -- مرجع هوية لا هوية: ثمانية رموز من التجزئة تكفي للمطابقة مع
           -- سجلّ الشراء، ولا تُعيد بناء بريد أحد.
           case when s.email_hash is null then null else left(s.email_hash, 8) end
      from public.salla_webhook_events s
     where s.classification in ('received', 'verified')
     order by s.received_at desc
     limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

revoke all on function public.founder_pending_orders(int) from public, anon;
grant execute on function public.founder_pending_orders(int) to authenticated;

comment on function public.founder_pending_orders(int) is
  'أحداث سلة العالقة قبل المعالجة — أسماء لا عدد. هوية مُقنَّعة بمرجع تجزئة.';
