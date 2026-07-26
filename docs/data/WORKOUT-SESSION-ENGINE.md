# محرّك حالة جلسة التمرين (P5) — العقد المكتوب

**الوحدة:** `src/lib/workoutSessionEngine.ts` (+ `notifications/restEnd.ts`) · **الإثبات:** `npm run test:session-engine` (٥٠ فحصًا) · طبقة بيانات نقية — `WorkoutV2.tsx` لم يُمسّ (الربط شأن Codex).

## حالة الجلسة

`WorkoutSession.status?: 'in_progress' | 'completed' | 'ended_early' | 'abandoned'`

- **اختيارية للتوافق الخلفي**: الغياب = جلسة قبل P5 → تُقرأ `completed` عند وجود `finishedAt` (عبر `sessionStatus(session)` — استخدمه دائمًا بدل قراءة الحقل مباشرة).
- تُختم تلقائيًا عند الحفظ: `persistFinishedSession` يصنّف (`classifyFinishedSession`) ما لم يمرَّر status صراحةً — **كل تمارين الجلسة مكتملة → completed، وإلا → ended_early**. جلسة بلا تمارين = ended_early.
- الإنهاء المبكر **يبقى مسموحًا بتأكيده القائم** — لم يتغيّر المسار، فقط صار مُسمًّى بصدق.
- المتجر (`historyStore.normalizeSession`) يحفظ status عبر جولة القراءة/الكتابة ويُسقط أي قيمة غير معروفة (مدخل معادٍ).

## اكتمال اليوم — تغيير السلوك الموثّق

**قبل P5**: أي جلسة لها `finishedAt` اليوم = «اليوم مكتمل» (todaysFinishedSession) → الإنهاء المبكر كان يقلب «اليوم» إلى afterWorkout («أنهيت تمرينك») زورًا.

**بعد P5**:

```ts
dayCompletion(date, sessions?): 
  | { state: 'complete', session }                       // جلسة completed فقط
  | { state: 'partial', partial: PartialDayInfo }        // ended_early — معلومات صادقة
  | { state: 'none' }
todaysCompletion()  // اليوم الحالي
// PartialDayInfo: { session, completedExercises, totalExercises, completedSets, totalSets, percent }
```

- `todayV2Model` عُدّل (طبقة بيانات): **completed فقط** → afterWorkout؛ ended_early → الحالة تبقى normal، عمود التدريب `active` بنسبة المجموعات المنجزة الحقيقية (أو يبقى `ready` عند 0% — لا حلقة فارغة). فحص موثّق أُضيف لإثبات today-v2 (⑧، 45→48 فحصًا) — لا فحص قديم تغيّر لأن الجلسات القديمة بلا status تبقى completed.
- `todaysFinishedSession` **مهجورة** لكنها تعمل بسلوكها القديم حرفيًا (أي finishedAt) للمستهلكين القدامى.
- `dailyLogs.workoutCompleted` بقيت مؤشّر «تمرّن هذا اليوم» (نشاط، تغذّي السلاسل) — الاكتمال الصادق مصدره `dayCompletion` وحده. مقصود لتحديد نطاق الانفجار؛ توحيدها قرار موجة لاحقة.

## الجلسة المهجورة (استعادة بعد قتل التطبيق)

```ts
classifyRestoredSession({ startedAt }, nowMs?, thresholdMs?)  // ≥8 ساعات ⇒ 'abandoned'
abandonedSessionFrom(active, model, { date, nowMs })          // جلسة قابلة للحفظ: status='abandoned'، بلا finishedAt
```

- **تصنيف فقط — لا حذف تلقائي أبدًا**: كل المجموعات المنفَّذة تبقى في الجلسة المبنية (مُثبَت). قرار الحفظ/العرض للواجهة (القاعدة D).
- المهجورة لا تُكمل اليوم ولا تُحسب جزئية منتهية.
- استعادة الجلسة الحديثة (`in_progress`) تبقى كما هي — منطق `isUsableSession` في WorkoutV2 لم يُمسّ.

## إشعار نهاية الراحة (`notifications/restEnd.ts` — يُعاد تصديره من المحرّك)

عقد الربط في WorkoutV2 (Codex):

| حدث الواجهة | النداء |
|---|---|
| بدء راحة (rest = { endsAt }) | `scheduleRestEndNotification(endsAt, lang)` |
| «+١٥ ثانية» (endsAt الجديد) | `scheduleRestEndNotification(newEndsAt, lang)` — الاستبدال مدمج |
| تخطّي الراحة / انتهاؤها في المقدّمة / إنهاء الجلسة | `cancelRestEndNotification()` |

- أحادي (one-shot، `schedule.at`) بالمعرّف **3600** ضمن `NOTIFICATION_ID_RANGES.restEnd` — فيلغيه `cancelKnown` عند كل مصالحة (تبديل حساب/استرداد): لا إشعار يتيم.
- حراسة مدمجة: `unsupported` على الويب (لا-شيء صامت)، `denied` بلا إذن، `skipped` لوقت مضى، لا يرمي أبدًا. النسخة ثنائية (ar «انتهت الراحة» / en «Rest is over») في `notificationCopy`.
- مؤقّت الراحة نفسه بقي على `endsAt` كما هو (لم يُمسّ).

