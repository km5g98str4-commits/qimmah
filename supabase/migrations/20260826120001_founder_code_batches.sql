-- ============================================================================
-- [ADMIN-CONV] عرض الحملات — الوسم يُقرأ مجمّعًا، لا كودًا كودًا
-- ============================================================================
-- بعد `20260824120005` صارت الحملة **وسمًا فوق أكواد فردية مولَّدة** (حكم
-- المؤسس: «حملة = RAMADAN، وتُولَّد تحتها أكواد قوية»). فسؤال المؤسس التشغيلي
-- تغيّر شكله: لم يعد «ما حال هذا الكود؟» بل **«ما حال هذه الحملة؟»** — كم صدر
-- تحتها، كم استُهلك، كم بقي حيًّا، وكم عُطِّل. وصفحة الأكواد تجيب كودًا كودًا،
-- فخمسمئة صفّ لا تُقرأ حملةً.
--
-- ═══ لماذا قراءة تجميع لا جدول حملات ═══
-- نفس قرار `20260824120005` حرفيًّا: **الحملة موجودة أصلًا** — هي
-- `access_codes.label`. جدول `campaigns` كان سيصنع سلطة ثانية لمفهوم قائم.
-- فالتجميع هنا `group by label` على الجدول الواحد، والحالة تُشتقّ بوقت
-- القاعدة كما في `founder_code_page` — لا عمود مخزَّن يشيخ.
--
-- ═══ عقد الإرجاع ═══
-- لكل وسم أربعة أعداد: صادر (كل ما أُنشئ) · مستبدَل (استُنفدت استخداماته) ·
-- متبقٍ (مفعَّل وغير مستنفَد وغير منتهٍ) · معطَّل. **ولا بصمة ولا كود خام** —
-- نفس قاعدة صفحة الأكواد. والوسم `null` صفّ مستقل لا يُطوى: أكواد بلا حملة
-- حقيقةٌ تُعرض باسمها («بلا وسم») لا تُخفى.
-- ============================================================================

create or replace function public.founder_code_batches(p_limit int default 100)
returns table (
  label            text,
  codes_issued     bigint,
  codes_redeemed   bigint,
  codes_remaining  bigint,
  codes_disabled   bigint,
  last_issued_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select c.label,
           count(*),
           count(*) filter (where c.redemption_count >= c.max_redemptions),
           -- «متبقٍ» = ما يستطيع مستخدم استهلاكه الآن فعلًا: مفعَّل، وغير
           -- مستنفَد، وغير منتهٍ. الشروط الثلاثة معًا — شرطان يكذبان.
           count(*) filter (where c.enabled
                              and c.redemption_count < c.max_redemptions
                              and (c.expires_at is null or c.expires_at > now())),
           count(*) filter (where not c.enabled),
           max(c.created_at)
      from public.access_codes c
     group by c.label
     order by max(c.created_at) desc
     limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

-- نفس نمط بقيّة القراءات: `anon` لا ينفّذ، و`authenticated` ينفّذ ثم يُردّ من
-- داخل الجسم إن لم يكن إداريًّا — طبقتان لا واحدة.
revoke all on function public.founder_code_batches(int) from public, anon;
grant execute on function public.founder_code_batches(int) to authenticated;

comment on function public.founder_code_batches(int) is
  'الحملات مجمّعة بالوسم: صادر/مستبدَل/متبقٍ/معطَّل. لا بصمة ولا كود خام.';
