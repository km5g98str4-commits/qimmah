-- ═══════════════════════════════════════════════════════════════════════════
-- [STAGING-COMMISSIONING §7] حدّ الشبكة — الطبقة التي تعجز عنها القاعدة وحدها
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ═══ الحقيقة البنيوية التي فرضت هذا التصميم ═══
-- **القاعدة لا ترى عنوان الشبكة إطلاقًا.** مسحُ الهجرات الاثنتين والثلاثين لا
-- يجد `inet_client_addr` ولا `x-forwarded-for` ولا نظيرًا. ولذلك حدّ الاسترداد
-- القائم مربوط ببصمة **البريد**، وأثره مقيس: ثلاثة حسابات جديدة × اثنتا عشرة
-- محاولة ⇒ ٣٠ بلغت فحص الكود و٦ مخنوقة. أي أن الحدّ يصمد داخل الحساب، وثمن
-- تصفيره حسابٌ ببريد مؤكَّد.
--
-- والتوصية السابقة — «قاعدة Cloudflare أمام Supabase REST» — **مستحيلة**:
-- المتصفّح يطلب `<ref>.supabase.co` مباشرةً، ونطاقُه ليس نطاقنا. فالموضع
-- الوحيد الذي تملكه قِمّة هو كودٌ تكتبه: طرفية `qimmah-gateway`.
--
-- ═══ وتقسيمُ العمل بين الطرفية والقاعدة ═══
-- الطرفية وحدها تملك **العنوان**. والقاعدة وحدها تملك **حالةً مشتركة تدوم**:
-- الطرفيات عابرة ومتعدّدة النسخ، فعدّادٌ في ذاكرتها يُصفَّر بنسخة جديدة ولا
-- يُشارَك بين النسخ — حارسٌ لا يُطلق. فكلٌّ يقدّم ما لا يملكه الآخر.
--
-- ⚠️ **وحدُّ هذه الهجرة معلَن:** الدوالّ تبقى ممنوحة لـ`authenticated`، فمن
-- ينادي PostgREST مباشرةً يتخطّى هذه الطبقة. ونزعُ المنحة كان سيوجب تمرير
-- معرّف المستخدم وسيطًا — أي **سلطة هوية ثانية** يمنعها التكليف (§17).
-- فالضمان الحقيقي يبقى في القاعدة (إنتروبيا ٨٠ بتًا · تجربة لكل هوية قانونية ·
-- حدّ لكل بريد · تأكيد بريد)، وهذه **طبقةٌ في العمق لا سورٌ حول القلعة**.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ١) دفتر محاولات الشبكة ────────────────────────────────────────────────
/**
 * العنوان يُخزَّن **مجزّأً بالملح نفسه** لا نصًّا. وعنوان IP بيان شخصي في
 * كثير من الولايات، وتسريب قاعدة يسرّب خريطة «من طلب ماذا ومتى». والتجزئة
 * تكفي تمامًا للغرض: الحدّ يحتاج **مساواة** لا قراءة.
 */
create table if not exists private.gate_attempts (
  ip_hash      text        not null,
  hash_version int         not null,
  action       text        not null,
  attempted_at timestamptz not null default now()
);

create index if not exists gate_attempts_window
  on private.gate_attempts (ip_hash, action, attempted_at desc);

revoke all on private.gate_attempts from public, anon, authenticated;

comment on table private.gate_attempts is
  'محاولات لكل عنوان شبكة — مجزّأة بالملح. تكتبها الطرفية عبر gate_admit وحدها.';

-- ── ٢) القرار: سماحٌ أو منع، وتسجيلٌ في الحالتين ─────────────────────────
/**
 * ⚠️ **يُسجَّل الطلب قبل الحكم لا بعده.** لو سجّلنا المسموح وحده لصار المهاجم
 * الذي بلغ حدّه غيرَ مُحصىً بعد بلوغه — فيتجدّد له الحدّ بمجرّد مرور النافذة
 * ولو ظلّ يطرق كل ثانية. التسجيل أوّلًا يجعل النافذة **متدحرجة فعلًا**.
 *
 * والتنظيف داخل نفس النداء: صفوفٌ أقدم من يومٍ تُحذف، فلا يحتاج الجدول وظيفة
 * دورية لا وجود لها في هذه البيئة (ولا نَعِد بواحدة).
 */
create or replace function public.gate_admit(p_ip text, p_action text, p_max int)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ver int;
  h   text;
  n   int;
  lim int := greatest(coalesce(p_max, 20), 1);
begin
  if coalesce(btrim(p_ip), '') = '' or coalesce(btrim(p_action), '') = '' then
    -- **فشلٌ مغلق**: بلا عنوان أو فعل لا قياس، ولا تمرير بلا قياس.
    return 'deny';
  end if;
  ver := private.active_pepper_version();
  h   := private.hash_identity('ip:' || btrim(p_ip), ver);

  -- ⚠️ **مقصورٌ على المفتاح الذي يُفحَص الآن** لا كنسٌ عامّ للجدول.
  -- وحارس `schema-rls-proof` يمنع أي `delete` غير مقصور في هذا المجلّد — وهو
  -- محقّ: حذفٌ عامّ في هجرة هو كيف تُمسح بيانات مستخدمين بسطرٍ لا ينتبه له أحد.
  -- والقصر هنا كافٍ: صفوف مفتاحٍ لا يُنادى مرّة أخرى لا تدخل أي حساب.
  delete from private.gate_attempts
   where ip_hash = h and attempted_at < now() - interval '24 hours';

  insert into private.gate_attempts (ip_hash, hash_version, action)
  values (h, ver, btrim(p_action));

  select count(*) into n
    from private.gate_attempts a
   where a.ip_hash = h
     and a.action = btrim(p_action)
     and a.attempted_at > now() - interval '1 hour';

  return case when n > lim then 'deny' else 'allow' end;
end;
$$;

-- ⚠️ **للخادم وحده.** لو نالها العميل لاستطاع حرقَ حدِّ عنوانٍ آخر بإغراقه
-- (منعُ خدمةٍ موجَّه)، أو استنزافَ حدّ نفسه بلا مرور بالبوّابة.
revoke all on function public.gate_admit(text, text, int) from public, anon, authenticated;
grant execute on function public.gate_admit(text, text, int) to service_role;

comment on function public.gate_admit(text, text, int) is
  'حدّ لكل عنوان شبكة لكل فعل، نافذة ساعة متدحرجة. تناديها الطرفية بمفتاح الخدمة وحدها.';
