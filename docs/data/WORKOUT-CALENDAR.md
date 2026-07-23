# تقويم التمرين الأسبوعي (P4) — العقد المكتوب

**الوحدة:** `src/lib/workoutCalendar.ts` · **المفتاح:** `qimmah:workoutCalendar:v1` (مسجّل في `userDataKeys.ts`، يُمسح عند تبديل الحساب، مُصدَّر في النسخة الاحتياطية عبر سجلّ النقل) · **الإثبات:** `npm run test:calendar` (٥١ فحصًا).

## ماذا تغيّر (ولماذا)

قبل P4 كان يوم التمرين يُختار بتدويرٍ أعمى: `getDay() % plan.days.length` — لا أيام راحة حقيقية، ولا اختيار لأيام الأسبوع، وجدول «الروتين» في التخصيص عرضي فقط. الآن:

1. **جدول أسبوعي حقيقي**: خريطة يوم أسبوع (0=الأحد … 6=السبت) → فهرس يوم خطة أو `'rest'`.
2. **يوم الراحة يُعاد بصدق**: `scheduledDayFor` تُرجع `{ type: 'rest' }`، والنموذجان `todayV2Model` و`workoutV2Model` يعكسانه (`restDay: true` + `workoutAvailable/available = false`) بدل تدوير يومٍ زائف.
3. **تقسيمات مسمّاة فقط**: `full_body` (١–٣ أيام) · `upper_lower` (٤) · `upper_lower_focus` (٥) · `push_pull_legs` (٦–٧) — تُشتق من عدد الأيام ولا تُخترع تقسيمة. محتوى الأيام نفسه يبقى ملك `planGenerator` (بما فيه التقسيمات المتقدّمة أرنولد/برو — التقويم يجدول *أيامها* فقط).
4. **اليوم الفائت قرارٌ صريح** (القاعدة D): الاكتشاف دالة نقية تُرجع Decision للواجهة؛ لا شيء يتغيّر إلا عبر `applyMissedDecision` باختيار المستخدم.
5. **حارس الاستشفاء**: منع التتابع المخالف لقواعد التقسيمة (انظر الجدول أدناه).
6. **هجرة آمنة**: خطط المستخدمين الحالية تُشتق لها جداول عبر `runMigration` (idempotent + snapshot + rollback). **بلا جدول مضبوط** يبقى السلوك القديم (التدوير) احتياطًا موثّقًا — `todayPlanDay` وُسم `@deprecated`.

## سطح الـAPI (مصمَّم للتخصيص المستقبلي دون بنائه)

```ts
// — الحلّ اليومي (بديل todayPlanDay) —
scheduledDayFor(plan: WorkoutPlan, date?: Date): ScheduledDay | undefined
// { type:'training', source:'schedule'|'override'|'legacy-rotation', planDayIndex, day }
// | { type:'rest', source:'schedule' } — undefined فقط حين لا خطة.

// — الاقتراح والاختيار (API فقط؛ الواجهة شأن Codex) —
namedSplitForDays(days: number): NamedSplit
suggestedTrainingWeekdays(days: number, weekStart?: 6 | 0): number[]   // نمط TRAIN_PATTERN
suggestedSchedule(plan, days, weekStart?): WeeklySchedule              // يمرّ على الحارس دائمًا
setTrainingWeekdays(plan, weekdays: number[], weekStart?): SaveScheduleResult
saveWeeklySchedule(schedule): SaveScheduleResult                        // يرفض المخالفات
loadWeeklySchedule(): WeeklySchedule | null                             // null ⇒ احتياط التدوير
clearWeeklySchedule(): void

// — الحارس —
validateSchedule(schedule): ScheduleViolation[]   // نصوص ثنائية ar/en جاهزة للعرض
longestTrainingRun(weekdays): number              // دائري (يلتقط جمعة→سبت)

// — اليوم الفائت (القاعدة D) —
detectMissedDay(schedule, plan, finishedDates: string[], today?): MissedDayDecision | null
applyMissedDecision(decision, resolution, today?): ApplyMissedResult
// resolution: {choice:'move_to_next'} | {choice:'skip'} | {choice:'reschedule', toDate}

// — الهجرة —
ensureCalendarMigrated(): { status: 'done' | 'skipped' | 'rolled-back' }  // كسولة عند أول قراءة
```

