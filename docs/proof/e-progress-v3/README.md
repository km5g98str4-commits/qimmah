# حارة E — توافق Progress مع v3.0

الموجة بصرية فقط على `ProgressV2` وتوابعها داخل الملف نفسه. لم يتغيّر نموذج
البيانات أو التخزين أو التنقّل.

## ما تثبته اللقطات

- نفس بيانات المراجعة الحتمية قبل التعديل وبعده.
- مقاس مرجع v3: `393 × 852`.
- العربية RTL والإنجليزية LTR.
- Ember صار لون التركيز والرسوم، Green للتقدّم المقاس، Amber للتقديرات،
  وBlue بقي للروابط القابلة للفعل.
- أزرار الرجوع صارت `44 × 44` نقطة، والأرقام الأساسية تستخدم خط البيانات.

## الملفات

- `before/progress-ar-393.png`
- `before/progress-en-393.png`
- `after/progress-ar-393.png`
- `after/progress-en-393.png`
- `after/weight-detail-ar-393.png`
- `after/weight-detail-en-393.png`
- `after/weight-log-ar-393.png`
- `after/weight-log-en-393.png`
- `after/strength-ar-393.png`
- `after/strength-en-393.png`

## الإثبات الآلي

```bash
node scripts/run-e-progress-v3-proof.mjs
```

يجب على المنسّق ربط الأمر أعلاه في `test:gate`؛ الحارة لا تعدّل
`package.json` حسب الميثاق.
