# إنفاذ ختم البوّابة — رَنبوك التشغيل والسرّ

> هجرة `supabase/migrations/20260827120004_gateway_stamp_enforcement.sql`.
> إثبات: `scripts/attack/gateway-stamp-enforcement-attack.mjs` (`test:attack-gateway-enforcement`).
> **هذا الملف يشير إلى الميثاق ولا ينسخه** (§1.5). المرجع الحاكم لنموذج الوصول §0.1.

## ما الذي أُغلق

قبل الهجرة: البوّابة `qimmah-gateway` تسكّ ختم `x-qimmah-gate`، لكن **لا شيء في
القاعدة يتحقّق منه**. الطفرات الأربع تبقى ممنوحة لـ`authenticated`، فالمتصفّح
ينادي PostgREST مباشرةً متجاوزًا البوّابة (حدّ العنوان · سكّ الختم) كليًّا.

بعد الهجرة: الطفرات الأربع تُنفِّذ `perform private.gate_enforce('<action>')`
مباشرةً بعد فحص `auth.uid()`، فلا تُنفَّذ الطفرة إلا إذا حمل الطلب ختمًا:
1. هويّته من `auth.uid()` حصرًا (لا معرّف يقوله المستدعي)،
2. فعله يطابق فعل الـRPC،
3. `uid` الختم = `auth.uid()`،
4. نافذته حاليّة أو السابقة (١٢٠ ثانية لكلٍّ)،
5. HMAC-SHA256 صحيح على `action|uid|window` بالسرّ المشترك.

**الهوية لم تتغيّر**: الختم يقول «مررتُ بالبوّابة» لا «أنا فلان». `auth.uid()`
يبقى المصدر الوحيد للهوية.

## عقد السرّ — `QIMMAH_GATE_SECRET`

قيمةٌ واحدة تعيش في **موضعين** على staging، ولا تُكتب في المستودع إطلاقًا:

| الموضع | مَن يقرؤه | كيف |
|--------|----------|-----|
| **Supabase Vault** (`vault.decrypted_secrets`) باسم `qimmah_gate_secret` | القاعدة عبر `private.gate_secret()` (سياق المُعرِّف؛ لا يبلغ العميل — الخارج بوليان فقط) | `select vault.create_secret(...)` |
| **متغيّر بيئة الطرفية** `QIMMAH_GATE_SECRET` على `qimmah-gateway` | الطرفية عبر `readGatewayConfig` لسكّ الختم | لوحة Supabase → Edge Functions → Secrets |

- **٣٢ محرفًا فأكثر** (يفرضه الطرفان: `readGatewayConfig` و`gate_secret`).
- **قيمة staging مولَّدة، لا سرّ إنتاج.** لا تُشارك القيمة بين البيئتين.
- **فشلٌ مغلق**: غياب السرّ (لا vault، لا صفّ، أقصر من ٣٢) ⇒ `gate_secret()`
  تُعيد `null` ⇒ كل نداء مبوَّب يُرفض. لا مسار «تخطَّ التحقّق».
- **الحساب بلا pgcrypto**: `private.gate_hmac_sha256` مبنيّ على `sha256()` من
  النواة، مُثبَت مطابقًا بايتًا-ببايت لِـ`hmacHex` في عقد البوّابة (وWeb Crypto).

## خطوات staging (بيد من يملك الوصول — لا الوكيل)

> `odpkvswfiihrkglgfghd` فقط. **الإنتاج `ledlypcyrtnzvjvhykwz` لا يُمَسّ.**

```bash
# ١) ولّد سرًّا مخصّصًا لـstaging (٤٨ بايت hex = ٩٦ محرفًا)
GATE_SECRET=$(openssl rand -hex 48)

# ٢) طبّق الهجرة (بعد 20260827120003؛ لا تُعاد كتابة هجرة مطبَّقة)
supabase db push            # أو لصق الملف في محرّر SQL بترتيب اسمه

# ٣) ازرع السرّ في Vault (نفس القيمة) — محرّر SQL بدور الخدمة:
#    select vault.create_secret('<GATE_SECRET>', 'qimmah_gate_secret',
#           'HMAC key shared with qimmah-gateway env QIMMAH_GATE_SECRET');

# ٤) اضبط بيئة الطرفية بنفس القيمة، ثم انشرها
supabase secrets set QIMMAH_GATE_SECRET="$GATE_SECRET" \
  SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions deploy qimmah-gateway   # verify_jwt=true (من config.toml)

# ٥) أكّد أن القاعدة والطرفية يريان نفس السرّ (بلا كشفه):
#    select length(private.gate_secret()) >= 32;   -- t
#    والطرفية تُقلع بلا خطأ misconfigured في سجلّها.
```

## بوابة القبول على staging

بعد التطبيق والنشر، تُعاد الهجمات على القاعدة الحيّة (لا على صندوق):
نداء RPC مباشر بلا ختم · ختم مزوَّر · منتهٍ · إعادة عبر فعل · إعادة عبر مستخدم ·
نداء بوّابة صحيح. المصفوفة نفسها في `scripts/attack/gateway-stamp-enforcement-attack.mjs`،
وتُطابِق المتوقَّع: كلّ التفاف مرفوض، والنداء الصحيح وحده يمرّ.

## الحدّ المعلَن (لا يُقرأ حصنًا)

الختم يُلزم المرور بالبوّابة **ضمن نافذته** (≤٢٤٠ ثانية). مهاجمٌ التقط ختمه
الصحيح يستطيع إعادته لنفس فعله ونفسه خلال النافذة متجاوزًا حدّ العنوان — لكنه
**لا يكسب سلطةً**: الضمانات الحقيقية (تجربة واحدة لكل هوية قانونية · أرضية
إنتروبيا الكود · حدّ الاسترداد لكل هوية · قيد السباق الفريد) تعيش في القاعدة
وتصمد بلا اعتماد على الختم. الختم **دفاعٌ في العمق** يغلق الالتفاف المجّاني، لا
بديلٌ عن تلك الضمانات.
