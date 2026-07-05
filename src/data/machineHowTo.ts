// خطوات استخدام الأجهزة (P12) — شرح مبسّط لكل جهاز في الكتالوج، مكتوب للمبتدئ تمامًا.
//
// كل جهاز: ٣–٤ خطوات قصيرة (ضبط المقعد/المساند ← الحركة ← التنفّس). إرشاد استخدام عام فقط —
// بلا نصائح طبية أو ادعاءات علاجية. النصوص أصلية ثنائية اللغة (عربي فصيح مبسّط / إنجليزي).

import { canonicalExerciseId } from '@/data/exercises'

/** خطوات الاستخدام ثنائية اللغة. */
export interface HowToSteps {
  ar: string[]
  en: string[]
}

/** خطوات كل جهاز في الكتالوج — المفاتيح هي المعرّفات القانونية. */
export const machineHowTo: Record<string, HowToSteps> = {
  // ===== الصدر =====
  'chest-press-machine': {
    ar: [
      'اضبط المقعد بحيث تكون المقابض بمستوى منتصف صدرك.',
      'أمسك المقابض وثبّت ظهرك وكتفيك على المسند.',
      'ادفع للأمام حتى تمتد ذراعاك دون قفل المرفقين، مع الزفير أثناء الدفع.',
      'ارجع ببطء حتى تشعر بتمدد خفيف في الصدر، مع الشهيق.',
    ],
    en: [
      'Set the seat so the handles line up with mid-chest.',
      'Grip the handles and keep your back and shoulders against the pad.',
      'Press forward until your arms extend without locking the elbows, exhaling as you push.',
      'Return slowly until you feel a light stretch in the chest, inhaling on the way back.',
    ],
  },
  'iso-lateral-chest-press': {
    ar: [
      'اضبط المقعد بحيث تكون المقابض بمستوى الصدر، وثبّت ظهرك على المسند.',
      'كل ذراع تتحرك مستقلة — ادفع بالذراعين معًا أو بالتناوب حسب راحتك.',
      'ادفع مع الزفير حتى تمتد الذراع دون قفل المرفق.',
      'أنزل الوزن ببطء مع الشهيق وحافظ على تحكّم كامل.',
    ],
    en: [
      'Set the seat so the handles sit at chest level, back flat on the pad.',
      'Each arm moves independently — press both together or alternate.',
      'Press out while exhaling until the arm extends without locking the elbow.',
      'Lower the weight slowly under full control while inhaling.',
    ],
  },
  'incline-chest-press-machine': {
    ar: [
      'اضبط المقعد بحيث تكون المقابض بمستوى أعلى الصدر.',
      'ثبّت ظهرك على المسند المائل وأمسك المقابض بقبضة مريحة.',
      'ادفع للأعلى وللأمام مع الزفير دون قفل المرفقين.',
      'ارجع ببطء مع الشهيق حتى مستوى الصدر.',
    ],
    en: [
      'Adjust the seat so the handles sit at upper-chest level.',
      'Keep your back on the inclined pad and take a comfortable grip.',
      'Press up and forward while exhaling, without locking the elbows.',
      'Lower back slowly to chest level while inhaling.',
    ],
  },
  'iso-lateral-incline-press': {
    ar: [
      'اضبط المقعد بحيث تبدأ المقابض عند أعلى الصدر.',
      'ثبّت الظهر والكتفين على المسند — كل ذراع تعمل مستقلة.',
      'ادفع للأعلى مع الزفير حتى امتداد الذراع دون قفل المرفق.',
      'أنزل ببطء مع الشهيق وكرّر بإيقاع ثابت.',
    ],
    en: [
      'Set the seat so the handles start at upper-chest height.',
      'Pin your back and shoulders to the pad — each arm works independently.',
      'Press up while exhaling until the arm extends without locking the elbow.',
      'Lower slowly while inhaling and repeat at a steady tempo.',
    ],
  },
  'decline-chest-press-machine': {
    ar: [
      'اضبط المقعد بحيث تكون المقابض بمستوى أسفل الصدر.',
      'ثبّت ظهرك وأمسك المقابض مع مرفقين بزاوية مريحة.',
      'ادفع للأمام وللأسفل قليلًا مع الزفير.',
      'ارجع ببطء مع الشهيق دون أن تلمس الأوزان بعضها.',
    ],
    en: [
      'Set the seat so the handles line up with the lower chest.',
      'Keep your back set and grip with the elbows at a comfortable angle.',
      'Press forward and slightly down while exhaling.',
      'Return slowly while inhaling, without letting the stack touch down.',
    ],
  },
  'assisted-dip-machine': {
    ar: [
      'اختر وزن المساعدة — كلما زاد الوزن صار الغطس أسهل.',
      'اركع أو قف على منصة المساعدة وأمسك المقابض بذراعين مفرودتين.',
      'انزل ببطء مع الشهيق حتى يصل المرفقان لزاوية ٩٠ درجة تقريبًا.',
      'ادفع للأعلى مع الزفير حتى تمتد الذراعان دون قفل المرفقين.',
    ],
    en: [
      'Select the assist weight — more weight means an easier dip.',
      'Kneel or stand on the assist platform and grip the handles with straight arms.',
      'Lower slowly while inhaling until the elbows reach about 90 degrees.',
      'Push back up while exhaling until the arms extend without locking.',
    ],
  },

  // ===== الظهر =====
  'lat-pulldown-machine': {
    ar: [
      'اضبط مسند الفخذين بحيث يثبّت رجليك وأنت جالس.',
      'أمسك المقبض بقبضة أوسع قليلًا من الكتفين وصدرك مرفوع.',
      'اسحب المقبض نحو أعلى الصدر مع الزفير وضم لوحي الكتف.',
      'ارجع ببطء مع الشهيق حتى تمتد الذراعان بالكامل.',
    ],
    en: [
      'Adjust the thigh pad so it locks your legs in place while seated.',
      'Grip the bar slightly wider than shoulder width, chest up.',
      'Pull the bar to the upper chest while exhaling, squeezing the shoulder blades.',
      'Return slowly while inhaling until the arms are fully extended.',
    ],
  },
  'single-arm-lat-pulldown': {
    ar: [
      'اجلس وثبّت فخذيك تحت المسند وأمسك المقبض بيد واحدة.',
      'اسحب المقبض للأسفل نحو جانب صدرك مع الزفير.',
      'ركّز على شدّ عضلة اللاتس في نفس الجهة دون لفّ الجذع.',
      'ارجع ببطء مع الشهيق ثم بدّل الذراع بعد إتمام العدّات.',
    ],
    en: [
      'Sit with your thighs secured under the pad and grip the handle with one hand.',
      'Pull the handle down toward the side of your chest while exhaling.',
      'Focus on squeezing the lat on that side without twisting the torso.',
      'Return slowly while inhaling, then switch arms after your reps.',
    ],
  },
  'iso-lateral-pulldown': {
    ar: [
      'اضبط المقعد بحيث تصل يداك للمقابض وذراعاك ممدودتان.',
      'اسحب المقبضين للأسفل نحو الكتفين مع الزفير — كل ذراع مستقلة.',
      'أبقِ صدرك مرفوعًا وكتفيك بعيدين عن أذنيك.',
      'ارجع ببطء مع الشهيق حتى الامتداد الكامل.',
    ],
    en: [
      'Set the seat so you can reach the handles with arms extended.',
      'Pull the handles down toward your shoulders while exhaling — each arm independent.',
      'Keep the chest up and shoulders away from the ears.',
      'Return slowly while inhaling to a full stretch.',
    ],
  },
  'iso-lateral-high-row': {
    ar: [
      'اجلس وثبّت صدرك على المسند وأمسك المقبضين العلويين.',
      'اسحب للأسفل وللخلف نحو أسفل الضلوع مع الزفير.',
      'ضم لوح الكتف في نهاية السحبة لثانية.',
      'ارجع ببطء مع الشهيق حتى تمتد الذراعان.',
    ],
    en: [
      'Sit with your chest on the pad and grab the high handles.',
      'Pull down and back toward your lower ribs while exhaling.',
      'Squeeze the shoulder blade at the end of the pull for a second.',
      'Return slowly while inhaling until the arms extend.',
    ],
  },
  'wide-grip-lat-pulldown': {
    ar: [
      'ثبّت فخذيك تحت المسند وأمسك البار بقبضة واسعة.',
      'ارفع صدرك وميّله للخلف قليلًا جدًا.',
      'اسحب البار لأعلى الصدر مع الزفير وركّز على فتح الظهر عرضًا.',
      'ارجع ببطء مع الشهيق دون رفع الكتفين.',
    ],
    en: [
      'Secure your thighs under the pad and take a wide grip on the bar.',
      'Lift your chest and lean back only slightly.',
      'Pull the bar to the upper chest while exhaling, focusing on back width.',
      'Return slowly while inhaling without shrugging the shoulders.',
    ],
  },
  'wide-grip-iso-lateral-pulldown': {
    ar: [
      'اضبط المقعد وأمسك المقبضين الخارجيين الواسعين.',
      'اسحب للأسفل مع الزفير حتى يصل المرفقان لجانبي الجذع.',
      'حافظ على الجذع ثابتًا — الحركة من الذراعين والظهر فقط.',
      'ارجع ببطء مع الشهيق حتى الامتداد الكامل.',
    ],
    en: [
      'Set the seat and grab the wide outer handles.',
      'Pull down while exhaling until the elbows reach the sides of your torso.',
      'Keep the torso still — only the arms and back move.',
      'Return slowly while inhaling to full extension.',
    ],
  },
  'seated-row-machine': {
    ar: [
      'اضبط مسند الصدر بحيث تصل يداك للمقابض وذراعاك ممدودتان.',
      'أمسك المقبضين واسحب نحو بطنك مع الزفير.',
      'ضم لوحي الكتف في نهاية السحبة دون رفع الكتفين.',
      'ارجع ببطء مع الشهيق حتى تمتد الذراعان.',
    ],
    en: [
      'Adjust the chest pad so you reach the handles with arms extended.',
      'Grip the handles and pull toward your stomach while exhaling.',
      'Squeeze the shoulder blades together at the end without shrugging.',
      'Return slowly while inhaling until the arms extend.',
    ],
  },
  'chest-supported-row-machine': {
    ar: [
      'اضبط ارتفاع المقعد بحيث يستقر صدرك على المسند بارتياح.',
      'أمسك المقبضين واسحب نحوك مع الزفير وصدرك ملتصق بالمسند.',
      'ضم لوحي الكتف لثانية في نهاية الحركة.',
      'ارجع ببطء مع الشهيق دون رفع الصدر عن المسند.',
    ],
    en: [
      'Set the seat height so your chest rests comfortably on the pad.',
      'Grip the handles and pull toward you while exhaling, chest on the pad.',
      'Squeeze the shoulder blades for a second at the end.',
      'Return slowly while inhaling, keeping the chest on the pad.',
    ],
  },
  't-bar-row-machine': {
    ar: [
      'ثبّت صدرك على المسند وقدميك على المنصة.',
      'أمسك المقبضين واسحب نحو صدرك مع الزفير.',
      'أبقِ الرقبة محايدة والصدر ملتصقًا بالمسند طوال الحركة.',
      'أنزل الوزن ببطء مع الشهيق حتى تمتد الذراعان.',
    ],
    en: [
      'Set your chest on the pad and feet on the platform.',
      'Grip the handles and row toward your chest while exhaling.',
      'Keep the neck neutral and chest on the pad throughout.',
      'Lower the weight slowly while inhaling until the arms extend.',
    ],
  },
  'rear-delt-row-machine': {
    ar: [
      'اضبط المقعد بحيث تكون المقابض بمستوى الكتفين.',
      'اسحب المقبضين للخلف بمرفقين مرتفعين وواسعين مع الزفير.',
      'ركّز على الكتف الخلفي وأعلى الظهر — لا تسحب بالبايسبس.',
      'ارجع ببطء مع الشهيق وكرّر بتحكّم.',
    ],
    en: [
      'Set the seat so the handles sit at shoulder height.',
      'Pull the handles back with elbows high and wide while exhaling.',
      'Focus on the rear delts and upper back — do not pull with the biceps.',
      'Return slowly while inhaling and repeat with control.',
    ],
  },

  // ===== الأكتاف =====
  'shoulder-press-machine': {
    ar: [
      'اضبط المقعد بحيث تكون المقابض بمستوى الكتفين تقريبًا.',
      'ثبّت ظهرك على المسند وأمسك المقابض.',
      'ادفع للأعلى مع الزفير حتى تمتد الذراعان دون قفل المرفقين.',
      'أنزل ببطء مع الشهيق حتى مستوى الأذنين تقريبًا.',
    ],
    en: [
      'Set the seat so the handles sit at about shoulder height.',
      'Keep your back on the pad and grip the handles.',
      'Press up while exhaling until the arms extend without locking.',
      'Lower slowly while inhaling to about ear level.',
    ],
  },
  'lateral-raise-machine': {
    ar: [
      'اجلس وثبّت ذراعيك تحت المساند الجانبية.',
      'ارفع ذراعيك للجانبين حتى مستوى الكتفين مع الزفير.',
      'توقّف لحظة في الأعلى دون رفع الكتفين نحو الأذنين.',
      'أنزل ببطء مع الشهيق وكرّر بإيقاع هادئ.',
    ],
    en: [
      'Sit and place your arms under the side pads.',
      'Raise your arms out to shoulder height while exhaling.',
      'Pause briefly at the top without shrugging toward the ears.',
      'Lower slowly while inhaling and repeat at a calm tempo.',
    ],
  },
  'reverse-pec-deck': {
    ar: [
      'اضبط المقابض للوضع الخلفي واجلس وصدرك على المسند.',
      'أمسك المقبضين وذراعاك ممدودتان أمامك بمستوى الكتفين.',
      'افتح ذراعيك للخلف مع الزفير حتى يصبحا بمحاذاة الجذع.',
      'ارجع ببطء مع الشهيق دون أن تصطدم الأوزان.',
    ],
    en: [
      'Set the handles to the rear position and sit facing the pad.',
      'Grip the handles with arms extended in front at shoulder height.',
      'Open your arms back while exhaling until they are in line with the torso.',
      'Return slowly while inhaling without letting the stack slam.',
    ],
  },

  // ===== الأرجل — فخذ أمامي =====
  'leg-extension-machine': {
    ar: [
      'اضبط المسند بحيث يستقر أسفل ساقيك فوق الكاحلين وركبتاك بمحاذاة محور الجهاز.',
      'أمسك المقبضين الجانبيين وثبّت ظهرك.',
      'ارفع ساقيك حتى تمتدا مع الزفير وتوقّف لحظة في الأعلى.',
      'أنزل ببطء مع الشهيق دون أن تلمس الأوزان بعضها.',
    ],
    en: [
      'Set the pad so it rests on your lower shins above the ankles, knees in line with the machine pivot.',
      'Hold the side handles and keep your back set.',
      'Extend your legs while exhaling and pause briefly at the top.',
      'Lower slowly while inhaling without letting the stack touch down.',
    ],
  },
  'hack-squat-machine': {
    ar: [
      'ثبّت ظهرك على المسند وكتفيك تحت الوسادتين، وقدماك بعرض الكتفين على المنصة.',
      'حرّر مقابض الأمان وأمسكها بيديك.',
      'انزل ببطء مع الشهيق حتى تصل الفخذان لموازاة المنصة تقريبًا.',
      'ادفع بكامل القدم للأعلى مع الزفير دون قفل الركبتين.',
    ],
    en: [
      'Set your back on the pad, shoulders under the pads, feet shoulder-width on the platform.',
      'Release the safety handles and keep hold of them.',
      'Lower slowly while inhaling until your thighs are about parallel to the platform.',
      'Drive up through the whole foot while exhaling, without locking the knees.',
    ],
  },
  'pendulum-squat-machine': {
    ar: [
      'ثبّت كتفيك تحت الوسادتين وظهرك على المسند، وقدماك بمنتصف المنصة.',
      'حرّر الأمان وانزل ببطء مع الشهيق بعمق مريح.',
      'حافظ على كامل القدم ملتصقة بالمنصة.',
      'ادفع للأعلى مع الزفير حتى تمتد الرجلان دون قفل الركبتين.',
    ],
    en: [
      'Set your shoulders under the pads, back on the pad, feet mid-platform.',
      'Release the safety and lower slowly while inhaling to a comfortable depth.',
      'Keep the whole foot flat on the platform.',
      'Drive up while exhaling until the legs extend without locking the knees.',
    ],
  },
  'leg-press-machine': {
    ar: [
      'اجلس وثبّت ظهرك ووركيك على المسند، وضع قدميك بعرض الكتفين منتصف المنصة.',
      'حرّر مقابض الأمان وأمسك المقبضين الجانبيين.',
      'أنزل المنصة ببطء مع الشهيق حتى زاوية ٩٠ درجة في الركبتين.',
      'ادفع بكامل القدم مع الزفير دون قفل الركبتين، وأعد الأمان في النهاية.',
    ],
    en: [
      'Sit with your back and hips on the pad, feet shoulder-width in the middle of the platform.',
      'Release the safety handles and hold the side grips.',
      'Lower the platform slowly while inhaling to about 90 degrees at the knees.',
      'Press through the whole foot while exhaling without locking the knees, and reset the safety when done.',
    ],
  },

  // ===== الأرجل — فخذ خلفي =====
  'seated-leg-curl': {
    ar: [
      'اضبط مسند الظهر بحيث تكون ركبتاك بمحاذاة محور الجهاز، والمسند العلوي فوق فخذيك.',
      'ضع أسفل ساقيك فوق الأسطوانة وأمسك المقبضين.',
      'اثنِ ركبتيك واسحب الأسطوانة للأسفل والخلف مع الزفير.',
      'ارجع ببطء مع الشهيق حتى تمتد الرجلان.',
    ],
    en: [
      'Adjust the back pad so your knees line up with the machine pivot, thigh pad snug on top.',
      'Place your lower shins on the roller and hold the handles.',
      'Bend your knees and curl the roller down and back while exhaling.',
      'Return slowly while inhaling until the legs extend.',
    ],
  },
  'lying-leg-curl': {
    ar: [
      'استلقِ على بطنك واضبط الأسطوانة فوق كعبيك مباشرة، وركبتاك خارج حافة المسند.',
      'أمسك المقبضين وثبّت وركيك على المسند.',
      'اثنِ ركبتيك واسحب الأسطوانة نحو المؤخرة مع الزفير.',
      'أنزل ببطء مع الشهيق دون رفع الوركين.',
    ],
    en: [
      'Lie face down and set the roller just above your heels, knees off the edge of the pad.',
      'Hold the handles and keep your hips pressed to the pad.',
      'Bend your knees and curl the roller toward your glutes while exhaling.',
      'Lower slowly while inhaling without lifting the hips.',
    ],
  },
  'standing-leg-curl': {
    ar: [
      'قف وثبّت فخذك على المسند وضع الأسطوانة خلف كاحل الرجل العاملة.',
      'أمسك المقبضين للتوازن.',
      'اثنِ الركبة واسحب الكعب نحو المؤخرة مع الزفير.',
      'أنزل ببطء مع الشهيق ثم بدّل الرجل بعد إتمام العدّات.',
    ],
    en: [
      'Stand with your thigh on the pad and the roller behind the working ankle.',
      'Hold the handles for balance.',
      'Bend the knee and curl the heel toward your glutes while exhaling.',
      'Lower slowly while inhaling, then switch legs after your reps.',
    ],
  },

  // ===== الأرجل — الفخذ الداخلي =====
  'hip-adductor-machine': {
    ar: [
      'اجلس وثبّت ظهرك وضع رجليك خلف الوسادتين من الداخل.',
      'افتح الرجلين لوضع البداية بمدى مريح — لا تبالغ في الفتح.',
      'اضغط الوسادتين نحو بعضهما مع الزفير.',
      'ارجع ببطء مع الشهيق دون أن تفلت الوزن.',
    ],
    en: [
      'Sit with your back set and legs inside the pads.',
      'Open your legs to a comfortable starting range — do not overstretch.',
      'Squeeze the pads together while exhaling.',
      'Return slowly while inhaling without letting the weight drop.',
    ],
  },

  // ===== الأرجل — الألوية =====
  'glute-machine': {
    ar: [
      'اجلس وثبّت الحزام فوق وركيك وظهرك على المسند وقدماك على المنصة.',
      'ادفع بوركيك للأعلى مع الزفير حتى يستقيم الجذع مع الفخذين.',
      'اضغط الألوية في الأعلى لثانية.',
      'انزل ببطء مع الشهيق دون ملامسة كاملة للمقعد.',
    ],
    en: [
      'Sit in, secure the belt over your hips, back on the pad, feet on the platform.',
      'Drive your hips up while exhaling until the torso lines up with the thighs.',
      'Squeeze the glutes at the top for a second.',
      'Lower slowly while inhaling without fully resting on the seat.',
    ],
  },
  'glute-kickback-machine': {
    ar: [
      'ثبّت صدرك وساعديك على المساند وضع قدمك على منصة الدفع.',
      'ادفع القدم للخلف وللأعلى مع الزفير حتى تمتد الرجل.',
      'اضغط الألوية في نهاية الحركة دون تقويس أسفل الظهر.',
      'ارجع ببطء مع الشهيق ثم بدّل الرجل.',
    ],
    en: [
      'Set your chest and forearms on the pads, foot on the push platform.',
      'Drive the foot back and up while exhaling until the leg extends.',
      'Squeeze the glutes at the end without arching the lower back.',
      'Return slowly while inhaling, then switch legs.',
    ],
  },
  'standing-hip-extension-machine': {
    ar: [
      'قف وأمسك المقابض وضع الأسطوانة خلف فخذ الرجل العاملة.',
      'ادفع الرجل للخلف مع الزفير مع جذع ثابت.',
      'اضغط الألوية في أقصى الحركة لثانية.',
      'ارجع ببطء مع الشهيق ثم بدّل الرجل.',
    ],
    en: [
      'Stand holding the handles with the roller behind the working thigh.',
      'Drive the leg back while exhaling, keeping the torso still.',
      'Squeeze the glutes at the end of the movement for a second.',
      'Return slowly while inhaling, then switch legs.',
    ],
  },

  // ===== الأرجل — البطات =====
  'seated-calf-raise-machine': {
    ar: [
      'اجلس وضع مقدمة قدميك على الدرجة والوسادتين فوق ركبتيك.',
      'حرّر الأمان وأنزل الكعبين ببطء لأقصى تمدد مريح مع الشهيق.',
      'ادفع بمقدمة القدمين للأعلى مع الزفير لأعلى نقطة.',
      'توقّف لحظة في الأعلى ثم كرّر بتحكّم.',
    ],
    en: [
      'Sit with the balls of your feet on the step and the pads on your knees.',
      'Release the safety and lower your heels slowly to a comfortable stretch while inhaling.',
      'Push up onto the balls of your feet while exhaling to the top.',
      'Pause briefly at the top, then repeat with control.',
    ],
  },
  'standing-calf-raise-machine': {
    ar: [
      'قف تحت الوسادتين على كتفيك وضع مقدمة قدميك على الدرجة.',
      'قف باستقامة وأنزل الكعبين ببطء مع الشهيق لأقصى تمدد مريح.',
      'ارفع الكعبين لأعلى نقطة مع الزفير.',
      'توقّف لحظة في الأعلى ثم انزل بتحكّم.',
    ],
    en: [
      'Stand under the shoulder pads with the balls of your feet on the step.',
      'Stand tall and lower your heels slowly while inhaling to a comfortable stretch.',
      'Raise your heels to the highest point while exhaling.',
      'Pause briefly at the top, then lower with control.',
    ],
  },

  // ===== البايسبس =====
  'preacher-curl-machine': {
    ar: [
      'اضبط المقعد بحيث يستقر أعلى ذراعيك على المسند المائل بالكامل.',
      'أمسك المقبضين وذراعاك شبه ممدودتين.',
      'اثنِ المرفقين وارفع المقبضين نحو كتفيك مع الزفير.',
      'أنزل ببطء مع الشهيق دون مدّ المرفقين بعنف.',
    ],
    en: [
      'Set the seat so your upper arms rest fully on the angled pad.',
      'Grip the handles with your arms nearly extended.',
      'Curl the handles toward your shoulders while exhaling.',
      'Lower slowly while inhaling without snapping the elbows straight.',
    ],
  },
  'cable-biceps-curl': {
    ar: [
      'ثبّت البكرة بأسفل العمود وأمسك المقبض بقبضة من الأسفل.',
      'قف باستقامة والمرفقان ملتصقان بجانبي الجذع.',
      'اثنِ المرفقين وارفع المقبض نحو الصدر مع الزفير.',
      'أنزل ببطء مع الشهيق دون تأرجح الجذع.',
    ],
    en: [
      'Set the pulley at the bottom and grab the handle with an underhand grip.',
      'Stand tall with your elbows pinned to your sides.',
      'Curl the handle toward your chest while exhaling.',
      'Lower slowly while inhaling without swinging the torso.',
    ],
  },

  // ===== الترايسبس =====
  'triceps-extension-machine': {
    ar: [
      'اضبط المقعد بحيث يستقر أعلى ذراعيك على المسند والمرفقان بمحاذاة محور الجهاز.',
      'أمسك المقبضين والمرفقان مثنيان.',
      'ادفع للأسفل حتى تمتد الذراعان مع الزفير.',
      'ارجع ببطء مع الشهيق بتحكّم كامل.',
    ],
    en: [
      'Set the seat so your upper arms rest on the pad, elbows in line with the machine pivot.',
      'Grip the handles with your elbows bent.',
      'Press down until the arms extend while exhaling.',
      'Return slowly while inhaling under full control.',
    ],
  },
  'cable-triceps-pushdown': {
    ar: [
      'ثبّت البكرة بأعلى العمود وأمسك البار/الحبل بقبضة من الأعلى.',
      'قرّب المرفقين من جانبي الجذع وثبّتهما.',
      'ادفع للأسفل حتى تمتد الذراعان مع الزفير.',
      'ارجع ببطء مع الشهيق حتى زاوية ٩٠ درجة دون تحريك المرفقين.',
    ],
    en: [
      'Set the pulley at the top and grab the bar or rope with an overhand grip.',
      'Pin your elbows to your sides and keep them still.',
      'Push down until the arms extend while exhaling.',
      'Return slowly while inhaling to 90 degrees without moving the elbows.',
    ],
  },

  // ===== البطن =====
  'ab-crunch-machine': {
    ar: [
      'اجلس وثبّت قدميك وأمسك المقبضين أو ضع صدرك خلف المسند.',
      'قرّب أضلاعك نحو حوضك بتقوّس الجذع للأمام مع الزفير.',
      'توقّف لحظة في أقصى انقباض للبطن.',
      'ارجع ببطء مع الشهيق دون أن تفلت الوزن.',
    ],
    en: [
      'Sit down, secure your feet, and grip the handles or set your chest behind the pad.',
      'Curl your ribs toward your pelvis, rounding the torso forward while exhaling.',
      'Pause briefly at peak ab contraction.',
      'Return slowly while inhaling without letting the weight drop.',
    ],
  },
  'cable-crunch': {
    ar: [
      'ثبّت الحبل بأعلى العمود واركع تحته ممسكًا الطرفين بجانب رأسك.',
      'قوّس جذعك للأسفل بتقريب الأضلاع نحو الحوض مع الزفير.',
      'أبقِ الوركين ثابتين — الحركة من البطن لا من الذراعين.',
      'ارجع ببطء مع الشهيق حتى يستقيم الجذع.',
    ],
    en: [
      'Set the rope at the top pulley and kneel below it, holding the ends beside your head.',
      'Crunch your torso down, bringing the ribs toward the pelvis while exhaling.',
      'Keep the hips still — the movement comes from the abs, not the arms.',
      'Return slowly while inhaling until the torso is upright.',
    ],
  },
}

/** يعيد خطوات استخدام الجهاز — يقبل المعرّفات القديمة، أو null إن لم تتوفر خطوات. */
export function getMachineHowTo(id: string): HowToSteps | null {
  return machineHowTo[canonicalExerciseId(id)] ?? null
}
