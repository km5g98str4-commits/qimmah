# P12 — خط أصول GIF للأجهزة (Asset Pipeline)

حالة تغطية GIF لكتالوج الأجهزة المعتمد (P12) + خطة الجلب على جهاز الـ Mac المتصل.
البيئة التي أُعدّ فيها هذا الملف بلا إنترنت — **كل الجلب يُنفَّذ يدويًا على الـ Mac** بالأوامر أدناه.

## الخلاصة

| البند | العدد |
| --- | --- |
| المطلوب الكلي (38 جهاز كتالوج + 35 بديلًا فريدًا) | **73** |
| مغطّى (ملف GIF موجود فعلًا) | **29** |
| ناقص (يُجلب من WorkoutX) | **46** |

- المفاتيح في `src/data/exerciseGifs.ts` **قانونية** (canonical): 8 ملفات بقيت بأسمائها القديمة
  (مثل `hack-squat.gif`) ويشير إليها المعرّف القانوني (`hack-squat-machine`) — صفر إعادة تسمية،
  صفر إعادة تنزيل.
- المصدر الآلي لهذا التقرير: `node scripts/p12-gif-manifest.mjs` (يفشل بتحذير STOP إن تجاوزت
  الخطة 150 طلبًا).

## حساب ميزانية الطلبات

- الافتراض المحافظ: **2 طلب لكل GIF** (بحث بالاسم + تنزيل الملف).
- المخطّط بالضبط: **46 × 2 = 92 طلبًا ≤ السقف الصارم 150** ✅
- ملاحظة من تجربة P5 (`scripts/fetch-workoutx-media.mjs`): تنزيل ملف الـ gif يتم من CDN بلا
  مفتاح ولا يُحتسب غالبًا على الحصّة — أي أن الاستهلاك الفعلي المرجّح **≈ 46 طلبًا فقط**.
- المفتاح لديه ~367 طلبًا متبقيًا مدى الحياة؛ سكربت الجلب يحمل عدّادًا جاريًا يتوقّف صلبًا عند 150.
- `pendulum-squat-machine` قد لا يوجد في WorkoutX أصلًا — السكربت يتخطّاه ويسجّله بلا فشل.

## أوامر التنفيذ على الـ Mac (بالترتيب)

```bash
cd ~/path/to/gym-os-template            # جذر المشروع (فرع claude/p12-a4-asset-pipeline)
export WORKOUTX_API_KEY=xxxx            # المفتاح من البيئة فقط — لا يُكتب في أي ملف

bash scripts/p12-fetch-gifs.sh --dry-run   # بلا شبكة: راجع الخطة (46 عنصرًا، 92 طلبًا)
# راجع المخرجات — ثم نفّذ الجلب الفعلي:
bash scripts/p12-fetch-gifs.sh             # idempotent: يتخطّى أي ملف موجود

node scripts/p12-sync-gifs.mjs             # يعيد توليد src/data/exerciseGifs.ts من الملفات
npm run build                              # يجب أن يمرّ بلا أخطاء

git add public/exercise-gifs src/data/exerciseGifs.ts
git commit -m "P12: جلب GIF الأجهزة الناقصة من WorkoutX + مزامنة الخريطة"
```

- إن ظهر «Pillow غير مثبّت»: `pip3 install pillow` ثم أعد التشغيل.
- إعادة تشغيل `p12-fetch-gifs.sh` آمنة دائمًا (skip-if-exists) — تجلب فقط ما تبقّى.
- العناصر «غير موجود» في الخلاصة النهائية متوقّعة لبعض الأجهزة النادرة — تُترك للـ fallback
  الأنيق في الواجهة (صورة ثابتة/أيقونة).

## القائمة الناقصة (46)

> تحديث مراجعة زياد: أُضيف `cable-shoulder-press` (بديل كيبل لجهاز ضغط الكتف) و`sissy-squat` (بديل عزل الكوادز لجهاز مد الأرجل).

مرتّبة أبجديًا — نفسها المثبّتة داخل `scripts/p12-fetch-gifs.sh`:

