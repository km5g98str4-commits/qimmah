# Qimmah Decisions Log

## RESUME — Agent 5 Trust/QA — 2026-06-29
- done: full trust/QA pass on `integration/phase1-smart-foundation`. 5 P1 fixes
  applied (reset key coverage, CustomizationCenter chip/save validation, founder
  name placeholder, progress-photo claim removal, privacy/terms safe back).
  QA report written (`PHASE1_QA_REPORT.md`). build + lint + typecheck all green.
- in_progress: committing + pushing feature branch.
- next: push `claude/phase1-trust-cleanup-qa-he6a0w`; integration agent merges.
- branch_state: `claude/phase1-trust-cleanup-qa-he6a0w` (rebased onto
  `origin/integration/phase1-smart-foundation`), to be committed + pushed.

## Agent 5 — Trust / Cleanup / Regression QA (Phase 1)

- **مفاتيح إعادة الضبط (`resetQimmah`)**: تقرّر أن «إعادة الضبط» يجب أن تمسح **كل**
  مفاتيح `qimmah:*` المستخدمة في الكود، بما فيها مصدر الحقيقة للإعداد
  (`qimmah:onboarding:profile:v1`)، تفضيلات التذكير (`qimmah:reminders:v1`)،
  بيانات المزامنة (`qimmah:sync:meta:v1`)، وجلسة Supabase المحليّة
  (`qimmah:supabase-auth:v1`). المبرّر: ترك أي مفتاح يعني بقاء بيانات قديمة بعد
  «إعادة ضبط كامل»، وهو ما يكسر الثقة. إعادة الضبط تُعيد تحميل الصفحة، فمسح مفتاح
  الجلسة آمن (يُعاد البدء نظيفًا؛ Supabase غير مضبوط في القالب أصلًا).
- **حارس الشِّيپس في `CustomizationCenter`**: تقرّر قفل القفز للأمام عبر شِيپس
  الخطوات عند أول خطوة مطلوبة ناقصة، مع السماح بالرجوع للخلف بحرّية، وتعطيل زر
  الإكمال حتى تكتمل كل الخطوات المطلوبة. المبرّر: منع إكمال الإعداد ببيانات غير
  صالحة (كان زر «التالي» محروسًا بينما الشِّيپس و`saveAndClose` غير محروسَين).
- **placeholder الاسم**: تقرّر إزالة اسم المؤسّس «زياد» من placeholders الحقول
  (`StepWelcome`, `StepBasics`) واستبداله بمثال محايد «محمد»، لأن القالب للبيع لا
  يجب أن يحمل اسمًا شخصيًا.
- **صور التقدّم**: تقرّر إزالة أي ادّعاء «رفع الصور قيد التطوير» من التدفّق الحقيقي
  (`ProgressSection` + نص الخصوصية)، لأن صور التقدّم خارج نطاق Phase 1 ولا يجب
  ادّعاء ميزة غير موجودة. أُبقي ضمان الخصوصية «على جهازك فقط».
- **رجوع الخصوصية/الشروط**: تقرّر الرجوع إلى آخر مسار داخلي مُلتقَط بدل
  `window.history.back()`، لمنع قذف المستخدم خارج التطبيق عند فتح الصفحة مباشرةً.
- **عدم حذف الكود الميّت**: `StepBasics`/فرع onboarding في `CustomizationCenter`
  غير مستخدَمَين حاليًا لكن لم يُحذفا (خارج نطاق QA؛ تعديل نصّي آمن فقط).
