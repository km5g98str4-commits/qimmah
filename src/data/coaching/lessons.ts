// 40 educational micro-lessons (bodies stay simple MSA for scientific precision;
// titles + takeaways are white Saudi dialect per docs/content/DIALECT-TONE-GUIDE.md).
// Topics: progressive overload · rest · protein timing · sleep · plateaus ·
// deloads · hydration · soreness-vs-pain. Honesty: conservative, mainstream
// consensus only — no revenue promises, no hype, no medical claims.
import type { Lesson } from '@/lib/coaching/types'

export const LESSONS: Lesson[] = [
  // ── التحميل التدريجي (progressive overload) ──
  {
    id: 'overload-what',
    topic: 'overload',
    titleAr: 'وش هو التحميل التدريجي؟',
    bodyAr:
      'العضلة تنمو حين تواجه مقاومة أكبر ممّا اعتادته بشكل تدريجي ومنظّم، لا دفعة واحدة مفاجئة. هذا هو جوهر التحميل التدريجي. تستطيع الزيادة بطرق عدّة: وزن أعلى، أو تكرارات أكثر، أو جولات إضافية، أو راحة أقصر، أو أداء أنظف بمدى حركة أكمل. المفتاح أن يبقى التقدّم بطيئًا وثابتًا حتى يلاحق جسمك المطلوب دون إرهاق أو خطر إصابة. سجّل أوزانك وتكراراتك في كل جلسة حتى ترى اتجاه تقدّمك بوضوح، وتعرف متى تزيد ومتى تثبت. الصبر هنا جزء من الطريقة نفسها لا عائقًا أمامها.',
    takeawayAr: 'سجّل وزنك وتكراراتك اليوم عشان تعرف من وين تزيد الجلسة الجاية.',
    titleEn: 'What is progressive overload?',
    bodyEn:
      'Muscle adapts when it meets a demand slightly greater than it is used to, applied in small steps rather than all at once. That is progressive overload. Demand can rise in several ways: more weight, more repetitions, an extra set, shorter rest, or cleaner reps through a fuller range of motion. Keep the progression gradual so your body can adapt while you keep fatigue and injury risk low. Record your weights and repetitions each session, so you can see the trend and know when to push and when to hold.',
    takeawayEn: 'Log your weight and reps today so you know where to add next session.',
  },
  {
    id: 'overload-small-jumps',
    topic: 'overload',
    titleAr: 'زيادات صغيرة تفوز',
    bodyAr:
      'كثيرون يقفزون بالوزن قفزات كبيرة دفعة واحدة، فيفقدون الأداء النظيف ويعرّضون أنفسهم لخطر الإصابة. الأفضل زيادات صغيرة ومتدرّجة: كيلوغرام أو اثنان على التمارين المركّبة الكبيرة، وأقلّ من ذلك على تمارين العزل. حين تُتقن العدد المستهدف بأداء جيّد في كل جولاتك، ارفع الوزن قليلًا في الجلسة التالية فقط. وإن لم تكمل العدد، فابقَ على الوزن نفسه حتى تتقنه تمامًا. التقدّم الصغير المستمرّ يتراكم مع الأسابيع أكثر بكثير من القفزات المتهوّرة التي تتوقّف سريعًا وتترك أثرًا سيّئًا على ثقتك وأدائك.',
    takeawayAr: 'إذا أتقنت كل جولاتك بأداء نظيف، ارفع الوزن أقل زيادة متاحة بس.',
    titleEn: 'Small jumps win',
    bodyEn:
      'Large jumps in weight often cost you clean technique and raise injury risk. Smaller, gradual increases work better: roughly one to two kilograms on the big compound lifts, and less than that on isolation work. When you complete your target repetitions with good form across every set, add a small amount at the next session only. If you fall short, stay at the same weight until you own it. Small increases that keep coming add up over months far more than bold jumps that stall quickly.',
    takeawayEn: 'If every set felt clean, add the smallest jump available and nothing more.',
  },
  {
    id: 'overload-reps-first',
    topic: 'overload',
    titleAr: 'التكرارات قبل الوزن',
    bodyAr:
      'ليست الزيادة دائمًا في الوزن على القضيب. من الطرق الآمنة والفعّالة أن تثبّت الوزن وتزيد التكرارات ضمن نطاق مستهدف، مثلًا من ثمانية إلى اثني عشر تكرارًا. حين تصل إلى أعلى النطاق بأداء جيّد في كل الجولات، ارفع الوزن قليلًا وانزل إلى أسفل النطاق، ثم كرّر الصعود مرّة أخرى بصبر. هذه الطريقة تمنحك تقدّمًا واضحًا حتى في الأسابيع التي لا يتحرّك فيها الرقم على الميزان، وتحافظ على تحكّمك الكامل في الحركة وجودة أدائك. جرّبها على تمارينك الرئيسية أوّلًا ثم عمّمها.',
    takeawayAr: 'اختر نطاق تكرارات ثابت لكل تمرين، وتدرّج داخله قبل ما تزيد الوزن.',
    titleEn: 'Reps before weight',
    bodyEn:
      'Progression does not always mean more weight on the bar. Instead, hold the load steady and add repetitions inside a target range, for example eight to twelve. Once you reach the top of that range with good form on every set, add a small amount of weight and drop back to the bottom, then climb again. This gives you real progress even in weeks when the number on the scale does not move, and it protects your control over the movement. Use it on your main lifts first.',
    takeawayEn: 'Pick a fixed rep range for each lift and climb inside it before adding weight.',
  },
  {
    id: 'overload-track',
    topic: 'overload',
    titleAr: 'اللي ما ينقاس ما يتقدّم',
    bodyAr:
      'من دون تسجيل مكتوب، يصعب أن تعرف هل تتقدّم فعلًا أم تراوح مكانك منذ أسابيع. دوّن الوزن وعدد التكرارات لكل تمرين مهمّ، ولو باختصار شديد في دفتر أو تطبيق. مع مرور الأسابيع تكشف لك السجلّات اتجاهك الحقيقي، وتُظهر التمارين التي توقّف تقدّمها حتى تعالجها مبكّرًا. الأرقام أصدق من الإحساس اليومي الذي يتأثّر بالنوم والطعام والمزاج والضغط. لا تحتاج إلى تفاصيل معقّدة؛ يكفيك رقم واضح تقارنه لاحقًا بثقة. اجعل التسجيل عادة ثابتة تنهي بها كل جولة مهمّة في جلستك.',
    takeawayAr: 'سجّل أفضل جولة في كل تمرين رئيسي اليوم، وقارنها بعد أسبوعين.',
    titleEn: 'What you don\'t track, you can\'t improve',
    bodyEn:
      'Without a written record, it is hard to know whether you are progressing or repeating the same weeks. Note the weight and repetitions for every important lift, even briefly, in a notebook or an app. Over several weeks the log shows your real direction and reveals which lifts have stalled, so you can address them early. Numbers are more honest than daily feel, which shifts with sleep, food, mood and stress. You do not need complex detail. One clear number you can compare later is enough.',
    takeawayEn: 'Log your best set on each main lift today, then compare it in two weeks.',
  },
  {
    id: 'overload-patience',
    topic: 'overload',
    titleAr: 'التقدّم مو خط مستقيم',
    bodyAr:
      'لن تزيد في كل جلسة إلى ما لا نهاية، وهذا أمر طبيعي تمامًا. بعض الأسابيع تتقدّم فيها، وبعضها تثبت، وأحيانًا تتراجع قليلًا بسبب قلّة نوم أو ضغط أو طعام أقلّ من المعتاد. المهمّ هو اتجاه الأشهر لا تذبذب الأيام القصير. حين تثبت أرقامك مدّة طويلة رغم انضباطك، غيّر متغيّرًا واحدًا فقط: نطاق التكرارات، أو حجم التمرين، أو زمن راحتك. الصبر مع الانتظام يتفوّق دائمًا على الحماس المتقطّع الذي ينطفئ بسرعة. راقب الصورة الكبيرة واحكم عليها بهدوء ووعي.',
    takeawayAr: 'احكم على تقدّمك كل أربعة لستة أسابيع، مو من جلسة لجلسة.',
    titleEn: 'Progress isn\'t a straight line',
    bodyEn:
      'You will not add weight in every session forever, and that is completely normal. Some weeks you move forward, some weeks you hold, and sometimes you dip a little because of short sleep, stress, or eating less than usual. What matters is the direction across months, not the noise of a few days. If your numbers stall for a long stretch despite steady effort, change one variable only: the rep range, the training volume, or your rest time. Steady consistency beats bursts of enthusiasm that fade quickly.',
    takeawayEn: 'Judge your progress every four to six weeks, not session to session.',
  },

  // ── الراحة بين الجولات (rest) ──
  {
    id: 'rest-why',
    topic: 'rest',
    titleAr: 'ليه الراحة بين الجولات؟',
    bodyAr:
      'الراحة بين الجولات ليست وقتًا ضائعًا؛ ففيها يستعيد جسمك جزءًا من طاقته السريعة حتى تؤدّي الجولة التالية بقوّة وأداء نظيف. راحة قصيرة جدًا تُضعف جولاتك اللاحقة وتُنقص جودة تدريبك الكلّية، وراحة طويلة جدًا تُطيل جلستك بلا داعٍ حقيقي. اضبط زمن راحتك حسب هدف التمرين وثقله ونوعه، وراقب تنفّسك وإحساسك العامّ قبل أن تبدأ الجولة التالية. الهدف أن تعود إلى القضيب جاهزًا لأداء نظيف، لا منهكًا ولا باردًا تمامًا. اجعل راحتك أداة مقصودة تخدم جودة كل جولة تؤدّيها.',
    takeawayAr: 'انتظر لين يهدأ نفَسك وتحس إنك جاهز قبل الجولة الجاية.',
    titleEn: 'Why rest between sets?',
    bodyEn:
      'Rest between sets is not wasted time. During it your body restores part of the fast energy your muscles use, so the next set can be strong and clean. Very short rest weakens your later sets and lowers the quality of the session, while very long rest stretches the session with no real benefit. Set your rest by the goal, the load, and the type of exercise, and check your breathing before you start again. Aim to return ready to perform well, neither exhausted nor gone cold.',
    takeawayEn: 'Wait until your breathing settles and you feel ready for the next set.',
  },
  {
    id: 'rest-heavy',
    topic: 'rest',
    titleAr: 'راحة أطول للتمارين الثقيلة',
    bodyAr:
      'التمارين المركّبة الثقيلة كالقرفصاء والرفعة الميتة وضغط الصدر تُجهد جهازك العصبي وعضلاتك الكبيرة معًا، فتحتاج إلى راحة أطول لاستعادة قوّتك بين الجولات. راحة قصيرة على هذه الحركات تعني جولات تالية أضعف وتحكّمًا أقلّ وخطرًا أعلى على أدائك. أعطِ نفسك وقتًا كافيًا عليها حتى تحافظ على قوّتك وجودة حركتك عبر كل الجولات. أمّا تمارين العزل الأخفّ فتكفيها راحة أقصر لأن حملها على جسمك أقلّ بكثير. وازن بين صبرك على الراحة وطول جلستك حتى تبقى فعّالة ومنضبطة معًا.',
    takeawayAr: 'خذ راحة أطول للتمارين المركّبة الثقيلة مقارنة بتمارين العزل.',
    titleEn: 'Rest longer on the heavy lifts',
    bodyEn:
      'Heavy compound lifts such as the squat, the deadlift and the bench press load your nervous system and your large muscles at the same time, so they need longer rest before strength returns. Cutting rest short on these lifts usually means weaker following sets, less control, and a higher risk of poor technique. Give yourself enough time to keep both strength and movement quality across all your sets. Lighter isolation work asks far less of the body, so shorter rest is usually enough there.',
    takeawayEn: 'Give the heavy compounds longer rest than your isolation work.',
  },
  {
    id: 'rest-short-isolation',
    topic: 'rest',
    titleAr: 'راحة أقصر للعزل',
    bodyAr:
      'تمارين العزل التي تستهدف عضلة واحدة بوزن أخفّ لا تُجهد جسمك كما تفعل الحركات المركّبة الكبيرة، لذلك تكفيها راحة أقصر بين الجولات. هذه الراحة الأقصر تبقي العضلة تحت ضغط جيّد ومستمرّ، وتحافظ على وقت جلستك ضمن حدّ معقول. راقب أداءك بعناية: إن انهار عدد تكراراتك كثيرًا في الجولة التالية، فربّما تحتاج إلى راحة أطول قليلًا. الهدف توازن ذكيّ بين كثافة كافية للتحفيز وأداء يبقى نظيفًا ومتحكّمًا فيه. جرّب أزمنة قصيرة مختلفة ولاحظ أيّها يناسب عضلاتك وأداءك أكثر.',
    takeawayAr: 'قلّل راحتك شوي في تمارين العزل ما دام أداؤك نظيف.',
    titleEn: 'Shorter rest on isolation work',
    bodyEn:
      'Isolation exercises target one muscle with a lighter load, so they do not tax the whole body the way big compound lifts do, and shorter rest between sets is usually enough. That shorter rest keeps the muscle under steady demand and keeps your session within a sensible length. Watch your performance closely: if your repetitions drop sharply on the following set, you probably need a little more rest. The aim is enough stimulus with technique that stays controlled. Try different short intervals and keep what suits you.',
    takeawayEn: 'Trim your rest a little on isolation work, as long as your form holds.',
  },
  {
    id: 'rest-consistency',
    topic: 'rest',
    titleAr: 'ثبّت راحتك عشان تقارن بعدل',
    bodyAr:
      'إذا تغيّر زمن راحتك في كل جولة، صار من الصعب أن تعرف هل تقدّمت فعلًا أم أن راحة أطول هي التي سهّلت الرقم عليك. ثبّت زمن راحة قريبًا داخل التمرين الواحد حتى تكون مقارنة أسابيعك عادلة وذات معنى. استخدم مؤقّتًا بدل التخمين؛ فالإحساس بالوقت يخدعنا كثيرًا، خصوصًا حين ننشغل بالهاتف أو الحديث. راحة منضبطة ومتساوية تجعل تقدّمك رقمًا تثق به، لا مجرّد انطباع متقلّب يصعب البناء عليه. اجعل المؤقّت رفيقك الثابت في كل جلسة لتضمن عدالة المقارنة بينها.',
    takeawayAr: 'استخدم مؤقّت الراحة في التطبيق عشان يثبت وقتك بين الجولات.',
    titleEn: 'Keep your rest steady, compare fairly',
    bodyEn:
      'If your rest changes from set to set, it becomes hard to tell whether you truly progressed or whether a longer break simply made the number easier. Keep rest close to constant within a given exercise so that comparisons across weeks actually mean something. Use a timer instead of guessing, because our sense of passing time is unreliable, especially while checking a phone or talking. Steady, measured rest turns your progress into a number you can trust rather than a shifting impression.',
    takeawayEn: 'Use the rest timer in the app so your breaks stay the same length.',
  },
  {
    id: 'rest-active',
    topic: 'rest',
    titleAr: 'وش تسوّي وقت الراحة؟',
    bodyAr:
      'استغلّ راحتك بين الجولات في تهيئة الجولة التالية بهدوء: تنفّس بعمق وانتظام، واحتسِ رشفة ماء، وراجع وضعيتك وحركتك ذهنيًا قبل البدء. حركة خفيفة جدًا للعضلات المضادّة قد تريحك أحيانًا، لكن تجنّب أي مجهود يستنزف طاقتك قبل الجولة القادمة. ابتعد عن الانشغال الطويل بالهاتف حتى لا تتمدّد راحتك دون أن تنتبه فتبرد عضلاتك. راحة هادئة ومركّزة تجعل جولتك القادمة أقوى وأنظف وأكثر أمانًا. اجعل كل فترة راحة استعدادًا واعيًا للأداء التالي لا مجرّد فراغ تملؤه بالتشتّت.',
    takeawayAr: 'تنفّس بعمق وخذ رشفة ماء بدل ما تنشغل بجوالك وقت الراحة.',
    titleEn: 'What to do while you rest',
    bodyEn:
      'Use the gap between sets to prepare the next one calmly: breathe deeply and evenly, take a sip of water, and mentally rehearse your position and the movement itself. Very light movement of the opposing muscles can feel good, but avoid anything that drains the energy you need for the coming set. Keep the phone away, because a long scroll stretches your rest without you noticing and lets you cool down. Quiet, focused rest makes the next set stronger, cleaner and safer.',
    takeawayEn: 'Breathe deeply and sip water between sets instead of scrolling your phone.',
  },

  // ── توقيت البروتين (protein timing) ──
  {
    id: 'protein-total-first',
    topic: 'protein',
    titleAr: 'المجموع اليومي أهمّ من التوقيت',
    bodyAr:
      'يشغل كثيرون أنفسهم بلحظة تناول البروتين بالضبط، بينما الأهمّ بمسافة كبيرة هو مجموعك اليومي الكافي موزّعًا على مدار اليوم. حين تصل إلى احتياجك اليومي من مصادر جيّدة ومتنوّعة، تكون قد أدّيت الجزء الأكبر والأثقل من المعادلة. التوقيت الدقيق مجرّد تحسين صغير يأتي بعد ضبط المجموع، لا قبله ولا بديلًا عنه. ابدأ بتأمين حصّتك اليومية بثبات عبر وجباتك، ثم فكّر لاحقًا في التفاصيل الأدقّ إن رغبت. رتّب أولوياتك بالترتيب الصحيح حتى لا تتعب في تفصيل هامشي وتهمل الأساس.',
    takeawayAr: 'ركّز أول على إنك توصل مجموع البروتين اليومي قبل ما تشغل بالك بتوقيته.',
    titleEn: 'Your daily total beats timing',
    bodyEn:
      'Many people worry about the exact moment they eat protein, when the far bigger factor is simply reaching a sufficient daily total spread across the day. Once you cover your daily needs from good, varied sources, you have handled the heaviest part of the equation. Precise timing is a small refinement that comes after the total is settled, not before it and not instead of it. Secure your daily amount consistently across your meals first, then think about finer details if you want to.',
    takeawayEn: 'Hit your daily protein total first, then worry about timing.',
  },
  {
    id: 'protein-spread',
    topic: 'protein',
    titleAr: 'وزّع البروتين على اليوم',
    bodyAr:
      'تناول كلّ بروتينك في وجبة واحدة ضخمة أقلّ فائدة وراحة من توزيعه على عدّة وجبات خلال يومك. حصص معتدلة موزّعة تمنح جسمك مادّة البناء بانتظام، وتُسهّل عليك الوصول إلى مجموعك دون امتلاء مزعج أو ثقل. جرّب أن تتضمّن كل وجبة رئيسية مصدر بروتين واضحًا كالبيض أو الدجاج أو الألبان أو البقوليات. هذا التوزيع عمليّ أكثر بكثير من الاعتماد على وجبة واحدة كبيرة، ويحافظ على شبعك واستقرار طاقتك عبر ساعات اليوم. ابدأ بتوزيع بسيط على ثلاث وجبات وثبّته حتى يصير عادة.',
    takeawayAr: 'خلّ في كل وجبة رئيسية مصدر بروتين واضح.',
    titleEn: 'Spread protein across the day',
    bodyEn:
      'Taking all of your protein in one very large meal is less useful and less comfortable than spreading it over several meals during the day. Moderate portions give your body building material at regular intervals and make your daily total easier to reach without uncomfortable fullness. Try to include a clear protein source in every main meal: eggs, chicken, dairy or legumes. This is far more practical than relying on one big sitting, and it helps keep your fullness and energy steady. Start with three meals.',
    takeawayEn: 'Put a clear protein source in every main meal.',
  },
  {
    id: 'protein-around-training',
    topic: 'protein',
    titleAr: 'البروتين حول التمرين',
    bodyAr:
      'تناول وجبة فيها بروتين خلال الساعات المحيطة بتمرينك فكرة معقولة وبسيطة، سواء قبل الجلسة أو بعدها. النافذة الزمنية أوسع بكثير ممّا يُشاع، فلا داعي للاندفاع أو القلق فور انتهاء تمرينك مباشرة. المهمّ عمليًا ألّا تمرّ عليك ساعات طويلة جائعًا حول وقت التدريب. رتّب وجباتك بحيث تحيط بتمرينك على نحو مريح يناسب جدولك، ودع مجموعك اليومي يقود قرارك أكثر من الدقائق الدقيقة. اختر توقيتًا يسهل الالتزام به يومًا بعد يوم بدل ملاحقة نافذة ضيّقة مرهقة، فالبساطة أدوم وأنفع.',
    takeawayAr: 'خطّط لوجبة فيها بروتين في الساعات اللي حول تمرينك.',
    titleEn: 'Protein around your workout',
    bodyEn:
      'Eating a meal that contains protein in the hours around your session is a sensible, simple habit, whether that meal comes before training or after it. The window is much wider than is often claimed, so there is no need to rush a shake the moment you finish. What matters in practice is that you do not go many hours without eating around your training. Arrange your meals so they sit comfortably on either side of the session, and let your daily total guide the decision.',
    takeawayEn: 'Plan a meal with protein in the hours around your workout.',
  },
  {
    id: 'protein-sources',
    topic: 'protein',
    titleAr: 'مصادر بروتين عملية',
    bodyAr:
      'لست مضطرًّا إلى المكمّلات لتصل إلى احتياجك من البروتين. مصادر يومية متاحة مثل الدجاج واللحم والسمك والبيض والألبان والبقوليات تفي بالغرض في معظم الأحوال. المكمّل مجرّد وسيلة مريحة حين يصعب عليك بلوغ مجموعك من الطعام وحده، وليس شرطًا للتقدّم أو النتائج. نوّع مصادرك حسب ذوقك وميزانيتك وما يتوفّر لديك، واجعل الطعام الحقيقي أساسك الثابت. البساطة والثبات على مصادر جيّدة أهمّ بكثير من أي منتج بعينه أو علامة تجارية. ركّز على العادة الغذائية أوّلًا قبل التفكير في أي إضافة مكمّلة.',
    takeawayAr: 'خلّ الأكل الحقيقي أساس بروتينك، والمكمّل بس وسيلة إذا احتجته.',
    titleEn: 'Practical protein sources',
    bodyEn:
      'You do not need supplements to reach your protein needs. Everyday foods such as chicken, meat, fish, eggs, dairy and legumes cover the job in most situations. A powder is only a convenient tool for days when reaching your total from food alone is difficult, and it is not a requirement for progress. Vary your sources according to taste, budget and what is available, and keep real food as your base. Consistency with decent sources matters far more than any particular brand.',
    takeawayEn: 'Build your protein from real food, and use a supplement only if you need it.',
  },
  {
    id: 'protein-satiety',
    topic: 'protein',
    titleAr: 'البروتين يساعد على الشبع',
    bodyAr:
      'من فوائد البروتين العملية أنّه يميل إلى إشباعك مدّة أطول مقارنةً بكثير من الأطعمة الأخرى. هذه الميزة مفيدة خصوصًا حين تحاول ضبط سعراتك، إذ تساعدك على مقاومة الجوع بين الوجبات والالتزام بخطّتك. جرّب أن تبدأ وجبتك بمصدر بروتين جيّد لتشعر بامتلاء أبكر وتقلّل الإفراط لاحقًا. هذه ليست وصفة سحرية ولا حلًّا وحيدًا، لكنّها عادة بسيطة تجعل التزامك بخطّتك الغذائية أسهل وأكثر استدامة على المدى الطويل. ادمجها مع نوم جيّد وحركة منتظمة حتى تحصل على أثر أوضح وأدوم.',
    takeawayAr: 'ابدأ وجبتك بالبروتين عشان تحس بشبع أطول بين الوجبات.',
    titleEn: 'Protein keeps you full',
    bodyEn:
      'One practical benefit of protein is that it tends to keep you feeling full for longer than many other foods. That helps most when you are managing your calorie intake, because it makes hunger between meals easier to handle and your plan easier to follow. Try starting a meal with a good protein source so fullness arrives earlier and overeating later is easier to avoid. This is not a magic fix on its own, but it is a simple habit that makes long term consistency easier to sustain.',
    takeawayEn: 'Start your meal with the protein so you stay full longer between meals.',
  },

  // ── النوم (sleep) ──
  {
    id: 'sleep-recovery',
    topic: 'sleep',
    titleAr: 'النوم أساس التعافي',
    bodyAr:
      'أثناء نومك يتعافى جسمك ويعالج أثر تدريب اليوم ويعيد ترتيب طاقتك. النوم غير الكافي باستمرار يُضعف أداءك وتركيزك ومزاجك، ويجعل تقدّمك أبطأ مهما اجتهدت في الصالة. النوم الجيّد ليس رفاهية إضافية، بل جزء أصيل من برنامجك تمامًا كالتمرين والغذاء والراحة. حين تنام كفايتك بانتظام كل ليلة، تلاحظ طاقة أفضل وأداءً أنظف وقدرة أعلى على الالتزام. اعتنِ بنومك بالجدّية نفسها التي تعطيها لجولاتك وأوزانك، واحمِ ساعاته من الاقتطاع المتكرّر. اجعل موعد نومك التزامًا ثابتًا لا خيارًا يتأجّل عند أول انشغال.',
    takeawayAr: 'تعامل مع نومك كجزء من برنامجك، مو وقت زايد تقص منه.',
    titleEn: 'Sleep is the base of recovery',
    bodyEn:
      'While you sleep, your body recovers, absorbs the training you did and restores your energy for the next day. Sleeping too little night after night tends to weaken your performance, focus and mood, and it slows your progress no matter how hard you work in the gym. Good sleep is not a bonus extra; it belongs in your program alongside training and food. When you sleep enough on a regular basis, sessions feel cleaner and staying consistent gets easier. Protect those hours from being cut.',
    takeawayEn: 'Treat sleep as part of your program, not spare time you can cut.',
  },
  {
    id: 'sleep-consistency',
    topic: 'sleep',
    titleAr: 'انتظام موعد النوم',
    bodyAr:
      'النوم والاستيقاظ في مواعيد متقاربة يوميًا يساعد جسمك على ضبط إيقاعه الداخلي، فتنام أسرع وتستيقظ أكثر نشاطًا وصفاءً. المواعيد المتقلّبة تُربك هذا الإيقاع وتجعل ليلك أقلّ راحة حتى لو طالت ساعاته على الورق. حاول تثبيت وقت نومك ووقت استيقاظك قدر الإمكان، حتى في نهايات الأسبوع والعطلات. الانتظام في التوقيت غالبًا أهمّ من ساعة إضافية متفرّقة تنالها هنا أو هناك بلا نظام. ابدأ بتقريب موعدك تدريجيًا حتى يستقرّ جسمك على نمط ثابت ومريح، فالثبات وحده يصنع فرقًا حقيقيًا.',
    takeawayAr: 'ثبّت وقت نومك وصحيانك في نطاق متقارب كل يوم.',
    titleEn: 'Keep your bedtime steady',
    bodyEn:
      'Going to bed and waking up at similar times each day helps your body settle into its own rhythm, so you fall asleep faster and wake up clearer. A schedule that jumps around unsettles that rhythm and leaves your nights less restful, even when the hours look long enough on paper. Try to hold your bedtime and your wake time steady as far as your life allows, weekends included. Regularity usually matters more than an extra hour picked up here or there. Shift your timing gradually.',
    takeawayEn: 'Keep your bedtime and wake-up time inside a narrow window every day.',
  },
  {
    id: 'sleep-environment',
    topic: 'sleep',
    titleAr: 'جهّز بيئة نومك',
    bodyAr:
      'غرفة مظلمة وهادئة وباردة نسبيًا تساعد جسمك على نوم أعمق وأكثر راحة. الضوء الساطع والشاشات قبل النوم مباشرة قد يؤخّران استغراقك في النوم ويشوّشان جودته. جرّب خفض الأضواء تدريجيًا وإبعاد الشاشة قبل موعد نومك بفترة كافية، واجعل سريرك ووسادتك مريحين قدر استطاعتك. تحسينات بيئية بسيطة مثل هذه تصنع فرقًا ملموسًا في جودة ليلك دون أي تكلفة تقريبًا. جرّبها بضعة أيام متتالية ولاحظ الفرق في نشاطك صباحًا وأدائك خلال يومك. ابدأ بتغيير واحد صغير وثبّته قبل أن تضيف غيره.',
    takeawayAr: 'خفّف الأضواء وبعّد الشاشة قبل نومك بنص ساعة على الأقل.',
    titleEn: 'Set up your sleep space',
    bodyEn:
      'A dark, quiet and relatively cool room helps your body drop into deeper, more restful sleep. Bright light and screens right before bed can delay how quickly you fall asleep and disturb the quality of the night. Try dimming the lights gradually and putting the screen away well before your bedtime, and make your bed and pillow as comfortable as you reasonably can. Small changes like these make a noticeable difference at almost no cost. Start with one change, hold it a few nights, then add another.',
    takeawayEn: 'Dim the lights and put the screen down at least half an hour before bed.',
  },
  {
    id: 'sleep-performance',
    topic: 'sleep',
    titleAr: 'النوم وأداؤك في الصالة',
    bodyAr:
      'ليلة نوم سيّئة واحدة قد تجعل أوزانك المعتادة تبدو أثقل وتركيزك أضعف؛ هذا أمر طبيعي ولا يعني تراجع تقدّمك الحقيقي. لكن حين يتكرّر نقص النوم عدّة أيام، يتراكم أثره على قوّتك وحافزك ومزاجك تدريجيًا. إن جاءتك جلسة بعد نوم قليل، فخفّف توقّعاتك واحرص على الأداء النظيف الآمن بدل ملاحقة رقم قياسي جديد. عالج جذر المشكلة بتحسين نومك بانتظام، لا بدفع جسمك المرهق إلى مجهود أكبر. استمع إلى إشارات جسمك واضبط حملك بما يناسب حالتك في ذلك اليوم تحديدًا.',
    takeawayAr: 'إذا كان نومك قليل، خفّف توقّعاتك وركّز على أداء آمن ونظيف.',
    titleEn: 'Sleep and your gym performance',
    bodyEn:
      'After one poor night, your usual weights can feel heavier and your focus can slip. That is normal and does not mean your real progress has gone backwards. When short sleep repeats for several days, though, the effect builds on your strength, your motivation and your mood. If a session lands after little sleep, lower your expectations and train for clean, safe execution rather than chasing a personal record. Fix the cause by improving your sleep, not by driving a tired body harder.',
    takeawayEn: 'Slept badly? Lower your expectations and train for clean, safe reps.',
  },
  {
    id: 'sleep-naps',
    topic: 'sleep',
    titleAr: 'القيلولة القصيرة ممكن تساعد',
    bodyAr:
      'إن لم تنم ليلًا كفايتك، فقيلولة قصيرة نهارًا قد تعيد جزءًا من نشاطك ويقظتك وتركيزك. اجعلها قصيرة حتى لا تشوّش نومك الليلي أو تتركك أثقل ممّا كنت عليه قبلها. القيلولة ليست بديلًا عن ليل كامل جيّد، لكنّها أداة مساعدة مفيدة في الأيام المزدحمة أو بعد ليلة قليلة النوم. جرّب توقيتًا مبكّرًا نسبيًا بعد الظهر، وراقب كيف يؤثّر ذلك في نومك الليلي حتى تضبط ما يناسبك تحديدًا. اجعلها استثناءً عند الحاجة لا عادة تعوّض بها إهمال ليلك المتكرّر.',
    takeawayAr: 'خلّ قيلولتك قصيرة وبدري بعد الظهر عشان ما تأثّر على نوم الليل.',
    titleEn: 'A short nap can help',
    bodyEn:
      'If your night was short, a brief nap during the day can bring back some of your alertness and focus. Keep it short so it does not disturb the coming night or leave you feeling heavier than before you lay down. A nap is not a replacement for a full night of sleep, but it is a useful tool on crowded days or after a poor night. Try the early afternoon, and watch how it affects your night sleep so you can adjust what suits you.',
    takeawayEn: 'Keep naps short and early in the afternoon so your night sleep stays intact.',
  },

  // ── الثبات وكسر الركود (plateaus) ──
  {
    id: 'plateau-normal',
    topic: 'plateau',
    titleAr: 'الثبات مرحلة طبيعية',
    bodyAr:
      'بعد فترة من التقدّم السريع، يبطؤ التحسّن ويثبت وزنك أو أرقامك مؤقّتًا؛ هذا لا يعني أن برنامجك فاشل. فالتقدّم يصعب أن يبقى بالسرعة نفسها إلى الأبد، وتباطؤه علامة طبيعية على تقدّم خبرتك. أوّل خطوة أن تتأكّد من أساسياتك: النوم الكافي، والغذاء المناسب، والانتظام في الحضور، ودقّة تسجيل أرقامك. كثير ممّا يُظنّ ركودًا هو في الحقيقة أسبوع سيّئ عابر، أو تسجيل غير دقيق، أو تعب متراكم. تحقّق من هذه الأساسيات بهدوء قبل أن تغيّر كل شيء في برنامجك دفعة واحدة.',
    takeawayAr: 'قبل ما تغيّر برنامجك، راجع نومك وأكلك وانتظامك ودقة تسجيلك.',
    titleEn: 'Hitting a plateau is normal',
    bodyEn:
      'After a fast start, progress slows and your numbers hold steady for a while. That does not mean your program failed. Improvement rarely stays at the same rate forever, and slowing down is a normal sign of growing training experience. Start by checking the basics: enough sleep, adequate food, consistent attendance, and accurate logging. Much of what looks like a plateau is really one bad week, a sloppy record, or accumulated fatigue. Check those basics calmly before you rewrite your whole program at once.',
    takeawayEn: 'Before you change the program, check your sleep, your food, your consistency, and how well you log.',
  },
  {
    id: 'plateau-one-change',
    topic: 'plateau',
    titleAr: 'غيّر شي واحد بس',
    bodyAr:
      'حين تثبت أرقامك فعلًا لأسابيع رغم انضباط أساسياتك من نوم وغذاء وانتظام، غيّر متغيّرًا واحدًا فقط لتعرف بوضوح ما الذي أثّر. جرّب نطاق تكرارات مختلفًا، أو زيادة بسيطة في حجم التمرين، أو تعديلًا في ترتيب تمارينك خلال الجلسة. تغيير كل شيء دفعة واحدة يربكك ويخفي عنك السبب الحقيقي للتحسّن أو التراجع. أعطِ التعديل الجديد بضعة أسابيع كاملة قبل أن تحكم عليه، وراقب أرقامك المسجّلة لترى أثره بوضوح ومنطق. الصبر على تجربة واحدة أنفع بكثير من القفز المستمرّ بين الحلول.',
    takeawayAr: 'عدّل عامل واحد بس، وعطه أسبوعين لثلاثة قبل ما تحكم عليه.',
    titleEn: 'Change just one thing',
    bodyEn:
      'When your numbers really have not moved for weeks, and your sleep, food, and attendance are all in order, change one variable at a time so you can see what actually helped. Try a different rep range, a small increase in training volume, or a new order for the exercises in your session. Changing everything at once hides the real cause. Give the new setting a few full weeks before you judge it, and read your logged numbers to see its effect.',
    takeawayEn: 'Adjust one variable only, and give it two to three weeks before you judge it.',
  },
  {
    id: 'plateau-technique',
    topic: 'plateau',
    titleAr: 'حسّن أداءك أول',
    bodyAr:
      'أحيانًا يكون سبب الثبات أداءً غير نظيف يقصّر مدى الحركة أو يستعين بالزخم بدل العضلة المستهدفة. قبل أن تزيد الوزن، تأكّد أنك تؤدّي التمرين بمدى كامل وتحكّم جيّد في كل تكرار. تحسين الأداء وحده قد يفتح لك تقدّمًا جديدًا دون أي زيادة في الحمل، ويقلّل في الوقت نفسه خطر الإصابة. صوّر جولتك بالهاتف أو راجع نقاط التكنيك الأساسية، وأصلح ما يلزم بصبر ووعي. الجودة طريق للتقدّم بقدر ما هو الوزن، وربّما أكثر أمانًا واستدامة على المدى الطويل.',
    takeawayAr: 'راجع أداءك بمدى كامل وتحكّم قبل ما تلوم البرنامج على الثبات.',
    titleEn: 'Fix your form first',
    bodyEn:
      'Sometimes a plateau comes from loose execution: a shortened range of motion, or momentum doing work the target muscle should do. Before you add weight, make sure every rep uses a full range and stays under control. Cleaning up execution alone can unlock new progress with no extra load, and it lowers injury risk at the same time. Film a set on your phone or review the main technique points, then fix what needs fixing. Quality is a route to progress just as load is, and a safer one.',
    takeawayEn: 'Check that you are moving through a full range with control before you blame the program.',
  },
  {
    id: 'plateau-recovery',
    topic: 'plateau',
    titleAr: 'يمكن الحل راحة مو مجهود',
    bodyAr:
      'ليس كل ثبات يحلّه مزيد من الجهد؛ فأحيانًا يكون جسمك مُرهقًا بتعب متراكم يحتاج إلى تعافٍ أفضل لا حمل أثقل. إن رافق ثباتك تعب دائم أو نوم سيّئ أو فتور في الحافز، فقد يكون تخفيف الحمل أسبوعًا هو ما يعيد تقدّمك فعلًا. أضف أيّام راحة إضافية، وحسّن نومك وغذاءك وترطيبك، ثم عد بعد ذلك أقوى وأكثر نشاطًا. دفع جسم مُنهك إلى مجهود أكبر قد يعمّق المشكلة ويؤخّر تقدّمك بدل حلّها. أنصت إلى جسمك بصدق قبل أن تزيد عليه الضغط والحمل.',
    takeawayAr: 'إذا صار مع الثبات تعب وفتور مستمر، خفّف حملك وحسّن تعافيك أسبوع.',
    titleEn: 'Maybe the fix is rest, not more work',
    bodyEn:
      'Not every plateau is solved by working harder. Sometimes the body is carrying accumulated fatigue and needs better recovery rather than heavier loads. If the stall comes with constant tiredness, poor sleep, or low motivation, a lighter week may be what restores progress. Add an extra rest day, improve your sleep, food, and hydration, then come back fresher. Pushing an exhausted body harder can deepen the problem and delay progress instead of solving it. Listen honestly before you add more load.',
    takeawayEn: 'If the plateau comes with constant fatigue and low drive, ease off for a week and recover better.',
  },
  {
    id: 'plateau-expectations',
    topic: 'plateau',
    titleAr: 'اضبط توقّعاتك مع الوقت',
    bodyAr:
      'كلّما تقدّمت خبرتك في التدريب، صار التحسّن أبطأ وأصغر حجمًا، وهذا مؤشّر تقدّم لا فشل. المبتدئ يتحسّن بسرعة ملحوظة، أمّا المتمرّس فيكسب مكاسب أصغر تحتاج إلى صبر أطول وانضباط أعمق. قِس نجاحك باتجاه الأشهر والسنة كاملةً، لا بأسبوع واحد أو جلسة عابرة. ثباتك النسبي بعد تقدّم طويل قد يكون علامة نضج تدريبي وليس توقّفًا حقيقيًا. استمرّ بانضباطك المعتاد، واحتفِ بالمكاسب الصغيرة المستمرّة التي تتراكم بهدوء عبر الوقت. عدّل توقّعاتك لتبقى واقعية ومحفّزة بدل أن تحبطك المقارنات المتسرّعة.',
    takeawayAr: 'قيس تقدّمك على مدى أشهر، وتوقّع مكاسب أصغر كل ما زادت خبرتك.',
    titleEn: 'Reset your expectations over time',
    bodyEn:
      'The more training experience you build, the smaller and slower the improvements become, and that is a sign of progress rather than failure. Beginners improve quickly; experienced lifters earn smaller gains that need more patience and tighter discipline. Measure success across months and a full year, not one week or one session. A relative plateau after a long run of progress can mean training maturity rather than a real stop. Keep your usual discipline and value the small gains that quietly add up.',
    takeawayEn: 'Judge your progress over months, and expect smaller gains as your experience grows.',
  },

  // ── التخفيف المبرمج (deloads) ──
  {
    id: 'deload-what',
    topic: 'deload',
    titleAr: 'وش هو أسبوع التخفيف؟',
    bodyAr:
      'أسبوع التخفيف فترة مقصودة ومخطّطة تقلّل فيها حملك التدريبي مؤقّتًا لتمنح جسمك فرصة تعافٍ أعمق. تخفّض خلالها الوزن أو عدد الجولات أو الشدّة بضعة أيام، ثم تعود بعدها إلى برنامجك المعتاد تدريجيًا. الهدف تفريغ التعب المتراكم في عضلاتك وجهازك العصبي حتى تعود أنشط وأقوى، لا أن تخسر ما بنيته. التخفيف المخطّط استثمار حقيقي في استمراريتك وسلامتك على المدى الطويل، وليس تراجعًا ولا كسلًا ولا انقطاعًا. اعتبره بندًا ثابتًا في برنامجك تعود إليه كل بضعة أسابيع بحسب حاجتك الفعلية.',
    takeawayAr: 'اعتبر التخفيف جزء مخطّط له من برنامجك، مو انقطاع عنه.',
    titleEn: 'What is a deload week?',
    bodyEn:
      'A deload is a planned stretch where you deliberately reduce training load so the body can recover more fully. For a few days you lower the weight, the number of sets, or the intensity, then return to your usual program gradually. The aim is to clear accumulated fatigue from the muscles and nervous system so you come back fresher, not to lose what you built. Planned lighter weeks protect your consistency over the long run and keep the routine sustainable.',
    takeawayEn: 'Treat a deload as a planned part of your program, not a break from it.',
  },
  {
    id: 'deload-when',
    topic: 'deload',
    titleAr: 'متى تحتاج تخفيف؟',
    bodyAr:
      'إشارات كثيرة قد تدلّ على حاجتك إلى تخفيف: تعب دائم لا يزول بالراحة، ونوم أسوأ، وفتور في الحافز، وأوزان معتادة تبدو أثقل عدّة جلسات متتالية. حين تجتمع هذه العلامات معًا رغم انتظام غذائك ونومك، فالأرجح أن جسمك يطلب راحة مقصودة. لا تنتظر حتى تصل إلى إصابة أو إنهاك تامّ يجبرك على التوقّف الطويل. الاستماع المبكّر لهذه الإشارات يوفّر عليك انقطاعًا أطول لاحقًا ويحمي تقدّمك. راقب حالتك بصدق، وخطّط للتخفيف قبل أن تشتدّ الأعراض وتتراكم عليك دفعة واحدة.',
    takeawayAr: 'إذا اجتمع عليك تعب مستمر وفتور وأوزان أثقل من العادة، خطّط لأسبوع تخفيف.',
    titleEn: 'When do you need a deload?',
    bodyEn:
      'Several signals can point to a need for a lighter week: persistent tiredness that rest does not clear, worse sleep, low motivation, and familiar weights feeling heavy for several sessions in a row. When these appear together even though your food and sleep are steady, the body is likely asking for planned rest. Do not wait for an injury or complete exhaustion to force a long break. Reading the signals early saves you a longer interruption later and protects your progress. Plan it before the symptoms pile up.',
    takeawayEn: 'If constant fatigue, low drive, and heavy-feeling weights all show up together, plan a deload week.',
  },
  {
    id: 'deload-how',
    topic: 'deload',
    titleAr: 'كيف تخفّف عمليًا؟',
    bodyAr:
      'طرق التخفيف عمليًا بسيطة ومرنة: قلّل عدد الجولات في كل تمرين، أو اخفض الوزن مع إبقاء الحركة نفسها، أو قلّل أيّام تمرينك في ذلك الأسبوع. أبقِ حركتك خفيفة ونظيفة دون ملاحقة أرقام قياسية أو دفع للحدود. لست بحاجة إلى التوقّف التامّ عن النشاط؛ فالحركة المعتدلة تساعد على التعافي وتحافظ على عادتك وروتينك. بعد أيّام قليلة ستشعر بعودة نشاطك وخفّة أوزانك، فارجع حينها إلى برنامجك المعتاد تدريجيًا وبثقة. اختر الطريقة الأنسب لجدولك وحالتك، والتزم بها ذلك الأسبوع كاملًا دون تردّد.',
    takeawayAr: 'في أسبوع التخفيف، قلّل الجولات أو الوزن وخلّ حركتك خفيفة ونظيفة.',
    titleEn: 'How to deload, practically',
    bodyEn:
      'Deloading in practice is simple and flexible: cut the number of sets per exercise, lower the weight while keeping the same movements, or train fewer days that week. Keep the work light and clean, with no chasing of personal records and no pushing to the limit. You do not need to stop moving entirely; moderate activity supports recovery and keeps the routine intact. After a few days you should feel your energy return and the weights feel lighter, and then you can rebuild gradually.',
    takeawayEn: 'During a deload week, cut sets or weight and keep every rep light and clean.',
  },
  {
    id: 'deload-mindset',
    topic: 'deload',
    titleAr: 'التخفيف مو تراجع',
    bodyAr:
      'يخشى بعضهم أن يفقد مكاسبه إن خفّف أسبوعًا واحدًا، فيستمرّ مُنهكًا حتى يتوقّف مضطرًّا في النهاية. الحقيقة أن أيّامًا قليلة من الحمل الأخفّ لا تمحو أشهر عملك وانضباطك، بل تعيد إليك جاهزيتك ونشاطك. الراحة المخطّطة مهارة يجيدها المتمرّسون ويعتمدون عليها، لا علامة ضعف أو تكاسل. من يخفّف في الوقت المناسب يتقدّم مدّة أطول ويتعرّض لإصابات أقلّ على المدى البعيد. ثق بالعملية وامنح جسمك حقّه من التعافي، ثم عد أقوى وأكثر حماسًا للاستمرار في طريقك الطويل.',
    takeawayAr: 'ذكّر نفسك إن أيام التخفيف القليلة ترجّع جاهزيتك وما تمسح تقدّمك.',
    titleEn: 'A deload is not a step back',
    bodyEn:
      'Some people fear losing their gains if they take one lighter week, so they keep grinding while exhausted until they are forced to stop. In reality, a few days of reduced load will not erase months of consistent work; it restores readiness and energy. Planned rest is a skill that experienced lifters rely on, not a sign of weakness. People who deload at the right time tend to train longer and run into fewer setbacks. Trust the process and give recovery its share.',
    takeawayEn: 'Remind yourself that a few lighter days restore your readiness and do not erase your progress.',
  },
  {
    id: 'deload-return',
    topic: 'deload',
    titleAr: 'الرجعة بعد التخفيف',
    bodyAr:
      'بعد أسبوع التخفيف، عد إلى أوزانك المعتادة تدريجيًا لا دفعة واحدة متسرّعة. ابدأ من حمل مريح في الجلسات الأولى، وتحسّس أداءك وإحساسك قبل أن تطارد أرقامًا جديدة أو أرقامًا قياسية. كثيرون يجدون أوزانهم أخفّ إحساسًا بعد التعافي الجيّد، فيتقدّمون بعدها بثقة وأمان. لا تحاول تعويض ما تظنّه وقتًا ضائعًا بقفزة كبيرة مفاجئة في الحمل. البناء الجيّد والمستدام يبدأ دائمًا من عودة هادئة ومنضبطة تحافظ على سلامتك وتقدّمك معًا. امنح جسمك جلستين أو ثلاثًا حتى يستعيد إيقاعه المعتاد كاملًا.',
    takeawayAr: 'ارجع بعد التخفيف بحمل مريح، وتدرّج قبل ما تطارد أرقام جديدة.',
    titleEn: 'Coming back after a deload',
    bodyEn:
      'After a deload week, return to your usual weights gradually rather than all at once. Start the first sessions at a comfortable load, feel out your movement and control, and only then think about chasing numbers again. Many people find the same weights feel lighter after a good recovery, and progress follows safely from there. Do not try to make up for what you think was lost time with one big jump in load. Give yourself two or three sessions to find your rhythm.',
    takeawayEn: 'Come back at a comfortable load and build up before you chase new numbers.',
  },

  // ── الترطيب (hydration) ──
  {
    id: 'hydration-basics',
    topic: 'hydration',
    titleAr: 'الماء وأداؤك',
    bodyAr:
      'جسمك يعتمد على الماء في كل وظائفه الحيوية تقريبًا، والجفاف حتى الخفيف منه قد يُضعف تركيزك وأداءك وإحساسك العامّ بالطاقة. لست بحاجة إلى أرقام معقّدة أو حسابات دقيقة؛ اشرب بانتظام على مدار يومك بدل جرعة واحدة كبيرة متأخّرة. راقب لون بولك كدليل بسيط ومتاح: اللون الفاتح غالبًا مطمئن، والغامق قد يعني حاجتك إلى المزيد. الترطيب الجيّد عادة سهلة وقليلة الكلفة، لكن أثرها ملموس على جلساتك ويومك عمومًا. اجعل الماء في متناول يدك حتى يسهل عليك الالتزام دون تفكير طويل.',
    takeawayAr: 'وزّع شرب الماء على يومك بدل ما تأجّله لجرعة وحدة كبيرة.',
    titleEn: 'Water and how you perform',
    bodyEn:
      'Your body relies on water for nearly every function, and even mild dehydration can dull focus, performance, and general energy. You do not need complicated numbers or precise calculations; drink steadily across the day instead of one large late intake. Urine color is a simple, available guide: pale usually means you are fine, and dark can mean you need more. Good hydration is an easy, low-cost habit with a noticeable effect on your sessions and your day. Keep water within reach so the habit stays effortless.',
    takeawayEn: 'Spread your water across the day instead of saving it for one big glass.',
  },
  {
    id: 'hydration-training',
    topic: 'hydration',
    titleAr: 'الماء حول التمرين',
    bodyAr:
      'ابدأ تمرينك وأنت مرتوٍ جيّدًا، وخذ رشفات ماء بين الجولات، خصوصًا في الجوّ الحارّ أو خلال الجلسات الطويلة. قد يتأخّر شعورك بالعطش عن حاجتك الفعلية للماء، فلا تنتظره وحده دليلًا على الترطيب. بعد انتهاء التمرين، عوّض ما فقدته من سوائل تدريجيًا على مدى الساعات التالية. زجاجة ماء بجانبك أثناء التدريب تذكّرك بالشرب وتُسهّل عليك بناء العادة. ترطيب بسيط ومنتظم يحافظ على أدائك وتركيزك حتى نهاية جلستك دون تكلّف. اجعل الزجاجة جزءًا ثابتًا من عدّتك في كل تمرين تحضره.',
    takeawayAr: 'خذ معك قارورة ماء واشرب رشفات بين الجولات، خصوصًا في الحر.',
    titleEn: 'Water around your workout',
    bodyEn:
      'Start your session well hydrated, and take sips of water between sets, especially in hot weather or during long sessions. Thirst can lag behind your actual need, so do not rely on it alone as your only signal. After training, replace the fluid you lost gradually over the following hours rather than all at once. A bottle beside you during the session is a reminder and makes the habit easier to build. Simple, steady hydration keeps your performance and focus intact to the last set.',
    takeawayEn: 'Bring a bottle and sip between sets, especially when it is hot.',
  },
  {
    id: 'hydration-signs',
    topic: 'hydration',
    titleAr: 'علامات بسيطة للجفاف',
    bodyAr:
      'إشارات مثل العطش الواضح، وجفاف الفم، والصداع الخفيف، والتعب غير المبرّر قد تدلّ على حاجة جسمك إلى الماء. لون البول الغامق مؤشّر شائع ومفيد كذلك. لا تحتاج إلى قياسات دقيقة أو أجهزة؛ يكفي أن تنتبه لهذه العلامات البسيطة وتشرب استجابةً لها فور ظهورها. إن كنت تتعرّق كثيرًا في نشاط طويل أو جوّ حارّ، فاهتمامك بالترطيب يصبح أهمّ. الوعي البسيط بجسمك وإشاراته يكفي في معظم أيامك العادية دون تعقيد. تعلّم قراءة هذه العلامات مبكّرًا حتى تتصرّف قبل أن يشتدّ الجفاف عليك.',
    takeawayAr: 'انتبه للعطش وجفاف الفم ولون البول الغامق — كلها إشارات إنك تحتاج ماء.',
    titleEn: 'Simple signs you need water',
    bodyEn:
      'Signals such as clear thirst, a dry mouth, a mild headache, or unexplained tiredness can mean the body needs water. Dark urine is another common and useful indicator. You do not need precise measurements or devices; noticing these simple signs and drinking in response is usually enough. If you sweat heavily during long activity or in hot weather, hydration deserves more attention. Basic awareness of your own signals covers most ordinary days. If symptoms are severe or keep returning, check with a qualified professional.',
    takeawayEn: 'Watch for thirst, a dry mouth, and dark urine: they all say you need water.',
  },
  {
    id: 'hydration-habit',
    topic: 'hydration',
    titleAr: 'خلّ شرب الماء عادة',
    bodyAr:
      'أسهل طريق إلى ترطيب جيّد أن تربطه بعاداتك اليومية الثابتة: كوب عند الاستيقاظ، وكوب مع كل وجبة، وزجاجة بجانبك أثناء العمل أو الدراسة. حين يصبح الشرب جزءًا أصيلًا من روتينك، لن تحتاج إلى تذكّره أو حسابه في كل مرّة. ابدأ بعادة واحدة صغيرة وثبّتها بضعة أيّام حتى ترسخ، ثم أضف غيرها تدريجيًا. البساطة والانتظام يتغلّبان دائمًا على المحاولات المثالية المتقطّعة التي لا تدوم طويلًا. اجعل الماء مرئيًا وقريبًا منك، فالعين تذكّر اليد بما تنساه في زحام اليوم.',
    takeawayAr: 'اربط شرب الماء بعادة ثابتة: كوب أول ما تصحى وكوب مع كل وجبة.',
    titleEn: 'Make water a habit',
    bodyEn:
      'The easiest route to good hydration is tying it to fixed daily habits: a glass when you wake, a glass with every meal, and a bottle beside you while you work or study. Once drinking becomes part of the routine, you stop having to remember or calculate it each time. Start with one small habit and hold it for a few days until it sticks, then add another. Simplicity and consistency beat perfect attempts that never last. Keep water visible and close by.',
    takeawayEn: 'Anchor water to a fixed habit: a glass when you wake and one with every meal.',
  },
  {
    id: 'hydration-balance',
    topic: 'hydration',
    titleAr: 'الاعتدال في كل شي',
    bodyAr:
      'الترطيب الجيّد مهمّ، لكنّه لا يعني إغراق نفسك بكمّيات كبيرة من الماء دفعة واحدة. الأفضل توزيع معتدل على مدار اليوم يلائم نشاطك وحرارة جوّك ومقدار تعرّقك. أجسامنا تختلف في حاجاتها، فما يناسب غيرك قد يزيد أو يقلّ عنك قليلًا. استمع إلى جسمك واضبط كمّيتك بحسب نشاطك وتعرّقك وإحساسك، لا بحسب قاعدة صارمة واحدة تناسب الجميع. إن كانت لديك حالة صحّية تخصّ السوائل أو الكلى، فاستشر مختصًا لضبط ما يناسبك تحديدًا. الاعتدال والانتباه لجسمك أفضل من المبالغة في أي اتجاه.',
    takeawayAr: 'وزّع ماءك باعتدال حسب نشاطك وحرارة الجو، مو دفعة وحدة.',
    titleEn: 'Moderation, in this too',
    bodyEn:
      'Good hydration matters, but it does not mean flooding yourself with large volumes of water at once. A moderate spread across the day that matches your activity, the heat, and how much you sweat works better. Needs differ between people, so what suits someone else may be slightly more or less than what suits you. Listen to your body and adjust by activity, sweat, and how you feel rather than one rigid rule. If you have a health condition involving fluids or kidneys, consult a qualified professional.',
    takeawayEn: 'Spread your water moderately to match your activity and the heat, not all at once.',
  },

  // ── الألم مقابل الشدّ (soreness vs pain) ──
  {
    id: 'soreness-normal',
    topic: 'soreness',
    titleAr: 'الشدّ العضلي بعد التمرين',
    bodyAr:
      'الشعور بشدّ خفيف إلى متوسّط في العضلات بعد يوم أو يومين من تمرين جديد أو أشدّ من المعتاد أمر شائع ومعروف بين المتمرّنين. يظهر هذا الشدّ غالبًا في العضلة نفسها التي عملت، ويهدأ تدريجيًا خلال أيّام قليلة مع الحركة الخفيفة والراحة. هذا الشدّ ليس شرطًا لنجاح تمرينك ولا مقياسًا لفعاليته؛ فقد تتقدّم جيّدًا دون أن تشعر به كثيرًا. تعامل معه على أنّه جزء طبيعي من تأقلم جسمك مع مجهود جديد، لا هدفًا تسعى إليه. راقب زواله الطبيعي واستمرّ بروتينك بثقة وهدوء.',
    takeawayAr: 'تعامل مع الشدّ العضلي الخفيف على إنه تأقلم طبيعي، مو مقياس لنجاح تمرينك.',
    titleEn: 'Sore muscles after training',
    bodyEn:
      'Mild to moderate soreness a day or two after a new session, or one harder than usual, is common and well known among people who train. It usually shows up in the muscle that worked and eases over a few days with light movement and rest. Soreness is not a requirement for a good session and not a measure of how effective it was; you can progress well without feeling much of it. Treat it as a normal part of adapting to new work, not a target.',
    takeawayEn: 'Treat mild soreness as normal adaptation, not a scoreboard for your session.',
  },
  {
    id: 'soreness-vs-pain',
    topic: 'soreness',
    titleAr: 'فرّق بين الشدّ والألم',
    bodyAr:
      'الشدّ العضلي المعتاد إحساس منتشر في العضلة يهدأ تدريجيًا بالحركة الخفيفة ومرور الأيّام. أمّا الألم الحادّ أو الطاعن، خصوصًا في المفصل أو الوتر، أو الذي يظهر فجأة أثناء الحركة، فمختلف تمامًا ويستحقّ انتباهك الجادّ. لا تدفع جسمك خلال ألم حادّ ظنًّا منك أنّه مجرّد شدّ عادي ستتجاوزه. إن شككت في طبيعته، أو استمرّ الألم أو ازداد مع الوقت، فتوقّف واستشر مختصًا مؤهّلًا. سلامتك أهمّ بكثير من إكمال أي جولة أو رقم. تعلّم التفريق بينهما يحميك من إصابات كان يمكن تفاديها.',
    takeawayAr: 'وقّف عند أي ألم حاد أو في المفصل، وراجع مختص إذا استمر أو زاد.',
    titleEn: 'Know soreness from pain',
    bodyEn:
      'Ordinary muscle soreness is a spread-out feeling in the muscle that eases with light movement and a few days. Sharp or stabbing pain is different, especially in a joint or tendon, or pain that appears suddenly during a movement, and it deserves serious attention. Do not push through sharp pain assuming it is just soreness you can work off. If you are unsure, or the pain persists or gets worse, stop and see a qualified professional. Your safety matters more than finishing any set.',
    takeawayEn: 'Stop at any sharp or joint pain, and see a professional if it lasts or gets worse.',
  },
  {
    id: 'soreness-manage',
    topic: 'soreness',
    titleAr: 'كيف تخفّف الشدّ؟',
    bodyAr:
      'الشدّ العضلي المعتاد يهدأ غالبًا مع مرور الوقت وحده دون تدخّل معقّد. تساعدك الحركة الخفيفة والمشي وتحسين نومك وترطيبك على الشعور بتحسّن أسرع، بينما لا يعني وجود الشدّ أن تتوقّف عن نشاطك اليومي المعتاد. تدرّج في زيادة الحمل تدريجيًا حتى يقلّ ظهور الشدّ مع تأقلم جسمك مرّة بعد مرّة. لا تحتاج إلى إجراءات مكلفة أو معقّدة؛ فالأساسيات الجيّدة كافية في معظم الأحوال. إن تحوّل الإحساس من شدّ منتشر إلى ألم حادّ أو موضعي، فذلك أمر آخر يستدعي التوقّف والانتباه.',
    takeawayAr: 'خفّف الشدّ بحركة خفيفة ونوم وترطيب جيّد، وتدرّج في زيادة الحمل.',
    titleEn: 'How to ease soreness',
    bodyEn:
      'Ordinary muscle soreness usually settles on its own with time and no complicated intervention. Light movement, walking, better sleep, and good hydration can help you feel better sooner, and being sore does not mean you must stop your normal daily activity. Increase load gradually so soreness shows up less as your body adapts session after session. Expensive or elaborate measures are rarely needed; the basics cover most cases. If the feeling shifts from spread-out soreness to sharp or localized pain, that is different and calls for a stop.',
    takeawayEn: 'Ease soreness with light movement, sleep, and hydration, and add load gradually.',
  },
  {
    id: 'soreness-not-a-goal',
    topic: 'soreness',
    titleAr: 'الشدّ مو هدف',
    bodyAr:
      'يظنّ بعضهم أن غياب الشدّ يعني تمرينًا بلا فائدة، فيلاحقونه عمدًا في كل جلسة. الحقيقة أن الشدّ يعتمد على عوامل كثيرة كنوع التمرين وحداثته، وقد يقلّ كلّما تأقلم جسمك بينما يستمرّ تقدّمك الفعلي. قِس نجاحك بأرقامك المسجّلة وتحسّن أدائك عبر الأسابيع، لا بمدى وجعك في اليوم التالي. تدريب ذكيّ منتظم مبنيّ على التدرّج يتفوّق دائمًا على مطاردة الإرهاق والشدّ. دع بياناتك الموضوعية تقودك، لا إحساسك العابر الذي يتغيّر بين جلسة وأخرى. اجعل التقدّم المسجّل معيارك الأوّل والأخير في الحكم.',
    takeawayAr: 'احكم على تمرينك بأرقامك وتقدّمك المسجّل، مو بمقدار الشدّ بعده.',
    titleEn: 'Soreness is not the goal',
    bodyEn:
      'Some people assume that no soreness means a wasted session, so they chase it deliberately every time. In fact soreness depends on many factors, including the type of exercise and how new it is, and it often fades as the body adapts while real progress continues. Judge your sessions by your logged numbers and improving performance across weeks, not by how sore you are the next day. Smart, consistent, gradual training beats chasing fatigue. Let your objective data lead the decision.',
    takeawayEn: 'Judge your training by your logged numbers and progress, not by how sore you feel.',
  },
  {
    id: 'soreness-when-consult',
    topic: 'soreness',
    titleAr: 'متى تراجع مختص؟',
    bodyAr:
      'استشر مختصًا مؤهّلًا إذا استمرّ الألم أيّامًا دون تحسّن واضح، أو كان حادًّا، أو مصحوبًا بتورّم ظاهر أو ضعف في الحركة، أو تكرّر في المكان نفسه مع كل تمرين. هذه إشارات تتجاوز الشدّ العضلي المعتاد وتستحقّ تقييمًا مهنيًا دقيقًا. لا تعتمد على تخمينك أو على تجاهل الأعراض في مثل هذه الحالات. طلب رأي مختصّ مبكّرًا أوفر لوقتك وأسلم لجسمك من إهمال المشكلة حتى تكبر وتتعقّد. الاهتمام المبكّر بألمك ليس مبالغة، بل حماية ذكية لاستمرارك في التدريب بأمان وثبات.',
    takeawayAr: 'راجع مختص إذا كان الألم مستمر أو حاد أو معه تورّم أو يتكرّر بنفس المكان.',
    titleEn: 'When to see a professional',
    bodyEn:
      'See a qualified professional if pain lasts for days without clear improvement, if it is sharp, if it comes with visible swelling or weakness in the movement, or if it returns in the same spot with every session. These signs go beyond ordinary muscle soreness and deserve a proper assessment. Do not rely on guesswork or on ignoring symptoms in cases like these. Asking early costs you less time and protects your body better than letting a problem grow. Early attention is sensible, not excessive.',
    takeawayEn: 'See a professional if the pain lasts, turns sharp, brings swelling, or keeps returning in the same spot.',
  },
]