- `ab-crunch-machine` — Ab Crunch Machine
- `assisted-dip-machine` — Assisted Dip Machine
- `cable-hammer-curl` — Cable Hammer Curl
- `cable-hip-adduction` — Cable Hip Adduction
- `cable-overhead-extension` — Cable Overhead Extension
- `cable-shoulder-press` — Cable Shoulder Press
- `cable-woodchop` — Cable Woodchop
- `chest-supported-row` — Chest-Supported Row
- `chest-supported-row-machine` — Chest-Supported Row Machine
- `close-grip-pulldown` — Close-Grip Pulldown
- `decline-dumbbell-press` — Decline Dumbbell Press
- `dumbbell-kickback` — Dumbbell Kickback
- `dumbbell-rdl` — Dumbbell Romanian Deadlift
- `dumbbell-sumo-squat` — Dumbbell Sumo Squat
- `face-pull` — Face Pull
- `glute-drive-machine` — Glute Drive Machine
- `glute-kickback-machine` — Glute Kickback Machine
- `goblet-squat` — Goblet Squat
- `hip-adductor-machine` — Hip Adductor Machine
- `incline-cable-fly` — Incline Cable Fly
- `incline-chest-press-machine` — Incline Chest Press Machine
- `incline-dumbbell-press` — Incline Dumbbell Press
- `iso-lateral-chest-press` — Iso-Lateral Chest Press
- `iso-lateral-high-row` — Iso-Lateral High Row
- `iso-lateral-incline-press` — Iso-Lateral Incline Press
- `iso-lateral-pulldown` — Iso-Lateral Pulldown
- `lat-pulldown-machine` — Lat Pulldown Machine
- `lateral-raise` — Dumbbell Lateral Raise
- `lateral-raise-machine` — Lateral Raise Machine
- `leg-extension-machine` — Leg Extension Machine
- `leg-press-machine` — Leg Press Machine
- `lying-leg-curl` — Lying Leg Curl
- `pendulum-squat-machine` — Pendulum Squat Machine
- `rear-delt-row-machine` — Rear Delt Row Machine
- `reverse-pec-deck` — Reverse Pec Deck
- `seated-dumbbell-press` — Seated Dumbbell Press
- `seated-row-machine` — Seated Row Machine
- `sissy-squat` — Sissy Squat
- `single-arm-cable-row` — Single-Arm Cable Row
- `single-arm-lat-pulldown` — Single-Arm Lat Pulldown
- `single-leg-calf-raise` — Single-Leg Calf Raise
- `standing-hip-extension-machine` — Standing Hip Extension Machine
- `standing-leg-curl` — Standing Leg Curl
- `triceps-extension-machine` — Triceps Extension Machine
- `wide-grip-iso-lateral-pulldown` — Wide-Grip Iso-Lateral Pulldown
- `wide-grip-lat-pulldown` — Wide-Grip Lat Pulldown

## جدول التغطية الكامل (73)

