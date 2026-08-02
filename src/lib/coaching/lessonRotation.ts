// Today «تعلّم» lesson rotation — pure core + owner-scoped persistence.
//
// Guarantee: no lesson repeats until the whole set is exhausted, then it resets
// for a fresh cycle. Progress is stored per account (owner-scoped key), so two
// users on the same device rotate independently. The pure `selectNextLesson`
// makes the whole thing deterministic and testable; the persistence wrapper is a
// thin, side-effecting shell around it.
import { LESSONS } from '@/data/coaching/lessons'
import type { Lang } from '@/lib/appPreferences'
import type { Lesson, Localized } from './types'
import { hashStr } from './hash'

/** A lesson's three texts resolved to `lang`. Arabic default keeps old callers intact. */
export type LocalizedLesson = Localized<Lesson, 'title' | 'body' | 'takeaway'>

/** Attach lang-resolved title/body/takeaway without removing the `*Ar`/`*En` fields. */
export function localizeLesson(lesson: Lesson, lang: Lang = 'ar'): LocalizedLesson {
  const en = lang === 'en'
  return {
    ...lesson,
    title: en ? lesson.titleEn : lesson.titleAr,
    body: en ? lesson.bodyEn : lesson.bodyAr,
    takeaway: en ? lesson.takeawayEn : lesson.takeawayAr,
  }
}

/** Owner-scoped progress key (guest → ':guest'), mirroring the app's convention. */
const PREFIX = 'qimmah:coach:lessons:v1:'
export const lessonProgressKey = (userId: string | null | undefined): string => PREFIX + (userId ?? 'guest')

/**
 * Pure selection: given the ids already shown and a seed, returns the current
 * lesson and the next `shown` list. When every lesson has been shown, it resets
 * (so the returned `shown` starts a fresh cycle with just the new pick).
 * Deterministic: same (shown, seed) → same result.
 */
export function selectNextLesson(
  shown: readonly string[],
  seed: number,
  lang: Lang = 'ar',
): { lesson: LocalizedLesson; shown: string[] } {
  const unseen = LESSONS.filter((l) => !shown.includes(l.id))
  const cycleReset = unseen.length === 0
  const pool = cycleReset ? LESSONS : unseen
  const base = cycleReset ? [] : [...shown]
  const idx = hashStr(`${seed}|${base.slice().sort().join(',')}`) % pool.length
  const lesson = pool[idx]
  return { lesson: localizeLesson(lesson, lang), shown: [...base, lesson.id] }
}

// ── persistence (owner-scoped) ──

function readShown(userId: string | null | undefined): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(lessonProgressKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeShown(userId: string | null | undefined, shown: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(lessonProgressKey(userId), JSON.stringify(shown))
  } catch {
    /* ignore storage errors */
  }
}

/** The lesson to show now for this user (does NOT advance). Stable for a given seed. */
export function currentTodayLesson(
  userId: string | null | undefined,
  seed: number,
  lang: Lang = 'ar',
): LocalizedLesson {
  return selectNextLesson(readShown(userId), seed, lang).lesson
}

/** «فهمت» — record the current lesson as shown and advance the rotation. */
export function markLessonUnderstood(userId: string | null | undefined, seed: number): void {
  const { shown } = selectNextLesson(readShown(userId), seed)
  writeShown(userId, shown)
}

/** Read-only accessor for tests/UI. */
export function shownLessonIds(userId: string | null | undefined): string[] {
  return readShown(userId)
}
