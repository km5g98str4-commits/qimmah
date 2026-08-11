// سطر «ليش نسأل» — واحد فوق كل خطوة من خطوات الإعداد. [CTO-72] البند ٢.
//
// ═══ المشكلة التي يحلّها هذا الملف ═══
// كان السياق **غير متّسق** عبر التدفّق: خطوة الأساسيات تحمل ثلاثة أسطر شارحة
// (وصف الخطوة · ملاحظة الجنس · سطر «ليش» في **أسفل** الشاشة بعد كل الحقول)،
// وخطوة الهدف لا تحمل شيئًا إطلاقًا — يُسأل المستخدم «وش هدفك الحين؟» بلا كلمة
// عن أثر الجواب. والباقي بينهما. فالسياق يظهر ويختفي بلا قاعدة.
//
// ═══ لماذا مُجمِّع لا قاموس خامس ═══
// أربعة من الخمسة **موجودة أصلًا** في قواميسها (`bodyStep` · `onboardingIntent`
// · `V2_ONBOARDING`)، والناقص واحد فقط: خطوة الهدف. فنسخُها كلّها هنا يخلق
// نسخة ثانية تشيخ وتتناقض. هذا الملف **يجمع ولا ينسخ**: يقرأ من مصادرها، ويضيف
// السطر المفقود وحده، فيصير للخمسة **موضع واحد تُقرأ فيه جنبًا لجنب**.
//
// ═══ الضمان البنيوي ═══
// النوع `SetupWhyLines` صفٌّ (tuple) بطول خمسة بالضبط. فإضافة خطوة سادسة إلى
// `OnboardingV2` **لا تُترجم** حتى يُضاف سطرها هنا — الاتّساق يحرسه المترجم لا
// اليقظة. ويرافقه أن `StepTitle.subtitle` صار **إلزاميًا** لا اختياريًا، فلا
// خطوة تُرسم بعنوان بلا سياق.
//
// النبرة (§6): عامية بيضاء، تشرح **أثر الجواب** لا تعتذر عن السؤال، وبلا وعود.

import type { Lang } from '@/lib/appPreferences'
import { V2_ONBOARDING } from '@/design-system/v2/labels'
import { bodyStepStrings } from './bodyStep'
import { onboardingIntentStrings } from './onboardingIntent'
import { trainingHistoryStrings } from './trainingHistory'

/** ستة أسطر بالضبط — بترتيب خطوات `OnboardingV2` (0..5). */
export type SetupWhyLines = readonly [string, string, string, string, string, string]

/**
 * السطر الوحيد الذي لا مصدر له: خطوة الهدف كانت بلا أي سياق.
 *
 * ولا يكرّر `V2_ONBOARDING.goal.note` («تقدر تغيّره في أي وقت») المعروضة أسفل
 * الخطوة نفسها — هذا يقول **أثر** الجواب، وذاك يطمئن على **رجعته**.
 */
const goalWhy: Record<Lang, string> = {
  ar: 'هدفك يحدّد سعراتك وشكل تمرينك.',
  en: 'Your goal sets your calories and how your sessions are built.',
}

/** أسطر «ليش نسأل» للخطوات الخمس، بترتيبها في التدفّق. */
export function setupWhyLines(lang: Lang): SetupWhyLines {
  const t = V2_ONBOARDING[lang] ?? V2_ONBOARDING.ar
  const intent = onboardingIntentStrings[lang] ?? onboardingIntentStrings.ar
  return [
    // ٠ الأساسيات — كان يُعرض في **أسفل** الشاشة بعد كل الحقول، أي بعد أن يكون
    //   المستخدم قد أعطى بياناته. السياق يسبق السؤال أو لا معنى له.
    bodyStepStrings[lang].whyNote,
    // ١ النية والمستوى
    intent.subtitle,
    // ٢ تاريخ التدريب — يقرأ من قاموسه، ولا يُنسخ هنا.
    trainingHistoryStrings[lang].why,
    // ٣ الهدف — الفجوة الوحيدة، وتُملأ هنا.
    goalWhy[lang],
    // ٤ التدريب
    t.training.subtitle,
    // ٥ المعدّات
    t.equipment.subtitle,
  ]
}
