// نصوص البرامج الجاهزة (fixtures) — [FOUNDER-QA-P0] حارة القوالب الحتمية.
//
// قاموس **خاص بهذه الحارة** لا تعديل على قاموس مشترك (§1.4/٢).
// النبرة عامية بيضاء، والإنجليزية ودودة غير رسمية (§6).
//
// لماذا قاموس منفصل عن `src/data/workoutTemplates.ts`؟ ذلك الملف يكتب
// `nameAr`/`nameEn` داخل البيانات نفسها — نمط سابق للميثاق. البرامج الجديدة
// تُبقي **البيانات معرّفات تمارين فقط** والنصّ هنا، فتبقى الترجمة في موضع واحد.
//
// كل رقم يمرّ بـ`formatNumber` عند الكتابة هنا: القاموس يعرف لغته فيربط
// المنسّق بها مباشرةً بدل أن يترك أرقامًا لاتينية داخل جملة عربية (BUG-019).

import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'

/** معرّفات البرامج الجاهزة — مسبوقة بـ`builtin-` كي لا تصطدم بمعرّفات `workoutTemplates`. */
export type BuiltInTemplateId =
  | 'builtin-upper-lower-4'
  | 'builtin-full-body-3'
  | 'builtin-ppl-6'
  | 'builtin-ppl-3'
  | 'builtin-upper-lower-full-3'
  | 'builtin-full-body-2'
  | 'builtin-upper-lower-3'
  | 'builtin-beginner-machines-3'

/**
 * «نوع اليوم» لا «اليوم نفسه»: البرنامج الواحد قد يكرّر نفس النوع (دفع مرّتين في
 * برنامج الستة أيام)، فالمعرّف الفعلي لليوم يُشتقّ في طبقة البيانات، والنصّ يُقرأ
 * من هنا بنوعه. هكذا لا يتكرّر النصّ بتكرار اليوم.
 */
export type BuiltInDayKind =
  | 'upperA'
  | 'upperB'
  | 'lowerA'
  | 'lowerB'
  | 'fullA'
  | 'fullB'
  | 'fullC'
  | 'push'
  | 'pull'
  | 'legs'
  | 'machinesA'
  | 'machinesB'
  | 'machinesC'

export interface BuiltInTemplateCopy {
  name: string
  description: string
  /** لمن هذا البرنامج — نصّ قصير يُعرض بطاقةً، لا وعدًا بنتيجة. */
  recommendedFor: string
}

export interface BuiltInTemplateStrings {
  templates: Record<BuiltInTemplateId, BuiltInTemplateCopy>
  days: Record<BuiltInDayKind, string>
}

const n = (value: number, lang: Lang): string => formatNumber(value, lang)

