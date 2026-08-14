import type { Lang } from '@/lib/appPreferences'

/**
 * نصوص مرجع فيديو التمرين.
 *
 * قاعدة الصدق هنا أضيق من المعتاد: **لا نعد المستخدم بفيديو إلا إذا كان عندنا مرجع
 * مُتحقَّق منه ومعتمَد**. المرجع غير المعتمد (قيد المراجعة / مفقود) يُعرض حالةً صادقة،
 * ولا يُعرض أبدًا كأنه شرح جاهز — لأن فيديو خاطئ أسوأ من لا شيء.
 *
 * وملاحظة خصوصية مقصودة: المشغّل لا يُحمَّل إلا بضغطة المستخدم، فلا يذهب أي طلب
 * ليوتيوب قبل أن يختار هو.
 */
export interface ExerciseVideoStrings {
  /** نصّ الزر المعتمد — لا يُغيَّر بلا سبب، فهو الوعد الظاهر للمستخدم. */
  watchHowTo: string
  /** يوضّح أن الضغط هو ما يحمّل المشغّل (خصوصية بلا وعظ). */
  clickToLoadHint: string
  /** تسمية القناة في بطاقة المرجع. */
  channelLabel: string
  /** وصف وصولي لزر تشغيل المرجع. */
  playAria: (name: string) => string
  /** الحالة الصادقة حين لا يوجد مرجع معتمد. */
  noVideoTitle: string
  noVideoBody: string
  /** يوضّح أن المصدر خارجي وليس من إنتاج قِمّة. */
  externalSourceNote: string
}

const ar: ExerciseVideoStrings = {
  watchHowTo: 'شاهد طريقة الأداء',
  clickToLoadHint: 'ما يشتغل شي إلا لما تضغط.',
  channelLabel: 'القناة',
  playAria: (name) => `شغّل فيديو طريقة أداء ${name}`,
  noVideoTitle: 'ما لقينا فيديو موثوق لهذا التمرين',
  noVideoBody: 'ما نعرض فيديو إلا لما نتأكد إنه يشرح نفس الحركة. الخطوات المكتوبة تحت كاملة وتكفيك.',
  externalSourceNote: 'الفيديو من قناة خارجية، مو من إنتاج قِمّة.',
}

const en: ExerciseVideoStrings = {
  watchHowTo: 'Watch how it’s done',
  clickToLoadHint: 'Nothing loads until you tap.',
  channelLabel: 'Channel',
  playAria: (name) => `Play the form video for ${name}`,
  noVideoTitle: 'No trusted video for this one yet',
  noVideoBody: 'We only show a video once we’ve confirmed it demonstrates this exact movement. The written steps below are complete.',
  externalSourceNote: 'This video is from an external channel, not made by Qimmah.',
}

export const exerciseVideoStrings: Record<Lang, ExerciseVideoStrings> = { ar, en }
