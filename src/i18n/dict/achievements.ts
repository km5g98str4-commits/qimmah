import type { Lang } from '@/lib/appPreferences'

export interface AchievementsStrings {
  // AchievementsCard + AchievementsSheet
  eyebrow: string
  unlockedNote: string
  emptyTitle: string
  emptyBody: string
  nextPrefix: string
  allBadges: string
  unlockedCountSuffix: string
  unlocked: string
  close: string
  // AchievementToaster
  newMedalEyebrow: string
  achievementEyebrow: string
  // PR celebration (engine)
  prTitle: string
  /** يُبنى: `${name} · ${weight} ${kg} — ${prTail}` */
  prKg: string
  prTail: string
  prFallbackName: string
}

const ar: AchievementsStrings = {
  eyebrow: 'أوسمتك',
  unlockedNote: 'وسام مفتوح — كمّل وخلّهم يزيدون.',
  emptyTitle: 'أول وسام بينك وبينه تمرين واحد',
  emptyBody: 'خلّص تمرينك أو سجّل أكلك وتبدأ تجمع أوسمتك.',
  nextPrefix: 'الجاي:',
  allBadges: 'كل الأوسمة',
  unlockedCountSuffix: 'وسام مفتوح',
  unlocked: 'مفتوح',
  close: 'إغلاق',
  newMedalEyebrow: 'فتحت وسام جديد',
  achievementEyebrow: 'إنجاز',
  prTitle: 'رقم قياسي جديد!',
  prKg: 'كجم',
  prTail: 'رقم جديد ما وصلته قبل.',
  prFallbackName: 'تمرينك',
}

const en: AchievementsStrings = {
  eyebrow: 'Your badges',
  unlockedNote: 'badges unlocked — keep them coming.',
  emptyTitle: 'Your first badge is one workout away',
  emptyBody: 'Finish a workout or log your food and the badges start rolling in.',
  nextPrefix: 'Next:',
  allBadges: 'All badges',
  unlockedCountSuffix: 'badges unlocked',
  unlocked: 'Unlocked',
  close: 'Close',
  newMedalEyebrow: 'New badge unlocked',
  achievementEyebrow: 'Achievement',
  prTitle: 'New personal record!',
  prKg: 'kg',
  prTail: "a new best you've never hit before.",
  prFallbackName: 'your exercise',
}

export const achievementsStrings: Record<Lang, AchievementsStrings> = { ar, en }