## عقد شاشة الإنهاء/الانتقال (ما يحتاجه Codex بالضبط)

```ts
interface FinishCelebration {
  nextExerciseId: string | null   // معرّف فتحة التمرين التالي؛ null = الأخير → شاشة الإنهاء
  sessionStats: { exercises: number; sets: number; minutes: number; volume: number }
  prs: SessionPR[]                // من persistFinishedSession (تُحسب قبل الالتزام)
}
nextExerciseAfter(model, currentSlotId)   // انتقال «التالي» — بمعرّف الفتحة الثابت عبر الاستبدال
buildSessionStats(session)                // من المجموعات المنجزة فعلًا فقط
buildFinishCelebration({ session, prs, model?, currentSlotId? })
```

تسلسل الإنهاء الموصى به (يطابق مسار Rule D القائم): احسب المرشّحين بلا كتابة → عند التأكيد: `snapshotWorkoutStorage()` ثم `persistFinishedSession(session)` (يختم الحالة ويُرجع prs) ثم ابنِ `FinishCelebration` — والتراجع = `restoreWorkoutStorage(snapshot)`.

## ضمانات لم تتغيّر (تحرسها الإثباتات القائمة)

- التراجع snapshot/restore: finish-confirm 11 ✓ (+ فحوص ⑤ هنا مع الختم).
- الاستعادة بعد القتل + مؤقّت endsAt: active-session ✓.
- الحفظ المزدوج بنفس المعرّف = جلسة واحدة (idempotent في `saveWorkoutSession`) — مُثبَت؛ لم يحتج إصلاحًا.
- مجموعات/أوزان/أرقام الجلسات الجزئية تُحسب (exerciseHistory يسجّل المجموعات المنجزة حتى في ended_early) — مُثبَت.

---

## تحديث P14 (تقوية الطبقة الأصلية)

راجع `docs/audit/P14-NATIVE-HARDENING.md §3–§4` وعقد الربط في
`docs/audit/P13-CODEX-HANDOFF.md §P14`.

**الحقيقة الأهم:** كل ما في هذا العقد عن إشعار نهاية الراحة وعن الجلسة المهجورة **غير
موصول بالواجهة إطلاقًا** — `grep` لـ`scheduleRestEndNotification` /
`cancelRestEndNotification` / `classifyRestoredSession` يعطي **صفر** موضع استدعاء خارج
`src/lib/**` والبراهين. فلا إشعار راحة رنّ على جهاز قط، وجلسة عمرها ثلاثة أيام تُستأنف
كأنها جارية.

### إشعار نهاية الراحة — تغييرات العقد

- التوقيع صار `scheduleRestEndNotification(endsAt, lang, nowMs?, { ownerId })` و
  `cancelRestEndNotification({ ownerId })`. **مرّر `ownerId`** (نفس `userId` المستخدم في
  `qimmah:active-workout:v2:<owner>`) — الأثر المعلّق موسوم بالمالك.
- **إصلاح:** `endsAt` ماضٍ كان يعيد `'skipped'` **قبل** الإلغاء، فيبقى إشعار الراحة
  السابق معلّقًا ويرنّ بعد انتهاء الراحة. الإلغاء الآن يسبق فحص الوقت الماضي.
- **جديد:** أثر معلّق `qimmah:restEndPending:v1:<owner>` (فيه `endsAt` فقط، لا بيانات
  تمرين) + `reconcileRestEndOnColdStart({ ownerId, activeRestEndsAt, nowMs })` تُعيد
  `none | unsupported | kept | cleared-stale | cleared-orphan`. البائت يُلغى **ويُزال من
  مركز الإشعارات** (`removeDeliveredNotifications`).
- `releaseRestEndForSession(ownerId)` — نداء واحد للتخطّي/الإنهاء/التجاهل.

### مصالحة الإقلاع البارد — API جديدة

```ts
isUsableActiveWorkout(value, exerciseIds)          // توأم isUsableSession في طبقة البيانات
decideColdStart({ persisted, exerciseIds, nowMs, thresholdMs })   // نقية
reconcileWorkoutColdStart({ ownerId, exerciseIds, nowMs?, thresholdMs? })  // النداء الوحيد
isActiveWorkoutAlreadySaved(startedAt)             // حماية من الحفظ المزدوج
activeWorkoutKey(ownerId) · readPersistedActiveWorkout · clearPersistedActiveWorkout
```

`decideColdStart` تفرّق أخيرًا بين **`malformed`** (تُمسح فورًا، لا عمل فيها) و
**`plan-changed`** (**لا تُمسح** من طبقة البيانات، وتُبلّغ `completedSets` حتى تُحذّر
الواجهة قبل إسقاط عمل حقيقي — السلوك القائم في `WorkoutV2.tsx` يحذفها صامتة).
كما تحسب `restState: 'none'|'running'|'elapsed'` و`restRemainingSec` من `endsAt`.

**البرهان:** `npm run test:native-hardening` (٩٣ فحصًا؛ منها ٣٥ لهذين السطحين) —
مُسجَّل في `test:gate`. لا شيء منها متحقَّق على جهاز:
`docs/audit/DEVICE-NOT-VERIFIED.md §③–§④`.
