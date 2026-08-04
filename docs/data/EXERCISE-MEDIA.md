# كتالوج وسائط التمارين (P10) — العقد المكتوب

**المولّد:** `scripts/build-media-manifest.mjs` → **الناتج:** `src/data/exerciseMediaManifest.generated.ts` (لا يُحرَّر يدويًا)
**الواجهة:** `src/lib/exerciseMediaPipeline.ts` · **الإثبات:** `npm run test:media-pipeline` (٣ فحوص مولّد/grep + ١٥ فحص وحدة)

## التغطية (صادقة، مفروضة بالإثبات)

| الحالة | العدد | المعنى |
| --- | --- | --- |
| `stills` | **123 / 181** | إطارا بداية/نهاية حقيقيان مُلتزَمان في `public/exercise-images/<id>/{0,1}.jpg` |
| `placeholder-only` | 23 | بطاقات أجهزة تُعرض بالبديل الأنيق عمدًا (لا تُطابَق بصور وزن حرّ خاطئة) |
| `missing` | 35 | لا وسائط مطابقة بعد — القائمة كاملة في `MEDIA_MISSING_IDS` داخل الملف المُولَّد |

الناقص (35) أغلبه كارديو/إحماء/حركات شريط: `treadmill-run`, `stationary-bike`, `rowing-machine`, `elliptical`, `jump-rope`, `burpees`, `battle-ropes`, `assault-bike`, `outdoor-walk`, `stairmaster`, `mountain-climber`, `high-knees`, `bicycle-crunch`, `hollow-hold`, `toes-to-bar`, `wall-sit`, `cable-woodchop`, `pendlay-row`, `meadows-row`, `chest-supported-row`, `landmine-press`, `pike-push-up`, `single-arm-pushdown`, `belt-squat`, `single-leg-hip-thrust`, `banded-lateral-walk`, `frog-pump`, `cable-shoulder-press`, `incline-treadmill-walk`, `leg-swings`, `shoulder-dislocates`, `thoracic-rotation`, `ankle-mobility`, `dumbbell-sumo-squat`, `cable-hip-adduction`.

## شكل السجلّ (لكل تمرين من الـ 181 — لا حذف صامت)

```ts
interface ExerciseMediaManifestEntry {
  id: string
  status: 'stills' | 'placeholder-only' | 'missing'
  stillStart: { path, width, height, bytes } | null  // مقاسات مفحوصة من بايتات JPEG وقت التوليد
  stillEnd:   { path, width, height, bytes } | null
  gif: null    // بصدق — لا مصدر GIF نظيف الحقوق (أصول WorkoutX المُعلَّمة أُزيلت في P0)
  video: null  // بصدق — روابط «بحث يوتيوب» في exercises.ts ليست وسائط ولا تدخل الكتالوج أبدًا
  source: string | null       // مثل 'yuhonas/free-exercise-db'
  license: string | null      // من السجلّ المُراجَع، أو 'unverified' إذا لا صف له — لا يُخترع ترخيص
  attribution: string | null  // null حين الترخيص لا يتطلب نسبًا (Unlicense)
}
```

## الحقوق

- المصدر الوحيد حاليًا: **yuhonas/free-exercise-db** — ترخيص **Unlicense / ملكية عامة** (لا يتطلب نسبًا)، موثّق صفًا-صفًا في `scripts/media/provenance-manifest.json` (sha256 + magic-MIME لكل أصل، يفرضه `npm run test:media-rights`).
- المولّد يقرأ الحقوق من ذلك السجلّ حصرًا: أصل على القرص **بلا صف مُراجَع ⇒ `license: 'unverified'`** ويُكشف في الإثبات — لا اختراع أبدًا. (حاليًا: 0 غير مُتحقَّق — كل الـ 123 موثّقة.)
- `test:media-pipeline` يرفض أي ترخيص خارج المجموعة المُراجَعة، وأي رابط يوتيوب/`search_query` في أي حقل.

## الأحجام (لموازنة الأداء)

الإجمالي: **246 أصلًا ≈ 14.8 MB** (متوسط ~60KB). الغالب 850×567. أكبر 10:

| الأصل | المقاس | الحجم |
| --- | --- | --- |
| bulgarian-split-squat/1.jpg | 850×1275 | 140KB |
| bulgarian-split-squat/0.jpg | 850×1275 | 133KB |
| svend-press/0.jpg | 800×1200 | 115KB |
| svend-press/1.jpg | 800×1200 | 111KB |
| t-bar-row/0.jpg | 850×567 | 98KB |
| dumbbell-row/1.jpg | 850×567 | 97KB |
| dumbbell-row/0.jpg | 850×567 | 96KB |
| machine-curl/1.jpg | 850×567 | 95KB |
| machine-curl/0.jpg | 850×567 | 95KB |
| t-bar-row/1.jpg | 850×567 | 89KB |

## واجهة الاستهلاك (`src/lib/exerciseMediaPipeline.ts`)

```ts
getMediaManifestEntry(id): ExerciseMediaManifestEntry | undefined // يحلّ المعرّفات القديمة للقانونية
exerciseStillPair(id): { start, end } | null                      // زوج مركّب، null صادق لغير المغطّى

preloadNextExercise(id, deps?): string[]  // يسخّن إطارَي «التمرين التالي» فقط — خانة واحدة،
                                          // الاستدعاء الجديد يستبدل السابق (الذاكرة ≤ إطارين دائمًا)
getPreloadedExerciseId(): string | null
preloadedImageCount(): number             // الحارس يتأكد ≤ 2
clearPreloadedExercise(): void
```

## عقد Codex — ربط الواجهة (ممنوع عليّ لمس `src/views/*`)

1. **أثناء الجلسة:** عند عرض التمرين الحالي استدعِ `preloadNextExercise(nextId)` بمعرّف التمرين التالي في اليوم — **التالي فقط**، لا تمرّ على القائمة كلها (الإثبات يرفض أي تحميل جماعي).
2. **العرض المركّب:** `exerciseStillPair(id)` يعطي البداية/النهاية معًا للتلاشي المتبادل؛ `width/height` جاهزة لحجز مساحة العرض (منع layout shift) — لا تقس الصورة بعد التحميل.
3. **الاحتياط الصادق:** `null` من `exerciseStillPair` يعني placeholder-only أو missing — اعرض البديل الأنيق القائم (`ExerciseMedia` component fallback)، ولا تعرض صورة تمرين آخر أبدًا.
4. **لا تستورد الملف المُولَّد مباشرة في views** — مرّ عبر `exerciseMediaPipeline` كي يبقى حلّ المعرّفات القديمة موحّدًا.

## إعادة التوليد والحراسة

```bash
node scripts/build-media-manifest.mjs          # إعادة التوليد (بعد إضافة صور/تمارين)
node scripts/build-media-manifest.mjs --check  # فحص الانحراف فقط
npm run test:media-pipeline                    # الحارس الكامل (يشمل فحص الانحراف)
```

أي تغيير في `exercises.ts` أو `exerciseMedia.ts` أو الصور دون إعادة توليد يُفشل `test:media-pipeline` فورًا (فحص انحراف بايت-ببايت). حارسا الحقوق القائمان (`test:media-rights`, `proof:media`) يبقيان كما هما — هذا الكتالوج طبقة قراءة فوقهما لا بديل عنهما.
