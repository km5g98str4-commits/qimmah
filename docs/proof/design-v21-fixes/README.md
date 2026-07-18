# إثبات تحسينات المطابقة البصرية — قِمّة v2.1

هذه اللقطات ناتجة من فرع `fix/design-fidelity-v21` عند viewport ثابت
`393×852`. البيانات مزروعة ببروفايل reviewer نفسه المستخدم في
`docs/audit/DESIGN-FIDELITY.md`.

المجلد `comparisons/` يحتوي 15 دليلاً جنبًا إلى جنب: صفحة التصميم المعتمدة
ثم الشاشة بعد الإصلاح.

## ما تغيّر

| الفجوة | المعالجة | الدليل |
|---|---|---|
| Welcome headline-first | تركيب mark-first مطابق لهرمية صفحة 4 | `01-welcome.png` |
| Today hero فاتح + chrome عالمي | Hero داكن حسب الحالة، وحذف الترويسة المكررة والرؤى الزائدة | `02`–`04-today-*.png` |
| Progress Brief فاتح | Brief Graphite مع إبقاء اللغة المتحوطة | `09-progress-home.png` |
| لا إدخال يدوي للخطوات | شاشة إدخال فعلية للإجمالي والهدف، مع المصدر وأسبوع مصغّر | `10b-progress-steps.png` |
| حفظ الخطوات غير مثبت | حفظ `9,300/11,000` كمصدر `manual` والتحقق من المتجر | `10c-progress-steps-saved.png` |
| Strength مزدحم | per-lift ladders فقط في العرض الأساسي كما في صفحة 13 | `11-progress-strength.png` |
| Profile مسطح | earned-identity header داكن يجمع الهوية والإحصاءات | `12-profile.png` |
| مركز التخصيص legacy | Momentum surface مدمج، خطوات زرقاء، كثافة أقل | `13-customization-center.png` |
| Settings legacy | سطح v2 جوال موحّد بلا AppNav/Footer تسويقيين | `14-settings.png` |

## بوابات التحقق

```bash
npm run typecheck
npm run build
npm run lint
npm run test:today-v2
npm run test:progress-v2
npm run test:native-bridge
npm run test:strength
```

اختبار المتصفح تحقّق من:

- كل لقطة عند `393×852`.
- `overflowX = 0` لكل 15 شاشة أساسية.
- `overflowX = 0` للمسارات Today/Progress/Profile/Customization/Settings عند
  عروض `320` و`768` و`1280` بكسل.
- حفظ الخطوات اليدوية في `qimmah:steps:v1`.
- حفظ الهدف في `qimmah:stepGoal:v1`.
- تسجيل المصدر `manual` في `qimmah:stepSource:v1`.

> سحب الوزن من HealthKit لم يُنقل إلى هذا النطاق؛ يبقى قرار موجة v1.1 كما هو
> موثّق في تقرير التدقيق، وليس regression في v2.1.