نقاط الامتداد المستقبلية (بلا بناء الآن): `WeeklySchedule.source` يميّز الهجرة عن ضبط المستخدم، `overrides` بتاريخ اليوم تسمح بجلسات لمرّة واحدة (أساس أي تخصيص لاحق)، و`weekStart` يفصل تفضيل عرض الأسبوع عن منطق الجدولة.

## قواعد الحارس (منع ٣+ أيام متتالية حين يخالف الاستشفاء)

| التقسيمة | الحد الأقصى للتتابع | لماذا |
|---|---|---|
| `full_body` | ٢ | نفس العضلات كل جلسة — ٣+ متتالية مخالفة استشفاء |
| `upper_lower` / `upper_lower_focus` | ٣ | التناوب (ع/س/ع) مقبول؛ ٤ متتالية مرفوضة |
| `push_pull_legs` | ٦ | الدورة مصمّمة للتتابع |

- الحساب **دائري** (الجمعة→السبت تتابعٌ عبر حدود الأسبوع).
- ٧ أيام بلا أي راحة = مخالفة `no-rest-day` دائمًا (الحفظ يُرفض؛ هجرةُ مستخدمٍ قديمٍ بجدول ٧ أيام تكتب مباشرة حفاظًا على سلوكه، والمخالفة تبقى مرئية للواجهة عبر `validateSchedule`).
- الاقتراحات الافتراضية (`suggestedSchedule`) تمرّ على الحارس لكل الأعداد ١–٦ (مُثبَت بالإثبات).

## دلالات اليوم الفائت

- **الاكتشاف**: أحدث يوم تدريب خلال آخر ٦ أيام بلا جلسة منتهية وبلا قرار مسجّل. دالة نقية — `finishedDates` تُمرَّر صراحة (المصدر: `getWorkoutSessions()` → التواريخ ذات `finishedAt`).
- **move_to_next**: تجاوز ليوم واحد على أقرب يوم تدريب قادم (يحلّ محلّ يومه المعتاد)؛ الأسبوع يستأنف خريطته بعده — لا إزاحة متسلسلة.
- **skip**: تسجيل فقط؛ الجدول لا يتغيّر.
- **reschedule**: نقلٌ ليوم راحةٍ خلال ٧ أيام؛ يُرفض فوق يوم تدريب أو عند خلق تتابع مخالف (الفحص تقريبٌ أسبوعي موثّق: يوم الهدف يُحتسب تدريبًا في خريطة الأسبوع).

## عقد الواجهة (لـCodex — لا واجهة بُنيت في هذه الموجة)

1. **شاشة اليوم/التمرين**: اقرأ `restDay` من النموذجين. `restDay=true` ⇒ اعرض حالة راحة صادقة (لا زرّ «ابدأ التمرين»). نصوص البطل الحالية في `todayV2Model` تغطي يوم الراحة فعلًا («يوم راحة — تغذيتك تصنع الفرق»).
2. **اختيار أيام الأسبوع** (شاشة إعداد/تعديل): ابدأ من `suggestedTrainingWeekdays` واعرضها قابلة للتبديل؛ احفظ عبر `setTrainingWeekdays` واعرض `violations[].messageAr/messageEn` عند الرفض. لا تتجاوز الرفض.
3. **بطاقة اليوم الفائت**: عند فتح «اليوم»، مرّر تواريخ الجلسات المنتهية لـ`detectMissedDay`؛ إن رجع Decision اعرض الخيارات الثلاثة **كاقتراح** ونفّذ اختيار المستخدم عبر `applyMissedDecision`. لا تنفّذ شيئًا تلقائيًا.
4. **ملاحظة تكامل لاحقة**: `notifications/planWeek` ما زال يقرأ جدول «الروتين» العرضي من التخصيص؛ توحيده على `loadWeeklySchedule` مرشَّح لموجة لاحقة (خارج نطاق P4).

## حالات الحدود المثبتة

- تغيّر المنطقة الزمنية: الحلّ يتبع **اليوم المحلي** للجهاز حتميًا (نفس اللحظة UTC قد تكون تدريبًا في منطقة وراحةً في أخرى — مقصود وموثّق).
- خطة فارغة → `undefined`؛ فهارس أيام الخطة تُطبَّق mod عدد أيامها (جدول ٤ أيام فوق خطة ٣ أيام آمن).
- الهجرة لا تكتب شيئًا بلا خطة محفوظة، ولا تدوس جدولًا ضبطه المستخدم، وإعادة تشغيلها `skipped` (idempotent ×٢ مُثبَتة).