| المعرّف القانوني | النوع | الاسم العربي | الاسم الإنجليزي | الملف موجود؟ | المسار |
| --- | --- | --- | --- | --- | --- |
| `ab-crunch-machine` | جهاز | جهاز طحن البطن | Ab Crunch Machine | ❌ | — |
| `assisted-dip-machine` | جهاز | جهاز غطس مساعد | Assisted Dip Machine | ❌ | — |
| `bodyweight-calf-raise` | بديل | رفع السمانة وزن الجسم | Bodyweight Calf Raise | ✅ | `/exercise-gifs/bodyweight-calf-raise.gif` |
| `bodyweight-squat` | بديل | سكوات وزن الجسم | Bodyweight Squat | ✅ | `/exercise-gifs/bodyweight-squat.gif` |
| `cable-biceps-curl` | جهاز | مرجحة بايسبس كيبل | Cable Biceps Curl | ✅ | `/exercise-gifs/cable-curl.gif` |
| `cable-crossover` | بديل | تفتيح كيبل | Cable Crossover | ✅ | `/exercise-gifs/cable-crossover.gif` |
| `cable-crunch` | جهاز | طحن بالكيبل | Cable Crunch | ✅ | `/exercise-gifs/cable-crunch.gif` |
| `cable-hammer-curl` | بديل | تمرير مطرقة كيبل (حبل) | Cable Hammer Curl | ❌ | — |
| `cable-hip-adduction` | بديل | ضم الفخذ كيبل | Cable Hip Adduction | ❌ | — |
| `cable-kickback` | بديل | رفسة كيبل للجلوت | Cable Kickback | ✅ | `/exercise-gifs/cable-kickback.gif` |
| `cable-lateral-raise` | بديل | رفرفة جانبي كيبل | Cable Lateral Raise | ✅ | `/exercise-gifs/cable-lateral-raise.gif` |
| `cable-overhead-extension` | بديل | تمديد ترايسبس علوي كيبل | Cable Overhead Extension | ❌ | — |
| `cable-pull-through` | بديل | سحب بين الأرجل كيبل | Cable Pull-Through | ✅ | `/exercise-gifs/cable-pull-through.gif` |
| `cable-triceps-pushdown` | جهاز | دفع ترايسبس كيبل | Cable Triceps Pushdown | ✅ | `/exercise-gifs/triceps-pushdown.gif` |
| `cable-woodchop` | بديل | قطع الخشب كيبل | Cable Woodchop | ❌ | — |
| `chest-press-machine` | جهاز | جهاز ضغط الصدر | Chest Press Machine | ✅ | `/exercise-gifs/chest-press-machine.gif` |
| `chest-supported-row` | بديل | تجديف بإسناد الصدر | Chest-Supported Row | ❌ | — |
| `chest-supported-row-machine` | جهاز | تجديف بمسند صدر | Chest-Supported Row Machine | ❌ | — |
| `close-grip-pulldown` | بديل | سحب قبضة ضيقة | Close-Grip Pulldown | ❌ | — |
| `concentration-curl` | بديل | تمرير مركّز | Concentration Curl | ✅ | `/exercise-gifs/concentration-curl.gif` |
| `crunch` | بديل | كرنش | Crunch | ✅ | `/exercise-gifs/crunch.gif` |
| `decline-chest-press-machine` | جهاز | جهاز ضغط صدر سفلي | Decline Chest Press Machine | ✅ | `/exercise-gifs/decline-machine-press.gif` |
| `decline-dumbbell-press` | بديل | بنش منخفض دمبل | Decline Dumbbell Press | ❌ | — |
| `dumbbell-bench-press` | بديل | بنش بريس دمبل | Dumbbell Bench Press | ✅ | `/exercise-gifs/dumbbell-bench-press.gif` |
| `dumbbell-curl` | بديل | تمرير دمبل | Dumbbell Curl | ✅ | `/exercise-gifs/dumbbell-curl.gif` |
| `dumbbell-kickback` | بديل | ركلة ترايسبس دمبل | Dumbbell Kickback | ❌ | — |
| `dumbbell-rdl` | بديل | رفعة رومانية دمبل | Dumbbell RDL | ❌ | — |
| `dumbbell-row` | بديل | تجديف دمبل | Dumbbell Row | ✅ | `/exercise-gifs/dumbbell-row.gif` |
| `dumbbell-sumo-squat` | بديل | سكوات سومو دمبل | Dumbbell Sumo Squat | ❌ | — |
| `face-pull` | بديل | سحب للوجه كيبل | Face Pull | ❌ | — |
| `glute-bridge` | بديل | جسر الجلوت | Glute Bridge | ✅ | `/exercise-gifs/glute-bridge.gif` |
| `glute-drive-machine` | جهاز | جهاز دفع الألوية | Glute Drive Machine | ❌ | — |
| `glute-kickback-machine` | جهاز | جهاز ركل خلفي | Glute Kickback Machine | ❌ | — |
| `goblet-squat` | بديل | سكوات جوبليت دمبل | Goblet Squat | ❌ | — |
| `hack-squat-machine` | جهاز | هاك سكوات جهاز | Hack Squat Machine | ✅ | `/exercise-gifs/hack-squat.gif` |
| `hip-adductor-machine` | جهاز | جهاز ضم الفخذ | Hip Adductor Machine | ❌ | — |
| `incline-cable-fly` | بديل | تفتيح كيبل مائل | Incline Cable Fly | ❌ | — |
| `incline-chest-press-machine` | جهاز | جهاز ضغط صدر علوي | Incline Chest Press Machine | ❌ | — |
| `incline-dumbbell-press` | بديل | بنش مائل دمبل | Incline Dumbbell Press | ❌ | — |
| `iso-lateral-chest-press` | جهاز | ضغط صدر أيزو-لاترال | Iso-Lateral Chest Press | ❌ | — |
| `iso-lateral-high-row` | جهاز | تجديف عالي أيزو-لاترال | Iso-Lateral High Row | ❌ | — |
| `iso-lateral-incline-press` | جهاز | ضغط علوي أيزو-لاترال | Iso-Lateral Incline Press | ❌ | — |
| `iso-lateral-pulldown` | جهاز | سحب أيزو-لاترال | Iso-Lateral Pulldown | ❌ | — |
| `lat-pulldown-machine` | جهاز | جهاز سحب علوي | Lat Pulldown Machine (Seated/Lever) | ❌ | — |
| `lateral-raise` | بديل | رفرفة جانبي دمبل | Lateral Raise | ❌ | — |
| `lateral-raise-machine` | جهاز | جهاز رفرفة جانبية | Lateral Raise Machine | ❌ | — |
| `leg-extension-machine` | جهاز | جهاز مد الأرجل | Leg Extension Machine | ❌ | — |
| `leg-press-machine` | جهاز | جهاز دفع الأرجل | Leg Press Machine | ❌ | — |
| `lying-leg-curl` | جهاز | ثني أرجل مستلقي | Lying Leg Curl | ❌ | — |
| `overhead-triceps-extension` | بديل | تمديد ترايسبس علوي دمبل | Overhead Triceps Extension | ✅ | `/exercise-gifs/overhead-triceps-extension.gif` |
| `pendulum-squat-machine` | جهاز | سكوات البندول | Pendulum Squat Machine | ❌ | — |
| `preacher-curl-machine` | جهاز | جهاز مرجحة بايسبس | Preacher Curl Machine | ✅ | `/exercise-gifs/preacher-curl.gif` |
| `rear-delt-fly` | بديل | رفرفة خلفي دمبل | Rear Delt Fly | ✅ | `/exercise-gifs/rear-delt-fly.gif` |
| `rear-delt-row-machine` | جهاز | تجديف كتف خلفي | Rear Delt Row Machine | ❌ | — |
| `reverse-pec-deck` | جهاز | بيك دك عكسي | Reverse Pec Deck | ❌ | — |
| `rope-pushdown` | بديل | دفع ترايسبس حبل | Rope Pushdown | ✅ | `/exercise-gifs/rope-pushdown.gif` |
| `seated-cable-row` | بديل | تجديف كيبل جالس | Seated Cable Row | ✅ | `/exercise-gifs/seated-cable-row.gif` |
| `seated-calf-raise-machine` | جهاز | رفع بطات جالس | Seated Calf Raise Machine | ✅ | `/exercise-gifs/seated-calf-raise.gif` |
| `seated-dumbbell-press` | بديل | ضغط كتف دمبل جالس | Seated Dumbbell Press | ❌ | — |
| `seated-leg-curl` | جهاز | ثني أرجل جالس | Seated Leg Curl | ✅ | `/exercise-gifs/seated-leg-curl.gif` |
| `seated-row-machine` | جهاز | جهاز تجديف جالس | Seated Row Machine | ❌ | — |
| `shoulder-press-machine` | جهاز | جهاز ضغط كتف | Shoulder Press Machine | ✅ | `/exercise-gifs/shoulder-press-machine.gif` |
| `single-arm-cable-row` | بديل | تجديف كيبل بذراع واحدة | Single-Arm Cable Row | ❌ | — |
| `single-arm-lat-pulldown` | جهاز | سحب علوي بذراع واحدة | Single-Arm Lat Pulldown | ❌ | — |
| `single-leg-calf-raise` | بديل | رفع السمانة برجل واحدة | Single-Leg Calf Raise | ❌ | — |
| `standing-calf-raise-machine` | جهاز | رفع بطات واقف | Standing Calf Raise Machine | ✅ | `/exercise-gifs/standing-calf-raise.gif` |
| `standing-hip-extension-machine` | جهاز | مد ورك واقف | Standing Hip Extension Machine | ❌ | — |
| `standing-leg-curl` | جهاز | ثني أرجل واقف | Standing Leg Curl | ❌ | — |
| `straight-arm-pulldown` | بديل | سحب بذراع ممدودة كيبل | Straight-Arm Pulldown | ✅ | `/exercise-gifs/straight-arm-pulldown.gif` |
| `t-bar-row-machine` | جهاز | جهاز تجديف تي-بار | T-Bar Row Machine | ✅ | `/exercise-gifs/t-bar-row.gif` |
| `triceps-extension-machine` | جهاز | جهاز مد ترايسبس | Triceps Extension Machine | ❌ | — |
| `wide-grip-iso-lateral-pulldown` | جهاز | سحب أيزو-لاترال واسع | Wide-Grip Iso-Lateral Pulldown | ❌ | — |
| `wide-grip-lat-pulldown` | جهاز | سحب علوي قبضة واسعة | Wide-Grip Lat Pulldown | ❌ | — |

## ملاحظات تحقّق (P12-A4)

- `lat-pulldown-machine`: **ناقص فعلًا** — لا يوجد `lat-pulldown.gif` ضمن ملفات P5 الستّين
  (خلافًا لما ورد في موجز المهمة)، لذا هو ضمن قائمة الجلب.
- `machine-lateral-raise` (القديم) لا يملك gif — لذا `lateral-raise-machine` ناقص (مؤكَّد).
- `machine-row` و`low-row-machine` كلاهما غائب عن خريطة gif القديمة — لا تعارض مفاتيح عند
  إعادة التقنين على `seated-row-machine` (مؤكَّد).
- `lying-leg-curl`, `face-pull`, وكل عناصر `iso-lateral-*` الجديدة: ناقصة (مؤكَّد).
