# Qimmah Follow-ups

## Agent 5 — Trust / Cleanup / Regression QA (Phase 1)

> كلها خارج نطاق Phase 1 / غير حاجبة. مُوثّقة بدل إصلاحها هنا (وكيل QA لا يفعل عمل ميزات).

1. **بذور التخصيص الافتراضي**: `getDefaultCustomization()` يبذر مكملات/وجبات
   افتراضية (مع جرعات) و`defaultSupplements`. التدفّق الحقيقي يفرّغها، لكن يُفضّل
   فصلها صراحةً كـ«demo seed» أو تفريغها في الافتراضي لتقليل خطر التسرّب مستقبلًا.
2. **عنصر التزام `progress-photo`**: باقٍ في `data/commitmentLibrary.ts` كالتزام
   ذاتي يفعله المستخدم (لا يدّعي التطبيق تخزين صور). قرار منتج: إبقاؤه أم إزالته مع
   بقيّة نطاق صور التقدّم في مرحلة لاحقة.
3. **كود غير مُفعّل**: `StepBasics.tsx` غير مستورد في أي مكان، وفرع
   `onboardingSteps` في `CustomizationCenter` غير مُستدعى (الإعداد الأول صار
   `PlanBuilder`). يُنظر في حذفه بأمان ضمن تنظيف لاحق مخصّص.
4. **حجم الحزمة > 500KB**: تحذير بناء غير حاجب. تحسين أداء مستقبلي عبر
   code-splitting / manualChunks.
5. **النوع `MeasurementCategory='photo'`** في `types/progress.ts` باقٍ دون مدخل
   صورة فعلي — تنظيف نوعي عند حسم نطاق الصور.