export const builtInTemplateStrings: Record<Lang, BuiltInTemplateStrings> = {
  ar: {
    templates: {
      'builtin-upper-lower-4': {
        name: `علوي / سفلي — ${n(4, 'ar')} أيام`,
        description: 'يومين علوي ويومين سفلي، كلها أجهزة. توازن مريح بين التكرار والاستشفاء.',
        recommendedFor: 'متوسط',
      },
      'builtin-full-body-3': {
        name: `جسم كامل — ${n(3, 'ar')} أيام`,
        description: 'ثلاثة أيام، وكل يوم يلمس جسمك كامل. مناسب للبداية وللأسبوع المزحوم.',
        recommendedFor: 'مبتدئ – متوسط',
      },
      'builtin-ppl-6': {
        name: `دفع / سحب / أرجل — ${n(6, 'ar')} أيام`,
        description: 'دورتين بالأسبوع: دفع، سحب، أرجل. حجم عمل عالي لمن عنده وقت ستة أيام.',
        recommendedFor: 'متقدّم',
      },
      'builtin-ppl-3': {
        name: `دفع / سحب / أرجل — ${n(3, 'ar')} أيام`,
        description: 'نفس الدورة مرّة وحدة بالأسبوع: يوم دفع، يوم سحب، ويوم أرجل.',
        recommendedFor: 'متوسط',
      },
      'builtin-upper-lower-full-3': {
        name: `علوي / سفلي / جسم كامل — ${n(3, 'ar')} أيام`,
        description: 'يوم علوي، يوم سفلي، ويوم ثالث يجمع الجسم كامل.',
        recommendedFor: 'متوسط',
      },
      'builtin-full-body-2': {
        name: `جسم كامل — ${n(2, 'ar')} أيام للمبتدئ`,
        description: 'يومين بس بالأسبوع، وكل يوم يغطّي جسمك كامل. بداية مريحة بدون ضغط.',
        recommendedFor: 'مبتدئ',
      },
      'builtin-upper-lower-3': {
        name: `علوي / سفلي — ${n(3, 'ar')} أيام بالتناوب`,
        description: 'ثلاثة أيام تتناوب بين نسختين: هالأسبوع علوي أ وسفلي أ وعلوي ب، واللي بعده يكمل من سفلي ب.',
        recommendedFor: 'متوسط',
      },
      'builtin-beginner-machines-3': {
        name: `أجهزة للمبتدئ — ${n(3, 'ar')} أيام`,
        description: 'ثلاثة أيام على أجهزة موجّهة بس — أسهل ضبطًا وأنت لسه بالبداية.',
        recommendedFor: 'مبتدئ',
      },
    },
    days: {
      upperA: 'علوي أ',
      upperB: 'علوي ب',
      lowerA: 'سفلي أ',
      lowerB: 'سفلي ب',
      fullA: 'جسم كامل أ',
      fullB: 'جسم كامل ب',
      fullC: 'جسم كامل ج',
      push: 'دفع',
      pull: 'سحب',
      legs: 'أرجل',
      machinesA: 'أجهزة أ',
      machinesB: 'أجهزة ب',
      machinesC: 'أجهزة ج',
    },
  },
  en: {
    templates: {
      'builtin-upper-lower-4': {
        name: `Upper / Lower — ${n(4, 'en')} Days`,
        description: 'Two upper days and two lower days, all on machines. A comfortable balance of frequency and recovery.',
        recommendedFor: 'Intermediate',
      },
      'builtin-full-body-3': {
        name: `Full Body — ${n(3, 'en')} Days`,
        description: 'Three days, each one touching your whole body. Good for starting out and for a packed week.',
        recommendedFor: 'Beginner – Intermediate',
      },
      'builtin-ppl-6': {
        name: `Push / Pull / Legs — ${n(6, 'en')} Days`,
        description: 'Two cycles a week: push, pull, legs. High volume if you have six days to give.',
        recommendedFor: 'Advanced',
      },
      'builtin-ppl-3': {
        name: `Push / Pull / Legs — ${n(3, 'en')} Days`,
        description: 'The same cycle once a week: a push day, a pull day, and a legs day.',
        recommendedFor: 'Intermediate',
      },
      'builtin-upper-lower-full-3': {
        name: `Upper / Lower / Full Body — ${n(3, 'en')} Days`,
        description: 'An upper day, a lower day, and a third day that pulls the whole body together.',
        recommendedFor: 'Intermediate',
      },
      'builtin-full-body-2': {
        name: `Full Body — ${n(2, 'en')} Days (Beginner)`,
        description: 'Just two days a week, each covering your whole body. An easy start with no pressure.',
        recommendedFor: 'Beginner',
      },
      'builtin-upper-lower-3': {
        name: `Upper / Lower — ${n(3, 'en')} Days (A/B Rotation)`,
        description: 'Three days that rotate between two versions: this week Upper A, Lower A, Upper B — the next one picks up at Lower B.',
        recommendedFor: 'Intermediate',
      },
      'builtin-beginner-machines-3': {
        name: `Beginner Machines — ${n(3, 'en')} Days`,
        description: 'Three days on guided machines only — easier to set up while you are still starting out.',
        recommendedFor: 'Beginner',
      },
    },
    days: {
      upperA: 'Upper A',
      upperB: 'Upper B',
      lowerA: 'Lower A',
      lowerB: 'Lower B',
      fullA: 'Full Body A',
      fullB: 'Full Body B',
      fullC: 'Full Body C',
      push: 'Push',
      pull: 'Pull',
      legs: 'Legs',
      machinesA: 'Machines A',
      machinesB: 'Machines B',
      machinesC: 'Machines C',
    },
  },
}
