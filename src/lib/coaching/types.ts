// Types for the Qimmah coaching layer — structured, honest fitness guidance.
// Content lives in src/data/coaching/**; selection logic in src/lib/coaching/**.
import type { Muscle } from '@/types/workout'

/** Per-exercise form cue: numbered steps + common mistakes + one safety note. */
export interface ExerciseCue {
  /** 3–5 numbered execution steps (warm MSA). */
  steps: string[]
  /** 2–3 common mistakes. */
  mistakes: string[]
  /** Exactly one safety note; spine/knee-loading routes to an «استشر مختصًا» line. */
  safety: string
  /** True for spine/knee-loading patterns (UI may emphasise the safety line). */
  spineCaution?: boolean
}

/** Educational micro-lesson (60–100 words) with one actionable takeaway. */
export interface Lesson {
  id: string
  /** Topic bucket, e.g. 'overload' | 'rest' | 'protein' | 'sleep' | 'plateau' | 'deload' | 'hydration' | 'soreness'. */
  topic: string
  titleAr: string
  bodyAr: string
  /** One concrete action the reader can take. */
  takeawayAr: string
  titleEn: string
  /** Same 60–100 word bound as the Arabic body; gated by the coaching proof. */
  bodyEn: string
  takeawayEn: string
}

/** Rest-period contextual tip keyed to one or more muscle groups. */
export interface RestTip {
  id: string
  muscles: Muscle[]
  textAr: string
  textEn: string
}

/**
 * A content record with its language-resolved text attached.
 *
 * The `*Ar` / `*En` fields stay on the object untouched, so every existing caller
 * that reads `tip.textAr` or `lesson.bodyAr` keeps working unchanged. Callers that
 * pass a `lang` additionally get the resolved fields, and never have to branch.
 */
export type Localized<T, K extends string> = T & { [P in K]: string }
